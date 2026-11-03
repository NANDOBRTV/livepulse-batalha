'use strict';
/* Purely local LIVE event simulator. DOES NOT access TikTok or the internet. */
const {EventEmitter}=require('events');
class OfflineTikTokSimulator extends EventEmitter {
 constructor(){super();this.connects=0;this.batch=0;this.timers=[];this.isActive=false;this.cursor=0;this.speed=Math.min(3,Math.max(0.02,Number(process.env.LIVEPULSE_SIM_SPEED)||1))}
 connect(){
  this.connects++;
  this.isActive=true;
  this.batch++;
  const run=this.batch;
  this.queue(()=>{if(this.isActive)this.emit('connected',{})},35);
  const gifts=['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro','TikTok','Cookies','Coroa','Corações Azul','Coroa Real'];
  for(let i=0;i<18;i++)this.queue(()=>{
   if(!this.isActive||run!==this.batch)return;
   const idx=i%6,tag='sim-'+run+'-'+i;
   if(idx===0)this.emit('chat',{msgId:tag,uniqueId:'Bot_Chat',comment:i%2?'!criador':'!chat'});
   if(idx===1)this.emit('like',{msgId:tag,uniqueId:'Bot_Curtidas',likeCount:12});
   if(idx===2){const gift=gifts[(i+run)%gifts.length],obj={msgId:tag,uniqueId:'Bot_Presentes',giftName:gift,giftId:1000+i,giftType:1,repeatCount:3,repeatEnd:false};this.emit('gift',obj);this.emit('gift',{...obj,repeatEnd:true});this.emit('gift',{...obj,repeatEnd:true})}
   if(idx===3)this.emit('follow',{msgId:tag,uniqueId:'Bot_Seguidor'});
   if(idx===4)this.emit('share',{msgId:tag,uniqueId:'Bot_Compartilha'});
   if(idx===5)this.emit('member',{msgId:tag,uniqueId:'Bot_Visitante'});
  },600+i*800);
  this.queue(()=>{if(this.isActive&&run===this.batch){this.isActive=false;this.emit('disconnected',{reason:'simulacao offline: perda temporaria de sinal'})}},16600);
  return Promise.resolve({roomId:'SIMULADO-LOCAL'});
 }
 queue(fn,ms){const t=setTimeout(fn,Math.round(ms*this.speed));this.timers.push(t)}
 stop(){this.isActive=false;for(const timer of this.timers)clearTimeout(timer);this.timers=[]}
}
module.exports={OfflineTikTokSimulator};
