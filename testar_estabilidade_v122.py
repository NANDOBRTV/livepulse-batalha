#!/usr/bin/env python3
"""LivePulse V12.2: isolated DEMO soak, persistence, unclean crash recovery, SSE and memory measurements."""
import os,sys,time,json,subprocess,tempfile,shutil,urllib.request,urllib.error,threading,signal,statistics,random,socket
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DURATION=int(os.environ.get('LIVEPULSE_STRESS_SECONDS','25'))
DURATION=max(8,min(1800,DURATION))
results=[];samples=[]
def check(label,ok,detail=''):
 results.append({'test':label,'passed':bool(ok),'detail':str(detail)[:240]})
 print(('OK' if ok else 'FALHOU')+' | '+label+(' | '+str(detail)[:150] if detail else ''),flush=True)
def get(url,timeout=3):
 with urllib.request.urlopen(url,timeout=timeout) as r:return r.status,r.read()
def admin(url,key,action):
 data=json.dumps({'action':action}).encode()
 req=urllib.request.Request(url+'/admin',data=data,headers={'x-livepulse-key':key,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=5) as r:return r.status

def wait_server(url,proc,seconds=8):
 deadline=time.monotonic()+seconds
 while time.monotonic()<deadline:
  if proc.poll() is not None:return False
  try:
   if get(url+'/health',1)[0]==200:return True
  except Exception:time.sleep(.12)
 return False

with tempfile.TemporaryDirectory(prefix='livepulse_v122_soak_') as td:
 root=Path(td)
 # Use a private random loopback port to avoid colliding with an existing LivePulse server.
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0))
  port=sock.getsockname()[1]
 source=(ROOT/'batalha.js').read_text()
 original="server.listen(3001,'127.0.0.1'"
 replacement=f"server.listen({port},'127.0.0.1'"
 if original not in source:raise RuntimeError('versao incompatível: porta de teste nao localizada')
 (root/'batalha.js').write_text(source.replace(original,replacement,1))
 shutil.copy2(ROOT/'economia_v1294.js',root/'economia_v1294.js')
 print('Teste isolado na porta',port,flush=True)
 for folder in ('batalha_assets','livepulse_visual'):
  if (ROOT/folder).is_dir(): (root/folder).symlink_to(ROOT/folder,target_is_directory=True)
 cfg={'goal':100000,'duration':3600,'start':120,'botSpeed':300,'sound':False,'bestOf':3,'chatVote':1,'creatorVote':1,'followPoints':2,'chatNames':['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro'],'creatorNames':['Bloco','TikTok','Cookies','Rosquinha','Coroa','Corações Azul','Coroa Real'],'chatPoints':[1,10,30,-20,25,50,100],'creatorPoints':[1,10,30,-20,25,50,100]}
 (root/'batalha_config.json').write_text(json.dumps(cfg))
 url=f'http://127.0.0.1:{port}'
 proc=None
 def start():return subprocess.Popen(['node','batalha.js','--demo'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  proc=start();ready=wait_server(url,proc)
  check('Servidor DEMO inicia',ready)
  if not ready:raise RuntimeError('servidor DEMO nao iniciou na porta isolada '+str(port))
  keyfile=root/'batalha_admin_v55.key'
  for _ in range(40):
   if keyfile.exists():break
   time.sleep(.1)
  if not keyfile.exists():raise RuntimeError('servidor respondeu, mas chave administrativa nao foi criada')
  key=keyfile.read_text().strip()
  check('Chave administrativa criada',len(key)==48)
  h=json.loads(get(url+'/health')[1]);check('Telemetria de memoria disponivel',h.get('version') in ('12.2','12.4','12.6','12.7','12.8','12.9','12.9.2','12.9.3','12.9.4') and isinstance(h.get('heapUsedMB'),int) and isinstance(h.get('memoryMB'),int))
  check('Iniciar combate',admin(url,key,'boss')==200)
  t0=time.monotonic();requests=0;failed=0;open_sse=[]
  while time.monotonic()-t0<DURATION:
   try:
    h=json.loads(get(url+'/health')[1]);s=json.loads(get(url+'/state')[1]);requests+=2
    samples.append({'elapsed':round(time.monotonic()-t0,1),'rssMB':h['memoryMB'],'heapMB':h['heapUsedMB'],'sse':h['sseClients'],'phase':s['game']['phase']})
    if len(samples)%4==0:
     admin(url,key,random.choice(['combatTestAttack','combatTestShield','visualTest','visualTestVictory']));requests+=1
    if len(samples)%7==0:
     with urllib.request.urlopen(url+'/events',timeout=3) as stream:
      line=stream.readline();requests+=1
      if not line.startswith(b'data:'):failed+=1
   except Exception as e:
    failed+=1;print('Falha transitoria:',str(e)[:100])
   time.sleep(.35)
  check('Servidor permaneceu ativo durante teste',proc.poll() is None)
  check('Requisicoes e eventos sem falhas',failed==0 and requests>20,f'{requests} operacoes, {failed} falhas')
  check('Memoria RSS limitada durante teste',bool(samples) and max(x['rssMB'] for x in samples)<300,f"max {max(x['rssMB'] for x in samples) if samples else '?'} MB")
  check('Heap limitada durante teste',bool(samples) and max(x['heapMB'] for x in samples)<160,f"max {max(x['heapMB'] for x in samples) if samples else '?'} MB")
  check('SSE sem vazamento',json.loads(get(url+'/health')[1])['sseClients']==0)
  # Explicitly save, then simulate a hard crash, and check restored state on restart.
  admin(url,key,'pause');saved=json.loads(get(url+'/state')[1]);score=saved['game']['chat'];round_no=saved['game']['round']
  proc.kill();proc.wait(timeout=5)
  check('Interrupcao abrupta simulada',proc.returncode is not None)
  proc=start();recovered=wait_server(url,proc)
  check('Servidor reinicia apos falha',recovered)
  if recovered:
   current=json.loads(get(url+'/state')[1]);check('Pontuacao persistida',current['game']['chat']==score,f'{score} -> {current["game"]["chat"]}')
   check('Rodada persistida',current['game']['round']==round_no)
   check('Pausa persistida',current['runtime']['paused'])
   check('Chave administrativa preservada',(root/'batalha_admin_v55.key').read_text().strip()==key)
   check('Arquivos de persistencia presentes',all((root/n).is_file() for n in ['batalha_runtime_v49.json','batalha_combate_v57.json','batalha_stats_v51.json']))
   check('Recursos graficos preservados',get(url+'/visual_assets/v113_sky.png')[0]==200)
  else:check('Recuperacao completa',False,'servidor nao reiniciou')
 except Exception as e:check('Execucao completa',False,repr(e))
 finally:
  if proc is not None and proc.poll() is None:
   proc.terminate()
   try:proc.wait(timeout=5)
   except subprocess.TimeoutExpired:proc.kill();proc.wait()
report={'version':'12.2','durationSeconds':DURATION,'passed':sum(x['passed'] for x in results),'total':len(results),'results':results,'samples':samples,'scope':'isolated Node.js DEMO; simulated crash; not Android hardware or real TikTok LIVE'}
path=Path(os.environ.get('LIVEPULSE_STRESS_REPORT',str(ROOT/'relatorio_estabilidade_v122.json')))
path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('RESULTADO:',report['passed'],'/',report['total'],'testes aprovados; amostras:',len(samples),flush=True)
sys.exit(0 if report['passed']==report['total'] else 1)
