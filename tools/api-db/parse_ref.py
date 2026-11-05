import re, json, sys
PRIM = {'Int32':'int','Int64':'long','Int16':'short','Byte':'byte','SByte':'sbyte','UInt32':'uint','UInt64':'ulong','UInt16':'ushort','Double':'double','Single':'float','Decimal':'decimal','Char':'char','Boolean':'bool','String':'string','Object':'object','IntPtr':'nint','UIntPtr':'nuint'}
def strip_ns(t):
    t = t.replace('global::','')
    t = re.sub(r'\b(?:[A-Za-z_]\w*\.)+(?=[A-Za-z_]\w*)', '', t)
    t = re.sub(r'\b\w+<[^<>]*>\.(\w+)', r'\1', t)
    t = re.sub(r'\bNullable<([^<>]+)>', r'\1?', t)
    t = re.sub(r'\b(Int32|Int64|Int16|Byte|SByte|UInt32|UInt64|UInt16|Double|Single|Decimal|Char|Boolean|String|Object)\b(?!\.)', lambda m: PRIM[m.group(1)], t)
    return re.sub(r'\s+', ' ', t).strip()
def split_top(s, sep=','):
    out=[]; d=0; cur=''
    for c in s:
        if c in '<([{': d+=1
        elif c in '>)]}': d-=1
        if c==sep and d==0: out.append(cur); cur=''
        else: cur+=c
    if cur.strip(): out.append(cur)
    return out
def clean_params(p):
    p = re.sub(r'\[[A-Za-z][^\[\]]*(\[[^\[\]]*\][^\[\]]*)*\]\s*', '', p)
    p = re.sub(r'\bscoped\s+', '', p)
    parts=[]
    for x in split_top(p):
        x=x.strip()
        if not x: continue
        parts.append(strip_ns(x))
    return ', '.join(parts)
TYPE_RE = re.compile(r'^\s*(public|internal)?\s*((?:(?:static|abstract|sealed|readonly|ref|partial|unsafe|new)\s+)*)(class|struct|interface|enum|record)\s+(\w+)(<[^>]*>)?\s*(?::\s*(.*?))?\s*(where\b.*)?$')
DELEG_RE = re.compile(r'^\s*public\s+(?:unsafe\s+)?delegate\s+(.+?)\s+(\w+)(<[^>]*>)?\((.*)\)\s*(where.*)?;')
def parse(path, nsfilter):
    lines = open(path, encoding='utf-8').read().split('\n')
    types = {}
    stack = []  # (kind, name, depth)
    ns = None; depth = 0; pending=None; attrs=''
    for raw in lines:
        line = raw.rstrip()
        s = line.strip()
        if s.startswith('['):
            # atrybut w osobnej linii
            if s.endswith(']'):
                attrs += s; continue
        m = re.match(r'^namespace\s+([\w.]+)', s)
        if m: ns = m.group(1); 
        cur_type = stack[-1] if stack else None
        if not s.startswith('//'):
            dm = DELEG_RE.match(line)
            tm = TYPE_RE.match(line) if not dm else None
            if dm and (not cur_type or depth == cur_type[2]+1):
                if nsfilter(ns, dm.group(2)):
                    dg=(dm.group(3) or '')[1:-1]
                    types.setdefault(dm.group(2)+(('`'+str(dg.count(',')+1)) if dg else ''), {'k':'delegate','ns':ns,'gen':(dm.group(3) or '')[1:-1].replace(' ',''),'ret':strip_ns(dm.group(1)),'params':clean_params(dm.group(4)),'m':[]})
            elif tm and tm.group(1)=='public' and (not cur_type or depth == cur_type[2]+1):
                kind=tm.group(3); name=tm.group(4); gen=(tm.group(5) or '')[1:-1].replace(' ','')
                key = PRIM.get(name, name) if ns=='System' else name
                if gen: key = key + '`' + str(gen.count(',')+1)
                bases=[strip_ns(b) for b in split_top(tm.group(6) or '')]
                stack.append([kind, key, depth, ns])
                if nsfilter(ns, name) and key not in types:
                    types[key]={'k':kind,'ns':ns,'gen':re.sub(r'\b(?:in|out)(?=[A-Z])','',gen),'base':None,'ifs':[],'st':'static' in tm.group(2),'m':[]}
                    if kind in ('class','record') and bases and not re.match(r'^I[A-Z]', bases[0]): types[key]['base']=bases[0]; types[key]['ifs']=bases[1:]
                    elif kind=='struct': types[key]['ifs']=bases
                    else: types[key]['ifs']=bases
                    stack[-1].append(True)
                else: stack[-1].append(False)
            elif cur_type and depth == cur_type[2]+1 and cur_type[4]:
                t = types[cur_type[1]]
                if 'EditorBrowsableState.Never' not in attrs and 'EditorBrowsableState)1' not in attrs:
                    parse_member(s, t, cur_type)
        if s and not s.startswith('['): attrs=''
        depth += line.count('{') - line.count('}')
        while stack and depth <= stack[-1][2] and '}' in line:
            stack.pop()
    return types
MODS = r'(?:(?:static|virtual|override|abstract|sealed|readonly|const|new|extern|unsafe|required|ref|volatile|partial)\s+)*'
def parse_member(s, t, cur):
    kind = t['k']
    if kind=='enum':
        m = re.match(r'^(\w+)\s*(=\s*[^,]*)?,?\s*$', s)
        if m: t['m'].append(['c', m.group(1), cur[1], '', 's'])
        return
    iface = kind=='interface'
    if s.startswith('public '): s = s[7:]
    elif iface and not s.startswith(('protected','internal','private','static abstract','static virtual')): pass
    else: return
    s = re.sub(r'\[[^\[\]]*(\[[^\[\]]*\][^\[\]]*)*\]\s*', '', s, count=0) if s.startswith('[') else s
    st = bool(re.match(r'(?:\w+\s+)*?static\s', s.split('(')[0].split('{')[0]))
    mm = re.match(r'^(' + MODS + r')event\s+(.+?)\s+(\w+)\s*[{;]', s)
    if mm:
        t['m'].append(['e', mm.group(3), strip_ns(mm.group(2)), '', 's' if 'static' in mm.group(1) else '']); return
    # właściwość / indeksator
    mm = re.match(r'^(' + MODS + r')(.+?)\s+(this)\[(.*?)\]\s*\{(.*)$', s)
    if mm:
        ro = not re.search(r'\bset\b|\binit\b', mm.group(5))
        t['m'].append(['i', 'this', strip_ns(mm.group(2)), clean_params(mm.group(4)), 'r' if ro else '']); return
    mm = re.match(r'^(' + MODS + r')(.+?)\s+(\w+)\s*\{\s*(get|set|init)(.*)$', s)
    if mm and '(' not in mm.group(2):
        if True:
            rest = mm.group(4)+mm.group(5)
            ro = not re.search(r'\bset\b|\binit\b', rest)
            flags = ('s' if 'static' in mm.group(1) else '') + ('r' if ro else '')
            t['m'].append(['p', mm.group(3), strip_ns(mm.group(2)), '', flags]); return
    # operator — pomiń
    if re.search(r'\boperator\b', s): return
    # metoda / konstruktor
    mm = re.match(r'^(' + MODS + r')(?:(.+?)\s+)?(\w+)(<[^()]*>)?\((.*)\)\s*(where\b.*?)?\s*(\{.*|;|=>.*)?$', s)
    if mm:
        name = mm.group(3); rtype = mm.group(2)
        mods = mm.group(1)
        if '.' in name: return
        params = clean_params(mm.group(5))
        if rtype is None or rtype.strip()=='' :
            if name == cur[1] or name == t.get('rawname', name) or True:
                t['m'].append(['k', name, '', params, '']); return
        flags = ('s' if 'static' in mods else '') + ('x' if params.startswith('this ') else '')
        gen = (mm.group(4) or '')[1:-1].replace(' ','')
        t['m'].append(['m', name + (('<'+gen+'>') if gen else ''), strip_ns(rtype), params, flags]); return
    # pole
    mm = re.match(r'^(' + MODS + r')(.+?)\s+(\w+)\s*(=.*)?;\s*$', s)
    if mm:
        mods = mm.group(1)
        flags = ('s' if ('static' in mods or 'const' in mods) else '') + ('r' if ('readonly' in mods or 'const' in mods) else '')
        t['m'].append(['f', mm.group(3), strip_ns(mm.group(2)), '', flags]); return
