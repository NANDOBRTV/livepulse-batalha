'use strict';
/* LivePulse V12.5: TikTok adapter. No network connection is made by this module.
   Connectors are provided by the caller. Same adapter for a real connector or a local mock. */
function createBridge(connector, handlers={}, options={}){
  if(!connector||typeof connector.on!=='function'||typeof connector.connect!=='function')throw Error('Conector invalido');
  const schedule=options.setTimeout||setTimeout;
  const unschedule=options.clearTimeout||clearTimeout;
  const now=options.now||Date.now;
  const base=Math.max(1,Number(options.retryBaseMs)||3000);
  const ceiling=Math.max(base,Number(options.retryMaxMs)||60000);
  const seen=new Map();
  const limit=3000,ttl=10*60*1000;
  let status='desconectado',connected=false,connecting=false,ended=false,stopped=false;
  let attempt=0,timer=null,sequence=0;
  const stats={received:{},accepted:{},duplicates:0,invalid:0,unfinishedCombos:0,connectAttempts:0,reconnectScheduled:0,disconnects:0,lastEventAt:null,lastConnectedAt:null,nextRetryMs:0};
  function incr(bucket,k){bucket[k]=(bucket[k]||0)+1}
  function snapshot(){return {version:'12.5',status,connected,connecting,ended,attempt,retryScheduled:timer!==null,...JSON.parse(JSON.stringify(stats))}}
  function notify(){if(typeof handlers.onStatus==='function')handlers.onStatus(snapshot())}
  function setStatus(value){status=value;notify()}
  function safeCall(name,...args){try{if(typeof handlers[name]==='function')handlers[name](...args)}catch(e){incr(stats.received,'handlerError');if(handlers.onError)handlers.onError(String(e&&e.message||e).slice(0,180))}}
  function identify(d){return String(d&& (d.uniqueId||d.nickname||d.user?.uniqueId||d.user?.nickname)||'Visitante').slice(0,45)}
  function mark(kind,d){
    const id=d&&(d.msgId??d.messageId??d.eventId);
    if(id===null||id===undefined||String(id)==='')return true;
    const t=now();for(const [k,ts] of seen){if(t-ts>ttl)seen.delete(k)}
    const key=kind+':'+String(id);
    if(seen.has(key)){stats.duplicates++;return false}
    seen.set(key,t);
    while(seen.size>limit)seen.delete(seen.keys().next().value);
    return true
  }
  function process(kind,d){
    if(stopped||ended)return;
    incr(stats.received,kind);
    if(!d||typeof d!=='object'||Array.isArray(d)){stats.invalid++;notify();return}
    if(kind==='gift'&&(Number(d.giftType)===1)&&d.repeatEnd===false){stats.unfinishedCombos++;notify();return}
    if(!mark(kind,d)){notify();return}
    const user=identify(d);
    try{
      if(kind==='gift'){
        const name=String(d.giftName||d.gift?.name||'').trim().slice(0,100);
        if(!name){stats.invalid++;notify();return}
        const raw=Number(d.repeatCount);
        const count=Number.isFinite(raw)?Math.max(1,Math.min(100,Math.trunc(raw))):1;
        const id=d.giftId==null?null:String(d.giftId).slice(0,50);
        const image=String(d.gift?.image?.url_list?.[0]||d.gift?.imageUrl||d.gift?.image?.url||'').slice(0,700);
        safeCall('onGift',{user,name,id,count,image});
      }else if(kind==='chat'){
        const message=String(d.comment||'').slice(0,150);
        if(!message.trim()){stats.invalid++;notify();return}
        safeCall('onChat',{user,message});
      }else if(kind==='like'){
        const raw=Number(d.likeCount);
        const count=Number.isFinite(raw)?Math.max(1,Math.min(1000,Math.trunc(raw))):1;
        safeCall('onLike',{user,count});
      }else if(kind==='follow')safeCall('onFollow',{user});
      else if(kind==='share')safeCall('onShare',{user});
      else if(kind==='member'||kind==='roomUser')safeCall('onEnter',{user});
      incr(stats.accepted,kind);stats.lastEventAt=now();notify();
    }catch(e){stats.invalid++;safeCall('onError',String(e&&e.message||e).slice(0,180))}
  }
  for(const type of ['chat','gift','like','follow','share','member','roomUser'])connector.on(type,d=>process(type,d));
  function cancelRetry(){if(timer!==null){unschedule(timer);timer=null}stats.nextRetryMs=0}
  function retry(){
    if(ended||stopped||connected||connecting||timer!==null)return;
    const delay=Math.min(ceiling,base*Math.pow(2,Math.min(attempt,10)));
    attempt++;stats.nextRetryMs=delay;stats.reconnectScheduled++;
    setStatus('reconectando');
    timer=schedule(()=>{timer=null;stats.nextRetryMs=0;connect()},delay)
  }
  function connect(){
    if(ended||stopped||connected||connecting)return;
    cancelRetry();connecting=true;const token=++sequence;stats.connectAttempts++;setStatus('conectando');
    Promise.resolve().then(()=>connector.connect()).then(()=>{
      if(token!==sequence||ended||stopped)return;
      connecting=false;connected=true;attempt=0;stats.lastConnectedAt=now();setStatus('conectado');safeCall('onConnected');
    }).catch(err=>{
      if(token!==sequence||ended||stopped)return;
      connecting=false;connected=false;safeCall('onError',String(err&&err.message||err).slice(0,180));retry();
    });
  }
  connector.on('connected',()=>{
    // Some connectors emit an event before their connect() promise resolves.
    // The promise remains the canonical source for successful initial connection.
  });
  connector.on('disconnected',()=>{
    if(ended||stopped)return;
    stats.disconnects++;connected=false;
    // Invalidate in-flight connect promises so a late success never overrides disconnect.
    if(connecting){sequence++;connecting=false}
    retry();safeCall('onDisconnected');
  });
  connector.on('streamEnd',()=>{
    if(stopped)return;
    ended=true;connected=false;connecting=false;sequence++;cancelRetry();setStatus('live encerrada');safeCall('onStreamEnd');
  });
  function stop(){stopped=true;ended=true;connected=false;connecting=false;sequence++;cancelRetry();setStatus('parado')}
  notify();
  return {connect,stop,snapshot};
}
module.exports={createBridge};
