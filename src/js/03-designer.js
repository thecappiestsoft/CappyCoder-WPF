/**
 * CappyCoder WPF — 03 · Projektant
 *
 * Zadanie: Powierzchnia projektowa: zaznaczanie, przeciąganie, zmiana rozmiaru, przybornik, Eksplorator rozwiązań,
 *   cofanie/ponawianie, zapis w localStorage, przełączanie dokumentów (DOCS, openDoc).
 * Zależy od: 01, 02
 * Udostępnia: select, openDoc, saveLocal, undo, …
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const MAIN_CS = 'MainWindow.xaml.cs',
  MAIN_X = 'MainWindow.xaml';
let sel = [],
  zoom = 1,
  snapOn = false,
  layout = 'split',
  xamlBroken = null,
  xamlWarns = [];
let undoS = [],
  redoS = [],
  clip = null;
let activeDoc = MAIN_X,
  openDocs = [MAIN_X, MAIN_CS],
  codeFile = MAIN_CS;
let EDX, EDC, EDF;
const DOCS = {};
let lastErrs = [];
const status = (t, kind) => {
  const s = $('#status');
  s.textContent = t;
  s.style.color = kind === 'err' ? '#ffd2d4' : '';
};

/* ---------- edytory ---------- */
function mkEd(host, mode, opt = {}) {
  if (window.CodeMirror) {
    const cm = CodeMirror(
      host,
      Object.assign(
        {
          value: '',
          mode,
          lineNumbers: true,
          indentUnit: 4,
          tabSize: 4,
          indentWithTabs: false,
          matchBrackets: true,
          autoCloseBrackets: true,
          styleActiveLine: true,
          lineWrapping: false,
          theme: mode === 'xml' ? 'xaml' : 'default',
          extraKeys: {
            Tab: c => (c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end')),
          },
        },
        opt,
      ),
    );
    return {
      cm,
      get: () => cm.getValue(),
      set: v => {
        if (cm.getValue() !== v) {
          const si = cm.getScrollInfo();
          const cur = cm.getCursor();
          cm.setValue(v);
          cm.clearHistory && opt.keepHist ? 0 : 0;
          cm.setCursor(cur);
          cm.scrollTo(si.left, si.top);
        }
      },
      on: f =>
        cm.on('change', (c, ch) => {
          if (ch.origin !== 'setValue') f();
        }),
      refresh: () => cm.refresh(),
      focus: () => cm.focus(),
      line: () => cm.getCursor().line + 1,
    };
  }
  const ta = document.createElement('textarea');
  ta.className = 'fallback';
  ta.spellcheck = false;
  if (opt.readOnly) ta.readOnly = true;
  host.appendChild(ta);
  return {
    cm: null,
    ta,
    get: () => ta.value,
    set: v => {
      if (ta.value !== v) ta.value = v;
    },
    on: f => ta.addEventListener('input', f),
    refresh() {},
    focus: () => ta.focus(),
    line: () => ta.value.slice(0, ta.selectionStart).split('\n').length,
  };
}
function edGoto(ed, line, ch = 0) {
  if (ed.cm) {
    ed.cm.focus();
    ed.cm.setCursor({ line: line - 1, ch });
    ed.cm.scrollIntoView({ line: line - 1, ch }, 120);
  } else {
    const lines = ed.ta.value.split('\n');
    let p = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) p += lines[i].length + 1;
    ed.ta.focus();
    ed.ta.setSelectionRange(p + ch, p + ch);
  }
}
let xLineMark = null;
function markXamlLine(id) {
  if (!EDX.cm) return;
  if (xLineMark != null) {
    EDX.cm.removeLineClass(xLineMark, 'background', 'sel-line');
    xLineMark = null;
  }
  let ln = null;
  if (xamlBroken) return;
  const n = byId(id);
  if (n && n.name) {
    const i = EDX.get()
      .split('\n')
      .findIndex(l => l.includes(`x:Name="${n.name}"`));
    if (i >= 0) ln = i;
  } else if (XLINE[id]) ln = XLINE[id] - 1;
  if (ln != null) {
    xLineMark = EDX.cm.addLineClass(ln, 'background', 'sel-line');
    if (layout !== 'design') EDX.cm.scrollIntoView({ line: ln, ch: 0 }, 60);
  }
}

/* ---------- pliki kodu ---------- */
function getCode(name) {
  if (name === MAIN_CS) return P.code;
  const f = P.files.find(f => f.name === name);
  return f ? f.code : '';
}
function setCode(name, v) {
  if (name === MAIN_CS) P.code = v;
  else {
    const f = P.files.find(f => f.name === name);
    if (f) f.code = v;
  }
}
function csFiles() {
  return [
    { name: MAIN_CS, src: P.code },
    ...P.files.filter(f => /\.cs$/.test(f.name)).map(f => ({ name: f.name, src: f.code })),
  ];
}
function showCodeFile(name) {
  codeFile = name;
  if (EDC.cm) {
    if (!DOCS[name]) DOCS[name] = CodeMirror.Doc(getCode(name), 'text/x-csharp');
    if (EDC.cm.getDoc() !== DOCS[name]) EDC.cm.swapDoc(DOCS[name]);
    if (DOCS[name].getValue() !== getCode(name)) DOCS[name].setValue(getCode(name));
    applyBps(name);
  } else EDC.set(getCode(name));
  refreshMemberNav();
  markCodeErrors();
}
function setMainCode(v) {
  P.code = v;
  if (DOCS[MAIN_CS]) {
    if (DOCS[MAIN_CS].getValue() !== v) DOCS[MAIN_CS].setValue(v);
  } else if (codeFile === MAIN_CS) EDC.set(v);
}

/* ---------- metody obsługi zdarzeń ---------- */
function methodLine(name, file = MAIN_CS) {
  const r = CS.methodsOf(getCode(file));
  const m = r.methods.find(m => m.name === name);
  if (!m) return null;
  const tk = r.tok;
  return { line: m.body ? CS.lineOf(tk.code, m.body.open) + 1 : m.line, decl: m.line };
}
function ensureHandler(name, ev, quiet) {
  if (methodLine(name)) return methodLine(name).line;
  const code = P.code;
  const t = CS.tokenize(code);
  const types = CS.scanTypes(t.code);
  const main = CS.findMainType(types);
  if (!main || main.close < 0) {
    status(
      L(
        'Nie można dodać metody — nie znaleziono zamknięcia klasy MainWindow.',
        'Cannot add the method: the end of the MainWindow class was not found.',
      ),
      'err',
    );
    return null;
  }
  // pozycja zamykającego '}' klasy w oryginalnym kodzie: dopasuj numer wiersza
  const closeLine = CS.lineOf(t.code, main.close);
  const lines = code.split('\n');
  const li = closeLine - 1;
  const col = lines[li].indexOf('}');
  const indent = (lines[li].match(/^\s*/) || [''])[0] + '    ';
  const arg = EA[ev] || 'RoutedEventArgs';
  const before = lines.slice(0, li);
  while (before.length && before[before.length - 1].trim() === '') before.pop();
  const stub = [
    '',
    `${indent}private void ${name}(object sender, ${arg} e)`,
    `${indent}{`,
    `${indent}    `,
    `${indent}}`,
  ];
  const nl = [...before, ...stub, ...lines.slice(li)];
  setMainCode(nl.join('\n'));
  scheduleSave();
  scheduleCheck();
  return before.length + 4;
}
function gotoHandler(name, ev) {
  const ln = ensureHandler(name, ev);
  if (ln == null) return;
  openDoc(MAIN_CS);
  showCodeFile(MAIN_CS);
  setTimeout(() => {
    const ml = methodLine(name);
    if (ml) {
      const l = getCode(MAIN_CS).split('\n')[ml.line - 1] || '';
      edGoto(EDC, ml.line, l.length);
      EDC.refresh();
    }
  }, 0);
}
function defaultHandlerName(n, ev) {
  return `${n.id === 'win' ? 'Window' : n.name || n.t}_${ev}`;
}
function createDefaultHandler(n) {
  const ev = n.id === 'win' ? 'Loaded' : TY[n.t].de;
  if (!n.ev[ev]) {
    if (n.id !== 'win' && !n.name) {
      snap();
      n.name = autoName(n.t);
    }
    snap();
    n.ev[ev] = defaultHandlerName(n, ev);
    commit();
  }
  gotoHandler(n.ev[ev], ev);
}

/* ---------- cofanie ---------- */
const stateStr = () => JSON.stringify({ win: P.win, root: P.root, name: P.name });
function snap() {
  const s = stateStr();
  if (undoS[undoS.length - 1] !== s) {
    undoS.push(s);
    if (undoS.length > 150) undoS.shift();
    redoS = [];
  }
}
function restoreState(s) {
  const o = JSON.parse(s);
  P.win = o.win;
  P.root = o.root;
  sel = sel.filter(id => byId(id));
  commit();
}
function undo() {
  if (!undoS.length) return status(L('Brak operacji do cofnięcia.', 'Nothing to undo.'));
  redoS.push(stateStr());
  restoreState(undoS.pop());
  status(L('Cofnięto.', 'Undone.'));
}
function redo() {
  if (!redoS.length) return status(L('Brak operacji do ponowienia.', 'Nothing to redo.'));
  undoS.push(stateStr());
  restoreState(redoS.pop());
  status(L('Ponowiono.', 'Redone.'));
}

/* ---------- zatwierdzanie zmian ---------- */
let saveT, checkT;
function commit(o = {}) {
  renderDesign();
  if (!o.noXaml) syncXaml();
  renderOutline();
  if (!o.noProps) renderProps();
  renderSol();
  scheduleSave();
  scheduleCheck();
}
function syncXaml() {
  if (xamlBroken) return;
  const x = genXaml();
  EDX.set(x);
  markXamlLine(sel[0]);
}
function scheduleSave() {
  clearTimeout(saveT);
  saveT = setTimeout(saveLocal, 500);
}
function saveLocal() {
  if (EDC && DOCS[codeFile]) setCode(codeFile, DOCS[codeFile].getValue());
  try {
    syncBps();
  } catch (e) {}
  P.xamlText = EDX.get();
  LS.set('wpf-designer-project', JSON.stringify(P));
}
function scheduleCheck() {
  clearTimeout(checkT);
  checkT = setTimeout(() => runChecks(false), 450);
}

/* ---------- renderowanie projektanta ---------- */
function renderDesign() {
  const host = $('#winScale');
  host.className = 'dsg';
  host.innerHTML = '';
  const w = winFrame(null);
  host.appendChild(w);
  host.style.transform = `scale(${zoom})`;
  $('#stage').style.width = P.win.w * zoom + 64 + 'px';
  $('#stage').style.height = P.win.h * zoom + 64 + 'px';
  $('#designWrap').style.setProperty('--z', zoom);
  if (sel.includes('win') || !sel.length) w.classList.add('sel-win');
  drawOverlay();
}
const elOf = id => (id === 'win' ? $('#winScale .wnd') : $(`#winScale .c[data-id="${id}"]`));
function relRect(el) {
  const st = $('#stage').getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return { x: r.left - st.left, y: r.top - st.top, w: r.width, h: r.height };
}
function drawOverlay() {
  const ov = $('#overlay');
  ov.innerHTML = '';
  const ids = sel.filter(id => id !== 'win');
  ids.forEach(id => {
    const el = elOf(id);
    if (!el) return;
    const n = byId(id);
    const r = relRect(el);
    const b = document.createElement('div');
    b.className = 'selbox' + (ids.length > 1 ? ' multi' : '');
    Object.assign(b.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    let h = `<span class="lab">${esc(n.name || '')}${n.name ? ' : ' : ''}${n.t}</span>`;
    if (ids.length === 1 && id !== 'root')
      h += ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(d => `<i class="h" data-d="${d}"></i>`).join('');
    // linie marginesów
    const par = parentOf(id);
    if (ids.length === 1 && par && kindOf(par) === 'abs' && id !== 'root') {
      const pb = boxOf(par);
      if (pb) {
        const prr = relRect(pb);
        const ha = n.p.HorizontalAlignment || 'Stretch',
          va = n.p.VerticalAlignment || 'Stretch';
        if (ha === 'Left' || ha === 'Stretch') {
          const len = r.x - prr.x;
          if (len > 2)
            h += `<span class="mg" style="right:100%;top:50%;width:${len}px"></span><span class="mgt" style="right:calc(100% + ${len / 2 - 8}px);top:calc(50% - 15px)">${n.m[0]}</span>`;
        }
        if (ha === 'Right' || ha === 'Stretch') {
          const len = prr.x + prr.w - (r.x + r.w);
          if (len > 2) h += `<span class="mg" style="left:100%;top:50%;width:${len}px"></span>`;
        }
        if (va === 'Top' || va === 'Stretch') {
          const len = r.y - prr.y;
          if (len > 2)
            h += `<span class="mgv" style="bottom:100%;left:50%;height:${len}px"></span><span class="mgt" style="bottom:calc(100% + ${len / 2 - 7}px);left:calc(50% + 4px)">${n.m[1]}</span>`;
        }
        if (va === 'Bottom' || va === 'Stretch') {
          const len = prr.y + prr.h - (r.y + r.h);
          if (len > 2) h += `<span class="mgv" style="top:100%;left:50%;height:${len}px"></span>`;
        }
      }
    }
    b.innerHTML = h;
    ov.appendChild(b);
  });
  const n = sel.length === 1 ? byId(sel[0]) : null;
  $('#posInfo').textContent = n
    ? n.id === 'win'
      ? `Window  ${P.win.w} × ${P.win.h}`
      : `${n.t}  ${Math.round(elOf(n.id)?.getBoundingClientRect().width / zoom || 0)} × ${Math.round(elOf(n.id)?.getBoundingClientRect().height / zoom || 0)}  ·  Margin ${n.m.join(',')}`
    : sel.length > 1
      ? L(`${sel.length} zaznaczone`, `${sel.length} selected`)
      : '';
  $('#stSel').textContent = n && n.id !== 'win' ? `${n.name || '(bez nazwy)'} · ${n.t}` : '';
}
function boxOf(n) {
  if (!n) return $('#winScale .client');
  const el = elOf(n.id);
  if (!el) return null;
  if (n.t === 'TabControl') return el.querySelector('.cbox');
  return el.querySelector('.cbox-in') || el.querySelector('.cbox') || el.firstElementChild;
}
function select(ids, keepProps) {
  sel = ids;
  renderDesign();
  renderOutline();
  if (!keepProps) renderProps();
  markXamlLine(sel[0]);
}

/* ---------- przeciąganie, zmiana rozmiaru ---------- */
const snapv = v => (snapOn ? Math.round(v / 8) * 8 : Math.round(v));
function contAt(x, y, exclude) {
  const els = document.elementsFromPoint(x, y);
  for (const e of els) {
    if (!e.closest || !e.closest('#winScale')) continue;
    const c = e.closest('[data-cont]');
    if (!c) continue;
    const id = c.dataset.cont === 'root-host' ? null : c.dataset.cont;
    if (id === null) return { node: P.root, box: boxOf(P.root) };
    if (exclude && exclude.some(ex => ex === id || isDesc(id, ex))) continue;
    // przejdź w górę, aż do kontenera niewykluczonego
    const nd = byId(id);
    if (nd) return { node: nd, box: c };
  }
  const rb = boxOf(P.root);
  const r = rb && rb.getBoundingClientRect();
  if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { node: P.root, box: rb };
  return null;
}
function normalize(n) {
  const par = parentOf(n.id);
  const k = kindOf(par);
  if (k !== 'abs' && k !== 'canvas') return;
  const el = elOf(n.id),
    pb = boxOf(par);
  if (!el || !pb) return;
  const r = el.getBoundingClientRect(),
    pr = pb.getBoundingClientRect();
  const l = Math.round((r.left - pr.left) / zoom),
    t = Math.round((r.top - pr.top) / zoom);
  if (k === 'canvas') {
    n.m = [l, t, n.m[2], n.m[3]];
    return;
  }
  const ha = n.p.HorizontalAlignment || 'Stretch',
    va = n.p.VerticalAlignment || 'Stretch';
  if (ha !== 'Left') {
    if (n.w == null && ha === 'Stretch') n.w = Math.round(r.width / zoom);
    n.p.HorizontalAlignment = 'Left';
    n.m[0] = l;
    n.m[2] = 0;
  }
  if (va !== 'Top') {
    if (n.h == null && va === 'Stretch') n.h = Math.round(r.height / zoom);
    n.p.VerticalAlignment = 'Top';
    n.m[1] = t;
    n.m[3] = 0;
  }
}
let drag = null;
function designDown(e) {
  if (e.button === 2) return;
  if (xamlBroken) return;
  const h = e.target.closest('.h');
  if (h) {
    startResize(e, sel[0], h.dataset.d);
    return;
  }
  if (e.target.closest('.grip') && e.target.closest('#winScale')) {
    startResize(e, 'win', 'se');
    return;
  }
  const cEl = e.target.closest('#winScale .c');
  const wEl = e.target.closest('#winScale .wnd');
  let id = cEl ? cEl.dataset.id : wEl ? 'win' : 'win';
  // TabControl: kliknięcie w nagłówek karty
  if (cEl) {
    const tc = e.target.closest('.c-TabControl');
    if (tc) {
      for (const th of tc.querySelectorAll(':scope > .v > .tabs .tabh')) {
        const r = th.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const n = byId(tc.dataset.id);
          snap();
          n.p.SelectedIndex = th.dataset.tab;
          select([n.id]);
          commit();
          return;
        }
      }
    }
    const ex = e.target.closest('.c-Expander');
    if (ex && e.detail === 2) {
    }
  }
  if (e.ctrlKey || e.metaKey || e.shiftKey) {
    if (id === 'win' || id === 'root') return;
    sel = sel.includes(id) ? sel.filter(x => x !== id) : [...sel.filter(x => x !== 'win'), id];
    select(sel);
    return;
  }
  if (!sel.includes(id)) select([id]);
  if (id === 'win' || id === 'root') return;
  const ids = sel.filter(x => x !== 'win' && x !== 'root');
  const el = elOf(id);
  const r = el.getBoundingClientRect();
  drag = {
    ids,
    sx: e.clientX,
    sy: e.clientY,
    moved: false,
    gx: (e.clientX - r.left) / zoom,
    gy: (e.clientY - r.top) / zoom,
    orig: null,
    target: null,
    pid: e.pointerId,
  };
  $('#designWrap').setPointerCapture(e.pointerId);
}
function designMove(e) {
  if (resz) return resizeMove(e);
  if (!drag) return;
  const dx = (e.clientX - drag.sx) / zoom,
    dy = (e.clientY - drag.sy) / zoom;
  if (!drag.moved) {
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    drag.moved = true;
    snap();
    drag.ids.forEach(id => normalize(byId(id)));
    drag.orig = Object.fromEntries(drag.ids.map(id => [id, byId(id).m.slice()]));
  }
  drag.ids.forEach(id => {
    const n = byId(id);
    const k = kindOf(parentOf(id));
    if (k === 'abs' || k === 'canvas') {
      n.m[0] = snapv(drag.orig[id][0] + dx);
      n.m[1] = snapv(drag.orig[id][1] + dy);
    }
  });
  renderDesign();
  const t = contAt(e.clientX, e.clientY, drag.ids);
  drag.target = t;
  drag.lx = e.clientX;
  drag.ly = e.clientY;
  $$('#winScale .droptarget').forEach(x => x.classList.remove('droptarget'));
  if (t && t.node !== parentOf(drag.ids[0])) {
    const te = t.node.id === 'root' ? elOf('root') : elOf(t.node.id);
    if (te) te.classList.add('droptarget');
  }
  status(
    `${L('Przenoszenie', 'Moving')}: ${drag.ids.length > 1 ? drag.ids.length + L(' elementy', ' items') : byId(drag.ids[0]).name || byId(drag.ids[0]).t}  ·  Margin ${byId(drag.ids[0]).m.join(',')}`,
  );
}
function designUp(e) {
  if (resz) {
    resz = null;
    commit();
    status(L('Gotowe', 'Ready'));
    return;
  }
  if (!drag) return;
  const d = drag;
  drag = null;
  if (!d.moved) return;
  const n0 = byId(d.ids[0]);
  const oldP = parentOf(n0.id);
  const t = d.target;
  if (t && d.ids.length === 1 && (t.node !== oldP || ['stack', 'wrap', 'uni', 'dock'].includes(kindOf(oldP))))
    reparent(n0, t, d.lx, d.ly, d.gx, d.gy);
  commit();
  status(L('Gotowe', 'Ready'));
}
function reparent(n, t, cx, cy, gx, gy) {
  const oldP = parentOf(n.id);
  const np = t.node;
  const k = kindOf(np);
  const box = boxOf(np) || t.box;
  const br = box.getBoundingClientRect();
  if (oldP !== np) {
    oldP.ch.splice(oldP.ch.indexOf(n), 1);
  } else {
    oldP.ch.splice(oldP.ch.indexOf(n), 1);
  }
  if (np.t === 'TabControl') n.tab = num(np.p.SelectedIndex, 0);
  else n.tab = 0;
  if (k === 'abs' || k === 'canvas') {
    const l = snapv((cx - br.left) / zoom - gx),
      tt = snapv((cy - br.top) / zoom - gy);
    if (k === 'abs') {
      n.p.HorizontalAlignment = 'Left';
      n.p.VerticalAlignment = 'Top';
      n.m = [l, tt, 0, 0];
    } else {
      delete n.p.HorizontalAlignment;
      delete n.p.VerticalAlignment;
      n.m = [l, tt, 0, 0];
    }
    np.ch.push(n);
  } else {
    if (k !== 'dock') {
      delete n.p.HorizontalAlignment;
      delete n.p.VerticalAlignment;
    }
    n.m = [0, 0, 0, 0];
    let idx = np.ch.length;
    const horiz = (k === 'stack' && np.p.Orientation === 'Horizontal') || k === 'wrap' || k === 'dock';
    np.ch.some((c, i) => {
      const ce = elOf(c.id);
      if (!ce) return false;
      const r = ce.getBoundingClientRect();
      const before = horiz ? cx < r.left + r.width / 2 && cy < r.bottom : cy < r.top + r.height / 2;
      if (before) {
        idx = i;
        return true;
      }
      return false;
    });
    np.ch.splice(idx, 0, n);
  }
}
let resz = null;
function startResize(e, id, d) {
  e.stopPropagation();
  snap();
  if (id !== 'win') normalize(byId(id));
  const n = byId(id);
  const el = elOf(id);
  const r = el.getBoundingClientRect();
  resz = {
    id,
    d,
    sx: e.clientX,
    sy: e.clientY,
    l: n.m ? n.m[0] : 0,
    t: n.m ? n.m[1] : 0,
    w: id === 'win' ? P.win.w : Math.round(r.width / zoom),
    h: id === 'win' ? P.win.h : Math.round(r.height / zoom),
  };
  $('#designWrap').setPointerCapture(e.pointerId);
}
function resizeMove(e) {
  const r = resz;
  const n = byId(r.id);
  const dx = (e.clientX - r.sx) / zoom,
    dy = (e.clientY - r.sy) / zoom;
  let { l, t, w, h } = r;
  if (r.d.includes('e')) w = snapv(r.w + dx);
  if (r.d.includes('s')) h = snapv(r.h + dy);
  if (r.d.includes('w')) {
    w = snapv(r.w - dx);
    l = r.l + (r.w - w);
  }
  if (r.d.includes('n')) {
    h = snapv(r.h - dy);
    t = r.t + (r.h - h);
  }
  w = Math.max(r.id === 'win' ? 120 : 4, w);
  h = Math.max(r.id === 'win' ? 60 : 4, h);
  if (r.id === 'win') {
    P.win.w = w;
    P.win.h = h;
  } else {
    const k = kindOf(parentOf(n.id));
    if (r.d.includes('w') || r.d.includes('e')) n.w = w;
    if (r.d.includes('n') || r.d.includes('s')) n.h = h;
    if (k === 'abs' || k === 'canvas') {
      n.m[0] = Math.round(l);
      n.m[1] = Math.round(t);
    }
  }
  renderDesign();
  status(`${L('Rozmiar', 'Size')}: ${w} × ${h}`);
}

/* ---------- operacje na elementach ---------- */
function addControl(t, cx, cy) {
  if (xamlBroken) return status(L('Popraw najpierw błędy w XAML.', 'Fix the XAML errors first.'), 'err');
  snap();
  let tgt = cx != null ? contAt(cx, cy, []) : null;
  if (!tgt) {
    const s = sel.length === 1 ? byId(sel[0]) : null;
    const node =
      s && s.id !== 'win' && TY[s.t].cont ? s : s && s.id !== 'win' && s.id !== 'root' ? parentOf(s.id) : P.root;
    tgt = { node, box: boxOf(node) };
  }
  const k = kindOf(tgt.node);
  const n = mkNode(t, { name: autoName(t) });
  if (k === 'abs') {
    n.p.HorizontalAlignment = 'Left';
    n.p.VerticalAlignment = 'Top';
  }
  if (k === 'stack' || k === 'wrap' || k === 'uni' || k === 'dock') {
    if (t !== 'Separator') {
    }
  }
  if (tgt.node.t === 'TabControl') n.tab = num(tgt.node.p.SelectedIndex, 0);
  let l = 10,
    tt = 10;
  if (cx != null && tgt.box) {
    const br = tgt.box.getBoundingClientRect();
    l = snapv((cx - br.left) / zoom - 8);
    tt = snapv((cy - br.top) / zoom - 8);
  } else {
    const c = tgt.node.ch.length;
    l = 10 + (c % 8) * 12;
    tt = 10 + (c % 8) * 12;
  }
  if (k === 'abs' || k === 'canvas') n.m = [Math.max(0, l), Math.max(0, tt), 0, 0];
  if (k === 'stack' || k === 'wrap' || k === 'uni' || k === 'dock') {
    if (
      [
        'Grid',
        'StackPanel',
        'Canvas',
        'WrapPanel',
        'UniformGrid',
        'DockPanel',
        'ListBox',
        'DataGrid',
        'TabControl',
      ].includes(t)
    ) {
    }
  }
  if (cx != null && !(k === 'abs' || k === 'canvas')) {
    tgt.node.ch.push(n);
    reparentIndex(n, tgt.node, cx, cy);
  } else tgt.node.ch.push(n);
  sel = [n.id];
  commit();
  status(L(`Dodano ${t} „${n.name}”.`, `Added ${t} '${n.name}'.`));
  $('#designWrap').focus({ preventScroll: true });
}
function reparentIndex(n, np, cx, cy) {
  np.ch.splice(np.ch.indexOf(n), 1);
  const horiz =
    (TY[np.t].cont === 'stack' && np.p.Orientation === 'Horizontal') ||
    TY[np.t].cont === 'wrap' ||
    TY[np.t].cont === 'dock';
  let idx = np.ch.length;
  np.ch.some((c, i) => {
    const ce = elOf(c.id);
    if (!ce) return false;
    const r = ce.getBoundingClientRect();
    if (horiz ? cx < r.left + r.width / 2 && cy < r.bottom : cy < r.top + r.height / 2) {
      idx = i;
      return true;
    }
    return false;
  });
  np.ch.splice(idx, 0, n);
}
function delSel() {
  const ids = sel.filter(id => id !== 'win' && id !== 'root');
  if (!ids.length) return;
  snap();
  ids.forEach(id => {
    const p = parentOf(id);
    if (p) p.ch = p.ch.filter(c => c.id !== id);
  });
  sel = [];
  commit();
  status(
    L(
      `Usunięto ${ids.length} ${ids.length === 1 ? 'element' : 'elementy'}.`,
      `Deleted ${ids.length} ${ids.length === 1 ? 'item' : 'items'}.`,
    ),
  );
}
function copySel(cut) {
  const ids = sel.filter(id => id !== 'win' && id !== 'root');
  if (!ids.length) return;
  clip = ids.map(id => clone(byId(id)));
  if (cut) delSel();
  status(cut ? L('Wycięto.', 'Cut.') : L(`Skopiowano ${ids.length}.`, `Copied ${ids.length}.`));
}
function pasteClip() {
  if (!clip) return status(L('Schowek projektanta jest pusty.', 'The designer clipboard is empty.'));
  snap();
  const s = sel.length === 1 ? byId(sel[0]) : null;
  const target =
    s && s.id !== 'win' && TY[s.t].cont ? s : s && s.id !== 'win' && s.id !== 'root' ? parentOf(s.id) : P.root;
  const used = names();
  const out = [];
  clip.forEach(c => {
    const n = clone(c);
    const fix = x => {
      x.id = nid();
      if (x.name) {
        if (used.has(x.name)) x.name = autoName(x.t);
        used.add(x.name);
      }
      x.ch.forEach(fix);
    };
    fix(n);
    if (kindOf(target) === 'abs' || kindOf(target) === 'canvas') {
      n.m[0] += 10;
      n.m[1] += 10;
    }
    if (target.t === 'TabControl') n.tab = num(target.p.SelectedIndex, 0);
    target.ch.push(n);
    out.push(n.id);
  });
  sel = out;
  commit();
  status(L(`Wklejono ${out.length}.`, `Pasted ${out.length}.`));
}
function zorder(front) {
  const ids = sel.filter(id => id !== 'win' && id !== 'root');
  if (!ids.length) return;
  snap();
  ids.forEach(id => {
    const p = parentOf(id);
    const n = byId(id);
    p.ch.splice(p.ch.indexOf(n), 1);
    front ? p.ch.push(n) : p.ch.unshift(n);
  });
  commit();
}
function nudge(dx, dy) {
  const ids = sel.filter(id => id !== 'win' && id !== 'root');
  if (!ids.length) return false;
  snap();
  ids.forEach(id => {
    const n = byId(id);
    const k = kindOf(parentOf(id));
    if (k === 'abs' || k === 'canvas') {
      normalize(n);
      n.m[0] += dx;
      n.m[1] += dy;
    }
  });
  commit();
  return true;
}

/* ---------- przybornik ---------- */
const tbClosed = new Set(JSON.parse(LS.get('wpf-tb-closed') || '[]'));
function renderToolbox() {
  const q = $('#tbSearch').value.trim().toLowerCase();
  const cats = [
    ['common', L('Wspólne kontrolki WPF', 'Common WPF Controls'), Object.keys(TY).filter(t => TY[t].c)],
    ['all', L('Wszystkie kontrolki WPF', 'All WPF Controls'), Object.keys(TY).sort()],
  ];
  $('#tbList').innerHTML =
    cats
      .map(([c, label, list]) => {
        const items = list.filter(t => !q || t.toLowerCase().includes(q));
        if (!items.length) return '';
        const closed = !q && tbClosed.has(c);
        return `<div class="tbcat${closed ? ' closed' : ''}" data-cat="${esc(c)}"><svg viewBox="0 0 10 10"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>${esc(label)}</div>${closed ? '' : items.map(t => `<div class="tbi" data-t="${t}" title="${t}: ${L('przeciągnij na okno lub kliknij dwukrotnie', 'drag onto the window or double-click')}">${glyph(TY[t].g)}<span>${t}</span></div>`).join('')}`;
      })
      .join('') || `<div class="empty">${L('Brak pasujących kontrolek.', 'No matching controls.')}</div>`;
}
let tdrag = null;
function tbDown(e) {
  const cat = e.target.closest('.tbcat');
  if (cat) {
    const c = cat.dataset.cat;
    tbClosed.has(c) ? tbClosed.delete(c) : tbClosed.add(c);
    LS.set('wpf-tb-closed', JSON.stringify([...tbClosed]));
    renderToolbox();
    return;
  }
  const it = e.target.closest('.tbi');
  if (!it) return;
  tdrag = { t: it.dataset.t, sx: e.clientX, sy: e.clientY, ghost: null };
  e.preventDefault();
}
function tbMove(e) {
  if (!tdrag) return;
  if (!tdrag.ghost) {
    if (Math.abs(e.clientX - tdrag.sx) + Math.abs(e.clientY - tdrag.sy) < 5) return;
    tdrag.ghost = document.createElement('div');
    tdrag.ghost.className = 'ghost';
    tdrag.ghost.textContent = tdrag.t;
    document.body.appendChild(tdrag.ghost);
  }
  tdrag.ghost.style.left = e.clientX + 12 + 'px';
  tdrag.ghost.style.top = e.clientY + 8 + 'px';
  $$('#winScale .droptarget').forEach(x => x.classList.remove('droptarget'));
  const t = contAt(e.clientX, e.clientY, []);
  if (t) {
    const te = elOf(t.node.id);
    if (te) te.classList.add('droptarget');
  }
}
function tbUp(e) {
  if (!tdrag) return;
  const d = tdrag;
  tdrag = null;
  $$('#winScale .droptarget').forEach(x => x.classList.remove('droptarget'));
  if (d.ghost) {
    d.ghost.remove();
    const over = document.elementFromPoint(e.clientX, e.clientY);
    if (over && over.closest('#designWrap')) {
      if (activeDoc !== MAIN_X) openDoc(MAIN_X);
      addControl(d.t, e.clientX, e.clientY);
    }
  } else {
    $$('.tbi.pick').forEach(x => x.classList.remove('pick'));
    const it = $(`.tbi[data-t="${d.t}"]`);
    if (it) it.classList.add('pick');
    status(
      L(
        `${d.t}: przeciągnij na okno lub kliknij dwukrotnie, aby dodać.`,
        `${d.t}: drag onto the window or double-click to add.`,
      ),
    );
  }
}

/* ---------- konspekt dokumentu ---------- */
let solTab = 'sol';
function renderOutline() {
  if (solTab !== 'outline') return;
  const row = (n, lvl) => {
    const T = TY[n.t];
    const on = sel.includes(n.id) ? ' on' : '';
    let h = `<li><div class="row${on}" data-sel="${n.id}" style="padding-left:${8 + lvl * 14}px"><span class="fic">${glyph(n.id === 'root' ? 'grid' : T.g)}</span><span>${n.t}</span>${n.name ? `<span class="nm">${esc(n.name)}</span>` : ''}${Object.keys(n.ev).length ? `<span class="tag">⚡${Object.keys(n.ev).length}</span>` : ''}</div></li>`;
    n.ch.forEach(c => (h += row(c, lvl + 1)));
    return h;
  };
  $('#solBody').innerHTML =
    `<ul class="tree"><li><div class="row${sel.includes('win') || !sel.length ? ' on' : ''}" data-sel="win"><span class="fic">${glyph('win')}</span><span>Window</span><span class="nm">${esc(P.win.p.Title || '')}</span></div></li>${row(P.root, 1)}</ul>`;
}
function renderSol() {
  if (solTab !== 'sol') return;
  const f = (name, cls, icon, lvl, act, extra = '') =>
    `<li><div class="row${activeDoc === name ? ' on' : ''}" data-open="${esc(name)}" style="padding-left:${8 + lvl * 14}px">${icon}<span>${esc(name)}</span>${extra}</div></li>`;
  const ic = (c, t) =>
    `<span class="fic ${c}" style="font:600 9.5px var(--mono);width:15px;text-align:center">${t}</span>`;
  const deps = [
    `<li><div class="row" style="padding-left:50px;color:var(--muted)">Microsoft.NETCore.App</div></li>`,
    `<li><div class="row" style="padding-left:50px;color:var(--muted)">Microsoft.WindowsDesktop.App.WPF</div></li>`,
    ...P.pkgs.map(
      p =>
        `<li><div class="row" data-pkg="${esc(p.id)}" style="padding-left:50px" title="${L('Pakiet NuGet — kliknij, aby zarządzać', 'NuGet package: click to manage')}">📦 ${esc(p.id)} <span class="tag">${esc(p.ver)}</span></div></li>`,
    ),
    ...P.refs.map(
      r =>
        `<li><div class="row" data-ref="${esc(r.name)}" style="padding-left:50px" title="${L('Odwołanie do pliku .dll', 'Reference to a .dll file')}">▣ ${esc(r.name)}</div></li>`,
    ),
  ].join('');
  const assets = Object.keys(P.assets);
  $('#solBody').innerHTML = `<ul class="tree">
    <li><div class="row" style="padding-left:8px"><span class="fic">${glyph('win')}</span><b>${L(`Rozwiązanie „${esc(P.name)}”`, `Solution '${esc(P.name)}'`)}</b><span class="tag">${L('1 projekt', '1 project')}</span></div></li>
    <li><div class="row" data-open="${esc(P.name)}.csproj" style="padding-left:22px">${ic('cs', 'C#')}<b>${esc(P.name)}</b></div></li>
    <li><div class="row" style="padding-left:36px;color:var(--muted)">▾ ${L('Zależności', 'Dependencies')}</div></li>${deps}
    ${f('App.xaml', 'xa', ic('xa', '&lt;/&gt;'), 2)}${f('App.xaml.cs', 'cs', ic('cs', 'C#'), 3)}
    ${f('AssemblyInfo.cs', 'cs', ic('cs', 'C#'), 2)}
    ${f(MAIN_X, 'xa', ic('xa', '&lt;/&gt;'), 2)}${f(MAIN_CS, 'cs', ic('cs', 'C#'), 3)}
    ${P.files.map(x => f(x.name, 'cs', ic('cs', 'C#'), 2, null, `<span class="tag" data-del="${esc(x.name)}" title="${L('Usuń plik z projektu', 'Remove file from project')}" style="cursor:pointer">✕</span>`)).join('')}
    ${assets.map(a => `<li><div class="row" style="padding-left:36px" title="${L('Zasób (Resource)', 'Resource')}">${ic('', '▧')}<span>${esc(a)}</span><span class="tag" data-delasset="${esc(a)}" style="cursor:pointer">✕</span></div></li>`).join('')}
  </ul>`;
}
