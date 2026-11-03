'use strict';
/* Offline contract tests: never import tiktok-live-connector or access the network. */
const assert=require('node:assert/strict');
const EventEmitter=require('node:events');
const {createBridge}=require('./tiktok_bridge_v125');
class Fake extends EventEmitter {constructor(){super();this.calls=0;this.fail=false} connect(){this.calls++;if(this.fail)return Promise.reject(new Error('offline simulated network loss'));return Promise.resolve({roomId:'offline'})}}
let clock=100000,seq=0;const tasks=new Map();
const timer=(f,ms)=>{const n=++seq;tasks.set(n,{f,ms});return n};
const untimer=n=>tasks.delete(n);
const tick=()=>{const first=tasks.entries().next();assert.equal(first.done,false);tasks.delete(first.value[0]);first.value[1].f();return first.value[1].ms};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
const f=new Fake(),seen={chat:[],gift:[],like:[],follow:[],share:[],enter:[],status:[],error:[]};
const bridge=createBridge(f,{
 onChat:x=>seen.chat.push(x),onGift:x=>seen.gift.push(x),onLike:x=>seen.like.push(x),
 onFollow:x=>seen.follow.push(x),onShare:x=>seen.share.push(x),onEnter:x=>seen.enter.push(x),
 onStatus:x=>seen.status.push(x.status),onError:x=>seen.error.push(x)
},{now:()=>clock,setTimeout:timer,clearTimeout:untimer,retryBaseMs:3000,retryMaxMs:60000});
let checks=0;
function ok(name,cond){checks++;assert.ok(cond,name);console.log('OK | '+name)}
(async()=>{
 bridge.connect();bridge.connect();await flush();ok('Apenas uma conexao simultanea',f.calls===1&&bridge.snapshot().status==='conectado');
 f.emit('chat',{msgId:'1',uniqueId:'João',comment:'!chat'});
 f.emit('chat',{msgId:'1',uniqueId:'João',comment:'!chat'});
 ok('Comentario duplicado rejeitado',seen.chat.length===1&&seen.chat[0].message==='!chat');
 f.emit('chat',{msgId:'2',uniqueId:'João',comment:'!criador'});
 ok('Votos CHAT e CRIADOR preservados',seen.chat.length===2&&seen.chat[1].message==='!criador');
 f.emit('like',{msgId:'like1',uniqueId:'Ana',likeCount:20000});
 f.emit('like',{msgId:'like1',uniqueId:'Ana',likeCount:20000});
 ok('Curtidas limitadas e deduplicadas',seen.like.length===1&&seen.like[0].count===1000);
 f.emit('like',{msgId:'like2',uniqueId:'Ana',likeCount:-5});
 ok('Curtidas invalidas normalizadas',seen.like.at(-1).count===1);
 f.emit('follow',{msgId:'fol1',uniqueId:'Bot'});
 f.emit('follow',{msgId:'fol1',uniqueId:'Bot'});
 f.emit('share',{msgId:'shr1',uniqueId:'Bot'});
 ok('Seguir e compartilhar tratados',seen.follow.length===1&&seen.share.length===1);
 f.emit('member',{msgId:'mem1',uniqueId:'Bot'});
 f.emit('roomUser',{msgId:'ru1',uniqueId:'Bot'});
 ok('Entradas tratadas',seen.enter.length===2);
 const g={msgId:'gift1',uniqueId:'Ana',giftId:123,giftName:'Rosa',giftType:1,repeatCount:4,repeatEnd:false};
 f.emit('gift',g);ok('Combo intermediario nao pontua',seen.gift.length===0);
 f.emit('gift',{...g,repeatEnd:true});f.emit('gift',{...g,repeatEnd:true});
 ok('Combo final contabilizado apenas uma vez',seen.gift.length===1&&seen.gift[0].count===4);
 f.emit('gift',{msgId:'gift2',giftType:2,repeatCount:100000,giftName:'Coroa'});
 ok('Limite de 100 presentes aplicado',seen.gift.at(-1).count===100);
 f.emit('gift',{msgId:'gift-invalid',giftName:' '});
 ok('Presente sem nome rejeitado',seen.gift.length===2);
 f.emit('chat',null);ok('Evento malformado rejeitado',bridge.snapshot().invalid>=2);
 const before=bridge.snapshot();ok('Metricas de eventos e duplicatas',before.duplicates===4&&before.unfinishedCombos===1&&before.accepted.chat===2);
 f.emit('disconnected');ok('Desconexao programa retry',bridge.snapshot().retryScheduled&&bridge.snapshot().nextRetryMs===3000);
 f.emit('disconnected');ok('Sem temporizadores de reconexao duplicados',tasks.size===1);
 ok('Backoff inicial de 3 segundos',tick()===3000);await flush();ok('Reconectado apos desconexao',f.calls===2&&bridge.snapshot().connected===true);
 f.fail=true;f.emit('disconnected');tick();await flush();ok('Falha de conexao leva ao backoff',bridge.snapshot().status==='reconectando'&&bridge.snapshot().nextRetryMs===6000);
 f.fail=false;ok('Backoff de 6 segundos',tick()===6000);await flush();ok('Reconecta e zera tentativas',bridge.snapshot().status==='conectado'&&bridge.snapshot().attempt===0);
 f.emit('disconnected');ok('Retry pendente antes do encerramento',tasks.size===1);
 f.emit('streamEnd');ok('Encerramento cancela retry',tasks.size===0&&bridge.snapshot().ended===true);
 const calls=f.calls;bridge.connect();f.emit('chat',{msgId:'after',comment:'!chat'});await flush();ok('Nao aceita eventos depois do encerramento',f.calls===calls&&seen.chat.length===2);
 bridge.stop();ok('Parada cancela timers',tasks.size===0);
 // Separate connector verifies late resolution cannot resuscitate ended session.
 const f2=new Fake();let resolve;
 f2.connect=()=>new Promise(r=>{resolve=r});
 const b2=createBridge(f2,{}, {setTimeout:timer,clearTimeout:untimer});b2.connect();await flush();f2.emit('streamEnd');resolve({});await flush();ok('Promessa atrasada nao ressuscita LIVE encerrada',b2.snapshot().status==='live encerrada'&&!b2.snapshot().connected);
 console.log(`RESULTADO: ${checks}/${checks} testes do conector offline aprovados`);
})().catch(e=>{console.error('FALHOU | '+e.stack);process.exitCode=1});
