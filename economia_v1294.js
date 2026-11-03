'use strict';
/* LivePulse V12.9.4 — deterministically bounded, offline-testable economy.
   Does not communicate with TikTok. It never invents TikTok gift IDs. */
const MAX_PARTICIPANTS=3500;
function normalizeConfig(input){
 const c={...input};
 if(!Number.isInteger(c.maxEventPoints))c.maxEventPoints=150;
 if(!Number.isInteger(c.maxCombinedMultiplier))c.maxCombinedMultiplier=3;
 for(const team of ['chat','creator']){
  if(!Array.isArray(c[team+'Points'])||!Array.isArray(c[team+'Names']))continue;
  c[team+'Points']=c[team+'Points'].map((v,i)=>{
   // In 12.9.4 legacy -20 was converted to +20. Restore the original attack.
   if(/rosquinha/i.test(String(c[team+'Names'][i]||'').trim()))return -20;
   return Number.isFinite(v)&&v>=0?v:0;
  });
 }
 return c;
}
function eventCap(config){
 const goal=Math.max(1,Number(config.goal)||500);
 const requested=Number(config.maxEventPoints)||150;
 return Math.max(1,Math.min(1000,Math.trunc(requested),Math.max(1,Math.floor(goal*0.30))));
}
function boundPoints(raw,config){
 const n=Number(raw);
 if(!Number.isFinite(n))return 0;
 return Math.max(0,Math.min(eventCap(config),Math.trunc(n)));
}
function giftEffect(name,base,count,surpriseMultiplier,config){
 const points=giftScore(Math.abs(Number(base)||0),count,surpriseMultiplier,config);
 const offensive=/^rosquinha$/i.test(String(name||'').trim());
 return {...points,offensive,delta:offensive?-points.pts:points.pts};
}
function giftScore(base,count,surpriseMultiplier,config){
 const streak=count>=5?3:count>=3?2:1;
 const multiplier=Math.max(1,Math.min(Number(config.maxCombinedMultiplier)||3,streak*Math.max(1,Number(surpriseMultiplier)||1)));
 const points=boundPoints(Math.max(0,Number(base)||0)*multiplier,config);
 return {pts:points,mult:multiplier,capped:Math.max(0,Number(base)||0)*multiplier>points};
}
function makeEconomy(clock=Date.now){
 const affiliation=new Map(),cooldowns=new Map(),unknown=[];
 const counters={freeBlocked:0,unmappedTotal:0,scoreCapped:0,giftProcessed:0,freeScored:0};
 function cleanup(map,ttl){
  const n=clock();
  for(const [k,v] of map)if(n-(typeof v==='number'?v:v.at)>ttl)map.delete(k);
  while(map.size>MAX_PARTICIPANTS)map.delete(map.keys().next().value);
 }
 function assign(user,team){
  if(!['chat','creator'].includes(team))return;
  affiliation.set(String(user).toLowerCase(),{team,at:clock()});cleanup(affiliation,20*60*1000);
 }
 function teamOf(user){
  const a=affiliation.get(String(user).toLowerCase());
  return a&&clock()-a.at<20*60*1000?a.team:null;
 }
 function allow(type,user,cooldownMs){
  const key=type+':'+String(user).toLowerCase(),old=cooldowns.get(key),n=clock();
  if(old!==undefined&&n-old<cooldownMs){counters.freeBlocked++;return false}
  cooldowns.set(key,n);if(cooldowns.size>MAX_PARTICIPANTS)cleanup(cooldowns,45*60*1000);
  return true;
 }
 function unmapped(name,id,why){
  counters.unmappedTotal++;
  unknown.unshift({name:String(name||'').slice(0,75),id:id==null?null:String(id).slice(0,48),reason:why||'nao mapeado',at:clock()});
  unknown.length=Math.min(unknown.length,20);
 }
 function snapshot(config){
  return {version:'12.9.4',maxEventPoints:eventCap(config),maxCombinedMultiplier:config.maxCombinedMultiplier||3,
   ...counters,affiliatedUsers:affiliation.size,unmappedRecent:unknown.slice(0,10)};
 }
 return {assign,teamOf,allow,unmapped,snapshot,counters};
}
function matchGift(name,id,ids,config){
 const mapping=id!=null?ids[String(id)]:undefined;
 if(mapping&&['chat','creator'].includes(mapping.team)&&Number.isInteger(mapping.idx)
   &&mapping.idx>=0&&mapping.idx<7)return {team:mapping.team,idx:mapping.idx,source:'id'};
 const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const hits=[];
 for(const team of ['chat','creator']){
  (config[team+'Names']||[]).forEach((candidate,idx)=>{if(norm(candidate)===norm(name))hits.push({team,idx})});
 }
 return hits.length===1?{...hits[0],source:'unique-name'}:null;
}
module.exports={normalizeConfig,eventCap,boundPoints,giftScore,giftEffect,makeEconomy,matchGift};
