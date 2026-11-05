/**
 * CappyCoder WPF — 06 · Debuger
 *
 * Zadanie: Punkty przerwania (F9), tryb przerwania, krokowanie F10/F11/Shift+F11, krok wstecz, okna Zmienne lokalne
 *   i Stos wywołań, podgląd wartości pod kursorem. Kod jest instrumentowany przez SEM.instrument (09) — każda
 *   instrukcja zapisuje wiersz i wartości zmiennych do śladu wykonania, po którym potem się poruszamy.
 * Zależy od: 01–05, 09
 * Udostępnia: toggleBp, dbgBreak, dbgCmd, dbgScope, …
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const DBG_CAP = 20000;
function dbgInfo() {
  return { methods: [], metas: [], lines: {} };
}

/* ---------- punkty przerwania w edytorze ---------- */
function bpMarker() {
  const s = document.createElement('span');
  s.className = 'bp-dot';
  s.title = L('Punkt przerwania (F9)', 'Breakpoint (F9)');
  return s;
}
function docBps(doc) {
  const out = [];
  doc.eachLine(lh => {
    if (lh.gutterMarkers && lh.gutterMarkers['bp-gutter']) out.push(doc.getLineNumber(lh) + 1);
  });
  return out;
}
function syncBps() {
  if (!P) return;
  P.bps = P.bps || {};
  Object.keys(DOCS).forEach(name => {
    if (DOCS[name] && DOCS[name].__bpApplied) P.bps[name] = docBps(DOCS[name]);
  });
  Object.keys(P.bps).forEach(k => {
    if (!P.bps[k] || !P.bps[k].length) delete P.bps[k];
  });
}
function applyBps(name) {
  const cm = EDC && EDC.cm;
  if (!cm || !DOCS[name] || cm.getDoc() !== DOCS[name] || DOCS[name].__bpApplied) return;
  DOCS[name].__bpApplied = true;
  ((P.bps || {})[name] || []).forEach(l => {
    if (l - 1 < cm.lineCount()) {
      cm.setGutterMarker(l - 1, 'bp-gutter', bpMarker());
      cm.addLineClass(l - 1, 'background', 'bp-line');
    }
  });
}
function toggleBp(line) {
  const cm = EDC && EDC.cm;
  if (!cm) return;
  const info = cm.lineInfo(line);
  if (!info) return;
  if (info.gutterMarkers && info.gutterMarkers['bp-gutter']) {
    cm.setGutterMarker(line, 'bp-gutter', null);
    cm.removeLineClass(line, 'background', 'bp-line');
  } else {
    cm.setGutterMarker(line, 'bp-gutter', bpMarker());
    cm.addLineClass(line, 'background', 'bp-line');
  }
  DOCS[codeFile] && (DOCS[codeFile].__bpApplied = true);
  syncBps();
  scheduleSave && scheduleSave();
  const n = Object.values(P.bps || {}).reduce((a, b) => a + b.length, 0);
  status(L(`Punkty przerwania: ${n}. F5 uruchamia debugowanie.`, `Breakpoints: ${n}. F5 starts debugging.`));
  if (RUN && RUN.dbg) RUN.dbg.bps = collectBpSet(RUN.dbg.info);
}
function clearBps() {
  Object.keys(DOCS).forEach(name => {
    const d = DOCS[name];
    if (!d) return;
    d.eachLine(lh => {
      if (lh.gutterMarkers && lh.gutterMarkers['bp-gutter']) {
        const n = d.getLineNumber(lh);
        if (EDC.cm.getDoc() === d) {
          EDC.cm.setGutterMarker(n, 'bp-gutter', null);
          EDC.cm.removeLineClass(n, 'background', 'bp-line');
        } else {
          delete lh.gutterMarkers['bp-gutter'];
        }
      }
    });
  });
  P.bps = {};
  scheduleSave && scheduleSave();
  status(L('Usunięto wszystkie punkty przerwania.', 'All breakpoints deleted.'));
  if (RUN && RUN.dbg) RUN.dbg.bps = new Set();
}
/* punkt przerwania na wierszu bez instrukcji (np. „{”) przenosimy na następną instrukcję — jak w Visual Studio */
function collectBpSet(info) {
  syncBps();
  const set = new Set();
  Object.entries(P.bps || {}).forEach(([file, lines]) => {
    const st = [...((info && info.lines[file]) || [])].sort((a, b) => a - b);
    lines.forEach(l => {
      const eff = st.find(x => x >= l);
      if (eff != null && eff - l < 40) set.add(file + ':' + eff);
    });
  });
  return set;
}

/* ---------- wartości do okna zmiennych ---------- */
function dbgVal(v, ty, lvl = 0) {
  let t = String(ty || '').replace(/^(out|ref) /, '');
  if (t === 'var') t = '';
  try {
    if (v === undefined) return { v: L('(brak wartości)', '(no value)'), t };
    if (v === null) return { v: 'null', t };
    if (typeof v === 'string')
      return t === 'char'
        ? { v: `'${v === '\0' ? '\\0' : v}'`, t }
        : { v: JSON.stringify(v.length > 300 ? v.slice(0, 300) + '…' : v), t: t || 'string' };
    if (typeof v === 'number')
      return {
        v: Number.isFinite(v) ? String(v) : Number.isNaN(v) ? 'NaN' : v > 0 ? '∞' : '-∞',
        t: t || (Number.isInteger(v) ? 'int' : 'double'),
      };
    if (typeof v === 'boolean') return { v: String(v), t: t || 'bool' };
    if (typeof v === 'function') {
      if (v.__num) return { v: String(v.valueOf()), t: t || 'int' };
      return { v: L('{metoda}', '{method}'), t: t || 'delegate' };
    }
    if (Array.isArray(v)) {
      const kids =
        lvl < 1 ? v.slice(0, 25).map((x, i) => Object.assign({ n: `[${i}]` }, dbgVal(x, elemOf(t), lvl + 1))) : null;
      if (kids && v.length > 25)
        kids.push({ n: '…', v: L(`jeszcze ${v.length - 25}`, `${v.length - 25} more`), t: '' });
      return { v: `Count = ${v.length}`, t: t || 'List', kids };
    }
    if (v instanceof Error) {
      const ty2 = v.netType || 'System.Exception';
      return {
        v: `{${ty2}: ${v.message}}`,
        t: ty2,
        kids: lvl < 1 ? [{ n: 'Message', v: JSON.stringify(v.message), t: 'string' }] : null,
      };
    }
    if (typeof v === 'object') {
      if (v.__node) {
        const n = v.__node;
        const kids =
          lvl < 1
            ? Object.entries(n.p || {})
                .filter(([k]) => !/^(Items|Columns)$/.test(k))
                .slice(0, 20)
                .map(([k, x]) => ({ n: k, v: JSON.stringify(String(x)), t: '' }))
            : null;
        if (kids) kids.unshift({ n: 'Name', v: JSON.stringify(n.name || ''), t: 'string' });
        return { v: `{${v.ToString()}}`, t: t || n.t, kids };
      }
      let s = '';
      try {
        s = typeof v.ToString === 'function' ? String(v.ToString()) : '';
      } catch (e) {}
      if (s === 'System.Collections.Generic.Dictionary`2') {
        const arr = [...v];
        return {
          v: `Count = ${arr.length}`,
          t: t || 'Dictionary',
          kids:
            lvl < 1
              ? arr.slice(0, 25).map(p => ({ n: `[${CSRT.fmt(p.Key)}]`, ...dbgVal(p.Value, '', lvl + 1) }))
              : null,
        };
      }
      const kids =
        lvl < 1
          ? Object.keys(v)
              .filter(k => !k.startsWith('__') && typeof v[k] !== 'function')
              .slice(0, 25)
              .map(k => Object.assign({ n: k }, dbgVal(v[k], '', lvl + 1)))
          : null;
      const cname = v.constructor && v.constructor.name && v.constructor.name !== 'Object' ? v.constructor.name : '';
      return {
        v: `{${s || cname || (t ? (/^[A-Z]/.test(t) && IS.T[t] && IS.T[t].ns ? IS.T[t].ns + '.' : '') + t : 'object')}}`,
        t: t || cname,
        kids: kids && kids.length ? kids : null,
      };
    }
    return { v: String(v), t };
  } catch (e) {
    return { v: L('(nie można odczytać)', '(cannot read)'), t };
  }
}
function elemOf(t) {
  const m =
    /^(?:List|IEnumerable|HashSet|Queue|Stack|ObservableCollection)<(.+)>$/.exec(t || '') || /^(.+)\[\]$/.exec(t || '');
  return m ? m[1] : '';
}
function dbgCapture(snap, meta) {
  let vals;
  try {
    vals = snap();
  } catch (e) {
    vals = [];
  }
  return (meta || []).map((m, i) =>
    Object.assign({ n: m.name, field: m.field, self: m.self }, dbgVal(vals[i], m.type)),
  );
}

/* ---------- funkcje wołane przez instrumentowany kod ---------- */
function dbgScope(S, rt) {
  S.__E = id => {
    const d = rt.dbg;
    if (!d) return;
    const m = d.info.methods[id];
    d.stack.push({ id, line: m ? m.line : 0, file: m ? m.file : '' });
  };
  S.__X = () => {
    const d = rt.dbg;
    if (d) d.stack.pop();
  };
  S.__XE = err => {
    const d = rt.dbg;
    if (!d || !err || typeof err !== 'object' || err.__dbg || err instanceof ExitSignal) return;
    try {
      err.__dbg = d.stack.map(f => ({
        id: f.id,
        line: f.line,
        file: f.file,
        vars: f.snap ? dbgCapture(f.snap, d.info.metas[f.mid]) : [],
      }));
    } catch (e) {}
  };
  S.__T = (line, mid, snap) => {
    const d = rt.dbg;
    if (!d) return;
    const fr = d.stack[d.stack.length - 1];
    if (!fr) return;
    fr.line = line;
    fr.snap = snap;
    fr.mid = mid;
    const hit = d.bps.has(fr.file + ':' + line);
    if (d.trace.length < DBG_CAP || (hit && d.trace.length < DBG_CAP * 2)) {
      d.trace.push({
        line,
        file: fr.file,
        depth: d.stack.length,
        frames: d.stack.map(f => ({ id: f.id, line: f.line, file: f.file })),
        vars: dbgCapture(snap, d.info.metas[mid]),
        hit,
      });
      if (hit) d.hits.push(d.trace.length - 1);
    } else d.full = true;
  };
}
function dbgReset(d) {
  d.trace = [];
  d.hits = [];
  d.stack = [];
  d.full = false;
  d.excIdx = null;
}

/* ---------- tryb przerwania ---------- */
function dbgBreak(rt, idx, why) {
  const d = rt.dbg;
  if (!d || !d.trace[idx]) return;
  d.paused = true;
  d.why = why || 'bp';
  const RL = $('#runLayer');
  RL.hidden = true;
  document.body.classList.add('dbg-paused');
  if (EDC.cm) EDC.cm.setOption('readOnly', true);
  dbgShow(rt, idx);
  status(
    L(
      'Przerwano — program wstrzymany (tryb przerwania). F5 kontynuuje, F10/F11 krokuje.',
      'Paused (break mode). F5 continues, F10/F11 steps.',
    ),
  );
  out(
    why === 'exc'
      ? L(`Przerwano na wyjątku: ${d.trace[idx].exc.type}`, `Break on exception: ${d.trace[idx].exc.type}`)
      : L(
          `Osiągnięto punkt przerwania: ${d.trace[idx].file}, wiersz ${d.trace[idx].line}`,
          `Breakpoint hit: ${d.trace[idx].file}, line ${d.trace[idx].line}`,
        ),
  );
}
let dbgCurMark = null,
  dbgFrameMark = null;
function dbgClearMarks() {
  if (!EDC || !EDC.cm) return;
  [dbgCurMark, dbgFrameMark].forEach(m => {
    if (m && m.doc) {
      try {
        m.doc.removeLineClass(m.lh, 'background', m.cls);
        m.doc.removeLineClass(m.lh, 'gutter', m.cls + '-g');
      } catch (e) {}
    }
  });
  dbgCurMark = dbgFrameMark = null;
}
function dbgMarkLine(file, line, cls) {
  if (activeDoc !== file) openDoc(file);
  else showCodeFile(file);
  const cm = EDC.cm;
  if (!cm) return null;
  const doc = cm.getDoc();
  if (line - 1 >= doc.lineCount()) return null;
  const lh = doc.getLineHandle(line - 1);
  doc.addLineClass(lh, 'background', cls);
  doc.addLineClass(lh, 'gutter', cls + '-g');
  cm.scrollIntoView({ line: line - 1, ch: 0 }, 140);
  cm.setCursor({ line: line - 1, ch: (doc.getLine(line - 1).match(/^\s*/) || [''])[0].length });
  return { doc, lh, cls };
}
function dbgShow(rt, idx, frameSel) {
  const d = rt.dbg;
  d.idx = idx;
  d.frameSel = frameSel == null ? null : frameSel;
  const e = d.trace[idx];
  dbgClearMarks();
  let shownVars = e.vars,
    shownLine = e.line,
    shownFile = e.file;
  if (frameSel != null && frameSel < e.frames.length - 1) {
    const f = e.frames[frameSel];
    for (let k = idx; k >= 0; k--) {
      const x = d.trace[k];
      if (x.depth === frameSel + 1 && x.frames[frameSel] && x.frames[frameSel].id === f.id) {
        shownVars = x.vars;
        break;
      }
    }
    shownLine = f.line;
    shownFile = f.file;
    dbgFrameMark = dbgMarkLine(shownFile, shownLine, 'dbg-frame');
  } else dbgCurMark = dbgMarkLine(e.file, e.line, e.exc ? 'dbg-exc' : 'dbg-cur');
  d.shownVars = shownVars;
  dbgBar(rt);
  renderLocals(shownVars, d.full && idx >= d.trace.length - 1);
  renderStack(rt, e, frameSel);
  setBottom('locals');
}
function dbgBar(rt) {
  const d = rt.dbg;
  const e = d.trace[d.idx];
  let bar = $('#dbgBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'dbgBar';
    document.body.appendChild(bar);
  }
  const why = e.exc
    ? `<b class="ex">${L('Wyjątek', 'Exception')}</b> <code>${esc(e.exc.type)}</code>: ${esc(e.exc.msg)}`
    : e.hit
      ? L(
          `<b>Punkt przerwania</b> — ${esc(e.file)}, wiersz ${e.line}`,
          `<b>Breakpoint</b>: ${esc(e.file)}, line ${e.line}`,
        )
      : L(`Krok — ${esc(e.file)}, wiersz ${e.line}`, `Step: ${esc(e.file)}, line ${e.line}`);
  const B = (act, label, key, title) =>
    `<button class="btn" data-dbg="${act}" title="${esc(title || label)}${key ? ' (' + key + ')' : ''}">${label}${key ? `<kbd>${key}</kbd>` : ''}</button>`;
  bar.innerHTML = `<span class="dbg-state"><i></i>${L('Przerwano', 'Break mode')}</span><span class="dbg-why">${why}</span>
    <span class="dbg-btns">${B('cont', '▶ ' + L('Kontynuuj', 'Continue'), 'F5')}${B('into', '↓ ' + L('Wkrocz', 'Step Into'), 'F11')}${B('over', '↷ ' + L('Przekrocz', 'Step Over'), 'F10')}${B('out', '↑ ' + L('Wyjdź', 'Step Out'), 'Shift+F11')}${B('back', '↶ ' + L('Krok wstecz', 'Step Back'), 'Alt+[', L('Cofnij się o krok w zapisie wykonania', 'Go back one step in the recorded execution'))}${B('win', '▣ ' + L('Pokaż okno', 'Show window'), '', L('Okno programu w stanie po zakończeniu obsługi zdarzenia', 'The program window as it is after the event handler finished'))}${B('stop', '■ ' + L('Zatrzymaj', 'Stop'), 'Shift+F5')}</span>
    <span class="dbg-pos">${L('krok', 'step')} ${d.idx + 1}/${d.trace.length}${d.full ? '+' : ''}</span>`;
  bar.hidden = false;
  bar.onclick = ev => {
    const b = ev.target.closest('[data-dbg]');
    if (b) dbgCmd(rt, b.dataset.dbg);
  };
}
function renderLocals(vars, notRec) {
  const host = $('#locBody');
  if (!host) return;
  if (!vars) {
    host.innerHTML = `<p class="dbg-empty">${L('Brak danych.', 'No data.')}</p>`;
    return;
  }
  const own = vars.filter(v => !v.field),
    fields = vars.filter(v => v.field);
  let rows = '';
  let id = 0;
  const row = (v, lvl) => {
    const has = v.kids && v.kids.length;
    const my = ++id;
    rows += `<tr data-r="${my}" data-l="${lvl}" class="${lvl ? 'kid' : ''}"${lvl ? ' hidden' : ''}><td style="padding-left:${8 + lvl * 16}px">${has ? `<button class="tw" data-tw="${my}" aria-label="${L('Rozwiń', 'Expand')}">▸</button>` : '<span class="tw0"></span>'}${esc(v.n)}</td><td class="vv">${esc(v.v)}</td><td class="vt">${esc(v.t || '')}</td></tr>`;
    if (has) v.kids.forEach(k => row(Object.assign({}, k, { parent: my }), lvl + 1));
  };
  own.forEach(v => row(v, 0));
  if (fields.length) row({ n: 'this', v: '{MainWindow}', t: 'MainWindow', kids: fields }, 0);
  host.innerHTML = `<table class="dbgt"><thead><tr><th>${L('Nazwa', 'Name')}</th><th>${L('Wartość', 'Value')}</th><th>${L('Typ', 'Type')}</th></tr></thead><tbody>${rows || `<tr><td colspan="3" class="dbg-empty">${L('Brak zmiennych lokalnych w tym miejscu.', 'No local variables here.')}</td></tr>`}</tbody></table>${notRec ? `<p class="dbg-empty">${L('Pętla wykonała bardzo wiele kroków — zapisano pierwsze 20 000.', 'The loop ran a very large number of steps; the first 20,000 were recorded.')}</p>` : ''}`;
  host.onclick = ev => {
    const b = ev.target.closest('[data-tw]');
    if (!b) return;
    const open = b.textContent === '▸';
    b.textContent = open ? '▾' : '▸';
    const tr = b.closest('tr');
    const lvl = +tr.dataset.l;
    let n = tr.nextElementSibling;
    while (n && +n.dataset.l > lvl) {
      if (+n.dataset.l === lvl + 1) n.hidden = !open;
      else if (!open) n.hidden = true;
      n = n.nextElementSibling;
    }
  };
}
function renderStack(rt, e, sel) {
  const host = $('#stackBody');
  if (!host) return;
  const d = rt.dbg;
  const fr = e.frames.slice().reverse();
  host.innerHTML = `<table class="dbgt"><thead><tr><th></th><th>${L('Nazwa', 'Name')}</th><th>${L('Plik', 'File')}</th><th>${L('Wiersz', 'Line')}</th></tr></thead><tbody>${fr
    .map((f, i) => {
      const real = e.frames.length - 1 - i;
      const m = d.info.methods[f.id] || {};
      const cur = sel == null ? i === 0 : real === sel;
      return `<tr data-fr="${real}" class="${cur ? 'on' : ''}"><td>${i === 0 ? '➜' : cur ? '▸' : ''}</td><td>${esc(P.name)}.dll!${esc(m.label || '?')}</td><td>${esc(f.file)}</td><td>${f.line}</td></tr>`;
    })
    .join(
      '',
    )}<tr class="ext"><td></td><td>[${L('Kod zewnętrzny', 'External Code')}]</td><td></td><td></td></tr></tbody></table>`;
  host.onclick = ev => {
    const tr = ev.target.closest('[data-fr]');
    if (!tr) return;
    const k = +tr.dataset.fr;
    dbgShow(rt, d.idx, k === e.frames.length - 1 ? null : k);
    setBottom('stack');
  };
}
function dbgCmd(rt, cmd) {
  const d = rt.dbg;
  if (!d || !d.paused) return;
  const cur = d.trace[d.idx];
  let j = -1;
  const find = pred => {
    for (let k = d.idx + 1; k < d.trace.length; k++) if (pred(d.trace[k])) return k;
    return -1;
  };
  switch (cmd) {
    case 'cont':
      j = find(x => x.hit || x.exc);
      break;
    case 'into':
      j = d.idx + 1 < d.trace.length ? d.idx + 1 : -1;
      break;
    case 'over':
      j = find(x => x.depth <= cur.depth || x.exc);
      break;
    case 'out':
      j = find(x => x.depth < cur.depth || x.exc);
      break;
    case 'back':
      if (d.idx > 0) dbgShow(rt, d.idx - 1);
      return;
    case 'win': {
      const RL = $('#runLayer');
      RL.hidden = !RL.hidden;
      RL.classList.toggle('peek', !RL.hidden);
      return;
    }
    case 'stop':
      dbgResume(rt, true);
      rt.close(false);
      return;
  }
  if (j >= 0) dbgShow(rt, j);
  else dbgResume(rt);
}
function dbgResume(rt, stopping) {
  const d = rt.dbg;
  if (!d) return;
  d.paused = false;
  dbgReset(d);
  dbgClearMarks();
  document.body.classList.remove('dbg-paused');
  const bar = $('#dbgBar');
  if (bar) bar.hidden = true;
  if (EDC.cm) EDC.cm.setOption('readOnly', false);
  hideDbgTip();
  if (!stopping) {
    const RL = $('#runLayer');
    RL.hidden = false;
    RL.classList.remove('peek');
    status(
      L(
        'Debugowanie: program działa dalej. Shift+F5 zatrzymuje.',
        'Debugging: the program continues. Shift+F5 stops it.',
      ),
    );
    rt.host && rt.host.focus({ preventScroll: true });
  }
  renderLocals(null);
  const sb = $('#stackBody');
  if (sb) sb.innerHTML = '';
}
function dbgKey(rt, e) {
  const k = e.key;
  const map = { F5: e.shiftKey ? 'stop' : 'cont', F10: 'over', F11: e.shiftKey ? 'out' : 'into' };
  if (map[k]) {
    e.preventDefault();
    e.stopPropagation();
    dbgCmd(rt, map[k]);
    return true;
  }
  if (e.altKey && k === '[') {
    e.preventDefault();
    dbgCmd(rt, 'back');
    return true;
  }
  if (k === 'F9') {
    e.preventDefault();
    if (EDC.cm) toggleBp(EDC.cm.getCursor().line);
    return true;
  }
  return false;
}
/* podgląd wartości po najechaniu myszą na zmienną w kodzie */
let dbgTip = null;
function hideDbgTip() {
  if (dbgTip) dbgTip.hidden = true;
}
function dbgHover(cm, ev) {
  if (!RUN || !RUN.dbg || !RUN.dbg.paused) return hideDbgTip();
  const pos = cm.coordsChar({ left: ev.clientX, top: ev.clientY }, 'window');
  const w = cm.findWordAt(pos);
  const word = cm.getRange(w.anchor, w.head);
  if (!/^[A-Za-z_]\w*$/.test(word)) return hideDbgTip();
  const before = cm.getLine(pos.line).slice(0, w.anchor.ch);
  const vars = RUN.dbg.shownVars || [];
  let v = null;
  if (/this\.\s*$/.test(before) || !/\.\s*$/.test(before)) v = vars.find(x => x.n === word);
  if (!v) {
    const m = /([A-Za-z_]\w*)\.\s*$/.exec(before);
    if (m) {
      const o = vars.find(x => x.n === m[1]);
      if (o && o.kids) v = o.kids.find(k => k.n === word);
    }
  }
  if (!v) return hideDbgTip();
  if (!dbgTip) {
    dbgTip = document.createElement('div');
    dbgTip.className = 'dbg-tip';
    document.body.appendChild(dbgTip);
  }
  dbgTip.innerHTML = `<b>${esc(word)}</b> <span>${esc(v.v)}</span>${v.t ? ` <i>${esc(v.t)}</i>` : ''}`;
  const c = cm.charCoords(w.head, 'window');
  dbgTip.style.left = Math.min(innerWidth - 260, c.left + 4) + 'px';
  dbgTip.style.top = c.bottom + 4 + 'px';
  dbgTip.hidden = false;
}
