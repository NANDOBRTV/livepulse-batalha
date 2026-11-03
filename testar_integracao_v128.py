#!/usr/bin/env python3
"""V12.8 — regressao independente e OFFLINE: interface, API, seguranca, preflight, estado e recuperacao.
Nenhum teste requer conta, rede externa ou uma LIVE real.
"""
from pathlib import Path
import sys,os,json,time,re,shutil,socket,tempfile,subprocess,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parent
checks=[]
def check(name,ok,detail=''):
 ok=bool(ok);checks.append((name,ok))
 print(('OK' if ok else 'FALHOU')+' | '+name+((' | '+str(detail)[:100]) if detail else ''),flush=True)
 if not ok:raise AssertionError(name+' '+str(detail))
def get(base,url,admin=None,method='GET',payload=None,header=None):
 headers={'Content-Type':'application/json'}
 if admin:headers['X-LivePulse-Key']=admin
 if header:headers.update(header)
 body=json.dumps(payload).encode() if payload is not None else None
 req=urllib.request.Request(base+url,headers=headers,method=method,data=body)
 try:
  with urllib.request.urlopen(req,timeout=5) as resp:return resp.status,resp.read(),dict(resp.headers)
 except urllib.error.HTTPError as e:return e.code,e.read(),dict(e.headers)
def wait(base,p):
 for _ in range(90):
  if p.poll() is not None:return False
  try:
   if get(base,'/health')[0]==200:return True
  except Exception:pass
  time.sleep(.10)
 return False

def run():
 code=(ROOT/'batalha.js').read_text('utf8')
 check('Node instalado',shutil.which('node') is not None)
 check('Motor Node.js sintaticamente valido',subprocess.run(['node','--check',str(ROOT/'batalha.js')],capture_output=True).returncode==0)
 m=re.search(r'<script>(.*?)</script>',code,re.S)
 check('JavaScript do overlay presente',m is not None)
 source=m.group(1).replace('${JSON.stringify(names)}','["Bloco"]').replace('${JSON.stringify(namesB)}','["Coroa"]').replace('${JSON.stringify(effects)}','[1]')
 with tempfile.TemporaryDirectory(prefix='livepulse_v128_js_') as td:
  script=Path(td)/'client.js';script.write_text(source)
  check('JavaScript do navegador sintaticamente valido',subprocess.run(['node','--check',str(script)],capture_output=True).returncode==0)
 check('Camadas de arena e controles mantidos',all(x in code for x in ('id="v124dashboard"','id="v127depth"','function v127Cinematic','function v126SpriteLoop')))
 check('Conector TikTok simulado preservado','--sim-tiktok' in code and "require('./tiktok_sim_v125')" in code)
 check('Apenas um temporizador de heartbeat',code.count("connection.write(': heartbeat\\n\\n')")==1 and "client.write(': heartbeat\\n\\n')" not in code)
 check('Relatorios protegidos sem mudar rotas',"['/diagnostics','/report.csv']" in code and 'window.v128Export' in code)
 check('Marcador de porta isolavel',code.count("server.listen(3001,'127.0.0.1'")==1)

 with tempfile.TemporaryDirectory(prefix='livepulse_v128_int_') as td:
  t=Path(td)
  with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
  base='http://127.0.0.1:'+str(port)
  src=code.replace("server.listen(3001,'127.0.0.1'",f"server.listen({port},'127.0.0.1'",1)
  (t/'batalha.js').write_text(src,encoding='utf8')
  for name in ['tiktok_bridge_v125.js','tiktok_sim_v125.js','economia_v1294.js']:
   shutil.copy2(ROOT/name,t/name)
  for name in ['batalha_assets','livepulse_visual']:
   try:(t/name).symlink_to(ROOT/name,target_is_directory=True)
   except OSError:shutil.copytree(ROOT/name,t/name)
  config={
   'goal':1500,'duration':180,'start':120,'chatVote':1,'creatorVote':1,'followPoints':2,
   'botSpeed':450,'sound':False,'bestOf':3,
   'chatNames':['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro'],
   'creatorNames':['Bloco','TikTok','Cookies','Rosquinha','Coroa','Corações Azul','Coroa Real'],
   'chatPoints':[1,10,30,-20,25,50,100],'creatorPoints':[1,10,30,-20,25,50,100]
  }
  (t/'batalha_config.json').write_text(json.dumps(config,ensure_ascii=False))
  env={**os.environ,'LIVEPULSE_SSE_HEARTBEAT_MS':'800'}
  def start():return subprocess.Popen(['node','batalha.js','--demo'],cwd=t,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
  proc=None
  try:
   proc=start();check('DEMO isolado inicia sem LIVE real',wait(base,proc))
   admin=(t/'batalha_admin_v55.key').read_text().strip()
   check('Chave administrativa local criada',bool(re.fullmatch('[a-f0-9]{48}',admin)))
   health=json.loads(get(base,'/health')[1])
   check('Release V12.8 publicada',health.get('version') in ('12.9','12.9.2','12.9.3','12.9.4') and health.get('performance',{}).get('version') in ('12.9','12.9.2','12.9.3','12.9.4'))
   check('Modo DEMO local confirmado',health['mode']=='demo')
   st,data,hdr=get(base,'/preflight');pre=json.loads(data)
   check('Preflight independente do TikTok',st==200 and pre['ok'] and pre['offlineValidationOnly'] and not pre['liveTikTokValidated'])
   check('Todos os recursos essenciais encontrados',len(pre['assets'])>=13 and all(x['ok'] for x in pre['assets']))
   check('Camadas cinematicas prontas',pre['animationLayersPresent'])
   check('Diretorio de dados gravavel',pre['writable'])
   check('Preflight nao expos chave',admin.encode() not in data)
   check('Preflight nao fica em cache','no-store' in hdr.get('Cache-Control',''))
   check('Configuracao de partida valida',pre['round']>=1 and pre['phase'] in ('playing','waiting','finished','ended'))
   for endpoint in ('/overlay','/painel'):
    st,content,hdr=get(base,endpoint)
    check('Interface '+endpoint+' responde',st==200 and b'LivePulse' in content)
   overlay=get(base,'/overlay')[1]
   check('Sprites e painel integrados',b'id="v127depth"' in overlay and b'id="v124dashboard"' in overlay)
   check('Links de exportacao nao perderam funcionalidade',b'v128Export(event' in overlay and b'window.v128Export' in overlay)
   check('Diagnostico privado bloqueado',get(base,'/diagnostics')[0]==403)
   check('CSV privado bloqueado',get(base,'/report.csv')[0]==403)
   check('Chave incorreta recusada nos relatorios',get(base,'/diagnostics',admin='incorrect')[0]==403)
   status,data,hdr=get(base,'/diagnostics',admin=admin)
   diag=json.loads(data)
   check('Diagnostico autenticado',status==200 and diag['version']=='12.8' and admin.encode() not in data)
   status,data,hdr=get(base,'/report.csv',admin=admin)
   check('CSV autenticado e conteudo preservado',status==200 and b'usuario,xp,titulo' in data)
   check('API do painel exige autenticação',get(base,'/admin/v124/status')[0]==403)
   status,data,_=get(base,'/admin/v124/status',admin=admin)
   private=json.loads(data)
   check('API do painel V12.8 com legado preservado',status==200 and private['version']=='12.8' and 'combat' in private)
   check('Dados da conta admin nao vazam na API',admin.encode() not in data)
   old_state=json.loads(get(base,'/state')[1]);check('Estado da arena contém equipes e vida',all(k in old_state for k in ('game','config','runtime')) and 'combat' in old_state['runtime'])
   check('Config das 14 recompensas mantida',len(old_state['config']['chatNames'])==len(old_state['config']['creatorNames'])==7)
   check('Estado sem cache no navegador','no-store' in get(base,'/state')[2].get('Cache-Control',''))
   # Game/test effects must not be exposed to unauthenticated callers.
   check('Comandos administrativos protegidos',get(base,'/admin',method='POST',payload={'action':'pause'})[0]==403)
   check('Configuracao administrativa protegida',get(base,'/config',method='POST',payload=config)[0]==403)
   check('Comando de efeito ilegal rejeitado',get(base,'/admin',admin=admin,method='POST',payload={'action':'deleteAll'})[0]==400)
   check('Modo cinematografico permanece configuravel',get(base,'/admin',admin=admin,method='POST',payload={'action':'visualCinematografico'})[0]==200)
   check('Visual cinematografico aparece no painel',json.loads(get(base,'/admin/v124/status',admin=admin)[1])['visualMode']=='cinematografico')
   st,png,head=get(base,'/visual_assets/v127_boss_sigil_3.png');etag=head.get('ETag','')
   check('PNG do chefao servido',st==200 and png.startswith(b'\x89PNG') and bool(etag))
   check('Cache PNG nao atrapalha a arena',get(base,'/visual_assets/v127_boss_sigil_3.png',header={'If-None-Match':etag})[0]==304)
   check('URL de traversal bloqueada',get(base,'/visual_assets/../../batalha_config.json')[0] in (400,404))
   # Short match ensures loading and scores continue after integrating all subsystems.
   before=json.loads(get(base,'/state')[1])['game']
   time.sleep(2.5)
   after=json.loads(get(base,'/state')[1])['game']
   check('Partida continua executando apos ajustes',after['phase']=='playing' and after['remaining']<before['remaining'])
   check('Bots em DEMO alimentam placar',after['chat']!=before['chat'] or after['creator']!=before['creator'])
   # Pause persists state; hard-kill and restart read same saved snapshot.
   check('Pausa autenticada funciona',get(base,'/admin',admin=admin,method='POST',payload={'action':'pause'})[0]==200)
   saved=json.loads(get(base,'/state')[1])['game'];paused=json.loads(get(base,'/state')[1])['runtime']['paused']
   check('Pausa efetivada',paused)
   proc.kill();proc.wait(timeout=5)
   check('Encerramento abrupto simulado',proc.poll() is not None)
   proc=start();check('Servidor recupera apos encerramento',wait(base,proc))
   recovered=json.loads(get(base,'/state')[1]);check('Pontuacao recuperada',recovered['game']['chat']==saved['chat'] and recovered['game']['creator']==saved['creator'])
   check('Numero da rodada recuperado',recovered['game']['round']==saved['round'])
   check('Pausa recuperada',recovered['runtime']['paused'])
   check('Chave admin preservada no reinicio',(t/'batalha_admin_v55.key').read_text().strip()==admin)
   check('Preflight responde apos reinicio',get(base,'/preflight')[0]==200)
  finally:
   if proc is not None and proc.poll() is None:
    proc.terminate()
    try:proc.wait(timeout=6)
    except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=6)
 total=len(checks);passed=sum(x[1] for x in checks)
 report={'version':'12.8','scope':'Testes Node.js isolados OFFLINE, sem login TikTok e sem medicao fisica de Android', 'passed':passed,'total':total,'checks':[{'name':name,'ok':ok} for name,ok in checks]}
 (ROOT/'relatorio_integracao_v128.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(f'RESULTADO V12.8 INTEGRACAO: {passed}/{total} testes aprovados',flush=True)
 return 0 if passed==total else 1
if __name__=='__main__':
 try:sys.exit(run())
 except Exception as exc:
  print('FALHOU | Execucao completa | '+repr(exc),flush=True)
  print(f'RESULTADO V12.8 INTEGRACAO: {sum(b for _,b in checks)}/{len(checks)} testes aprovados',flush=True)
  sys.exit(1)
