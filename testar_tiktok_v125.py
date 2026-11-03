#!/usr/bin/env python3
"""V12.5 end-to-end offline simulator integration. No connection to TikTok."""
import os,subprocess,tempfile,time,json,socket,urllib.request,urllib.error,sys,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parent
checks=[]
def check(name,value):
    checks.append((name,bool(value)))
    print(('OK' if value else 'FALHOU')+' | '+name,flush=True)
    if not value:raise AssertionError(name)
def get(base,path):
    with urllib.request.urlopen(base+path,timeout=5) as r:return r.status,json.loads(r.read())
def main():
    if not shutil.which('node'):raise RuntimeError('node indisponivel')
    with tempfile.TemporaryDirectory(prefix='livepulse_v125_sim_') as td:
        d=Path(td)
        s=(ROOT/'batalha.js').read_text(encoding='utf8')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
        marker="server.listen(3001,'127.0.0.1'"
        if marker not in s:raise RuntimeError('Nao foi possivel isolar porta de teste')
        (d/'batalha.js').write_text(s.replace(marker,"server.listen("+str(port)+",'127.0.0.1'",1),encoding='utf8')
        for name in ['tiktok_bridge_v125.js','tiktok_sim_v125.js','economia_v1294.js']:
            shutil.copy2(ROOT/name,d/name)
        # No node_modules and no TikTok credentials are created in this temp directory.
        config={
            'goal':100000,'duration':3600,'start':120,'botSpeed':20000,'sound':False,'bestOf':3,
            'chatVote':1,'creatorVote':1,'followPoints':2,
            'chatNames':['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro'],
            'creatorNames':['Bloco','TikTok','Cookies','Rosquinha','Coroa','Corações Azul','Coroa Real'],
            'chatPoints':[1,10,30,-20,25,50,100],
            'creatorPoints':[1,10,30,-20,25,50,100]
        }
        (d/'batalha_config.json').write_text(json.dumps(config,ensure_ascii=False),encoding='utf8')
        env={**os.environ,'LIVEPULSE_SIM_SPEED':'0.04'}
        base='http://127.0.0.1:'+str(port)
        proc=subprocess.Popen(['node','batalha.js','--sim-tiktok'],cwd=d,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        try:
            ready=False
            for _ in range(80):
                if proc.poll() is not None:break
                try:
                    if get(base,'/health')[0]==200:ready=True;break
                except Exception:time.sleep(.08)
            check('Servidor do simulador inicia sem TikTok instalado',ready)
            _,h=get(base,'/health')
            check('Modo de execucao e 100% offline',h['mode']=='simulacao-tiktok' and h['tiktokBridgeVersion']=='12.5')
            check('Diagnosticos publicam status do conector',isinstance(h.get('tiktokDiagnostics'),dict))
            _,before=get(base,'/state')
            beforegame=before['game']
            accepted={}
            end=time.monotonic()+8
            while time.monotonic()<end:
                _,h=get(base,'/health')
                stats=h.get('tiktokDiagnostics') or {}
                accepted=stats.get('accepted') or {}
                if (accepted.get('chat',0)>=2 and accepted.get('gift',0)>=1 and accepted.get('like',0)>=1
                    and accepted.get('follow',0)>=1 and accepted.get('share',0)>=1 and stats.get('reconnectScheduled',0)>=1):break
                time.sleep(.08)
            check('Comentarios simulados chegam ao jogo',accepted.get('chat',0)>=2)
            check('Presentes simulados passam pelo adaptador',accepted.get('gift',0)>=1)
            check('Curtidas simuladas chegam ao jogo',accepted.get('like',0)>=1)
            check('Seguidores simulados chegam ao jogo',accepted.get('follow',0)>=1)
            check('Compartilhamentos simulados chegam ao jogo',accepted.get('share',0)>=1)
            check('Combos intermediarios descartados',stats.get('unfinishedCombos',0)>=1)
            check('Combos repetidos deduplicados',stats.get('duplicates',0)>=1)
            check('Queda simulada provoca reconexao',stats.get('reconnectScheduled',0)>=1)
            _,state=get(base,'/state')
            check('Placar reflete votos e presentes',state['game']['chat']>beforegame['chat'] or state['game']['creator']>beforegame['creator'])
            check('Curtidas afetam estatisticas',state['runtime']['stats']['likes']>0)
            check('Seguidores afetam estatisticas',state['runtime']['stats']['followers']>0)
            check('Compartilhamentos afetam estatisticas',state['runtime']['stats']['shares']>0)
            check('Nenhuma credencial necessaria',not (d/'node_modules').exists())
            check('Saude e painel administrativos preservados',get(base,'/health')[0]==200 and b'v124dashboard' in urllib.request.urlopen(base+'/painel',timeout=4).read())
            check('Endpoint /overlay continua disponivel',urllib.request.urlopen(base+'/overlay',timeout=4).status==200)
        finally:
            proc.terminate()
            try:proc.wait(timeout=5)
            except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
    print('RESULTADO: %d/%d testes de integracao offline aprovados'%(len([a for a,b in checks if b]),len(checks)),flush=True)
    return 0
if __name__=='__main__':
    try:sys.exit(main())
    except Exception as e:
        print('FALHOU | '+repr(e),flush=True)
        print('RESULTADO: %d/%d testes aprovados'%(len([a for a,b in checks if b]),len(checks)),flush=True)
        sys.exit(1)
