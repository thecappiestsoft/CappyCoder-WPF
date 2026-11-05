/**
 * CappyCoder WPF — Biblioteka C# (globalna)
 *
 * Zadanie: Tokenizer C#, szybka kontrola składni, tłumaczenie C# → JavaScript dla symulacji F5 oraz środowisko
 *   wykonawcze CSRT (formatowanie liczb i dat, Math, Convert, kolekcje, wyjątki .NET).
 * Zależy od: —
 * Udostępnia: globalne: UI_LANG, L(pl, en), CS, CSRT
 *
 * Ładowany przed modułami src/js jako osobny <script> (zmienne globalne).
 * Szczegóły: docs/ARCHITEKTURA.md
 */
var UI_LANG = 'pl';
function L(pl, en) {
  return UI_LANG === 'en' ? en : pl;
}
var CS = (function () {
  'use strict';
  const KW = new Set(
    'abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while var dynamic async await nameof when get set value partial yield record init global not and or with'.split(
      ' ',
    ),
  );
  const PRIMS =
    '(?:int|long|short|byte|sbyte|uint|ulong|ushort|double|float|decimal|string|bool|char|object|var|dynamic)';

  function decodeEsc(raw) {
    return raw.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,4}|[\s\S])/g, (m, c) => {
      switch (c[0]) {
        case 'n':
          return '\n';
        case 't':
          return '\t';
        case 'r':
          return '\r';
        case '0':
          return '\0';
        case 'a':
          return '\x07';
        case 'b':
          return '\b';
        case 'f':
          return '\f';
        case 'v':
          return '\v';
        case 'u':
        case 'x':
          return c.length > 1 ? String.fromCharCode(parseInt(c.slice(1), 16)) : c;
        default:
          return c;
      }
    });
  }

  /* Zastępuje literały znacznikami \u0001N\u0002, usuwa komentarze, zachowuje numery wierszy */
  function tokenize(src, shared) {
    const strs = shared || [],
      errs = [];
    let out = '',
      i = 0;
    const n = src.length;
    const lineAt = p => src.slice(0, p).split('\n').length;
    while (i < n) {
      const c = src[i],
        d = src[i + 1];
      if (c === '/' && d === '/') {
        let j = src.indexOf('\n', i);
        if (j < 0) j = n;
        out += ' '.repeat(j - i);
        i = j;
        continue;
      }
      if (c === '/' && d === '*') {
        let j = src.indexOf('*/', i + 2);
        if (j < 0) {
          errs.push({ code: 'CS1035', msg: 'Znaleziono koniec pliku, oczekiwano „*/”.', line: lineAt(i) });
          j = n;
        } else j += 2;
        out += src.slice(i, j).replace(/[^\n]/g, ' ');
        i = j;
        continue;
      }
      let pre = '';
      if ((c === '$' || c === '@') && (d === '"' || ((d === '$' || d === '@') && d !== c && src[i + 2] === '"')))
        pre = d === '"' ? c : c + d;
      if (c === '"' || pre) {
        const start = i;
        i += pre.length + 1;
        const verb = pre.includes('@'),
          interp = pre.includes('$');
        let body = '',
          depth = 0,
          ok = false;
        while (i < n) {
          const ch = src[i];
          if (interp && depth === 0 && ch === '{') {
            if (src[i + 1] === '{') {
              body += '{{';
              i += 2;
              continue;
            }
            depth = 1;
            body += ch;
            i++;
            continue;
          }
          if (interp && depth > 0) {
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            else if (ch === '"') {
              body += ch;
              i++;
              while (i < n && src[i] !== '"' && src[i] !== '\n') {
                if (src[i] === '\\') {
                  body += src[i];
                  i++;
                }
                body += src[i];
                i++;
              }
              body += '"';
              i++;
              continue;
            }
            body += ch;
            i++;
            continue;
          }
          if (!verb && ch === '\\') {
            body += ch + (src[i + 1] || '');
            i += 2;
            continue;
          }
          if (ch === '"') {
            if (verb && src[i + 1] === '"') {
              body += '""';
              i += 2;
              continue;
            }
            ok = true;
            i++;
            break;
          }
          if (ch === '\n' && !verb) break;
          body += ch;
          i++;
        }
        if (!ok)
          errs.push({
            code: 'CS1010',
            msg: L(
              'Znak nowego wiersza w stałej (brak zamykającego cudzysłowu).',
              'Newline in constant (missing closing quote).',
            ),
            line: lineAt(start),
          });
        strs.push({ k: interp ? (verb ? 'iv' : 'i') : verb ? 'v' : 's', raw: body });
        out += '\u0001' + (strs.length - 1) + '\u0002';
        const nl = (src.slice(start, i).match(/\n/g) || []).length;
        if (nl && ok) out += '\n'.repeat(nl);
        continue;
      }
      if (c === "'") {
        let j = i + 1,
          body = '';
        if (src[j] === '\\') {
          body = src.slice(j, j + 2);
          j += 2;
          while (j < n && src[j] !== "'" && j < i + 9 && src[j] !== '\n') {
            body += src[j];
            j++;
          }
        } else {
          body = src[j] || '';
          j++;
        }
        if (src[j] !== "'")
          errs.push({
            code: 'CS1012',
            msg: L(
              'Zbyt wiele znaków w literale znakowym lub brak apostrofu.',
              'Too many characters in character literal, or missing closing quote.',
            ),
            line: lineAt(i),
          });
        strs.push({ k: 'c', raw: body });
        out += '\u0001' + (strs.length - 1) + '\u0002';
        i = j + 1;
        continue;
      }
      out += c;
      i++;
    }
    return { code: out, strs, errs };
  }

  function match(code, i, open, close) {
    let d = 0;
    for (let j = i; j < code.length; j++) {
      const c = code[j];
      if (c === open) d++;
      else if (c === close) {
        d--;
        if (d === 0) return j;
      }
    }
    return -1;
  }
  function splitTop(s, sep) {
    const parts = [];
    let d = 0,
      cur = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if ('([{<'.includes(c)) d++;
      else if (')]}>'.includes(c)) d--;
      if (c === sep && d <= 0) {
        parts.push(cur);
        cur = '';
      } else cur += c;
    }
    if (cur.trim() !== '' || parts.length) parts.push(cur);
    return parts;
  }
  function hasTopEq(h) {
    let d = 0;
    for (let i = 0; i < h.length; i++) {
      const c = h[i];
      if (c === '(' || c === '[') d++;
      else if (c === ')' || c === ']') d--;
      else if (
        c === '=' &&
        d === 0 &&
        h[i + 1] !== '>' &&
        h[i + 1] !== '=' &&
        h[i - 1] !== '=' &&
        h[i - 1] !== '!' &&
        h[i - 1] !== '<' &&
        h[i - 1] !== '>'
      )
        return true;
    }
    return false;
  }
  const lineOf = (code, p) => code.slice(0, p).split('\n').length;

  /* Skanuje składowe typu (klasy) */
  function scanMembers(code, open, close) {
    const members = [];
    let i = open + 1,
      seg = i;
    const end = close < 0 ? code.length : close;
    while (i < end) {
      const c = code[i];
      if (c === ';') {
        const m = classify(code, code.slice(seg, i), seg, null);
        if (m) members.push(m);
        seg = i + 1;
      } else if (c === '{') {
        const hdr = code.slice(seg, i);
        const j = match(code, i, '{', '}');
        const jj = j < 0 ? end : j;
        if (hasTopEq(hdr) || /=>\s*$/.test(hdr) || /\bnew\b[^;(){}]*$/.test(hdr) || /\bnew\s*\[\s*\]\s*$/.test(hdr)) {
          i = jj + 1;
          continue;
        }
        const m = classify(code, hdr, seg, { open: i, close: jj });
        i = jj + 1;
        seg = i;
        if (m) {
          members.push(m);
          if (m.kind === 'prop') {
            const pm = /^\s*=\s*/.exec(code.slice(i));
            if (pm) {
              const k = code.indexOf(';', i);
              m.init = code.slice(i + pm[0].length, k);
              i = k + 1;
              seg = i;
            }
          }
        }
        continue;
      }
      i++;
    }
    return members;
  }
  function classify(code, hdr, pos, body) {
    const r = classify0(code, hdr, pos, body);
    if (r)
      r.hdr = hdr
        .trim()
        .replace(/^(\[[^\]]*\]\s*)+/, '')
        .trim();
    return r;
  }
  function classify0(code, hdr, pos, body) {
    const lead = hdr.length - hdr.replace(/^\s+/, '').length;
    let h = hdr
      .trim()
      .replace(/^(\[[^\]]*\]\s*)+/, '')
      .trim();
    if (!h) return null;
    const line = lineOf(code, pos + lead);
    const mods = (h.match(
      /^(?:(?:public|private|protected|internal|static|readonly|const|virtual|override|abstract|sealed|async|new|extern|unsafe|volatile|partial)\s+)*/,
    ) || [''])[0];
    const isStatic = /\bstatic\b/.test(mods);
    if (!body) {
      if (/^(using|namespace)\b/.test(h) || /\bevent\b/.test(mods + h.slice(mods.length, mods.length + 6))) return null;
      const em = /(\w+)\s*(?:<[^>]*>)?\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*=>([\s\S]*)$/.exec(h);
      if (em && !hasTopEq(h.slice(0, em.index)))
        return {
          kind: 'method',
          name: em[1],
          params: em[2],
          exprBody: em[3],
          mods,
          isStatic,
          line,
          async: /\basync\b/.test(mods),
        };
      const pe = /(\w+)\s*=>([\s\S]*)$/.exec(h);
      if (pe && !/\(/.test(h.slice(0, pe.index)))
        return { kind: 'getter', name: pe[1], expr: pe[2], mods, isStatic, line };
      if (/\(/.test(h) && !hasTopEq(h)) return null;
      return { kind: 'field', text: h.slice(mods.length), mods, isStatic, isConst: /\bconst\b/.test(mods), line };
    }
    const tm = /\b(class|struct|interface|record|enum)\s+(\w+)/.exec(h);
    if (tm) return { kind: 'type', tkind: tm[1], name: tm[2], line, body };
    const mm =
      /(\w+)\s*(?:<[^<>()]*>)?\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*(?::\s*(base|this)\s*\(([^()]*)\))?\s*$/.exec(h);
    if (mm)
      return {
        kind: 'method',
        name: mm[1],
        params: mm[2],
        baseCall: mm[3] ? { kw: mm[3], args: mm[4] } : null,
        mods,
        isStatic,
        line,
        body,
        async: /\basync\b/.test(mods),
      };
    const pn = /(\w+)\s*$/.exec(h);
    return {
      kind: 'prop',
      name: pn ? pn[1] : '?',
      mods,
      isStatic,
      line,
      body,
      type: h.slice(mods.length).replace(/\s*\w+\s*$/, ''),
    };
  }

  /* Wszystkie typy w pliku */
  function scanTypes(code) {
    const types = [];
    const re = /\b(class|struct|interface|record|enum)\s+(\w+)/g;
    let m;
    while ((m = re.exec(code))) {
      let k = m.index + m[0].length;
      // nagłówek do '{' lub ';' (record pozycyjny)
      let p = k,
        d = 0;
      while (p < code.length) {
        const c = code[p];
        if (c === '(') d++;
        else if (c === ')') d--;
        else if ((c === '{' || c === ';') && d === 0) break;
        p++;
      }
      const header = code.slice(k, p);
      const t = { tkind: m[1], name: m[2], line: lineOf(code, m.index), header, pos: m.index };
      if (code[p] === ';') {
        t.open = -1;
        t.close = p;
        t.members = [];
      } else {
        t.open = p;
        t.close = match(code, p, '{', '}');
        t.members = t.tkind === 'enum' ? [] : scanMembers(code, t.open, t.close);
      }
      const bm = /:\s*([\w.]+)/.exec(header.replace(/\([^)]*\)/, ''));
      t.base = bm ? bm[1] : null;
      const pm = /^\s*(?:<[^>]*>)?\s*\(([^)]*)\)/.exec(header);
      t.recordParams = pm ? pm[1] : null;
      types.push(t);
      re.lastIndex = k;
    }
    return types;
  }
  function paramNames(params) {
    if (!params || !params.trim()) return [];
    return splitTop(params, ',').map(p => {
      p = p.replace(/^\s*(\[[^\]]*\]\s*)*/, '').replace(/\b(this|params|ref|out|in)\s+/g, '');
      const eq = p.indexOf('=');
      const left = eq >= 0 ? p.slice(0, eq) : p;
      const nm = /(\w+)\s*$/.exec(left);
      return { name: nm ? nm[1] : '_', def: eq >= 0 ? p.slice(eq + 1).trim() : null };
    });
  }
  function findMainType(types) {
    return (
      types.find(t => t.tkind === 'class' && /\bWindow\b/.test(t.base || '')) ||
      types.find(t => t.name === 'MainWindow') ||
      types.find(t => t.tkind === 'class')
    );
  }
  function methodsOf(src) {
    const t = tokenize(src);
    const types = scanTypes(t.code);
    const main = findMainType(types);
    if (!main) return { main: null, methods: [], types };
    return { main, methods: main.members.filter(m => m.kind === 'method'), types, tok: t };
  }

  /* ---------- Kontrola błędów ---------- */
  function collectNames(code) {
    const s = new Set();
    const add = re => {
      let m;
      while ((m = re.exec(code))) for (let k = 1; k < m.length; k++) if (m[k]) s.add(m[k]);
    };
    add(/\b[A-Za-z_][\w.]*(?:<[^;(){}]*?>)?(?:\s*\[\s*\])*\??\s+([A-Za-z_]\w*)\s*(?=[=;,):\]]|\bin\b)/g);
    add(/\bout\s+(?:var|[\w<>\[\],.?]+)\s+(\w+)/g);
    add(/,\s*([A-Za-z_]\w*)\s*=(?![=>])/g);
    add(/\bforeach\s*\(\s*\S+\s+(\w+)/g);
    add(/\bcatch\s*\(\s*[\w.]+\s+(\w+)/g);
    add(/\bis\s+[A-Z]\w*\s+(\w+)/g);
    add(/(\w+)\s*=>/g);
    let m;
    const re = /\(([^()]*)\)\s*=>/g;
    while ((m = re.exec(code)))
      m[1].split(',').forEach(x => {
        const nm = /(\w+)\s*$/.exec(x.trim());
        if (nm) s.add(nm[1]);
      });
    return s;
  }

  function check(files, ctx) {
    // files: [{name, src}] (pierwszy = MainWindow.xaml.cs); ctx: {handlers:[{name, line}], controls:Set, ns}
    const errs = [];
    const allTypes = [];
    const userTypeNames = new Set();
    const toks = files.map(f => {
      const t = tokenize(f.src);
      t.file = f.name;
      const types = scanTypes(t.code);
      types.forEach(x => userTypeNames.add(x.name));
      t.types = types;
      allTypes.push(...types);
      return t;
    });
    toks.forEach(t => {
      t.errs.forEach(e => errs.push(Object.assign({ sev: 'err', file: t.file }, e)));
      // nawiasy
      const st = [];
      const pairs = { ')': '(', ']': '[', '}': '{' };
      for (let i = 0; i < t.code.length; i++) {
        const c = t.code[i];
        if (c === '(' || c === '[' || c === '{') st.push({ c, i });
        else if (pairs[c]) {
          const top = st[st.length - 1];
          if (!top) {
            errs.push({
              sev: 'err',
              code: c === '}' ? 'CS1022' : 'CS1513',
              msg:
                c === '}'
                  ? L(
                      'Oczekiwano definicji typu lub przestrzeni nazw albo końca pliku (nadmiarowe „}”).',
                      'Type or namespace definition, or end-of-file expected (extra "}").',
                    )
                  : L(`Nieoczekiwany znak „${c}”.`, `Unexpected character '${c}'.`),
              file: t.file,
              line: lineOf(t.code, i),
            });
            continue;
          }
          if (top.c !== pairs[c]) {
            const exp = { '(': ')', '[': ']', '{': '}' }[top.c];
            errs.push({
              sev: 'err',
              code: exp === ')' ? 'CS1026' : exp === '}' ? 'CS1513' : 'CS1003',
              msg: L(`Oczekiwano „${exp}”.`, `'${exp}' expected.`),
              file: t.file,
              line: lineOf(t.code, i),
            });
            st.pop();
            if (st.length && st[st.length - 1].c === pairs[c]) st.pop();
          } else st.pop();
        }
      }
      st.forEach(o => {
        const exp = { '(': ')', '[': ']', '{': '}' }[o.c];
        errs.push({
          sev: 'err',
          code: exp === '}' ? 'CS1513' : 'CS1026',
          msg: L(
            `Oczekiwano „${exp}” (nawias otwarty w tym wierszu nie został zamknięty).`,
            `'${exp}' expected (the bracket opened on this line is never closed).`,
          ),
          file: t.file,
          line: lineOf(t.code, o.i),
        });
      });
    });
    const t0 = toks[0];
    const main = t0 && findMainType(t0.types);
    if (!main) {
      errs.push({
        sev: 'err',
        code: 'CS0103',
        msg: L(
          'Nie znaleziono klasy okna (public partial class MainWindow : Window).',
          'The window class was not found (public partial class MainWindow : Window).',
        ),
        file: files[0].name,
        line: 1,
      });
      return errs;
    }
    const methods = main.members.filter(m => m.kind === 'method');
    const fields = new Set(),
      mnames = new Set(methods.map(m => m.name));
    main.members.forEach(m => {
      if (m.kind === 'field')
        splitTop(m.text, ',').forEach((d, k) => {
          const mm =
            k === 0 ? /([A-Za-z_]\w*)\s*(?:=[\s\S]*)?$/.exec(d.split('=')[0].trim()) : /^\s*([A-Za-z_]\w*)/.exec(d);
          if (mm) fields.add(mm[1]);
        });
      if (m.kind === 'prop' || m.kind === 'getter') fields.add(m.name);
    });
    // duplikaty metod
    const seen = {};
    methods.forEach(m => {
      const key = m.name + '/' + paramNames(m.params).length;
      if (seen[key])
        errs.push({
          sev: 'err',
          code: 'CS0111',
          msg: L(
            `Typ „${main.name}” już definiuje składową o nazwie „${m.name}” z tymi samymi typami parametrów.`,
            `Type '${main.name}' already defines a member called '${m.name}' with the same parameter types.`,
          ),
          file: files[0].name,
          line: m.line,
        });
      seen[key] = 1;
    });
    // konflikt nazw kontrolek ze składowymi
    ctx.controls.forEach(c => {
      if (fields.has(c) || mnames.has(c))
        errs.push({
          sev: 'err',
          code: 'CS0102',
          msg: L(
            `Typ „${main.name}” zawiera już definicję elementu „${c}” (nazwa kontrolki z XAML).`,
            `The type '${main.name}' already contains a definition for '${c}' (a control name from XAML).`,
          ),
          file: files[0].name,
          line: 1,
        });
    });
    // obsługa zdarzeń z XAML
    (ctx.handlers || []).forEach(h => {
      const ms = methods.filter(m => m.name === h.name);
      if (!ms.length)
        errs.push({
          sev: 'err',
          code: 'CS1061',
          msg: L(
            `„${main.name}” nie zawiera definicji „${h.name}”, a nie odnaleziono dostępnej metody rozszerzającej „${h.name}”. (Zdarzenie ${h.event} w ${h.owner}.)`,
            `'${main.name}' does not contain a definition for '${h.name}' and no accessible extension method '${h.name}' could be found. (Event ${h.event} on ${h.owner}.)`,
          ),
          file: 'MainWindow.xaml',
          line: h.line || 1,
          fix: h,
        });
      else if (!ms.some(m => paramNames(m.params).length === 2))
        errs.push({
          sev: 'err',
          code: 'CS0123',
          msg: L(
            `Żadne przeciążenie „${h.name}” nie pasuje do delegata zdarzenia ${h.event} (oczekiwano parametrów: object sender, ${h.args || 'RoutedEventArgs'} e).`,
            `No overload for '${h.name}' matches the delegate of event ${h.event} (expected parameters: object sender, ${h.args || 'RoutedEventArgs'} e).`,
          ),
          file: files[0].name,
          line: ms[0].line,
        });
    });
    // konstruktor
    const ctor = methods.find(m => m.name === main.name);
    if (
      ctor &&
      !/\bInitializeComponent\s*\(\s*\)/.test(
        t0.code.slice(ctor.body ? ctor.body.open : 0, ctor.body ? ctor.body.close : 0),
      )
    )
      errs.push({
        sev: 'warn',
        code: 'WPF0001',
        msg: L(
          'Konstruktor okna nie wywołuje InitializeComponent() — kontrolki z XAML nie zostaną utworzone.',
          'The window constructor does not call InitializeComponent(), so the controls from XAML will not be created.',
        ),
        file: files[0].name,
        line: ctor.line,
      });
    // średniki i nieznane nazwy w treściach metod (wszystkie pliki)
    toks.forEach((t, fi) => {
      const known = new Set([
        ...collectNames(t.code),
        ...ctx.controls,
        ...fields,
        ...mnames,
        ...userTypeNames,
        'e',
        'sender',
        'value',
        'args',
      ]);
      t.types.forEach(ty =>
        ty.members.forEach(m => {
          if (m.name) known.add(m.name);
          if (m.kind === 'field')
            splitTop(m.text, ',').forEach(d => {
              const mm = /([A-Za-z_]\w*)\s*$/.exec(d.split('=')[0].trim());
              if (mm) known.add(mm[1]);
            });
        }),
      );
      t.types.forEach(ty =>
        ty.members
          .filter(m => m.kind === 'method' && m.body)
          .forEach(m => {
            paramNames(m.params).forEach(p => known.add(p.name));
            checkBody(t, m, known, errs);
          }),
      );
    });
    return errs;
  }
  const STMT_KW =
    /^(?:(?:if|else|for|foreach|while|switch|case|default|do|try|catch|finally|using|lock|checked|unchecked|fixed|unsafe|get|set|init)\b|#)/;
  function checkBody(t, m, known, errs) {
    const code = t.code;
    const a = m.body.open + 1,
      b = m.body.close;
    if (b < 0) return;
    const text = code.slice(a, b);
    const baseLine = lineOf(code, a);
    const lines = text.split('\n');
    let depth = 0;
    const braceKinds = [];
    const reported = new Set();
    for (let li = 0; li < lines.length; li++) {
      const raw = lines[li];
      const LT = raw.trim();
      // śledzenie klamer (inicjalizator vs blok)
      const startDepth = depth;
      for (let k = 0; k < raw.length; k++) {
        const c = raw[k];
        if (c === '(' || c === '[') depth++;
        else if (c === ')' || c === ']') depth--;
        else if (c === '{') {
          const before = (lines.slice(0, li).join('\n') + '\n' + raw.slice(0, k)).replace(/\s+$/, '');
          const init =
            /(=|,|\(|\breturn|\bswitch|\bnew\s*[\w<>\[\],.]*\s*(\([^()]*\))?)$/.test(before) && !/=>$/.test(before);
          braceKinds.push(init ? 'i' : 'b');
        } else if (c === '}') braceKinds.pop();
      }
      if (!LT) continue;
      const inInit = braceKinds[braceKinds.length - 1] === 'i';
      if (
        (depth === 0 &&
          startDepth === 0 &&
          !inInit &&
          !STMT_KW.test(LT) &&
          !/[;{},(\[:]$/.test(LT) &&
          !/(=>|&&|\|\||\?|\+|-|\*|\/|=|<|>)$/.test(LT) &&
          /[\w)\]\u0002]$/.test(LT)) ||
        (depth === 0 && !inInit && /\b(?:else)\s*$/.test(LT) && false)
      ) {
        let nx = '';
        for (let k = li + 1; k < lines.length; k++) {
          if (lines[k].trim()) {
            nx = lines[k].trim();
            break;
          }
        }
        if (!/^[.?:+\-*\/%&|=,)\]<>{]/.test(nx) && !/^(=>|\?\?|is\b|as\b)/.test(nx) && !STMT_KW.test(LT)) {
          if (!/^(?:public|private|protected|static|\[)/.test(LT))
            errs.push({
              sev: 'err',
              code: 'CS1002',
              msg: L('Oczekiwano „;”.', '; expected.'),
              file: t.file,
              line: baseLine + li,
            });
        }
      }
      if (depth < 0) depth = 0;
    }
    // CS0103
    const re = /(^|[^.\w\u0002])([a-z_]\w*)\s*(?=(\.[A-Za-z_]|=(?![=>])|\+\+|--|\+=|-=|\*=|\/=|\[))/g;
    let mm;
    while ((mm = re.exec(text))) {
      const id = mm[2];
      if (KW.has(id) || known.has(id) || reported.has(id)) continue;
      // pomiń nazwane argumenty / inicjalizatory obiektów
      reported.add(id);
      errs.push({
        sev: 'err',
        code: 'CS0103',
        msg: L(
          `Nazwa „${id}” nie istnieje w bieżącym kontekście.`,
          `The name '${id}' does not exist in the current context.`,
        ),
        file: t.file,
        line: baseLine + text.slice(0, mm.index).split('\n').length - 1,
      });
    }
  }

  /* ---------- Tłumaczenie C# → JS (do symulacji F5) ---------- */
  function replaceNewForms(s, ctx) {
    // new List<T>() {..} / new List<T> {..} / new List<T>() / new List<T>(x) / new Dictionary<..>() / new T[] {..} / new T[n] / new {..} / new X { A = 1 }
    let out = '',
      i = 0;
    const re = /\bnew\b/g;
    let m;
    while ((m = re.exec(s))) {
      const st = m.index;
      let p = st + 3;
      while (/\s/.test(s[p])) p++;
      // anonimowy obiekt
      if (s[p] === '{') {
        const e = match(s, p, '{', '}');
        if (e < 0) continue;
        out += s.slice(i, st) + '({' + objInit(s.slice(p + 1, e)) + '})';
        i = e + 1;
        re.lastIndex = e + 1;
        continue;
      }
      if (s[p] === '[') {
        // new[] { }
        const q = s.indexOf(']', p);
        let r = q + 1;
        while (/\s/.test(s[r])) r++;
        if (s[r] === '{') {
          const e = match(s, r, '{', '}');
          out += s.slice(i, st) + '[' + s.slice(r + 1, e) + ']';
          i = e + 1;
          re.lastIndex = e + 1;
        }
        continue;
      }
      const tm = /^([A-Za-z_][\w.]*)\s*/.exec(s.slice(p));
      if (!tm) continue;
      const tname = tm[1];
      let q = p + tm[0].length;
      let generic = '';
      if (s[q] === '<') {
        const e = match(s, q, '<', '>');
        if (e < 0) continue;
        generic = s.slice(q, e + 1);
        q = e + 1;
        while (/\s/.test(s[q])) q++;
      }
      // tablice
      if (s[q] === '[') {
        const e = match(s, q, '[', ']');
        const size = s.slice(q + 1, e).trim();
        let r = e + 1;
        while (/\s/.test(s[r])) r++;
        if (s[r] === '{') {
          const e2 = match(s, r, '{', '}');
          out += s.slice(i, st) + '[' + s.slice(r + 1, e2) + ']';
          i = e2 + 1;
          re.lastIndex = e2 + 1;
          continue;
        }
        out += s.slice(i, st) + `__arr(${JSON.stringify(tname)}, ${size || 0})`;
        i = e + 1;
        re.lastIndex = e + 1;
        continue;
      }
      let args = null,
        afterArgs = q;
      if (s[q] === '(') {
        const e = match(s, q, '(', ')');
        if (e < 0) continue;
        args = s.slice(q + 1, e);
        afterArgs = e + 1;
      }
      let r = afterArgs;
      while (/\s/.test(s[r])) r++;
      let initBody = null,
        endAll = afterArgs;
      if (s[r] === '{') {
        const e = match(s, r, '{', '}');
        if (e >= 0) {
          initBody = s.slice(r + 1, e);
          endAll = e + 1;
        }
      }
      const coll =
        /^(List|HashSet|Queue|Stack|LinkedList|ObservableCollection|SortedSet|IEnumerable|ICollection|IList)$/.test(
          tname,
        ) && generic;
      const dict = /^(Dictionary|SortedDictionary|SortedList)$/.test(tname) && generic;
      let rep = null;
      if (coll) {
        if (initBody != null) rep = '[' + initBody + ']';
        else if (args && args.trim()) rep = /^\s*\d+\s*$/.test(args) ? '[]' : `[...(${args})]`;
        else rep = '[]';
        if (tname === 'HashSet' || tname === 'SortedSet') rep = `__set(${rep})`;
      } else if (dict) {
        rep =
          initBody != null
            ? `__dict([${initBody.replace(/\{\s*([^{}]*?)\s*,\s*([^{}]*?)\s*\}/g, '[$1,$2]').replace(/\[\s*([^\]=]+?)\s*\]\s*=\s*([^,]+)/g, '[$1,$2]')}])`
            : '__dict()';
      } else if (initBody != null && args === null && !/^(int|double|string|bool|char)$/.test(tname)) {
        rep = `Object.assign(new ${tname}(), {${objInit(initBody)}})`;
      } else if (initBody != null && args !== null) {
        rep = `Object.assign(new ${tname}(${args}), {${objInit(initBody)}})`;
      }
      if (rep != null) {
        out += s.slice(i, st) + rep;
        i = endAll;
        re.lastIndex = endAll;
      } else if (generic) {
        out += s.slice(i, st) + 'new ' + tname;
        i = q;
        re.lastIndex = q;
      }
    }
    return out + s.slice(i);
  }
  function objInit(body) {
    return splitTop(body, ',')
      .filter(x => x.trim())
      .map(x => {
        const eq = x.indexOf('=');
        if (eq < 0) {
          const nm = /(\w+)\s*$/.exec(x.trim());
          return nm ? nm[1] + ': ' + x.trim() : x;
        }
        return x.slice(0, eq).trim() + ': ' + x.slice(eq + 1).trim();
      })
      .join(', ');
  }
  function replaceLambdaSubs(s, ctx) {
    const re = /([\w.]+)\.(\w+)\s*([+-])=\s*(?=(?:async\s*)?(?:\([^()]*\)|\w+)\s*=>)/g;
    let m,
      out = '',
      i = 0;
    while ((m = re.exec(s))) {
      let p = m.index + m[0].length;
      const arrow = s.indexOf('=>', p);
      if (arrow < 0) continue;
      let q = arrow + 2;
      while (/\s/.test(s[q])) q++;
      let end;
      if (s[q] === '{') {
        end = match(s, q, '{', '}');
        if (end < 0) continue;
        end++;
        while (/\s/.test(s[end])) end++;
        if (s[end] !== ';') continue;
      } else {
        let d = 0;
        end = q;
        while (end < s.length) {
          const c = s[end];
          if ('([{'.includes(c)) d++;
          else if (')]}'.includes(c)) d--;
          if (c === ';' && d === 0) break;
          end++;
        }
      }
      out +=
        s.slice(i, m.index) +
        `${m[1]}.${m[3] === '+' ? '__on' : '__off'}(${JSON.stringify(m[2])}, ` +
        s.slice(p, end) +
        ')';
      i = end;
      re.lastIndex = end;
    }
    return out + s.slice(i);
  }
  function guardLoops(s) {
    const re = /\b(while|for)\s*\(/g;
    const edits = [];
    let m;
    while ((m = re.exec(s))) {
      const a = m.index + m[0].length - 1;
      const b = match(s, a, '(', ')');
      if (b < 0) continue;
      const inner = s.slice(a + 1, b);
      if (m[1] === 'while') edits.push([a + 1, b, `__g()&&(${inner})`]);
      else {
        if (/^\s*(const|let|var)\s+\w+\s+of\b/.test(inner)) continue;
        const parts = splitTop(inner, ';');
        if (parts.length !== 3) continue;
        edits.push([a + 1, b, `${parts[0]};${parts[1].trim() ? `__g()&&(${parts[1]})` : '__g()'};${parts[2]}`]);
      }
    }
    edits.sort((x, y) => y[0] - x[0]);
    for (const [a, b, r] of edits) s = s.slice(0, a) + r + s.slice(b);
    return s;
  }

  function txExpr(code, ctx) {
    let s = code;
    s = s.replace(/\bnameof\s*\(\s*([\w.]+)\s*\)/g, (m, a) => ctx.addStr(a.split('.').pop()));
    s = s.replace(/\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?:[mMfFdD]|[uU]?[lL]|[uU])\b/g, '$1');
    s = s
      .replace(/\bdefault\s*\(\s*(int|double|float|decimal|long|short|byte)\s*\)/g, '0')
      .replace(/\bdefault\s*\(\s*bool\s*\)/g, 'false');
    // this / base
    if (ctx.cls) {
      s = s.replace(/\bbase\s*\./g, 'super.');
    } else {
      s = s.replace(/\bthis\s*\.\s*(\w+)/g, (m, a) => (ctx.members.has(a) || ctx.controls.has(a) ? a : '__win.' + a));
      s = s.replace(/\bthis\b/g, '__win');
    }
    // statyczne typy wbudowane
    s = s.replace(/\b(?:string|String)\s*\.(?=\s*[A-Z])/g, '__String.');
    s = s.replace(/\b(?:int|Int32|long|Int64|short|Int16|byte|Byte|uint|ulong)\s*\.(?=\s*[A-Z])/g, '__Int.');
    s = s.replace(/\b(?:double|Double|float|Single|decimal|Decimal)\s*\.(?=\s*[A-Z])/g, '__Double.');
    s = s.replace(/\b(?:char|Char)\s*\.(?=\s*[A-Z])/g, '__Char.');
    s = s.replace(/\b(?:bool|Boolean)\s*\.(?=\s*[A-Z])/g, '__Bool.');
    // out / ref
    s = s.replace(/\bout\s+(?:var|[A-Za-z_][\w<>,\[\]?.]*)\s+(\w+)/g, (m, v) => {
      ctx.hoist.add(v);
      return `(__o)=>{${v}=__o}`;
    });
    s = s.replace(/\bout\s+(_\b|[\w.]+)/g, (m, v) => (v === '_' ? '(__o)=>{}' : `(__o)=>{${v}=__o}`));
    s = s.replace(/\bref\s+/g, '').replace(/\bin\s+(?=[\w(]+\s*[,)])/g, m => m); // pozostaw
    // rzutowania
    const OPER =
      '(\\((?:[^()]|\\((?:[^()]|\\([^()]*\\))*\\))*\\)|[\\w.\\u0001\\u0002]+(?:\\((?:[^()]|\\([^()]*\\))*\\))?(?:\\.[\\w]+(?:\\((?:[^()]|\\([^()]*\\))*\\))?)*)';
    s = s.replace(
      new RegExp('\\(\\s*(?:int|long|short|byte|uint|ulong|sbyte|ushort)\\s*\\)\\s*' + OPER, 'g'),
      'Math.Truncate($1)',
    );
    s = s.replace(new RegExp('\\(\\s*char\\s*\\)\\s*' + OPER, 'g'), '__Char.From($1)');
    s = s.replace(
      /\(\s*(?:double|float|decimal|string|object|bool|dynamic|[A-Z]\w*(?:\.\w+)*(?:<[^()]*?>)?\??)\s*\)\s*(?=[\w(\u0001!])/g,
      '',
    );
    s = s.replace(/([\w)\]]+)\s+as\s+(?:[A-Z]\w*(?:<[^>]*>)?|string|object)\??/g, '$1');
    s = s.replace(/\bis\s+not\s+null\b/g, '!= null').replace(/\bis\s+null\b/g, '== null');
    s = s.replace(
      /(\b[\w.]+)\s+is\s+(int|double|string|bool)\b/g,
      (m, a, t) => `(typeof ${a}===${t === 'string' ? '"string"' : t === 'bool' ? '"boolean"' : '"number"'})`,
    );
    s = replaceNewForms(s, ctx);
    // tablica w deklaracji: int[] a = {1,2};
    s = s.replace(/(\[\s*\]\s*\w+\s*=\s*)\{([^{}]*)\}/g, '$1[$2]');
    // subskrypcje zdarzeń
    s = s.replace(
      /([\w.]+)\.(\w+)\s*([+-])=\s*(?:new\s+[\w.<>]+\s*\(\s*(\w+)\s*\)|(\w+))\s*;/g,
      (m, obj, ev, op, a, b) => {
        const h = a || b;
        if (!ctx.methods.has(h)) return m;
        return `${obj}.${op === '+' ? '__on' : '__off'}(${JSON.stringify(ev)}, ${h});`;
      },
    );
    s = replaceLambdaSubs(s, ctx);
    s = s.replace(/\bforeach\s*\(\s*(?:var|[A-Za-z_][\w<>,.\[\]?]*)\s+(\w+)\s+in\b/g, 'for (const $1 of');
    s = s.replace(/\bforeach\s*\(\s*var\s*\(([^)]*)\)\s+in\b/g, 'for (const [$1] of');
    s = s.replace(/\bcatch\s*\(\s*([\w.]+)(?:\s+(\w+))?\s*\)(?:\s*when\s*\([^)]*\))?\s*\{/g, (m, ty, nm) => {
      const t = ty.replace(/^System\./, '');
      return (
        'catch (__ex) {' +
        (t !== 'Exception' ? `if (!__isEx(__ex, ${JSON.stringify(t)})) throw __ex;` : '') +
        (nm ? `let ${nm} = __ex;` : '')
      );
    });
    s = s.replace(/\bthrow\s*;/g, 'throw __ex;');
    s = s.replace(/\busing\s+(?:var|[A-Z]\w*)\s+(\w+)\s*=/g, 'let $1 =');
    // liczby całkowite — dzielenie
    if (ctx.ints && ctx.ints.size) {
      const isInt = t => /^\d+$/.test(t) || ctx.ints.has(t) || /\.(Count|Length|SelectedIndex)$/.test(t);
      s = s.replace(/(\b[\w.]+)\s*\/\s*([\w.]+\b)(?!\s*\()/g, (m, a, b) =>
        isInt(a) && isInt(b) ? `Math.__idiv(${a}, ${b})` : m,
      );
    }
    // deklaracje zmiennych
    s = s.replace(
      new RegExp(
        '(^|[^\\w.])(?:const\\s+|readonly\\s+|static\\s+)*(?:' +
          PRIMS.slice(3, -1) +
          '|[A-Z]\\w*(?:\\.\\w+)*(?:<[^;=(){}]*?>)?)(?:\\s*\\[\\s*,?\\s*\\])*\\??\\s+(?=[A-Za-z_]\\w*\\s*(?:=(?![=>])|;|,\\s*[A-Za-z_]\\w*\\s*(?:=(?![=>])|;|,)))',
        'g',
      ),
      (m, pre) => pre + 'let ',
    );
    // wywołania asynchroniczne
    s = s.replace(/\bConfigureAwait\s*\(\s*\w+\s*\)/g, 'valueOf()');
    return s;
  }

  function fmtHole(expr, ctx) {
    let d = 0,
      fmt = null,
      cut = expr.length,
      align = null;
    for (let i = 0; i < expr.length; i++) {
      const c = expr[i];
      if ('([{'.includes(c)) d++;
      else if (')]}'.includes(c)) d--;
      else if (d === 0 && c === ':' && expr[i + 1] !== ':' && expr[i - 1] !== ':' && !/\?/.test(expr.slice(0, i))) {
        fmt = expr.slice(i + 1);
        cut = Math.min(cut, i);
        break;
      } else if (d === 0 && c === ',' && align === null) {
        align = i;
      }
    }
    if (align !== null && align < cut) {
      cut = align;
    }
    const js = translateFragment(expr.slice(0, cut), ctx);
    return '${__fmt((' + js + '), ' + (fmt ? JSON.stringify(fmt.trim()) : 'undefined') + ')}';
  }
  function interp(raw, verb, ctx) {
    let out = '',
      i = 0;
    const text = t => {
      const v = verb ? t.replace(/""/g, '"') : decodeEsc(t);
      return v.replace(/[`\\]/g, '\\$&').replace(/\$\{/g, '\\${');
    };
    let buf = '';
    while (i < raw.length) {
      const c = raw[i];
      if (c === '{' && raw[i + 1] === '{') {
        buf += '{';
        i += 2;
        continue;
      }
      if (c === '}' && raw[i + 1] === '}') {
        buf += '}';
        i += 2;
        continue;
      }
      if (c === '{') {
        out += text(buf);
        buf = '';
        let d = 1,
          j = i + 1;
        while (j < raw.length && d > 0) {
          const ch = raw[j];
          if (ch === '"') {
            j++;
            while (j < raw.length && raw[j] !== '"') {
              if (raw[j] === '\\') j++;
              j++;
            }
          } else if (ch === '{') d++;
          else if (ch === '}') d--;
          if (d > 0) j++;
        }
        out += fmtHole(raw.slice(i + 1, j), ctx);
        i = j + 1;
        continue;
      }
      buf += c;
      i++;
    }
    out += text(buf);
    return '`' + out + '`';
  }
  function lit(st, ctx) {
    switch (st.k) {
      case 's':
      case 'c':
        return JSON.stringify(decodeEsc(st.raw));
      case 'v':
        return JSON.stringify(st.raw.replace(/""/g, '"'));
      default:
        return interp(st.raw, st.k === 'iv', ctx);
    }
  }
  function restore(s, strs, ctx) {
    return s.replace(/\u0001(\d+)\u0002/g, (m, i) => lit(strs[+i], ctx));
  }
  function translateFragment(src, ctx) {
    const t = tokenize(src);
    const sub = Object.assign({}, ctx, { hoist: ctx.hoist });
    const extra = [];
    sub.addStr = v => {
      extra.push(v);
      return JSON.stringify(v);
    };
    let js = txExpr(t.code, sub);
    if (ctx.rewrite) js = ctx.rewrite(js);
    return restore(js, t.strs, sub);
  }

  function defaultFor(type) {
    type = (type || '').trim();
    if (/\?$/.test(type)) return 'null';
    if (/^(int|long|short|byte|sbyte|uint|ulong|ushort|double|float|decimal)$/.test(type)) return '0';
    if (type === 'bool') return 'false';
    if (type === 'char') return '"\\0"';
    return 'null';
  }
  function fieldDecl(text, ctx, asClassField, isStatic, clsName) {
    // "int a = 1, b" → [{name, init}]
    const m = /^([\w.<>\[\],?() ]+?)\s+([A-Za-z_]\w*\s*(?:=[\s\S]*)?(?:,[\s\S]*)?)$/.exec(text.trim());
    if (!m) return [];
    const type = m[1].trim();
    return splitTop(m[2], ',').map(d => {
      const eq = d.indexOf('=');
      const name = (eq >= 0 ? d.slice(0, eq) : d).trim();
      let init = eq >= 0 ? d.slice(eq + 1).trim() : defaultFor(type);
      if (eq >= 0 && /^\s*\{/.test(init) && /\[\s*\]/.test(type)) init = '[' + init.trim().slice(1, -1) + ']';
      return { name, init: eq >= 0 ? txExpr(init, ctx) : init, type };
    });
  }

  function collectInts(code) {
    const s = new Set();
    let m;
    const re = /\b(?:int|long|short|byte|uint|ulong)\s+(\w+)/g;
    while ((m = re.exec(code))) s.add(m[1]);
    const re2 = /\b(?:int|long|short|byte|uint|ulong)\s+\w+\s*=[^;]*?,\s*(\w+)\s*=/g;
    while ((m = re2.exec(code))) s.add(m[1]);
    return s;
  }

  function memberRewrite(s, names, exclude, prefix) {
    if (!names.size) return s;
    return s.replace(/(^|[^.\w$\u0002])([A-Za-z_]\w*)\b(?!\s*:(?!:))/g, (m, pre, id) =>
      names.has(id) && !exclude.has(id) ? pre + prefix + id : m,
    );
  }

  function translateClass(t, strs, ctx, userTypes) {
    const inst = new Set(),
      stat = new Set();
    t.members.forEach(m => {
      if (m.kind === 'field') fieldDecl(m.text, ctx).forEach(f => (m.isStatic || m.isConst ? stat : inst).add(f.name));
      if (m.kind === 'prop' || m.kind === 'getter') (m.isStatic ? stat : inst).add(m.name);
      if (m.kind === 'method' && m.name !== t.name) (m.isStatic ? stat : inst).add(m.name);
    });
    if (t.recordParams) paramNames(t.recordParams).forEach(p => inst.add(p.name));
    const cctx = Object.assign({}, ctx, { cls: t.name });
    const body = (code, exclude) => {
      let s = memberRewrite(code, inst, exclude, 'this.');
      s = memberRewrite(s, stat, exclude, t.name + '.');
      return s;
    };
    const parts = [];
    const fieldInits = [];
    t.members.forEach(m => {
      if (m.kind === 'field') {
        const hoist = new Set();
        const c2 = Object.assign({}, cctx, { hoist });
        fieldDecl(m.text, c2).forEach(f => {
          const init = body(f.init, new Set());
          if (m.isStatic || m.isConst) parts.push(`static ${f.name} = ${init};`);
          else fieldInits.push(`this.${f.name} = ${init};`);
        });
      } else if (m.kind === 'prop') {
        const bodyTxt = t.__code.slice(m.body.open + 1, m.body.close);
        const auto =
          /^\s*(?:(?:public|private|protected|internal)\s+)?(get|init|set)\s*;/.test(bodyTxt) ||
          /^\s*(?:(?:public|private|protected|internal)\s+)?get\s*;/.test(bodyTxt);
        if (auto) {
          const init = m.init ? body(txExpr(m.init, cctx), new Set()) : defaultFor(m.type);
          if (m.isStatic) parts.push(`static ${m.name} = ${init};`);
          else fieldInits.push(`this.${m.name} = ${init};`);
        } else {
          const gm = /\bget\s*(=>\s*([^;]*);|\{)/.exec(bodyTxt);
          if (gm) {
            let g;
            if (gm[2] !== undefined) g = 'return ' + gm[2] + ';';
            else {
              const o = gm.index + gm[0].length - 1;
              const e = match(bodyTxt, o, '{', '}');
              g = bodyTxt.slice(o + 1, e);
            }
            const hoist = new Set();
            const c2 = Object.assign({}, cctx, { hoist });
            parts.push(`${m.isStatic ? 'static ' : ''}get ${m.name}(){${body(guardLoops(txExpr(g, c2)), new Set())}}`);
          }
          const sm = /\bset\s*(=>\s*([^;]*);|\{)/.exec(bodyTxt);
          if (sm) {
            let g;
            if (sm[2] !== undefined) g = sm[2] + ';';
            else {
              const o = sm.index + sm[0].length - 1;
              const e = match(bodyTxt, o, '{', '}');
              g = bodyTxt.slice(o + 1, e);
            }
            const hoist = new Set();
            const c2 = Object.assign({}, cctx, { hoist });
            parts.push(
              `${m.isStatic ? 'static ' : ''}set ${m.name}(value){${body(guardLoops(txExpr(g, c2)), new Set(['value']))}}`,
            );
          }
        }
      } else if (m.kind === 'getter') {
        const hoist = new Set();
        const c2 = Object.assign({}, cctx, { hoist });
        parts.push(
          `${m.isStatic ? 'static ' : ''}get ${m.name}(){return ${restore(body(txExpr(m.expr, c2), new Set()), strs, Object.assign({}, c2, { rewrite: x => body(x, new Set()) }))};}`,
        );
      }
    });
    let ctorDone = false;
    t.members
      .filter(m => m.kind === 'method')
      .forEach(m => {
        const ps = paramNames(m.params);
        const hoist = new Set();
        const c2 = Object.assign({}, cctx, { hoist });
        const raw =
          m.exprBody !== undefined
            ? m.name === t.name
              ? m.exprBody + ';'
              : 'return ' + m.exprBody + ';'
            : t.__code.slice(m.body.open + 1, m.body.close);
        const locals = collectNames(raw);
        const excl = new Set([...ps.map(p => p.name), ...locals]);
        let b = guardLoops(txExpr(raw, c2));
        b = body(b, excl);
        b = restore(b, strs, Object.assign({}, c2, { rewrite: x => body(x, excl) }));
        const hdecl = hoist.size ? `let ${[...hoist].join(',')};` : '';
        const plist = ps.map(p => (p.def ? `${p.name} = ${txExpr(p.def, c2)}` : p.name)).join(', ');
        if (m.name === t.name) {
          if (ctorDone) {
            ctx.warn.push(
              L(
                `Klasa ${t.name}: symulacja obsługuje tylko jeden konstruktor (użyto pierwszego).`,
                `Class ${t.name}: the simulation supports only one constructor (the first one is used).`,
              ),
            );
            return;
          }
          ctorDone = true;
          const sup =
            t.base && userTypes.has(t.base)
              ? `super(${m.baseCall && m.baseCall.kw === 'base' ? txExpr(m.baseCall.args, c2) : ''});`
              : '';
          parts.push(`constructor(${plist}){${sup}${fieldInits.join('')}${hdecl}${b}}`);
        } else {
          parts.push(`${m.isStatic ? 'static ' : ''}${m.async ? 'async ' : ''}${m.name}(${plist}){${hdecl}${b}}`);
        }
      });
    if (!ctorDone) {
      if (t.recordParams) {
        const ps = paramNames(t.recordParams);
        parts.push(
          `constructor(${ps.map(p => p.name).join(',')}){${ps.map(p => `this.${p.name}=${p.name};`).join('')}${fieldInits.join('')}}`,
        );
        if (!t.members.some(m => m.name === 'ToString'))
          parts.push(
            `ToString(){return "${t.name} { ${ps.map(p => `${p.name} = \${__fmt(this.${p.name})}`).join(', ')} }".replace(/^/, '')}`,
          );
      } else {
        const sup = t.base && userTypes.has(t.base) ? 'super(...arguments);' : '';
        parts.push(`constructor(){${sup}${fieldInits.join('')}}`);
      }
    }
    if (!t.members.some(m => m.name === 'ToString') && !t.recordParams)
      parts.push(`ToString(){return ${JSON.stringify((ctx.ns ? ctx.ns + '.' : '') + t.name)};}`);
    parts.push('toString(){return __fmt(this.ToString());}');
    const ext = t.base && userTypes.has(t.base) ? ` extends ${t.base}` : '';
    return `class ${t.name}${ext}{${parts.join('\n')}}`;
  }

  /* Główna funkcja: pliki → moduł JS */
  function transpile(files, opts) {
    const warn = [];
    const controls = new Set(opts.controls || []);
    const allStrs = [];
    const tk = files.map(f => {
      const t = tokenize(f.src, allStrs);
      t.file = f.name;
      if (opts.instrument) {
        try {
          t.code = opts.instrument(t.code, allStrs, f.name);
        } catch (e) {
          warn.push('debug: ' + e.message);
        }
      }
      t.types = scanTypes(t.code);
      t.types.forEach(x => (x.__code = t.code));
      return t;
    });
    const main = findMainType(tk[0].types);
    if (!main) throw new Error(L('Nie znaleziono klasy MainWindow.', 'The MainWindow class was not found.'));
    const userTypes = new Set();
    tk.forEach(t =>
      t.types.forEach(x => {
        if (x !== main) userTypes.add(x.name);
      }),
    );
    const methods = main.members.filter(m => m.kind === 'method');
    const members = new Set();
    main.members.forEach(m => {
      if (m.kind === 'field')
        fieldDecl(m.text, { hoist: new Set(), members, controls, methods: new Set() }).forEach(f =>
          members.add(f.name),
        );
      else if (m.name) members.add(m.name);
    });
    const ctx = {
      members,
      controls,
      methods: new Set(methods.map(m => m.name)),
      hoist: new Set(),
      warn,
      ns: opts.ns || '',
      ints: collectInts(tk.map(t => t.code).join('\n')),
      addStr: v => JSON.stringify(v),
    };
    const out = [];
    // enumy
    tk.forEach(t =>
      t.types
        .filter(x => x.tkind === 'enum')
        .forEach(e => {
          const body = t.code.slice(e.open + 1, e.close);
          const names = splitTop(body, ',')
            .map(x => x.split('=')[0].trim())
            .filter(Boolean);
          out.push(`const ${e.name} = Object.freeze({${names.map(n => `${n}:${JSON.stringify(n)}`).join(',')}});`);
        }),
    );
    // klasy użytkownika (bazowe najpierw)
    const cls = [];
    tk.forEach(t => t.types.filter(x => x !== main && /class|struct|record/.test(x.tkind)).forEach(x => cls.push(x)));
    const ordered = [];
    const done = new Set();
    const visit = c => {
      if (done.has(c.name)) return;
      done.add(c.name);
      const b = cls.find(x => x.name === c.base);
      if (b) visit(b);
      ordered.push(c);
    };
    cls.forEach(visit);
    ordered.forEach(c => {
      try {
        out.push(translateClass(c, allStrs, ctx, userTypes));
      } catch (e) {
        warn.push(`Klasa ${c.name}: ${e.message}`);
      }
    });
    tk.forEach(t => t.types.filter(x => x.tkind === 'interface').forEach(x => {}));
    // pola okna
    main.members.forEach(m => {
      if (m.kind === 'field') {
        const fs = fieldDecl(m.text, ctx);
        if (fs.length) out.push('let ' + fs.map(f => `${f.name} = ${f.init}`).join(', ') + ';');
      } else if (m.kind === 'prop') {
        const bodyTxt = tk[0].code.slice(m.body.open + 1, m.body.close);
        if (/\bget\s*;/.test(bodyTxt))
          out.push(`let ${m.name} = ${m.init ? txExpr(m.init, ctx) : defaultFor(m.type)};`);
        else
          warn.push(
            L(
              `Właściwość ${m.name} z własnym get/set w oknie — symulacja traktuje ją jak pole.`,
              `Property ${m.name} with a custom get/set in the window is treated as a field by the simulation.`,
            ),
          ),
            out.push(`let ${m.name} = ${defaultFor(m.type)};`);
      } else if (m.kind === 'getter') out.push(`const __get_${m.name} = () => (${txExpr(m.expr, ctx)});`);
    });
    // metody okna
    let ctorBody = '';
    const seen = new Set();
    methods.forEach(m => {
      const ps = paramNames(m.params);
      const hoist = new Set();
      const c2 = Object.assign({}, ctx, { hoist });
      const raw =
        m.exprBody !== undefined
          ? m.name === main.name
            ? m.exprBody + ';'
            : 'return ' + m.exprBody + ';'
          : tk[0].code.slice(m.body.open + 1, m.body.close);
      let b = guardLoops(txExpr(raw, c2));
      const hdecl = hoist.size ? `let ${[...hoist].join(',')};` : '';
      if (m.name === main.name) {
        ctorBody = hdecl + b.replace(/\bInitializeComponent\s*\(\s*\)\s*;/, '');
        return;
      }
      if (seen.has(m.name))
        warn.push(
          L(
            `Metoda ${m.name} jest przeciążona — symulacja używa ostatniej definicji.`,
            `Method ${m.name} is overloaded; the simulation uses the last definition.`,
          ),
        );
      seen.add(m.name);
      const plist = ps.map(p => (p.def ? `${p.name} = ${txExpr(p.def, c2)}` : p.name)).join(', ');
      out.push(`${m.async ? 'async ' : ''}function ${m.name}(${plist}){${hdecl}${b}}`);
    });
    const getters = main.members.filter(m => m.kind === 'getter').map(m => m.name);
    out.push(
      `return {ctor: function(){${ctorBody}}, m: {${[...seen].join(',')}}, getters: {${getters.map(g => `${g}: __get_${g}`).join(',')}}};`,
    );
    let js = out.join('\n');
    // gettery okna: zamień odwołania
    getters.forEach(g => {
      js = js
        .replace(new RegExp('(^|[^.\\w])' + g + '\\b(?!\\s*\\()', 'g'), `$1__get_${g}()`)
        .replace(new RegExp(`const __get___get_${g}\\(\\)`), `const __get_${g}`);
    });
    js = restore(js, allStrs, ctx);
    return { js, warn };
  }

  /* sygnatury składowych typów użytkownika (dla IntelliSense) */
  function memberSigs(src) {
    const t = tokenize(src);
    const types = scanTypes(t.code);
    const out = [];
    const strip = (s, mods) => s.slice(mods.length).trim();
    types.forEach(ty => {
      const rec = { name: ty.name, kind: ty.tkind, base: ty.base, line: ty.line, members: [], ty };
      if (ty.tkind === 'enum' && ty.open >= 0)
        splitTop(t.code.slice(ty.open + 1, ty.close), ',')
          .map(x => x.split('=')[0].trim())
          .filter(Boolean)
          .forEach(n => rec.members.push({ kind: 'c', name: n, type: ty.name, isStatic: true }));
      if (ty.recordParams)
        paramNames(ty.recordParams).forEach((p, i) => {
          const tp = splitTop(ty.recordParams, ',')
            [i].trim()
            .replace(/\s+\w+\s*(=.*)?$/, '');
          rec.members.push({ kind: 'p', name: p.name, type: tp });
        });
      ty.members.forEach(m => {
        const rest = m.hdr ? strip(m.hdr, m.mods || '') : '';
        if (m.kind === 'method') {
          const mm = /^(.*?)\s*\b(\w+)\s*(?:<[^>]*>)?\s*\(/.exec(rest);
          const rt = mm ? mm[1].replace(/\b(async|override|virtual|abstract|new|static|partial)\s+/g, '').trim() : '';
          rec.members.push({
            kind: m.name === ty.name ? 'ctor' : 'm',
            name: m.name,
            type: rt || ty.name,
            params: (m.params || '').replace(/\s+/g, ' ').trim(),
            isStatic: m.isStatic,
            line: m.line,
          });
        } else if (m.kind === 'prop') {
          const bt = m.body ? t.code.slice(m.body.open + 1, m.body.close) : '';
          rec.members.push({
            kind: 'p',
            name: m.name,
            type: (m.type || '').trim(),
            isStatic: m.isStatic,
            line: m.line,
            ro: !/\b(set|init)\b/.test(bt),
            auto: /\bget\s*;/.test(bt),
          });
        } else if (m.kind === 'getter') {
          const gm = /^(.*?)\s*\b(\w+)\s*=>/.exec(rest);
          rec.members.push({
            kind: 'p',
            name: m.name,
            type: gm ? gm[1].trim() : '',
            isStatic: m.isStatic,
            line: m.line,
            ro: true,
          });
        } else if (m.kind === 'field') {
          const fm = /^([\w.<>\[\],?() ]+?)\s+([A-Za-z_]\w*\s*(?:=[\s\S]*)?(?:,[\s\S]*)?)$/.exec((m.text || '').trim());
          if (fm)
            splitTop(fm[2], ',').forEach(d => {
              const nm = d.split('=')[0].trim();
              if (/^\w+$/.test(nm))
                rec.members.push({
                  kind: m.isConst ? 'c' : 'f',
                  name: nm,
                  type: fm[1].replace(/\b(const|readonly|static|volatile)\s+/g, '').trim(),
                  isStatic: m.isStatic || m.isConst,
                  line: m.line,
                });
            });
        }
      });
      out.push(rec);
    });
    return out;
  }
  return {
    tokenize,
    scanTypes,
    findMainType,
    methodsOf,
    check,
    transpile,
    paramNames,
    match,
    splitTop,
    KW,
    collectNames,
    lineOf,
    memberSigs,
    decodeEsc,
  };
})();

/* ===== Biblioteka uruchomieniowa (symulacja .NET) ===== */
var CSRT = (function () {
  'use strict';
  const def = (proto, name, fn, getter) => {
    try {
      Object.defineProperty(
        proto,
        name,
        getter ? { get: fn, configurable: true } : { value: fn, writable: true, configurable: true },
      );
    } catch (e) {}
  };
  const NBSP = ' ';
  const DEC = () => L(',', '.');
  function group(intStr) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, L(NBSP, ','));
  }
  function roundEven(x, d) {
    const f = Math.pow(10, d || 0);
    const v = x * f;
    const r = Math.round(v);
    const diff = Math.abs(v % 1);
    const res = Math.abs(diff - 0.5) < 1e-9 ? (r % 2 === 0 ? r : r - 1) : r;
    return res / f;
  }
  function fmtNum(v, f) {
    if (typeof v === 'bigint') v = Number(v);
    if (!isFinite(v)) return isNaN(v) ? 'NaN' : v > 0 ? '∞' : '-∞';
    if (!f) return Number.isInteger(v) ? String(v) : String(+v.toPrecision(15)).replace('.', DEC());
    const m = /^([FfNnDdCcPpEeXxGgRr])(\d*)$/.exec(f);
    if (m) {
      const k = m[1].toUpperCase(),
        d = m[2] === '' ? null : +m[2];
      switch (k) {
        case 'F':
          return v.toFixed(d == null ? 2 : d).replace('.', DEC());
        case 'N': {
          const s = Math.abs(v)
            .toFixed(d == null ? 2 : d)
            .split('.');
          return (v < 0 ? '-' : '') + group(s[0]) + (s[1] ? DEC() + s[1] : '');
        }
        case 'D': {
          const s = String(Math.abs(Math.trunc(v))).padStart(d || 0, '0');
          return (v < 0 ? '-' : '') + s;
        }
        case 'C':
          return UI_LANG === 'en'
            ? (v < 0 ? '-$' : '$') + fmtNum(Math.abs(v), 'N' + (d == null ? 2 : d))
            : fmtNum(v, 'N' + (d == null ? 2 : d)) + NBSP + 'zł';
        case 'P':
          return fmtNum(v * 100, 'N' + (d == null ? 2 : d)) + L(NBSP, '') + '%';
        case 'E':
          return v
            .toExponential(d == null ? 6 : d)
            .replace('.', DEC())
            .replace(/e([+-])(\d+)/, (x, s, e) => (m[1] === 'e' ? 'e' : 'E') + s + e.padStart(3, '0'));
        case 'X': {
          const s = (Math.trunc(v) >>> 0).toString(16).padStart(d || 0, '0');
          return m[1] === 'x' ? s : s.toUpperCase();
        }
        default:
          return fmtNum(v);
      }
    }
    // własne: 0.00, #,##0.0, 000
    const dot = f.indexOf('.');
    const decPart = dot >= 0 ? f.slice(dot + 1).replace(/[^0#]/g, '') : '';
    const minDec = (decPart.match(/0/g) || []).length,
      maxDec = decPart.length;
    let s = Math.abs(v).toFixed(maxDec);
    if (maxDec > minDec) s = s.replace(new RegExp('0{1,' + (maxDec - minDec) + '}$'), '').replace(/\.$/, '');
    let [ip, dp] = s.split('.');
    const intPat = dot >= 0 ? f.slice(0, dot) : f;
    const minInt = intPat.replace(/[^0]/g, '').length;
    ip = ip.padStart(minInt, '0');
    if (minInt === 0 && ip === '0' && dp) ip = intPat.includes('#') ? '' : ip;
    if (intPat.includes(',')) ip = group(ip);
    const pre = (f.match(/^[^0#,.]*/) || [''])[0],
      post = (f.match(/[^0#,.]*$/) || [''])[0];
    return (v < 0 ? '-' : '') + pre + ip + (dp ? DEC() + dp : '') + post;
  }
  class NetException extends Error {
    constructor(type, msg) {
      super(msg);
      this.netType = type;
    }
    get Message() {
      return this.message;
    }
  }
  function fmt(v, f) {
    if (v == null) return '';
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'number') return fmtNum(v, f);
    if (Array.isArray(v)) return 'System.Collections.Generic.List`1[System.Object]';
    if (typeof v === 'object' && typeof v.ToString === 'function') return String(v.ToString(f));
    if (typeof v === 'function' && v.__num) return String(v.valueOf());
    return String(v);
  }
  // ---- prototypy w stylu .NET ----
  const S = String.prototype;
  def(
    S,
    'Length',
    function () {
      return this.length;
    },
    true,
  );
  def(S, 'Trim', function (c) {
    return c ? this.replace(new RegExp('^[' + c + ']+|[' + c + ']+$', 'g'), '') : this.trim();
  });
  def(S, 'TrimStart', function () {
    return this.trimStart();
  });
  def(S, 'TrimEnd', function () {
    return this.trimEnd();
  });
  def(S, 'ToUpper', function () {
    return this.toLocaleUpperCase('pl-PL');
  });
  def(S, 'ToLower', function () {
    return this.toLocaleLowerCase('pl-PL');
  });
  def(S, 'ToUpperInvariant', function () {
    return this.toUpperCase();
  });
  def(S, 'ToLowerInvariant', function () {
    return this.toLowerCase();
  });
  def(S, 'Contains', function (x) {
    return this.includes(String(x));
  });
  def(S, 'Replace', function (a, b) {
    return this.split(String(a)).join(String(b));
  });
  def(S, 'Substring', function (a, n) {
    if (a < 0 || a > this.length || (n != null && (n < 0 || a + n > this.length)))
      throw new NetException(
        'System.ArgumentOutOfRangeException',
        L(
          "Indeks i długość muszą odwoływać się do lokalizacji w ciągu. (Parameter 'length')",
          "Index and length must refer to a location within the string. (Parameter 'length')",
        ),
      );
    return n == null ? this.substring(a) : this.substr(a, n);
  });
  def(S, 'StartsWith', function (x) {
    return this.startsWith(String(x));
  });
  def(S, 'EndsWith', function (x) {
    return this.endsWith(String(x));
  });
  def(S, 'IndexOf', function (x, st) {
    return this.indexOf(String(x), st || 0);
  });
  def(S, 'LastIndexOf', function (x) {
    return this.lastIndexOf(String(x));
  });
  def(S, 'Split', function (...seps) {
    let opt = null;
    if (
      typeof seps[seps.length - 1] === 'string' &&
      /^(RemoveEmptyEntries|None|TrimEntries)$/.test(seps[seps.length - 1]) &&
      seps.length > 1
    )
      opt = seps.pop();
    if (!seps.length) seps = [' '];
    const flat = seps.flat();
    const re = new RegExp(flat.map(x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
    let r = this.split(re);
    if (opt === 'RemoveEmptyEntries') r = r.filter(x => x !== '');
    return r;
  });
  def(S, 'Insert', function (i, x) {
    return this.slice(0, i) + x + this.slice(i);
  });
  def(S, 'Remove', function (i, n) {
    return n == null ? this.slice(0, i) : this.slice(0, i) + this.slice(i + n);
  });
  def(S, 'PadLeft', function (n, c) {
    return this.padStart(n, c || ' ');
  });
  def(S, 'PadRight', function (n, c) {
    return this.padEnd(n, c || ' ');
  });
  def(S, 'ToCharArray', function () {
    return [...this];
  });
  def(S, 'Equals', function (x) {
    return String(this) === String(x);
  });
  def(S, 'CompareTo', function (x) {
    return String(this).localeCompare(String(x), 'pl');
  });
  def(S, 'ToString', function () {
    return String(this);
  });
  def(S, 'GetHashCode', function () {
    let h = 0;
    for (const c of this) h = (h * 31 + c.charCodeAt(0)) | 0;
    return h;
  });
  const N = Number.prototype;
  def(N, 'ToString', function (f) {
    return fmtNum(+this, f);
  });
  def(N, 'Equals', function (x) {
    return +this === +x;
  });
  def(N, 'CompareTo', function (x) {
    return +this < x ? -1 : +this > x ? 1 : 0;
  });
  def(Boolean.prototype, 'ToString', function () {
    return this.valueOf() ? 'True' : 'False';
  });
  def(
    Error.prototype,
    'Message',
    function () {
      return this.message;
    },
    true,
  );
  const A = Array.prototype;
  const countFn = function () {
    const arr = this;
    const f = function (pred) {
      return pred ? arr.filter(pred).length : arr.length;
    };
    f.valueOf = () => arr.length;
    f.toString = () => String(arr.length);
    f.__num = true;
    return f;
  };
  def(A, 'Count', countFn, true);
  def(
    A,
    'Length',
    function () {
      return this.length;
    },
    true,
  );
  def(A, 'Add', function (x) {
    this.push(x);
  });
  def(A, 'AddRange', function (xs) {
    for (const x of xs) this.push(x);
  });
  def(A, 'Insert', function (i, x) {
    this.splice(i, 0, x);
  });
  def(A, 'Remove', function (x) {
    const i = this.findIndex(y => y === x || (y != null && y.Equals && y.Equals(x)));
    if (i >= 0) {
      this.splice(i, 1);
      return true;
    }
    return false;
  });
  def(A, 'RemoveAt', function (i) {
    if (i < 0 || i >= this.length)
      throw new NetException(
        'System.ArgumentOutOfRangeException',
        L(
          'Indeks był spoza zakresu. Musi być nieujemny i mniejszy niż rozmiar kolekcji.',
          'Index was out of range. Must be non-negative and less than the size of the collection.',
        ),
      );
    this.splice(i, 1);
  });
  def(A, 'RemoveAll', function (p) {
    let n = 0;
    for (let i = this.length - 1; i >= 0; i--)
      if (p(this[i])) {
        this.splice(i, 1);
        n++;
      }
    return n;
  });
  def(A, 'Clear', function () {
    this.length = 0;
  });
  def(A, 'Contains', function (x) {
    return this.some(y => y === x || (y != null && typeof y.Equals === 'function' && y.Equals(x)));
  });
  def(A, 'IndexOf', function (x) {
    return this.indexOf(x);
  });
  def(A, 'Sum', function (f) {
    return this.reduce((a, b) => a + (f ? f(b) : b), 0);
  });
  def(A, 'Average', function (f) {
    if (!this.length)
      throw new NetException(
        'System.InvalidOperationException',
        L('Sekwencja nie zawiera elementów.', 'Sequence contains no elements.'),
      );
    return this.Sum(f) / this.length;
  });
  def(A, 'Max', function (f) {
    if (!this.length)
      throw new NetException(
        'System.InvalidOperationException',
        L('Sekwencja nie zawiera elementów.', 'Sequence contains no elements.'),
      );
    return this.map(x => (f ? f(x) : x)).reduce((a, b) => (b > a ? b : a));
  });
  def(A, 'Min', function (f) {
    if (!this.length)
      throw new NetException(
        'System.InvalidOperationException',
        L('Sekwencja nie zawiera elementów.', 'Sequence contains no elements.'),
      );
    return this.map(x => (f ? f(x) : x)).reduce((a, b) => (b < a ? b : a));
  });
  def(A, 'Where', function (f) {
    return this.filter((x, i) => f(x, i));
  });
  def(A, 'Select', function (f) {
    return this.map((x, i) => f(x, i));
  });
  def(A, 'SelectMany', function (f) {
    return this.flatMap(x => [...f(x)]);
  });
  const cmp = (a, b) => (typeof a === 'string' ? a.localeCompare(b, 'pl') : a < b ? -1 : a > b ? 1 : 0);
  def(A, 'OrderBy', function (f) {
    return [...this].sort((a, b) => cmp(f(a), f(b)));
  });
  def(A, 'OrderByDescending', function (f) {
    return [...this].sort((a, b) => cmp(f(b), f(a)));
  });
  def(A, 'ThenBy', function () {
    return this;
  });
  def(A, 'Sort', function (c) {
    this.sort(c ? (a, b) => c(a, b) : cmp);
  });
  def(A, 'Reverse', function () {
    return this.reverse();
  });
  def(A, 'ToList', function () {
    return [...this];
  });
  def(A, 'ToArray', function () {
    return [...this];
  });
  def(A, 'First', function (f) {
    const r = f ? this.find(f) : this[0];
    if (r === undefined)
      throw new NetException(
        'System.InvalidOperationException',
        L('Sekwencja nie zawiera pasujących elementów.', 'Sequence contains no matching element.'),
      );
    return r;
  });
  def(A, 'FirstOrDefault', function (f) {
    const r = f ? this.find(f) : this[0];
    return r === undefined ? null : r;
  });
  def(A, 'Last', function (f) {
    const a = f ? this.filter(f) : this;
    if (!a.length)
      throw new NetException(
        'System.InvalidOperationException',
        L('Sekwencja nie zawiera elementów.', 'Sequence contains no elements.'),
      );
    return a[a.length - 1];
  });
  def(A, 'LastOrDefault', function (f) {
    const a = f ? this.filter(f) : this;
    return a.length ? a[a.length - 1] : null;
  });
  def(A, 'Any', function (f) {
    return f ? this.some(f) : this.length > 0;
  });
  def(A, 'All', function (f) {
    return this.every(f);
  });
  def(A, 'Distinct', function () {
    return [...new Set(this)];
  });
  def(A, 'Take', function (n) {
    return this.slice(0, n);
  });
  def(A, 'Skip', function (n) {
    return this.slice(n);
  });
  def(A, 'Find', function (f) {
    const r = this.find(f);
    return r === undefined ? null : r;
  });
  def(A, 'FindAll', function (f) {
    return this.filter(f);
  });
  def(A, 'FindIndex', function (f) {
    return this.findIndex(f);
  });
  def(A, 'ForEach', function (f) {
    this.forEach(x => f(x));
  });
  def(A, 'Exists', function (f) {
    return this.some(f);
  });
  def(A, 'Aggregate', function (a, f) {
    return f ? this.reduce(f, a) : this.reduce(a);
  });
  def(A, 'GroupBy', function (f) {
    const m = new Map();
    this.forEach(x => {
      const k = f(x);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    });
    return [...m].map(([k, v]) => Object.assign(v, { Key: k }));
  });
  def(A, 'ToString', function () {
    return 'System.Collections.Generic.List`1';
  });
  def(A, 'Enqueue', function (x) {
    this.push(x);
  });
  def(A, 'Dequeue', function () {
    if (!this.length)
      throw new NetException('System.InvalidOperationException', L('Kolejka jest pusta.', 'Queue empty.'));
    return this.shift();
  });
  def(A, 'Push', function (x) {
    this.push(x);
  });
  def(A, 'Pop', function () {
    if (!this.length) throw new NetException('System.InvalidOperationException', L('Stos jest pusty.', 'Stack empty.'));
    return this.pop();
  });
  def(A, 'Peek', function () {
    if (!this.length)
      throw new NetException('System.InvalidOperationException', L('Kolekcja jest pusta.', 'Collection is empty.'));
    return this[this.length - 1];
  });

  function parseNum(s, isInt, type) {
    const t = String(s == null ? '' : s)
      .trim()
      .replace(/[\s ]/g, '');
    if (isInt) {
      if (!/^[+-]?\d+$/.test(t))
        throw new NetException('System.FormatException', `The input string '${s}' was not in a correct format.`);
      return parseInt(t, 10);
    }
    const u = UI_LANG === 'en' ? t.replace(/,/g, '') : t.replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(u))
      throw new NetException('System.FormatException', `The input string '${s}' was not in a correct format.`);
    return parseFloat(u);
  }
  const IntT = {
    Parse: s => parseNum(s, true),
    TryParse: (s, set) => {
      try {
        set(parseNum(s, true));
        return true;
      } catch (e) {
        set(0);
        return false;
      }
    },
    MaxValue: 2147483647,
    MinValue: -2147483648,
  };
  const DblT = {
    Parse: s => parseNum(s, false),
    TryParse: (s, set) => {
      try {
        set(parseNum(s, false));
        return true;
      } catch (e) {
        set(0);
        return false;
      }
    },
    MaxValue: Number.MAX_VALUE,
    MinValue: -Number.MAX_VALUE,
    NaN: NaN,
    PositiveInfinity: Infinity,
    NegativeInfinity: -Infinity,
    IsNaN: isNaN,
    Epsilon: 5e-324,
  };
  const CharT = {
    IsDigit: c => /^\d$/.test(c),
    IsLetter: c => /^\p{L}$/u.test(c),
    IsLetterOrDigit: c => /^[\p{L}\d]$/u.test(c),
    IsUpper: c => c !== c.toLowerCase(),
    IsLower: c => c !== c.toUpperCase(),
    IsWhiteSpace: c => /^\s$/.test(c),
    ToUpper: c => c.toUpperCase(),
    ToLower: c => c.toLowerCase(),
    IsPunctuation: c => /^\p{P}$/u.test(c),
    From: n => (typeof n === 'number' ? String.fromCharCode(n) : n),
    GetNumericValue: c => (/\d/.test(c) ? +c : -1),
  };
  const BoolT = {
    Parse: s => {
      const t = String(s).trim().toLowerCase();
      if (t === 'true') return true;
      if (t === 'false') return false;
      throw new NetException('System.FormatException', `String '${s}' was not recognized as a valid Boolean.`);
    },
    TryParse: (s, set) => {
      const t = String(s).trim().toLowerCase();
      if (t === 'true' || t === 'false') {
        set(t === 'true');
        return true;
      }
      set(false);
      return false;
    },
  };
  const StrT = {
    IsNullOrEmpty: s => s == null || s === '',
    IsNullOrWhiteSpace: s => s == null || String(s).trim() === '',
    Empty: '',
    Join: (sep, ...xs) =>
      (xs.length === 1 && xs[0] && typeof xs[0] !== 'string' && xs[0][Symbol.iterator] ? [...xs[0]] : xs)
        .map(x => fmt(x))
        .join(sep),
    Concat: (...xs) =>
      (xs.length === 1 && xs[0] && typeof xs[0] !== 'string' && xs[0][Symbol.iterator] ? [...xs[0]] : xs)
        .map(x => fmt(x))
        .join(''),
    Format: (f, ...a) =>
      String(f)
        .replace(/\{(\d+)(?:,(-?\d+))?(?::([^}]*))?\}/g, (m, i, al, ff) => {
          let s = fmt(a[+i], ff);
          if (al) s = +al < 0 ? s.padEnd(-al) : s.padStart(+al);
          return s;
        })
        .replace(/\{\{/g, '{')
        .replace(/\}\}/g, '}'),
    Compare: (a, b) => String(a).localeCompare(String(b), 'pl'),
    Equals: (a, b) => a === b,
    Copy: s => s,
  };
  const MathT = {
    Abs: Math.abs,
    Sqrt: Math.sqrt,
    Pow: Math.pow,
    Floor: Math.floor,
    Ceiling: Math.ceil,
    Max: Math.max,
    Min: Math.min,
    Sin: Math.sin,
    Cos: Math.cos,
    Tan: Math.tan,
    Asin: Math.asin,
    Acos: Math.acos,
    Atan: Math.atan,
    Atan2: Math.atan2,
    Log: (x, b) => (b ? Math.log(x) / Math.log(b) : Math.log(x)),
    Log10: Math.log10,
    Log2: Math.log2,
    Exp: Math.exp,
    Sign: Math.sign,
    Truncate: x => Math.trunc(Number(x)),
    Cbrt: Math.cbrt,
    Round: (x, d, mode) => {
      if (typeof d === 'string') {
        mode = d;
        d = 0;
      }
      if (mode === 'AwayFromZero') {
        const f = Math.pow(10, d || 0);
        return (Math.sign(x) * Math.round(Math.abs(x) * f)) / f;
      }
      return roundEven(x, d || 0);
    },
    Clamp: (v, a, b) => Math.min(Math.max(v, a), b),
    PI: Math.PI,
    E: Math.E,
    Tau: 2 * Math.PI,
    __idiv: (a, b) => {
      if (+b === 0) throw new NetException('System.DivideByZeroException', 'Attempted to divide by zero.');
      return Math.trunc(a / b);
    },
  };
  const ConvertT = {
    ToInt32: x =>
      typeof x === 'string' ? parseNum(x, true) : typeof x === 'boolean' ? (x ? 1 : 0) : roundEven(Number(x), 0),
    ToInt64: x => ConvertT.ToInt32(x),
    ToInt16: x => ConvertT.ToInt32(x),
    ToByte: x => ConvertT.ToInt32(x),
    ToDouble: x => (typeof x === 'string' ? parseNum(x, false) : Number(x)),
    ToDecimal: x => ConvertT.ToDouble(x),
    ToSingle: x => ConvertT.ToDouble(x),
    ToString: (x, b) => (b ? Math.trunc(x).toString(b) : fmt(x)),
    ToBoolean: x => (typeof x === 'string' ? BoolT.Parse(x) : !!x),
    ToChar: x => (typeof x === 'number' ? String.fromCharCode(x) : String(x)[0]),
  };
  class DateTimeT {
    constructor(y, mo, d, h, mi, s) {
      this.d =
        y instanceof Date
          ? y
          : y == null
            ? new Date(1, 0, 1)
            : new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0, s || 0);
    }
    static get Now() {
      return new DateTimeT(new Date());
    }
    static get Today() {
      const n = new Date();
      return new DateTimeT(new Date(n.getFullYear(), n.getMonth(), n.getDate()));
    }
    static Parse(s) {
      const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(s);
      if (m) return new DateTimeT(+m[3], +m[2], +m[1]);
      const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s);
      if (us) return new DateTimeT(+us[3], +us[1], +us[2]);
      const d = new Date(s);
      if (isNaN(d))
        throw new NetException('System.FormatException', `String '${s}' was not recognized as a valid DateTime.`);
      return new DateTimeT(d);
    }
    static IsLeapYear(y) {
      return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    }
    static DaysInMonth(y, m) {
      return new Date(y, m, 0).getDate();
    }
    get Year() {
      return this.d.getFullYear();
    }
    get Month() {
      return this.d.getMonth() + 1;
    }
    get Day() {
      return this.d.getDate();
    }
    get Hour() {
      return this.d.getHours();
    }
    get Minute() {
      return this.d.getMinutes();
    }
    get Second() {
      return this.d.getSeconds();
    }
    get Millisecond() {
      return this.d.getMilliseconds();
    }
    get DayOfWeek() {
      return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][this.d.getDay()];
    }
    get DayOfYear() {
      return Math.floor((this.d - new Date(this.d.getFullYear(), 0, 0)) / 864e5);
    }
    get Date() {
      return new DateTimeT(new Date(this.d.getFullYear(), this.d.getMonth(), this.d.getDate()));
    }
    get Ticks() {
      return this.d.getTime() * 10000;
    }
    add(ms) {
      return new DateTimeT(new Date(this.d.getTime() + ms));
    }
    AddDays(n) {
      const x = new Date(this.d);
      x.setDate(x.getDate() + n);
      return new DateTimeT(x);
    }
    AddMonths(n) {
      const x = new Date(this.d);
      x.setMonth(x.getMonth() + n);
      return new DateTimeT(x);
    }
    AddYears(n) {
      const x = new Date(this.d);
      x.setFullYear(x.getFullYear() + n);
      return new DateTimeT(x);
    }
    AddHours(n) {
      return this.add(n * 36e5);
    }
    AddMinutes(n) {
      return this.add(n * 6e4);
    }
    AddSeconds(n) {
      return this.add(n * 1e3);
    }
    AddMilliseconds(n) {
      return this.add(n);
    }
    Subtract(o) {
      return o instanceof DateTimeT ? new TimeSpanT(this.d - o.d) : this.add(-Number(o));
    }
    valueOf() {
      return this.d.getTime();
    }
    ToString(f) {
      const p = (n, l = 2) => String(n).padStart(l, '0');
      const d = this.d;
      const en = UI_LANG === 'en';
      if (!f) f = en ? 'M/d/yyyy h:mm:ss tt' : 'dd.MM.yyyy HH:mm:ss';
      if (f === 'd') f = en ? 'M/d/yyyy' : 'dd.MM.yyyy';
      if (f === 't') f = en ? 'h:mm tt' : 'HH:mm';
      if (f === 'T') f = en ? 'h:mm:ss tt' : 'HH:mm:ss';
      if (f === 'D')
        return d.toLocaleDateString(en ? 'en-US' : 'pl-PL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      const MN = en
        ? [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December',
          ]
        : [
            'stycznia',
            'lutego',
            'marca',
            'kwietnia',
            'maja',
            'czerwca',
            'lipca',
            'sierpnia',
            'września',
            'października',
            'listopada',
            'grudnia',
          ];
      const DN = en
        ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        : ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
      return f.replace(
        /yyyy|yy|MMMM|MM|M|dddd|dd|d|HH|H|hh|mm|ss|fff|tt/g,
        t =>
          ({
            yyyy: d.getFullYear(),
            yy: p(d.getFullYear() % 100),
            MMMM: MN[d.getMonth()],
            MM: p(d.getMonth() + 1),
            M: d.getMonth() + 1,
            dddd: DN[d.getDay()],
            dd: p(d.getDate()),
            d: d.getDate(),
            HH: p(d.getHours()),
            H: d.getHours(),
            hh: p(d.getHours() % 12 || 12),
            mm: p(d.getMinutes()),
            ss: p(d.getSeconds()),
            fff: p(d.getMilliseconds(), 3),
            tt: d.getHours() < 12 ? 'AM' : 'PM',
          })[t],
      );
    }
    ToShortDateString() {
      return this.ToString('d');
    }
    ToLongDateString() {
      return this.ToString('D');
    }
    ToShortTimeString() {
      return this.ToString('t');
    }
    ToLongTimeString() {
      return this.ToString('T');
    }
    toString() {
      return this.ToString();
    }
    Equals(o) {
      return o && +o === +this;
    }
  }
  class TimeSpanT {
    constructor(a, b, c, d, e) {
      if (arguments.length === 1) this.ms = a / 10000;
      else if (arguments.length === 3) this.ms = ((a * 60 + b) * 60 + c) * 1000;
      else if (arguments.length >= 4) this.ms = (((a * 24 + b) * 60 + c) * 60 + d) * 1000 + (e || 0);
      else this.ms = 0;
      if (arguments.length === 1 && a instanceof Object) this.ms = 0;
    }
    static ms(v) {
      const t = new TimeSpanT();
      t.ms = v;
      return t;
    }
    static FromMilliseconds(v) {
      return TimeSpanT.ms(v);
    }
    static FromSeconds(v) {
      return TimeSpanT.ms(v * 1e3);
    }
    static FromMinutes(v) {
      return TimeSpanT.ms(v * 6e4);
    }
    static FromHours(v) {
      return TimeSpanT.ms(v * 36e5);
    }
    static FromDays(v) {
      return TimeSpanT.ms(v * 864e5);
    }
    static get Zero() {
      return TimeSpanT.ms(0);
    }
    get TotalMilliseconds() {
      return this.ms;
    }
    get TotalSeconds() {
      return this.ms / 1e3;
    }
    get TotalMinutes() {
      return this.ms / 6e4;
    }
    get TotalHours() {
      return this.ms / 36e5;
    }
    get TotalDays() {
      return this.ms / 864e5;
    }
    get Milliseconds() {
      return Math.trunc(this.ms % 1000);
    }
    get Seconds() {
      return Math.trunc(this.ms / 1e3) % 60;
    }
    get Minutes() {
      return Math.trunc(this.ms / 6e4) % 60;
    }
    get Hours() {
      return Math.trunc(this.ms / 36e5) % 24;
    }
    get Days() {
      return Math.trunc(this.ms / 864e5);
    }
    Add(o) {
      return TimeSpanT.ms(this.ms + Number(o));
    }
    Subtract(o) {
      return TimeSpanT.ms(this.ms - Number(o));
    }
    valueOf() {
      return this.ms;
    }
    ToString(f) {
      const p = n => String(n).padStart(2, '0');
      if (f)
        return f
          .replace(/\\/g, '')
          .replace(
            /hh|mm|ss|ff/g,
            t =>
              ({
                hh: p(this.Hours),
                mm: p(this.Minutes),
                ss: p(this.Seconds),
                ff: p(Math.trunc(this.Milliseconds / 10)),
              })[t],
          );
      return (this.Days ? this.Days + '.' : '') + p(this.Hours) + ':' + p(this.Minutes) + ':' + p(this.Seconds);
    }
    toString() {
      return this.ToString();
    }
  }
  class RandomT {
    constructor(seed) {
      this.s = seed == null ? null : seed >>> 0 || 1;
    }
    r() {
      if (this.s == null) return Math.random();
      this.s ^= this.s << 13;
      this.s ^= this.s >>> 17;
      this.s ^= this.s << 5;
      return ((this.s >>> 0) % 1e9) / 1e9;
    }
    Next(a, b) {
      if (a == null) return Math.floor(this.r() * 2147483647);
      if (b == null) {
        b = a;
        a = 0;
      }
      if (a > b)
        throw new NetException('System.ArgumentOutOfRangeException', "'minValue' cannot be greater than maxValue.");
      return a + Math.floor(this.r() * (b - a));
    }
    NextDouble() {
      return this.r();
    }
    static get Shared() {
      return new RandomT();
    }
  }
  function makeDict(pairs) {
    const m = new Map(pairs || []);
    const api = {
      Add(k, v) {
        if (m.has(k))
          throw new NetException(
            'System.ArgumentException',
            `An item with the same key has already been added. Key: ${k}`,
          );
        m.set(k, v);
      },
      ContainsKey: k => m.has(k),
      ContainsValue: v => [...m.values()].includes(v),
      Remove: k => m.delete(k),
      Clear: () => m.clear(),
      TryGetValue(k, set) {
        if (m.has(k)) {
          set(m.get(k));
          return true;
        }
        set(null);
        return false;
      },
      TryAdd(k, v) {
        if (m.has(k)) return false;
        m.set(k, v);
        return true;
      },
      get Count() {
        return m.size;
      },
      get Keys() {
        return [...m.keys()];
      },
      get Values() {
        return [...m.values()];
      },
      [Symbol.iterator]: function* () {
        for (const [k, v] of m)
          yield {
            Key: k,
            Value: v,
            ToString() {
              return `[${fmt(k)}, ${fmt(v)}]`;
            },
          };
      },
      ToString: () => 'System.Collections.Generic.Dictionary`2',
    };
    return new Proxy(api, {
      get(t, k) {
        if (k in t) return t[k];
        if (typeof k === 'symbol') return undefined;
        const key = isNaN(k) ? k : m.has(k) ? k : +k;
        if (!m.has(key))
          throw new NetException(
            'System.Collections.Generic.KeyNotFoundException',
            `The given key '${k}' was not present in the dictionary.`,
          );
        return m.get(key);
      },
      set(t, k, v) {
        const key = isNaN(k) ? k : m.has(k) ? k : +k;
        m.set(key, v);
        return true;
      },
    });
  }
  function makeSet(arr) {
    const a = [...new Set(arr)];
    a.Add = function (x) {
      if (this.includes(x)) return false;
      this.push(x);
      return true;
    };
    return a;
  }
  function makeArr(type, n) {
    const v = /^(int|long|short|byte|double|float|decimal|uint)$/.test(type)
      ? 0
      : type === 'bool'
        ? false
        : type === 'char'
          ? '\0'
          : null;
    return new Array(n).fill(v);
  }

  return {
    fmt,
    fmtNum,
    NetException,
    IntT,
    DblT,
    CharT,
    BoolT,
    StrT,
    MathT,
    ConvertT,
    DateTimeT,
    TimeSpanT,
    RandomT,
    makeDict,
    makeSet,
    makeArr,
    roundEven,
  };
})();
if (typeof module !== 'undefined') module.exports = { CS, CSRT };
