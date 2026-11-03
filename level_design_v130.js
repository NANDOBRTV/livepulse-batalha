'use strict';
/** LivePulse level design: non-commercial encounter rules, deterministic and testable.
 * The gift catalog, currencies and purchase/conversion settings are intentionally untouched.
 */
const RULES=Object.freeze({
  openingMs:25000,telegraphMs:4000,towerRebuildMs:12000,
  betweenRoundsMs:5500,championPauseMs:7800,
  maxAutomaticBossesPerRound:1,bossRewardRatio:0.08,
  focusDamage:10,focusCooldownMs:30000,shieldCooldownMs:45000
});
function teamName(team){return team==='creator'?'CRIADOR':team==='chat'?'CHAT':'—'}
function chooseTarget(damage,towers){
  const ready=['chat','creator'].filter(t=>towers&&towers[t]&&Number(towers[t].hp)>0);
  if(!ready.length)return null;
  if(ready.length===1)return ready[0];
  return (Number(damage&&damage.chat)||0)>=(Number(damage&&damage.creator)||0)?'chat':'creator';
}
function bossReward(goal,maxEventPoints){
  const g=Math.max(20,Number(goal)||500);
  return Math.min(Math.max(1,Math.round(g*RULES.bossRewardRatio)),Math.max(1,Number(maxEventPoints)||150));
}
function pace({phase,paused,remaining,duration,boss,roundSummoned,round,nextBossAutoAt,now=Date.now()}){
  if(paused)return 'pausado';
  if(phase==='champion'||phase==='ended')return 'resultado';
  if(phase!=='playing')return 'aguardando';
  if(remaining<=Math.min(15,Math.ceil(duration*.1)))return 'climax';
  if(boss&&boss.active)return 'chefao';
  if(roundSummoned===round)return 'recuperacao';
  if(nextBossAutoAt&&now<nextBossAutoAt)return 'confronto';
  return 'confronto';
}
module.exports={RULES,teamName,chooseTarget,bossReward,pace};
