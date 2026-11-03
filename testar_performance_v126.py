#!/usr/bin/env python3
"""LivePulse V12.6 — isolated offline soak, recovery, HTTP caching, SSE and memory.
Never connects to a real TikTok LIVE; port and HOME are temporary.
"""
from pathlib import Path
import os,sys,json,time,subprocess,tempfile,shutil,socket,urllib.request,urllib.error,statistics,random
SOURCE=Path(__file__).resolve().parent
DURATION=max(8,min(1800,int(os.environ.get('LIVEPULSE_PERF_SECONDS','12'))))
checks=[];samples=[]
def check(name,ok,detail=''):
 checks.append({'name':name,'ok':bool(ok),'detail':str(detail)[:170]})
 print(('OK' if ok else 'FALHOU')+' | '+name+((' | '+str(detail)[:110]) if detail else ''),flush=True)
def request(base,route,headers=None,timeout=4):
 req=urllib.request.Request(base+route,headers=headers or {})
 try:
  with urllib.request.urlopen(req,timeout=timeout) as r:return r.status,r.read(),dict(r.headers)
 except urllib.error.HTTPError as e:return e.code,e.read(),dict(e.headers)
def wait_server(base,proc,seconds=10):
 until=time.monotonic()+seconds
 while time.monotonic()<until:
  if proc.poll() is not None:return False
  try:
   if request(base,'/health',timeout=1)[0]==200:return True
  except Exception:pass
  time.sleep(.13)
 return False

with tempfile.TemporaryDirectory(prefix='livepulse_v126_perf_') as td:
 root=Path(td)
 with socket.socket() as sock:
  sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
 base=f'http://127.0.0.1:{port}'
 src=(SOURCE/'batalha.js').read_text(encoding='utf-8')
 old="server.listen(3001,'127.0.0.1'"
 if old not in src:raise SystemExit('VERSAO INCOMPATIVEL: porta original nao encontrada')
 (root/'batalha.js').write_text(src.replace(old,f"server.listen({port},'127.0.0.1'",1),encoding='utf-8')
 for name in ('tiktok_bridge_v125.js','tiktok_sim_v125.js','economia_v1294.js'):
  if (SOURCE/name).exists():shutil.copy2(SOURCE/name,root/name)
 for name in ('livepulse_visual','batalha_assets'):
  if (SOURCE/name).is_dir():(root/name).symlink_to(SOURCE/name,target_is_directory=True)
 env={**os.environ,'LIVEPULSE_SSE_HEARTBEAT_MS':'850'}
 proc=None
 def start():return subprocess.Popen(['node','batalha.js','--demo'],cwd=root,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 try:
  proc=start();ready=wait_server(base,proc)
  check('Servidor isolado inicia',ready)
  if not ready:raise RuntimeError('Servidor nao iniciou')
  status,body,hdr=request(base,'/health');h=json.loads(body)
  check('Diagnostico V12.6',status==200 and h.get('version') in ('12.6','12.7','12.8','12.9','12.9.2','12.9.3','12.9.4') and h.get('performance',{}).get('version') in ('12.6','12.7','12.8','12.9','12.9.2','12.9.3','12.9.4'))
  check('Telemetria de loop e cache',all(k in h.get('performance',{}) for k in ('asset200','asset304','sseHeartbeats','eventLoopLagMs','eventLoopLagMaxMs')))
  status,page,hdr=request(base,'/overlay')
  check('HTML nao fica preso no cache',status==200 and 'no-store' in hdr.get('Cache-Control',''))
  check('Renderizacao com temporizador adaptativo',b'function v126SpriteLoop()' in page and b'window.v126Perf=v116Perf' in page)
  check('Configuracao evita atualizacoes redundantes',b'v126ConfigSignature' in page and b'signature===v126ConfigSignature' in page)
  check('Polling SSE continua como recuperacao',b'now-v1222Sync.lastSse<3300' in page and b'v1222Poll(true)' in page)
  status,sprite,headers=request(base,'/visual_assets/v113_sky.png');etag=headers.get('ETag','')
  check('Sprite PNG carregado com cache',status==200 and sprite.startswith(b'\x89PNG') and bool(etag) and 'max-age=' in headers.get('Cache-Control',''))
  check('Revalidacao sprite retorna 304',bool(etag) and request(base,'/visual_assets/v113_sky.png',{'If-None-Match':etag})[0]==304)
  status,png,headers=request(base,'/assets/chat0.png');etag=headers.get('ETag','')
  check('Presente PNG com cache',status==200 and png.startswith(b'\x89PNG') and bool(etag))
  check('Presente PNG 304',bool(etag) and request(base,'/assets/chat0.png',{'If-None-Match':etag})[0]==304)
  check('Estado dinamico sem cache','no-store' in request(base,'/state')[2].get('Cache-Control',''))
  # SSE ping should be a comment, not a game event.
  found_ping=False
  req=urllib.request.Request(base+'/events')
  with urllib.request.urlopen(req,timeout=6) as stream:
   until=time.monotonic()+5
   while time.monotonic()<until:
    line=stream.readline()
    if line.startswith(b': heartbeat'):
     found_ping=True;break
  check('SSE heartbeat sem eventos falsos',found_ping)
  time.sleep(.2)
  check('Clientes SSE liberados',json.loads(request(base,'/health')[1]).get('sseClients')==0)
  # Run a genuine synthetic match for configurable duration.
  failures=0;calls=0;first_remaining=None;last_remaining=None;active_seen=False
  start_time=time.monotonic()
  while time.monotonic()-start_time<DURATION:
   try:
    health=json.loads(request(base,'/health',timeout=3)[1]);game=json.loads(request(base,'/state',timeout=3)[1])['game'];calls+=2
    active_seen|=(game.get('phase')=='playing')
    remaining=game.get('remaining',0)
    if first_remaining is None:first_remaining=remaining
    last_remaining=remaining
    samples.append({'seconds':round(time.monotonic()-start_time,2),'rssMB':health['memoryMB'],'heapMB':health['heapUsedMB'],'lagMs':health['performance']['eventLoopLagMs'],'sseClients':health['sseClients'],'phase':game['phase'],'remaining':remaining})
   except Exception as e:failures+=1;print('Aviso temporario',repr(e)[:120],flush=True)
   time.sleep(.35)
  check('Servidor permanece ativo',proc.poll() is None)
  check('Consultas durante sessao sem falhas',failures==0 and calls>=20,f'{calls} consultas, {failures} falhas')
  check('Partida DEMO executando',active_seen and first_remaining!=last_remaining,f'{first_remaining}->{last_remaining}')
  max_rss=max((x['rssMB'] for x in samples),default=99999)
  max_heap=max((x['heapMB'] for x in samples),default=99999)
  check('RSS dentro do limite de teste',max_rss<300,f'Pico: {max_rss} MB')
  check('Heap dentro do limite de teste',max_heap<160,f'Pico: {max_heap} MB')
  health=json.loads(request(base,'/health')[1]);stats=health['performance']
  check('Revalidacoes registradas',stats['asset304']>=2)
  check('Heartbeat registrado',stats['sseHeartbeats']>=1)
  check('Conexoes SSE nao acumuladas',health['sseClients']==0)
  # Hard kill + restart to verify preservation.
  keyfile=root/'batalha_admin_v55.key';key_before=keyfile.read_text().strip()
  old_state=json.loads(request(base,'/state')[1]);score_before=old_state['game']['chat'];round_before=old_state['game']['round']
  # SaveRuntime is periodic; force a safe snapshot via admin pause (pause is a toggle).
  admin_req=urllib.request.Request(base+'/admin',data=json.dumps({'action':'pause'}).encode(),headers={'X-LivePulse-Key':key_before,'Content-Type':'application/json'})
  with urllib.request.urlopen(admin_req,timeout=4) as rr:pass
  saved_state=json.loads(request(base,'/state')[1]);score_before=saved_state['game']['chat'];round_before=saved_state['game']['round']
  proc.kill();proc.wait(timeout=6)
  check('Interrupcao forçada simulada',proc.returncode is not None)
  proc=start();recovered=wait_server(base,proc)
  check('Servidor reinicia apos falha',recovered)
  if recovered:
   state=json.loads(request(base,'/state')[1]);check('Pontuacao restaurada',state['game']['chat']==score_before)
   check('Rodada restaurada',state['game']['round']==round_before)
   check('Pausa restaurada',state['runtime']['paused'] is True)
   check('Chave administrativa preservada',keyfile.read_text().strip()==key_before)
  else:check('Estado recuperado',False)
 except Exception as e:check('Execucao completa',False,repr(e))
 finally:
  if proc is not None and proc.poll() is None:
   proc.terminate()
   try:proc.wait(timeout=5)
   except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
report={'version':'12.6','durationSeconds':DURATION,'passed':sum(x['ok'] for x in checks),'total':len(checks),'checks':checks,'samples':samples,'scope':'Node isolated offline DEMO, no live TikTok connection, no Android hardware measurement'}
report_path=Path(os.environ.get('LIVEPULSE_PERF_REPORT',str(SOURCE/'relatorio_performance_v126.json')))
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(f"RESULTADO V12.6: {report['passed']}/{report['total']} testes | {len(samples)} amostras | pico RAM {max((x['rssMB'] for x in samples),default=0)} MB",flush=True)
sys.exit(0 if report['passed']==report['total'] else 1)
