#!/usr/bin/env python3
"""LivePulse V12.4 — teste isolado do painel (sem TikTok nem porta 3001 fixa).
Executa servidor temporario, valida autenticacao, painel e controles. Não altera dados reais.
"""
import os, sys, time, json, subprocess, tempfile, shutil, urllib.request, urllib.error, socket, re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
passes=[]
def check(name, passed, detail=''):
    passes.append((name,bool(passed)))
    print(('OK' if passed else 'FALHOU')+' | '+name+(' | '+str(detail)[:120] if detail else ''),flush=True)

def request(host, path, method='GET', payload=None, key=None):
    headers={'Content-Type':'application/json'}
    if key: headers['X-LivePulse-Key']=key
    data=json.dumps(payload).encode() if payload is not None else None
    try:
        with urllib.request.urlopen(urllib.request.Request(host+path,headers=headers,data=data,method=method),timeout=6) as resp:
            return resp.status,resp.read(),dict(resp.headers)
    except urllib.error.HTTPError as err:
        return err.code,err.read(),dict(err.headers)

def main():
    if not shutil.which('node'):
        print('ERRO | Node.js indisponivel');return 2
    if not (ROOT/'batalha.js').is_file():
        print('ERRO | batalha.js nao encontrado');return 2
    with tempfile.TemporaryDirectory(prefix='livepulse_v124_test_') as td:
        tmp=Path(td)
        src=(ROOT/'batalha.js').read_text(encoding='utf8')
        with socket.socket() as sock:
            sock.bind(('127.0.0.1',0))
            port=sock.getsockname()[1]
        original="server.listen(3001,'127.0.0.1'"
        if original not in src:
            raise RuntimeError('Porta do servidor nao localizada para isolamento')
        (tmp/'batalha.js').write_text(src.replace(original,"server.listen("+str(port)+",'127.0.0.1'",1),encoding='utf8')
        shutil.copy2(ROOT/'economia_v1294.js',tmp/'economia_v1294.js')
        (tmp/'batalha_config.json').write_text(json.dumps({
            'goal':100000,'duration':3600,'start':120,'botSpeed':20000,'sound':False,'bestOf':3,
            'chatVote':1,'creatorVote':1,'followPoints':2,
            'chatNames':['Bloco','Rosa','Coração','Rosquinha','Laço','Cachorrinho','Dinheiro'],
            'creatorNames':['Bloco','TikTok','Cookies','Rosquinha','Coroa','Corações Azul','Coroa Real'],
            'chatPoints':[1,10,30,-20,25,50,100],'creatorPoints':[1,10,30,-20,25,50,100]
        },ensure_ascii=False))
        for folder in ('batalha_assets','livepulse_visual'):
            if (ROOT/folder).is_dir():
                try:(tmp/folder).symlink_to(ROOT/folder,target_is_directory=True)
                except OSError:shutil.copytree(ROOT/folder,tmp/folder)
        host='http://127.0.0.1:'+str(port)
        proc=subprocess.Popen(['node','batalha.js','--demo'],cwd=tmp,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
        try:
            ready=False
            for _ in range(60):
                if proc.poll() is not None:break
                try:
                    if request(host,'/health')[0]==200:ready=True;break
                except Exception:time.sleep(.13)
            check('Servidor isolado inicia',ready)
            if not ready:raise RuntimeError('Servidor nao iniciou')
            key=(tmp/'batalha_admin_v55.key').read_text().strip()
            check('Chave de administrador criada',bool(re.fullmatch('[0-9a-f]{48}',key)))
            status,page,_=request(host,'/painel')
            check('Pagina dedicada /painel funciona',status==200 and b'v124dashboard' in page)
            check('Painel inclui comandos e graficos',all(x in page for x in [b'v124-memory-chart',b'v124-config-save',b'visualCinematografico',b'v124-chat-score']))
            check('Overlay original preservado',request(host,'/overlay')[0]==200)
            status,hbody,_=request(host,'/health')
            h=json.loads(hbody)
            check('Health V12.4 com diagnosticos',status==200 and h['version'] in ('12.4','12.6','12.7','12.8','12.9','12.9.2','12.9.3','12.9.4') and h['mode']=='demo' and 'sseClients' in h)
            check('Consulta privada bloqueada sem chave',request(host,'/admin/v124/status')[0]==403)
            check('Consulta privada bloqueada com chave incorreta',request(host,'/admin/v124/status',key='invalid')[0]==403)
            status,dash,_=request(host,'/admin/v124/status',key=key)
            state=json.loads(dash)
            check('Consulta privada autenticada',status==200 and state['version'] in ('12.4','12.8','12.9','12.9.2','12.9.3','12.9.4') and state['mode']=='demo')
            check('API privada nao revela chave',key.encode() not in dash)
            check('Metadados de memoria presentes',all(k in state for k in ['memoryMB','heapUsedMB','uptimeSeconds','sseClients']))
            check('Estado de chefao e torres presente',all(k in state['combat'] for k in ['active','stage','towers']))
            check('Logs privados em lista',isinstance(state['events'],list))
            check('POST de admin exige chave',request(host,'/admin','POST',{'action':'pause'})[0]==403)
            check('POST de config exige chave',request(host,'/config','POST',{})[0]==403)
            def action(a):return request(host,'/admin','POST',{'action':a},key)
            res=action('pause');q=json.loads(request(host,'/admin/v124/status',key=key)[1])
            check('Pausar rodada via painel',res[0]==200 and q['game']['paused'])
            res=action('pause');q=json.loads(request(host,'/admin/v124/status',key=key)[1])
            check('Retomar rodada via painel',res[0]==200 and not q['game']['paused'])
            check('Modo visual equilibrado via painel',action('visualEquilibrado')[0]==200 and json.loads(request(host,'/admin/v124/status',key=key)[1])['visualMode']=='equilibrado')
            check('Modo cinematografico via painel',action('visualCinematografico')[0]==200 and json.loads(request(host,'/admin/v124/status',key=key)[1])['visualMode']=='cinematografico')
            check('Modo economico via painel',action('visualEconomico')[0]==200 and json.loads(request(host,'/admin/v124/status',key=key)[1])['visualMode']=='economico')
            check('Comando ilegal rejeitado',action('dropEverything')[0]==400)
            conf=json.loads(request(host,'/state')[1])['config']
            conf['goal']=90000
            conf['botSpeed']=19000
            update=request(host,'/config','POST',conf,key)
            updated=json.loads(request(host,'/state')[1])['config']
            check('Salvar configuracoes autenticado',update[0]==200 and updated['goal']==90000 and updated['botSpeed']==19000)
            check('Todos os presentes e pontos preservados',len(updated['chatNames'])==7 and len(updated['creatorNames'])==7 and updated['chatPoints']==conf['chatPoints'])
            bad={**conf,'goal':0}
            check('Configuracao invalida rejeitada',request(host,'/config','POST',bad,key)[0]==400)
            res=action('finish');status_after=json.loads(request(host,'/state')[1])['game']['phase']
            check('Encerramento de rodada por comando',res[0]==200 and status_after!='playing')
            res=action('start');status_after=json.loads(request(host,'/state')[1])['game']['phase']
            check('Iniciar rodada por comando',res[0]==200 and status_after=='playing')
            check('Servidor permanece saudavel',request(host,'/health')[0]==200)
            status,asset,_=request(host,'/assets/chat0.png')
            check('Icone legado de presente disponivel',status==200 and len(asset)>100)
        finally:
            proc.terminate()
            try:proc.wait(timeout=5)
            except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
    passed=sum(ok for _,ok in passes)
    print('RESULTADO: %d/%d testes aprovados'%(passed,len(passes)),flush=True)
    return 0 if passed==len(passes) else 1

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as err:
        print('FALHA: '+repr(err),flush=True)
        sys.exit(2)
