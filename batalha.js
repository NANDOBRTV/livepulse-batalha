const http=require('http'),fs=require('fs'),path=require('path');

const crypto=require('crypto');
const secretPath=path.join(__dirname,'batalha_admin_v55.key');
let adminKey='';try{adminKey=fs.readFileSync(secretPath,'utf8').trim()}catch(_){}
if(!/^[a-f0-9]{48}$/.test(adminKey)){adminKey=crypto.randomBytes(24).toString('hex');fs.writeFileSync(secretPath,adminKey,{mode:0o600})}
function authorized(req,u){const h=req.headers['x-livepulse-key'];return typeof h==='string'&&h===adminKey}
const offlineTikTok=process.argv.includes('--sim-tiktok');const demo=process.argv.includes('--demo')||offlineTikTok;const username=process.argv.find(x=>x.startsWith('@'));
const names=['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro'];
const namesB=['Bloco','TikTok','Cookies','Rosquinha','Coroa','Corações Azul','Coroa Real'];
const effects=[1,10,30,-20,25,50,100,100];
const economyCore=require('./economia_v1294');
const defaults={maxEventPoints:150,maxCombinedMultiplier:3,goal:500,duration:180,start:120,chatVote:1,creatorVote:1,followPoints:2,botSpeed:1400,sound:true,bestOf:3,chatNames:['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro'],creatorNames:['Bloco','TikTok','Cookies','Rosquinha','Coroa','Corações Azul','Coroa Real'],chatPoints:[1,10,30,-20,25,50,100],creatorPoints:[1,10,30,-20,25,50,100]};
const configPath=path.join(__dirname,'batalha_config.json');let cfg={...defaults};try{cfg={...cfg,...JSON.parse(fs.readFileSync(configPath))}}catch(_){}
// Rosquinha always targets the opponent: -20 on the rival scoreboard; never deduct from sender.
cfg=economyCore.normalizeConfig(cfg);const economy=economyCore.makeEconomy();
// Migração não destrutiva: remove apenas o presente excedente da equipe azul.
if(Array.isArray(cfg.creatorNames)&&cfg.creatorNames.length===8&&Array.isArray(cfg.creatorPoints)&&cfg.creatorPoints.length===8){
 const idx=cfg.creatorNames.findIndex(x=>String(x).toLowerCase().trim()==='corações rosa');
 const remove=idx>=0?idx:5;
 cfg.creatorNames.splice(remove,1);cfg.creatorPoints.splice(remove,1);
}
function valid(c){return c&&(c.maxEventPoints==null||(Number.isInteger(c.maxEventPoints)&&c.maxEventPoints>=1&&c.maxEventPoints<=1000))&&(c.maxCombinedMultiplier==null||(Number.isInteger(c.maxCombinedMultiplier)&&c.maxCombinedMultiplier>=1&&c.maxCombinedMultiplier<=3))&&Number.isInteger(c.goal)&&c.goal>=20&&c.goal<=100000&&Number.isInteger(c.duration)&&c.duration>=20&&c.duration<=3600&&Number.isInteger(c.start)&&c.start>=0&&c.start<c.goal&&Number.isInteger(c.botSpeed)&&c.botSpeed>=300&&c.botSpeed<=20000&&['chatVote','creatorVote','followPoints'].every(k=>Number.isInteger(c[k])&&c[k]>=0&&c[k]<=100)&&['chat','creator'].every(t=>Array.isArray(c[t+'Names'])&&Array.isArray(c[t+'Points'])&&c[t+'Names'].length===c[t+'Points'].length&&c[t+'Names'].length===7&&c[t+'Names'].every(x=>typeof x==='string'&&x.length>0&&x.length<80)&&c[t+'Points'].every((x,i)=>Number.isInteger(x)&&((x>=0&&x<=10000)||(x===-20&&/^rosquinha$/i.test(c[t+'Names'][i].trim())))))}
if(!valid(cfg))cfg={...defaults};if(![3,5,7].includes(cfg.bestOf))cfg.bestOf=3;
let game={chat:cfg.start,creator:cfg.start,winsChat:0,winsCreator:0,ranking:{},supporters:{},activity:{},last:null,feed:[],history:[],round:1,remaining:cfg.duration,phase:'playing',champion:null,championship:1};/* V12.6 — bounded, local-only performance telemetry. */
const clients=new Set();
const v126ServerPerf={asset200:0,asset304:0,sseHeartbeats:0,eventLoopLagMs:0,eventLoopLagMaxMs:0,startedAt:Date.now()};
let v126ExpectedProbe=Date.now()+5000;
setInterval(()=>{
 const now=Date.now(),lag=Math.max(0,now-v126ExpectedProbe);
 v126ServerPerf.eventLoopLagMs=Math.round(lag);
 v126ServerPerf.eventLoopLagMaxMs=Math.max(v126ServerPerf.eventLoopLagMaxMs,Math.round(lag));
 v126ExpectedProbe=now+5000;
},5000).unref();
const v126HeartbeatMs=Math.max(750,Math.min(60000,Number(process.env.LIVEPULSE_SSE_HEARTBEAT_MS)||20000));
setInterval(()=>{
 for(const connection of clients){
  try{if(connection.writableEnded||connection.destroyed){clients.delete(connection);continue}connection.write(': heartbeat\n\n');v126ServerPerf.sseHeartbeats++}
  catch(_){clients.delete(connection);try{connection.destroy()}catch(_){}}
 }
},v126HeartbeatMs).unref();
const runtime={paused:false,boss:null,mission:null,surprise:null,combo:{},roundSupport:{},champSupport:{},logs:[],roundTimer:null,connectStatus:demo?'demo':'desconectado'};
const runtimeFile=path.join(__dirname,'batalha_runtime_v49.json');
const statsFile=path.join(__dirname,'batalha_stats_v51.json');
const stats={likes:0,followers:0,shares:0,gifts:0,entries:0,roundLikes:0,roundFollowers:0,roundShares:0,roundGifts:0,byUser:{},milestones:{},duel:null,duelHistory:[]};
const goals={likes:500,followers:10,shares:10};
const v54file=path.join(__dirname,'batalha_comunidade_v54.json');
const community={users:{},poll:{active:false,options:['chefao','missao'],votes:{},ends:0},events:[],hourly:{},giftCatalog:{},season:1};
try{const saved=JSON.parse(fs.readFileSync(v54file,'utf8'));if(saved&&typeof saved==='object')Object.assign(community,saved)}catch(_){}
const communityStarted=Date.now();
function userProfile(name){let u=community.users[name];if(!u)u=community.users[name]={xp:0,visits:0,gifts:0,likes:0,shares:0,follows:0,commands:0,lastSeen:0,medals:[]};return u}
function profileTitle(p){return p.xp>=2000?'Rei da Arena':p.xp>=800?'Lenda':p.xp>=300?'MVP':p.xp>=100?'Herói':'Apoiador'}
function addCommunity(type,name,amount){const p=userProfile(name);const now=Date.now();if(type==='enter'&&now-p.lastSeen>3600000)p.visits++;p.lastSeen=now;const n=Math.max(1,Math.min(1000,Number(amount)||1));if(type==='gift'){p.gifts+=n;p.xp+=n*10}else if(type==='like'){p.likes+=n;p.xp+=Math.min(n,50)}else if(type==='share'){p.shares++;p.xp+=8}else if(type==='follow'){p.follows++;p.xp+=20}else if(type==='chat'){p.commands++;p.xp+=1}
 for(const [id,ok] of [['Primeiro Presente',p.gifts>=1],['Apoiador Fiel',p.visits>=3],['100 Curtidas',p.likes>=100],['Herói',p.xp>=100]])if(ok&&!p.medals.includes(id)){p.medals.push(id);emit({achievement:{user:name,medal:id,title:profileTitle(p)}})}
 const hour=new Date(now).toISOString().slice(0,13);community.hourly[hour]=(community.hourly[hour]||0)+1;
 if(Object.keys(community.hourly).length>240)delete community.hourly[Object.keys(community.hourly)[0]];
}
function saveCommunity(){try{const t=v54file+'.tmp';fs.writeFileSync(t,JSON.stringify(community));fs.renameSync(t,v54file)}catch(e){console.error('Falha comunidade:',e.message)}}
setInterval(saveCommunity,15000);process.on('exit',saveCommunity);
function topCommunity(){return Object.entries(community.users).sort((a,b)=>b[1].xp-a[1].xp).slice(0,10).map(([user,p])=>({user,xp:p.xp,title:profileTitle(p),visits:p.visits,gifts:p.gifts}))}
function pollVote(user,choice){const p=community.poll;if(!p.active||Date.now()>p.ends||!p.options.includes(choice))return false;p.votes[user]=choice;emit({poll:{active:p.active,options:p.options,votes:Object.values(p.votes).reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{})}});return true}
function startPoll(){community.poll={active:true,options:['chefao','missao'],votes:{},ends:Date.now()+60000};emit({poll:{active:true,options:community.poll.options}})}
function endPoll(){const p=community.poll;if(!p.active)return;p.active=false;const counts=Object.values(p.votes).reduce((a,x)=>(a[x]=(a[x]||0)+1,a),{});const winner=(counts.chefao||0)>=(counts.missao||0)?'chefao':'missao';emit({pollResult:{winner,counts}});saveCommunity()}
setInterval(()=>{if(community.poll.active&&Date.now()>=community.poll.ends)endPoll()},1000);


const advancedPath=path.join(__dirname,'batalha_avancado_v55.json');
const advanced={season:1,bracket:[],bossStage:0,skills:{chat:0,creator:0},raffle:{entries:[],winners:[]},theme:'original',visualMode:'economico',voice:{speed:1,pitch:1,quiet:false},giftImages:{}};
try{Object.assign(advanced,JSON.parse(fs.readFileSync(advancedPath,'utf8')))}catch(_){}
function saveAdvanced(){const t=advancedPath+'.tmp';fs.writeFileSync(t,JSON.stringify(advanced));fs.renameSync(t,advancedPath)}
function recordTournament(team){advanced.bracket.push({season:advanced.season,team,championship:game.championship,ts:Date.now()});if(advanced.bracket.filter(x=>x.season===advanced.season).length>=8)advanced.season++;saveAdvanced()}
function hideBoss(){combatStop();saveAdvanced()}
function raffleEnter(user){if(!advanced.raffle.entries.includes(user)){advanced.raffle.entries.push(user);emit({raffleEntry:{user,count:advanced.raffle.entries.length}})}}
function raffleDraw(){if(!advanced.raffle.entries.length)throw Error('Nenhum participante inscrito');const entries=advanced.raffle.entries;const winner=entries[crypto.randomInt(entries.length)];advanced.raffle.winners.unshift({winner,ts:Date.now()});advanced.raffle.winners=advanced.raffle.winners.slice(0,20);advanced.raffle.entries=[];emit({raffleWinner:{winner}});saveAdvanced()}
function useSkill(team){if(game.phase!=='playing')throw Error('A rodada não está ativa');if(Date.now()-advanced.skills[team]<45000)throw Error('Habilidade em recarga');advanced.skills[team]=Date.now();const pts=economyCore.boundPoints(Math.max(5,Math.round(cfg.goal*.03)),cfg);game[team]+=pts;if(combat.active)combatShield(team);emit({skill:{team,pts},game});saveAdvanced()}
function bossStage(){if(!combat.active)combatStart();else throw Error('Fases avançam automaticamente ao reduzir o HP do chefão')}


/* V5.7: combate cooperativo real, independente da pontuação competitiva */
const combatFile=path.join(__dirname,'batalha_combate_v57.json');
const combat={active:false,stage:0,hp:0,maxHp:0,towers:{chat:{hp:300,maxHp:300,shield:0},creator:{hp:300,maxHp:300,shield:0}},damage:{chat:0,creator:0},supporters:{},kills:0,history:[],nextAttack:0,started:0,endedAt:0};
try{const saved=JSON.parse(fs.readFileSync(combatFile,'utf8'));if(saved&&typeof saved==='object'){Object.assign(combat,saved);combat.towers={...combat.towers,...saved.towers}}}catch(_){}
function combatSave(){try{const t=combatFile+'.tmp';fs.writeFileSync(t,JSON.stringify(combat));fs.renameSync(t,combatFile)}catch(e){console.error('Falha ao salvar combate:',e.message)}}
function combatSnapshot(){return {active:combat.active,stage:combat.stage,hp:combat.hp,maxHp:combat.maxHp,towers:combat.towers,damage:combat.damage,kills:combat.kills,top:Object.entries(combat.supporters).sort((a,b)=>b[1]-a[1]).slice(0,5),nextAttack:combat.nextAttack,nextBossAutoAt:combat.active?0:nextBossAutoAt,endedAt:combat.endedAt,history:combat.history.slice(0,5)}}
let nextBossAutoAt=Date.now()+30000;
function combatStart(){if(combat.active)throw Error('Chefão já está ativo');if(game.phase!=='playing')throw Error('Inicie uma rodada para invocar o chefão');nextBossAutoAt=0;combat.active=true;combat.stage=1;combat.maxHp=450;combat.hp=450;combat.damage={chat:0,creator:0};combat.supporters={};combat.towers={chat:{hp:300,maxHp:300,shield:0},creator:{hp:300,maxHp:300,shield:0}};combat.nextAttack=Date.now()+10000;combat.started=Date.now();combat.endedAt=0;advanced.bossStage=1;runtime.boss=null;emit({combatStart:combatSnapshot(),combat:combatSnapshot(),bossStage:{stage:1}});combatSave()}
function combatStop(){nextBossAutoAt=Date.now()+30000;combat.active=false;combat.endedAt=Date.now();advanced.bossStage=0;emit({combat:combatSnapshot(),bossStage:{stage:0}});combatSave()}
function combatHit(user,team,pts){if(!combat.active||game.phase!=='playing'||runtime.paused||!['chat','creator'].includes(team))return;
 const dmg=Math.max(0,Math.min(1500,Math.round(Number(pts)||0)));if(!dmg)return;
 combat.hp=Math.max(0,combat.hp-dmg);combat.damage[team]+=dmg;if(Object.prototype.hasOwnProperty.call(combat.supporters,user)||Object.keys(combat.supporters).length<500)combat.supporters[user]=(combat.supporters[user]||0)+dmg;
 emit({combatHit:{team,user,damage:dmg},combat:combatSnapshot()});
 if(combat.hp===0){if(combat.stage<3){combat.stage++;combat.maxHp=combat.stage===2?950:1200;combat.hp=combat.maxHp;advanced.bossStage=combat.stage;combat.nextAttack=Date.now()+7500;emit({combatPhase:{stage:combat.stage},combat:combatSnapshot(),bossStage:{stage:combat.stage}})}
 else{combat.active=false;nextBossAutoAt=Date.now()+30000;combat.endedAt=Date.now();combat.kills++;advanced.bossStage=0;
 const winner=combat.damage.chat>=combat.damage.creator?'chat':'creator';
 const best=Object.entries(combat.supporters).sort((a,b)=>b[1]-a[1])[0];const reward=economyCore.boundPoints(Math.min(100,Math.round(cfg.goal*.15)),cfg);
 game[winner]+=reward;
 if(best){const p=userProfile(best[0]);p.xp+=100;if(!p.medals.includes('Caçador de Chefões'))p.medals.push('Caçador de Chefões');emit({achievement:{user:best[0],medal:'Caçador de Chefões',title:profileTitle(p)}})}
 combat.history.unshift({ts:Date.now(),winner,best:best?.[0]||null,damage:combat.damage});combat.history=combat.history.slice(0,25);
 emit({combatVictory:{winner,best:best?.[0]||null,reward},combat:combatSnapshot(),game,bossStage:{stage:0}});saveCommunity()}
 }
 combatSave();
}
function combatAttack(){if(!combat.active||runtime.paused||game.phase!=='playing'||Date.now()<combat.nextAttack)return;
 combat.nextAttack=Date.now()+Math.max(5000,11000-combat.stage*1200);
 const team=combat.damage.chat>=combat.damage.creator?'chat':'creator';
 const tower=combat.towers[team];const raw=15+combat.stage*12;
 const absorbed=Math.min(tower.shield,raw);tower.shield-=absorbed;tower.hp=Math.max(0,tower.hp-(raw-absorbed));
 emit({combatAttack:{team,stage:combat.stage,damage:raw-absorbed,blocked:absorbed,ts:Date.now()},combat:combatSnapshot()});
 if(tower.hp===0){tower.hp=tower.maxHp;tower.shield=0;combat.hp=Math.min(combat.maxHp,combat.hp+Math.round(combat.maxHp*.12));emit({combatTowerDown:{team},combat:combatSnapshot()})}
 combatSave();
}
function combatShield(team){if(!combat.active)throw Error('Chefão não está ativo');const tower=combat.towers[team];tower.shield=Math.min(180,tower.shield+65);emit({combatShield:{team,value:tower.shield,ts:Date.now()},combat:combatSnapshot()});combatSave()}
setInterval(combatAttack,1000);setInterval(combatSave,12000);
// Reinvocacao automatica: 30 segundos apos o fim do chefao, sem sobrepor batalhas.
setInterval(()=>{if(game.phase!=='playing'||runtime.paused||combat.active)return;
 if(!nextBossAutoAt)nextBossAutoAt=Date.now()+30000;
 if(Date.now()>=nextBossAutoAt){try{combatStart()}catch(e){console.error('Auto boss:',e.message);nextBossAutoAt=Date.now()+30000}}
},1000);

const retentionFile=path.join(__dirname,'batalha_retencao_v53.json');
const retention={rounds:[],champions:[],heroes:[],totalRounds:0,totals:{chat:0,creator:0},lastChampion:null};
try{const saved=JSON.parse(fs.readFileSync(retentionFile,'utf8'));Object.assign(retention,saved)}catch(_){}
let overtimeActive=false,overtimeStarted=0,finishTimer=null;
try{const old=JSON.parse(fs.readFileSync(statsFile,'utf8'));for(const k of ['likes','followers','shares','gifts','entries','byUser','milestones','duelHistory'])if(old[k]!=null)stats[k]=old[k]}catch(_){}
const seenSocial=new Map();let lastPersist=0;
const persistentSeen=new Map();try{const d=JSON.parse(fs.readFileSync(path.join(__dirname,'batalha_seen_v53.json'),'utf8'));for(const [k,t] of d)if(Date.now()-t<600000)persistentSeen.set(k,t)}catch(_){}
function saveSeen(){try{const now=Date.now();for(const [k,t] of persistentSeen)if(now-t>600000)persistentSeen.delete(k);const tmp=path.join(__dirname,'batalha_seen_v53.json.tmp');fs.writeFileSync(tmp,JSON.stringify([...persistentSeen].slice(-1500)));fs.renameSync(tmp,tmp.slice(0,-4))}catch(e){console.error('Falha dedup:',e.message)}}
function dedupSocial(type,d){const id=d.msgId||d.messageId||d.eventId;if(!id)return true;const key=type+':'+id,now=Date.now();if(seenSocial.has(key)||persistentSeen.has(key))return false;seenSocial.set(key,now);persistentSeen.set(key,now);if(seenSocial.size>2500)for(const [k,t] of seenSocial)if(now-t>180000)seenSocial.delete(k);return true}
function saveStats(){try{const f=statsFile+'.tmp';fs.writeFileSync(f,JSON.stringify(stats));fs.renameSync(f,statsFile)}catch(e){console.error('Falha stats:',e.message)}}
setInterval(saveStats,12000);process.on('SIGINT',saveStats);process.on('SIGTERM',saveStats);
function topTwo(){return Object.entries(game.ranking).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([name])=>name)}
function duelStart(){const names=topTwo();if(names.length<2)return false;stats.duel={players:names,points:{[names[0]]:0,[names[1]]:0},until:Date.now()+45000};emit({duel:{type:'start',...stats.duel}});return true}
function duelEnd(){if(!stats.duel)return;const d=stats.duel;const winner=d.points[d.players[0]]===d.points[d.players[1]]?'empate':d.points[d.players[0]]>d.points[d.players[1]]?d.players[0]:d.players[1];stats.duelHistory.unshift({winner,players:d.players,points:d.points,ts:Date.now()});stats.duelHistory=stats.duelHistory.slice(0,15);stats.duel=null;emit({duel:{type:'end',winner}})}
function addStat(type,user,amount){const key=type==='like'?'likes':type==='follow'?'followers':type==='share'?'shares':type==='gift'?'gifts':type==='enter'?'entries':null;if(!key)return;const n=type==='like'?Math.max(1,Math.min(1000,Number(amount)||1)):type==='gift'?Math.max(1,Math.min(100,Number(amount)||1)):1;stats[key]+=n;if(key!=='entries')stats['round'+key[0].toUpperCase()+key.slice(1)]+=n;const person=stats.byUser[user]??={likes:0,followers:0,shares:0,gifts:0,entries:0,interactions:0};person[key]=(person[key]||0)+n;person.interactions++;if(['likes','followers','shares'].includes(key)){const step=goals[key];const milestone=Math.floor(stats[key]/step);if(milestone>(stats.milestones[key]||0)){stats.milestones[key]=milestone;emit({goalReached:{key,value:stats[key],target:milestone*step,nextTarget:(milestone+1)*step}})}}if(person.interactions===5||person.interactions===15||person.interactions===30)emit({streak:{user,count:person.interactions}});if(stats.duel&&stats.duel.players.includes(user))stats.duel.points[user]+=type==='gift'?n*10:type==='follow'?5:type==='share'?3:type==='like'?Math.min(n,20):0}

try{const saved=JSON.parse(fs.readFileSync(runtimeFile,'utf8'));if(saved.game&&saved.runtime){Object.assign(game,saved.game);runtime.paused=!!saved.runtime.paused;runtime.roundSupport=saved.runtime.roundSupport||{};runtime.champSupport=saved.runtime.champSupport||{};runtime.logs=saved.runtime.logs||[];runtime.connectStatus=demo?'demo':'desconectado';if(game.phase!=='playing'){game.phase='playing';game.remaining=cfg.duration}}}catch(_){}
function log(kind,detail){const e={ts:Date.now(),kind,detail:String(detail).slice(0,200)};runtime.logs.unshift(e);runtime.logs=runtime.logs.slice(0,120);console.log('[V4.9]',kind,e.detail)}
function saveRuntime(){saveStats();saveSeen();saveCommunity();saveAdvanced();combatSave();try{const t=retentionFile+'.tmp';fs.writeFileSync(t,JSON.stringify(retention));fs.renameSync(t,retentionFile)}catch(e){console.error('Falha histórico:',e.message)}try{const t=runtimeFile+'.tmp';fs.writeFileSync(t,JSON.stringify({game,runtime:{paused:runtime.paused,roundSupport:runtime.roundSupport,champSupport:runtime.champSupport,logs:runtime.logs}}));fs.renameSync(t,runtimeFile)}catch(e){console.error('Falha backup de estado:',e.message)}}
setInterval(saveRuntime,10000);process.on('SIGINT',()=>{saveRuntime();process.exit(0)});process.on('SIGTERM',()=>{saveRuntime();process.exit(0)});
function publicState(){return {community:{top:topCommunity(),poll:community.poll,season:community.season},advanced:{season:advanced.season,bracket:advanced.bracket.slice(-8),bossStage:advanced.bossStage,raffleEntries:advanced.raffle.entries.length,raffleWinners:advanced.raffle.winners.slice(0,5),theme:advanced.theme,visualMode:advanced.visualMode||'economico',voice:advanced.voice,giftImages:advanced.giftImages},combat:combatSnapshot(),retention,overtime:overtimeActive,paused:runtime.paused,boss:runtime.boss,mission:runtime.mission,surprise:runtime.surprise,combo:runtime.combo,roundSupport:runtime.roundSupport,champSupport:runtime.champSupport,logs:runtime.logs.slice(0,25),connectStatus:runtime.connectStatus,liveDiagnostics:runtime.liveDiagnostics||null,stats,goals,economy:economy.snapshot(cfg)}}
function special(type,team){const now=Date.now();if(type==='boss'){runtime.boss={hp:300,until:now+45000,chat:0,creator:0};log('boss','Chefão da arena apareceu!')}
else if(type==='mission'){runtime.mission={team:team||'chat',target:120,progress:0,until:now+45000,reward:economyCore.boundPoints(Math.min(80,Math.round(cfg.goal*.12)),cfg)};log('missao','Missão para '+runtime.mission.team)}
else if(type==='surprise'){runtime.surprise={multiplier:2,until:now+30000};log('surpresa','Pontuação em dobro por 30 segundos')}
emit({game,special:{type,team},runtime:publicState()});saveRuntime()}
function applyGiftBonus(user,team,base){const now=Date.now();const prev=runtime.combo[user];const count=prev&&prev.team===team&&now-prev.ts<12000?Math.min(5,prev.count+1):1;runtime.combo[user]={team,count,ts:now};
const result=economyCore.giftScore(base,count,runtime.surprise&&now<runtime.surprise.until?runtime.surprise.multiplier:1,cfg);
const {pts,mult}=result;if(result.capped)economy.counters.scoreCapped++;economy.counters.giftProcessed++;
if(runtime.boss&&now<runtime.boss.until&&pts>0){runtime.boss.hp=Math.max(0,runtime.boss.hp-pts);runtime.boss[team]+=pts;if(runtime.boss.hp===0){const winner=runtime.boss.chat>=runtime.boss.creator?'chat':'creator';const reward=economyCore.boundPoints(Math.min(100,Math.round(cfg.goal*.15)),cfg);game[winner]+=reward;log('boss','Chefão derrotado por '+winner+'! Bônus '+reward);emit({special:{type:'bossWin',team:winner}});runtime.boss=null}}
if(runtime.mission&&now<runtime.mission.until&&team===runtime.mission.team&&pts>0){runtime.mission.progress+=pts;if(runtime.mission.progress>=runtime.mission.target){game[team]+=runtime.mission.reward;log('missao','Missão concluída por '+team);emit({special:{type:'missionWin',team}});runtime.mission=null}}
return {pts,mult,count}}

function emit(e){const msg='data: '+JSON.stringify(e)+'\n\n';for(const c of clients){try{c.write(msg)}catch(_){clients.delete(c)}}}
function reset(){if(combat.active)combatStop();nextBossAutoAt=Date.now()+30000;overtimeActive=false;overtimeStarted=0;for(const k of ['roundLikes','roundFollowers','roundShares','roundGifts'])stats[k]=0;duelEnd();runtime.roundSupport={};runtime.combo={};runtime.boss=null;runtime.mission=null;runtime.surprise=null;game.chat=cfg.start;game.creator=cfg.start;game.remaining=cfg.duration;game.phase='playing';game.round++}
function finish(reason){
 if(game.phase!=='playing')return;
 const delta=Math.abs(game.chat-game.creator);
 if(!overtimeActive&&reason==='tempo'&&delta<=Math.max(20,Math.floor(cfg.goal*.06))){
  overtimeActive=true;overtimeStarted=Date.now();game.remaining=20;
  emit({overtimeStart:{seconds:20,difference:delta},game,runtime:publicState()});
  return;
 }
 if(combat.active)combatStop();nextBossAutoAt=0;overtimeActive=false;game.phase='ended';runtime.paused=false;
 const winner=game.chat===game.creator?'empate':game.chat>game.creator?'chat':'creator';
 if(winner==='chat')game.winsChat++;if(winner==='creator')game.winsCreator++;
 const needed=Math.floor(cfg.bestOf/2)+1;
 if(winner!=='empate'&&(game.winsChat>=needed||game.winsCreator>=needed)){game.champion=winner;game.phase='champion';}
 duelEnd();
 const hero=Object.entries(runtime.roundSupport).sort((a,b)=>b[1]-a[1])[0]||null;
 const result={round:game.round,championship:game.championship,winner,reason,chat:game.chat,creator:game.creator,champion:game.champion,hero:hero?{user:hero[0],gifts:hero[1]}:null,ts:Date.now()};
 game.history.unshift(result);game.history=game.history.slice(0,20);
 retention.totalRounds++;retention.totals.chat+=(winner==='chat'?1:0);retention.totals.creator+=(winner==='creator'?1:0);
 retention.rounds.unshift(result);retention.rounds=retention.rounds.slice(0,100);
 if(result.hero){retention.heroes.unshift({...result.hero,round:game.round,ts:result.ts});retention.heroes=retention.heroes.slice(0,40)}
 if(game.champion){recordTournament(game.champion);retention.lastChampion=game.champion;retention.champions.unshift({team:game.champion,ts:Date.now(),championship:game.championship});retention.champions=retention.champions.slice(0,30)}
 emit({game,roundEnd:result,runtime:publicState()});
 if(finishTimer)clearTimeout(finishTimer);
 const champion=!!game.champion;
 finishTimer=setTimeout(()=>{finishTimer=null;if(champion){runtime.champSupport={};game.championship++;game.winsChat=0;game.winsCreator=0;game.round=0;game.champion=null;}reset();emit({game,roundStart:game.round,runtime:publicState()})},champion?6500:3500);
 saveRuntime();
}
function event(type,user,message,amount=1,team=null,idx=null){
 user=String(user||'Visitante').slice(0,45);message=String(message||'').slice(0,150);
 game.ranking[user]??=0;game.activity[user]=(game.activity[user]||0)+1;
 addStat(type,user,amount);addCommunity(type,user,amount);
 let pts=0;const activeRound=game.phase==='playing'&&!runtime.paused;
 if(type==='chat'){
  const m=message.toLowerCase().trim();
  if(/(^|\s)!chat(\s|$)/.test(m)){team='chat';economy.assign(user,team);if(economy.allow('vote',user,1500))pts=cfg.chatVote}
  else if(/(^|\s)!(criador|azul)(\s|$)/.test(m)){team='creator';economy.assign(user,team);if(economy.allow('vote',user,1500))pts=cfg.creatorVote}
  else if(m==='!ajuda')emit({help:{user,text:'Comandos: !chat, !azul, !voto chefao, !voto missao, !perfil'}});
  else if(m.startsWith('!voto ')&&economy.allow('poll',user,2000))pollVote(user,m.slice(6).trim());
  else if(m==='!sorteio'&&economy.allow('raffle',user,3000))raffleEnter(user);
  else if(m==='!perfil'&&economy.allow('profile',user,3000)){const p=userProfile(user);emit({profile:{user,xp:p.xp,title:profileTitle(p)}})}
 }
 if(type==='gift'&&['chat','creator'].includes(team)&&Number.isInteger(idx)&&idx>=0&&idx<7){
  const quantity=Math.max(1,Math.min(100,Math.trunc(Number(amount)||1)));
  const giftName=cfg[team+'Names'][idx];
  const rawPoints=Number(cfg[team+'Points'][idx])||0;
  const attackOpponent=/^rosquinha$/i.test(String(giftName).trim())&&rawPoints<0;
  const base=Math.abs(rawPoints)*quantity;
  if(activeRound){const bonus=applyGiftBonus(user,team,base);pts=bonus.pts;
   if(bonus.count===3||bonus.count===5)message+=' 🔥 COMBO '+bonus.count+' (×'+bonus.mult+')';
   combatHit(user,team,pts);
   game.supporters[user]=(game.supporters[user]||0)+quantity;
   runtime.roundSupport[user]=(runtime.roundSupport[user]||0)+quantity;
   runtime.champSupport[user]=(runtime.champSupport[user]||0)+quantity;
   if(attackOpponent){
    const opponent=team==='chat'?'creator':'chat';
    game[opponent]=Math.max(0,game[opponent]-pts);
    game.ranking[user]+=pts; // opponent damage counts as support, not own scoreboard gain
    pts=-pts; // transparent event log/UI shows -20 for the opponent
   }
  }else pts=attackOpponent?-economyCore.boundPoints(base,cfg):economyCore.boundPoints(base,cfg);
 }else if(type==='gift'){team=null;idx=null;pts=0}
 if(['like','share','follow'].includes(type)){
  team=economy.teamOf(user);
  const counts=Number.isFinite(Number(amount))?Math.max(0,Number(amount)):0;
  if(team&&type==='like'&&counts>=10&&economy.allow('like',user,1200))pts=Math.min(4,Math.floor(counts/10));
  else if(team&&type==='share'&&economy.allow('share',user,30000))pts=3;
  else if(team&&type==='follow'&&economy.allow('follow',user,600000))pts=Math.min(3,cfg.followPoints);
  if(pts>0)economy.counters.freeScored++;
 }
 const isRosquinha=type==='gift'&&['chat','creator'].includes(team)&&idx>=0&&idx<7
  && /^rosquinha$/i.test(String(cfg[team+'Names'][idx]).trim());
 pts=isRosquinha?-economyCore.boundPoints(Math.abs(pts),cfg):economyCore.boundPoints(pts,cfg);
 if(activeRound&&team&&pts>0){game[team]=Math.max(0,game[team]+pts);game.ranking[user]+=pts}
 const targetTeam=isRosquinha&&team?(team==='chat'?'creator':'chat'):team;
 const e={type,user,message,amount,team,idx,pts,targetTeam,ts:Date.now()};
 game.last=e;game.feed.unshift(e);game.feed=game.feed.slice(0,15);
 emit({event:e,game,runtime:publicState()});
 if(activeRound&&(game.chat>=cfg.goal||game.creator>=cfg.goal))finish('meta');
}

setInterval(()=>{if(game.phase!=='playing'||runtime.paused)return;const now=Date.now();for(const key of ['boss','mission','surprise'])if(runtime[key]&&now>=runtime[key].until){log(key,'Evento expirou');runtime[key]=null}if(stats.duel&&now>=stats.duel.until)duelEnd();game.remaining--;if(game.remaining<=0)finish('tempo');else emit({tick:game.remaining,game,runtime:publicState()})},1000);
const giftIds={}; // Opcional: IDs reais podem ser adicionados no arquivo batalha_gift_ids.json
try{Object.assign(giftIds,JSON.parse(fs.readFileSync(path.join(__dirname,'batalha_gift_ids.json'),'utf8')))}catch(_){}
function giftMatch(name,id){return economyCore.matchGift(name,id,giftIds,cfg)}

function v121SafeGiftImage(url){
 try{if(typeof url!=='string'||url.length>600||!url.startsWith('https://'))return false;
  const u=new URL(url);return /(^|\.)(tiktokcdn\.com|tiktokv\.com|byteimg\.com|ibytedtos\.com|muscdn\.com)$/i.test(u.hostname)
 }catch(_){return false}
}
function v121GiftCount(d){
 const raw=Number(d&&d.repeatCount);
 return Number.isFinite(raw)?Math.max(1,Math.min(100,Math.trunc(raw))):1
}
const giftSeen=new Map();
function uniqueGift(d){const now=Date.now();if(giftSeen.size>1000)for(const [k,t] of giftSeen)if(now-t>120000)giftSeen.delete(k);
 const id=d.msgId||d.messageId||d.eventId||null;
 if(!id)return true;const k=String(id);if(giftSeen.has(k)||persistentSeen.has('gift:'+k))return false;giftSeen.set(k,now);persistentSeen.set('gift:'+k,now);return true;}
// Evita repetir boas-vindas e controla volume de eventos sociais.
const welcomes=new Map();
function socialEvent(type,user,message,amount=1){
 const now=Date.now(),key=String(user||'Visitante').toLowerCase();
 if(type==='enter'){
  if(welcomes.has(key)&&now-welcomes.get(key)<15*60*1000)return;
  welcomes.set(key,now);
  if(welcomes.size>2500)for(const [k,v] of welcomes)if(now-v>15*60*1000)welcomes.delete(k);
 }
 event(type,user,message,amount);
}
const html=`<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta charset="utf-8"><title>LivePulse — Batalha</title><style>
*{box-sizing:border-box}body{margin:0;background:#080c1b;color:white;font-family:system-ui,Arial;overflow-x:hidden}.arena{max-width:540px;margin:auto;min-height:100vh;position:relative;background:linear-gradient(90deg,#401023 0 49.8%,#092e46 50.2%);overflow:hidden}.arena:before{content:'';position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 40px,#ffffff08 41px 42px);pointer-events:none}.header{position:relative;display:flex;justify-content:space-around;align-items:center;text-align:center;padding:18px 0 4px}.side{font-size:23px;font-weight:1000;text-shadow:2px 3px #000}.red{color:#ff8b99}.blue{color:#80d8ff}.score{font-size:42px;color:white}.vs{font-size:26px;font-weight:900}.meta{text-align:center;font-size:11px;opacity:.9}.field{position:relative;height:735px;display:grid;grid-template-columns:82px minmax(0,1fr) 82px;align-items:stretch;margin-top:10px}.gifts{display:flex;flex-direction:column;justify-content:space-around;z-index:3}.gift{text-align:center;font-size:10px;font-weight:900;text-shadow:1px 2px black;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}.gift img{display:block;width:62px;height:62px;object-fit:contain;margin:auto;filter:drop-shadow(0 3px 3px #0008)}.gift b{display:block;color:#75ffac;font-size:13px}.towers{display:flex;align-items:end;justify-content:space-around;gap:18px;padding-bottom:24px;position:relative}.tower{width:43%;height:400px;position:relative;display:flex;flex-direction:column;justify-content:end;filter:drop-shadow(4px 5px 3px #0008)}.stack{height:40%;min-height:10px;max-height:95%;transition:height .5s;position:relative;background:repeating-linear-gradient(to bottom,#0000 0 25px,#101020 26px 29px),var(--color);border:3px solid #0c1020;transform:skewY(-7deg)}.stack:before{content:'';position:absolute;top:-16px;left:-3px;width:100%;height:19px;background:var(--top);transform:skewX(-35deg);border:2px solid #0c1020}.city{position:absolute;bottom:0;width:100%;height:120px;opacity:.3;background:repeating-linear-gradient(90deg,#000 0 20px,transparent 20px 28px);pointer-events:none}.status{text-align:center;font-size:14px;padding:10px;min-height:40px}.controls{position:relative;display:flex;justify-content:center;padding:8px}.controls button{font-size:17px;border:0;border-radius:12px;background:#f8c44e;color:#111;padding:12px 22px;font-weight:900}.rank{position:relative;margin:8px 14px 30px;background:#0006;padding:12px;border-radius:12px}.rank h3{margin:0 0 8px}.rank ol{margin:0;padding-left:23px}.hint{text-align:center;font-size:12px;opacity:.85;padding:8px}.flash{animation:pop .5s}@keyframes pop{from{transform:scale(1.13);filter:brightness(1.9)}to{transform:scale(1);filter:brightness(1)}}

/* V4.6: arena compacta, ajustada a altura do celular */
@media (max-width:700px){
 .arena{min-height:100dvh}
 .header{padding:5px 0 2px}
 .side{font-size:clamp(13px,3.7vw,19px)}
 .score{font-size:clamp(23px,7vw,34px)}
 .vs{font-size:19px}
 .meta{font-size:10px}
 .field{height:clamp(350px,calc(100dvh - 215px),660px);margin-top:3px;grid-template-columns:clamp(64px,19vw,82px) minmax(0,1fr) clamp(64px,19vw,82px)}
 .gift{min-height:0;flex:1;gap:0;font-size:clamp(8px,2.5vw,10px);line-height:1.12}
 .gift img{width:min(58px,15vw);height:clamp(30px,6dvh,56px);object-fit:contain}
 .gift b{font-size:12px}
 .towers{gap:8px;padding-bottom:10px}
 .tower{height:74%;width:45%}
 .stack:before{top:-12px;height:15px}
 .status{padding:3px 6px;min-height:25px;font-size:12px}
 .controls{padding:4px}
 .controls button{font-size:14px;padding:8px 16px}
 .hint{font-size:10px;padding:3px}
 .rank{margin:5px 12px 14px;padding:7px 10px}
 .rank h3{font-size:15px}
}
@media (max-height:650px) and (max-width:700px){
 .field{height:clamp(280px,calc(100dvh - 175px),440px)}
 .gift img{height:clamp(23px,5dvh,40px)}
 .tower{height:70%}
}
 .fx{position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden}.spark{position:absolute;width:8px;height:8px;border-radius:50%;background:#ffe46a;animation:burst .8s forwards}@keyframes burst{to{transform:translate(var(--x),var(--y)) scale(0);opacity:0}}.shake{animation:shake .3s}@keyframes shake{30%{filter:brightness(1.8);transform:translateX(-4px)}70%{transform:translateX(4px)}}.settings{position:relative;margin:6px 12px;padding:8px;background:#0007;border-radius:10px}.settings input{width:75px;padding:4px}.settings label{display:inline-flex;flex-direction:column;margin:4px;font-size:11px}.settings textarea{width:100%;height:110px}.settings button{padding:8px;background:#f8c44e;border:0;border-radius:7px}.rank h4{margin:10px 0 4px} body.overlay .settings,body.overlay .rank,body.overlay .hint,body.overlay .admin-v49{display:none!important}body.overlay .arena{min-height:100dvh}
.overlay-link{position:relative;margin:3px 12px;text-align:center;font-size:11px}
body.overlay .overlay-link{display:none}
.admin-v49{position:relative;margin:8px 14px;background:#0007;padding:10px;border-radius:12px;font-size:13px}.admin-v49 summary{cursor:pointer;font-weight:bold}.adminbuttons{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.adminbuttons button{background:#233b5c;color:#fff;border:1px solid #6990bc;border-radius:8px;padding:9px 3px}.admin-v49 ol{padding-left:24px;max-height:140px;overflow:auto}.v49event{position:absolute;left:15%;right:15%;top:45%;z-index:10;text-align:center;background:#111b;border:2px solid #ffd86d;border-radius:14px;padding:12px;font-size:16px;font-weight:900;pointer-events:none;animation:pop .5s}
.v51panel{position:relative;margin:8px 14px;background:#0008;padding:10px;border-radius:12px;font-size:12px}.v51panel summary{cursor:pointer;font-weight:bold}.v51panel button{padding:8px;background:#233b5c;color:white;border:1px solid #6990bc;border-radius:8px}.v51panel p{margin:5px 0}body.overlay .v51panel{display:none!important}

.v55panel{position:relative;margin:8px 14px;background:#0008;padding:10px;border-radius:12px;font-size:12px}.v55panel summary{cursor:pointer;font-weight:bold}.v55panel button{margin:4px}.v55panel label{display:block;margin:8px 0}body.overlay .v55panel{display:none!important}
body.theme-neon .field{filter:saturate(1.4)}body.theme-gold .field{filter:sepia(.24) saturate(1.25)}
.v54panel{position:relative;margin:8px 14px;background:#0008;padding:10px;border-radius:12px;font-size:12px}.v54panel summary{cursor:pointer;font-weight:bold}.v54panel button{margin:4px}body.overlay .v54panel{display:none!important}
.v53panel{position:relative;margin:8px 14px;background:#0008;padding:10px;border-radius:12px;font-size:12px}
.v53panel summary{cursor:pointer;font-weight:bold}.v53panel label{display:block;margin:8px 0}.v53panel select{margin-left:8px}body.overlay .v53panel{display:none!important}
.field{position:relative}.v52gift{position:absolute;top:12%;width:37%;z-index:35;pointer-events:none;text-align:center;display:none;filter:drop-shadow(0 4px 10px #000)}
.v52gift.chat{left:1%}.v52gift.creator{right:1%}.v52gift.visible{display:block;animation:v52pop .32s ease-out}
.v52gift .v52box{background:#09122ee8;border:2px solid #ff5d79;border-radius:13px;padding:7px 3px;box-shadow:0 0 18px #fa426866}
.v52gift.creator .v52box{border-color:#55baff;box-shadow:0 0 18px #379fff66}
.v52gift img{display:block;object-fit:contain;width:64px;height:64px;margin:auto}.v52gift .v52emoji{font-size:42px;height:64px;line-height:64px}
.v52gift .v52name{font-size:11px;font-weight:800;overflow-wrap:anywhere}.v52gift .v52user{font-size:10px;overflow-wrap:anywhere;color:#ffe6a5}
@keyframes v52pop{0%{opacity:0;transform:scale(.55)}75%{opacity:1;transform:scale(1.09)}100%{transform:scale(1)}}
.boss-monster{position:absolute;z-index:9;left:50%;top:6%;transform:translateX(-50%);width:112px;text-align:center;pointer-events:none;filter:drop-shadow(0 0 12px #a340e6);animation:bossFloat 2.1s ease-in-out infinite}
.boss-monster[hidden]{display:none!important}.boss-monster-body img{width:110px;height:105px;object-fit:contain;display:block;margin:auto}.boss-monster-body svg{width:105px;height:100px;display:none;margin:auto}.boss-monster-title{font-weight:900;font-size:10px;color:#fff;text-shadow:0 1px 4px #000}.boss-monster-health{height:7px;background:#230c2c;border:1px solid #fff7;border-radius:10px;overflow:hidden;margin:3px 9px}.boss-monster-health span{display:block;height:100%;width:100%;background:linear-gradient(90deg,#ed375a,#ffb137);transition:width .4s}
.boss-monster.phase2 .boss-face{fill:#b34446}.boss-monster.phase3 .boss-face{fill:#252235}.boss-monster.phase3{filter:drop-shadow(0 0 18px #ff274d)}.boss-monster.phase2{filter:drop-shadow(0 0 15px #ff9d25)}
@keyframes bossFloat{0%,100%{transform:translate(-50%,0)}50%{transform:translate(-50%,-7px)}}

/* V5.6.1 optional enhanced visual mode: originals are retained */
body.visual-enhanced .arena{background-image:linear-gradient(90deg,#401023b8 0 49.8%,#092e46b8 50.2%),url('/visual_assets/background_neon.png');background-size:cover;background-position:center}
body.visual-enhanced .towers .tower::after{content:'';position:absolute;bottom:0;left:-9%;width:118%;height:40%;background:url('/visual_assets/tower_chat.png') center bottom/contain no-repeat;pointer-events:none;opacity:.66;filter:drop-shadow(0 0 5px #f55)}
body.visual-enhanced .towers .tower:last-child::after{background-image:url('/visual_assets/tower_creator.png');filter:drop-shadow(0 0 5px #39bfff)}
body.visual-enhanced .stack{z-index:1;opacity:.8}
body.visual-enhanced .boss-monster-body img{filter:drop-shadow(0 0 9px #b64bff)}
@media (prefers-reduced-motion:reduce){body.visual-enhanced .boss-monster{animation:none!important}}

/* V5.6.2: low-cost, opt-in visual effects; preserve compact arena and original sprites */
body.visual-enhanced .tower.damage-hit{animation:lpTowerHit .34s ease-out}
body.visual-enhanced .boss-monster.boss-hit{animation:lpBossHit .45s ease-out}
body.visual-enhanced .tower.skill-cast{animation:lpSkillPulse .6s ease-out}
body.visual-enhanced .boss-monster.phase2 .boss-monster-body img{filter:drop-shadow(0 0 8px #ff6b28)}
body.visual-enhanced .boss-monster.phase3 .boss-monster-body img{filter:drop-shadow(0 0 11px #ff174c)}
.lp-battle-effect{position:absolute;z-index:14;top:46%;font-size:22px;pointer-events:none;animation:lpEffectFly .65s ease-out forwards;text-shadow:0 0 8px currentColor}
.lp-battle-effect.chat{left:30%;color:#ff5d6e}.lp-battle-effect.creator{left:67%;color:#69caff}
.lp-medal-toast{position:absolute;z-index:17;left:50%;top:23%;transform:translateX(-50%);display:flex;align-items:center;gap:5px;max-width:88%;padding:5px 9px;background:#140e26e8;border:1px solid #d7a958;border-radius:10px;font-size:11px;color:white;pointer-events:none;animation:lpMedalPop 3.6s ease-out forwards}
.lp-medal-toast img{width:34px;height:34px;object-fit:contain}
body.visual-enhanced .boss-monster-body img{max-width:115px;max-height:108px;object-fit:contain}
@keyframes lpTowerHit{0%,100%{transform:translateX(0);filter:none}30%{transform:translateX(-4px);filter:brightness(1.7)}60%{transform:translateX(4px)}}
@keyframes lpBossHit{0%,100%{transform:translateX(-50%)}35%{transform:translateX(calc(-50% + 6px));filter:brightness(1.8)}65%{transform:translateX(calc(-50% - 5px))}}
@keyframes lpSkillPulse{0%,100%{filter:none}50%{filter:brightness(1.6) drop-shadow(0 0 8px #ffdd55)}}
@keyframes lpEffectFly{0%{opacity:0;transform:translateY(15px) scale(.5)}35%{opacity:1}100%{opacity:0;transform:translateY(-35px) scale(1.4)}}
@keyframes lpMedalPop{0%{opacity:0;transform:translate(-50%,12px)}12%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){body.visual-enhanced .tower.damage-hit,body.visual-enhanced .boss-monster.boss-hit,body.visual-enhanced .tower.skill-cast,.lp-battle-effect,.lp-medal-toast{animation:none!important}}

/* V5.6.3 - broadcast is clean, compact and without overlapping illustrated towers */
body.overlay .v561panel,body.overlay .controls{display:none!important}
body.overlay .status{padding:5px 8px;font-size:12px;min-height:25px}
body.overlay .arena{min-height:100dvh}
body.visual-enhanced .field{isolation:isolate;grid-template-columns:clamp(54px,16%,76px) minmax(0,1fr) clamp(54px,16%,76px)}
body.visual-enhanced .towers{z-index:2;gap:clamp(4px,2vw,12px);padding-bottom:clamp(5px,1.5vh,14px);align-items:flex-end}
body.visual-enhanced .towers .tower{height:clamp(140px,55%,360px);width:48%;max-width:125px;min-width:0;overflow:visible;filter:none;transform:none}
body.visual-enhanced .towers .tower::after{content:'';position:absolute;inset:0;width:100%;height:100%;left:0;bottom:0;background:url('/visual_assets/tower_chat.png') center bottom/100% 100% no-repeat;opacity:1;filter:drop-shadow(0 2px 4px #0009);z-index:1}
body.visual-enhanced .towers .tower:last-child::after{background-image:url('/visual_assets/tower_creator.png');filter:drop-shadow(0 2px 4px #0009)}
body.visual-enhanced .tower .stack{position:absolute;z-index:2;left:4%;bottom:3%;width:9%;min-height:3px;max-height:82%;opacity:.92;transform:none;border:1px solid #ffffffb0;border-radius:6px;background:linear-gradient(0deg,var(--color),var(--top));box-shadow:0 0 4px var(--color)}
body.visual-enhanced .tower .stack::before{display:none}
body.visual-enhanced .city{height:12%;opacity:.18}
body.visual-enhanced .boss-monster{top:3%;width:clamp(75px,22%,110px);z-index:7}
body.visual-enhanced .boss-monster-body img{width:100%;height:auto;max-height:95px;object-fit:contain}
body.visual-enhanced .v52gift{top:29%;width:clamp(74px,24%,116px);z-index:8}
body.visual-enhanced .v52gift.chat{left:1%}
body.visual-enhanced .v52gift.creator{right:1%}
body.visual-enhanced .v52gift .v52box{padding:3px 2px;border-width:1px}
body.visual-enhanced .v52gift img{width:clamp(35px,8vw,52px);height:clamp(35px,8vw,52px)}
body.visual-enhanced .v52gift .v52name{font-size:10px}
body.visual-enhanced .v52gift .v52user{font-size:9px}
body.visual-enhanced .gifts{min-width:0;z-index:5;justify-content:space-evenly}
body.visual-enhanced .gift{min-height:0;font-size:9px;gap:1px}
body.visual-enhanced .gift img{width:clamp(31px,9vw,53px);height:clamp(31px,9vw,53px)}
body.visual-enhanced .gift b{font-size:10px}
@media(max-width:390px){
 body.visual-enhanced .field{grid-template-columns:54px minmax(0,1fr) 54px}
 body.visual-enhanced .towers{gap:5px}
 body.visual-enhanced .v52gift{top:28%;width:74px}
 body.visual-enhanced .boss-monster{width:78px}
 body.visual-enhanced .boss-monster-body img{max-height:75px}
}
@media(max-height:650px){
 body.visual-enhanced .boss-monster{top:1%}
 body.visual-enhanced .boss-monster-body img{max-height:68px}
 body.visual-enhanced .v52gift{top:25%}
}

/* V5.6.4: transmissão vertical profissional — zonas visuais exclusivas */
body.overlay{background:#080c1b}
body.overlay .arena{width:100%;max-width:540px;min-height:100dvh;display:flex;flex-direction:column;overflow:hidden}
body.overlay .header{flex:0 0 auto;z-index:10;padding:8px 8px 4px;background:linear-gradient(180deg,#060916ef,#111328b0);border-bottom:1px solid #ffffff24}
body.overlay .header .side{font-size:clamp(14px,4vw,20px)}
body.overlay .header .score{font-size:clamp(27px,8vw,39px);line-height:1.08}
body.overlay .header .vs{font-size:clamp(16px,5vw,25px);filter:drop-shadow(0 0 4px #ffbd4e)}
body.overlay .meta{z-index:10;flex:0 0 auto;margin:0;padding:6px 3px;background:#080d1edc;border-bottom:1px solid #ffffff18;font-size:clamp(10px,2.7vw,12px);font-weight:750;letter-spacing:.3px}
body.overlay .field{flex:1 1 auto;min-height:0;height:auto!important;margin:0;display:grid;grid-template-columns:minmax(53px,17%) minmax(0,1fr) minmax(53px,17%);grid-template-rows:minmax(0,1fr);isolation:isolate;overflow:hidden}
body.overlay .gifts{min-width:0;overflow:hidden;position:relative;z-index:6;justify-content:space-evenly;padding:6px 1px}
body.overlay .gift{min-height:0;flex:1 1 0;max-height:18%;padding:1px;gap:1px;font-size:clamp(7px,1.9vw,10px);line-height:1.08}
body.overlay .gift img{width:min(100%,48px);height:clamp(24px,6.3dvh,48px);object-fit:contain}
body.overlay .gift b{font-size:clamp(9px,2.3vw,12px)}
body.overlay .towers{grid-column:2;grid-row:1;z-index:2;display:flex;align-items:flex-end;justify-content:space-between;gap:clamp(6px,3vw,16px);padding:0 5px 4dvh}
body.overlay.visual-enhanced .towers .tower{width:48%;height:min(47%,270px);max-width:145px;min-height:110px;position:relative;background:none;box-shadow:none;border:0}
body.overlay.visual-enhanced .towers .tower::after{inset:0;left:0;top:0;width:100%;height:100%;background-size:contain;background-position:center bottom;filter:drop-shadow(0 3px 5px #000b)}
body.overlay.visual-enhanced .towers .tower .stack{position:absolute;bottom:0;left:3%;width:7px;max-width:8px;min-height:2px;border:1px solid #ffffff90;z-index:3}
body.overlay.visual-enhanced .city{opacity:.08;height:12%}
body.overlay .boss-monster{left:50%;top:3%;width:clamp(78px,24%,116px);max-height:28%;z-index:7}
body.overlay .boss-monster-body img{max-width:100%;max-height:min(18dvh,120px);object-fit:contain}
body.overlay .boss-monster-title{font-size:clamp(9px,2.5vw,11px)}
body.overlay .v52gift{position:absolute;top:32%;width:clamp(65px,22%,100px);max-height:20%;z-index:8}
body.overlay .v52gift.chat{left:18%;right:auto}
body.overlay .v52gift.creator{right:18%;left:auto}
body.overlay .v52gift img{max-width:45px;max-height:45px}
body.overlay .v52gift .v52user,body.overlay .v52gift .v52name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
body.overlay .status{z-index:10;flex:0 0 auto;min-height:29px;max-height:52px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;padding:5px 10px;background:#080d1ef2;border-top:1px solid #ffffff24;font-size:clamp(10px,2.7vw,12px);line-height:1.3}
body.overlay .controls,body.overlay .v561panel,body.overlay .v55panel,body.overlay .v54panel,body.overlay .v53panel,body.overlay .v51panel,body.overlay .admin-v49,body.overlay .settings,body.overlay .rank,body.overlay .hint,body.overlay .overlay-link{display:none!important}
@media(max-width:390px){body.overlay .field{grid-template-columns:55px minmax(0,1fr) 55px}body.overlay .v52gift{top:30%;width:65px}body.overlay .v52gift.chat{left:18%}body.overlay .v52gift.creator{right:18%}body.overlay .towers{padding-bottom:3dvh}}
@media(max-height:640px){body.overlay .gift img{height:clamp(19px,5dvh,34px)}body.overlay .boss-monster-body img{max-height:75px}body.overlay .v52gift{top:28%}body.overlay.visual-enhanced .towers .tower{height:40%;min-height:95px}}
@media(prefers-reduced-motion:reduce){body.overlay .boss-monster,body.overlay .tower{animation:none!important}}

.v57hp{font-size:9px;font-weight:900;text-shadow:0 1px 4px #000;color:#fff}
.v57towerhp{position:absolute;bottom:2px;z-index:5;font-size:9px;font-weight:900;padding:3px 4px;border-radius:6px;background:#080d1dcc;white-space:nowrap}
.v57towerhp[hidden]{display:none!important}
.v57towerhp.chat{left:2%;color:#ffa1af}.v57towerhp.creator{right:2%;color:#a3e3ff}
body.overlay .v57towerhp{bottom:0;font-size:clamp(8px,2.1vw,10px)}

.v58boss-next{font-size:9px;font-weight:800;color:#ffe7a0;text-shadow:0 1px 3px #000;white-space:nowrap}
.v58boss-next[hidden]{display:none!important}
body.overlay .v58boss-next{font-size:clamp(8px,2.2vw,10px)}
body.overlay .v58boss-next,body.overlay .v57hp{line-height:1.15}
@media(max-height:640px){body.overlay .v58boss-next{font-size:8px}}

/* V5.9 cinematic effects: all positioned inside the arena, never displace gifts or towers */
.v59-fx-layer{position:absolute;inset:0;z-index:11;pointer-events:none;overflow:hidden;isolation:isolate;display:block;width:100%;height:100%}
.v59-projectile{position:absolute;width:clamp(12px,3.5vw,22px);height:clamp(12px,3.5vw,22px);border-radius:50%;left:50%;top:22%;opacity:0;animation:v59Shot 1.6s ease-in-out forwards;--target-x:-27vw;--target-y:52vh;background:radial-gradient(circle,#fff9,#f78bfa 35%,#8229ce 70%,transparent);box-shadow:0 0 15px #b94cff}
.v59-projectile.stage2{background:radial-gradient(circle,#fff9,#ffce43 35%,#f24d16 70%,transparent);box-shadow:0 0 18px #ff6b23;animation-duration:1.5s}
.v59-projectile.stage3{background:radial-gradient(circle,#fff,#ff4866 38%,#551040 70%,transparent);box-shadow:0 0 20px #ff274c;animation-duration:1.4s}
.v59-projectile.creator{--target-x:27vw}
.v59-impact{position:absolute;z-index:2;width:clamp(36px,12vw,65px);height:clamp(36px,12vw,65px);border-radius:50%;border:3px solid #f8e5ff;box-shadow:0 0 20px 9px #ba65ff99,inset 0 0 20px #fff9;opacity:0;animation:v591Impact 1.6s ease-out forwards}.v59-impact.chat{left:27%;bottom:18%}.v59-impact.creator{right:27%;bottom:18%}.v59-impact.stage2{border-color:#ffd084;box-shadow:0 0 24px 10px #ff6c3299}.v59-impact.stage3{border-color:#ff6786;box-shadow:0 0 25px 12px #ed224eaa}
.v591-telegraph{position:absolute;z-index:2;top:24%;left:50%;transform:translateX(-50%);padding:4px 8px;border:1px solid #e7c577a0;border-radius:9px;background:#120e22c9;color:#ffe4a2;font-size:10px;font-weight:900;white-space:nowrap;opacity:0;animation:v591Warning 2.2s ease-out forwards}
@keyframes v591Warning{0%{opacity:0;transform:translate(-50%,5px)}15%,80%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
@keyframes v591Impact{0%,25%{opacity:0;transform:scale(.25)}45%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(1.8)}}
.v59-shield{position:absolute;bottom:clamp(35px,10%,85px);width:clamp(75px,23%,145px);height:clamp(85px,24%,165px);border:3px solid #81e6ff;border-radius:50% 50% 44% 44%;box-shadow:inset 0 0 15px #60caff88,0 0 16px #64dcff;opacity:0;background:radial-gradient(ellipse,#54baff22,transparent 65%);animation:v59Shield 2.4s ease-out forwards}
.v59-shield.chat{left:19%;border-color:#ffa3b6;box-shadow:inset 0 0 15px #ff7caa88,0 0 16px #ff7ba7}
.v59-shield.creator{right:19%}
.v59-victory{position:absolute;inset:14% 17% 22%;z-index:13;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;color:#fff;text-shadow:0 2px 7px #000;background:radial-gradient(ellipse,#25163de8,#0a0d20de 70%);border:2px solid #eac57d;border-radius:22px;box-shadow:0 0 28px #ffd36688;animation:v59Victory 4.8s ease-out forwards;padding:12px;max-width:66%;margin:auto;pointer-events:none}
.v59-victory strong{font-size:clamp(16px,4.2vw,25px);line-height:1.2;color:#ffe39a}
.v59-victory .v59-crown{font-size:clamp(30px,9vw,58px);animation:v59Crown .9s ease-out both}
.v59-victory small{font-size:clamp(10px,2.5vw,14px)}
@keyframes v59Shot{0%{opacity:0;transform:translate(0,0) scale(.4)}12%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translate(var(--target-x),var(--target-y)) scale(1.6)}}
@keyframes v59Shield{0%{opacity:0;transform:scale(.6)}30%{opacity:.9;transform:scale(1.06)}65%{opacity:.7}100%{opacity:0;transform:scale(1.13)}}
@keyframes v59Victory{0%{opacity:0;transform:scale(.72)}12%,75%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
@keyframes v59Crown{0%{transform:scale(.2) rotate(-18deg)}100%{transform:scale(1) rotate(0)}}
@media(prefers-reduced-motion:reduce){.v59-projectile,.v59-shield,.v59-impact,.v591-telegraph{animation-duration:2s!important}.v59-victory{animation:none!important;opacity:1}}
@media(max-height:650px){.v59-victory{inset:18% 18% 28%;padding:5px;gap:3px}}
.v52gift img[hidden],.v52gift .v52emoji[hidden]{display:none!important}
/* V6.0 Arena Viva: isolated effects, no layout or scoreboard changes */
.v60fx{position:absolute;inset:0;z-index:12;pointer-events:none;overflow:hidden;contain:layout style paint}
.v60fx[hidden]{display:none!important}
.v60orb{position:absolute;left:49%;top:20%;width:22px;height:22px;border-radius:50%;background:radial-gradient(circle,#fff,#b57bff 42%,#5a25ad 76%);box-shadow:0 0 14px 5px #9a55ff99;animation:v60orb 1.25s ease-in forwards;--tx:0px;--ty:270px;will-change:transform,opacity}
.v60orb.stage2{background:radial-gradient(circle,#fff,#ffcb64 40%,#e34816 75%);box-shadow:0 0 15px 5px #ff743f99}
.v60orb.stage3{background:radial-gradient(circle,#fff,#ff6980 40%,#a71040 75%);box-shadow:0 0 17px 6px #fa2c6599}
@keyframes v60orb{0%{opacity:0;transform:translate3d(0,0,0) scale(.5)}15%{opacity:1}85%{opacity:1}100%{opacity:0;transform:translate3d(var(--tx),var(--ty),0) scale(1.3)}}
.v60impact{position:absolute;bottom:21%;width:52px;height:52px;border-radius:50%;border:3px solid #eacaff;box-shadow:0 0 20px 8px #a84dff77;animation:v60impact .7s ease-out forwards}
.v60impact.chat{left:22%}.v60impact.creator{right:22%}
@keyframes v60impact{0%{opacity:0;transform:scale(.3)}35%{opacity:1}100%{opacity:0;transform:scale(1.65)}}
.v60shield{position:absolute;bottom:9%;width:23%;height:25%;border:3px solid #8cecff;border-radius:50% 50% 44% 44%;background:radial-gradient(ellipse,#71caff30,transparent 72%);box-shadow:inset 0 0 14px #85dfff66,0 0 14px #67baffaa;animation:v60shield 1.35s ease-out forwards}
.v60shield.chat{left:21%;border-color:#ffa6c4;box-shadow:0 0 15px #ff78aa99}.v60shield.creator{right:21%}
@keyframes v60shield{0%{opacity:0;transform:scale(.7)}30%{opacity:.9;transform:scale(1.04)}100%{opacity:0;transform:scale(1.1)}}
.v60win{position:absolute;top:38%;left:18%;width:64%;max-height:24%;padding:10px 5px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;border:2px solid #f5d081;border-radius:16px;background:#100d25ed;box-shadow:0 0 22px #ffe29b55;color:#fff;text-align:center;text-shadow:0 1px 3px #000;animation:v60win 3.8s ease-out forwards}
.v60win strong{font-size:clamp(14px,4vw,21px);color:#ffdf80}.v60win span{font-size:clamp(10px,2.8vw,13px)}
@keyframes v60win{0%{opacity:0;transform:scale(.88)}12%,82%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
body.v60-equilibrado .boss-monster:not([hidden]) .boss-monster-body img,body.v60-cinematografico .boss-monster:not([hidden]) .boss-monster-body img{animation:v60breathe 3.1s ease-in-out infinite}
@keyframes v60breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}
body.v60-cinematografico .boss-monster.v60react .boss-monster-body img{animation:v60react .32s ease-out}
@keyframes v60react{0%,100%{filter:brightness(1)}45%{filter:brightness(1.8)}}
body.v60-cinematografico .tower.v60hit::after{animation:v60towerhit .4s ease-out}
@keyframes v60towerhit{0%,100%{filter:brightness(1)}45%{filter:brightness(1.65)}}
body.v60-economico .v60fx{display:none!important}
@media(prefers-reduced-motion:reduce){.v60orb,.v60impact,.v60shield,.v60win,body.v60-equilibrado .boss-monster-body img,body.v60-cinematografico .boss-monster-body img{animation:none!important}.v60fx{display:none!important}}

/* V6.1 — acabamento visual completo, isolado do motor da batalha */
body.overlay{background:#060916;color:#f6f8ff}
body.overlay .arena{max-width:540px;width:100%;height:100dvh;min-height:420px;display:flex;flex-direction:column;overflow:hidden;isolation:isolate;background:linear-gradient(90deg,#401020cf 0%,#381128db 49.75%,#092b49e6 50.25%,#0b2b4ce6 100%),url('/visual_assets/background_neon.png') center/cover no-repeat}
body.overlay .arena::before{z-index:0;opacity:.35;background:repeating-linear-gradient(0deg,transparent 0 82px,#e8dfff14 83px 84px)}
body.overlay .header{flex:0 0 auto;z-index:20;min-height:105px;padding:12px 8px 9px;background:linear-gradient(180deg,#070a1afa,#15152be8);border-bottom:1px solid #c2b3ef29;box-shadow:0 5px 16px #0005;display:grid;grid-template-columns:minmax(0,1fr) 58px minmax(0,1fr);gap:2px;align-items:center}
body.overlay .header .side{min-width:0;letter-spacing:.65px;font-weight:950;font-size:clamp(13px,4.2vw,19px);line-height:1.1;text-shadow:0 2px 4px #000a}
body.overlay .header .side:first-child{text-align:left;padding-left:clamp(10px,3vw,22px)}
body.overlay .header .side:last-child{text-align:right;padding-right:clamp(10px,3vw,22px)}
body.overlay .header .score{font-variant-numeric:tabular-nums;letter-spacing:1px;font-size:clamp(31px,9.5vw,45px);line-height:1.12;margin:5px 0;color:#fff;text-shadow:0 2px 5px #000}
body.overlay .header small{display:block;font-size:clamp(10px,2.8vw,13px);font-weight:850;white-space:nowrap;opacity:.93}
body.overlay .header .vs{font-size:clamp(18px,5vw,25px);color:#ffdd9b;text-shadow:0 0 10px #ffc44b7a;align-self:center}
body.overlay .meta{flex:0 0 auto;z-index:19;margin:0;padding:8px 4px;background:#090d20e8;border-bottom:1px solid #ffffff1b;letter-spacing:.5px;opacity:1;font-size:clamp(10px,2.9vw,13px);font-weight:850;line-height:1.2}
body.overlay .field{flex:1 1 auto;height:auto!important;min-height:0;overflow:hidden;margin:0;isolation:isolate;display:grid;grid-template-columns:clamp(62px,17%,86px) minmax(0,1fr) clamp(62px,17%,86px);grid-template-rows:minmax(0,1fr);background:linear-gradient(180deg,#030a1c18,#03091510 60%,#0206143b)}
body.overlay .field::after{content:'';position:absolute;left:50%;top:0;bottom:0;width:1px;background:linear-gradient(180deg,transparent,#ffebcc26 20%,#ffebcc10 75%,transparent);z-index:0;pointer-events:none}
body.overlay .gifts{position:relative;z-index:8;display:flex;flex-direction:column;justify-content:space-evenly;gap:0;min-width:0;padding:3px 0 4px;overflow:hidden}
body.overlay .gift{position:relative;flex:1 1 0;min-height:0;max-height:15%;padding:2px 1px;gap:0;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.08;text-align:center;font-size:clamp(8px,2.25vw,10px);font-weight:850;text-shadow:0 2px 3px #000c}
body.overlay .gift img{flex:0 1 auto;display:block;width:min(94%,55px);height:clamp(26px,6.2dvh,59px);max-height:62%;object-fit:contain;filter:drop-shadow(0 3px 3px #000a)}
body.overlay .gift div{max-width:100%;overflow-wrap:anywhere;line-height:1.1;margin-top:2px}
body.overlay .gift b{font-size:clamp(10px,2.7vw,13px);font-variant-numeric:tabular-nums;color:#89ffb4;line-height:1.1;margin-top:1px}
body.overlay .towers{position:relative;grid-column:2;grid-row:1;z-index:2;display:flex;align-items:flex-end;justify-content:space-between;gap:clamp(8px,3vw,16px);padding:0 5px clamp(12px,3.5dvh,38px)}
body.overlay.visual-enhanced .towers .tower{position:relative;flex:1 1 0;max-width:145px;min-width:0;width:47%;height:clamp(115px,40%,290px);min-height:0;overflow:visible;border:0;background:none;box-shadow:none;transform:none;filter:none}
body.overlay.visual-enhanced .towers .tower::after{content:'';position:absolute;inset:0;width:100%;height:100%;left:0;bottom:0;background:url('/visual_assets/tower_chat.png') center bottom/contain no-repeat;opacity:1;filter:drop-shadow(0 3px 5px #000b);z-index:1}
body.overlay.visual-enhanced .towers .tower:last-child::after{background-image:url('/visual_assets/tower_creator.png')}
body.overlay.visual-enhanced .towers .tower .stack{position:absolute;z-index:2;left:-7px;bottom:1%;width:8px;max-height:90%;min-height:2px;border-radius:9px;border:1px solid #fff8;opacity:.94;transform:none;box-shadow:0 0 7px var(--color);background:linear-gradient(0deg,var(--color),var(--top))}
body.overlay.visual-enhanced .towers .tower .stack::before{display:none}
body.overlay .city{opacity:.08;height:10%}
body.overlay .boss-monster{top:clamp(8px,2.1%,20px);left:50%;width:clamp(95px,31%,144px);max-height:31%;z-index:9;pointer-events:none}
body.overlay .boss-monster-body img{width:100%;height:auto;max-height:clamp(75px,15dvh,145px);object-fit:contain;filter:drop-shadow(0 0 7px #c275fa66)}
body.overlay .boss-monster-title{font-size:clamp(10px,2.8vw,13px);white-space:nowrap;line-height:1.15;text-shadow:0 2px 4px #000}
body.overlay .boss-monster-health{height:9px;margin:4px 5px 2px;border:1px solid #f9e2ff8c;box-shadow:0 1px 4px #0009}
body.overlay .v57hp,body.overlay .v58boss-next{font-size:clamp(9px,2.5vw,11px);font-weight:900;line-height:1.25;text-shadow:0 1px 4px #000}
body.overlay .v58boss-next{color:#ffdf83}
body.overlay .v52gift{position:absolute;top:31%;width:clamp(72px,24%,108px);max-height:21%;z-index:11;pointer-events:none}
body.overlay .v52gift.chat{left:17%}
body.overlay .v52gift.creator{right:17%}
body.overlay .v52gift .v52box{padding:5px 3px;border-width:1px;border-radius:13px;background:#0a1029e8;box-shadow:0 2px 9px #0008}
body.overlay .v52gift img{width:clamp(40px,11vw,57px);height:clamp(40px,11vw,57px);max-height:8dvh}
body.overlay .v52gift .v52emoji{font-size:30px;height:45px;line-height:45px}
body.overlay .v52gift .v52name{font-size:clamp(9px,2.7vw,12px);line-height:1.1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body.overlay .v52gift .v52user{font-size:clamp(8px,2.4vw,11px);line-height:1.1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body.overlay .v57towerhp{bottom:0;font-size:clamp(8px,2.3vw,10px);font-variant-numeric:tabular-nums;padding:4px 5px;border-radius:7px;background:#070d21e8;border:1px solid #ffffff25;z-index:6}
body.overlay .v57towerhp.chat{left:0}
body.overlay .v57towerhp.creator{right:0}
body.overlay .status{position:relative;z-index:20;flex:0 0 auto;min-height:39px;max-height:48px;padding:9px 8px;background:#080d1ff2;border-top:1px solid #ffffff24;color:#f0f4ff;font-size:clamp(10px,2.8vw,13px);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
body.overlay .controls,body.overlay .v561panel,body.overlay .settings,body.overlay .rank,body.overlay .hint,body.overlay .v55panel,body.overlay .v54panel,body.overlay .v53panel,body.overlay .v51panel,body.overlay .admin-v49,body.overlay .overlay-link{display:none!important}
body.overlay .v60fx{z-index:12}
body.overlay .v60win{left:16%;width:68%;top:39%;max-height:24%;border-radius:13px}
@media(max-width:380px){body.overlay .field{grid-template-columns:58px minmax(0,1fr) 58px}body.overlay .header{min-height:95px}body.overlay .boss-monster{width:94px}body.overlay .v52gift{width:70px}body.overlay .v52gift.chat{left:18%}body.overlay .v52gift.creator{right:18%}body.overlay .towers{padding-bottom:19px}}
@media(max-height:690px){body.overlay .header{min-height:86px;padding:7px 8px}body.overlay .gift img{height:clamp(22px,5dvh,37px)}body.overlay .boss-monster-body img{max-height:73px}body.overlay .boss-monster{top:5px}body.overlay .v52gift{top:33%}body.overlay .towers{padding-bottom:16px}body.overlay.visual-enhanced .towers .tower{height:38%}}
@media(prefers-reduced-motion:reduce){body.overlay .boss-monster{animation:none!important}body.overlay .v60fx{display:none!important}}

/* V6.2: efeitos em coordenadas reais da arena; sem alterar o motor do jogo */
.v62-projectile{position:absolute;z-index:3;width:clamp(19px,5vw,31px);height:clamp(19px,5vw,31px);border-radius:50%;opacity:0;pointer-events:none;background:radial-gradient(circle at 40% 35%,#fff 0 12%,#e1a9ff 25%,#8740f8 55%,#431188 80%);box-shadow:0 0 15px 5px #b068ffb0,0 0 33px 10px #ad45ff66;will-change:transform,opacity}
.v62-projectile.stage2{background:radial-gradient(circle,#fff,#ffe18d 27%,#ff7a21 57%,#b51b08 85%);box-shadow:0 0 18px 5px #ff9d3fc0,0 0 35px 10px #f44a2280}
.v62-projectile.stage3{background:radial-gradient(circle,#fff,#ff8ab4 26%,#ff2d60 57%,#9a0931 85%);box-shadow:0 0 20px 6px #ff386acc,0 0 36px 12px #d7195680}
.v62-impact{position:absolute;z-index:4;opacity:0;width:clamp(48px,13vw,76px);height:clamp(48px,13vw,76px);border:4px solid #e9c4ff;border-radius:50%;background:radial-gradient(circle,#ffffffbb,#a857ff7a 35%,transparent 70%);box-shadow:0 0 19px 8px #c17affaa;pointer-events:none}
.v62-impact.stage2{border-color:#ffdf8b;background:radial-gradient(circle,#fff9c9,#ff7d2477 35%,transparent 72%);box-shadow:0 0 21px 9px #ff873aaa}
.v62-impact.stage3{border-color:#ff9aaf;background:radial-gradient(circle,#fff,#ff316077 36%,transparent 72%);box-shadow:0 0 23px 10px #ff326eaa}
.v62-shield{position:absolute;z-index:5;opacity:0;width:clamp(88px,27%,155px);height:clamp(105px,27%,185px);border:3px solid #88e5ff;border-radius:48% 48% 43% 43%;background:radial-gradient(ellipse,#8edcff3c,transparent 75%);box-shadow:inset 0 0 18px #7be4ff70,0 0 20px 5px #67cbff9c;pointer-events:none}
.v62-shield.chat{border-color:#ffa0c0;background:radial-gradient(ellipse,#ff82b03b,transparent 75%);box-shadow:inset 0 0 18px #ff89b777,0 0 20px 5px #ff6696aa}
.v62-victory{position:absolute;z-index:6;left:50%;top:46%;width:min(75%,320px);min-height:108px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:14px 9px;border:2px solid #ffe1a0;border-radius:16px;background:linear-gradient(145deg,#211235f7,#07182ff7);box-shadow:0 0 24px 8px #ffd46d80,0 8px 25px #000a;color:#fff;text-align:center;opacity:0;pointer-events:none}
.v62-victory strong{font-size:clamp(14px,4vw,21px);color:#ffe49a}.v62-victory span{font-size:clamp(11px,3vw,15px);font-weight:800}
@keyframes v62cast{0%,100%{filter:brightness(1);transform:translateY(0)}45%{filter:brightness(1.5);transform:translateY(-6px)}}
@keyframes v62hurt{0%,100%{filter:brightness(1)}45%{filter:brightness(2.1) saturate(1.7)}}
@keyframes v62damage{0%,100%{filter:brightness(1);transform:translateX(0)}25%{filter:brightness(1.9);transform:translateX(-4px)}65%{transform:translateX(4px)}}
body.v60-equilibrado .boss-monster-body img.v62-cast,body.v60-cinematografico .boss-monster-body img.v62-cast{animation:v62cast .65s ease-out!important}
body.v60-cinematografico .boss-monster-body img.v62-hurt{animation:v62hurt .38s ease-out!important}
body.v60-equilibrado .tower.v62-damage::after,body.v60-cinematografico .tower.v62-damage::after{animation:v62damage .58s ease-out!important}
body.overlay .v52gift.visible{animation:v62gift-in .32s cubic-bezier(.2,.8,.2,1) both}
@keyframes v62gift-in{from{opacity:0;transform:translateY(12px) scale(.9)}to{opacity:1;transform:translateY(0) scale(1)}}
body.overlay .v52gift:not(.visible){opacity:0}
body.v60-economico .v62-projectile,body.v60-economico .v62-impact,body.v60-economico .v62-shield,body.v60-economico .v62-victory{display:none!important}
@media(prefers-reduced-motion:reduce){.v62-projectile,.v62-impact,.v62-shield,.v62-victory{display:none!important}}

/* V7: sprites reais em camadas; limites da arena permanecem os da V6.3 */
body.overlay.visual-enhanced .towers .tower::after{
 background-image:var(--v70-tower, url('/visual_assets/tower_chat_idle.png'))!important;
 background-size:contain!important;background-position:center bottom!important;
 opacity:1!important;filter:drop-shadow(0 3px 8px #000b)!important;
}
body.overlay.visual-enhanced .towers .tower:last-child::after{
 background-image:var(--v70-tower, url('/visual_assets/tower_creator_idle.png'))!important;
}
body.overlay .boss-monster-body img{object-fit:contain;image-rendering:auto;transition:filter .2s ease}
body.overlay.v60-cinematografico .boss-monster{filter:drop-shadow(0 0 15px #ae45ff)}
body.overlay .v62-projectile{background: url('/visual_assets/projectile_1.png') center/contain no-repeat!important;border-radius:0;box-shadow:0 0 18px 4px #bd6aff90}
body.overlay .v62-projectile.stage2{background-image:url('/visual_assets/projectile_2.png')!important;box-shadow:0 0 19px 5px #ff8c3980}
body.overlay .v62-projectile.stage3{background-image:url('/visual_assets/projectile_3.png')!important;box-shadow:0 0 21px 5px #ff3a6c90}
body.overlay .v52gift.visible{animation:v70GiftPop .42s cubic-bezier(.2,.8,.2,1.2) both}
@keyframes v70GiftPop{0%{opacity:0;transform:translateY(12px) scale(.75)}65%{opacity:1;transform:translateY(-3px) scale(1.07)}100%{opacity:1;transform:translateY(0) scale(1)}}
body.overlay .meta #v70next{color:#f6d994;display:inline;font-size:inherit;white-space:nowrap}
body.overlay .meta #v70next[hidden]{display:none!important}
body.overlay .v57towerhp{font-weight:950;box-shadow:0 1px 6px #0008}
body.overlay .v57towerhp.chat{color:#ffb4c4}
body.overlay .v57towerhp.creator{color:#b7e9ff}
@media(prefers-reduced-motion:reduce){body.overlay .v52gift.visible{animation:none!important}}

/* V7.1: reference-matched presentation, with real HTML score/timer/gifts and gameplay. */
body.overlay{background:#050612}
body.overlay .arena{max-width:540px;background:#080716;min-height:100dvh;height:100dvh;border-left:2px solid #f43a6455;border-right:2px solid #1aa9ff55}
body.overlay .v71brand{display:flex;flex:0 0 auto;flex-direction:column;align-items:center;justify-content:center;min-height:57px;padding:3px 5px 2px;background:radial-gradient(ellipse at 50% 0,#6a1b67 0%,#190b2e 65%,#0a0a20 100%);border-bottom:2px solid #dcb66e;box-shadow:0 3px 13px #e47b8a3b;position:relative;z-index:25}
body.overlay .v71brand span{font-family:Georgia,serif;font-style:italic;font-size:clamp(23px,6.4vw,36px);font-weight:900;line-height:1.1;color:#ffe9b4;text-shadow:0 0 6px #ff6c26,0 2px 0 #c14224,0 0 18px #ff9b44}
body.overlay .v71brand small{font-size:clamp(8px,2.5vw,12px);font-weight:900;letter-spacing:.7px;color:#ffe8c3;text-shadow:0 1px 4px #000}
body.overlay .header{min-height:99px;grid-template-columns:minmax(0,1fr) 42px minmax(0,1fr);padding:4px 9px;background:linear-gradient(90deg,#3a070ff0,#0e0c23 48%,#071a3a 52%,#041c38f2);border-bottom:2px solid #efb45f;box-shadow:0 4px 18px #000a}
body.overlay .header .side{height:100%;border:2px solid #ff526a;border-radius:12px;background:linear-gradient(120deg,#4c0a17d9,#210b20db);box-shadow:inset 0 0 13px #ff3b5255,0 0 11px #fa36475c;padding:6px 7px 5px 50px!important;text-align:center!important;position:relative;font-size:clamp(13px,3.7vw,18px);color:#ffe6e6;display:flex;flex-direction:column;justify-content:center}
body.overlay .header .side:last-child{border-color:#26adff;background:linear-gradient(120deg,#0c2a55d9,#08182fdb);box-shadow:inset 0 0 13px #12b9ff55,0 0 11px #008fff6a;padding:6px 50px 5px 7px!important;color:#d7f1ff}
body.overlay .header .side::before{content:'';position:absolute;top:0;bottom:0;left:-6px;width:58px;background:url('/visual_assets/chat_dragon.png') left center/contain no-repeat;filter:drop-shadow(0 0 7px #f44);pointer-events:none}
body.overlay .header .side:last-child::before{left:auto;right:-6px;background-image:url('/visual_assets/creator_dragon.png');background-position:right center;filter:drop-shadow(0 0 7px #29b9ff)}
body.overlay .header .score{font-size:clamp(28px,8vw,42px);margin:0;color:white;text-shadow:0 2px 6px #000}
body.overlay .header small{font-size:clamp(9px,2.6vw,12px)}
body.overlay .header .vs{font-size:clamp(18px,5.5vw,26px);font-style:italic;color:#ffd28a;text-shadow:0 0 10px #f88,0 0 12px #fba}
body.overlay .meta{min-height:34px;display:flex;align-items:center;justify-content:center;background:linear-gradient(90deg,#241322,#080f24,#191123);border-bottom:2px solid #c79a54;box-shadow:0 2px 8px #000b;color:#fff1d9;font-size:clamp(10px,2.7vw,13px);font-weight:950;padding:5px 2px}
body.overlay .field{background:linear-gradient(90deg,#310b2294,#140e3094 50%,#081e3a91),url('/visual_assets/arena_scene.png') center center/100% 100% no-repeat;grid-template-columns:clamp(76px,23%,111px) minmax(0,1fr) clamp(76px,23%,111px);box-shadow:inset 0 0 40px #0008}
body.overlay .field::before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#f22d4b13,transparent 42%,#00a2ff12),repeating-linear-gradient(0deg,transparent 0 17%,#ffddab11 17.1% 17.3%);z-index:0}
body.overlay .v71scenery{position:absolute;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse at 50% 26%,#9c45d126,transparent 35%),linear-gradient(180deg,transparent 62%,#0b0b2c88)}
body.overlay .gifts{z-index:7;padding:4px 2px;justify-content:space-around;gap:3px}
body.overlay .gift{max-height:none;flex:1 1 0;min-height:0;padding:2px 1px;gap:0;background:linear-gradient(110deg,#380e20ee,#170c26ee);border:1.5px solid #ff5375;border-radius:8px;box-shadow:inset 0 0 9px #e827424a,0 0 6px #ff3c585c;display:grid;grid-template-columns:40% minmax(0,1fr);grid-template-rows:1fr 1fr;align-items:center;justify-items:center;overflow:hidden}
body.overlay .gifts:last-child .gift{background:linear-gradient(110deg,#071a38ee,#092443ee);border-color:#22b7ff;box-shadow:inset 0 0 9px #0daaff4a,0 0 6px #22a9ff5c}
body.overlay .gift img{grid-row:1 / 3;grid-column:1;width:100%;height:clamp(28px,6dvh,61px);max-height:95%;object-fit:contain;margin:0;filter:drop-shadow(0 1px 3px #0009)}
body.overlay .gift div{grid-column:2;grid-row:1;align-self:end;font-size:clamp(7px,1.95vw,11px);line-height:1.1;font-weight:950;overflow-wrap:anywhere;max-width:100%;padding:0 1px}
body.overlay .gift b{grid-column:2;grid-row:2;align-self:start;font-size:clamp(11px,2.9vw,16px);margin-top:1px;text-shadow:0 1px 4px #000}
body.overlay .boss-monster{top:2.3%;width:clamp(110px,43%,220px);max-height:36%;z-index:9;filter:drop-shadow(0 0 15px #bc43ff)}
body.overlay .boss-monster-body img{width:100%;height:clamp(90px,18dvh,174px);max-height:100%;object-fit:contain}
body.overlay .boss-monster-title{font-size:clamp(10px,2.7vw,14px);background:#170d2cc9;border:1px solid #ddaa80;border-radius:6px;padding:3px 2px;white-space:nowrap;box-shadow:0 0 10px #a34dff80}
body.overlay .boss-monster-health{height:clamp(9px,1.8dvh,15px);border:2px solid #e6c391;border-radius:8px;background:#3c102c;margin:5px 0 3px;box-shadow:0 0 10px #f34c9a77}
body.overlay .v57hp{font-size:clamp(10px,2.7vw,14px);font-weight:950;color:white;text-shadow:0 2px 4px #000}
body.overlay .v58boss-next{font-size:clamp(9px,2.6vw,13px);color:#ffdd69;text-shadow:0 1px 5px #000}
body.overlay .towers{padding:0 0 clamp(13px,3.1dvh,30px);gap:2px;align-items:flex-end}
body.overlay.visual-enhanced .towers .tower{width:50%;max-width:none;height:clamp(115px,35%,240px)}
body.overlay.visual-enhanced .towers .tower::after{background-size:contain!important;filter:drop-shadow(0 0 9px #ff555599)!important}
body.overlay.visual-enhanced .towers .tower:last-child::after{filter:drop-shadow(0 0 9px #2daaffaa)!important}
body.overlay .v57towerhp{font-size:clamp(8px,2vw,11px);padding:3px 1px;max-width:50%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.overlay .v71footer{display:grid;grid-template-columns:1.3fr 1.15fr 1fr;flex:0 0 auto;gap:4px;padding:5px 4px;background:#0c0a22;border-top:2px solid #e0ad6e;box-shadow:0 -3px 13px #0009;z-index:22;min-height:52px}
body.overlay .v71tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:3px 2px;min-width:0;border:1px solid #ff586f;border-radius:7px;background:linear-gradient(130deg,#401122,#1a1129);box-shadow:inset 0 0 7px #ff5e5850}
body.overlay .v71tile:nth-child(2){border-color:#ffcf72;background:linear-gradient(130deg,#3a1e18,#211027)}
body.overlay .v71tile:nth-child(3){border-color:#35bfff;background:linear-gradient(130deg,#0d2b52,#14112c)}
body.overlay .v71tile small{font-size:clamp(7px,1.9vw,10px);font-weight:900;color:#ffe6c7;white-space:nowrap}
body.overlay .v71tile span{font-size:clamp(8px,2.1vw,11px);font-weight:800;color:#fff;line-height:1.15;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body.overlay .status{min-height:23px;max-height:30px;padding:5px 7px;text-align:center;font-size:clamp(9px,2.3vw,11px);background:#090d20;border-top:1px solid #ffcf7544}
@media(max-width:380px){body.overlay .field{grid-template-columns:73px minmax(0,1fr) 73px}body.overlay .gift{grid-template-columns:38% 62%}body.overlay .header .side{padding-left:37px!important}body.overlay .header .side:last-child{padding-right:37px!important}body.overlay .header .side::before{width:43px}body.overlay .v71brand{min-height:46px}body.overlay .header{min-height:88px}}
@media(max-height:680px){body.overlay .v71brand{min-height:43px}body.overlay .header{min-height:77px}body.overlay .meta{min-height:26px}body.overlay .v71footer{min-height:43px}body.overlay .boss-monster-body img{height:80px}body.overlay .gift img{height:28px}}

/* V7.2: presentes sem caixas; cenário de fantasia em destaque */
body.overlay .field{background:linear-gradient(90deg,rgba(68,4,22,.16),rgba(17,4,42,.04) 48%,rgba(0,42,93,.15)),url('/visual_assets/arena_scene.png') center center/100% 100% no-repeat!important}
body.overlay .field::before{background:radial-gradient(ellipse at 50% 25%,rgba(174,46,250,.22),transparent 41%),linear-gradient(90deg,rgba(255,33,70,.08),transparent 37%,transparent 63%,rgba(15,142,255,.08))!important}
body.overlay .v71scenery{background:linear-gradient(180deg,rgba(15,5,42,.12),transparent 50%,rgba(10,8,28,.15))!important}
body.overlay .gifts{gap:1px!important;padding:3px 1px!important;justify-content:space-around!important}
body.overlay .gift,body.overlay .gifts:last-child .gift{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;outline:none!important;display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;gap:1px!important;overflow:visible!important;min-height:0!important;padding:0!important}
body.overlay .gift img{display:block!important;flex:0 1 auto!important;width:min(90%,65px)!important;height:clamp(31px,6.3dvh,67px)!important;max-height:64%!important;object-fit:contain!important;filter:drop-shadow(0 2px 4px #000e) drop-shadow(0 0 5px #ff547b66)!important}
body.overlay .gifts:last-child .gift img{filter:drop-shadow(0 2px 4px #000e) drop-shadow(0 0 5px #4bcaff66)!important}
body.overlay .gift div{display:block!important;font-size:clamp(8px,2.15vw,11px)!important;line-height:1.08!important;font-weight:900!important;text-align:center!important;max-width:100%!important;padding:0!important;overflow-wrap:anywhere!important;text-shadow:0 2px 4px #000,0 0 3px #000!important}
body.overlay .gift b{display:block!important;font-size:clamp(11px,2.85vw,15px)!important;line-height:1.05!important;margin:0!important;text-shadow:0 2px 4px #000!important}
body.overlay .v52gift .v52box{background:transparent!important;border:0!important;box-shadow:none!important;padding:2px!important}
body.overlay .v52gift{filter:drop-shadow(0 3px 6px #000b)}
body.overlay .boss-monster{top:1%!important;width:clamp(140px,50%,250px)!important;filter:drop-shadow(0 0 20px #ae42f5a0)!important}
body.overlay .boss-monster-body img{height:clamp(105px,19dvh,190px)!important}
body.overlay .towers{padding-bottom:clamp(17px,3dvh,32px)!important}
body.overlay.visual-enhanced .towers .tower{height:clamp(140px,39%,280px)!important}
body.overlay .v71brand{background:linear-gradient(180deg,#120922,#271038)!important}
@media(max-width:380px){body.overlay .field{grid-template-columns:64px minmax(0,1fr) 64px!important}body.overlay .gift img{height:clamp(27px,5.6dvh,53px)!important}body.overlay .gift div{font-size:8px!important}}
@media(max-height:720px){body.overlay .boss-monster-body img{height:90px!important}body.overlay .gift img{height:32px!important}body.overlay .towers{padding-bottom:14px!important}}

/* V7.3 definitive no-box gift layout; override all legacy theme styles */
html body.overlay .arena .field #gchat .gift,html body.overlay .arena .field #gcreator .gift,
html body.overlay .arena .field .gifts .gift,html body.overlay .arena .field .gifts:last-child .gift{
 background:none!important;background-color:transparent!important;background-image:none!important;
 border:0 none transparent!important;border-width:0!important;border-radius:0!important;
 box-shadow:none!important;outline:0!important;filter:none!important;
 display:flex!important;flex-direction:column!important;justify-content:center!important;
 align-items:center!important;text-align:center!important;padding:0!important;margin:0!important;
 gap:1px!important;overflow:visible!important;min-height:0!important;
}
html body.overlay .arena .field .gifts{background:transparent!important;border:0!important;box-shadow:none!important;padding:4px 0!important;gap:0!important}
html body.overlay .arena .field .gifts .gift img{width:clamp(29px,8vw,57px)!important;height:clamp(29px,5.7dvh,56px)!important;max-height:60%!important;object-fit:contain!important;grid-row:auto!important;grid-column:auto!important;filter:drop-shadow(0 2px 5px #000d)!important}
html body.overlay .arena .field .gifts .gift div{font-size:clamp(8px,2.25vw,12px)!important;grid-row:auto!important;grid-column:auto!important;align-self:center!important;line-height:1.04!important;overflow-wrap:anywhere!important;text-align:center!important;max-width:100%!important}
html body.overlay .arena .field .gifts .gift b{font-size:clamp(11px,2.8vw,15px)!important;grid-row:auto!important;grid-column:auto!important;align-self:center!important;line-height:1!important}
html body.overlay .arena .field{grid-template-columns:clamp(62px,18%,86px) minmax(0,1fr) clamp(62px,18%,86px)!important;
 background:linear-gradient(90deg,#27091b38,transparent 50%,#05204438),url('/visual_assets/arena_environment_v73.png') center/100% 100% no-repeat!important}
html body.overlay .arena .field .v52gift{width:clamp(60px,16%,86px)!important;max-height:17%!important;top:35%!important}
html body.overlay .arena .field .v52gift.chat{left:18%!important}html body.overlay .arena .field .v52gift.creator{right:18%!important}
html body.overlay .arena .field .v52gift .v52box{background:#0c1025cb!important;border:1px solid #ffffff55!important;border-radius:9px!important;box-shadow:0 2px 8px #0007!important;padding:3px!important}
html body.overlay .arena .field .v52gift img{width:clamp(30px,8vw,47px)!important;height:clamp(30px,8vw,47px)!important}
html body.overlay .arena .field .v52gift .v52emoji{font-size:24px!important;height:30px!important;line-height:30px!important}
html body.overlay .arena .field .v52gift .v52name,html body.overlay .arena .field .v52gift .v52user{font-size:clamp(8px,2vw,10px)!important;line-height:1.05!important}
html body.overlay .arena .field .boss-monster{z-index:12!important}
@media(max-width:380px){html body.overlay .arena .field{grid-template-columns:57px minmax(0,1fr) 57px!important}html body.overlay .arena .field .gifts .gift img{width:40px!important;height:clamp(28px,5dvh,42px)!important}}

/* V7.4 scene replacement: only environment artwork; all characters remain DOM layers */
html body.overlay .arena .field{background:linear-gradient(90deg,#24071933,transparent 45%,#061a3c33),url('/visual_assets/arena_environment_v74.png') center center/100% 100% no-repeat!important}
html body.overlay .arena .field::before{background:radial-gradient(ellipse at 50% 22%,#b73eff1c,transparent 38%)!important}
html body.overlay .arena .field::after{background:linear-gradient(180deg,transparent,#d1b8f51a 35%,#d1b8f50d 85%,transparent)!important}
html body.overlay .arena .field .gifts .gift{background:none!important;border:none!important;box-shadow:none!important}
html body.overlay .arena .field .v52gift{max-height:15%!important;top:34%!important}
html body.overlay .arena .field .towers{z-index:5!important}
html body.overlay .arena .field .boss-monster{z-index:12!important}

/* V8 FINAL — composição responsiva consolidada, arte e jogo em camadas separadas */
html body.overlay .arena{height:100dvh;min-height:0;max-width:540px;margin:auto;overflow:hidden}
html body.overlay .arena .field{position:relative;min-height:0;flex:1 1 auto;grid-template-columns:clamp(65px,19%,95px) minmax(0,1fr) clamp(65px,19%,95px)!important;background:linear-gradient(90deg,#3309191c,transparent 46%,#0623471c),url('/visual_assets/arena_environment_v74.png') center center/100% 100% no-repeat!important}
html body.overlay .arena .field .v71scenery{z-index:0!important;background:radial-gradient(ellipse at 50% 25%,#ab35e524,transparent 35%),linear-gradient(0deg,#0d0c2c33,transparent 38%)!important}
html body.overlay .arena .field .gifts{z-index:10!important;position:relative;min-width:0;display:flex!important;flex-direction:column;justify-content:space-evenly!important;gap:0!important;padding:4px 2px!important}
html body.overlay .arena .field .gifts .gift{height:14.285%!important;max-height:14.285%!important;min-height:0!important;flex:1 1 0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:0!important;padding:1px 0!important;margin:0!important;background:none!important;border:0!important;outline:0!important;box-shadow:none!important;border-radius:0!important;overflow:hidden!important}
html body.overlay .arena .field .gifts .gift img{display:block!important;flex:0 1 auto!important;max-height:58%!important;width:clamp(32px,8.7vw,58px)!important;height:clamp(30px,5.7dvh,57px)!important;object-fit:contain!important;margin:0 auto!important}
html body.overlay .arena .field .gifts .gift div{flex:0 0 auto!important;font-size:clamp(8px,2.35vw,11px)!important;font-weight:900!important;line-height:1.06!important;max-width:100%!important;overflow-wrap:normal!important;word-break:normal!important;hyphens:none!important;white-space:normal!important;text-align:center!important;letter-spacing:-.25px!important;text-shadow:0 2px 4px #000!important}
html body.overlay .arena .field .gifts .gift b{flex:0 0 auto!important;font-size:clamp(11px,3vw,15px)!important;line-height:1.03!important;margin-top:1px!important;color:#83ffac!important}
html body.overlay .arena .field .towers{position:relative!important;grid-column:2!important;z-index:5!important;padding:0 0 clamp(29px,4.4dvh,54px)!important;display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:3px!important;overflow:visible!important}
html body.overlay.visual-enhanced .arena .field .towers .tower{height:clamp(125px,33%,245px)!important;width:50%!important;min-width:0!important;max-width:none!important}
html body.overlay .arena .field .v57towerhp{bottom:clamp(3px,1.4dvh,15px)!important;z-index:20!important;max-width:49%!important;min-width:0!important;font-size:clamp(8px,2vw,11px)!important;padding:3px 2px!important;border-radius:7px!important;background:#080c20eb!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
html body.overlay .arena .field .boss-monster{z-index:15!important;top:clamp(8px,2%,22px)!important;width:clamp(115px,46%,220px)!important;max-height:39%!important;left:50%!important;transform:translateX(-50%)!important}
html body.overlay .arena .field .boss-monster-body img{max-height:clamp(90px,18dvh,165px)!important}
html body.overlay .arena .field .v52gift{z-index:18!important;top:36%!important;width:clamp(55px,16%,76px)!important;max-height:15%!important;pointer-events:none!important}
html body.overlay .arena .field .v52gift.chat{left:20%!important}
html body.overlay .arena .field .v52gift.creator{right:20%!important}
html body.overlay .arena .field .v52gift .v52box{background:#0b0d22c9!important;border:1px solid #ffffff40!important;border-radius:10px!important;padding:2px!important;box-shadow:0 2px 8px #0008!important}
html body.overlay .arena .field .v52gift img{width:clamp(29px,7.5vw,43px)!important;height:clamp(29px,7.5vw,43px)!important;max-height:6dvh!important}
html body.overlay .arena .field .v52gift .v52name,html body.overlay .arena .field .v52gift .v52user{font-size:clamp(8px,2vw,10px)!important;max-width:100%!important;overflow:hidden!important;white-space:nowrap!important;text-overflow:ellipsis!important}
html body.overlay .meta{gap:3px;white-space:nowrap!important;font-size:clamp(9px,2.6vw,13px)!important;letter-spacing:0!important}
html body.overlay .v71footer{grid-template-columns:1.2fr 1.1fr 1fr!important}
html body.overlay .v71tile small{font-size:clamp(7px,1.75vw,10px)!important}
html body.overlay .v71tile span{font-size:clamp(8px,2vw,11px)!important}
html body.overlay .arena .field .v71scenery::after{content:'';position:absolute;inset:50% 17% 3%;background:radial-gradient(ellipse at center,#e2b9ff13,transparent 60%);pointer-events:none}
@media(max-width:385px){html body.overlay .arena .field{grid-template-columns:66px minmax(0,1fr) 66px!important}html body.overlay .arena .field .gifts .gift img{width:40px!important}html body.overlay .arena .field .gifts .gift div{font-size:8px!important}}
@media(max-height:710px){html body.overlay .v71brand{min-height:40px!important}html body.overlay .header{min-height:75px!important}html body.overlay .arena .field .gifts .gift img{height:32px!important}html body.overlay .arena .field .boss-monster-body img{max-height:85px!important}html body.overlay.visual-enhanced .arena .field .towers .tower{height:35%!important}}

/* LivePulse 9.0 FINAL: layout guards, no gift tiles, no overlaps. */
html body.overlay .arena .field .gifts .gift,html body.overlay .arena .field .gifts .gift:hover{background:transparent!important;border:none!important;box-shadow:none!important;outline:none!important;backdrop-filter:none!important}
html body.overlay .arena .field .gifts{pointer-events:none;isolation:isolate}
html body.overlay .arena .field .gifts .gift{overflow:visible!important}
html body.overlay .arena .field .gifts .gift img{filter:drop-shadow(0 3px 4px #000c)!important}
html body.overlay .arena .field .gifts .gift div{max-width:100%!important;overflow-wrap:anywhere!important;word-break:normal!important}
html body.overlay .arena .field .towers{overflow:visible!important;isolation:isolate}
html body.overlay .arena .field .towers .tower{z-index:3!important}
html body.overlay .arena .field .v57towerhp{position:absolute!important;bottom:4px!important;z-index:12!important}
html body.overlay .arena .field .v57towerhp.chat{left:0!important;right:auto!important}
html body.overlay .arena .field .v57towerhp.creator{right:0!important;left:auto!important}
html body.overlay .arena .field .boss-monster[hidden]{display:none!important}
html body.overlay .arena .field .v52gift .v52box{box-sizing:border-box!important}
html body.overlay .arena .field .v52gift img[hidden],html body.overlay .arena .field .v52gift .v52emoji[hidden]{display:none!important}
html body.overlay .arena .field .v52gift{max-width:78px!important}
html body.overlay .arena .field .v52gift .v52box{overflow:hidden!important}
html body.overlay .arena .field .v52gift .v52name,html body.overlay .arena .field .v52gift .v52user{white-space:nowrap!important;text-overflow:ellipsis!important;overflow:hidden!important}
html body.overlay .arena .field .v60fx,html body.overlay .arena .field .v59-fx-layer{pointer-events:none!important;contain:layout style}
html body.overlay .arena .field .v71scenery{pointer-events:none!important}
@media(max-width:420px){html body.overlay .arena .field{grid-template-columns:clamp(69px,19%,84px) minmax(0,1fr) clamp(69px,19%,84px)!important}html body.overlay .arena .field .gifts .gift div{font-size:clamp(8px,2.3vw,10px)!important}}
@media(max-height:700px){html body.overlay .arena .field .v52gift{top:37%!important}html body.overlay .arena .field .gifts .gift img{max-height:53%!important}}

/* V9.1 — cinematic composition, all actors remain DOM layers. */
html body.overlay .arena{background:linear-gradient(90deg,#210819,#08091e 48%,#061c39)!important}
html body.overlay .arena .field{background:linear-gradient(90deg,#ff214515,transparent 40%,transparent 60%,#00aaff15),url('/visual_assets/arena_cinematic_v91.png') center/100% 100% no-repeat!important;isolation:isolate}
html body.overlay .arena .field .v71scenery{z-index:0!important;background:radial-gradient(ellipse 44% 30% at 50% 21%,#a734ed44,transparent 85%)!important}
html body.overlay .arena .field .v71scenery::before{content:'';position:absolute;top:2%;left:24%;width:52%;aspect-ratio:1;border:2px solid #bb58ff70;border-radius:50%;box-shadow:0 0 12px 4px #a729ff70,inset 0 0 22px #ba43fa88,0 0 44px 18px #bd2aff38;animation:v91portal 5s ease-in-out infinite;pointer-events:none}
html body.overlay .arena .field .v71scenery::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 26%,#a65cff25,transparent 31%),linear-gradient(180deg,transparent 50%,#160b3022 75%,#08092238);pointer-events:none}
@keyframes v91portal{0%,100%{opacity:.64;transform:scale(.98)}50%{opacity:1;transform:scale(1.04)}}
html body.overlay .v71brand{background:linear-gradient(90deg,#3e091e,#240a3a 45%,#130b32 55%,#071d41)!important;border-bottom:2px solid #e3a85e!important;box-shadow:0 0 18px #ff873e66!important}
html body.overlay .v71brand span{text-shadow:0 0 7px #ff692a,0 0 17px #ff9525,0 2px 0 #ab3322!important}
html body.overlay .header{background:linear-gradient(90deg,#340915,#1c0b2d 48%,#0b153b 52%,#071e40)!important}
html body.overlay .header .side{border-color:#ff754b!important;border-radius:13px!important;box-shadow:0 0 13px #ff3d4b99,inset 0 0 19px #f5354b44!important}
html body.overlay .header .side:last-child{border-color:#35c3ff!important;box-shadow:0 0 13px #20aeff99,inset 0 0 19px #168dff44!important}
html body.overlay .arena .field .boss-monster{top:2%!important;width:clamp(150px,57%,280px)!important;max-height:42%!important;z-index:15!important;filter:drop-shadow(0 0 12px #b82fff) drop-shadow(0 0 20px #7721ff)!important}
html body.overlay .arena .field .boss-monster-body img{max-height:clamp(118px,22dvh,210px)!important}
html body.overlay .arena .field .boss-monster-title{border:2px solid #dfac71!important;border-radius:10px!important;background:linear-gradient(90deg,#29102f,#140d2d,#2c0d35)!important;box-shadow:0 0 12px #b75cff77!important}
html body.overlay .arena .field .boss-monster-health{height:clamp(13px,2.1dvh,19px)!important;border-color:#d9a95c!important;box-shadow:0 0 13px #ef459caa!important}
html body.overlay .arena .field .towers{padding-bottom:clamp(30px,4.5dvh,60px)!important}
html body.overlay.visual-enhanced .arena .field .towers .tower{height:clamp(150px,39%,290px)!important}
html body.overlay .arena .field .v57towerhp{bottom:clamp(2px,1.3dvh,14px)!important}
html body.overlay .arena .field .gifts .gift{background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;outline:none!important}
html body.overlay .arena .field .gifts .gift img{filter:drop-shadow(0 0 5px #ffffff50) drop-shadow(0 3px 3px #000)!important}
html body.overlay .v71footer{border-top:2px solid #f6bd6a!important;background:linear-gradient(90deg,#290d21,#1a102e 48%,#071b3c)!important}
html body.overlay .v71tile{border-radius:9px!important;box-shadow:0 0 7px #ff566366,inset 0 0 8px #ff476622!important}
html body.overlay .v71tile:nth-child(2){box-shadow:0 0 7px #ffbd7266,inset 0 0 8px #fba34422!important}
html body.overlay .v71tile:nth-child(3){box-shadow:0 0 7px #39c4ff66,inset 0 0 8px #3aa8ff22!important}
@media(prefers-reduced-motion:reduce){html body.overlay .arena .field .v71scenery::before{animation:none!important}}
@media(max-height:730px){html body.overlay .arena .field .boss-monster-body img{max-height:14dvh!important}html body.overlay.visual-enhanced .arena .field .towers .tower{height:33%!important}}

/* LivePulse V10: composicao de sprites V4 em camadas dinamicas */
html body.overlay .arena .field{background:linear-gradient(90deg,#f33a2e0d,transparent 48%,#127dff0d),url('/visual_assets/v10_layer_floor.png') center/100% 100% no-repeat,url('/visual_assets/v10_layer_mountains.png') center/100% 100% no-repeat,url('/visual_assets/v10_layer_sky.png') center/100% 100% no-repeat,#100927!important}
html body.overlay .arena .field .v71scenery::before{width:55%;left:22.5%;top:4%;border-color:#b34fff70;box-shadow:0 0 25px #a530ff99,inset 0 0 20px #8c24ff99!important}
html body.overlay .arena .field .boss-monster{width:clamp(165px,66%,315px)!important;max-height:43%!important;top:1%!important}
html body.overlay .arena .field .boss-monster-body img{max-height:clamp(125px,24dvh,225px)!important;width:100%!important;object-fit:contain!important}
html body.overlay .arena .field .towers{z-index:7!important}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{background-image:var(--v10-tower, url('/visual_assets/tower_chat_idle.png'))!important;background-position:center bottom!important;background-size:contain!important;filter:drop-shadow(0 0 9px #fa3847aa)!important}
html body.overlay.visual-enhanced .arena .field .towers .tower:last-child::after{filter:drop-shadow(0 0 9px #26baffaa)!important}
html body.overlay .arena .field .gifts .gift{background:transparent!important;border:none!important;box-shadow:none!important;outline:none!important}
html body.overlay .arena .field .v52gift{max-width:70px!important}
html body.overlay .header .side::before{background-image:var(--v10-dragon-chat,url('/visual_assets/chat_dragon.png'))!important}
html body.overlay .header .side:last-child::before{background-image:var(--v10-dragon-creator,url('/visual_assets/creator_dragon.png'))!important}
html body.overlay .arena .field .v10-aura{position:absolute;top:4%;left:24%;width:52%;height:30%;background:url('/visual_assets/v10_aura.png') center/contain no-repeat;opacity:.36;mix-blend-mode:screen;z-index:1;pointer-events:none;animation:v10pulse 4s ease-in-out infinite}
@keyframes v10pulse{0%,100%{opacity:.24;transform:scale(.97)}50%{opacity:.55;transform:scale(1.04)}}
html body.overlay.v60-economico .v10-aura{display:none!important}
@media(prefers-reduced-motion:reduce){html body.overlay .arena .field .v10-aura{animation:none!important}}

/* V10.1: only individually isolated sprites, never UI-containing crops */
html body.overlay .arena .field{background:linear-gradient(90deg,#4c09141b,transparent 45%,#071b4e22),url('/visual_assets/arena_cinematic_v91.png') center/100% 100% no-repeat!important}
html body.overlay .arena .field .v10-aura{background-image:none!important;opacity:.65!important;top:2%!important;left:23%!important;width:54%!important;height:34%!important;border-radius:50%!important;box-shadow:0 0 40px 16px #8f31e744,inset 0 0 25px #a451ee88!important;mix-blend-mode:screen}
html body.overlay .arena .field .boss-monster{width:clamp(175px,72%,350px)!important;top:1.5%!important;max-height:45%!important;filter:drop-shadow(0 0 15px #ab40e8aa)!important}
html body.overlay .arena .field .boss-monster-body img{width:100%!important;height:clamp(130px,20dvh,215px)!important;max-height:22dvh!important;object-fit:contain!important}
html body.overlay .arena .field .towers{padding-bottom:clamp(33px,5dvh,64px)!important}
html body.overlay.visual-enhanced .arena .field .towers .tower{height:clamp(160px,38%,300px)!important}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{background-image:var(--v10-tower,url('/visual_assets/v11_tower_chat_idle_0.png'))!important;background-size:contain!important;background-position:center bottom!important;opacity:1!important}
html body.overlay .header .side::before{background-image:var(--v10-dragon-chat,url('/visual_assets/v11_dragon_chat_0.png'))!important;background-size:contain!important;background-position:left center!important;width:clamp(85px,24vw,130px)!important;height:100%!important;opacity:1!important;filter:drop-shadow(0 0 9px #fa3a2b)!important}
html body.overlay .header .side:last-child::before{background-image:var(--v10-dragon-creator,url('/visual_assets/v11_dragon_creator_0.png'))!important;background-position:right center!important;filter:drop-shadow(0 0 9px #0cbaff)!important}
html body.overlay .arena .field .v57towerhp{bottom:clamp(3px,1.1dvh,12px)!important;display:block;min-width:0!important;max-width:49%!important;z-index:30!important;white-space:nowrap!important}
html body.overlay .arena .field .v57towerhp[hidden]{display:none!important}
html body.overlay .arena .field .gifts .gift{border:0!important;background:transparent!important;box-shadow:none!important}
html body.overlay .arena .field .v52gift{max-width:64px!important}

/* V10.2: strict mobile composition; sprites, scoreboard and HP are independent layers. */
html body.overlay .header .side{position:relative!important;isolation:isolate!important;overflow:hidden!important;padding-left:5px!important;padding-right:5px!important}
html body.overlay .header .side::before{position:absolute!important;left:1px!important;top:12%!important;width:clamp(42px,13vw,65px)!important;height:76%!important;z-index:0!important;opacity:.9!important;background-position:left center!important;background-size:contain!important;pointer-events:none!important}
html body.overlay .header .side:last-child::before{left:auto!important;right:1px!important;background-position:right center!important}
html body.overlay .header .side .score,html body.overlay .header .side small{position:relative!important;z-index:3!important;text-shadow:0 2px 8px #000,0 0 3px #000!important}
html body.overlay .header .side .score{font-variant-numeric:tabular-nums!important;font-size:clamp(27px,8vw,45px)!important;line-height:1.1!important}
html body.overlay .header .side{font-size:clamp(12px,3.2vw,16px)!important}
html body.overlay .arena .field{isolation:isolate!important;grid-template-columns:clamp(68px,18%,89px) minmax(0,1fr) clamp(68px,18%,89px)!important}
html body.overlay .arena .field .boss-monster{box-sizing:border-box!important;width:min(68%,310px)!important;left:50%!important;right:auto!important;top:2%!important;transform:translateX(-50%)!important;max-height:42%!important;overflow:visible!important;z-index:16!important}
html body.overlay .arena .field .boss-monster-body{width:100%!important;max-width:100%!important;overflow:visible!important}
html body.overlay .arena .field .boss-monster-body img{display:block!important;width:100%!important;max-width:100%!important;height:clamp(110px,19dvh,192px)!important;max-height:20dvh!important;object-fit:contain!important}
html body.overlay .arena .field .boss-monster-title,html body.overlay .arena .field .boss-monster-health,html body.overlay .arena .field .v57hp,html body.overlay .arena .field .v58boss-next{box-sizing:border-box!important;position:relative!important;left:auto!important;right:auto!important;transform:none!important;width:100%!important;max-width:100%!important;min-width:0!important;margin-left:0!important;margin-right:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
html body.overlay .arena .field .boss-monster-title{font-size:clamp(11px,3vw,15px)!important;min-height:25px!important}
html body.overlay .arena .field .boss-monster-health{height:clamp(10px,1.8dvh,16px)!important;margin-top:3px!important}
html body.overlay .arena .field .v57hp,html body.overlay .arena .field .v58boss-next{font-size:clamp(10px,2.7vw,13px)!important;line-height:1.25!important;text-align:center!important}
html body.overlay .arena .field .v10-aura{left:24%!important;width:52%!important;height:28%!important;top:3%!important;z-index:1!important}
html body.overlay .arena .field .towers{position:relative!important;grid-column:2!important;z-index:8!important;overflow:visible!important;align-items:flex-end!important;gap:0!important;padding-bottom:clamp(32px,4.6dvh,55px)!important}
html body.overlay.visual-enhanced .arena .field .towers .tower{width:50%!important;height:clamp(175px,38%,300px)!important;min-width:0!important;max-width:none!important;overflow:visible!important}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{background-size:contain!important;background-repeat:no-repeat!important;background-position:center bottom!important;opacity:1!important;filter:drop-shadow(0 0 9px #000b)!important}
html body.overlay .arena .field .v57towerhp{position:absolute!important;bottom:clamp(3px,1.2dvh,14px)!important;width:49%!important;max-width:49%!important;min-width:0!important;padding:3px 1px!important;font-size:clamp(8px,2.15vw,11px)!important;z-index:25!important;overflow:hidden!important;white-space:nowrap!important;text-overflow:ellipsis!important}
html body.overlay .arena .field .v57towerhp.chat{left:0!important;right:auto!important}html body.overlay .arena .field .v57towerhp.creator{right:0!important;left:auto!important}
html body.overlay .arena .field .gifts{z-index:20!important;overflow:visible!important}
html body.overlay .arena .field .gifts .gift{overflow:visible!important;background:none!important;border:0!important;box-shadow:none!important}
html body.overlay .arena .field .gifts .gift img{max-width:100%!important}
html body.overlay .arena .field .v52gift{top:41%!important;max-width:62px!important;max-height:12%!important;z-index:22!important}
html body.overlay .arena .field .v52gift.chat{left:19%!important}html body.overlay .arena .field .v52gift.creator{right:19%!important}
html body.overlay .arena .field .v52gift .v52box{padding:2px!important}
@media(max-width:385px){html body.overlay .arena .field .boss-monster{width:66%!important}html body.overlay .header .side::before{width:44px!important;opacity:.75!important}html body.overlay .header .side .score{font-size:29px!important}}

/* V10.3: enforce clean alpha sprites and keep text completely clear of decorative dragon heads. */
html body.overlay .header .side{box-sizing:border-box!important;overflow:hidden!important}
html body.overlay .header .side.red{padding-left:clamp(62px,15vw,100px)!important;padding-right:3px!important}
html body.overlay .header .side.blue{padding-right:clamp(62px,15vw,100px)!important;padding-left:3px!important}
html body.overlay .header .side::before{content:''!important;position:absolute!important;left:2px!important;right:auto!important;top:21%!important;width:clamp(57px,14vw,88px)!important;height:58%!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;opacity:1!important;z-index:1!important;pointer-events:none!important}
html body.overlay .header .side.blue::before{left:auto!important;right:2px!important}
html body.overlay .header .side .score{font-size:clamp(25px,7vw,43px)!important;position:relative!important;z-index:2!important;max-width:100%!important;overflow:hidden!important;text-overflow:clip!important}
html body.overlay .header .side small{position:relative!important;z-index:2!important}
html body.overlay .arena .field .boss-monster{top:2%!important;width:min(66%,290px)!important;max-height:40%!important;z-index:17!important;filter:drop-shadow(0 0 13px #b339e7aa)!important}
html body.overlay .arena .field .boss-monster-body img{width:100%!important;height:clamp(145px,20dvh,215px)!important;max-height:21dvh!important;object-fit:contain!important}
html body.overlay .arena .field .boss-monster-title,html body.overlay .arena .field .boss-monster-health,html body.overlay .arena .field .v57hp,html body.overlay .arena .field .v58boss-next{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}
html body.overlay .arena .field .boss-monster-title{font-size:clamp(11px,2.9vw,15px)!important}
html body.overlay .arena .field .towers{grid-column:2!important;z-index:12!important;padding-bottom:clamp(33px,4.4dvh,55px)!important}
html body.overlay.visual-enhanced .arena .field .towers .tower{height:clamp(200px,40%,310px)!important;width:50%!important;overflow:visible!important}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{background-size:contain!important;background-position:center bottom!important;background-repeat:no-repeat!important}
html body.overlay .arena .field .v57towerhp{z-index:28!important;bottom:5px!important}
html body.overlay .arena .field .gifts{z-index:24!important}
html body.overlay .arena .field .gifts .gift{border:0!important;box-shadow:none!important;background:transparent!important}
html body.overlay .arena .field .v52gift{z-index:29!important;max-width:60px!important}
@media(max-width:390px){html body.overlay .header .side.red{padding-left:57px!important}html body.overlay .header .side.blue{padding-right:57px!important}html body.overlay .header .side::before{width:54px!important}html body.overlay .header .side .score{font-size:26px!important}}

/* V11 original, independent illustration layers. */
html body.overlay .arena .field{isolation:isolate!important}
html body.overlay .arena .field .v71scenery{background-image:url('/visual_assets/v11_environment.png')!important;background-size:100% 100%!important;background-position:center!important;opacity:1!important;z-index:0!important}
html body.overlay .arena .field .v10-aura{opacity:.3!important;pointer-events:none!important}
html body.overlay .header .side.red{padding-left:clamp(62px,15vw,96px)!important}
html body.overlay .header .side.blue{padding-right:clamp(62px,15vw,96px)!important}
html body.overlay .header .side::before{width:clamp(60px,14vw,95px)!important;height:88%!important;top:6%!important;left:0!important;background-size:contain!important;z-index:1!important}
html body.overlay .header .side.blue::before{left:auto!important;right:0!important}
html body.overlay .header .side .score{font-variant-numeric:tabular-nums!important;font-size:clamp(26px,6.5vw,42px)!important;z-index:3!important}
html body.overlay .arena .field .boss-monster{width:min(68%,310px)!important;max-width:68%!important;left:50%!important;transform:translateX(-50%)!important}
html body.overlay .arena .field .boss-monster-body img{object-fit:contain!important;filter:drop-shadow(0 0 15px #aa3eff)!important}
html body.overlay .arena .field .towers{z-index:12!important}
html body.overlay .arena .field .gifts{z-index:25!important}
html body.overlay .arena .field .gifts .gift{background:none!important;box-shadow:none!important;border:0!important}
@media(prefers-reduced-motion:reduce){html body.overlay .arena .field .v10-aura{animation:none!important}}

/* V11.1: boss characters use independent, clean transparent 320x250 frames. */
html body.overlay .arena .field .boss-monster-body{position:relative!important;isolation:isolate!important}
html body.overlay .arena .field .boss-monster-body img{width:100%!important;height:clamp(120px,21dvh,200px)!important;max-height:23dvh!important;object-fit:contain!important;image-rendering:auto!important;filter:drop-shadow(0 0 9px #ab47ff)!important}
html body.overlay .arena .field .boss-monster.phase2 .boss-monster-body img{filter:drop-shadow(0 0 11px #ff8c35)!important}
html body.overlay .arena .field .boss-monster.phase3 .boss-monster-body img{filter:drop-shadow(0 0 13px #ff386e)!important}
html body.overlay .arena .field .boss-monster-body svg{display:none!important}
@media(max-height:720px){html body.overlay .arena .field .boss-monster-body img{height:14dvh!important;max-height:14dvh!important}}

/* V11.2 — independent articulated dragon and castle sprite sequences */
html body.overlay .header .side::before{width:clamp(104px,27vw,160px)!important;height:clamp(92px,17dvh,155px)!important;top:50%!important;transform:translateY(-50%)!important;background-size:contain!important;background-repeat:no-repeat!important;pointer-events:none!important}
html body.overlay .header .side.red{padding-left:clamp(76px,21vw,125px)!important}
html body.overlay .header .side.blue{padding-right:clamp(76px,21vw,125px)!important}
html body.overlay .header .side .score{position:relative!important;z-index:4!important;text-shadow:0 1px 8px #0c081d!important}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{background-image:var(--v10-tower)!important;background-size:contain!important;background-repeat:no-repeat!important;background-position:center bottom!important;opacity:1!important;filter:drop-shadow(0 0 8px #d3a4ff)!important}
html body.overlay .arena .field .towers{isolation:isolate!important}
html body.overlay .arena .field .towers .tower{overflow:visible!important}
@media(max-width:390px){html body.overlay .header .side::before{width:clamp(86px,24vw,112px)!important}html body.overlay .header .side.red{padding-left:70px!important}html body.overlay .header .side.blue{padding-right:70px!important}}

/* V11.3 - independent multi-plane environment, no sprites or text baked into scenery */
html body.overlay .arena .field{
 background:linear-gradient(90deg,rgba(255,38,50,.06),transparent 44%,rgba(29,132,255,.07)),#09091d!important;
 isolation:isolate!important;
}
html body.overlay .arena .field .v71scenery{
 position:absolute!important;inset:0!important;z-index:0!important;
 background-image:url('/visual_assets/v113_floor.png'),url('/visual_assets/v113_castles.png'),url('/visual_assets/v113_sky.png')!important;
 background-size:100% 100%,100% 100%,100% 100%!important;
 background-position:center,center,center!important;
 background-repeat:no-repeat!important;opacity:1!important;
 overflow:hidden!important;pointer-events:none!important;
}
html body.overlay .arena .field .v71scenery::before{
 content:''!important;position:absolute!important;inset:0!important;
 background-image:url('/visual_assets/v113_lightning_0.png')!important;
 background-size:100% 100%!important;opacity:.68!important;
 animation:v113storm 9s steps(1,end) infinite!important;
}
html body.overlay .arena .field .v71scenery::after{
 content:''!important;position:absolute!important;inset:0!important;
 background:url('/visual_assets/v113_fog.png') center/105% 100% no-repeat!important;
 opacity:.75!important;animation:v113mist 12s ease-in-out infinite alternate!important;
}
@keyframes v113mist{0%{transform:translateX(-3%) scale(1.04);opacity:.4}100%{transform:translateX(3%) scale(1.08);opacity:.8}}
@keyframes v113storm{
 0%,100%{background-image:url('/visual_assets/v113_lightning_0.png');opacity:.16}
 16%{background-image:url('/visual_assets/v113_lightning_1.png');opacity:.74}
 32%{background-image:url('/visual_assets/v113_lightning_2.png');opacity:.2}
 48%{background-image:url('/visual_assets/v113_lightning_3.png');opacity:.9}
 64%{background-image:url('/visual_assets/v113_lightning_4.png');opacity:.15}
 80%{background-image:url('/visual_assets/v113_lightning_5.png');opacity:.7}
}
html body.overlay .arena .field .v10-aura{opacity:.2!important;pointer-events:none!important}
@media(prefers-reduced-motion:reduce){
 html body.overlay .arena .field .v71scenery::before,
 html body.overlay .arena .field .v71scenery::after{animation:none!important}
}

/* LivePulse V11.4 — unified mobile-first scoreboard and clean seven-per-side gifts */
html body.overlay .arena{--v114-gold:#e5b66e;--v114-ink:#080a1e;max-width:540px!important;width:100%!important;min-height:100dvh!important;display:flex!important;flex-direction:column!important}
html body.overlay .arena .v71brand{background:linear-gradient(180deg,#080817,#211128)!important;padding:7px 6px 5px!important;border-bottom:2px solid #a37a52!important;flex-shrink:0!important}
html body.overlay .arena .v71brand span{font-size:clamp(18px,5vw,28px)!important;letter-spacing:.07em!important;color:#f6d08a!important;text-shadow:0 0 13px #dba05e80!important}
html body.overlay .arena .v71brand small{font-size:clamp(7px,1.9vw,10px)!important;letter-spacing:.07em!important}
html body.overlay .arena .header{display:grid!important;grid-template-columns:minmax(0,1fr) 42px minmax(0,1fr)!important;align-items:stretch!important;gap:2px!important;padding:5px 4px!important;min-height:clamp(82px,13dvh,112px)!important;flex:0 0 auto!important;background:linear-gradient(90deg,#2b0d20 0%,#100c24 50%,#0c2447 100%)!important;border-bottom:2px solid var(--v114-gold)!important}
html body.overlay .arena .header .side{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;min-width:0!important;padding:3px 4px!important;font-size:clamp(11px,3vw,16px)!important;line-height:1.1!important;letter-spacing:.03em!important;isolation:isolate!important}
html body.overlay .arena .header .side.red{padding-left:clamp(55px,16vw,88px)!important;background:linear-gradient(100deg,#3c0e24bd,#190d26aa)!important;border:1px solid #f15b5888!important;border-radius:10px 4px 4px 10px!important}
html body.overlay .arena .header .side.blue{padding-right:clamp(55px,16vw,88px)!important;background:linear-gradient(260deg,#0e3764bb,#0e1427aa)!important;border:1px solid #55c9f588!important;border-radius:4px 10px 10px 4px!important}
html body.overlay .arena .header .side::before{width:clamp(75px,20vw,120px)!important;height:100%!important;top:50%!important;transform:translateY(-50%)!important;opacity:.95!important;z-index:0!important}
html body.overlay .arena .header .side .score{position:relative!important;z-index:2!important;display:block!important;font-size:clamp(21px,6vw,37px)!important;line-height:1.03!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;text-shadow:0 2px 4px #000,0 0 12px #fff5!important}
html body.overlay .arena .header .side small{position:relative!important;z-index:2!important;font-size:clamp(7px,1.9vw,10px)!important;white-space:nowrap!important}
html body.overlay .arena .header .vs{align-self:center!important;justify-self:center!important;font-size:clamp(18px,5vw,27px)!important;color:#ffe3aa!important;text-shadow:0 0 10px #ed7cff!important}
html body.overlay .arena .meta{margin:0!important;display:block!important;padding:6px 4px!important;min-height:27px!important;font-size:clamp(9px,2.4vw,12px)!important;font-weight:850!important;letter-spacing:.015em!important;background:#0d0d25ee!important;color:#f3e1bc!important;border-bottom:1px solid #e4b66a77!important;flex:0 0 auto!important}
html body.overlay .arena .field{flex:1 1 auto!important;min-height:330px!important;height:auto!important;margin:0!important;display:grid!important;grid-template-columns:clamp(56px,17%,82px) minmax(0,1fr) clamp(56px,17%,82px)!important;grid-template-rows:minmax(0,1fr)!important;overflow:hidden!important}
html body.overlay .arena .field #gchat,html body.overlay .arena .field #gcreator{display:grid!important;grid-template-rows:repeat(7,minmax(0,1fr))!important;align-items:stretch!important;justify-items:stretch!important;gap:1px!important;min-width:0!important;min-height:0!important;padding:3px 2px!important;z-index:26!important;background:linear-gradient(90deg,#200e22a8,#090d2390)!important;overflow:hidden!important}
html body.overlay .arena .field #gcreator{background:linear-gradient(270deg,#10233ba8,#090d2390)!important}
html body.overlay .arena .field #gchat .gift,html body.overlay .arena .field #gcreator .gift{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:0!important;min-height:0!important;max-height:none!important;min-width:0!important;margin:0!important;padding:1px 0!important;background:transparent!important;background-image:none!important;border:0!important;border-radius:0!important;outline:0!important;box-shadow:none!important;overflow:hidden!important;font-size:clamp(6px,1.65vw,9px)!important;line-height:1.06!important;text-align:center!important;color:#f9f3e7!important}
html body.overlay .arena .field #gchat .gift img,html body.overlay .arena .field #gcreator .gift img{width:min(100%,48px)!important;height:clamp(21px,5.4dvh,47px)!important;max-height:58%!important;object-fit:contain!important;flex:0 1 auto!important;filter:drop-shadow(0 1px 4px #000)!important}
html body.overlay .arena .field #gchat .gift div,html body.overlay .arena .field #gcreator .gift div{max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
html body.overlay .arena .field #gchat .gift b,html body.overlay .arena .field #gcreator .gift b{font-size:clamp(8px,2vw,11px)!important;line-height:1!important;flex-shrink:0!important}
html body.overlay .arena .field #gchat .gift b{color:#ffb6a1!important}
html body.overlay .arena .field #gcreator .gift b{color:#9de4ff!important}
html body.overlay .arena .field .towers{grid-column:2!important;grid-row:1!important;z-index:12!important;display:flex!important;justify-content:space-around!important;align-items:flex-end!important;min-width:0!important;padding:0 2px 8dvh!important}
html body.overlay .arena .field .towers .tower{min-width:0!important;max-width:48%!important}
html body.overlay .arena .field .boss-monster{z-index:18!important;pointer-events:none!important}
html body.overlay .arena .field .v57towerhp{bottom:2px!important;min-width:44%!important;max-width:49%!important;text-align:center!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;font-size:clamp(8px,2vw,10px)!important}
html body.overlay .arena .field .v57hp{font-size:clamp(9px,2.2vw,12px)!important;color:#fff3d7!important}
html body.overlay .arena .field .boss-monster-health{border:1px solid #cf9af5!important;border-radius:999px!important;overflow:hidden!important;background:#21132c!important}
html body.overlay .arena .v71footer{display:grid!important;grid-template-columns:1.15fr 1.15fr 1fr!important;gap:4px!important;padding:5px 4px!important;min-height:54px!important;flex:0 0 auto!important;background:linear-gradient(180deg,#17102b,#080a1a)!important;border-top:2px solid var(--v114-gold)!important}
html body.overlay .arena .v71tile{min-width:0!important;padding:5px 3px!important;border-radius:7px!important;gap:3px!important}
html body.overlay .arena .v71tile small{font-size:clamp(7px,1.7vw,10px)!important;line-height:1.1!important}
html body.overlay .arena .v71tile span{font-size:clamp(8px,2vw,12px)!important;line-height:1.2!important;max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
html body.overlay .arena .status{min-height:28px!important;max-height:36px!important;flex:0 0 auto!important;padding:6px 7px!important;font-size:clamp(10px,2.5vw,12px)!important}
html body.overlay .arena .controls,html body.overlay .arena .v561panel,html body.overlay .arena .v55panel{flex:0 0 auto!important}
@media(max-height:690px){
 html body.overlay .arena .v71brand{padding:3px!important}
 html body.overlay .arena .header{min-height:73px!important}
 html body.overlay .arena .v71footer{min-height:44px!important}
 html body.overlay .arena .field #gchat .gift img,html body.overlay .arena .field #gcreator .gift img{height:clamp(18px,4.3dvh,35px)!important}
}

/* V11.5: effects overlay never intercepts taps and never alters scores. */
html body.overlay .arena .field #v115fx{position:absolute!important;inset:0!important;z-index:37!important;pointer-events:none!important;overflow:hidden!important;contain:layout paint!important}
html body.overlay .arena .field #v115fx .v115fx{position:absolute!important;display:block!important;pointer-events:none!important;transform:translate(-50%,-50%);will-change:transform,opacity}
html body.overlay .arena .field .v115projectile{width:28px;height:14px;border-radius:80% 30% 80% 30%;background:radial-gradient(circle at 20% 50%,#fff 5%,var(--v115color) 45%,transparent 85%);box-shadow:0 0 18px 5px var(--v115color);animation:v115flight .55s cubic-bezier(.12,.2,.58,1) forwards}
html body.overlay .arena .field .v115projectile.v115dark{filter:hue-rotate(65deg) brightness(1.2)}
html body.overlay .arena .field .v115blast{width:var(--size);height:var(--size);border:4px solid var(--v115color);border-radius:50%;background:radial-gradient(circle,#fff9 0%,var(--v115color) 19%,transparent 68%);box-shadow:0 0 30px var(--v115color),inset 0 0 18px var(--v115color);animation:v115explode .7s ease-out forwards}
html body.overlay .arena .field .v115spark{width:9px;height:9px;border-radius:50%;background:#fff3c5;box-shadow:0 0 10px 4px var(--v115color);animation:v115scatter .65s ease-out var(--delay,0ms) forwards}
html body.overlay .arena .field .v115shield{width:130px;height:155px;border:4px solid var(--v115color);border-radius:50%;background:radial-gradient(ellipse,#fff2,transparent 70%);box-shadow:inset 0 0 24px var(--v115color),0 0 25px var(--v115color);animation:v115shield .95s ease-in-out forwards}
html body.overlay .arena .field .v115ring{width:40px;height:40px;border:5px double #fff5bb;border-radius:50%;box-shadow:0 0 22px var(--v115color);animation:v115explode 1.2s ease-out forwards}
html body.overlay .arena .field .v115debris{width:120px;height:85px;background:radial-gradient(ellipse at 20% 60%,#5d405f99,transparent 65%),radial-gradient(ellipse at 75% 20%,#bc889c77,transparent 65%);animation:v115debris 1.35s ease-out forwards}
html body.overlay .arena .field .v115victory{width:min(86%,340px);padding:12px 5px;text-align:center;color:#fff4c5;font-size:clamp(20px,5.4vw,30px);font-weight:1000;letter-spacing:.045em;text-shadow:0 0 6px #000,0 0 15px #e5a64d,0 0 25px #a65ff4;background:linear-gradient(90deg,transparent,#281634b8,transparent);border-top:2px solid #ffdc8e;border-bottom:2px solid #ffdc8e;animation:v115victory 2.7s ease-in-out forwards}
@keyframes v115flight{from{transform:translate(-50%,-50%) rotate(var(--angle)) scale(.5);opacity:0}18%{opacity:1}to{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) rotate(var(--angle)) scale(1.25);opacity:0}}
@keyframes v115explode{0%{transform:translate(-50%,-50%) scale(.15);opacity:1}65%{opacity:.95}100%{transform:translate(-50%,-50%) scale(2.1);opacity:0}}
@keyframes v115scatter{0%{transform:translate(-50%,-50%) scale(.6);opacity:1}100%{transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(.1);opacity:0}}
@keyframes v115shield{0%{transform:translate(-50%,-50%) scale(.35);opacity:0}35%{opacity:1}100%{transform:translate(-50%,-50%) scale(1.2);opacity:0}}
@keyframes v115debris{0%{transform:translate(-50%,-50%) scale(.5);opacity:1}100%{transform:translate(-50%,-70%) scale(2);opacity:0}}
@keyframes v115victory{0%{transform:translate(-50%,-60%) scale(.7);opacity:0}17%,70%{transform:translate(-50%,-50%) scale(1);opacity:1}100%{transform:translate(-50%,-40%) scale(1.06);opacity:0}}
@media(prefers-reduced-motion:reduce){html body.overlay .arena .field #v115fx{display:none!important}}

/* V11.6: GPU/CPU conservative presets, no expensive full-scene animation in economy. */
html body.overlay.v60-economico .arena .field .v71scenery::before,
html body.overlay.v60-economico .arena .field .v71scenery::after{animation:none!important;opacity:.14!important}
html body.overlay.v60-economico .arena .field .v10-aura,
html body.overlay.v60-economico .arena .field #v115fx{display:none!important}
html body.overlay.v60-economico .arena .field .towers .tower::after{filter:none!important}
html body.overlay.v60-equilibrado .arena .field .v71scenery::after{animation-duration:25s!important;opacity:.36!important}
html body.overlay.v60-equilibrado .arena .field .v71scenery::before{animation-duration:16s!important;opacity:.4!important}
html body.overlay.v60-equilibrado .arena .field .towers .tower::after{filter:drop-shadow(0 0 3px #000)!important}
html body.overlay.v60-cinematografico .arena .field .v71scenery::after{animation-duration:12s!important}
html body.overlay .arena .v116-performance{display:block;font-size:10px;opacity:.75;margin-top:3px;color:#e3d9f7}
@media(prefers-reduced-motion:reduce){html body.overlay .arena .field .v71scenery::before,html body.overlay .arena .field .v71scenery::after{animation:none!important}}

/* V11.7: explicit grid placement, clipping boundaries, and sprite containment. */
html body.overlay .arena .field{position:relative!important;display:grid!important;grid-template-columns:clamp(54px,17vw,84px) minmax(0,1fr) clamp(54px,17vw,84px)!important;grid-template-rows:minmax(0,1fr)!important;align-items:stretch!important;min-width:0!important;overflow:hidden!important}
html body.overlay .arena .field .v71scenery{grid-column:1/-1!important;grid-row:1!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:0!important;pointer-events:none!important;overflow:hidden!important}
html body.overlay .arena .field #gchat{grid-column:1!important;grid-row:1!important}
html body.overlay .arena .field #gcreator{grid-column:3!important;grid-row:1!important}
html body.overlay .arena .field #gchat,html body.overlay .arena .field #gcreator{position:relative!important;z-index:24!important;box-sizing:border-box!important;min-width:0!important;width:100%!important;height:100%!important;max-height:100%!important;overflow:hidden!important;display:grid!important;grid-template-rows:repeat(7,minmax(0,1fr))!important}
html body.overlay .arena .field #gchat .gift,html body.overlay .arena .field #gcreator .gift{box-sizing:border-box!important;max-width:100%!important;min-width:0!important;min-height:0!important;overflow:hidden!important;background:none!important;border:0!important;box-shadow:none!important}
html body.overlay .arena .field #gchat .gift img,html body.overlay .arena .field #gcreator .gift img{display:block!important;width:100%!important;max-width:46px!important;min-height:0!important;max-height:58%!important;object-fit:contain!important;mix-blend-mode:normal!important;background:transparent!important;border:0!important;box-shadow:none!important}
html body.overlay .arena .field .towers{position:relative!important;grid-column:2!important;grid-row:1!important;z-index:12!important;display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:2px!important;min-width:0!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;padding:0 3px clamp(34px,7dvh,78px)!important;overflow:visible!important}
html body.overlay .arena .field .towers .tower{position:relative!important;flex:1 1 0!important;max-width:48%!important;min-width:0!important;isolation:isolate!important}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{content:''!important;position:absolute!important;left:0!important;bottom:0!important;width:100%!important;height:clamp(105px,27dvh,230px)!important;background-image:var(--v10-tower)!important;background-position:center bottom!important;background-size:contain!important;background-repeat:no-repeat!important;opacity:1!important;pointer-events:none!important;transform:none!important;filter:drop-shadow(0 2px 9px #0009)!important}
html body.overlay .arena .field .towers .stack{position:relative!important;z-index:1!important;max-width:100%!important;overflow:visible!important}
html body.overlay .arena .field .towers .v57towerhp{z-index:22!important;max-width:49%!important;box-sizing:border-box!important;pointer-events:none!important}
html body.overlay .arena .field #bossMonster{position:absolute!important;z-index:20!important;max-width:calc(100% - 2*clamp(54px,17vw,84px))!important;left:50%!important;transform:translateX(-50%)!important;pointer-events:none!important;box-sizing:border-box!important}
html body.overlay .arena .field #bossMonster .boss-monster-body{width:100%!important;max-width:100%!important;min-width:0!important;overflow:visible!important}
html body.overlay .arena .field #bossSprite{display:block!important;width:100%!important;max-width:260px!important;height:clamp(95px,20dvh,190px)!important;object-fit:contain!important;object-position:center center!important;mix-blend-mode:normal!important;background:none!important;border:0!important;box-shadow:none!important;margin:auto!important}
html body.overlay .arena .field #bossSprite[hidden]{display:none!important}
html body.overlay .arena .field #bossMonster .boss-monster-title,
html body.overlay .arena .field #bossMonster .v57hp{max-width:100%!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
html body.overlay .arena .header{box-sizing:border-box!important;overflow:hidden!important}
html body.overlay .arena .header .side{min-width:0!important;box-sizing:border-box!important;overflow:hidden!important}
html body.overlay .arena .header .side::before{background-size:contain!important;background-repeat:no-repeat!important;background-position:center!important;mix-blend-mode:normal!important;pointer-events:none!important}
html body.overlay .arena .v71footer{box-sizing:border-box!important;min-width:0!important;overflow:hidden!important}
html body.overlay .arena .v71footer .v71tile{min-width:0!important;max-width:100%!important;overflow:hidden!important}
html body.overlay .arena .field .v52gift{z-index:33!important;pointer-events:none!important}
@media(max-width:390px){
 html body.overlay .arena .field{grid-template-columns:clamp(51px,16vw,66px) minmax(0,1fr) clamp(51px,16vw,66px)!important}
 html body.overlay .arena .field #bossMonster{max-width:calc(100% - 108px)!important}
 html body.overlay .arena .header .side.red{padding-left:clamp(51px,15vw,70px)!important}
 html body.overlay .arena .header .side.blue{padding-right:clamp(51px,15vw,70px)!important}
}
@media(max-height:700px){
 html body.overlay .arena .field #bossSprite{height:clamp(84px,15dvh,130px)!important}
 html body.overlay.visual-enhanced .arena .field .towers .tower::after{height:clamp(88px,21dvh,160px)!important}
}

/* V11.9: independent transparent light passes; tiered and non-interactive. */
html body.overlay.visual-enhanced .arena .field #v119lighting{position:absolute!important;inset:0!important;z-index:1!important;pointer-events:none!important;overflow:hidden!important;contain:paint!important;opacity:.85!important}
html body.overlay.visual-enhanced .arena .field #v119lighting::before,
html body.overlay.visual-enhanced .arena .field #v119lighting::after{content:''!important;position:absolute!important;bottom:-13%!important;width:55%!important;height:74%!important;background-size:contain!important;background-repeat:no-repeat!important;pointer-events:none!important;opacity:.55!important;mix-blend-mode:screen!important}
html body.overlay.visual-enhanced .arena .field #v119lighting::before{left:-16%!important;background-image:url('/visual_assets/v119_glow_chat.png')!important}
html body.overlay.visual-enhanced .arena .field #v119lighting::after{right:-16%!important;background-image:url('/visual_assets/v119_glow_creator.png')!important}
html body.overlay.visual-enhanced .arena .field #v119portal{position:absolute!important;left:50%!important;top:5%!important;transform:translateX(-50%)!important;width:min(58%,230px)!important;aspect-ratio:1!important;z-index:2!important;pointer-events:none!important;background:url('/visual_assets/v119_portal_halo.png') center/contain no-repeat!important;opacity:.3!important;filter:drop-shadow(0 0 10px #ac62e655)!important}
html body.overlay.visual-enhanced .arena .field.v119-impact-chat #v119lighting::before{opacity:.95!important;filter:brightness(1.4)!important}
html body.overlay.visual-enhanced .arena .field.v119-impact-creator #v119lighting::after{opacity:.95!important;filter:brightness(1.4)!important}
html body.overlay.visual-enhanced .arena .field.v119-victory #v119portal{background-image:url('/visual_assets/v119_victory_flare.png')!important;opacity:.9!important;filter:drop-shadow(0 0 25px #ffdb81)!important}
html body.overlay.visual-enhanced .arena .field .v115projectile{width:clamp(19px,6vw,30px)!important;height:clamp(12px,3.6vw,19px)!important;filter:drop-shadow(0 0 5px var(--v115color))!important}
html body.overlay.visual-enhanced .arena .field .v115blast{border-width:3px!important;box-shadow:0 0 16px var(--v115color),inset 0 0 12px var(--v115color)!important}
html body.overlay.visual-enhanced .arena .field .v115victory{background:linear-gradient(90deg,transparent,#24132ddc,transparent)!important;box-shadow:0 8px 22px #0007!important}
html body.overlay.visual-enhanced .arena .header .side.red{border-color:#e88b6f99!important}
html body.overlay.visual-enhanced .arena .header .side.blue{border-color:#75cbf4a3!important}
html body.overlay.visual-enhanced .arena .header .score{font-variant-numeric:tabular-nums!important;letter-spacing:-.025em!important}
html body.overlay.visual-enhanced .arena .field #bossSprite{filter:drop-shadow(0 5px 9px #070619b5)!important}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{filter:drop-shadow(0 4px 7px #0009)!important}
html body.overlay.v60-economico .arena .field #v119lighting,
html body.overlay.v60-economico .arena .field #v119portal{display:none!important}
html body.overlay.v60-equilibrado .arena .field #v119lighting{opacity:.48!important}
html body.overlay.v60-equilibrado .arena .field #v119portal{opacity:.16!important}
@media(prefers-reduced-motion:reduce){html body.overlay .arena .field #v119portal{opacity:.1!important}}
@media(max-width:380px){html body.overlay.visual-enhanced .arena .field #v119portal{width:45%!important}}

/* V12.3 Android layout polish: non-destructive override of legacy cascade. */
html body.overlay .arena .field{grid-template-columns:clamp(78px,19%,110px) minmax(0,1fr) clamp(78px,19%,110px)!important;isolation:isolate!important}
html body.overlay .arena .field #gchat,html body.overlay .arena .field #gcreator{position:relative!important;inset:auto!important;transform:none!important;width:100%!important;height:100%!important;min-width:0!important;box-sizing:border-box!important;overflow:hidden!important;padding:5px 3px!important;z-index:28!important}
html body.overlay .arena .field #gchat{grid-column:1!important;grid-row:1!important}
html body.overlay .arena .field #gcreator{grid-column:3!important;grid-row:1!important}
html body.overlay .arena .field #gchat .gift,html body.overlay .arena .field #gcreator .gift{width:100%!important;min-width:0!important;max-width:100%!important;overflow:hidden!important;transform:none!important;box-sizing:border-box!important}
html body.overlay .arena .field #gchat .gift div,html body.overlay .arena .field #gcreator .gift div{display:block!important;max-width:100%!important;width:100%!important;white-space:normal!important;overflow:hidden!important;text-overflow:clip!important;overflow-wrap:anywhere!important;word-break:normal!important;line-height:1.08!important;font-size:clamp(8px,1.85vw,10px)!important;max-height:2.2em!important}
html body.overlay .arena .field #gchat .gift img,html body.overlay .arena .field #gcreator .gift img{max-width:100%!important;width:min(100%,45px)!important;height:clamp(23px,4.5dvh,46px)!important;flex-shrink:1!important}
html body.overlay .arena .field #gchat .gift b,html body.overlay .arena .field #gcreator .gift b{font-size:clamp(9px,2vw,12px)!important}
html body.overlay .arena .field .towers{grid-column:2!important;grid-row:1!important;min-width:0!important;max-width:100%!important}
html body.overlay .arena .v71footer{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important;padding:5px 4px!important;min-width:0!important;box-sizing:border-box!important}
html body.overlay .arena .v71footer .v71tile{min-width:0!important;max-width:100%!important;overflow:hidden!important;padding:5px 3px!important;box-sizing:border-box!important}
html body.overlay .arena .v71footer .v71tile small,html body.overlay .arena .v71footer .v71tile span{display:block!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
html body.overlay .arena .status{box-sizing:border-box!important;max-width:100%!important;padding:5px 9px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
html body.overlay #v1222sync{position:fixed!important;bottom:auto!important;top:3px!important;right:3px!important;left:auto!important;z-index:999!important;max-width:calc(100vw - 12px)!important;box-sizing:border-box!important;font-size:9px!important;opacity:.88!important;pointer-events:none!important}
html body.overlay #v1222sync.v123healthy{opacity:0!important;visibility:hidden!important}
html body.overlay #v1222sync.v123problem{visibility:visible!important;opacity:1!important;background:#2c1022!important;color:#ffe0a1!important}
@media(max-width:420px){html body.overlay .arena .field{grid-template-columns:clamp(72px,20%,90px) minmax(0,1fr) clamp(72px,20%,90px)!important}html body.overlay .arena .field #gchat .gift div,html body.overlay .arena .field #gcreator .gift div{font-size:8px!important}html body.overlay .arena .field #gchat .gift img,html body.overlay .arena .field #gcreator .gift img{height:clamp(21px,4dvh,38px)!important}}
@media(max-height:720px){html body.overlay .arena .field #gchat .gift img,html body.overlay .arena .field #gcreator .gift img{height:clamp(19px,3.5dvh,30px)!important}html body.overlay .arena .field #gchat .gift div,html body.overlay .arena .field #gcreator .gift div{font-size:7px!important}}

/* V12.3.1 — rails de presentes legiveis e independentes do cenario */
html body.overlay .arena .field{grid-template-columns:clamp(84px,24vw,104px) minmax(0,1fr) clamp(84px,24vw,104px)!important;column-gap:0!important;overflow:hidden!important;isolation:isolate!important}
html body.overlay .arena .field #gchat,html body.overlay .arena .field #gcreator{
 display:flex!important;flex-direction:column!important;justify-content:space-evenly!important;align-items:stretch!important;
 position:relative!important;top:auto!important;left:auto!important;right:auto!important;bottom:auto!important;
 grid-row:1!important;height:100%!important;min-height:0!important;width:100%!important;
 margin:0!important;padding:7px 3px!important;overflow:visible!important;z-index:85!important;
 box-sizing:border-box!important;transform:none!important;gap:3px!important;
 background:linear-gradient(180deg,#120b21d9,#0a1023cc)!important;
}
html body.overlay .arena .field #gchat{grid-column:1!important;border-right:1px solid #ff718b40!important}
html body.overlay .arena .field #gcreator{grid-column:3!important;border-left:1px solid #5fcfff40!important}
html body.overlay .arena .field #gchat .gift,html body.overlay .arena .field #gcreator .gift{
 display:flex!important;flex:1 1 0!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;
 min-width:0!important;min-height:0!important;max-height:none!important;width:100%!important;max-width:100%!important;
 padding:3px 2px!important;margin:0!important;gap:1px!important;box-sizing:border-box!important;
 background:#260f27d9!important;border:1px solid #ff59745c!important;border-radius:6px!important;
 box-shadow:none!important;overflow:hidden!important;transform:none!important;position:relative!important;
}
html body.overlay .arena .field #gcreator .gift{background:#09243ed9!important;border-color:#4abfff66!important}
html body.overlay .arena .field .gifts .gift img{
 display:block!important;flex:0 1 auto!important;min-height:0!important;width:clamp(23px,7vw,36px)!important;
 height:clamp(21px,3.3dvh,34px)!important;max-width:100%!important;max-height:40%!important;
 margin:0 auto!important;object-fit:contain!important;
}
html body.overlay .arena .field .gifts .gift div{
 display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
 width:100%!important;max-width:100%!important;max-height:2.4em!important;min-height:0!important;
 margin:0!important;padding:0!important;line-height:1.12!important;
 font-size:clamp(9px,2.25vw,11px)!important;font-weight:800!important;
 overflow:hidden!important;overflow-wrap:anywhere!important;word-break:normal!important;
 white-space:normal!important;text-align:center!important;color:#fff!important;
}
html body.overlay .arena .field .gifts .gift b{
 display:block!important;flex:0 0 auto!important;font-size:clamp(10px,2.5vw,12px)!important;
 line-height:1.05!important;color:#a9ffbe!important;margin:0!important;
}
html body.overlay .arena .field .towers{grid-column:2!important;grid-row:1!important;min-width:0!important;max-width:100%!important;z-index:4!important}
html body.overlay .arena .field .v71scenery,html body.overlay .arena .field #v119lighting,html body.overlay .arena .field #v119portal{pointer-events:none!important}
html body.overlay .arena .v71footer{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:4px!important}
html body.overlay .arena .v71footer .v71tile{min-width:0!important;overflow:hidden!important}
html body.overlay .arena .v71footer .v71tile small{font-size:clamp(8px,2vw,10px)!important}
html body.overlay .arena .v71footer .v71tile span{font-size:clamp(9px,2.3vw,11px)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
@media(max-width:370px){html body.overlay .arena .field{grid-template-columns:78px minmax(0,1fr) 78px!important}html body.overlay .arena .field .gifts .gift div{font-size:9px!important}}
@media(max-height:650px){html body.overlay .arena .field #gchat,html body.overlay .arena .field #gcreator{gap:1px!important;padding:2px!important}html body.overlay .arena .field .gifts .gift img{height:19px!important}}

/* V12.3.2: gift notifications stay within their respective outer lanes.
   This overrides the accumulated older !important offsets, without changing gift data or animations. */
html body.overlay .arena .field .v52gift,
html body.overlay.visual-enhanced .arena .field .v52gift{
 position:absolute!important;top:34%!important;width:clamp(46px,14%,78px)!important;
 max-width:78px!important;max-height:18%!important;z-index:26!important;
 box-sizing:border-box!important;pointer-events:none!important;
}
html body.overlay .arena .field .v52gift.chat,
html body.overlay.visual-enhanced .arena .field .v52gift.chat{
 left:1%!important;right:auto!important;
}
html body.overlay .arena .field .v52gift.creator,
html body.overlay.visual-enhanced .arena .field .v52gift.creator{
 right:1%!important;left:auto!important;
}
html body.overlay .arena .field .v52gift .v52box{
 box-sizing:border-box!important;width:100%!important;min-width:0!important;
 padding:3px 2px!important;border-radius:9px!important;
 background:#0c1325e8!important;overflow:hidden!important;
}
html body.overlay .arena .field .v52gift img{
 width:clamp(27px,7vw,43px)!important;height:clamp(27px,7vw,43px)!important;
 max-width:100%!important;object-fit:contain!important;
}
html body.overlay .arena .field .v52gift .v52name,
html body.overlay .arena .field .v52gift .v52user{
 display:block!important;font-size:clamp(8px,2.1vw,10px)!important;
 line-height:1.13!important;max-width:100%!important;white-space:normal!important;
 overflow-wrap:anywhere!important;overflow:hidden!important;
}
@media(max-width:380px){
 html body.overlay .arena .field .v52gift{width:clamp(44px,15%,60px)!important;top:32%!important}
 html body.overlay .arena .field .v52gift.chat{left:.5%!important}
 html body.overlay .arena .field .v52gift.creator{right:.5%!important}
}

/* V12.3.3 — zona segura dos eventos: entre as torres e as barras de vida.
   Mantem as duas colunas de presentes fixos completamente livres. */
html body.overlay .arena .field .v52gift,
html body.overlay.visual-enhanced .arena .field .v52gift{
 position:absolute!important;top:77%!important;bottom:auto!important;
 width:19%!important;max-width:none!important;max-height:15%!important;
 z-index:28!important;box-sizing:border-box!important;overflow:visible!important;
 transform:none!important;pointer-events:none!important;
}
html body.overlay .arena .field .v52gift.chat,
html body.overlay.visual-enhanced .arena .field .v52gift.chat{
 left:29%!important;right:auto!important;
}
html body.overlay .arena .field .v52gift.creator,
html body.overlay.visual-enhanced .arena .field .v52gift.creator{
 left:52%!important;right:auto!important;
}
html body.overlay .arena .field .v52gift .v52box{
 width:100%!important;min-width:0!important;padding:3px 2px!important;
 max-height:100%!important;overflow:hidden!important;
 background:#091024f2!important;border-radius:8px!important;
 box-sizing:border-box!important;box-shadow:0 1px 8px #000b!important;
}
html body.overlay .arena .field .v52gift img{
 width:clamp(20px,5vw,32px)!important;height:clamp(20px,5vw,32px)!important;
 margin:0 auto!important;object-fit:contain!important;
}
html body.overlay .arena .field .v52gift .v52emoji{
 font-size:23px!important;height:28px!important;line-height:28px!important;
}
html body.overlay .arena .field .v52gift .v52name,
html body.overlay .arena .field .v52gift .v52user{
 font-size:clamp(8px,1.8vw,10px)!important;line-height:1.12!important;
 overflow-wrap:anywhere!important;word-break:break-word!important;
 max-width:100%!important;white-space:normal!important;
}
@media(max-width:380px){
 html body.overlay .arena .field .v52gift{top:76%!important;width:20%!important}
 html body.overlay .arena .field .v52gift.chat{left:28%!important}
 html body.overlay .arena .field .v52gift.creator{left:52%!important}
}

/* LivePulse V12.4 — Central administrativa exclusiva, nao altera /overlay. */
#v124dashboard[hidden]{display:none!important}
body.v124-admin-page{margin:0;min-height:100vh;background:#080c1c;color:#f2f5ff;font:14px system-ui,-apple-system,Roboto,sans-serif;overflow-x:hidden}
body.v124-admin-page>.arena{display:none!important}
body.v124-admin-page #v1222sync{display:none!important}
.v124-console{max-width:1080px;margin:0 auto;padding:16px 12px 28px;box-sizing:border-box}
.v124-top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 16px;border:1px solid #34445c;border-radius:15px;background:linear-gradient(110deg,#17152e,#142a3d);box-shadow:0 10px 28px #0005}
.v124-top h1{font-size:clamp(18px,5vw,27px);margin:0;color:#ffe29a;letter-spacing:.3px}
.v124-top p{margin:5px 0 0;color:#afc4d9;font-size:12px}
.v124-links{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.v124-console a{color:#b5eaff;text-decoration:none}
.v124-console button,.v124-console select,.v124-console input{font:inherit}
.v124-console button{border:1px solid #5d7394;border-radius:10px;background:#273650;color:#f5f9ff;min-height:43px;padding:9px 12px;cursor:pointer;transition:filter .1s}
.v124-console button:active{filter:brightness(1.35)}
.v124-console button:disabled{opacity:.46;cursor:default}
.v124-console button.v124-primary{border-color:#74b9ff;background:#126cb2}
.v124-console button.v124-caution{border-color:#f0b962;background:#644023}
.v124-console button.v124-danger{border-color:#e38b9b;background:#742738}
.v124-console button.v124-ghost{background:#1a2233}
.v124-status{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}
.v124-tag{border-radius:999px;border:1px solid #4f6487;background:#13263a;padding:5px 10px;color:#c9e4fb;font-size:12px}
.v124-tag[data-kind="good"]{color:#b8ffdb;border-color:#277856}
.v124-tag[data-kind="bad"]{color:#ffd1d1;border-color:#a54554}
.v124-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
.v124-card{background:#111b30;border:1px solid #2c3a56;border-radius:12px;padding:12px;min-width:0;box-sizing:border-box}
.v124-card .k{color:#a8bed5;font-size:12px;display:block}
.v124-card strong{display:block;font-size:clamp(20px,5vw,30px);margin:2px 0;color:#fff;overflow-wrap:anywhere;font-variant-numeric:tabular-nums}
.v124-card .v124-sub{color:#a8bed5;font-size:11px}
.v124-chat strong{color:#ff9da8}.v124-creator strong{color:#89d8ff}
.v124-progress{height:7px;background:#26334a;border-radius:7px;overflow:hidden;margin-top:8px}
.v124-progress span{height:100%;display:block;width:0;background:#ca4f6d;transition:width .35s}
.v124-creator .v124-progress span{background:#37b6fa}
.v124-panel{border:1px solid #34425b;background:#0f182a;border-radius:14px;padding:14px;margin-top:12px}
.v124-panel h2{font-size:17px;color:#ffd895;margin:0 0 10px}
.v124-panel small{font-size:12px;color:#a9bcd0}
.v124-btns{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.v124-btns.v124-three{grid-template-columns:repeat(3,minmax(0,1fr))}
.v124-line{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}
.v124-info{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.v124-info>div{padding:8px;background:#1a263d;border-radius:9px;min-width:0}
.v124-info b{display:block;font-size:15px;overflow-wrap:anywhere}
.v124-info small{display:block}
.v124-history{display:flex;align-items:end;gap:3px;height:43px;overflow:hidden;margin-top:8px;padding:3px;background:#0b1221;border-radius:6px}
.v124-history i{flex:1;background:#4f9ce2;border-radius:2px 2px 0 0;min-width:2px}
.v124-logs{margin:8px 0 0;padding:0;list-style:none;max-height:220px;overflow:auto}
.v124-logs li{padding:7px 5px;border-bottom:1px solid #2c3a50;color:#cddbee;font-size:12px;overflow-wrap:anywhere}
.v124-settings{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.v124-settings label{display:grid;gap:6px;font-size:12px;color:#bbcbde}
.v124-settings input{border:1px solid #526a86;background:#101e30;color:white;border-radius:8px;min-height:40px;width:100%;box-sizing:border-box;padding:5px 9px}
.v124-msg{min-height:18px;padding:5px 2px;color:#acd9ff;font-size:12px;overflow-wrap:anywhere}
.v124-msg[data-error="1"]{color:#ffb3af}
.v124-secondary{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.v124-console details{margin-top:12px}
.v124-console summary{cursor:pointer;color:#d9e9ff;padding:6px 0}
.v124-footer{text-align:center;font-size:12px;color:#849fb9;margin:17px 0}
@media(max-width:650px){.v124-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.v124-info{grid-template-columns:repeat(2,minmax(0,1fr))}.v124-btns{grid-template-columns:repeat(2,minmax(0,1fr))}.v124-btns.v124-three{grid-template-columns:repeat(2,minmax(0,1fr))}.v124-settings{grid-template-columns:repeat(2,minmax(0,1fr))}.v124-console{padding:10px}.v124-panel{padding:11px}}
@media(max-width:360px){.v124-top{padding:10px}.v124-console button{padding:8px 6px;font-size:12px}}

/* LivePulse V12.7 — independent cinematic passes (separate transparent RGBA sprites).
   Never changes arena dimensions, gift columns, hitboxes, health bars or server state. */
html body.overlay.visual-enhanced .arena .field #v127depth{
 position:absolute!important;inset:0!important;z-index:1!important;pointer-events:none!important;
 contain:paint!important;overflow:hidden!important;opacity:.68!important;
}
html body.overlay.visual-enhanced .arena .field #v127depth::before{
 content:''!important;position:absolute!important;inset:0!important;
 background:url('/visual_assets/v127_depth_rays.png') center center/100% 100% no-repeat!important;
 opacity:.72!important;
}
html body.overlay.visual-enhanced .arena .field #v127depth::after{
 content:''!important;position:absolute!important;bottom:4%!important;left:0!important;
 width:100%!important;height:35%!important;
 background:url('/visual_assets/v127_ground_mist.png') center bottom/100% 100% no-repeat!important;
 opacity:.45!important;
}
/* Detached rim light for each animated dragon; original v112 sprites remain independent. */
html body.overlay.visual-enhanced .arena .header .side{isolation:isolate!important}
html body.overlay.visual-enhanced .arena .header .side::after{
 content:''!important;position:absolute!important;top:50%!important;left:0!important;
 width:clamp(102px,27vw,158px)!important;height:100%!important;
 transform:translateY(-50%)!important;z-index:0!important;pointer-events:none!important;
 background:url('/visual_assets/v127_dragon_chat_aura.png') center/contain no-repeat!important;
 opacity:.82!important;
}
html body.overlay.visual-enhanced .arena .header .side:last-child::after{
 left:auto!important;right:0!important;
 background-image:url('/visual_assets/v127_dragon_creator_aura.png')!important;
}
html body.overlay.visual-enhanced .arena .header .side::before{z-index:1!important}
html body.overlay.visual-enhanced .arena .header .side .score{z-index:2!important}
/* Boss ritual aura tracks existing boss phase (1–3), behind sprite and not over HP text. */
html body.overlay.visual-enhanced .arena .field .boss-monster-body{position:relative!important;isolation:isolate!important}
html body.overlay.visual-enhanced .arena .field .boss-monster-body::before{
 content:''!important;position:absolute!important;left:50%!important;top:45%!important;
 width:clamp(158px,43vw,235px)!important;height:clamp(158px,43vw,235px)!important;
 transform:translate(-50%,-50%)!important;z-index:0!important;pointer-events:none!important;
 background:url('/visual_assets/v127_boss_sigil_1.png') center/contain no-repeat!important;
 opacity:.7!important;filter:drop-shadow(0 0 11px #a856d455)!important;
}
html body.overlay.visual-enhanced .arena .field[data-v127-phase="2"] .boss-monster-body::before{
 background-image:url('/visual_assets/v127_boss_sigil_2.png')!important;
}
html body.overlay.visual-enhanced .arena .field[data-v127-phase="3"] .boss-monster-body::before{
 background-image:url('/visual_assets/v127_boss_sigil_3.png')!important;
}
html body.overlay.visual-enhanced .arena .field .boss-monster-body img,
html body.overlay.visual-enhanced .arena .field .boss-monster-body svg{
 position:relative!important;z-index:1!important;
}
/* Auras for the same two v112 tower sprites; health displays are not modified. */
html body.overlay.visual-enhanced .arena .field .towers .tower::before{
 content:''!important;position:absolute!important;left:-20%!important;bottom:-10%!important;
 width:140%!important;height:120%!important;z-index:0!important;
 background:url('/visual_assets/v127_tower_chat_aura.png') center bottom/contain no-repeat!important;
 pointer-events:none!important;opacity:.73!important;
}
html body.overlay.visual-enhanced .arena .field .towers .tower:last-child::before{
 background-image:url('/visual_assets/v127_tower_creator_aura.png')!important;
}
html body.overlay.visual-enhanced .arena .field .towers .tower.v127-critical::before{
 opacity:1!important;filter:brightness(1.4) saturate(1.5)!important;
}
html body.overlay.visual-enhanced .arena .field .towers .tower.v127-shield::before{
 background-image:url('/visual_assets/v127_shield_aura.png')!important;opacity:.86!important;
}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{z-index:1!important}
/* A single temporary compositor layer, triggered by battle events, no per-frame DOM allocation. */
html body.overlay.visual-enhanced .arena .field #v127flash{
 position:absolute!important;inset:0!important;z-index:8!important;pointer-events:none!important;
 opacity:0;background-size:min(62%,320px) auto!important;
 background-repeat:no-repeat!important;background-position:50% 50%!important;
 contain:paint!important;
}
html body.overlay.visual-enhanced .arena .field #v127flash.v127-impact-chat{
 background-image:url('/visual_assets/v127_impact_chat.png')!important;
 background-position:32% 67%!important;animation:v127CinematicPulse .67s ease-out both!important;
}
html body.overlay.visual-enhanced .arena .field #v127flash.v127-impact-creator{
 background-image:url('/visual_assets/v127_impact_creator.png')!important;
 background-position:68% 67%!important;animation:v127CinematicPulse .67s ease-out both!important;
}
html body.overlay.visual-enhanced .arena .field #v127flash.v127-shield{
 background-image:url('/visual_assets/v127_shield_aura.png')!important;
 background-position:65% 70%!important;animation:v127CinematicPulse 1s ease-out both!important;
}
html body.overlay.visual-enhanced .arena .field #v127flash.v127-victory{
 background-image:url('/visual_assets/v127_victory_burst.png')!important;
 background-position:50% 27%!important;background-size:min(85%,450px) auto!important;
 animation:v127VictoryPulse 1.35s ease-out both!important;
}
@keyframes v127CinematicPulse{0%{opacity:0;transform:scale(.88)}25%{opacity:.95}100%{opacity:0;transform:scale(1.15)}}
@keyframes v127VictoryPulse{0%{opacity:0;transform:scale(.78)}35%{opacity:1}100%{opacity:0;transform:scale(1.2)}}
@keyframes v127MistDrift{0%,100%{transform:translateX(-1.5%);opacity:.42}50%{transform:translateX(1.5%);opacity:.65}}
@keyframes v127SigilBreath{0%,100%{opacity:.55;transform:translate(-50%,-50%) scale(.96)}50%{opacity:.86;transform:translate(-50%,-50%) scale(1.06)}}
html body.overlay.v60-cinematografico.visual-enhanced .arena .field #v127depth::after{
 animation:v127MistDrift 11s ease-in-out infinite!important;
}
html body.overlay.v60-cinematografico.visual-enhanced .arena .field .boss-monster-body::before{
 animation:v127SigilBreath 3.6s ease-in-out infinite!important;
}
/* Balanced keeps static layered lighting, while Economico removes all additional passes. */
html body.overlay.v60-equilibrado.visual-enhanced .arena .field #v127depth{opacity:.33!important}
html body.overlay.v60-equilibrado.visual-enhanced .arena .field .boss-monster-body::before{opacity:.38!important}
html body.overlay.v60-equilibrado.visual-enhanced .arena .field .towers .tower::before{opacity:.39!important}
html body.overlay.v60-equilibrado.visual-enhanced .arena .header .side::after{opacity:.45!important}
html body.overlay.v60-economico .arena .field #v127depth,
html body.overlay.v60-economico .arena .field #v127flash{display:none!important}
html body.overlay.v60-economico .arena .header .side::after,
html body.overlay.v60-economico .arena .field .boss-monster-body::before,
html body.overlay.v60-economico .arena .field .towers .tower::before{display:none!important}
@media(prefers-reduced-motion:reduce){
 html body.overlay .arena .field #v127flash{display:none!important}
 html body.overlay .arena .field #v127depth::after,
 html body.overlay .arena .field .boss-monster-body::before{animation:none!important}
}
/* Mobile: glow and effects never cross into fixed present columns. */
@media(max-width:420px){
 html body.overlay.visual-enhanced .arena .field #v127flash{background-size:46% auto!important}
 html body.overlay.visual-enhanced .arena .field #v127flash.v127-victory{background-size:66% auto!important}
 html body.overlay.visual-enhanced .arena .field .towers .tower::before{width:122%!important;left:-11%!important}
}

/* LivePulse V12.9 — original independent sprite paintings, never a flattened HUD.
   Economy retains V11 art. Balanced/Cinematic use V12.9 animated assets. */
html body.overlay.visual-enhanced.v60-equilibrado .arena .field,
html body.overlay.visual-enhanced.v60-cinematografico .arena .field{
  background:linear-gradient(90deg,rgba(13,2,17,.19) 0%,transparent 33%,transparent 66%,rgba(3,12,33,.19) 100%),url('/visual_assets/v129_environment.png') center center/100% 100% no-repeat!important;
}
html body.overlay.visual-enhanced .arena .header .side{border-color:#fbb675bb!important;box-shadow:inset 0 0 14px #7f1b3980,0 0 13px #ff552b32!important}
html body.overlay.visual-enhanced .arena .header .side:last-child{box-shadow:inset 0 0 14px #0b86e580,0 0 13px #17b4ff48!important}
html body.overlay.visual-enhanced .arena .field #bossSprite{
  max-width:clamp(205px,64vw,350px)!important;
  height:clamp(120px,24dvh,238px)!important;
  filter:drop-shadow(0 0 12px rgba(226,60,121,.52))!important;
}
html body.overlay.visual-enhanced .arena .field .boss-monster-body img{object-position:50% 50%!important}
html body.overlay.visual-enhanced .arena .field #v127depth::after{
 background-image:url('/visual_assets/v129_foreground_mist.png')!important;
 opacity:.32!important;
}
html body.overlay.visual-enhanced.v60-cinematografico .arena .field #v127depth::after{opacity:.55!important}
html body.overlay.visual-enhanced .arena .header .side::before{
 width:clamp(57px,15vw,98px)!important;
 filter:drop-shadow(0 0 6px #ee643ba5)!important;
}
html body.overlay.visual-enhanced .arena .header .side:last-child::before{
 filter:drop-shadow(0 0 6px #51ccff8f)!important;
}
html body.overlay.visual-enhanced .arena .field .towers .tower::after{
 height:clamp(115px,33dvh,275px)!important;
 width:108%!important;left:-4%!important;
 filter:drop-shadow(0 0 9px #fc682e73)!important;
}
html body.overlay.visual-enhanced .arena .field .towers .tower:last-child::after{
 filter:drop-shadow(0 0 9px #18b9ff7d)!important;
}
html body.overlay .arena .field .gifts{z-index:22!important}
html body.overlay .arena .field #bossMonster{z-index:19!important}
@media(max-width:420px){
 html body.overlay.visual-enhanced .arena .field #bossSprite{
   max-width:clamp(175px,58vw,265px)!important;height:clamp(100px,19dvh,174px)!important;
 }
 html body.overlay.visual-enhanced .arena .field .towers .tower::after{height:clamp(106px,25dvh,190px)!important}
}
@media(prefers-reduced-motion:reduce){
 html body.overlay.visual-enhanced .arena .field #v127depth::after{animation:none!important}
}
/* V12.9.2 · EVENT-DRIVEN CINEMATIC MOTION: sprite layers are independent from HUD. */
html body.overlay .arena .field #bossMonster .boss-monster-body{
 position:relative!important;overflow:visible!important;isolation:isolate!important;
}
html body.overlay .arena .field #bossMonster #bossSprite{position:relative!important;z-index:1!important}
html body.overlay .arena .field #v1292WingRig,
html body.overlay .arena .field #v1292Portal{
 position:absolute;top:0;left:50%;width:100%;height:100%;
 transform:translateX(-50%);pointer-events:none;z-index:2;
}
html body.overlay .arena .field #v1292Portal{
 z-index:0;background:url('/visual_assets/v1292_phase_1.png') center/contain no-repeat;
 opacity:0;will-change:opacity,transform;
}
html body.overlay .arena .field #v1292Portal.v1292-phase-shift{
 animation:v1292PhaseShift 1.45s ease-out 1 both!important;
}
html body.overlay .arena .field #v1292WingRig img{
 position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;
 will-change:transform;filter:drop-shadow(0 0 5px #ef6e9a8a);
}
html body.overlay .arena .field #v1292WingLeft{
 transform-origin:67% 41%;animation:v1292WingLeft 2.55s ease-in-out infinite alternate;
}
html body.overlay .arena .field #v1292WingRight{
 transform-origin:33% 41%;animation:v1292WingRight 2.55s ease-in-out infinite alternate;
}
html body.overlay.v60-cinematografico .arena .field #v1292WingRig{opacity:.83}
html body.overlay.v60-equilibrado .arena .field #v1292WingRig{opacity:.48}
html body.overlay.v60-equilibrado .arena .field #v1292WingRig img{animation-duration:3.7s!important}
html body.overlay .arena .field #bossMonster.v1292-attacking #v1292WingLeft{
 animation:v1292WingStrikeLeft .46s ease-out 1 both!important;
}
html body.overlay .arena .field #bossMonster.v1292-attacking #v1292WingRight{
 animation:v1292WingStrikeRight .46s ease-out 1 both!important;
}
html body.overlay .arena .field #bossMonster.v1292-defeated #v1292WingRig{
 animation:v1292WingFall 1.25s ease-in both!important;
}
@keyframes v1292WingLeft{
 from{transform:rotate(-6deg) scaleX(.96)}to{transform:rotate(7deg) scaleX(1.025)}
}
@keyframes v1292WingRight{
 from{transform:rotate(6deg) scaleX(.96)}to{transform:rotate(-7deg) scaleX(1.025)}
}
@keyframes v1292WingStrikeLeft{
 0%{transform:rotate(-4deg)}55%{transform:rotate(19deg) scale(1.025)}100%{transform:rotate(0)}
}
@keyframes v1292WingStrikeRight{
 0%{transform:rotate(4deg)}55%{transform:rotate(-19deg) scale(1.025)}100%{transform:rotate(0)}
}
@keyframes v1292WingFall{0%{opacity:1;transform:none}100%{opacity:0;transform:translateY(12px) scale(.92)}}
@keyframes v1292PhaseShift{0%{opacity:0;transform:translateX(-50%) scale(.42) rotate(-35deg)}40%{opacity:.92}100%{opacity:0;transform:translateX(-50%) scale(1.4) rotate(72deg)}}
html body.overlay .arena .field #v1292AttackFx{
 position:absolute;left:17%;top:35%;width:66%;height:32%;z-index:24;
 pointer-events:none;opacity:0;background-position:center;background-repeat:no-repeat;
 background-size:contain;will-change:transform,opacity;
}
html body.overlay .arena .field #v1292AttackFx.v1292-fire-chat{
 background-image:url('/visual_assets/v1292_attack_chat.png');animation:v1292BeamChat .57s ease-out 1 both!important;
}
html body.overlay .arena .field #v1292AttackFx.v1292-fire-creator{
 background-image:url('/visual_assets/v1292_attack_creator.png');animation:v1292BeamCreator .57s ease-out 1 both!important;
}
@keyframes v1292BeamChat{0%{opacity:0;transform:translate(-20%,22%) scale(.62)}24%{opacity:.94}100%{opacity:0;transform:translate(18%,-10%) scale(1.1)}}
@keyframes v1292BeamCreator{0%{opacity:0;transform:translate(20%,22%) scaleX(-.62) scaleY(.62)}24%{opacity:.94}100%{opacity:0;transform:translate(-18%,-10%) scaleX(-1.1) scaleY(1.1)}}
html body.overlay .arena .field .tower{overflow:visible!important}
html body.overlay .arena .field .tower .v1292-debris{
 position:absolute;inset:-18% -20%;z-index:5;pointer-events:none;opacity:0;
 background-size:contain;background-position:center;background-repeat:no-repeat;
}
html body.overlay .arena .field .tower:nth-last-child(2) .v1292-debris{
 background-image:url('/visual_assets/v1292_debris_chat.png');
}
html body.overlay .arena .field .tower:last-child .v1292-debris{
 background-image:url('/visual_assets/v1292_debris_creator.png');
}
html body.overlay .arena .field .tower.v1292-crumble .v1292-debris{
 animation:v1292DebrisBurst 1.45s ease-out 1 both!important;
}
html body.overlay .arena .field .tower.v1292-crumble::after{
 animation:v1292TowerFalling 1.35s ease-in-out 1 both!important;
}
@keyframes v1292DebrisBurst{0%{opacity:0;transform:scale(.28) translateY(0)}25%{opacity:.95}100%{opacity:0;transform:scale(1.5) translateY(-35%)}}
@keyframes v1292TowerFalling{0%{transform:rotate(0) translateY(0)}35%{transform:rotate(-6deg) translateY(-4px)}100%{transform:rotate(8deg) translateY(9px);opacity:.15}}
html body.overlay .arena .header .side.v1292-dragon-lunge::before{
 animation:v1292DragonLunge .5s ease-out 1 both!important;
}
@keyframes v1292DragonLunge{0%{transform:scale(1)}55%{transform:scale(1.13) translateY(-4px)}100%{transform:scale(1)}}
html body.overlay.v60-economico .arena .field #v1292WingRig,
html body.overlay.v60-economico .arena .field #v1292Portal,
html body.overlay.v60-economico .arena .field #v1292AttackFx,
html body.overlay.v60-economico .arena .field .v1292-debris {display:none!important}
html body.overlay.v1292-tab-hidden .arena .field #v1292WingRig img{animation-play-state:paused!important}
@media(prefers-reduced-motion:reduce){
 html body.overlay .arena .field #v1292WingRig,
 html body.overlay .arena .field #v1292Portal,
 html body.overlay .arena .field #v1292AttackFx,
 html body.overlay .arena .field .v1292-debris{display:none!important}
 html body.overlay .arena .field .tower.v1292-crumble::after{animation:none!important}
}
/* V12.9.1 — Android safe-layout refinement. Only mobile presentation changes:
   every score, boss phase, icon and animated sprite is still live DOM state. */
@media (max-width: 620px) {
 html body.overlay .arena .field {
  grid-template-columns:clamp(62px,18vw,82px) minmax(0,1fr) clamp(62px,18vw,82px)!important;
  column-gap:0!important;overflow:hidden!important;isolation:isolate!important;
 }
 html body.overlay .arena .field #gchat,
 html body.overlay .arena .field #gcreator {
  padding:4px 2px!important;gap:3px!important;overflow:hidden!important;
  contain:layout!important;
 }
 html body.overlay .arena .field #gchat .gift,
 html body.overlay .arena .field #gcreator .gift {
  padding:2px 1px!important;gap:2px!important;
  background:linear-gradient(180deg,#2a0e2cbb,#100b20d8)!important;
  border-color:#ee61714f!important;border-radius:6px!important;
 }
 html body.overlay .arena .field #gcreator .gift {
  background:linear-gradient(180deg,#102b46bb,#091324df)!important;
  border-color:#5fbdf65e!important;
 }
 html body.overlay .arena .field .gifts .gift img {
  width:clamp(23px,6.5vw,32px)!important;
  height:clamp(21px,3.7dvh,33px)!important;
  max-height:42%!important;object-fit:contain!important;
 }
 html body.overlay .arena .field .gifts .gift div {
  font-size:clamp(9px,2.5vw,10.5px)!important;line-height:1.12!important;
  max-height:2.25em!important;overflow-wrap:anywhere!important;
 }
 html body.overlay .arena .field .gifts .gift b {
  font-size:clamp(10px,2.8vw,12px)!important;line-height:1.02!important;
 }
 html body.overlay .arena .field #bossMonster {
  left:50%!important;right:auto!important;transform:translateX(-50%)!important;
  width:60%!important;max-width:300px!important;min-width:0!important;
  top:2%!important;overflow:visible!important;
 }
 html body.overlay.visual-enhanced .arena .field #bossSprite {
  display:block!important;width:100%!important;max-width:100%!important;
  height:clamp(118px,19dvh,190px)!important;object-fit:contain!important;
  object-position:50% 50%!important;
 }
 html body.overlay .arena .field #bossSprite[hidden]{display:none!important}
 html body.overlay .arena .field .boss-monster-title {
  width:100%!important;max-width:100%!important;box-sizing:border-box!important;
  font-size:clamp(11px,3.1vw,15px)!important;line-height:1.14!important;
  white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
 }
 html body.overlay .arena .field #v57hp,
 html body.overlay .arena .field #v58bossNext {
  font-size:clamp(10px,2.85vw,12px)!important;line-height:1.2!important;
  max-width:100%!important;box-sizing:border-box!important;
 }
 html body.overlay .arena .field .towers {
  grid-column:2!important;grid-row:1!important;
  padding-left:4px!important;padding-right:4px!important;gap:4px!important;
  overflow:visible!important;
 }
 html body.overlay .arena .field .towers .tower{
  flex:1 1 0!important;max-width:49%!important;min-width:0!important;
 }
 html body.overlay.visual-enhanced .arena .field .towers .tower::after {
  width:104%!important;left:-2%!important;
  height:clamp(113px,25dvh,195px)!important;
  background-size:contain!important;background-position:center bottom!important;
 }
 html body.overlay .arena .header .side::before {
  width:clamp(61px,18vw,84px)!important;max-width:47%!important;
  background-size:contain!important;
 }
 /* Gift notifications use the empty belt between boss HP and tower crowns,
    not the gift rails or the tower faces. */
 html body.overlay .arena .field .v52gift,
 html body.overlay.visual-enhanced .arena .field .v52gift {
  top:44%!important;bottom:auto!important;
  width:clamp(52px,17%,76px)!important;max-width:76px!important;
  max-height:11%!important;overflow:hidden!important;
  pointer-events:none!important;z-index:31!important;
 }
 html body.overlay .arena .field .v52gift.chat,
 html body.overlay.visual-enhanced .arena .field .v52gift.chat {
  left:26%!important;right:auto!important;
 }
 html body.overlay .arena .field .v52gift.creator,
 html body.overlay.visual-enhanced .arena .field .v52gift.creator {
  left:auto!important;right:26%!important;
 }
 html body.overlay .arena .field .v52gift .v52box {
  max-height:100%!important;min-height:0!important;
  padding:2px!important;box-shadow:0 2px 9px #000b!important;
 }
 html body.overlay .arena .field .v52gift img {
  width:clamp(20px,5vw,29px)!important;height:clamp(20px,5vw,29px)!important;
 }
 html body.overlay .arena .field .v52gift .v52name,
 html body.overlay .arena .field .v52gift .v52user{
  font-size:clamp(8px,2.15vw,10px)!important;line-height:1.1!important;
 }
 html body.overlay .arena .v71footer .v71tile small {
  font-size:clamp(8px,2.4vw,10px)!important;
 }
 html body.overlay .arena .v71footer .v71tile span {
  font-size:clamp(9px,2.55vw,12px)!important;
 }
}
@media(max-width:370px), (max-height:700px) {
 html body.overlay.visual-enhanced .arena .field #bossSprite{
  height:clamp(102px,17.5dvh,155px)!important;
 }
 html body.overlay .arena .field .v52gift{
  top:43%!important;max-height:10%!important;
 }
 html body.overlay .arena .field .gifts .gift img{
  height:clamp(18px,3.1dvh,28px)!important;
 }
}
@media(prefers-reduced-motion:reduce){
 html body.overlay .arena .field .v52gift {transition:none!important}
}

/* V12.9.3 premium art: lightweight browser-only finishing, no extra render loop. */
html body.overlay.visual-enhanced.v60-cinematografico .arena .field #bossSprite {filter:drop-shadow(0 2px 8px rgba(255,57,126,.48)) drop-shadow(0 0 5px rgba(255,191,93,.34));}
html body.overlay.visual-enhanced.v60-cinematografico .arena .field .towers .tower {filter:drop-shadow(0 5px 6px rgba(0,0,0,.48));}
@media(prefers-reduced-motion:reduce){html body.overlay .arena .field #bossSprite,html body.overlay .arena .field .towers .tower{filter:none!important}}
</style>
<section id="v124dashboard" class="v124-console" hidden aria-label="Central administrativa LivePulse">
 <header class="v124-top"><div><h1>♛ LivePulse • Central de Comando</h1><p>V12.9.4 · Economia Segura e Batalha Interativa</p></div><div class="v124-links"><a href="/overlay?v=1294" target="_blank" rel="noopener">📺 Arena</a><a href="/">⚙️ Painel clássico</a><button id="v124-login" class="v124-primary" type="button">🔐 Desbloquear</button></div></header>
 <div class="v124-status" aria-live="polite"><span id="v124-auth" class="v124-tag" data-kind="bad">🔒 Controles bloqueados</span><span id="v124-mode" class="v124-tag">Modo: verificando...</span><span id="v124-conn" class="v124-tag">TikTok: ...</span><span id="v125-live" class="v124-tag">TikTok V12.5 • aguardando</span><span id="v124-updated" class="v124-tag">Aguardando servidor</span></div>
 <div class="v124-grid" aria-label="Placar e estado"><div class="v124-card v124-chat"><span class="k">🔴 CHAT</span><strong id="v124-chat-score">—</strong><span id="v124-chat-extra" class="v124-sub">Vitórias: —</span><div class="v124-progress"><span id="v124-chat-progress"></span></div></div><div class="v124-card v124-creator"><span class="k">🔵 CRIADOR</span><strong id="v124-creator-score">—</strong><span id="v124-creator-extra" class="v124-sub">Vitórias: —</span><div class="v124-progress"><span id="v124-creator-progress"></span></div></div><div class="v124-card"><span class="k">⏱ Tempo da rodada</span><strong id="v124-clock">--:--</strong><span class="v124-sub" id="v124-round">Rodada —</span></div><div class="v124-card"><span class="k">🎮 Situação</span><strong id="v124-phase" style="font-size:19px">—</strong><span class="v124-sub" id="v124-boss">Chefão: —</span></div></div>
 <section class="v124-panel"><div class="v124-line"><h2>🎮 Comandos de batalha</h2><small>Autenticação obrigatória para executar ações</small></div><div class="v124-btns"><button type="button" data-v124-action="pause" disabled>⏸ Pausar / Retomar</button><button type="button" data-v124-action="start" class="v124-primary" disabled>▶️ Iniciar / Retomar</button><button type="button" data-v124-action="finish" class="v124-danger" disabled>🏁 Encerrar rodada</button><button type="button" data-v124-action="boss" disabled>👹 Iniciar chefão</button><button type="button" data-v124-action="shieldChat" disabled>🛡️ Escudo CHAT</button><button type="button" data-v124-action="shieldCreator" disabled>🛡️ Escudo CRIADOR</button><button type="button" data-v124-action="mission" disabled>🎯 Missão CHAT</button><button type="button" data-v124-action="missionCreator" disabled>🎯 Missão CRIADOR</button><button type="button" data-v124-action="surprise" disabled>⚡ Pontos em dobro</button><button type="button" data-v124-action="bossPhase" disabled>👹 Próxima fase</button><button type="button" data-v124-action="bossHide" class="v124-caution" disabled>✖ Remover chefão</button><button type="button" id="v124-reload">🔄 Atualizar dados</button></div><div id="v124-command-msg" class="v124-msg" role="status"></div></section>
 <section class="v124-panel"><h2>🎬 Qualidade visual da arena</h2><div class="v124-btns v124-three"><button type="button" data-v124-action="visualEconomico" disabled>🔋 Econômico</button><button type="button" data-v124-action="visualEquilibrado" disabled>⚖️ Equilibrado</button><button type="button" data-v124-action="visualCinematografico" disabled>✨ Cinematográfico</button></div><p class="v124-msg" id="v124-visual-msg">Perfil atual: aguardando...</p></section>
 <section class="v124-panel"><h2>🩺 Diagnóstico do servidor</h2><div class="v124-info"><div><small>Servidor</small><b id="v124-server">Aguardando</b></div><div><small>Memória RAM</small><b id="v124-memory">—</b></div><div><small>Tempo online</small><b id="v124-uptime">—</b></div><div><small>Conexões da arena</small><b id="v124-sse">—</b></div><div><small>Heap JS</small><b id="v124-heap">—</b></div><div><small>Modo de execução</small><b id="v124-runtime">—</b></div><div><small>Torre CHAT</small><b id="v124-tower-chat">—</b></div><div><small>Torre CRIADOR</small><b id="v124-tower-creator">—</b></div></div><small>Histórico local de amostras de RAM (últimas 30 leituras):</small><div id="v124-memory-chart" class="v124-history" aria-label="Histórico do uso de memória"></div><div class="v124-secondary"><button type="button" id="v124-export">📋 Exportar diagnóstico JSON</button><button type="button" id="v124-lock" class="v124-ghost">🔒 Bloquear painel</button></div></section>
 <section class="v124-panel"><h2>📝 Histórico recente de eventos</h2><ul id="v124-logs" class="v124-logs"><li>Desbloqueie o painel para exibir eventos.</li></ul></section>
 <section class="v124-panel"><details><summary>⚙️ Configurações rápidas (abrir)</summary><p><small>Salvar alterações reinicia a rodada. As demais configurações e os 14 presentes são preservados.</small></p><div class="v124-settings"><label>Meta de pontos<input type="number" id="v124-goal" min="20" max="100000" required></label><label>Duração (segundos)<input type="number" id="v124-duration" min="20" max="3600" required></label><label>Pontos iniciais<input type="number" id="v124-start" min="0" required></label><label>Velocidade bots (ms)<input type="number" id="v124-botSpeed" min="300" max="20000" required></label></div><div class="v124-secondary"><button type="button" id="v124-config-save" class="v124-caution" disabled>💾 Salvar e reiniciar rodada</button><a href="/">Configurações completas no painel clássico</a></div><div id="v124-config-msg" class="v124-msg" role="status"></div></details></section>
 <div class="v124-footer">LivePulse 12.9.4 • Painel restrito ao dispositivo local • Não é necessário iniciar uma LIVE do TikTok para testar.</div>
</section>
<div class="arena"><div class="v71brand"><span>♛ LivePulse ♛</span><small>⚔ BATALHA DE INTERAÇÃO • ARENA VIVA ⚔</small></div><div class="header"><div class="side red">CHAT<div class="score" id="chat">120</div><small id="wc">VITÓRIAS 0</small></div><div class="vs">VS</div><div class="side blue">CRIADOR<div class="score" id="creator">120</div><small id="wr">VITÓRIAS 0</small></div></div><div class="meta">🏁 META <span id="goal">500</span> • <span id="clock">03:00</span> • RODADA <span id="round">1</span> <span id="v70next" hidden></span></div><div class="field"><div class="v71scenery" aria-hidden="true"></div><div id="v127depth" aria-hidden="true"></div><div id="v127flash" aria-hidden="true"></div><div id="v119lighting" aria-hidden="true"></div><div id="v119portal" aria-hidden="true"></div><div class="v10-aura" aria-hidden="true"></div><div class="fx" id="fx"></div><div id="v1292AttackFx" aria-hidden="true"></div><div class="v59-fx-layer" id="v59Fx" aria-hidden="true"></div><div class="v60fx" id="v60Fx" aria-hidden="true"></div><div class="boss-monster" id="bossMonster" aria-label="Chefão da arena" hidden><div class="boss-monster-body"><div id="v1292Portal" aria-hidden="true"></div><img id="bossSprite" src="/visual_assets/boss_phase1.png" alt="Monstro chefão" onerror="this.hidden=true;this.nextElementSibling.style.display='block'"><svg viewBox="0 0 160 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Monstro com chifres e olhos brilhantes"><path class="boss-horn" d="M32 55 Q8 33 17 5 Q45 17 53 43 M108 43 Q125 12 146 5 Q152 34 128 56" fill="#7255a6" stroke="#1b1135" stroke-width="6"/><path class="boss-face" d="M22 58 Q29 23 80 27 Q133 24 140 63 L134 115 Q81 148 26 113Z" fill="#6b38a4" stroke="#211335" stroke-width="7"/><path d="M37 71 L67 78 L53 88Z M123 71 L93 78 L107 88Z" fill="#ffdf50"/><path d="M51 108 Q81 123 110 108 L98 127 L88 115 L80 128 L69 115 L60 126Z" fill="#140d23" stroke="#2a1238" stroke-width="3"/><circle cx="48" cy="79" r="3" fill="#fff"/><circle cx="112" cy="79" r="3" fill="#fff"/></svg><div id="v1292WingRig" aria-hidden="true"><img id="v1292WingLeft" alt="" decoding="async"><img id="v1292WingRight" alt="" decoding="async"></div></div><div class="boss-monster-title">👹 CHEFÃO <span id="bossMonsterPhase">FASE 1</span></div><div class="boss-monster-health"><span id="bossMonsterHp"></span></div><div class="v57hp" id="v57hp">450 / 450 HP</div><div class="v58boss-next" id="v58bossNext" hidden>⚡ ATAQUE EM 10s</div></div><div class="v52gift chat" id="v52chat"><div class="v52box"><img alt="Presente CHAT"><div class="v52emoji" hidden>🎁</div><div class="v52name"></div><div class="v52user"></div></div></div><div class="v52gift creator" id="v52creator"><div class="v52box"><img alt="Presente CRIADOR"><div class="v52emoji" hidden>🎁</div><div class="v52name"></div><div class="v52user"></div></div></div><div class="gifts" id="gchat"></div><div class="towers"><div class="city"></div><div class="v57towerhp chat" id="v57chat" hidden>🛡️ CHAT 300/300</div><div class="v57towerhp creator" id="v57creator" hidden>🛡️ CRIADOR 300/300</div><div class="tower"><div class="stack" id="tchat" style="--color:#d93653;--top:#ff9aa7"></div><div class="v1292-debris" aria-hidden="true"></div></div><div class="tower"><div class="stack" id="tcreator" style="--color:#1573d4;--top:#6bd8ff"></div><div class="v1292-debris" aria-hidden="true"></div></div></div><div class="gifts" id="gcreator"></div></div><div class="v71footer"><div class="v71tile"><small>🎁 ÚLTIMO EVENTO</small><span id="v71event">Aguardando...</span></div><div class="v71tile"><small>👑 MAIOR APOIADOR</small><span id="v71mvp">—</span></div><div class="v71tile"><small>👹 PRÓXIMO BOSS</small><span id="v71boss">—</span></div></div><div class="status" id="status">Aguardando jogadores...</div><div class="controls"><button id="activate">🔊 Ativar narrador</button></div><div class="v561panel" style="position:relative;margin:8px 14px;padding:8px;background:#0008;border-radius:10px"><label><input id="visualEnhanced" type="checkbox"> 🎨 Visual aprimorado (experimental)</label><small style="display:block;opacity:.7">Ative para ver cenário e torres ilustradas. Desative para voltar ao original.</small></div><div class="v55panel"><details><summary>🏆 V5.5 — Arena Avançada</summary><p id="v55status">Carregando...</p><button type="button" data-v55="bossPhase">👹 Próxima fase do chefão</button><button type="button" data-v55="bossHide">✖ Remover monstro</button><button type="button" data-v55="shieldChat">🛡️ Escudo CHAT</button><button type="button" data-v55="shieldCreator">🛡️ Escudo CRIADOR</button><button type="button" data-v55="combatTestHit">🧪 Testar dano (DEMO)</button><button type="button" data-v55="combatTestAttack">🔥 Testar ataque visual (DEMO)</button><button type="button" data-v55="combatTestShield">🛡️ Testar escudo visual (DEMO)</button><p id="v58stats"></p><div class="v60-settings"><label>🎬 Efeitos visuais: <select id="v60mode"><option value="economico">Econômico</option><option value="equilibrado">Equilibrado</option><option value="cinematografico">Cinematográfico</option></select></label><button type="button" data-v55="visualTest">🧪 Testar ataque visual</button><button type="button" data-v55="visualTestVictory">🏆 Testar vitória</button><small id="v60health">Efeitos independentes do placar</small><small class="v116-performance" id="v116perf">Economia máxima • ~1 quadro/s</small></div><button type="button" data-v55="skillChat">🔴 Habilidade CHAT</button><button type="button" data-v55="skillCreator">🔵 Habilidade CRIADOR</button><button type="button" data-v55="raffleDraw">🎟️ Sortear participantes</button><p>Para entrar no sorteio gratuito, digite <b>!sorteio</b> no chat.</p><label>Tema: <select id="v55theme"><option value="original">Original</option><option value="neon">Neon</option><option value="gold">Dourado</option></select></label><label>Voz: <select id="v55voice"><option value="">Padrão</option></select></label><label>Velocidade: <input id="v55speed" type="range" min="75" max="125" value="100"></label><label>Expressão: <input id="v55pitch" type="range" min="80" max="125" value="100"></label><p id="v55message"></p></details></div>
<div class="v54panel"><details><summary>👑 Comunidade V5.4 — Painel</summary><p id="v54top">Carregando apoiadores...</p><p id="v54poll"></p><button type="button" id="v54pollstart">🗳️ Iniciar votação (60s)</button><button type="button" id="v54pollend">Encerrar votação</button><p><a href="/report.csv" onclick="return v128Export(event,'csv')">📊 Exportar relatório CSV</a> · <a href="/diagnostics" onclick="return v128Export(event,'json')">🛡️ Diagnóstico</a></p><p id="v54msg"></p></details></div>
<div class="v53panel"><details><summary>🎙️ Retenção V5.3 — Voz e histórico</summary><label>Volume do narrador <input id="v53volume" type="range" min="0" max="100" value="85"></label><label>Frequência <select id="v53freq"><option value="normal">Normal</option><option value="quiet">Discreta</option></select></label><p id="v53history"></p><p id="v53heroes"></p></details></div>
<div class="overlay-link"><a href="/overlay" style="color:#aee7ff">📺 Abrir modo transmissão</a> · <a href="/painel" style="color:#ffe29a">🛠️ Central V12.4</a></div><div class="v51panel"><details><summary>📊 Arena Inteligente — Estatísticas e desafios</summary><p id="v51stats">Carregando...</p><p id="v51goals"></p><p id="v51duel"></p><p id="v51top"></p><button id="v51startDuel">⚔️ Iniciar desafio entre os dois líderes</button><p id="v51msg"></p></details></div><div class="admin-v49" id="admin49"><details><summary>🎮 Arena Suprema — Controle</summary><div class="adminbuttons"><button data-action="pause">⏸ Pausar/Retomar</button><button data-action="start">▶ Iniciar</button><button data-action="finish">🏁 Encerrar rodada</button><button data-action="boss">👑 Chefão</button><button data-action="mission">🎯 Missão CHAT</button><button data-action="missionCreator">🎯 Missão CRIADOR</button><button data-action="surprise">⚡ Pontos em dobro</button></div><div id="adminMsg"></div><h4>🏅 Rodada</h4><ol id="roundSupport"></ol><h4>🏆 Campeonato</h4><ol id="champSupport"></ol><h4>🛡️ Conexão e eventos</h4><div id="conn49"></div><ol id="logs49"></ol></details></div><div class="settings"><details><summary>⚙️ Configurações</summary><div id="fields"></div><button id="save">Salvar e reiniciar rodada</button><div id="saveStatus"></div></details></div><div class="hint">Grátis: !chat ou !criador para escolher o time; curtidas e compartilhamentos ajudam após votar • Presentes: efeitos especiais</div><div class="rank"><h3>🏆 Ranking</h3><ol id="rank"></ol><h4>🎁 Apoiadores</h4><ol id="support"></ol><h4>💬 Mais ativos</h4><ol id="activity"></ol><h4>🏁 Histórico</h4><ol id="history"></ol></div></div><script>
const gifts=${JSON.stringify(names)},giftsB=${JSON.stringify(namesB)},effects=${JSON.stringify(effects)};
for(const [side,arr] of [['chat',gifts],['creator',giftsB]]){document.getElementById('g'+side).setAttribute('aria-label',side==='chat'?'Sete presentes do CHAT':'Sete presentes do CRIADOR');document.getElementById('g'+side).innerHTML=arr.map((n,i)=>{const sprite=side==='creator'&&i>=5?i+1:i;const points=side==='creator'?[1,10,30,20,25,50,100][i]:[1,10,30,20,25,50,100][i];return '<div class="gift"><img src="/assets/'+side+sprite+'.png" alt="'+n+'"><div>'+n+'</div><b>'+(points>0?'+':'')+points+'</b></div>'}).join('')}
if(location.pathname==='/overlay')document.body.classList.add('overlay');
if(location.pathname==='/painel'){document.body.classList.add('v124-admin-page');document.getElementById('v124dashboard').hidden=false;}
if(location.pathname==='/overlay'){document.querySelectorAll('#gchat .gift,#gcreator .gift').forEach(el=>{el.style.setProperty('border','0','important');el.style.setProperty('background','transparent','important');el.style.setProperty('box-shadow','none','important')})}
let active=false,queue=[],talking=false,audio=null,previous=null,currentConfig={goal:500,sound:true};let lastNarration=0;
const phrases={gift:['Muito obrigado, {u}, pelo presente {g}!','Gratidão, {u}! Recebemos {g}!','Que carinho, {u}! Valeu pelo presente {g}!'],round:['Rodada encerrada! Vitória do time {t}!','Que disputa! O time {t} venceu a rodada!'],welcome:['Seja bem-vindo, {u}! Aproveita para seguir o perfil e deixar seu coraçãozinho!','Olha quem chegou! {u}, seja muito bem-vindo! Segue o criador e deixa aquela curtida!','Que bom ter você aqui, {u}! Curte a live e acompanha nossa batalha!'],follow:['Obrigado por seguir, {u}! Você faz parte da nossa tropa!','Novo seguidor! Valeu demais, {u}!'],share:['Muito obrigado, {u}, por compartilhar a nossa live!','{u} compartilhou a live! Gratidão pela força!'],like:['Valeu pelas curtidas, {u}!','Obrigado pelos corações, {u}!']};
const pick=(type,u,g)=>phrases[type][Math.floor(Math.random()*phrases[type].length)].replaceAll('{u}',u).replaceAll('{g}',g||'').replaceAll('{t}',g||'');
// Fila priorizada com limite de tamanho; nenhum navegador consegue narrar milhares de curtidas individualmente.
const voiceQueue=[];let voiceBusy=false,voiceCurrentPriority=0;const spokenWelcome=new Map();let finalCountdown=-1;
function emotional(text,priority=3,kind='normal'){if(!active)return;const before=kind==='epic'?'Atenção, tropa! ':kind==='warm'?'Que alegria! ':'';speak(before+text,priority)}

let lpEffectCount=0,lpLastEffect=0;
function lpVisualEnabled(){return document.body.classList.contains('visual-enhanced')}
function lpAnimate(kind,team){
 if(!lpVisualEnabled()||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const now=Date.now();if(now-lpLastEffect<240)return;lpLastEffect=now;
 const towers=document.querySelectorAll('.towers .tower');
 const index=team==='creator'?1:0;
 const tower=towers[index];
 const boss=document.getElementById('bossMonster');
 if(kind==='boss'&&boss&&!boss.hidden){boss.classList.remove('boss-hit');void boss.offsetWidth;boss.classList.add('boss-hit');setTimeout(()=>boss.classList.remove('boss-hit'),460)}
 if(tower){const cls=kind==='skill'?'skill-cast':'damage-hit';tower.classList.remove(cls);void tower.offsetWidth;tower.classList.add(cls);setTimeout(()=>tower.classList.remove(cls),650)}
 if(lpEffectCount>=3)return;
 const fx=document.getElementById('fx');if(!fx)return;
 const el=document.createElement('div');el.className='lp-battle-effect '+(team==='creator'?'creator':'chat');
 el.textContent=kind==='skill'?'⚡':kind==='boss'?'💥':'✦';fx.appendChild(el);lpEffectCount++;
 setTimeout(()=>{el.remove();lpEffectCount=Math.max(0,lpEffectCount-1)},700);
}
function lpShowMedal(d){
 if(!lpVisualEnabled()||!d)return;
 const medal=String(d.medal||'');const title=String(d.title||'');
 const image=title==='Rei da Arena'?'badge_king':title==='Lenda'?'badge_legend':title==='MVP'?'badge_mvp':'badge_hero';
 const field=document.querySelector('.field');if(!field)return;
 const toast=document.createElement('div');toast.className='lp-medal-toast';
 const img=document.createElement('img');img.src='/visual_assets/'+image+'.png';img.alt='';
 const label=document.createElement('span');label.textContent=String(d.user||'Apoiador')+' • '+medal;
 toast.append(img,label);field.appendChild(toast);setTimeout(()=>toast.remove(),3700);
}

function showBossMonster(stage,active=true){const el=document.getElementById('bossMonster');if(!el)return;el.hidden=!active;if(!active)return;const n=Math.max(1,Math.min(3,Number(stage)||1));const sprite=document.getElementById('bossSprite');if(sprite){if(sprite.dataset.v70Phase!==String(n)){sprite.dataset.v70Phase=String(n);window.v111BossSummonUntil=Date.now()+2200;v1292StageTransition(n);sprite.src='/visual_assets/'+(v60mode==='economico'?'v111_boss_':'v129_boss_')+n+'_summon_0.png'}sprite.hidden=false;sprite.nextElementSibling.style.display='none'}el.classList.remove('phase2','phase3');if(n>1)el.classList.add('phase'+n);document.getElementById('bossMonsterPhase').textContent='FASE '+n;document.getElementById('bossMonsterHp').style.width=(n===1?'100%':n===2?'66%':'33%')}
let v58NextAttack=0,v58BossActive=false;


let v60mode='equilibrado',v60faults=0,v60last=0;
// V11.6: limit active sprite cadence, avoid animation while backgrounded, and bound cache warmup.
const v116Perf={ticks:0,skipped:0,cache:new Map(),maxCache:12,lastWorkMs:0,slowUntil:0,adaptiveSlowFrames:0};
function v116Interval(){
 const basic=v60mode==='cinematografico'?180:v60mode==='equilibrado'?330:900;
 return Math.round(basic*(Date.now()<v116Perf.slowUntil?1.55:1));
}
window.v126Perf=v116Perf;
function v116Warm(url){
 if(document.hidden||v60mode==='economico'||!url||v116Perf.cache.has(url))return;
 const img=new Image();img.decoding='async';img.src=url;v116Perf.cache.set(url,img);
 while(v116Perf.cache.size>v116Perf.maxCache){const key=v116Perf.cache.keys().next().value;const expired=v116Perf.cache.get(key);if(expired){expired.onload=null;expired.onerror=null}v116Perf.cache.delete(key)}
}

function v60setMode(mode){
 const valid=['economico','equilibrado','cinematografico'];v60mode=valid.includes(mode)?mode:'economico';
 document.body.classList.remove('v60-economico','v60-equilibrado','v60-cinematografico');document.body.classList.add('v60-'+v60mode);
 const select=document.getElementById('v60mode');if(select)select.value=v60mode;window.v116LastFrame=0;
 const layer=document.getElementById('v60Fx');if(layer){layer.hidden=v60mode==='economico';if(layer.hidden)layer.replaceChildren()}
 if(v60mode==='economico'){v116Perf.cache.clear();const fx=document.getElementById('v115fx');if(fx)fx.replaceChildren();v115Effects.active=0;}
 const perf=document.getElementById('v116perf');if(perf)perf.textContent=v60mode==='economico'?'Economia máxima • ~1 quadro/s':v60mode==='equilibrado'?'Fluidez equilibrada • ~2 quadros/s':'Cinematográfico • ~4 quadros/s';
}
function v60safe(type,detail){
 if(v60mode==='economico'||!detail||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 try{v60draw(type,detail);v60faults=0}catch(err){console.warn('Arena Viva: efeito desativado',err);if(++v60faults>=2){v60setMode('economico');const h=document.getElementById('v60health');if(h)h.textContent='Modo Econômico ativado por segurança'}}
}
function v60draw(type,detail){
 const layer=document.getElementById('v60Fx');if(!layer)return;
 const now=Date.now();if(type!=='victory'&&now-v60last<260)return;v60last=now;
 if(layer.childElementCount>5)return;
 const add=(cls,ms)=>{const el=document.createElement('div');el.className=cls;layer.appendChild(el);setTimeout(()=>el.remove(),ms);return el};
 const team=detail.team==='creator'?'creator':'chat';
 const tower=document.querySelectorAll('.towers .tower')[team==='creator'?1:0];
 const boss=document.getElementById('bossSprite');
 const center=(node,px=.5,py=.5)=>{if(!node)return null;const r=node.getBoundingClientRect(),base=layer.getBoundingClientRect();return {x:r.left-base.left+r.width*px,y:r.top-base.top+r.height*py}};
 const end=center(tower,.5,.36),origin=center(boss,.5,.76);
 const animate=(node,frames,opts)=>{if(node.animate)node.animate(frames,opts);else node.style.opacity='1'};
 if(type==='attack'){
  if(!origin||!end)return;
  const stage=Math.max(1,Math.min(3,Number(detail.stage)||1));
  const orb=add('v62-projectile stage'+stage,1500);
  orb.style.left=origin.x+'px';orb.style.top=origin.y+'px';
  const dx=end.x-origin.x,dy=end.y-origin.y;
  const duration=v60mode==='cinematografico'?860:690;
  animate(orb,[{transform:'translate3d(-50%,-50%,0) scale(.45)',opacity:0},{offset:.13,transform:'translate3d(-50%,-50%,0) scale(1)',opacity:1},{transform:'translate3d(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px),0) scale(1.25)',opacity:1}],{duration,easing:'cubic-bezier(.2,.5,.55,1)',fill:'forwards'});
  if(boss){boss.classList.remove('v62-cast');void boss.offsetWidth;boss.classList.add('v62-cast');setTimeout(()=>boss.classList.remove('v62-cast'),700)}
  setTimeout(()=>{
   if(!layer.isConnected)return;
   const hit=add('v62-impact stage'+stage,820);hit.style.left=end.x+'px';hit.style.top=end.y+'px';
   animate(hit,[{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{offset:.25,opacity:1,transform:'translate(-50%,-50%) scale(1)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.7)'}],{duration:760,easing:'ease-out',fill:'forwards'});
   if(tower){tower.classList.remove('v62-damage');void tower.offsetWidth;tower.classList.add('v62-damage');setTimeout(()=>tower.classList.remove('v62-damage'),640)}
  },duration);
  if(detail.blocked>0)setTimeout(()=>v60draw('shield',{team}),duration);
 }else if(type==='shield'){
  if(!end)return;
  const shield=add('v62-shield '+team,1700);shield.style.left=end.x+'px';shield.style.top=end.y+'px';
  animate(shield,[{opacity:0,transform:'translate(-50%,-50%) scale(.6)'},{offset:.18,opacity:1,transform:'translate(-50%,-50%) scale(1)'},{offset:.75,opacity:.9,transform:'translate(-50%,-50%) scale(1.07)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.15)'}],{duration:1550,easing:'ease-out',fill:'forwards'});
 }else if(type==='hit'){
  if(boss&&v60mode==='cinematografico'){boss.classList.remove('v62-hurt');void boss.offsetWidth;boss.classList.add('v62-hurt');setTimeout(()=>boss.classList.remove('v62-hurt'),400)}
 }else if(type==='victory'){
  layer.querySelectorAll('.v62-victory,.v60win').forEach(el=>el.remove());
  const win=add('v62-victory',4500);const title=document.createElement('strong');title.textContent='🏆 CHEFÃO DERROTADO!';
  const teamLabel=document.createElement('span');teamLabel.textContent='VITÓRIA DO '+(detail.winner==='chat'?'CHAT':'CRIADOR');
  const hero=document.createElement('span');hero.textContent='⭐ MVP: '+String(detail.best||'Comunidade').slice(0,30);
  win.append(title,teamLabel,hero);
  animate(win,[{opacity:0,transform:'translate(-50%,-50%) scale(.8)'},{offset:.15,opacity:1,transform:'translate(-50%,-50%) scale(1.04)'},{offset:.24,opacity:1,transform:'translate(-50%,-50%) scale(1)'},{offset:.83,opacity:1,transform:'translate(-50%,-50%) scale(1)'},{opacity:0,transform:'translate(-50%,-50%) scale(1.06)'}],{duration:4200,easing:'ease-out',fill:'forwards'});
 }
}
const v60modeSelect=document.getElementById('v60mode');if(v60modeSelect)v60modeSelect.onchange=async e=>{
 const mode=e.target.value;const action={economico:'visualEconomico',equilibrado:'visualEquilibrado',cinematografico:'visualCinematografico'}[mode];
 try{const r=await adminFetch('/admin',{action});if(!r.ok)throw Error(await r.text());v60setMode(mode)}catch(err){const h=document.getElementById('v60health');if(h)h.textContent=err.message}
};
const v115Effects={active:0,last:0,max:14};
v60setMode('equilibrado');

let v59LastAttack=0,v59LastShield=0,v59VictoryTimer=null;
function v59Effect(type,detail){
 const field=document.getElementById('v59Fx');if(!field||!detail)return;
 const now=Date.now();
 if(type==='attack'){
  if(now-v59LastAttack<400)return;v59LastAttack=now;
  const p=document.createElement('div');p.className='v59-projectile stage'+Math.max(1,Math.min(3,Number(detail.stage)||1))+' '+(detail.team==='creator'?'creator':'chat');
  // Use relative field height instead of viewport height to avoid effects leaving arena.
  p.style.setProperty('--target-y',Math.round(field.clientHeight*.57)+'px');
  p.style.setProperty('--target-x',Math.round(field.clientWidth*(detail.team==='creator'?.25:-.25))+'px');
  field.appendChild(p);setTimeout(()=>p.remove(),1700);
  const impact=document.createElement('div');impact.className='v59-impact stage'+Math.max(1,Math.min(3,Number(detail.stage)||1))+' '+(detail.team==='creator'?'creator':'chat');field.appendChild(impact);setTimeout(()=>impact.remove(),1800);
  const warning=document.createElement('div');warning.className='v591-telegraph';warning.textContent=['','💜 RAIO SOMBRIO','🔥 CHAMA INFERNAL','⚡ GOLPE FINAL'][Math.max(1,Math.min(3,Number(detail.stage)||1))];field.appendChild(warning);setTimeout(()=>warning.remove(),2300);
  if(detail.blocked>0)v59Effect('shield',{team:detail.team});
 }else if(type==='shield'){
  if(now-v59LastShield<250)return;v59LastShield=now;
  const e=document.createElement('div');e.className='v59-shield '+(detail.team==='creator'?'creator':'chat');field.appendChild(e);setTimeout(()=>e.remove(),2500);
 }else if(type==='victory'){
  if(v59VictoryTimer){clearTimeout(v59VictoryTimer);v59VictoryTimer=null}
  field.querySelectorAll('.v59-victory').forEach(e=>e.remove());
  const el=document.createElement('div');el.className='v59-victory';
  const crown=document.createElement('div');crown.className='v59-crown';crown.textContent='🏆';
  const title=document.createElement('strong');title.textContent='CHEFÃO DERROTADO!';
  const team=document.createElement('small');team.textContent='Vitória do time '+(detail.winner==='chat'?'CHAT':'CRIADOR');
  const hero=document.createElement('small');hero.textContent=detail.best?'Herói: '+String(detail.best).slice(0,36):'Vitória da comunidade!';
  el.append(crown,title,team,hero);field.appendChild(el);v59VictoryTimer=setTimeout(()=>{el.remove();v59VictoryTimer=null},4900);
 }
}

function v58Countdown(){const el=document.getElementById('v58bossNext');if(!el)return;el.hidden=!v58BossActive;if(v58BossActive)el.textContent='⚡ ATAQUE EM '+Math.max(0,Math.ceil((v58NextAttack-Date.now())/1000))+'s'}
setInterval(v58Countdown,1000);
function v57UI(r){if(!r||!r.combat)return;const c=r.combat;
v58BossActive=c.active;v58NextAttack=c.nextAttack||0;v58Countdown();
const stats=document.getElementById('v58stats');if(stats)stats.textContent='⚔️ Dano CHAT: '+c.damage.chat+' • CRIADOR: '+c.damage.creator+' • Chefões vencidos: '+c.kills+' • Top: '+(c.top||[]).slice(0,3).map(x=>x[0]+' ('+x[1]+')').join(', ');
 showBossMonster(c.stage,c.active);
 if(c.active){const ratio=Math.max(0,Math.min(100,c.hp/c.maxHp*100));document.getElementById('bossMonsterHp').style.width=ratio+'%';document.getElementById('v57hp').textContent=c.hp+' / '+c.maxHp+' HP'}
 for(const team of ['chat','creator']){const el=document.getElementById('v57'+team);el.hidden=!c.active;if(c.active){const t=c.towers[team];el.textContent='🛡️ '+team.toUpperCase()+' '+t.hp+'/'+t.maxHp+(t.shield?' +'+t.shield:'')}}
}
function v55UI(r){if(!r||!r.advanced)return;const a=r.advanced;
showBossMonster(a.bossStage,a.bossStage>0);document.getElementById('v55status').textContent='🏆 Temporada '+a.season+' • Torneio: '+a.bracket.length+'/8 campeões • 👹 Chefão fase '+a.bossStage+' • 🎟️ Inscritos: '+a.raffleEntries;
document.body.classList.remove('theme-neon','theme-gold');if(a.theme!=='original')document.body.classList.add('theme-'+a.theme);
document.getElementById('v55theme').value=a.theme;
}
function v54UI(r){if(!r||!r.community)return;const c=r.community;
 document.getElementById('v54top').textContent='🏅 Destaques: '+(c.top||[]).slice(0,5).map(x=>x.user+' ('+x.title+' • '+x.xp+' XP)').join(' • ');
 document.getElementById('v54poll').textContent=c.poll.active?'🗳️ Votação ativa: !voto chefao ou !voto missao':'Votação encerrada';
}
function v53UI(r){if(!r||!r.retention)return;const x=r.retention;
 document.getElementById('v53history').textContent='🏆 Rodadas registradas: '+x.totalRounds+' • CHAT: '+x.totals.chat+' • CRIADOR: '+x.totals.creator+' • Último campeão: '+(x.lastChampion||'—');
 document.getElementById('v53heroes').textContent='👑 Últimos heróis: '+(x.heroes||[]).slice(0,3).map(h=>h.user+' ('+h.gifts+')').join(' • ');
}
function v51UI(r){if(!r||!r.stats)return;const s=r.stats,g=r.goals;document.getElementById('v51stats').textContent='🎁 Presentes: '+s.gifts+' • ❤️ Curtidas: '+s.likes+' • ➕ Seguidores: '+s.followers+' • 🔄 Compartilhamentos: '+s.shares+' • 👋 Entradas: '+s.entries;document.getElementById('v51goals').textContent='Metas: ❤️ '+s.likes+'/'+(Math.floor(s.likes/g.likes)+1)*g.likes+' • ➕ '+s.followers+'/'+(Math.floor(s.followers/g.followers)+1)*g.followers+' • 🔄 '+s.shares+'/'+(Math.floor(s.shares/g.shares)+1)*g.shares;document.getElementById('v51duel').textContent=s.duel?'⚔️ '+s.duel.players.map(n=>n+': '+s.duel.points[n]).join(' × '):'⚔️ Nenhum desafio ativo';const leaders=Object.entries(s.byUser||{}).sort((a,b)=>b[1].interactions-a[1].interactions).slice(0,3);document.getElementById('v51top').textContent='🔥 Mais ativos: '+leaders.map(([n,x])=>n+' ('+x.interactions+')').join(', ')}
const visualEnhanced=document.getElementById('visualEnhanced');
visualEnhanced.checked=location.pathname==='/overlay'||localStorage.getItem('lp561_visual')==='on';
document.body.classList.toggle('visual-enhanced',visualEnhanced.checked);
visualEnhanced.onchange=()=>{localStorage.setItem('lp561_visual',visualEnhanced.checked?'on':'off');document.body.classList.toggle('visual-enhanced',visualEnhanced.checked)};
let adminToken=sessionStorage.getItem('lp55_admin')||'';
async function adminFetch(url,payload){if(!adminToken){adminToken=prompt('Cole a chave de administrador exibida no Termux:')||'';sessionStorage.setItem('lp55_admin',adminToken)}
 let r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-LivePulse-Key':adminToken},body:JSON.stringify(payload)});
 if(r.status===403){adminToken='';sessionStorage.removeItem('lp55_admin');throw Error('Chave inválida. Tente novamente.')}
 return r}
let voiceSelected='';
function refreshVoices(){const select=document.getElementById('v55voice');if(!select)return;const voices=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith('pt'));select.innerHTML='<option value="">Padrão</option>';for(const v of voices){const opt=document.createElement('option');opt.value=v.name;opt.textContent=v.name;select.appendChild(opt)}select.value=voiceSelected}
if('speechSynthesis'in window){speechSynthesis.onvoiceschanged=refreshVoices;setTimeout(refreshVoices,100)}
document.getElementById('v55voice').onchange=e=>{voiceSelected=e.target.value;localStorage.setItem('lp55_voice',voiceSelected)};
voiceSelected=localStorage.getItem('lp55_voice')||'';
document.getElementById('v55speed').value=Math.round(Number(localStorage.getItem('lp55_speed')||1)*100);
document.getElementById('v55pitch').value=Math.round(Number(localStorage.getItem('lp55_pitch')||1)*100);
for(const [id,key] of [['v55speed','lp55_speed'],['v55pitch','lp55_pitch']])document.getElementById(id).oninput=e=>localStorage.setItem(key,String(Number(e.target.value)/100));
document.querySelectorAll('[data-v55]').forEach(b=>b.onclick=async()=>{try{const r=await adminFetch('/admin',{action:b.dataset.v55});document.getElementById('v55message').textContent=await r.text()}catch(e){document.getElementById('v55message').textContent=e.message}});
document.getElementById('v55theme').onchange=async e=>{try{await adminFetch('/admin',{action:'theme'+e.target.value[0].toUpperCase()+e.target.value.slice(1)})}catch(err){document.getElementById('v55message').textContent=err.message}};
const voicePrefsKey='livepulse_voice_v53';
let voicePrefs={volume:.85,frequency:'normal'};
try{voicePrefs={...voicePrefs,...JSON.parse(localStorage.getItem(voicePrefsKey)||'{}')}}catch(_){}
let lastSuspenseAt=0,lastLeadTeam='',lastGiftNarration=0;
for(const [id,action] of [['v54pollstart','pollStart'],['v54pollend','pollEnd']])document.getElementById(id).onclick=async()=>{const r=await adminFetch('/admin',{action});document.getElementById('v54msg').textContent=await r.text()};
document.getElementById('v53volume').value=Math.round(voicePrefs.volume*100);
document.getElementById('v53freq').value=voicePrefs.frequency;
document.getElementById('v53volume').oninput=e=>{voicePrefs.volume=Number(e.target.value)/100;saveVoicePrefs()};
document.getElementById('v53freq').onchange=e=>{voicePrefs.frequency=e.target.value;saveVoicePrefs()};
document.getElementById('v51startDuel').onclick=async()=>{const r=await adminFetch('/admin',{action:'duel'});document.getElementById('v51msg').textContent=await r.text()};

function suspenseLine(g,old){
 if(!active||!old||g.phase!=='playing'||g.remaining<=10)return;
 const now=Date.now();if(now-lastSuspenseAt<24000)return;
 const lead=g.chat===g.creator?'empate':g.chat>g.creator?'chat':'creator';
 const oldLead=old.chat===old.creator?'empate':old.chat>old.creator?'chat':'creator';
 const diff=Math.abs(g.chat-g.creator);
 let msg='';
 if(lead!=='empate'&&oldLead!==lead)msg='Virada espetacular! '+(lead==='chat'?'O chat':'O criador')+' assumiu a liderança!';
 else if(g.remaining<=30&&g.remaining>24)msg='Reta final! Faltam menos de trinta segundos. Quem vai decidir essa disputa?';
 else if(diff<=Math.max(15,cfgGoal()*0.05)&&g.remaining<80)msg='Disputa apertada! Uma participação pode mudar tudo!';
 if(msg){lastSuspenseAt=now;speak(msg,3,'suspense')}
}
function cfgGoal(){return Number(currentConfig.goal)||500}
function saveVoicePrefs(){try{localStorage.setItem(voicePrefsKey,JSON.stringify(voicePrefs))}catch(_){}}
function voiceNext(){if(!active||voiceBusy||!voiceQueue.length)return;voiceQueue.sort((a,b)=>b.priority-a.priority||a.ts-b.ts);const item=voiceQueue.shift();voiceBusy=true;voiceCurrentPriority=item.priority;const u=new SpeechSynthesisUtterance(item.text);u.lang='pt-BR';u.rate=Number(localStorage.getItem('lp55_speed')||1);u.pitch=Number(localStorage.getItem('lp55_pitch')||1)*(item.priority>=5?1.05:1);const chosen=speechSynthesis.getVoices().find(v=>v.name===voiceSelected);if(chosen)u.voice=chosen;u.volume=voicePrefs.volume;u.onend=u.onerror=()=>{voiceBusy=false;voiceCurrentPriority=0;voiceNext()};speechSynthesis.speak(u)}
function speak(text,priority=1,key=''){if(!active)return;if(voicePrefs.frequency==='quiet'&&priority<=1)return;const now=Date.now();if(key&&voiceQueue.some(x=>x.key===key))return;voiceQueue.push({text,priority,key,ts:now});if(voiceQueue.length>18){const drop=voiceQueue.findIndex(x=>x.priority<=1);if(drop>=0)voiceQueue.splice(drop,1);else voiceQueue.shift()}voiceNext()}
function sayPriority(text,high=false){speak(text,high?5:2)}
function beep(f=600){if(!active||!audio||!currentConfig.sound)return;try{const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=f;g.gain.value=.06;o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.1)}catch(_){}}
document.getElementById('activate').onclick=()=>{active=true;try{audio=new(window.AudioContext||window.webkitAudioContext)();audio.resume()}catch(_){}speechSynthesis.cancel();speak('Narrador ativado! Sejam bem-vindos à nossa batalha!',3);document.getElementById('activate').style.display='none'};
setInterval(()=>{if(active&&voiceQueue.length<3&&voicePrefs.frequency==='normal')speak('A batalha continua! Siga o perfil, curta e compartilhe a live com seus amigos!',0,'convite')},90000);
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
let v126ConfigSignature='';
function configUI(c){
 const signature=JSON.stringify(c);currentConfig=c;
 if(signature===v126ConfigSignature)return;
 v126ConfigSignature=signature;
 for(const team of ['chat','creator']){
  const items=document.querySelectorAll('#g'+team+' .gift');
  items.forEach((el,i)=>{const n=el.querySelector('div'),score=el.querySelector('b');const p=c[team+'Points'][i];
   if(n)n.textContent=c[team+'Names'][i]||'';if(score)score.textContent=(p>0?'+':'')+p;});
 }
 document.getElementById('goal').textContent=c.goal;const keys=['goal','duration','start','chatVote','creatorVote','followPoints','botSpeed','bestOf','maxEventPoints','maxCombinedMultiplier'];document.getElementById('fields').innerHTML=keys.map(k=>'<label>'+k+'<input type="number" id="c_'+k+'" value="'+c[k]+'"></label>').join('')+'<label>Som<input type="checkbox" id="c_sound" '+(c.sound?'checked':'')+'></label>'+['chat','creator'].map(t=>'<h4>'+t.toUpperCase()+' (nome | pontos)</h4><textarea id="c_'+t+'">'+c[t+'Names'].map((n,i)=>n+' | '+c[t+'Points'][i]).join('\\n')+'</textarea>').join('')}
document.getElementById('save').onclick=async()=>{const c=JSON.parse(JSON.stringify(currentConfig));for(const k of ['goal','duration','start','chatVote','creatorVote','followPoints','botSpeed','bestOf','maxEventPoints','maxCombinedMultiplier'])c[k]=Number(document.getElementById('c_'+k).value);c.sound=document.getElementById('c_sound').checked;for(const t of ['chat','creator']){const rows=document.getElementById('c_'+t).value.trim().split('\\n').map(x=>x.split('|').map(v=>v.trim()));c[t+'Names']=rows.map(x=>x[0]);c[t+'Points']=rows.map(x=>Number(x[1]))}try{const r=await adminFetch('/config',c);if(!r.ok)throw Error(await r.text());configUI(c);document.getElementById('saveStatus').textContent='Salvo!'}catch(e){document.getElementById('saveStatus').textContent=e.message}};
function render(g){v70phase=g.phase;try{const mv=Object.entries(g.supporters||{}).sort((a,b)=>b[1]-a[1])[0];document.getElementById('v71mvp').textContent=mv?mv[0]+' • '+mv[1]+' pts':'—'}catch(e){}document.getElementById('chat').textContent=g.chat;document.getElementById('creator').textContent=g.creator;document.getElementById('wc').textContent='VITÓRIAS '+g.winsChat;document.getElementById('wr').textContent='VITÓRIAS '+g.winsCreator;document.getElementById('round').textContent=g.round;document.getElementById('clock').textContent=String(Math.floor(g.remaining/60)).padStart(2,'0')+':'+String(g.remaining%60).padStart(2,'0');for(const t of ['chat','creator'])document.getElementById('t'+t).style.height=Math.max(8,Math.min(95,g[t]/currentConfig.goal*100))+'%';const list=o=>Object.entries(o||{}).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([n,p])=>'<li>'+escapeHtml(n)+' — '+p+'</li>').join('');document.getElementById('rank').innerHTML=list(g.ranking);document.getElementById('support').innerHTML=list(g.supporters);document.getElementById('activity').innerHTML=list(g.activity);document.getElementById('history').innerHTML=(g.history||[]).slice(0,5).map(h=>'<li>Rodada '+h.round+': '+escapeHtml(h.winner)+' ('+h.chat+' × '+h.creator+')</li>').join('')}
const v52Timers={chat:null,creator:null};
function showGift52(e){if(e.type!=='gift'||!['chat','creator'].includes(e.team))return;lpAnimate('gift',e.team);
 const team=e.team,el=document.getElementById('v52'+team);if(!el)return;
 clearTimeout(v52Timers[team]);const img=el.querySelector('img'),emoji=el.querySelector('.v52emoji');
 const idx=e.idx==null?NaN:Number(e.idx),max=7;
 img.onerror=null;img.onload=null;img.hidden=true;img.removeAttribute('src');emoji.hidden=true;
 if(Number.isInteger(idx)&&idx>=0&&idx<max){
  const sprite=team==='creator'&&idx>=5?idx+1:idx;
  img.onerror=()=>{img.hidden=true;emoji.hidden=false;img.removeAttribute('src')};
  img.onload=()=>{img.hidden=false;emoji.hidden=true};
  img.src='/assets/'+team+sprite+'.png';
 }else{emoji.hidden=false;emoji.textContent='🎁'}
 el.querySelector('.v52name').textContent=String(e.message||'Presente').replace(/ ×\d+ \(combo \d+\)$/,'');
 el.querySelector('.v52user').textContent=e.user||'Visitante';
 el.classList.remove('visible');void el.offsetWidth;el.classList.add('visible');
 v52Timers[team]=setTimeout(()=>{el.classList.remove('visible');img.removeAttribute('src')},5000);
}

/* V11.5 visual-only combat engine. Event-driven, throttled and reduced-motion aware. */
/* effects initialized before first mode call */

function v119Impact(type,data){
 try{
  if(document.hidden||v60mode==='economico'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const f=document.querySelector('.arena .field');if(!f)return;
  const key=type==='victory'?'v119-victory':(data&&data.team==='creator'?'v119-impact-creator':'v119-impact-chat');
  f.classList.remove('v119-impact-chat','v119-impact-creator','v119-victory');
  void f.offsetWidth;f.classList.add(key);
  clearTimeout(window.v119ImpactTimer);
  window.v119ImpactTimer=setTimeout(()=>f.classList.remove('v119-impact-chat','v119-impact-creator','v119-victory'),type==='victory'?1100:350);
 }catch(e){console.warn('V11.9 visual pulse:',e.message)}
}

/* V12.7 cinematic layering: one event-driven flash and no new polling loop. */
const v127Visual={phase:1,events:0,lastEvent:0,timeout:null};
window.v127Visual=v127Visual;
function v127Cinematic(type,data){
 try{
  if(document.hidden||v60mode==='economico'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(!['attack','hit','shield','skill','towerdown','victory'].includes(type))return;
  const now=Date.now();
  if(type!=='victory'&&now-v127Visual.lastEvent<180)return;
  v127Visual.lastEvent=now;
  const flash=document.getElementById('v127flash');if(!flash)return;
  let name='v127-impact-'+(data&&data.team==='creator'?'creator':'chat');
  if(type==='victory')name='v127-victory';
  else if(type==='shield'||type==='skill')name='v127-shield';
  flash.classList.remove('v127-impact-chat','v127-impact-creator','v127-shield','v127-victory');
  void flash.offsetWidth;
  flash.classList.add(name);
  v127Visual.events++;
  if(v127Visual.timeout)clearTimeout(v127Visual.timeout);
  v127Visual.timeout=setTimeout(function(){flash.classList.remove(name);v127Visual.timeout=null},type==='victory'?1420:1100);
 }catch(err){console.warn('V12.7 cinematic layer:',err.message)}
}

function v115Cinematic(type,data={}){
 try{
  if(location.pathname!=='/overlay'||document.hidden||!document.body.classList.contains('visual-enhanced'))return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||v60mode==='economico')return;
  v1292Cinematic(type,data);
  v127Cinematic(type,data);
  if(type==='attack'||type==='hit'||type==='towerdown'||type==='victory')v119Impact(type,data);
  const now=Date.now(),strong=type==='victory'||type==='towerdown';
  if(!strong&&now-v115Effects.last<(v60mode==='equilibrado'?420:170))return;
  if(v115Effects.active>=(v60mode==='equilibrado'?6:14))return;
  v115Effects.last=now;
  const field=document.querySelector('.arena .field');if(!field)return;
  let layer=document.getElementById('v115fx');
  if(!layer){layer=document.createElement('div');layer.id='v115fx';layer.setAttribute('aria-hidden','true');field.appendChild(layer)}
  const team=data.team==='creator'?'creator':'chat';
  const color=team==='chat'?'#ff683b':'#56d7ff';
  const fieldBox=field.getBoundingClientRect();
  const center=(node,x=.5,y=.5)=>{
    if(!node)return {x:fieldBox.width*.5,y:fieldBox.height*.5};
    const r=node.getBoundingClientRect();
    return {x:r.left-fieldBox.left+r.width*x,y:r.top-fieldBox.top+r.height*y};
  };
  const towers=field.querySelectorAll('.towers .tower');
  const tower=towers[team==='creator'?1:0];
  const boss=document.getElementById('bossMonster');
  const from=type==='attack'?center(boss,.5,.55):center(tower,.5,.5);
  const to=type==='attack'?center(tower,.5,.45):center(boss,.5,.6);
  const spawn=(cls,x,y,ms,extra={})=>{
    if(v115Effects.active>=(v60mode==='equilibrado'?6:14))return null;
    const el=document.createElement('span');el.className='v115fx '+cls;
    el.style.left=x+'px';el.style.top=y+'px';el.style.setProperty('--v115color',color);
    for(const [key,value] of Object.entries(extra))el.style.setProperty(key,String(value));
    layer.appendChild(el);v115Effects.active++;
    setTimeout(()=>{el.remove();v115Effects.active=Math.max(0,v115Effects.active-1)},ms);
    return el;
  };
  const blast=(p,large=false)=>{
    spawn('v115blast',p.x,p.y,large?930:640,{'--size':large?'130px':'80px'});
    const amount=large?7:4;
    for(let i=0;i<amount;i++){
      const a=(i/amount)*Math.PI*2;
      spawn('v115spark',p.x,p.y,large?900:610,{'--dx':Math.round(Math.cos(a)*(large?90:46))+'px','--dy':Math.round(Math.sin(a)*(large?90:46))+'px','--delay':i*20+'ms'});
    }
  };
  if(type==='hit'||type==='attack'){
    const reverse=type==='attack';
    const a=reverse?from:from,b=reverse?to:to;
    const dx=b.x-a.x,dy=b.y-a.y;
    const travel=spawn('v115projectile',a.x,a.y,650,{'--dx':dx+'px','--dy':dy+'px','--angle':Math.atan2(dy,dx)+'rad'});
    if(travel)travel.classList.add(type==='attack'?'v115dark':'v115light');
    setTimeout(()=>{if(document.contains(layer))blast(b)},460);
  }else if(type==='shield'){
    const p=center(tower,.5,.45);
    spawn('v115shield',p.x,p.y,1250);
    spawn('v115ring',p.x,p.y,980);
  }else if(type==='towerdown'){
    const p=center(tower,.5,.65);
    blast(p,true);
    spawn('v115debris',p.x,p.y,1400);
  }else if(type==='victory'){
    const p=center(boss,.5,.6);
    blast(p,true);
    const winner=data.winner==='creator'?'CRIADOR':'CHAT';
    const sign=spawn('v115victory',fieldBox.width/2,fieldBox.height*.3,2700);
    if(sign)sign.textContent='✦ VITÓRIA '+winner+' ✦';
    spawn('v115ring',p.x,p.y,1200);
  }else if(type==='skill'){
    const p=center(tower,.5,.5);
    spawn('v115shield',p.x,p.y,950);
  }
 }catch(err){console.warn('V11.5 efeito visual ignorado:',err)}
}

function eventBanner(msg){const field=document.querySelector('.field');const el=document.createElement('div');el.className='v49event';el.textContent=msg;field.appendChild(el);setTimeout(()=>el.remove(),2200)}
function runtimeUI(r){if(!r)return;const list=o=>Object.entries(o||{}).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,p])=>'<li>'+escapeHtml(n)+' — '+p+'</li>').join('');document.getElementById('roundSupport').innerHTML=list(r.roundSupport);document.getElementById('champSupport').innerHTML=list(r.champSupport);document.getElementById('conn49').textContent='Conexão: '+r.connectStatus+(r.paused?' • PAUSADO':'')+(r.boss?' • Chefão HP '+r.boss.hp:'')+(r.mission?' • Missão '+r.mission.team+' '+r.mission.progress+'/'+r.mission.target:'')+(r.surprise?' • Bônus ×'+r.surprise.multiplier:'');document.getElementById('logs49').innerHTML=(r.logs||[]).slice(0,6).map(e=>'<li>'+escapeHtml(e.kind+': '+e.detail)+'</li>').join('')}
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=async()=>{try{const r=await adminFetch('/admin',{action:b.dataset.action});document.getElementById('adminMsg').textContent=await r.text()}catch(e){document.getElementById('adminMsg').textContent=e.message}});
function particles(team){const fx=document.getElementById('fx');for(let i=0;i<12;i++){const p=document.createElement('i');p.className='spark';p.style.left=team==='chat'?'30%':'70%';p.style.top='60%';p.style.background=team==='chat'?'#ff7588':'#70cfff';p.style.setProperty('--x',(Math.random()*150-75)+'px');p.style.setProperty('--y',(Math.random()*140-100)+'px');fx.append(p);setTimeout(()=>p.remove(),850)}const el=document.getElementById('t'+team);el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')}
const stream=new EventSource('/events');stream.onopen=()=>{v1222Sync.lastSse=Date.now()};stream.onerror=()=>{const st=document.getElementById('status');if(st&&st.textContent==='Aguardando jogadores...')st.textContent='Reconectando transmissão...';};stream.onmessage=m=>{try{v1222Sync.lastSse=Date.now();const d=JSON.parse(m.data);if(d.config)configUI(d.config);if(d.runtime){runtimeUI(d.runtime);v51UI(d.runtime);v53UI(d.runtime);v54UI(d.runtime);v55UI(d.runtime);v57UI(d.runtime);if(d.runtime.advanced)v60setMode(d.runtime.advanced.visualMode)}if(d.raffleWinner){eventBanner('🎟️ SORTEADO: '+d.raffleWinner.winner);emotional('Sorteio gratuito! Parabéns '+d.raffleWinner.winner,4,'warm')}
if(d.bossStage){if(d.bossStage.stage>0)lpAnimate('boss','chat');showBossMonster(d.bossStage.stage,d.bossStage.stage>0);if(d.bossStage.stage>0)eventBanner('👹 CHEFÃO • FASE '+d.bossStage.stage)}
if(d.combatHit){v115Cinematic('hit',d.combatHit);lpAnimate('boss',d.combatHit.team);v60safe('hit',d.combatHit)}
if(d.combatAttack){v115Cinematic('attack',d.combatAttack);window['v112DragonAttack_'+(d.combatAttack.team||'chat')]=Date.now()+1800;window.v111BossAttackUntil=Date.now()+1500;lpAnimate('gift',d.combatAttack.team);if(v60mode!=='economico')v60safe('attack',d.combatAttack)}
if(d.combatShield){v115Cinematic('shield',d.combatShield);v60safe('shield',d.combatShield)}
if(d.combatVictory){v115Cinematic('victory',d.combatVictory);window.v111BossDefeatUntil=Date.now()+2600;v60safe('victory',d.combatVictory);eventBanner('🏆 CHEFÃO DERROTADO! '+d.combatVictory.winner.toUpperCase());emotional('O chefão foi derrotado! Parabéns ao time '+d.combatVictory.winner+'!',5,'epic')}
if(d.combatPhase){eventBanner('👹 FASE '+d.combatPhase.stage+'!')}
if(d.combatTowerDown){v115Cinematic('towerdown',d.combatTowerDown);window['v112DragonRoar_'+(d.combatTowerDown.team==='chat'?'creator':'chat')]=Date.now()+2200;eventBanner('💥 TORRE '+d.combatTowerDown.team.toUpperCase()+' DESTRUÍDA!')}
if(d.combat){if(d.combat.active&&window.v111PrevBossHp!=null&&Number(d.combat.hp)<window.v111PrevBossHp)window.v111BossHurtUntil=Date.now()+750;window.v111PrevBossHp=d.combat.active?Number(d.combat.hp):null;v57UI({combat:d.combat});v70TowerStates(d.combat)}
if(d.skill){v115Cinematic('skill',d.skill);lpAnimate('skill',d.skill.team);eventBanner('⚡ HABILIDADE '+d.skill.team.toUpperCase()+' +'+d.skill.pts)}
if(d.visualMode){v60setMode(d.visualMode)}if(d.theme){document.body.classList.remove('theme-neon','theme-gold');if(d.theme!=='original')document.body.classList.add('theme-'+d.theme)}
if(d.achievement){lpShowMedal(d.achievement);eventBanner('🏅 '+d.achievement.user+': '+d.achievement.medal);emotional(d.achievement.user+' conquistou a medalha '+d.achievement.medal+'!',2,'warm')}
if(d.pollResult){eventBanner('🗳️ VENCEU: '+d.pollResult.winner);emotional('Votação encerrada! A torcida escolheu '+d.pollResult.winner,3,'warm')}
if(d.goalReached){const k={likes:'curtidas',followers:'novos seguidores',shares:'compartilhamentos'}[d.goalReached.key];eventBanner('🎯 META DE '+k.toUpperCase()+'!');emotional('Meta coletiva alcançada! '+d.goalReached.value+' '+k+'! Obrigado, tropa!',5,'epic')}if(d.streak)emotional(d.streak.user+' já participou '+d.streak.count+' vezes! Gratidão pelo apoio!',2,'warm');if(d.duel){if(d.duel.type==='start')emotional('Desafio entre '+d.duel.players[0]+' e '+d.duel.players[1]+'! Quem vai vencer?',4,'epic');else emotional('Fim do desafio! Resultado: '+d.duel.winner,4,'epic')}if(d.special){const names={boss:'👑 CHEFÃO DA ARENA!',mission:'🎯 MISSÃO AO VIVO!',surprise:'⚡ PONTOS EM DOBRO!',bossWin:'👑 CHEFÃO DERROTADO!',missionWin:'🎯 MISSÃO CONCLUÍDA!'};eventBanner(names[d.special.type]||'⚡ EVENTO!');if(d.special.type==='bossWin'||d.special.type==='missionWin')particles(d.special.team);if(active)sayPriority(names[d.special.type]||'Evento especial!',true)}if(d.game){if(previous&&previous.phase==='playing'&&d.game.phase==='playing'){suspenseLine(d.game,previous)}render(d.game);previous={chat:d.game.chat,creator:d.game.creator,phase:d.game.phase}}if(d.overtimeStart){eventBanner('⚔️ PRORROGAÇÃO • 20 SEGUNDOS!');emotional('Que disputa equilibrada! Temos vinte segundos de prorrogação!',5,'epic')}
 if(d.roundEnd){if(d.roundEnd.hero){emotional('Herói da rodada: '+d.roundEnd.hero.user+'! Obrigado pelos '+d.roundEnd.hero.gifts+' presentes!',4,'warm')}finalCountdown=-1;if(d.roundEnd.champion)emotional('Temos um grande campeão! O time '+d.roundEnd.champion+' conquistou a melhor de '+currentConfig.bestOf+'! Parabéns a todos os apoiadores!',6,'epic');else sayPriority(d.roundEnd.winner==='empate'?'Fim da rodada! Empate!':phrases.round[Math.floor(Math.random()*phrases.round.length)].replace('{t}',d.roundEnd.winner),true);beep(900);particles('chat');particles('creator')}if(d.roundStart){finalCountdown=-1;emotional('Nova rodada iniciada! Boa sorte às duas equipes!',3,'epic')}if(d.tick>0&&d.tick<=10){beep(d.tick<=3?850:500);if(d.tick!==finalCountdown&&(d.tick===10||d.tick===5||d.tick===3||d.tick===1)){finalCountdown=d.tick;emotional(d.tick===10?'Últimos dez segundos! Preparem a torcida!':String(d.tick)+'!',d.tick<=3?5:3,d.tick===10?'epic':'normal')}}if(d.event){const e=d.event;showGift52(e);document.getElementById('status').textContent=e.user+': '+e.message+(e.pts?' ('+(e.pts>0?'+':'')+e.pts+')':'');if(e.team&&e.pts){particles(e.team);beep(600)}if(e.type==='gift'){const key='gift:'+e.user;const now=Date.now();window.__lastGiftThanks??={};if(!window.__lastGiftThanks[key]||now-window.__lastGiftThanks[key]>12000||e.message.includes('COMBO')){window.__lastGiftThanks[key]=now;emotional(pick('gift',e.user,e.message),Math.abs(e.pts)>=50?5:4,Math.abs(e.pts)>=50?'epic':'warm')}}else if(e.type==='follow')speak(pick('follow',e.user),3);else if(e.type==='enter')speak(pick('welcome',e.user),1,'welcome:'+e.user);else if(e.type==='share')speak(pick('share',e.user),2,'share:'+e.user);else if(e.type==='like')speak(pick('like',e.user),1,'like:'+e.user);else if(e.type==='chat'&&e.team)speak(e.user+' marcou para o time '+e.team,1)}}catch(err){console.error(err)}};

/* V12.2.2: redundant state sync. SSE remains the primary event transport;
   polling recovers scoreboard, health bars and timers even after stream failures. */
const v1222Sync={ok:0,errors:0,lastSse:0,lastPoll:0,inFlight:false,lastGame:null};
window.addEventListener('error',function(e){const st=document.getElementById('v1222sync');if(st){st.classList.remove('v123healthy');st.classList.add('v123problem');st.textContent='ERRO JS: '+String(e.message).slice(0,100);st.style.color='#ff7777'}});
function v1222Apply(d){
 if(!d||!d.game)return;
 try{
  if(d.config)configUI(d.config);
  render(d.game);
  if(d.runtime){
   runtimeUI(d.runtime);
   v53UI(d.runtime);v54UI(d.runtime);v55UI(d.runtime);v57UI(d.runtime);
   if(d.runtime.combat)v70TowerStates(d.runtime.combat);
  }
  v1222Sync.ok++;v1222Sync.errors=0;v1222Sync.lastGame=d.game;
  const st=document.getElementById('v1222sync');
  if(st){st.classList.add('v123healthy');st.classList.remove('v123problem');st.textContent='● Arena sincronizada • quadros '+(window.v112Tick||0)+' • '+String(d.game.phase);st.style.color='#8cf7bc'}
 }catch(err){
  v1222Sync.errors++;
  console.error('LivePulse sync:',err);
  const st=document.getElementById('v1222sync');
  if(st){st.classList.remove('v123healthy');st.classList.add('v123problem');st.textContent='⚠ Erro de atualização: '+err.message;st.style.color='#ffd27b'}
 }
}
async function v1222Poll(force=false){
 if(v1222Sync.inFlight||document.hidden)return;
 /* SSE continues to deliver every active-game tick. Poll only as a recovery path. */
 const now=Date.now();
 if(!force&&now-v1222Sync.lastSse<3300)return;
 if(!force&&v1222Sync.lastGame&&v1222Sync.lastGame.phase!=='playing'&&now-v1222Sync.lastPoll<6000)return;
 v1222Sync.inFlight=true;
 try{
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),3500);
  let response;
  try{response=await fetch('/state?livepulse='+Date.now(),{cache:'no-store',signal:controller.signal})}
  finally{clearTimeout(timeout)}
  if(!response.ok)throw Error('HTTP '+response.status);
  v1222Apply(await response.json());v1222Sync.lastPoll=Date.now();
 }catch(err){
  v1222Sync.errors++;
  const st=document.getElementById('v1222sync');
  if(st){st.classList.remove('v123healthy');st.classList.add('v123problem');st.textContent='⚠ Reconectando arena ('+v1222Sync.errors+')';st.style.color='#ffbd78'}
  console.warn('LivePulse polling:',err.message);
 }finally{v1222Sync.inFlight=false}
}
window.v1222Sync=v1222Sync;
window.v1222Poll=v1222Poll;
window.v123Audit=function(){const f=document.querySelector('.field');const gifts=[...document.querySelectorAll('#gchat .gift,#gcreator .gift')];return {viewport:innerWidth,fieldWidth:f?Math.round(f.getBoundingClientRect().width):0,gifts:gifts.length,overflow:gifts.filter(x=>x.scrollWidth>x.clientWidth+2).length,mode:document.body.className}};
setInterval(v1222Poll,1500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)v1222Poll(true)});
v1222Poll();


/* V7 sprite animation: runs independently of score, narrator and EventSource. */
let v70frame=0,v70phase='idle',v70next=0;
function v70TowerStates(c){window.v10Combat=c;
 if(!c||!c.towers)return;
 v70next=Number(c.nextBossAutoAt)||0;
 for(const team of ['chat','creator']){
  const tower=c.towers[team],node=document.querySelector('.towers .tower'+(team==='creator'?':last-child':':nth-last-child(2)'));
  if(!tower||!node)continue;
  const hp=Number(tower.hp),max=Number(tower.maxHp)||1,ratio=hp/max;
  const previous=window.v112TowerHP||(window.v112TowerHP={});
  const prior=previous[team];
  if(prior!=null&&hp<prior){window['v112TowerHurt_'+team]=Date.now()+950;window['v112DragonHurt_'+team]=Date.now()+850;}
  if(prior!=null&&hp>prior&&prior<=0)window['v112TowerRebuild_'+team]=Date.now()+2400;
  previous[team]=hp;
  node.classList.toggle('v127-shield',!!(c.active&&tower.shield>0));
  node.classList.toggle('v127-critical',!!(c.active&&ratio<=.27));
  const state=c.active&&hp<=0?'destroy':Date.now()<(window['v112TowerRebuild_'+team]||0)?'rebuild':c.active&&tower.shield>0?'shield':Date.now()<(window['v112TowerHurt_'+team]||0)?'hurt':c.active&&ratio<=.27?'critical':c.active&&ratio<=.65?'hurt':'idle';
  const frame=window.v112Tick%8||0;
  const key=team+'_'+state+'_'+frame;
  if(node.dataset.v112sprite!==key){
   node.dataset.v112sprite=key;
   node.style.setProperty('--v10-tower',"url('/visual_assets/"+(v60mode==='economico'?'v112_tower_':'v129_tower_')+key+".png')");
  }
 }
}
function v70UpdateNext(){
 const el=document.getElementById('v70next');if(!el)return;
 const remaining=Math.max(0,Math.ceil((v70next-Date.now())/1000));
 const boss=document.getElementById('bossMonster');
 const active=boss&&!boss.hidden;
 el.hidden=!(v70phase==='playing'&&!active&&v70next>0);
 if(!el.hidden)el.textContent=' • 👹 '+String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');const badge=document.getElementById('v71boss');if(badge)badge.textContent=active?'EM COMBATE':v70next>0?'EM '+String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0'):'AGUARDANDO';
}
function v126SpriteLoop(){
 const started=performance.now();
 try{
  const eventEl=document.getElementById('v71event'),statusEl=document.getElementById('status');if(eventEl&&statusEl)eventEl.textContent=statusEl.textContent||'Aguardando...';
  v70UpdateNext();
  const boss=document.getElementById('bossMonster'),sprite=document.getElementById('bossSprite');
  if(document.hidden)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cadence=reduced?2200:v116Interval();
  if(Date.now()-(window.v116LastFrame||0)<cadence){v116Perf.skipped++;return}
  window.v116LastFrame=Date.now();v116Perf.ticks++;
  const phase=Math.max(1,Math.min(3,Number(sprite&&sprite.dataset.v70Phase)||1));
  const v127field=document.querySelector('.arena .field');
  if(v127field&&v127field.dataset.v127Phase!==String(phase)){v127field.dataset.v127Phase=String(phase);v127Visual.phase=phase;}
  v70frame=(v70frame+1)%6;
  window.v112Tick=(window.v112Tick||0)+1;
  if(window.v10Combat)v70TowerStates(window.v10Combat);
  for(const team of ['chat','creator']){
    const now=Date.now();
    const action=now<(window['v112DragonHurt_'+team]||0)?'hurt':now<(window['v112DragonAttack_'+team]||0)?'attack':now<(window['v112DragonRoar_'+team]||0)?'roar':'idle';
    document.body.style.setProperty('--v10-dragon-'+team,"url('/visual_assets/"+(v60mode==='economico'?'v112_dragon_':'v129_dragon_')+team+"_"+action+"_"+(window.v112Tick%8)+".png')");
  }
  const now=Date.now();
  const action=now<(window.v111BossDefeatUntil||0)?'defeat':now<(window.v111BossHurtUntil||0)?'hurt':now<(window.v111BossAttackUntil||0)?'attack':now<(window.v111BossSummonUntil||0)?'summon':'idle';
  const tick=(window.v111BossTick=(window.v111BossTick||0)+1);
  const frame=(tick%8);
  const url='/visual_assets/'+(v60mode==='economico'?'v111_boss_':'v129_boss_')+phase+'_'+action+'_'+frame+'.png';
  if(boss&&!boss.hidden&&sprite&&sprite.getAttribute('src')!==url){
   sprite.src=url;
   if(v60mode==='cinematografico')v116Warm('/visual_assets/v129_boss_'+phase+'_'+action+'_'+((frame+1)%8)+'.png');
  }
 }catch(err){console.warn('Sprite animation:',err.message)}
 finally{
  const work=performance.now()-started;
  v116Perf.lastWorkMs=Math.round(work*10)/10;
  if(work>28){v116Perf.slowUntil=Date.now()+2800;v116Perf.adaptiveSlowFrames++}
  setTimeout(v126SpriteLoop,document.hidden?1200:Math.max(120,v116Interval()));
 }
}
/* V12.9.2 · Advanced, event-triggered cinematic transitions.
   No network requests, no new perpetual timers; sprite layers remain independent. */
const v1292Motion={version:'12.9.2',phases:0,attacks:0,destructions:0,defeats:0,
 lastPhase:0,lastAttack:0,wingAligned:false,displays:0,timers:new Map()};
window.v1292Motion=v1292Motion;
function v1292Queue(key,element,cls,ms){
 if(!element)return;
 const prior=v1292Motion.timers.get(key);
 if(prior)clearTimeout(prior);
 element.classList.remove(cls);
 void element.offsetWidth;
 element.classList.add(cls);
 const timer=setTimeout(function(){element.classList.remove(cls);v1292Motion.timers.delete(key)},ms);
 v1292Motion.timers.set(key,timer);
}
function v1292Align(){
 const sprite=document.getElementById('bossSprite');
 const wing=document.getElementById('v1292WingRig'),portal=document.getElementById('v1292Portal');
 if(!sprite||!wing||!portal)return;
 const wr=sprite.clientWidth,hr=sprite.clientHeight;
 if(!(wr>0&&hr>0))return;
 const naturalW=sprite.naturalWidth||600,naturalH=sprite.naturalHeight||440;
 const paintedW=Math.min(wr,hr*naturalW/naturalH),paintedH=Math.min(hr,wr*naturalH/naturalW);
 for(const el of [wing,portal]){
  el.style.width=paintedW+'px';el.style.height=paintedH+'px';
  el.style.top=((hr-paintedH)/2)+'px';
 }
 v1292Motion.wingAligned=true;
}
function v1292StageTransition(stage){
 const n=Math.max(1,Math.min(3,Number(stage)||1));
 const wing=document.getElementById('v1292WingRig');
 const portal=document.getElementById('v1292Portal');
 if(!wing||!portal)return;
 for(const side of ['Left','Right']){
  const part=document.getElementById('v1292Wing'+side);
  if(part)part.src='/visual_assets/v1292_boss_wing_'+n+'_'+side.toLowerCase()+'.png';
 }
 portal.style.backgroundImage="url('/visual_assets/v1292_phase_"+n+".png')";
 v1292Motion.lastPhase=n;v1292Motion.phases++;
 if(!document.hidden&&v60mode!=='economico'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
  v1292Queue('phase',portal,'v1292-phase-shift',1450);
 }
 v1292Align();
}
function v1292Cinematic(type,data){
 if(document.hidden||v60mode==='economico'||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const team=data&&data.team==='creator'?'creator':'chat';
 const boss=document.getElementById('bossMonster');
 if(type==='attack'){
  v1292Motion.attacks++;v1292Motion.lastAttack=Date.now();
  const beam=document.getElementById('v1292AttackFx');
  if(beam){
   beam.classList.remove('v1292-fire-chat','v1292-fire-creator');
   v1292Queue('beam',beam,'v1292-fire-'+team,570);
  }
  const sides=document.querySelectorAll('.arena .header .side');
  v1292Queue('dragon-'+team,sides[team==='creator'?1:0],'v1292-dragon-lunge',500);
  if(boss&&!boss.hidden)v1292Queue('wingAttack',boss,'v1292-attacking',460);
 }else if(type==='towerdown'){
  v1292Motion.destructions++;
  const towers=document.querySelectorAll('.arena .field .towers .tower');
  v1292Queue('towerDown-'+team,towers[team==='creator'?1:0],'v1292-crumble',1450);
 }else if(type==='victory'){
  v1292Motion.defeats++;
  if(boss&&!boss.hidden)v1292Queue('bossDefeat',boss,'v1292-defeated',1250);
  const portal=document.getElementById('v1292Portal');
  if(portal){portal.style.backgroundImage="url('/visual_assets/v1292_victory_ring.png')";
   v1292Queue('phase',portal,'v1292-phase-shift',1450);}
 }
}
const v1292BossImage=document.getElementById('bossSprite');
if(v1292BossImage)v1292BossImage.addEventListener('load',v1292Align);
window.addEventListener('resize',v1292Align,{passive:true});
document.addEventListener('visibilitychange',function(){
 document.body.classList.toggle('v1292-tab-hidden',document.hidden);
 if(!document.hidden)v1292Align();
});
window.v1292MotionAudit=function(){
 return {version:v1292Motion.version,phases:v1292Motion.phases,
 attacks:v1292Motion.attacks,destructions:v1292Motion.destructions,
 defeats:v1292Motion.defeats,wingAligned:v1292Motion.wingAligned,
 wingLayers:document.querySelectorAll('#v1292WingRig img').length,
 hasAttackFx:!!document.getElementById('v1292AttackFx'),
 hasDebris:document.querySelectorAll('.towers .v1292-debris').length,
 mode:v60mode};
};

  /* V12.9.3: premium sprites replace V12.9 art, while preserving animation filenames. */
 window.v1293ArtAudit=function(){
  const mode=(document.body.className.match(/v60-(economico|equilibrado|cinematografico)/)||[])[1]||'unknown';
  const boss=document.getElementById('bossSprite');
  const tower=document.querySelector('.towers .tower');
  return {version:'12.9.4',mode:mode,frame:window.v112Tick||0,
    bossSrc:boss?boss.getAttribute('src'):null,
    dragonChat:document.body.style.getPropertyValue('--v10-dragon-chat'),
    firstTower:tower?tower.style.getPropertyValue('--v10-tower'):null,
    gifts:document.querySelectorAll('#gchat .gift, #gcreator .gift').length,
    phase:document.querySelector('#bossMonsterPhase')?.textContent||null};
 };
/* V12.9.1: inspect layout on actual Android without changing game state. */
window.v1291LayoutAudit=function(){
 const rect=(selector)=>{
  const e=document.querySelector(selector);if(!e)return null;
  const r=e.getBoundingClientRect();
  return {x:Math.round(r.x),y:Math.round(r.y),right:Math.round(r.right),bottom:Math.round(r.bottom),w:Math.round(r.width),h:Math.round(r.height)};
 };
 const center=rect('.towers'),left=rect('#gchat'),right=rect('#gcreator');
 const boss=rect('#bossMonster'),sprite=rect('#bossSprite');
 const notificationChat=rect('#v52chat'),notificationCreator=rect('#v52creator');
 const lanesSafe=!!(center&&left&&right&&center.x>=left.right-2&&center.right<=right.x+2);
 const spriteSafe=!!(sprite&&center&&sprite.x>=center.x-8&&sprite.right<=center.right+8);
 const gifts=document.querySelectorAll('#gchat .gift,#gcreator .gift').length;
 return {version:'12.9.2',viewport:{w:innerWidth,h:innerHeight},
  lanesSafe,spriteSafe,giftCount:gifts,center,boss,sprite,notificationChat,notificationCreator,
  offlineOnly:true};
};
setTimeout(v126SpriteLoop,140);

function v117VisualAudit(){
 try{
  const field=document.querySelector('.arena .field');if(!field)return;
  const gifts=['gchat','gcreator'].map(id=>({id,count:document.querySelectorAll('#'+id+' .gift').length}));
  const sprites=['bossSprite'].map(id=>({id,loaded:!!document.getElementById(id)?.naturalWidth}));
  const problems=[];
  if(gifts.some(g=>g.count!==7))problems.push('presentes: '+gifts.map(g=>g.id+'='+g.count).join(', '));
  const box=field.getBoundingClientRect();
  if(box.width<200||box.height<220)problems.push('arena pequena: '+Math.round(box.width)+'x'+Math.round(box.height));
  window.v117Audit={gifts,sprites,arena:{width:Math.round(box.width),height:Math.round(box.height)},problems};
  if(problems.length)console.warn('LivePulse V11.7 revisão visual:',problems.join('; '));
 }catch(e){console.warn('LivePulse V11.7 auditoria:',e.message)}
}
window.addEventListener('load',()=>setTimeout(v117VisualAudit,800),{once:true});

(function(){
 const el=document.createElement('div');el.id='v1222sync';el.setAttribute('aria-live','polite');
 el.style.cssText='position:fixed;right:6px;bottom:5px;z-index:99;background:#090b1cce;color:#ffd27b;border:1px solid #ffffff35;border-radius:5px;padding:3px 6px;font:10px system-ui;pointer-events:none';
 el.textContent='● Conectando arena...';
 document.body.appendChild(el);
})();

/* V12.4: Control center for /painel only; does not modify arena rendering. */
(function v124Dashboard(){
 if(location.pathname!=='/painel')return;
 const byId=id=>document.getElementById(id);
 const controls=[...document.querySelectorAll('[data-v124-action]')];
 const memory=[];
 let unlocked=false,busy=false,formLoaded=false,snapshot=null,publicData=null,diagnostics=null;
 let latestConfig=null;
 const msg=(id,value,error)=>{const el=byId(id);if(el){el.textContent=value;el.dataset.error=error?'1':'0'}};
 const safeText=(id,value)=>{const el=byId(id);if(el)el.textContent=String(value==null?'—':value)};
 const fmtTime=n=>{n=Math.max(0,Number(n)||0);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(Math.floor(n%60)).padStart(2,'0')};
 function setLock(state){
  unlocked=state;
  controls.forEach(b=>b.disabled=!state);
  byId('v124-config-save').disabled=!state;
  byId('v124-login').textContent=state?'🔓 Autenticado':'🔐 Desbloquear';
  byId('v124-auth').textContent=state?'🔓 Controles liberados':'🔒 Controles bloqueados';
  byId('v124-auth').dataset.kind=state?'good':'bad';
  if(!state){diagnostics=null;byId('v124-logs').replaceChildren();}
 }
 function render(data){
  if(!data||!data.game)return;
  const g=data.game,rt=data.runtime||{},cf=data.config||{};
  latestConfig=cf;
  const goal=Math.max(1,Number(cf.goal)||1);
  safeText('v124-chat-score',g.chat);safeText('v124-creator-score',g.creator);
  safeText('v124-chat-extra','Vitórias: '+(g.winsChat||0));safeText('v124-creator-extra','Vitórias: '+(g.winsCreator||0));
  byId('v124-chat-progress').style.width=Math.min(100,Math.max(0,Number(g.chat)/goal*100))+'%';
  byId('v124-creator-progress').style.width=Math.min(100,Math.max(0,Number(g.creator)/goal*100))+'%';
  safeText('v124-clock',fmtTime(g.remaining));safeText('v124-round','Rodada '+g.round+' · Meta '+goal);
  safeText('v124-phase',(rt.paused?'PAUSADA · ': '')+({'playing':'EM COMBATE',finished:'FINALIZADA',idle:'AGUARDANDO'}[g.phase]||String(g.phase||'—').toUpperCase()));
  const combat=rt.combat||{};safeText('v124-boss',combat.active?'Chefão fase '+(combat.stage||1)+' · '+(combat.hp||0)+'/'+(combat.maxHp||0)+' HP':'Chefão inativo');
  safeText('v124-tower-chat',combat.towers&&combat.towers.chat?combat.towers.chat.hp+'/'+combat.towers.chat.maxHp:'—');
  safeText('v124-tower-creator',combat.towers&&combat.towers.creator?combat.towers.creator.hp+'/'+combat.towers.creator.maxHp:'—');
  safeText('v124-conn','TikTok: '+(rt.connectStatus||'inativo'));
  const diag=rt.liveDiagnostics||null;
  const accepted=diag&&diag.accepted||{};
  safeText('v125-live',diag?'TikTok V12.5 • eventos: '+Object.values(accepted).reduce((a,b)=>a+(Number(b)||0),0)+' • reconexões: '+(diag.reconnectScheduled||0)+' • duplicados: '+(diag.duplicates||0):'TikTok V12.5 • sem conexão externa');
  const v=rt.advanced&&rt.advanced.visualMode||'economico';
  safeText('v124-visual-msg','Perfil atual: '+v);
  controls.forEach(b=>{const a=b.dataset.v124Action;if(a.startsWith('visual'))b.setAttribute('aria-pressed',String(a.toLowerCase().endsWith(v.toLowerCase())))});
  if(!formLoaded){for(const k of ['goal','duration','start','botSpeed']){const el=byId('v124-'+k);if(el&&cf[k]!=null)el.value=cf[k]}formLoaded=true}
 }
 function renderHealth(h){
  if(!h)return;
  safeText('v124-server',h.ok?'Online':'Indisponível');safeText('v124-memory',(h.memoryMB||0)+' MB');
  safeText('v124-uptime',fmtTime(h.uptimeSeconds));safeText('v124-sse',h.sseClients);safeText('v124-heap',(h.heapUsedMB||0)+' MB');
  safeText('v124-runtime',h.mode||'local');safeText('v124-mode','Modo: '+(h.mode||'local').toUpperCase());
  memory.push(Math.max(0,Number(h.memoryMB)||0));if(memory.length>30)memory.shift();
  const chart=byId('v124-memory-chart');chart.replaceChildren();const max=Math.max(32,...memory);
  for(const n of memory){const bar=document.createElement('i');bar.style.height=Math.max(7,Math.min(100,n/max*100))+'%';bar.title=n+' MB';chart.appendChild(bar)}
 }
 function renderLogs(logs){
  const ul=byId('v124-logs');ul.replaceChildren();
  if(!Array.isArray(logs)||!logs.length){const li=document.createElement('li');li.textContent='Nenhum evento recente.';ul.appendChild(li);return}
  for(const x of logs.slice(0,12)){const li=document.createElement('li');li.textContent=typeof x==='string'?x:JSON.stringify(x).slice(0,240);ul.appendChild(li)}
 }
 async function poll(){
  if(document.hidden)return;
  try{
   const results=await Promise.all([fetch('/state',{cache:'no-store'}),fetch('/health',{cache:'no-store'})]);
   if(results.some(r=>!r.ok))throw Error('Servidor retornou HTTP '+results.map(r=>r.status).join('/'));
   const [state,health]=await Promise.all(results.map(r=>r.json()));
   publicData=state;render(state);renderHealth(health);
   safeText('v124-updated','Atualizado às '+new Date().toLocaleTimeString('pt-BR'));
   byId('v124-updated').dataset.kind='good';
   if(unlocked){
    const r=await fetch('/admin/v124/status',{cache:'no-store',headers:{'X-LivePulse-Key':adminToken}});
    if(r.status===403){adminToken='';sessionStorage.removeItem('lp55_admin');setLock(false);msg('v124-command-msg','Sessão expirada. Desbloqueie novamente.',true)}
    else if(r.ok){diagnostics=await r.json();renderLogs(diagnostics.events)}
   }
  }catch(err){safeText('v124-server','Sem conexão');safeText('v124-updated','Falha: '+err.message);byId('v124-updated').dataset.kind='bad'}
 }
 async function unlock(){
  const key=adminToken||prompt('Cole a chave de administrador mostrada no Termux:');if(!key)return;
  try{
   const r=await fetch('/admin/v124/status',{headers:{'X-LivePulse-Key':key},cache:'no-store'});
   if(!r.ok)throw Error(r.status===403?'Chave inválida':'HTTP '+r.status);
   adminToken=key;sessionStorage.setItem('lp55_admin',key);diagnostics=await r.json();setLock(true);
   msg('v124-command-msg','Painel desbloqueado neste navegador.');renderLogs(diagnostics.events);poll();
  }catch(e){adminToken='';sessionStorage.removeItem('lp55_admin');setLock(false);msg('v124-command-msg',e.message,true)}
 }
 byId('v124-login').onclick=()=>{if(!unlocked)unlock();else msg('v124-command-msg','Painel já está desbloqueado.')};
 byId('v124-lock').onclick=()=>{adminToken='';sessionStorage.removeItem('lp55_admin');setLock(false);msg('v124-command-msg','Painel bloqueado.')};
 byId('v124-reload').onclick=poll;
 const confirmActions={finish:'Encerrar a rodada atual? Esta ação interfere no resultado da batalha.',bossHide:'Remover o chefão atual?'};
 controls.forEach(b=>b.onclick=async()=>{
  if(!unlocked||busy)return;
  const action=b.dataset.v124Action;
  if(confirmActions[action]&&!confirm(confirmActions[action]))return;
  busy=true;b.disabled=true;msg('v124-command-msg','Enviando comando: '+action+'...');
  try{
   const r=await adminFetch('/admin',{action});const body=await r.text();if(!r.ok)throw Error(body);
   msg('v124-command-msg','✅ '+body);await poll();
  }catch(err){msg('v124-command-msg','⚠ '+err.message,true)}
  finally{busy=false;b.disabled=!unlocked}
 });
 byId('v124-config-save').onclick=async()=>{
  if(!unlocked||!latestConfig||busy)return;
  const c=JSON.parse(JSON.stringify(latestConfig));
  for(const k of ['goal','duration','start','botSpeed'])c[k]=Number(byId('v124-'+k).value);
  if(!Number.isInteger(c.goal)||c.goal<20||c.goal>100000||!Number.isInteger(c.duration)||c.duration<20||c.duration>3600||!Number.isInteger(c.start)||c.start<0||c.start>=c.goal||!Number.isInteger(c.botSpeed)||c.botSpeed<300||c.botSpeed>20000){msg('v124-config-msg','Revise a meta, duração, pontos iniciais e velocidade dos bots.',true);return}
  if(!confirm('Salvar configurações e REINICIAR a rodada?'))return;
  busy=true;byId('v124-config-save').disabled=true;
  try{const r=await adminFetch('/config',c);const v=await r.text();if(!r.ok)throw Error(v);latestConfig=c;formLoaded=false;msg('v124-config-msg','✅ Configuração salva. Rodada reiniciada.');await poll()}
  catch(e){msg('v124-config-msg','⚠ '+e.message,true)}finally{busy=false;byId('v124-config-save').disabled=!unlocked}
 };
 byId('v124-export').onclick=()=>{
  if(!publicData){msg('v124-command-msg','Aguarde carregar os dados.',true);return}
  const g=publicData.game||{},rt=publicData.runtime||{};
  const payload={version:'12.4',generatedAt:new Date().toISOString(),diagnostics:diagnostics?{version:diagnostics.version,mode:diagnostics.mode,tiktok:diagnostics.tiktok,uptimeSeconds:diagnostics.uptimeSeconds,memoryMB:diagnostics.memoryMB,heapUsedMB:diagnostics.heapUsedMB,sseClients:diagnostics.sseClients}:null,game:{chat:g.chat,creator:g.creator,round:g.round,remaining:g.remaining,phase:g.phase,winsChat:g.winsChat,winsCreator:g.winsCreator},paused:!!rt.paused,combat:rt.combat?{active:rt.combat.active,stage:rt.combat.stage,hp:rt.combat.hp,maxHp:rt.combat.maxHp}:null,memorySamplesMB:memory.slice()};
  const objectUrl=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=objectUrl;a.download='livepulse_diagnostico_v124.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)
 };
 if(adminToken){fetch('/admin/v124/status',{headers:{'X-LivePulse-Key':adminToken},cache:'no-store'}).then(r=>{if(r.ok){setLock(true);return r.json()}setLock(false);adminToken='';sessionStorage.removeItem('lp55_admin');return null}).then(x=>{if(x){diagnostics=x;renderLogs(x.events)}}).catch(()=>setLock(false))}
 setInterval(poll,3000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});poll();
})();

/* V12.8: preserve old report links via authenticated downloads, without exposing key in URL. */
window.v128Export=function(event,kind){
 if(event&&event.preventDefault)event.preventDefault();
 (async()=>{
  try{
   if(!adminToken){alert('Desbloqueie o painel com a chave administrativa antes de exportar.');return}
   const url=kind==='csv'?'/report.csv':'/diagnostics';
   const response=await fetch(url,{cache:'no-store',headers:{'X-LivePulse-Key':adminToken}});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.blob();
   const objectUrl=URL.createObjectURL(data);
   const a=document.createElement('a');a.href=objectUrl;
   a.download=kind==='csv'?'livepulse_comunidade.csv':'livepulse_diagnostico_v128.json';
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)
  }catch(err){alert('Falha ao exportar: '+err.message)}
 })();
 return false;
};

/* V12.9: independent cinematic art diagnostics, read only. */
window.v129ArtAudit=function(){
 const mode=typeof v60mode==='string'?v60mode:'unknown';
 const boss=document.getElementById('bossSprite');
 const towers=[...document.querySelectorAll('.towers .tower')];
 return {version:'12.9.4',mode:mode,frames:window.v112Tick||0,
  bossLoaded:!!(boss&&boss.naturalWidth),bossAsset:boss?boss.getAttribute('src'):null,
  towerAssets:towers.map(x=>x.dataset.v112sprite||null),
  giftCount:document.querySelectorAll('#gchat .gift,#gcreator .gift').length,
  spritesIndependent:true};
};
</script></html>`;
// V12.8: SSE heartbeat handled only by v126HeartbeatMs (one timer per server).
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');res.setHeader('X-Content-Type-Options','nosniff');if(['/admin','/config'].includes(u.pathname)&&req.method==='POST'&&!authorized(req,u)){res.writeHead(403);return res.end('Chave de administrador inválida')}if(u.pathname==='/'||u.pathname==='/overlay'||u.pathname==='/painel'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html)}if(u.pathname==='/sprites'){const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'livepulse_visual','manifest.json'),'utf8'));const items=Object.keys(manifest.sprites).map(n=>'<div><img loading="lazy" src="/visual_assets/'+n+'.png"><small>'+n+'</small></div>').join('');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end('<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sprites LivePulse V5.6</title><style>body{background:#100c20;color:white;font:14px sans-serif;padding:15px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(125px,1fr));gap:12px}main div{background:#302044;padding:9px;border-radius:9px;text-align:center}img{width:100%;height:110px;object-fit:contain}small{display:block;word-break:break-word}</style><h2>Sprites LivePulse V5.6</h2><p>Os 15 presentes originais continuam preservados.</p><main>'+items+'</main></html>')}
if(/^\/visual_assets\/[a-z0-9_]+\.png$/.test(u.pathname)){
 const p=path.join(__dirname,'livepulse_visual',path.basename(u.pathname));let st;
 try{st=fs.statSync(p);if(!st.isFile())throw Error('not file')}catch(_){res.writeHead(404);return res.end('Sprite ausente')}
 const etag='W/"'+st.size+'-'+Math.round(st.mtimeMs)+'"';
 res.setHeader('ETag',etag);res.setHeader('Cache-Control','public, max-age=3600');
 if(req.headers['if-none-match']===etag){v126ServerPerf.asset304++;res.writeHead(304);return res.end()}
 v126ServerPerf.asset200++;res.setHeader('Content-Type','image/png');
 return fs.createReadStream(p).on('error',e=>{if(!res.headersSent){res.writeHead(500);res.end('Erro ao carregar sprite')}else res.destroy(e)}).pipe(res)
}
if(['/diagnostics','/report.csv'].includes(u.pathname)&&!authorized(req,u)){res.writeHead(403,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({error:'Chave de administrador necessaria'}))}
if(u.pathname==='/diagnostics'){res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({version:'12.8',uptimeSeconds:Math.round(process.uptime()),memoryMB:Math.round(process.memoryUsage().rss/1048576),heapUsedMB:Math.round(process.memoryUsage().heapUsed/1048576),heapTotalMB:Math.round(process.memoryUsage().heapTotal/1048576),tiktokStatus:runtime.connectStatus||'inativo',connected:runtime.connectStatus,clients:clients.size,users:Object.keys(community.users).length,mode:demo?'demo':username?'live':'idle',lastEvents:runtime.logs.slice(0,8)}))}
if(u.pathname==='/report.csv'){const esc=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const lines=['usuario,xp,titulo,visitas,presentes,curtidas,compartilhamentos,seguidores'];for(const [name,p] of Object.entries(community.users))lines.push([name,p.xp,profileTitle(p),p.visits,p.gifts,p.likes,p.shares,p.follows].map(esc).join(','));res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="livepulse_comunidade.csv"'});return res.end('\uFEFF'+lines.join('\\n'))}

if(u.pathname==='/admin/v124/status'&&req.method==='GET'){
 if(!authorized(req,u)){res.writeHead(403,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});return res.end(JSON.stringify({error:'Autenticacao necessaria'}))}
 const mem=process.memoryUsage();const snapshot=publicState();
 res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
 return res.end(JSON.stringify({version:'12.8',serverTime:Date.now(),mode:offlineTikTok?'simulacao-tiktok':demo?'demo':username?'tiktok':'local',tiktok:runtime.connectStatus||'inativo',tiktokDiagnostics:runtime.liveDiagnostics||null,uptimeSeconds:Math.round(process.uptime()),memoryMB:Math.round(mem.rss/1048576),heapUsedMB:Math.round(mem.heapUsed/1048576),sseClients:clients.size,game:{chat:game.chat,creator:game.creator,winsChat:game.winsChat,winsCreator:game.winsCreator,round:game.round,remaining:game.remaining,phase:game.phase,paused:runtime.paused,goal:cfg.goal},combat:{active:!!combat.active,stage:combat.stage,hp:combat.hp,maxHp:combat.maxHp,towers:combat.towers},visualMode:advanced.visualMode||'economico',events:runtime.logs.slice(0,12)}))
}
if(u.pathname==='/preflight'&&req.method==='GET'){
 const essential=[
  'batalha.js','economia_v1294.js','tiktok_bridge_v125.js','tiktok_sim_v125.js',
  'batalha_assets/chat0.png','batalha_assets/creator0.png',
  'livepulse_visual/v127_dragon_chat_aura.png','livepulse_visual/v127_dragon_creator_aura.png',
  'livepulse_visual/v127_boss_sigil_1.png','livepulse_visual/v127_boss_sigil_2.png','livepulse_visual/v127_boss_sigil_3.png',
  'livepulse_visual/v127_tower_chat_aura.png','livepulse_visual/v127_tower_creator_aura.png',
  'livepulse_visual/v127_victory_burst.png',
  'livepulse_visual/v129_environment.png','livepulse_visual/v129_foreground_mist.png',
  'livepulse_visual/v129_dragon_chat_idle_0.png','livepulse_visual/v129_boss_3_idle_0.png',
  'livepulse_visual/v129_tower_creator_idle_0.png',
   'livepulse_visual/v129_boss_1_idle_0.png','livepulse_visual/v129_dragon_creator_idle_0.png','livepulse_visual/v129_tower_chat_idle_0.png'];
 const assets=essential.map(name=>{
  try{const st=fs.statSync(path.join(__dirname,name));return {name,ok:st.isFile()&&st.size>100}}
  catch(_){return {name,ok:false}}
 });
 const requiredState=['batalha_config.json','batalha_runtime_v49.json','batalha_stats_v51.json'];
 const state=requiredState.map(name=>{
  try{const data=fs.readFileSync(path.join(__dirname,name),'utf8');JSON.parse(data);return {name,exists:true,jsonValid:true}}
  catch(err){return {name,exists:fs.existsSync(path.join(__dirname,name)),jsonValid:false}}
 });
 let writable=false;try{fs.accessSync(__dirname,fs.constants.W_OK);writable=true}catch(_){}
 const ok=assets.every(a=>a.ok)&&writable;
 res.writeHead(ok?200:503,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
 return res.end(JSON.stringify({ok,version:'12.9.4',mode:offlineTikTok?'simulacao-tiktok':demo?'demo':username?'tiktok':'local',offlineValidationOnly:true,liveTikTokValidated:false,
  assets,state,writable,animationLayersPresent:assets.filter(a=>a.name.includes('v127_')).every(a=>a.ok),
  artV129Ready:assets.filter(a=>a.name.includes('v129_')).every(a=>a.ok),
  round:game.round,phase:game.phase,paused:runtime.paused,visualMode:advanced.visualMode||'economico',sseClients:clients.size,
  warnings:state.filter(a=>a.exists&&!a.jsonValid).map(a=>'JSON invalido: '+a.name)}))
}
if(u.pathname==='/health'){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.end(JSON.stringify({ok:true,version:'12.9.4',release:'balanceamento-economia-segura',mode:offlineTikTok?'simulacao-tiktok':demo?'demo':username?'tiktok':'local',connectStatus:runtime.connectStatus||'inativo',tiktokBridgeVersion:'12.5',tiktokDiagnostics:runtime.liveDiagnostics||null,paused:runtime.paused,round:game.round,phase:game.phase,combatActive:combat.active,bossStage:combat.stage,sseClients:clients.size,uptimeSeconds:Math.floor(process.uptime()),memoryMB:Math.round(process.memoryUsage().rss/1048576),heapUsedMB:Math.round(process.memoryUsage().heapUsed/1048576),heapTotalMB:Math.round(process.memoryUsage().heapTotal/1048576),economy:economy.snapshot(cfg),performance:{version:"12.9.4",asset200:v126ServerPerf.asset200,asset304:v126ServerPerf.asset304,sseHeartbeats:v126ServerPerf.sseHeartbeats,eventLoopLagMs:v126ServerPerf.eventLoopLagMs,eventLoopLagMaxMs:v126ServerPerf.eventLoopLagMaxMs}}))}if(u.pathname==='/state'){res.setHeader('Cache-Control','no-store, no-cache, must-revalidate');res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({game,config:cfg,runtime:publicState()}))}if(u.pathname==='/admin'&&req.method==='POST'){let body='';req.on('data',x=>{body+=x;if(body.length>1024)req.destroy()});req.on('end',()=>{try{const {action}=JSON.parse(body);if(!['pause','start','finish','boss','mission','missionCreator','surprise','duel','pollStart','pollEnd','bossPhase','bossHide','skillChat','skillCreator','shieldChat','shieldCreator','combatTestHit','combatTestAttack','combatTestShield','visualTest','visualTestVictory','raffleDraw','themeOriginal','themeNeon','themeGold','visualEconomico','visualEquilibrado','visualCinematografico'].includes(action))throw Error('Ação inválida');if(action==='bossPhase')bossStage();else if(action==='bossHide')hideBoss();else if(action==='skillChat')useSkill('chat');else if(action==='skillCreator')useSkill('creator');else if(action==='shieldChat')combatShield('chat');else if(action==='shieldCreator')combatShield('creator');else if(action==='combatTestHit'){if(!demo)throw Error('Teste permitido apenas no modo DEMO');combatHit('Bot_Teste','creator',250)}else if(action==='combatTestAttack'){if(!demo)throw Error('Teste permitido apenas no modo DEMO');if(!combat.active)throw Error('Invoque o chefão primeiro');combat.nextAttack=0;combatAttack()}else if(action==='visualTest'){if(!demo)throw Error('Apenas no modo DEMO');emit({combatAttack:{team:'creator',stage:combat.stage||1,damage:18,blocked:0,ts:Date.now()}})}else if(action==='visualTestVictory'){if(!demo)throw Error('Apenas no modo DEMO');emit({combatVictory:{winner:'chat',best:'Bot_Teste',reward:100}})}else if(action==='combatTestShield'){if(!demo)throw Error('Teste permitido apenas no modo DEMO');combatShield('creator')}else if(action==='raffleDraw')raffleDraw();else if(action.startsWith('visual')){advanced.visualMode={visualEconomico:'economico',visualEquilibrado:'equilibrado',visualCinematografico:'cinematografico'}[action];saveAdvanced();emit({visualMode:advanced.visualMode})}else if(action.startsWith('theme')){advanced.theme=action.slice(5).toLowerCase();saveAdvanced();emit({theme:advanced.theme})}else if(action==='pollStart')startPoll();else if(action==='pollEnd')endPoll();else if(action==='pause')runtime.paused=!runtime.paused;else if(action==='start'){if(game.phase!=='playing'){reset()}runtime.paused=false}else if(action==='finish')finish('manual');else if(action==='boss')combatStart();else if(action==='mission'||action==='missionCreator')special('mission',action==='mission'?'chat':'creator');else if(action==='surprise')special('surprise');else if(action==='duel'){if(!duelStart())throw Error('São necessários dois apoiadores com pontuação')}log('controle',action);emit({game,runtime:publicState()});saveRuntime();res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end('OK: '+action)}catch(e){res.writeHead(400);res.end(e.message)}});return}
if(u.pathname==='/config'&&req.method==='POST'){let body='';req.on('data',c=>{body+=c;if(body.length>20000)req.destroy()});req.on('end',()=>{try{const x=economyCore.normalizeConfig(JSON.parse(body));if(!valid(x)||![3,5,7].includes(x.bestOf))throw Error('Configuração inválida');cfg=x;fs.writeFileSync(configPath,JSON.stringify(cfg,null,2));reset();emit({config:cfg,game});res.end('OK')}catch(e){res.writeHead(400);res.end(e.message)}});return}if(u.pathname==='/events'){if(clients.size>=32){res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Retry-After':'5'});return res.end('Limite de conexoes do painel atingido')}res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});clients.add(res);res.write('data: '+JSON.stringify({game,config:cfg,runtime:publicState()})+'\n\n');req.on('close',()=>clients.delete(res));res.on('close',()=>clients.delete(res));return}if(/^\/assets\/(chat[0-6]|creator[0-7])\.png$/.test(u.pathname)){
 const p=path.join(__dirname,'batalha_assets',path.basename(u.pathname));let st;
 try{st=fs.statSync(p);if(!st.isFile())throw Error('not file')}catch(_){res.writeHead(404);return res.end('Icone ausente')}
 const etag='W/"'+st.size+'-'+Math.round(st.mtimeMs)+'"';
 res.setHeader('ETag',etag);res.setHeader('Cache-Control','public, max-age=1800');
 if(req.headers['if-none-match']===etag){v126ServerPerf.asset304++;res.writeHead(304);return res.end()}
 v126ServerPerf.asset200++;res.setHeader('Content-Type','image/png');
 return fs.createReadStream(p).on('error',e=>{if(!res.headersSent){res.writeHead(500);res.end('Erro ao carregar presente')}else res.destroy(e)}).pipe(res)
}res.writeHead(404);res.end('Not found')});
server.listen(3001,'127.0.0.1',()=>{console.log('LivePulse V12.9.4: http://127.0.0.1:3001/painel (painel) | /overlay (arena)');console.log('CHAVE ADMINISTRADOR: '+adminKey)});
if(demo&&!offlineTikTok){setTimeout(()=>{if(game.phase!=='playing'){reset();runtime.paused=false;emit({game,runtime:publicState()})}},1600);const bots=['Bot_Rosa','Bot_Coracao','Bot_Chat','Bot_Criador','Bot_Seguidor','Bot_Turbo','Bot_Cookies','Bot_Coroa','Bot_Bloco','Bot_Laco','Bot_Virada','Bot_Resgate'];let i=0;setInterval(()=>{const k=i++%bots.length;if(k===4)event('follow',bots[k],'Começou a seguir');else if(k===0)socialEvent('enter',bots[k],'Entrou na LIVE');else if(k===6)socialEvent('share',bots[k],'Compartilhou a LIVE');else if(k===8)socialEvent('like',bots[k],'Enviou curtidas',25);else if(k===2||k===3||k===10)event('chat',bots[k],k===3?'!criador':'!chat');else{const team=(Math.floor(i/2)%2===0)?'chat':'creator',idx=Math.floor(i/2)%7;event('gift',bots[k],cfg[team+'Names'][idx],1,team,idx)}},cfg.botSpeed)}
else if(username||offlineTikTok){
 try{
  const {createBridge}=require('./tiktok_bridge_v125');
  const connector=offlineTikTok?new (require('./tiktok_sim_v125').OfflineTikTokSimulator)():new (require('tiktok-live-connector').WebcastPushConnection)(username.slice(1));
  const liveBridge=createBridge(connector,{
   onStatus:snap=>{runtime.connectStatus=snap.status;runtime.liveDiagnostics=snap;},
   onError:message=>log('tiktok','Aviso de conexão/evento: '+message),
   onConnected:()=>log('tiktok',offlineTikTok?'Simulador TikTok conectado':'Conectado'),
   onDisconnected:()=>log('tiktok','Conexão interrompida; reconexão programada'),
   onStreamEnd:()=>log('tiktok','LIVE encerrada; reconexão cancelada'),
   onChat:({user,message})=>event('chat',user,message),
   onFollow:({user})=>event('follow',user,'Começou a seguir'),
   onEnter:({user})=>socialEvent('enter',user,'Entrou na LIVE'),
   onShare:({user})=>socialEvent('share',user,'Compartilhou a LIVE'),
   onLike:({user,count})=>socialEvent('like',user,'Enviou curtidas',count),
   onGift:({user,name,id,count,image})=>{
    if(id!==null){
     if(v121SafeGiftImage(image))advanced.giftImages[id]=image;
     if(!community.giftCatalog[id]){community.giftCatalog[id]={id,name,firstSeen:Date.now(),image:null};log('presente','Novo presente observado: '+name+' ('+id+')')}
    }
    const found=giftMatch(name,id);
    if(found)event('gift',user,name,count,found.team,found.idx);
    else {economy.unmapped(name,id,'ID ausente ou nome ambiguo');log('presente','Presente aguardando mapeamento ID: '+String(id??'sem ID')+' / '+name);event('gift',user,name,count);}
   }
  },offlineTikTok?{retryBaseMs:200,retryMaxMs:4000}:{});
  runtime.liveBridgeV125=liveBridge.snapshot().version;
  liveBridge.connect();
  process.once('exit',()=>{liveBridge.stop();if(offlineTikTok)connector.stop()});
 }catch(e){runtime.connectStatus='indisponível';log('tiktok','Conector indisponível: '+String(e&&e.message||e).slice(0,160));}
}
