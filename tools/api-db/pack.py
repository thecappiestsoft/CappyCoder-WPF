"""Pakuje bazę API do src/data/api.txt (format: #przestrzenie | @Typ|rodzaj|ns|gen|baza|interfejsy|static | składowe k|nazwa|typ|parametry|flagi)."""
import json,re,gzip,base64,os,sys
HERE=os.path.dirname(os.path.abspath(__file__))
OUT=os.path.join(HERE,'..','..','src','data','api.txt')
sys.path.insert(0,HERE)
os.chdir(os.path.join(HERE,'refs'))
exec(open(os.path.join(HERE,'build_db.py')).read().split("json.dump")[0].replace("print(","(lambda *a,**k:None)("))
NS=sorted({v.get('ns') or '' for v in DB.values()})
out=['#'+'|'.join(NS)]
for k,v in sorted(DB.items()):
    if v['k']=='delegate':
        out.append('@%s|d|%d|%s|%s|%s'%(k,NS.index(v['ns']),v['gen'],v['ret'],v['params'])); continue
    out.append('@%s|%s|%d|%s|%s|%s|%s'%(k,v['k'][0],NS.index(v['ns']),v['gen'],v.get('base') or '',';'.join(v.get('ifs',[])),'s' if v.get('st') else ''))
    seen=set()
    for m in v['m']:
        line='|'.join([m[0],m[1],m[2],m[3],m[4]]).rstrip('|')
        if line in seen: continue
        seen.add(line); out.append(line)
txt='\n'.join(out)
open(OUT,'w').write(txt+'\n')
gz=gzip.compress(txt.encode(),9)
print('zapisano', os.path.relpath(OUT), len(txt)//1024, 'KB,', len(DB), 'typów')
