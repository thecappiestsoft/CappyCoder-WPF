/**
 * CappyCoder WPF — 04 · Panele
 *
 * Zadanie: Okno Właściwości i Zdarzenia, lista członków, Lista błędów (runChecks łączy XAML + CS + SEM),
 *   podkreślenia błędów w edytorze, okno Dane wyjściowe, „Kompiluj”.
 * Zależy od: 01–03, 07–09
 * Udostępnia: runChecks, renderErrors, setBottom, out, …
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
let propTab = 'props';
const IDRE = /^[A-Za-z_][A-Za-z0-9_]*$/;
function getVal(n, k) {
  if (k === 'Width') return n.id === 'win' ? P.win.w : (n.w ?? '');
  if (k === 'Height') return n.id === 'win' ? P.win.h : (n.h ?? '');
  if (k === 'Canvas.Left') return n.m[0];
  if (k === 'Canvas.Top') return n.m[1];
  if (k === 'DockPanel.Dock') return n.dock || '';
  return n.p[k] ?? '';
}
function isSetP(n, k) {
  if (k === 'Width') return n.id === 'win' || n.w != null;
  if (k === 'Height') return n.id === 'win' || n.h != null;
  if (k === 'Margin') return n.m && n.m.some(x => x);
  if (k === 'Canvas.Left' || k === 'Canvas.Top') return true;
  if (k === 'DockPanel.Dock') return !!n.dock;
  return n.p[k] != null;
}
function editorFor(n, k) {
  const t = ptype(n.id === 'win' ? 'Window' : n.t, k);
  const v = getVal(n, k);
  const id = 'pe_' + k.replace(/\W/g, '_');
  if (k === 'Margin') {
    const sides = L(['Lewy', 'Górny', 'Prawy', 'Dolny'], ['Left', 'Top', 'Right', 'Bottom']);
    return `<div class="thick">${n.m.map((x, i) => `<input id="${id}_${i}" data-k="Margin" data-i="${i}" value="${x}" inputmode="decimal" title="${sides[i]}" aria-label="Margin ${sides[i]}">`).join('')}</div>`;
  }
  if (k === 'DockPanel.Dock')
    return `<select id="${id}" data-k="${k}"><option value="">(Left)</option>${['Left', 'Top', 'Right', 'Bottom'].map(o => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  if (Array.isArray(t)) {
    if (k === 'FontFamily')
      return `<input id="${id}" data-k="${k}" value="${esc(v)}" list="dlFonts" placeholder="Segoe UI">`;
    return `<select id="${id}" data-k="${k}"><option value=""></option>${t.map(o => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  }
  if (t === 'bool')
    return `<select id="${id}" data-k="${k}"><option value=""></option><option${v === 'True' ? ' selected' : ''}>True</option><option${v === 'False' ? ' selected' : ''}>False</option></select>`;
  if (t === 'brush') {
    const c = brush(v, 'transparent');
    return `<div class="brushed"><span class="sw"><i style="background:${esc(c)}"></i><input type="color" data-k="${k}" data-color="1" aria-label="${L('Wybierz kolor', 'Pick color')} ${k}" value="${toHex(v)}"></span><input id="${id}" data-k="${k}" value="${esc(v)}" list="dlColors" placeholder="${L('Brak', 'None')}"></div>`;
  }
  if (t === 'items')
    return `<textarea id="${id}" data-k="${k}" rows="${Math.min(8, Math.max(3, String(v).split('\n').length + 1))}" spellcheck="false">${esc(v)}</textarea>`;
  if (t === 'source')
    return `<div class="brushed" style="grid-template-columns:1fr auto"><input id="${id}" data-k="${k}" value="${esc(v)}" placeholder="${L('Images/obraz.png', 'Images/picture.png')}"><button class="btn" data-asset="${k}" title="${L('Dodaj plik do projektu', 'Add a file to the project')}">${L('Plik…', 'File…')}</button></div>`;
  if (t === 'date') {
    const d = parseDate(v);
    return `<input id="${id}" type="date" data-k="${k}" value="${d ? isoD(d) : ''}">`;
  }
  if (t === 'size') return `<input id="${id}" data-k="${k}" value="${esc(v)}" placeholder="Auto" inputmode="decimal">`;
  if (t === 'num') return `<input id="${id}" data-k="${k}" value="${esc(v)}" inputmode="decimal">`;
  return `<input id="${id}" data-k="${k}" value="${esc(v)}">`;
}
function toHex(v) {
  const c = brush(v, '');
  const m = /^rgba\((\d+),(\d+),(\d+)/.exec(c);
  if (m) return '#' + [m[1], m[2], m[3]].map(x => (+x).toString(16).padStart(2, '0')).join('');
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const cv = document.createElement('canvas').getContext('2d');
  try {
    cv.fillStyle = c || '#ffffff';
    return /^#/.test(cv.fillStyle) ? cv.fillStyle : '#ffffff';
  } catch (e) {
    return '#ffffff';
  }
}
function selNodes() {
  const ids = sel.length ? sel : ['win'];
  return ids.map(byId).filter(Boolean);
}
function renderProps() {
  const nodes = selNodes();
  if (!nodes.length) return;
  const n = nodes[0];
  const isWin = n.id === 'win';
  const multi = nodes.length > 1;
  const pn = $('#pName');
  if (document.activeElement !== pn) pn.value = isWin ? '' : n.name || '';
  pn.disabled = isWin || multi;
  pn.placeholder = isWin
    ? L('Window — nazwa niedostępna', 'Window: name not available')
    : L('<Brak nazwy>', '<No Name>');
  $('#pType').textContent = multi ? L(`${nodes.length} obiekty`, `${nodes.length} objects`) : isWin ? 'Window' : n.t;
  const q = $('#propSearch').value.trim().toLowerCase();
  const body = $('#propBody');
  if (propTab === 'events') {
    if (multi) {
      body.innerHTML = `<div class="empty">${L('Zaznacz jeden element, aby edytować jego zdarzenia.', 'Select a single element to edit its events.')}</div>`;
      return;
    }
    const evs = eventKeys(n).filter(e => !q || e.toLowerCase().includes(q));
    body.innerHTML =
      `<div class="help" style="padding-top:8px">${L(`Kliknij dwukrotnie pole lub strzałkę, aby utworzyć metodę obsługi w ${MAIN_CS}. Możesz też wpisać własną nazwę.`, `Double-click a field or the arrow to create a handler in ${MAIN_CS}. You can also type your own name.`)}</div>` +
      evs
        .map(
          ev =>
            `<div class="evrow"><label for="ev_${ev}" title="${EA[ev] || 'RoutedEventArgs'}">${ev}</label><input id="ev_${ev}" data-ev="${ev}" value="${esc(n.ev[ev] || '')}" spellcheck="false" autocomplete="off"><button data-go="${ev}" title="${L('Przejdź do kodu', 'Go to code')}" aria-label="${L('Przejdź do metody', 'Go to handler')} ${ev}">→</button></div>`,
        )
        .join('');
    return;
  }
  let keys = propKeys(n);
  if (multi) keys = keys.filter(k => nodes.every(m => propKeys(m).includes(k)));
  if (!isWin) {
    const pk = kindOf(parentOf(n.id));
    if (pk === 'dock') keys.push('DockPanel.Dock');
    if (pk === 'canvas')
      keys = keys
        .filter(k => k !== 'Margin' && k !== 'HorizontalAlignment' && k !== 'VerticalAlignment')
        .concat(['Canvas.Left', 'Canvas.Top']);
  }
  if (q) keys = keys.filter(k => k.toLowerCase().includes(q));
  const used = new Set();
  let h = '';
  const groups = [...GROUPS, ['Układ (dołączone)', ['Canvas.Left', 'Canvas.Top', 'DockPanel.Dock']], ['Różne', null]];
  const open = JSON.parse(LS.get('wpf-pg-closed') || '[]');
  for (const [g, list] of groups) {
    const ks = list ? keys.filter(k => list.includes(k) && !used.has(k)) : keys.filter(k => !used.has(k));
    if (!ks.length) continue;
    ks.forEach(k => used.add(k));
    h += `<details class="pgroup" data-g="${esc(g)}"${open.includes(g) ? '' : ' open'}><summary><svg viewBox="0 0 10 10"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>${esc(L(g, GROUP_EN[g] || g))}</summary>`;
    for (const k of ks) {
      const t = ptype(isWin ? 'Window' : n.t, k);
      const wide = t === 'items';
      const set = isSetP(n, k);
      h += `<div class="prow${wide ? ' wide' : ''}"><label for="pe_${k.replace(/\W/g, '_')}${k === 'Margin' ? '_0' : ''}" title="${k}">${k === 'Columns' && n.t === 'DataGrid' ? L('Columns (nagłówki kolumn)', 'Columns (column headers)') : k}</label>${editorFor(n, k)}<button class="mk${set ? ' set' : ''}" data-reset="${k}" title="${set ? L('Wartość ustawiona lokalnie — kliknij, aby zresetować', 'Local value: click to reset') : L('Wartość domyślna', 'Default value')}" aria-label="${L('Resetuj', 'Reset')} ${k}"></button></div>`;
      if (wide)
        h += `<div class="help">${k === 'Columns' ? L('Jedna kolumna w wierszu. Wiązanie Binding tworzone jest z nazwy (bez polskich znaków).', 'One column per line. The Binding path is built from the name.') : TY[n.t] && TY[n.t].it === 'tree' ? L('Jeden element w wierszu. Wcięcie dwiema spacjami tworzy element podrzędny. „Tekst | NazwaMetody” dodaje obsługę kliknięcia. „-” to separator.', 'One item per line. Indent with two spaces for a child item. "Text | MethodName" adds a click handler. "-" is a separator.') : L('Jeden element w wierszu. „-” to separator.', 'One item per line. "-" is a separator.') + (n.t === 'ToolBar' ? L(' „Tekst | NazwaMetody” dodaje obsługę Click.', ' "Text | MethodName" adds a Click handler.') : '')}</div>`;
    }
    h += '</details>';
  }
  body.innerHTML = h || `<div class="empty">${L('Brak pasujących właściwości.', 'No matching properties.')}</div>`;
}
function applyProp(k, v, i) {
  const nodes = selNodes();
  snap();
  for (const n of nodes) {
    if (k === 'Width' || k === 'Height') {
      const val = String(v).trim() === '' || /^auto$/i.test(v) ? null : Math.max(0, num(v, 0));
      if (n.id === 'win') {
        if (val != null) P.win[k === 'Width' ? 'w' : 'h'] = val;
      } else n[k === 'Width' ? 'w' : 'h'] = val;
    } else if (k === 'Margin') {
      n.m[+i] = num(v, 0);
    } else if (k === 'Canvas.Left') n.m[0] = num(v, 0);
    else if (k === 'Canvas.Top') n.m[1] = num(v, 0);
    else if (k === 'DockPanel.Dock') {
      if (v) n.dock = v;
      else delete n.dock;
    } else if (v === '' || v == null) delete n.p[k];
    else n.p[k] = String(v);
    if (k === 'Items')
      itemHandlers(n).forEach(h => ensureHandler(h.name, n.t === 'Menu' || n.t === 'ToolBar' ? 'Click' : 'Selected'));
  }
  commit();
}
function resetProp(k) {
  const nodes = selNodes();
  snap();
  for (const n of nodes) {
    if (k === 'Width' || k === 'Height') {
      if (n.id !== 'win') n[k === 'Width' ? 'w' : 'h'] = null;
    } else if (k === 'Margin') n.m = [0, 0, 0, 0];
    else if (k === 'DockPanel.Dock') delete n.dock;
    else delete n.p[k];
  }
  commit();
}
function renameSel(v) {
  const n = selNodes()[0];
  if (!n || n.id === 'win') return;
  v = v.trim();
  if (v === (n.name || '')) return;
  if (v && (!IDRE.test(v) || CS.KW.has(v))) {
    status(
      L(
        `„${v}” nie jest prawidłową nazwą C# (litery, cyfry, _; nie może zaczynać się cyfrą).`,
        `'${v}' is not a valid C# name (letters, digits and _; it can't start with a digit).`,
      ),
      'err',
    );
    $('#pName').value = n.name || '';
    return;
  }
  if (v && names().has(v)) {
    status(L(`Nazwa „${v}” jest już używana w tym oknie.`, `The name '${v}' is already used in this window.`), 'err');
    $('#pName').value = n.name || '';
    return;
  }
  snap();
  const old = n.name;
  n.name = v || null;
  commit();
  status(
    old
      ? L(
          `Zmieniono nazwę „${old}” na „${v}”. Odwołania w kodzie zmień ręcznie (Ctrl+H w VS).`,
          `Renamed '${old}' to '${v}'. Update references in the code yourself (Ctrl+H in VS).`,
        )
      : L(`Nadano nazwę „${v}”.`, `Named '${v}'.`),
  );
}

/* ---------- karty dokumentów ---------- */
function docKind(name) {
  if (name === MAIN_X) return 'design';
  if (name === MAIN_CS || P.files.some(f => f.name === name)) return 'code';
  return 'file';
}
function renderDocTabs() {
  $('#docTabs').innerHTML = openDocs
    .map(d => {
      const k = docKind(d);
      const ic =
        k === 'design'
          ? '<span class="fic xa" style="font:600 9.5px var(--mono)">&lt;/&gt;</span>'
          : `<span class="fic ${/\.cs$/.test(d) ? 'cs' : ''}" style="font:600 9.5px var(--mono)">${/\.cs$/.test(d) ? 'C#' : '▤'}</span>`;
      return `<div class="doctab${d === activeDoc ? ' on' : ''}" data-doc="${esc(d)}" role="tab" aria-selected="${d === activeDoc}" tabindex="0">${ic}<span>${esc(d)}</span>${d !== MAIN_X && d !== MAIN_CS ? `<button class="x" data-close="${esc(d)}" aria-label="${L('Zamknij', 'Close')} ${esc(d)}">✕</button>` : ''}</div>`;
    })
    .join('');
}
function openDoc(name) {
  if (!openDocs.includes(name)) openDocs.push(name);
  activeDoc = name;
  const k = docKind(name);
  $('#designView').hidden = k !== 'design';
  $('#codeView').hidden = k !== 'code';
  $('#fileView').hidden = k !== 'file';
  if (k === 'code') {
    showCodeFile(name);
    setTimeout(() => EDC.refresh(), 0);
  }
  if (k === 'file') {
    const txt = genFile(name);
    if (EDF.cm) {
      EDF.cm.setOption('mode', /\.cs$/.test(name) ? 'text/x-csharp' : 'xml');
    }
    EDF.set(txt);
    $('#fileInfo').textContent = L(
      `${name} — plik generowany automatycznie przy eksporcie (tylko do odczytu)`,
      `${name}: generated automatically on export (read-only)`,
    );
    setTimeout(() => EDF.refresh(), 0);
  }
  if (k === 'design') {
    setTimeout(() => {
      EDX.refresh();
      renderDesign();
    }, 0);
  }
  renderDocTabs();
  renderSol();
}
function closeDoc(name) {
  openDocs = openDocs.filter(d => d !== name);
  if (activeDoc === name) openDoc(openDocs[openDocs.length - 1] || MAIN_X);
  else renderDocTabs();
}
function setLayout(l) {
  layout = l;
  $$('#layoutSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === l));
  const dw = $('#designWrap'),
    xp = $('#xamlPane'),
    sp = $('#designView .split.h');
  dw.style.display = l === 'xaml' ? 'none' : '';
  xp.style.display = l === 'design' ? 'none' : '';
  sp.style.display = l === 'split' ? '' : 'none';
  xp.style.height = l === 'xaml' ? 'auto' : '';
  xp.style.flex = l === 'xaml' ? '1' : '';
  setTimeout(() => {
    EDX.refresh();
    renderDesign();
  }, 0);
}
function refreshMemberNav() {
  const r = CS.methodsOf(getCode(codeFile));
  const sel_ = $('#memberNav');
  const ms = [];
  (r.types || []).forEach(t =>
    t.members.forEach(m => {
      if (m.kind === 'method' || m.kind === 'prop' || m.kind === 'getter') ms.push({ t: t.name, m });
    }),
  );
  sel_.innerHTML =
    `<option value="">${esc(codeFile)} — ${L('składowe', 'members')} (${ms.length})</option>` +
    ms
      .map(
        ({ t, m }) =>
          `<option value="${m.line}">${esc(t)}.${esc(m.name)}${
            m.kind === 'method'
              ? `(${esc(
                  CS.paramNames(m.params)
                    .map(p => p.name)
                    .join(', '),
                )})`
              : ''
          }</option>`,
      )
      .join('');
}

/* ---------- kontrola błędów ---------- */
const NEED_USING = {
  DispatcherTimer: 'System.Windows.Threading',
  DispatcherPriority: 'System.Windows.Threading',
  Stopwatch: 'System.Diagnostics',
  Debug: 'System.Diagnostics',
  Process: 'System.Diagnostics',
  Trace: 'System.Diagnostics',
  ObservableCollection: 'System.Collections.ObjectModel',
  File: 'System.IO',
  Directory: 'System.IO',
  StreamReader: 'System.IO',
  StreamWriter: 'System.IO',
  FileInfo: 'System.IO',
  Regex: 'System.Text.RegularExpressions',
  CultureInfo: 'System.Globalization',
  INotifyPropertyChanged: 'System.ComponentModel',
  PropertyChangedEventArgs: 'System.ComponentModel',
  OpenFileDialog: 'Microsoft.Win32',
  SaveFileDialog: 'Microsoft.Win32',
  JsonSerializer: 'System.Text.Json',
  SoundPlayer: 'System.Media',
  SystemSounds: 'System.Media',
  DoubleAnimation: 'System.Windows.Media.Animation',
  Storyboard: 'System.Windows.Media.Animation',
};
const IMPLICIT = ['System', 'System.Collections.Generic', 'System.Linq', 'System.Threading', 'System.Threading.Tasks'];
function collectHandlers() {
  const hs = [];
  const add = (n, ev, name, owner) => {
    const pos = XPOS.handlers[name];
    hs.push({
      name,
      event: ev,
      owner,
      line: pos ? pos.line : XLINE[n.id] || 1,
      args: EA[ev] || 'RoutedEventArgs',
      node: n.id,
    });
  };
  Object.entries(P.win.ev).forEach(([ev, h]) => add(P.win, ev, h, 'Window'));
  walk(n => {
    Object.entries(n.ev).forEach(([ev, h]) => add(n, ev, h, n.name || n.t));
    itemHandlers(n).forEach(h =>
      add(n, n.t === 'Menu' || n.t === 'ToolBar' ? 'Click' : 'Selected', h.name, `${n.name || n.t} → "${h.text}"`),
    );
  });
  return hs;
}
let simWarn = [];
function runChecks(verbose) {
  const errs = [];
  // XAML: walidacja tekstu z edytora (pozycje wierszy i kolumn)
  const xerrs = validateXaml(EDX.get());
  xerrs.forEach(e => errs.push(Object.assign({ file: MAIN_X }, e)));
  if (xamlBroken && !xerrs.some(e => e.sev === 'err'))
    errs.push({ sev: 'err', code: 'XAML', msg: xamlBroken.msg, file: MAIN_X, line: xamlBroken.line });
  xamlWarns.forEach(w => errs.push({ sev: 'warn', code: 'XAML', msg: w, file: MAIN_X, line: 1 }));
  const files = csFiles();
  const cs = CS.check(files, { controls: new Set(names()), handlers: collectHandlers() });
  try {
    const sem = SEM.check(files, { handlers: collectHandlers() });
    const seen = new Set(cs.map(e => e.code + '|' + e.file + '|' + e.line + '|' + e.msg));
    sem.forEach(e => {
      const k = e.code + '|' + e.file + '|' + e.line + '|' + e.msg;
      if (e.code === 'CS0103' && cs.some(x => x.code === 'CS0103' && x.file === e.file && x.line === e.line)) return;
      if (!seen.has(k)) {
        seen.add(k);
        cs.push(e);
      }
    });
  } catch (e) {
    console.warn('SEM', e);
  }
  cs.forEach(e => {
    if (e.fix && XPOS.handlers[e.fix.name])
      Object.assign(e, { col: XPOS.handlers[e.fix.name].col, len: XPOS.handlers[e.fix.name].len });
  });
  errs.push(...cs);
  // brakujące dyrektywy using
  files.forEach(f => {
    const t = CS.tokenize(f.src);
    const usings = new Set([
      ...IMPLICIT,
      ...(f.src.match(/^\s*using\s+([\w.]+)\s*;/gm) || []).map(u => u.replace(/^\s*using\s+|\s*;$/g, '').trim()),
    ]);
    const reported = new Set();
    for (const [ty, ns] of Object.entries(NEED_USING)) {
      const re = new RegExp('(^|[^.\\w])' + ty + '\\b(?!\\s*=)', 'g');
      let m;
      while ((m = re.exec(t.code))) {
        if (usings.has(ns) || reported.has(ty)) break;
        reported.add(ty);
        errs.push({
          sev: 'err',
          code: 'CS0246',
          msg: L(
            `Nie można znaleźć nazwy typu lub przestrzeni nazw „${ty}” (brak dyrektywy using ${ns};).`,
            `The type or namespace name '${ty}' could not be found (missing using ${ns};).`,
          ),
          file: f.name,
          line: CS.lineOf(t.code, m.index + m[1].length),
          fixUsing: ns,
        });
      }
    }
  });
  // symulacja
  simWarn = [];
  if (!errs.some(e => e.sev === 'err')) {
    try {
      const r = CS.transpile(files, { controls: [...names()], ns: P.name });
      r.warn.forEach(w => simWarn.push(w));
      try {
        new Function(...SCOPE_NAMES(), ...[...names()].filter(x => IDRE.test(x)), r.js);
      } catch (e) {
        simWarn.push(
          L(
            `Fragment kodu wykracza poza możliwości symulacji F5 (${e.message}). Projekt nadal skompilujesz w Visual Studio.`,
            `Part of the code is beyond what the F5 simulation can run (${e.message}). The project still builds in Visual Studio.`,
          ),
        );
      }
    } catch (e) {
      simWarn.push(L('Symulacja: ', 'Simulation: ') + e.message);
    }
  }
  simWarn.forEach(w => errs.push({ sev: 'info', code: 'SYM', msg: w, file: '', line: '' }));
  lastErrs = errs;
  renderErrors();
  markCodeErrors();
  markXamlErrors();
  return errs;
}
function renderErrors() {
  const E = lastErrs.filter(e => e.sev === 'err').length,
    W = lastErrs.filter(e => e.sev === 'warn').length;
  $('#cntE').textContent = `✕ ${E}`;
  $('#cntW').textContent = `⚠ ${W}`;
  $('#cntE').title = `${L('Błędy', 'Errors')}: ${E}`;
  $('#cntW').title = `${L('Ostrzeżenia', 'Warnings')}: ${W}`;
  if (!lastErrs.length) {
    $('#errBody').innerHTML =
      `<div class="empty">${L('Nie znaleziono błędów. Naciśnij F5, aby uruchomić symulację, albo pobierz projekt .zip i skompiluj go w Visual Studio.', 'No issues found. Press F5 to run the simulation, or download the .zip project and build it in Visual Studio.')}</div>`;
    return;
  }
  const sevName = s =>
    s === 'err' ? L('Błąd', 'Error') : s === 'warn' ? L('Ostrzeżenie', 'Warning') : L('Informacja', 'Message');
  $('#errBody').innerHTML =
    `<table class="errs"><thead><tr><th></th><th>${L('Kod', 'Code')}</th><th>${L('Opis', 'Description')}</th><th>${L('Plik', 'File')}</th><th>${L('Wiersz', 'Line')}</th><th></th></tr></thead><tbody>${lastErrs.map((e, i) => `<tr data-err="${i}"><td><span class="sev ${e.sev}" title="${sevName(e.sev)}"></span></td><td class="c">${esc(e.code)}</td><td>${esc(e.msg)}</td><td class="c">${esc(e.file)}</td><td class="n">${esc(e.line)}</td><td>${e.fix ? `<button class="btn" data-fix="${i}">${L('Utwórz metodę', 'Create method')}</button>` : e.fixUsing ? `<button class="btn" data-fixu="${i}">${L('Dodaj using', 'Add using')}</button>` : e.fixTo ? `<button class="btn" data-fixx="${i}">${L('Zmień na', 'Change to')} ${esc(e.fixTo)}</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
}
/* podkreślenia błędów w edytorach */
const MARKS = new WeakMap();
function markErrors(ed, list) {
  if (!ed || !ed.cm) return;
  const cm = ed.cm;
  (MARKS.get(cm) || []).forEach(m => {
    try {
      m.clear ? m.clear() : cm.removeLineClass(m, 'background', 'err-line');
    } catch (e) {}
  });
  const marks = [];
  cm.operation(() => {
    list.forEach(e => {
      const ln = (+e.line || 1) - 1;
      if (ln >= cm.lineCount()) return;
      const text = cm.getLine(ln);
      let from = e.col ? e.col - 1 : text.length - text.trimStart().length,
        to = e.col ? from + Math.max(1, e.len || 1) : text.length;
      if (to <= from) {
        from = Math.max(0, text.length - 1);
        to = text.length;
      }
      if (!text.length) return;
      marks.push(
        cm.markText(
          { line: ln, ch: from },
          { line: ln, ch: Math.min(to, text.length) },
          {
            className: e.sev === 'err' ? 'cm-squig-err' : 'cm-squig-warn',
            attributes: { title: `${e.code}: ${e.msg}` },
          },
        ),
      );
      if (e.sev === 'err') marks.push(cm.addLineClass(ln, 'background', 'err-line'));
    });
  });
  MARKS.set(cm, marks);
}
function markCodeErrors() {
  if (EDC)
    markErrors(
      EDC,
      lastErrs.filter(e => (e.sev === 'err' || e.sev === 'warn') && e.file === codeFile && e.line),
    );
}
function markXamlErrors() {
  if (EDX)
    markErrors(
      EDX,
      lastErrs.filter(e => (e.sev === 'err' || e.sev === 'warn') && e.file === MAIN_X && e.line),
    );
}
function gotoError(e) {
  if (!e.file) return;
  if (e.file === MAIN_X) {
    openDoc(MAIN_X);
    if (layout === 'design') setLayout('split');
    setTimeout(() => edGoto(EDX, e.line || 1, e.col ? e.col - 1 : 0), 30);
    if (e.node) select([e.node]);
    return;
  }
  openDoc(e.file);
  setTimeout(() => edGoto(EDC, e.line || 1), 30);
}

/* ---------- dane wyjściowe ---------- */
function out(text, cls) {
  const p = $('#outPre');
  const s = document.createElement('span');
  if (cls) s.className = cls;
  s.textContent = text + '\n';
  p.appendChild(s);
  const b = $('#outBody');
  b.scrollTop = b.scrollHeight;
}
function setBottom(t) {
  $$('#botTabs button').forEach(b => b.classList.toggle('on', b.dataset.b === t));
  $('#errBody').hidden = t !== 'errs';
  $('#outBody').hidden = t !== 'out';
  $('#locBody').hidden = t !== 'locals';
  $('#stackBody').hidden = t !== 'stack';
}
function buildSolution() {
  saveLocal();
  $('#outPre').textContent = '';
  setBottom('out');
  const t0 = performance.now();
  const now = new Date();
  out(
    L(
      `Kompilacja rozpoczęta o ${now.toLocaleTimeString('pl-PL')}...`,
      `Build started at ${now.toLocaleTimeString('en-US')}...`,
    ),
  );
  out(
    L(
      `1>------ Kompilacja rozpoczęta: Projekt: ${P.name}, Konfiguracja: Debug Any CPU ------`,
      `1>------ Build started: Project: ${P.name}, Configuration: Debug Any CPU ------`,
    ),
  );
  const errs = runChecks(true);
  const E = errs.filter(e => e.sev === 'err');
  errs
    .filter(e => e.sev !== 'info')
    .forEach(e =>
      out(
        `1>${e.file}(${e.line || 1}${e.col ? ',' + e.col : ''}): ${e.sev === 'err' ? 'error' : 'warning'} ${e.code}: ${e.msg}`,
        e.sev === 'err' ? 'e' : 'w',
      ),
    );
  if (!E.length) {
    out(
      L(
        `1>Sprawdzono ${csFiles().length} plik(i) C#, ${allNodes().length} element(y) XAML, pakiety NuGet: ${P.pkgs.length}, odwołania .dll: ${P.refs.length}.`,
        `1>Checked ${csFiles().length} C# file(s), ${allNodes().length} XAML element(s), NuGet packages: ${P.pkgs.length}, .dll references: ${P.refs.length}.`,
      ),
    );
    out(
      L(
        `1>${P.name} -> bin\\Debug\\net10.0-windows\\${P.name}.dll  (wynik po „dotnet build” na Windows)`,
        `1>${P.name} -> bin\\Debug\\net10.0-windows\\${P.name}.dll  (output of "dotnet build" on Windows)`,
      ),
    );
    out(
      L(
        `========== Kompilacja: 1 zakończone powodzeniem, 0 zakończone niepowodzeniem, 0 aktualne, 0 pominięte ==========`,
        `========== Build: 1 succeeded, 0 failed, 0 up-to-date, 0 skipped ==========`,
      ),
      'ok',
    );
    simWarn.forEach(w => out(L('Uwaga (symulacja): ', 'Note (simulation): ') + w, 'w'));
    out(
      L(
        `Kontrola w przeglądarce zakończona w ${Math.round(performance.now() - t0)} ms. Pełną kompilację kompilatorem Roslyn wykona Visual Studio albo „dotnet build” — użyj przycisku „Pobierz .zip”.`,
        `Browser check finished in ${Math.round(performance.now() - t0)} ms. The full Roslyn build runs in Visual Studio or "dotnet build": use the "Download .zip" button.`,
      ),
    );
    status(L('Kompilacja zakończona powodzeniem.', 'Build succeeded.'));
  } else {
    out(
      L(
        `========== Kompilacja: 0 zakończone powodzeniem, 1 zakończone niepowodzeniem ==========`,
        `========== Build: 0 succeeded, 1 failed ==========`,
      ),
      'e',
    );
    status(L(`Kompilacja nie powiodła się: błędy ${E.length}.`, `Build failed: ${E.length} error(s).`), 'err');
    setBottom('errs');
  }
  return E.length;
}
