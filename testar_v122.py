#!/usr/bin/env python3
"""LivePulse V11.8 - deterministic integration tests (isolated DEMO)."""
import os,sys,time,json,subprocess,tempfile,shutil,urllib.request,urllib.error,socket,threading
from pathlib import Path
ROOT=Path(__file__).resolve().parent
HOST='http://127.0.0.1:3001'
results=[]
def check(name,condition,detail=''):
 results.append({'name':name,'pass':bool(condition),'detail':str(detail)[:200]})
 print(('OK' if condition else 'FALHOU')+' | '+name+(' | '+str(detail)[:100] if detail else ''),flush=True)
def request(path,method='GET',payload=None,key=None):
 data=json.dumps(payload).encode() if payload is not None else None
 h={'Content-Type':'application/json'}
 if key:h['x-livepulse-key']=key
 try:
  with urllib.request.urlopen(urllib.request.Request(HOST+path,data=data,headers=h,method=method),timeout=5) as r:return r.status,r.read(),dict(r.headers)
 except urllib.error.HTTPError as e:return e.code,e.read(),dict(e.headers)
def state():return json.loads(request('/state')[1])
def admin(action,key):return request('/admin','POST',{'action':action},key)
with tempfile.TemporaryDirectory(prefix='livepulse_v1241_battle_test_') as td:
 tmp=Path(td)
 # V12.4.1: isolamos cada execução em porta local exclusiva.
 # Nunca consultar 3001: ali pode estar rodando a LIVE/Painel do usuário.
 with socket.socket(socket.AF_INET,socket.SOCK_STREAM) as listener:
  listener.bind(('127.0.0.1',0))
  port=listener.getsockname()[1]
 HOST='http://127.0.0.1:'+str(port)
 source=(ROOT/'batalha.js').read_text(encoding='utf-8')
 server_port="server.listen(3001,'127.0.0.1'"
 if source.count(server_port)!=1:
  raise RuntimeError('Servidor incompatível: não foi possível isolar a porta do teste')
 (tmp/'batalha.js').write_text(source.replace(server_port,"server.listen("+str(port)+",'127.0.0.1'",1),encoding='utf-8')
 shutil.copy2(ROOT/'economia_v1294.js',tmp/'economia_v1294.js')
 print('PORTA ISOLADA | '+str(port)+' | Instância de produção preservada',flush=True)
 (tmp/'batalha_config.json').write_text(json.dumps({'goal':100000,'duration':3600,'start':120,'botSpeed':20000,'sound':False,'bestOf':3,'chatVote':1,'creatorVote':1,'followPoints':2,'chatNames':['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro'],'creatorNames':['Bloco','TikTok','Cookies','Rosquinha','Coroa','Corações Azul','Coroa Real'],'chatPoints':[1,10,30,-20,25,50,100],'creatorPoints':[1,10,30,-20,25,50,100]}))
 # Assets needed only for the HTTP asset routes.
 for folder in ('batalha_assets','livepulse_visual'):
  src=ROOT/folder
  if src.is_dir():
   (tmp/folder).symlink_to(src,target_is_directory=True)
 proc=subprocess.Popen(['node','batalha.js','--demo'],cwd=tmp,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 try:
  ready=False
  for _ in range(60):
   if proc.poll() is not None:break
   try:
    if request('/health')[0]==200:ready=True;break
   except Exception:pass
   time.sleep(.15)
  check('Servidor DEMO iniciado',ready)
  if not ready:
   raise RuntimeError('servidor do teste nao iniciou na porta isolada '+str(port)+'; saida '+str(proc.poll()))
  keyfile=tmp/'batalha_admin_v55.key'
  for _ in range(30):
   if keyfile.is_file():break
   if proc.poll() is not None:break
   time.sleep(.10)
  if not keyfile.is_file():
   raise RuntimeError('servidor de teste iniciou, mas nao criou chave administrativa temporaria')
  key=keyfile.read_text().strip()
  check('Chave administrativa protegida',len(key)==48)
  check('Admin sem chave rejeitado',admin('boss',None)[0]!=200)
  check('Ação desconhecida rejeitada',admin('naoExiste',key)[0]==400)
  h=json.loads(request('/health')[1]);check('Diagnóstico de saúde',h['ok'] and h['version'] in ('12.2','12.4','12.6','12.7','12.8','12.9','12.9.2','12.9.3','12.9.4') and h['mode']=='demo')
  check('Estado inicial válido',state()['game']['phase'] in ('playing','ready','waiting'))
  check('Iniciar rodada',admin('start',key)[0]==200)
  check('Invocar chefão',admin('boss',key)[0]==200)
  c=state()['runtime']['combat'];check('Chefão fase 1',c['active'] and c['stage']==1 and c['hp']==450)
  check('Escudo aplicado',admin('combatTestShield',key)[0]==200)
  check('Escudo CHAT aplicado',admin('shieldChat',key)[0]==200)
  c=state()['runtime']['combat'];check('Escudos atualizados',c['towers']['creator']['shield']>=65 and c['towers']['chat']['shield']>=65)
  check('Ataque simulado',admin('combatTestAttack',key)[0]==200)
  c=state()['runtime']['combat'];check('Ataque consome escudo do alvo',c['towers']['chat']['shield']<65 and c['towers']['chat']['hp']==300)
  check('Dano simulado',admin('combatTestHit',key)[0]==200)
  c=state()['runtime']['combat'];check('Dano reduz HP',c['hp']==200)
  check('Transição fase 2',admin('combatTestHit',key)[0]==200 and state()['runtime']['combat']['stage']==2)
  for _ in range(4):admin('combatTestHit',key)
  check('Transição fase 3',state()['runtime']['combat']['stage']==3)
  for _ in range(5):admin('combatTestHit',key)
  c=state()['runtime']['combat'];check('Vitória e encerramento do chefão',not c['active'] and c['kills']>=1)
  check('Histórico da vitória',len(c['history'])>=1 and c['history'][0]['winner']=='creator')
  check('Pontuação recompensa',state()['game']['creator']>=220)
  check('Pausa administrativa',admin('pause',key)[0]==200 and state()['runtime']['paused'])
  check('Retomar rodada',admin('pause',key)[0]==200 and not state()['runtime']['paused'])
  for mode in ('visualEconomico','visualEquilibrado','visualCinematografico'):
   ok=admin(mode,key)[0]==200;check('Modo '+mode,ok)
  check('Evento visual DEMO',admin('visualTest',key)[0]==200 and admin('visualTestVictory',key)[0]==200)
  # Reconnect SSE clients: open, read initial event, disconnect, open again.
  for i in range(2):
   with urllib.request.urlopen(HOST+'/events',timeout=5) as stream:
    line=stream.readline().decode();check('SSE conexão '+str(i+1),line.startswith('data: ') and 'game' in line)
   time.sleep(.08)
  check('SSE sem vazamento de clientes',json.loads(request('/health')[1])['sseClients']==0)
  # Persisted data survives a server restart.
  before=state()['runtime']['combat']['kills']
  proc.terminate();proc.wait(timeout=5)
  proc=subprocess.Popen(['node','batalha.js','--demo'],cwd=tmp,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  for _ in range(40):
   try:
    if request('/health')[0]==200:break
   except Exception:time.sleep(.15)
  check('Reinício do servidor',request('/health')[0]==200)
  check('Persistência de vitórias',state()['runtime']['combat']['kills']>=before)
  check('Ativos de versões anteriores',request('/visual_assets/v113_sky.png')[0]==200 and request('/visual_assets/v112_dragon_chat_idle_0.png')[0]==200 and request('/visual_assets/v111_boss_1_idle_0.png')[0]==200)
 except Exception as e:
  check('Execução completa',False,repr(e))
 finally:
  if proc.poll() is None:
   proc.terminate()
   try:proc.wait(timeout=5)
   except subprocess.TimeoutExpired:proc.kill()
report={'version':'12.4.1','passed':sum(x['pass'] for x in results),'total':len(results),'results':results,'scope':'Node DEMO on ephemeral loopback port; no real TikTok LIVE or Android browser tests'}
path=Path(os.environ.get('LIVEPULSE_TEST_REPORT',str(ROOT/'relatorio_testes_v122.json')))
path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('\nRESULTADO: %s/%s testes aprovados'%(report['passed'],report['total']))
sys.exit(0 if report['passed']==report['total'] else 1)
