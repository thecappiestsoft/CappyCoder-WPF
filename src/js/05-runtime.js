/**
 * CappyCoder WPF — 05 · Symulacja F5
 *
 * Zadanie: Uruchamia przetłumaczony kod C# w przeglądarce: okno programu, zdarzenia, timery, MessageBox,
 *   obsługa wyjątków. Funkcje __T/__E/__X dla debugera dostarcza 06-debugger.js.
 * Zależy od: csharp.js, 01–04, 06
 * Udostępnia: startRun, RUN, createRuntime
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const enumProxy = (alias = {}) => new Proxy({}, { get: (t, k) => (typeof k === 'string' ? alias[k] || k : undefined) });
class ExitSignal {}
let RUN = null;
function netEx(name) {
  return class extends CSRT.NetException {
    constructor(m) {
      super('System.' + name, m == null ? `Exception of type 'System.${name}' was thrown.` : m);
    }
  };
}
function makeScope(rt) {
  const NE = CSRT.NetException;
  const notSup = what =>
    function () {
      throw new NE(
        'System.NotSupportedException',
        L(
          `${what} nie jest dostępne w symulacji przeglądarki. Ten kod zadziała po kompilacji projektu w Visual Studio.`,
          `${what} is not available in the browser simulation. This code works after you build the project in Visual Studio.`,
        ),
      );
    };
  const S = {};
  S.__String = CSRT.StrT;
  S.__Int = CSRT.IntT;
  S.__Double = CSRT.DblT;
  S.__Char = CSRT.CharT;
  S.__Bool = CSRT.BoolT;
  S.Math = CSRT.MathT;
  S.Convert = CSRT.ConvertT;
  S.DateTime = CSRT.DateTimeT;
  S.TimeSpan = CSRT.TimeSpanT;
  S.Random = CSRT.RandomT;
  S.__fmt = CSRT.fmt;
  S.__arr = CSRT.makeArr;
  S.__dict = CSRT.makeDict;
  S.__set = CSRT.makeSet;
  S.__g = () => {
    if (++rt.iter > 5e6)
      throw new NE(
        'System.InvalidOperationException',
        L(
          'Przerwano: pętla wykonała ponad 5 milionów obrotów (prawdopodobnie pętla nieskończona). W prawdziwym WPF okno by się zawiesiło.',
          'Stopped: a loop ran more than 5 million times (probably an infinite loop). In real WPF the window would freeze.',
        ),
      );
    return true;
  };
  S.__win = rt.winProxy;
  S.__isEx = (e, t) => {
    if (e instanceof ExitSignal) return false;
    let nt = e && e.netType;
    if (!nt) {
      if (e instanceof TypeError && /null|undefined/.test(e.message)) nt = 'System.NullReferenceException';
      else if (e instanceof RangeError) nt = 'System.StackOverflowException';
      else nt = 'System.Exception';
    }
    const n = nt.split('.').pop();
    if (n === t) return true;
    const fam = {
      SystemException: /Exception$/,
      ArgumentException: /^Argument(Null|OutOfRange)?Exception$/,
      ArithmeticException: /^(DivideByZero|Overflow|NotFiniteNumber)Exception$/,
      IOException: /^(FileNotFound|DirectoryNotFound|EndOfStream|IO)Exception$/,
      InvalidOperationException: /^(InvalidOperation|ObjectDisposed)Exception$/,
    };
    return !!(fam[t] && fam[t].test(n));
  };
  dbgScope(S, rt);
  S.MessageBox = {
    Show: (text, cap, btn, img) => rt.msg(CSRT.fmt(text), cap == null ? '' : CSRT.fmt(cap), btn || 'OK', img || 'None'),
  };
  const KEYAL = { Return: 'Enter', Prior: 'PageUp', Next: 'PageDown', Capital: 'CapsLock', Escape: 'Escape' };
  S.Key = enumProxy(KEYAL);
  [
    'Brushes',
    'Colors',
    'Visibility',
    'HorizontalAlignment',
    'VerticalAlignment',
    'Orientation',
    'FontWeights',
    'FontStyles',
    'TextWrapping',
    'TextAlignment',
    'Cursors',
    'Stretch',
    'MessageBoxButton',
    'MessageBoxImage',
    'MessageBoxResult',
    'ModifierKeys',
    'StringSplitOptions',
    'MidpointRounding',
    'DayOfWeek',
    'WindowState',
    'ResizeMode',
    'UriKind',
    'MouseButton',
    'MouseButtonState',
    'DispatcherPriority',
    'SelectionMode',
    'Dock',
  ].forEach(n => (S[n] = enumProxy()));
  S.Color = {
    FromRgb: (r, g, b) =>
      '#FF' +
      [r, g, b]
        .map(x => (x & 255).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase(),
    FromArgb: (a, r, g, b) =>
      '#' +
      [a, r, g, b]
        .map(x => (x & 255).toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase(),
  };
  S.SolidColorBrush = function (c) {
    return {
      Color: String(c),
      toString() {
        return String(c);
      },
      ToString() {
        return String(c);
      },
    };
  };
  S.BrushConverter = function () {
    return { ConvertFromString: s => String(s) };
  };
  S.ColorConverter = { ConvertFromString: s => String(s) };
  S.Thickness = function (l, t, r, b) {
    if (t === undefined) {
      t = r = b = l;
    }
    return {
      Left: l,
      Top: t,
      Right: r,
      Bottom: b,
      ToString() {
        return `${l},${t},${r},${b}`;
      },
    };
  };
  S.Point = function (x, y) {
    return {
      X: x,
      Y: y,
      ToString() {
        return `${x};${y}`;
      },
    };
  };
  S.Uri = function (s) {
    return String(s);
  };
  S.BitmapImage = function (u) {
    return {
      UriSource: u,
      toString() {
        return String(u);
      },
      ToString() {
        return String(u);
      },
    };
  };
  S.Canvas = Object.assign(
    notSup(L('Tworzenie kontrolek w kodzie (new Canvas())', 'Creating controls in code (new Canvas())')),
    {
      SetLeft: (el, v) => rt.setPos(el, 0, v),
      SetTop: (el, v) => rt.setPos(el, 1, v),
      SetRight: (el, v) => rt.setPos(el, 2, v),
      SetBottom: (el, v) => rt.setPos(el, 3, v),
      GetLeft: el => el.__node.m[0],
      GetTop: el => el.__node.m[1],
      SetZIndex: (el, v) => {
        el.__node.p['Panel.ZIndex'] = String(v);
        rt.refresh(el.__node);
      },
      GetZIndex: el => num(el.__node.p['Panel.ZIndex'], 0),
    },
  );
  S.Panel = { SetZIndex: S.Canvas.SetZIndex, GetZIndex: S.Canvas.GetZIndex };
  S.Grid = Object.assign(
    notSup(L('Tworzenie kontrolek w kodzie (new Grid())', 'Creating controls in code (new Grid())')),
    {
      SetRow: () =>
        rt.log(L('Grid.SetRow: wiersze siatki nie są symulowane.', 'Grid.SetRow: grid rows are not simulated.'), 'w'),
      SetColumn: () =>
        rt.log(
          L('Grid.SetColumn: kolumny siatki nie są symulowane.', 'Grid.SetColumn: grid columns are not simulated.'),
          'w',
        ),
    },
  );
  S.Keyboard = {
    IsKeyDown: k => rt.keys.has(KEYAL[k] || k),
    IsKeyUp: k => !rt.keys.has(KEYAL[k] || k),
    get Modifiers() {
      return rt.mods;
    },
    ClearFocus: () => document.activeElement && document.activeElement.blur(),
  };
  S.Mouse = { GetPosition: rel => rt.mousePos(rel) };
  const writer = cls => ({
    WriteLine: (...a) => rt.log(a.length > 1 ? CSRT.StrT.Format(...a) : CSRT.fmt(a[0] ?? ''), cls),
    Write: (...a) => rt.log(a.length > 1 ? CSRT.StrT.Format(...a) : CSRT.fmt(a[0] ?? ''), cls),
    Print: (...a) => rt.log(CSRT.fmt(a[0])),
    Assert: (c, m) => {
      if (!c) rt.log(L('Asercja nie powiodła się: ', 'Assertion failed: ') + (m || ''), 'w');
    },
  });
  S.Console = writer();
  S.Debug = writer();
  S.Trace = writer();
  S.Application = {
    Current: {
      Shutdown: () => rt.close(false),
      get MainWindow() {
        return rt.winProxy;
      },
    },
  };
  S.Environment = {
    NewLine: '\n',
    Exit: () => rt.close(false),
    get TickCount() {
      return Math.floor(performance.now());
    },
    get UserName() {
      return L('Uczen', 'Student');
    },
    get MachineName() {
      return L('PRZEGLADARKA', 'BROWSER');
    },
  };
  S.Task = {
    Delay: ms =>
      new Promise((res, rej) => {
        const h = setTimeout(() => (rt.closed ? rej(new ExitSignal()) : res()), Number(ms) || 0);
        rt.pending.add(h);
      }),
    Run: f => Promise.resolve().then(f),
    CompletedTask: Promise.resolve(),
    WhenAll: (...a) => Promise.all(a.flat()),
    FromResult: v => Promise.resolve(v),
  };
  S.Thread = {
    Sleep: ms => {
      const e = performance.now() + Math.min(Number(ms) || 0, 3000);
      while (performance.now() < e) {}
    },
  };
  S.Clipboard = {
    SetText: t => {
      try {
        navigator.clipboard.writeText(String(t)).catch(() => {});
      } catch (e) {}
    },
    GetText: () => '',
    ContainsText: () => false,
  };
  S.Enumerable = {
    Range: (a, n) => Array.from({ length: n }, (_, i) => a + i),
    Repeat: (x, n) => Array(n).fill(x),
    Empty: () => [],
  };
  class Stopwatch {
    constructor() {
      this.t0 = 0;
      this.acc = 0;
      this.on = false;
    }
    static StartNew() {
      const s = new Stopwatch();
      s.Start();
      return s;
    }
    Start() {
      if (!this.on) {
        this.t0 = performance.now();
        this.on = true;
      }
    }
    Stop() {
      if (this.on) {
        this.acc += performance.now() - this.t0;
        this.on = false;
      }
    }
    Reset() {
      this.acc = 0;
      this.on = false;
    }
    Restart() {
      this.acc = 0;
      this.t0 = performance.now();
      this.on = true;
    }
    get ElapsedMilliseconds() {
      return Math.floor(this.acc + (this.on ? performance.now() - this.t0 : 0));
    }
    get Elapsed() {
      return CSRT.TimeSpanT.ms(this.ElapsedMilliseconds);
    }
    get IsRunning() {
      return this.on;
    }
  }
  S.Stopwatch = Stopwatch;
  class DispatcherTimer {
    constructor() {
      this._iv = 0;
      this.hs = [];
      this.h = null;
      this.Tag = null;
    }
    get Interval() {
      return CSRT.TimeSpanT.ms(this._iv);
    }
    set Interval(v) {
      this._iv = Number(v) || 0;
      if (this.h) {
        this.Stop();
        this.Start();
      }
    }
    get IsEnabled() {
      return !!this.h;
    }
    set IsEnabled(v) {
      v ? this.Start() : this.Stop();
    }
    __on(ev, f) {
      if (ev === 'Tick') this.hs.push(f);
    }
    __off(ev, f) {
      this.hs = this.hs.filter(x => x !== f);
    }
    Start() {
      if (this.h || rt.closed) return;
      this.h = setInterval(
        () => {
          if (rt.closed) return this.Stop();
          this.hs.forEach(f => rt.call(f, this, {}, 'Tick'));
        },
        Math.max(10, this._iv),
      );
      rt.timers.add(this);
    }
    Stop() {
      if (this.h) clearInterval(this.h);
      this.h = null;
    }
  }
  S.DispatcherTimer = DispatcherTimer;
  S.EventArgs = { Empty: {} };
  S.RoutedEventArgs = function () {
    return {};
  };
  S.Exception = netEx('Exception');
  [
    'ArgumentException',
    'ArgumentNullException',
    'ArgumentOutOfRangeException',
    'InvalidOperationException',
    'FormatException',
    'DivideByZeroException',
    'NotImplementedException',
    'NotSupportedException',
    'IndexOutOfRangeException',
    'NullReferenceException',
    'OverflowException',
    'KeyNotFoundException',
  ].forEach(n => (S[n] = netEx(n)));
  [
    'File',
    'Directory',
    'StreamReader',
    'StreamWriter',
    'FileInfo',
    'Process',
    'OpenFileDialog',
    'SaveFileDialog',
    'HttpClient',
    'SqlConnection',
    'SqliteConnection',
    'JsonSerializer',
    'Regex',
    'SoundPlayer',
  ].forEach(
    n =>
      (S[n] = Object.assign(notSup(n), {
        ReadAllText: notSup(n + '.ReadAllText'),
        WriteAllText: notSup(n + '.WriteAllText'),
        Exists: notSup(n + '.Exists'),
        ReadAllLines: notSup(n + '.ReadAllLines'),
        AppendAllText: notSup(n + '.AppendAllText'),
        Start: notSup(n + '.Start'),
        Serialize: notSup(n + '.Serialize'),
        Deserialize: notSup(n + '.Deserialize'),
        IsMatch: (s, p) => new RegExp(p).test(s),
        Replace: (s, p, r) => String(s).replace(new RegExp(p, 'g'), r),
      })),
  );
  Object.keys(TY).forEach(t => {
    if (!S[t]) S[t] = notSup(L(`Tworzenie kontrolek w kodzie (new ${t}())`, `Creating controls in code (new ${t}())`));
  });
  S.Window = notSup(L('Otwieranie nowych okien (new Window())', 'Opening new windows (new Window())'));
  return S;
}
let _scopeNames = null;
function SCOPE_NAMES() {
  if (!_scopeNames)
    _scopeNames = Object.keys(makeScope({ winProxy: {}, keys: new Set(), timers: new Set(), pending: new Set() }));
  return _scopeNames;
}

function mapKey(ev) {
  const k = ev.key;
  if (/^[a-z]$/i.test(k)) return k.toUpperCase();
  if (/^Digit\d$/.test(ev.code)) return 'D' + ev.code.slice(5);
  if (/^Numpad\d$/.test(ev.code)) return 'NumPad' + ev.code.slice(6);
  return (
    {
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ' ': 'Space',
      Enter: 'Enter',
      Escape: 'Escape',
      Backspace: 'Back',
      Tab: 'Tab',
      Shift: 'LeftShift',
      Control: 'LeftCtrl',
      Alt: 'LeftAlt',
      Delete: 'Delete',
      Home: 'Home',
      End: 'End',
      PageUp: 'PageUp',
      PageDown: 'PageDown',
      Insert: 'Insert',
      CapsLock: 'CapsLock',
      '+': 'Add',
      '-': 'Subtract',
      '*': 'Multiply',
      '/': 'Divide',
      ',': 'OemComma',
      '.': 'OemPeriod',
    }[k] || k
  );
}
const DOM_EV = {
  MouseDown: 'mousedown',
  MouseUp: 'mouseup',
  MouseLeftButtonDown: 'mousedown',
  MouseRightButtonDown: 'mousedown',
  PreviewMouseDown: 'mousedown',
  MouseEnter: 'mouseenter',
  MouseLeave: 'mouseleave',
  MouseMove: 'mousemove',
  MouseWheel: 'wheel',
  MouseDoubleClick: 'dblclick',
  GotFocus: 'focusin',
  LostFocus: 'focusout',
  KeyDown: 'keydown',
  KeyUp: 'keyup',
  PreviewKeyDown: 'keydown',
};

function startRun(noDebug) {
  if (RUN) {
    if (RUN.dbg && RUN.dbg.paused) dbgCmd(RUN, 'cont');
    return;
  }
  saveLocal();
  const errs = runChecks(false).filter(e => e.sev === 'err');
  if (errs.length) {
    setBottom('errs');
    dialog(
      L('Wystąpiły błędy kompilacji', 'There were build errors'),
      L(
        `<p>Znaleziono błędy: ${errs.length}. Popraw je przed uruchomieniem — kliknij wiersz na liście błędów, aby przejść do miejsca problemu.</p>`,
        `<p>Found ${errs.length} error(s). Fix them before running: click a row in the Error List to jump to the problem.</p>`,
      ),
      [['OK', null, true]],
    );
    return;
  }
  let mod;
  const info = noDebug === true ? null : dbgInfo();
  try {
    mod = CS.transpile(csFiles(), {
      controls: [...names()],
      ns: P.name,
      instrument: info ? (code, strs, file) => SEM.instrument(code, strs, file, info) : null,
    });
    if (info) {
      try {
        new Function(mod.js);
      } catch (e) {
        console.warn('debug instrumentation', e);
        mod = CS.transpile(csFiles(), { controls: [...names()], ns: P.name });
        info.off = true;
      }
    }
  } catch (e) {
    dialog(L('Nie można uruchomić symulacji', 'Cannot start the simulation'), `<p>${esc(e.message)}</p>`, [
      ['OK', null, true],
    ]);
    return;
  }
  $('#outPre').textContent = '';
  setBottom('out');
  out(
    L(
      `'${P.name}.exe' (CoreCLR: clrhost): symulacja w przeglądarce — rozpoczęto debugowanie.`,
      `'${P.name}.exe' (CoreCLR: clrhost): browser simulation, debugging started.`,
    ),
  );
  mod.warn.forEach(w => out(L('Uwaga (symulacja): ', 'Note (simulation): ') + w, 'w'));
  const M = clone({ win: P.win, root: P.root });
  const rt = createRuntime(M, mod);
  if (info && !info.off) {
    rt.dbg = { info, bps: collectBpSet(info), stack: [], trace: [], hits: [], paused: false };
    const n = rt.dbg.bps.size;
    if (n) out(L(`Aktywne punkty przerwania: ${n}.`, `Active breakpoints: ${n}.`));
  } else if (info && info.off)
    out(
      L(
        'Uwaga: debuger niedostępny dla tego kodu — program działa bez punktów przerwania.',
        'Note: the debugger is not available for this code; the program runs without breakpoints.',
      ),
      'w',
    );
  RUN = rt;
  rt.start();
}
function createRuntime(M, mod) {
  const rt = {
    M,
    mod,
    closed: false,
    iter: 0,
    depth: 0,
    timers: new Set(),
    pending: new Set(),
    keys: new Set(),
    mods: 'None',
    els: new Map(),
    proxies: new Map(),
    dyn: new Map(),
    itemsM: new Map(),
    raw: new Map(),
    src: new Map(),
    trees: new Map(),
    scale: 1,
  };
  const nodes = new Map();
  const parents = new Map();
  const reg = (n, p) => {
    nodes.set(n.id, n);
    parents.set(n.id, p);
    n.ch.forEach(c => reg(c, n));
  };
  reg(M.root, null);
  const byName = {};
  nodes.forEach(n => {
    if (n.name) byName[n.name] = n;
  });
  rt.log = (t, cls) => out(t, cls);
  rt.byName = byName;
  /* --- elementy list --- */
  const itemObj = (text, tag, h) => ({
    __text: text,
    Content: text,
    Header: text,
    __h: h,
    ToString() {
      return `System.Windows.Controls.${tag}: ${text}`;
    },
    toString() {
      return this.ToString();
    },
  });
  rt.items = n => {
    if (!rt.itemsM.has(n.id)) {
      const T = TY[n.t];
      rt.itemsM.set(
        n.id,
        T.it === 'flat'
          ? parseItems(n.p.Items, false)
              .filter(i => !i.sep)
              .map(i => itemObj(i.text, T.itTag, i.h))
          : [],
      );
    }
    if (rt.src.has(n.id) && rt.src.get(n.id)) return [...rt.src.get(n.id)];
    return rt.itemsM.get(n.id);
  };
  rt.rows = n => rt.items(n);
  rt.extraItems = n => rt.itemsM.get(n.id) || [];
  rt.treeState = n => {
    if (!rt.trees.has(n.id)) rt.trees.set(n.id, { closed: new Set(), sel: -1 });
    return rt.trees.get(n.id);
  };
  function itemsApi(n) {
    const arr = () => {
      rt.items(n);
      if (rt.src.get(n.id))
        throw new CSRT.NetException(
          'System.InvalidOperationException',
          L(
            'Kolekcja Items musi być pusta przed użyciem ItemsSource (Operation is not valid while ItemsSource is in use).',
            'Operation is not valid while ItemsSource is in use. Access and modify elements with ItemsControl.ItemsSource instead.',
          ),
        );
      return rt.itemsM.get(n.id);
    };
    const fixSel = (i, d) => {
      const si = num(n.p.SelectedIndex, -1);
      if (si >= 0 && i <= si) n.p.SelectedIndex = String(d < 0 && i === si ? -1 : si + d);
    };
    const api = {
      Add(x) {
        const a = arr();
        a.push(x);
        rt.refresh(n);
        return a.length - 1;
      },
      Insert(i, x) {
        const a = arr();
        if (i < 0 || i > a.length)
          throw new CSRT.NetException(
            'System.ArgumentOutOfRangeException',
            L('Indeks był spoza zakresu.', 'Index was out of range.'),
          );
        a.splice(i, 0, x);
        fixSel(i, 1);
        rt.refresh(n);
      },
      Remove(x) {
        const a = arr();
        const i = a.findIndex(y => y === x || (typeof x === 'string' && typeof y === 'string' && y === x));
        if (i >= 0) api.RemoveAt(i);
      },
      RemoveAt(i) {
        const a = arr();
        if (i < 0 || i >= a.length)
          throw new CSRT.NetException(
            'System.ArgumentOutOfRangeException',
            L(
              'Indeks był spoza zakresu. Musi być nieujemny i mniejszy niż rozmiar kolekcji.',
              'Index was out of range. Must be non-negative and less than the size of the collection.',
            ),
          );
        a.splice(i, 1);
        fixSel(i, -1);
        rt.refresh(n);
      },
      Clear() {
        arr().length = 0;
        n.p.SelectedIndex = '-1';
        rt.refresh(n);
      },
      Contains: x => rt.items(n).some(y => y === x),
      IndexOf: x => rt.items(n).indexOf(x),
      get Count() {
        return rt.items(n).length;
      },
      Refresh() {
        rt.refresh(n);
      },
      ToString: () => 'System.Windows.Controls.ItemCollection',
      [Symbol.iterator]() {
        return rt.items(n)[Symbol.iterator]();
      },
    };
    return new Proxy(api, {
      get(t, k) {
        if (k in t) return t[k];
        if (typeof k === 'string' && /^\d+$/.test(k)) {
          const a = rt.items(n);
          if (+k >= a.length)
            throw new CSRT.NetException(
              'System.ArgumentOutOfRangeException',
              L('Indeks był spoza zakresu.', 'Index was out of range.'),
            );
          return a[+k];
        }
        return undefined;
      },
      set(t, k, v) {
        if (/^\d+$/.test(k)) {
          arr()[+k] = v;
          rt.refresh(n);
        }
        return true;
      },
    });
  }
  /* --- właściwości --- */
  const boolDef = {
    IsEnabled: true,
    IsTabStop: true,
    LastChildFill: true,
    IsHitTestVisible: true,
    CanUserAddRows: true,
    AutoGenerateColumns: true,
    IsTodayHighlighted: true,
  };
  const numDef = (n, k) =>
    ({
      Minimum: 0,
      Maximum: n.t === 'Slider' ? 10 : n.t === 'ScrollBar' ? 100 : 100,
      Value: 0,
      FontSize: 12,
      Opacity: 1,
      StrokeThickness: 1,
      SelectedIndex: n.t === 'TabControl' ? 0 : -1,
    })[k];
  function getP(n, k) {
    const s = n.p;
    switch (k) {
      case '__node':
        return n;
      case 'then':
        return undefined;
      case 'ToString':
      case 'toString':
        return () =>
          `System.Windows.Controls.${n.t}` +
          (s.Content != null ? ': ' + s.Content : n.t === 'TextBox' ? ': ' + (s.Text || '') : '');
      case 'Equals':
        return o => o === rt.proxy(n);
      case 'GetType':
        return () => ({ Name: n.t, ToString: () => 'System.Windows.Controls.' + n.t });
      case '__on':
        return (ev, f) => {
          if (!rt.dyn.has(n.id)) rt.dyn.set(n.id, {});
          (rt.dyn.get(n.id)[ev] = rt.dyn.get(n.id)[ev] || []).push(f);
        };
      case '__off':
        return (ev, f) => {
          const d = rt.dyn.get(n.id);
          if (d && d[ev]) d[ev] = d[ev].filter(x => x !== f);
        };
      case 'Name':
        return n.name || '';
      case 'Focus':
        return () => {
          const el = rt.els.get(n.id);
          const f = el && el.querySelector('input,textarea,select,[contenteditable]');
          if (f) f.focus();
          return true;
        };
      case 'Clear':
        return () => setP(n, 'Text', '');
      case 'SelectAll':
        return () => {
          const el = rt.els.get(n.id);
          const f = el && el.querySelector('input,textarea');
          if (f) {
            f.focus();
            f.select();
          }
        };
      case 'AppendText':
        return t => setP(n, 'Text', (s.Text || '') + t);
      case 'ScrollToEnd':
        return () => {
          const el = rt.els.get(n.id);
          const f = el && el.querySelector('textarea,.v');
          if (f) f.scrollTop = 1e9;
        };
      case 'ScrollIntoView':
        return () => {};
      case 'UnselectAll':
        return () => setP(n, 'SelectedIndex', -1);
      case 'Items':
        return itemsApi(n);
      case 'ItemsSource':
        return rt.src.get(n.id) || null;
      case 'Children':
        return {
          Clear: () => {
            n.ch = [];
            rt.refresh(n);
          },
          get Count() {
            return n.ch.length;
          },
          Add: () => {
            throw new CSRT.NetException(
              'System.NotSupportedException',
              L(
                'Dodawanie kontrolek w kodzie (Children.Add) nie jest dostępne w symulacji — działa po kompilacji w VS.',
                'Adding controls in code (Children.Add) is not available in the simulation; it works after building in VS.',
              ),
            );
          },
          Remove: c => {
            n.ch = n.ch.filter(x => x !== (c && c.__node));
            rt.refresh(n);
          },
          [Symbol.iterator]: () => n.ch.map(c => rt.proxy(c))[Symbol.iterator](),
        };
      case 'Strokes':
        return {
          Clear: () => {
            const c = rt.els.get(n.id)?.querySelector('canvas');
            if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
            rt.inkCount = 0;
          },
          get Count() {
            return rt.inkCount || 0;
          },
        };
      case 'Play':
        return () => rt.els.get(n.id)?.querySelector('video')?.play();
      case 'Pause':
        return () => rt.els.get(n.id)?.querySelector('video')?.pause();
      case 'Stop':
        return () => {
          const v = rt.els.get(n.id)?.querySelector('video');
          if (v) {
            v.pause();
            v.currentTime = 0;
          }
        };
      case 'Parent': {
        const p = parents.get(n.id);
        return p ? rt.proxy(p) : rt.winProxy;
      }
      case 'ActualWidth': {
        const el = rt.els.get(n.id);
        return el ? el.getBoundingClientRect().width / rt.scale : 0;
      }
      case 'ActualHeight': {
        const el = rt.els.get(n.id);
        return el ? el.getBoundingClientRect().height / rt.scale : 0;
      }
      case 'Width':
        return n.w == null ? NaN : n.w;
      case 'Height':
        return n.h == null ? NaN : n.h;
      case 'Margin':
        return makeScopeCache.Thickness(...n.m);
      case 'Text':
        if (n.t === 'ComboBox') {
          const si = num(s.SelectedIndex, -1);
          const a = rt.items(n);
          return si >= 0 && a[si] != null ? itemText(a[si]) : s.Text || '';
        }
        if (n.t === 'DatePicker') {
          const d = parseDate(s.SelectedDate);
          return d ? fmtD(d) : '';
        }
        return s.Text ?? '';
      case 'IsChecked':
        return /x:Null/.test(s.IsChecked || '') ? null : isTrue(s.IsChecked);
      case 'SelectedItem':
      case 'SelectedValue': {
        if (n.t === 'TreeView') {
          const st = rt.treeState(n);
          if (st.sel < 0) return null;
          const flat = [];
          const rec = a =>
            a.forEach(i => {
              flat.push(i);
              rec(i.ch);
            });
          rec(parseItems(s.Items, true));
          const it = flat[st.sel];
          return it ? itemObj(it.text, 'TreeViewItem', it.h) : (rt.extraItems(n)[st.sel - flat.length] ?? null);
        }
        if (n.t === 'TabControl') {
          const h = parseItems(s.Items, false)[num(s.SelectedIndex, 0)];
          return h ? itemObj(h.text, 'TabItem') : null;
        }
        const si = num(s.SelectedIndex, -1);
        const a = rt.items(n);
        return si >= 0 && si < a.length ? a[si] : null;
      }
      case 'SelectedItems': {
        const si = num(s.SelectedIndex, -1);
        const a = rt.items(n);
        return si >= 0 ? [a[si]] : [];
      }
      case 'SelectedDate':
      case 'DisplayDate': {
        const d = parseDate(s[k]);
        return d ? new CSRT.DateTimeT(d) : k === 'DisplayDate' ? CSRT.DateTimeT.Today : null;
      }
      case 'Password':
        return s.Password || '';
      case 'Visibility':
        return s.Visibility || 'Visible';
      case 'Tag': {
        const r = rt.raw.get(n.id);
        return r && 'Tag' in r ? r.Tag : (s.Tag ?? null);
      }
      case 'Content':
      case 'Header':
      case 'ToolTip': {
        const r = rt.raw.get(n.id);
        return r && k in r ? r[k] : (s[k] ?? null);
      }
    }
    const pt = ptype(n.t, k);
    if (pt === 'bool') return s[k] == null ? !!boolDef[k] : isTrue(s[k]);
    if (pt === 'num' || pt === 'size') {
      const d = numDef(n, k);
      return s[k] == null ? (d ?? NaN) : num(s[k], d ?? 0);
    }
    if (typeof k !== 'string') return undefined;
    if (s[k] !== undefined) return s[k];
    const r = rt.raw.get(n.id);
    if (r && k in r) return r[k];
    return null;
  }
  const CHG = {
    Text: 'TextChanged',
    Password: 'PasswordChanged',
    Value: 'ValueChanged',
    SelectedIndex: 'SelectionChanged',
    SelectedItem: 'SelectionChanged',
    SelectedValue: 'SelectionChanged',
    IsChecked: null,
    IsExpanded: null,
    SelectedDate: null,
  };
  function setP(n, k, v, fromUi) {
    const s = n.p;
    const old = getP(n, k);
    if (!rt.raw.has(n.id)) rt.raw.set(n.id, {});
    switch (k) {
      case 'Width':
      case 'Height':
        n[k === 'Width' ? 'w' : 'h'] = v == null || isNaN(v) ? null : Math.max(0, Number(v));
        break;
      case 'Margin':
        n.m = [v.Left, v.Top, v.Right, v.Bottom].map(Number);
        break;
      case 'ItemsSource':
        rt.src.set(n.id, v);
        break;
      case 'SelectedItem':
      case 'SelectedValue': {
        const a = rt.items(n);
        s.SelectedIndex = String(a.findIndex(it => it === v || (v != null && itemText(it) === itemText(v))));
        break;
      }
      case 'SelectedDate':
      case 'DisplayDate':
        if (v == null) delete s[k];
        else s[k] = isoD(v.d || v);
        break;
      case 'Value': {
        const mn = getP(n, 'Minimum'),
          mx = getP(n, 'Maximum');
        s.Value = String(Math.min(mx, Math.max(mn, Number(v))));
        break;
      }
      case 'Content':
      case 'Header':
      case 'Tag':
      case 'ToolTip':
      case 'Title':
        rt.raw.get(n.id)[k] = v;
        if (v == null) delete s[k];
        else s[k] = CSRT.fmt(v);
        break;
      case 'Text':
        s.Text = v == null ? '' : CSRT.fmt(v);
        break;
      default: {
        const pt = ptype(n.t, k);
        if (pt === 'bool') s[k] = v === null ? '{x:Null}' : v ? 'True' : 'False';
        else if (v == null) delete s[k];
        else if (typeof v === 'number') s[k] = String(v);
        else if (typeof v === 'object' && v.Left !== undefined && (k === 'Padding' || k === 'BorderThickness'))
          s[k] = `${v.Left},${v.Top},${v.Right},${v.Bottom}`;
        else s[k] = String(v);
        if (!(k in PD) && typeof v === 'object') rt.raw.get(n.id)[k] = v;
      }
    }
    if (n.t === 'RadioButton' && k === 'IsChecked' && v === true) radioGroup(n);
    if (!fromUi) rt.refresh(n);
    const nv = getP(n, k);
    if (old !== nv && !(typeof old === 'number' && typeof nv === 'number' && isNaN(old) && isNaN(nv))) {
      let ev = CHG[k];
      if (k === 'IsChecked') ev = nv === true ? 'Checked' : nv === false ? 'Unchecked' : 'Indeterminate';
      if (k === 'IsExpanded') ev = nv ? 'Expanded' : 'Collapsed';
      if (k === 'SelectedDate') ev = n.t === 'Calendar' ? 'SelectedDatesChanged' : 'SelectedDateChanged';
      if (ev) {
        const e = { OldValue: old, NewValue: nv, Handled: false, Source: rt.proxy(n), OriginalSource: rt.proxy(n) };
        if (ev === 'SelectionChanged' || ev.startsWith('SelectedDate')) {
          e.AddedItems = nv == null || nv === -1 ? [] : [k === 'SelectedIndex' ? (rt.items(n)[nv] ?? nv) : nv];
          e.RemovedItems = [];
        }
        rt.fire(n, ev, e);
      }
    }
  }
  function radioGroup(n) {
    const g = n.p.GroupName;
    const par = parents.get(n.id);
    nodes.forEach(o => {
      if (
        o !== n &&
        o.t === 'RadioButton' &&
        isTrue(o.p.IsChecked) &&
        ((g && o.p.GroupName === g) || (!g && !o.p.GroupName && parents.get(o.id) === par))
      )
        setP(o, 'IsChecked', false);
    });
  }
  rt.setPos = (pr, i, v) => {
    const n = pr.__node;
    if (!n) return;
    n.m[i] = Number(v) || 0;
    if (i < 2 && kindOf(parents.get(n.id)) === 'abs') {
      if (i === 0) n.p.HorizontalAlignment = 'Left';
      else n.p.VerticalAlignment = 'Top';
    }
    rt.refresh(n);
  };
  rt.proxy = n => {
    if (!rt.proxies.has(n.id))
      rt.proxies.set(
        n.id,
        new Proxy(
          {},
          {
            get: (t, k) => getP(n, k),
            set: (t, k, v) => {
              setP(n, k, v);
              return true;
            },
          },
        ),
      );
    return rt.proxies.get(n.id);
  };
  rt.getP = getP;
  rt.setP = setP;
  /* --- okno --- */
  const W = M.win;
  rt.winProxy = new Proxy(
    {},
    {
      get(t, k) {
        switch (k) {
          case 'Title':
            return W.p.Title ?? '';
          case 'Width':
            return W.w;
          case 'Height':
            return W.h;
          case 'ActualWidth':
            return W.w;
          case 'ActualHeight':
            return W.h;
          case 'Background':
            return W.p.Background ?? null;
          case 'Close':
          case 'Hide':
            return () => rt.close(true);
          case 'Show':
          case 'Activate':
          case 'DragMove':
            return () => {};
          case 'Focus':
            return () => rt.host && rt.host.focus();
          case '__on':
            return (ev, f) => {
              if (!rt.dyn.has('win')) rt.dyn.set('win', {});
              (rt.dyn.get('win')[ev] = rt.dyn.get('win')[ev] || []).push(f);
            };
          case '__off':
            return (ev, f) => {
              const d = rt.dyn.get('win');
              if (d && d[ev]) d[ev] = d[ev].filter(x => x !== f);
            };
          case 'FindName':
            return nm => (byName[nm] ? rt.proxy(byName[nm]) : null);
          case 'WindowState':
            return W.p.WindowState || 'Normal';
          case 'Topmost':
            return isTrue(W.p.Topmost);
          case 'Name':
            return 'MainWindow';
          case 'Content':
            return rt.proxy(M.root);
          case 'ToString':
          case 'toString':
            return () => `${P.name}.MainWindow`;
          case 'then':
            return undefined;
          case 'Equals':
            return o => o === rt.winProxy;
          default:
            if (typeof k === 'string' && byName[k]) return rt.proxy(byName[k]);
            return W.p[k] ?? null;
        }
      },
      set(t, k, v) {
        if (k === 'Width') W.w = Number(v);
        else if (k === 'Height') W.h = Number(v);
        else if (v == null) delete W.p[k];
        else W.p[k] = typeof v === 'boolean' ? (v ? 'True' : 'False') : CSRT.fmt(v);
        rt.refreshWin();
        return true;
      },
    },
  );
  makeScopeCache = makeScope(rt);
  /* --- zdarzenia --- */
  rt.call = (f, sender, e, label) => {
    if (rt.closed) return;
    const D = rt.dbg;
    if (D && D.paused) return; // w trybie przerwania program „stoi”
    if (D && rt.depth === 0) dbgReset(D);
    rt.iter = 0;
    rt.depth++;
    if (rt.depth > 80) {
      rt.depth--;
      rt.exception(
        new CSRT.NetException(
          'System.StackOverflowException',
          L(
            'Zbyt głębokie zagnieżdżenie wywołań zdarzeń (prawdopodobnie zdarzenie wywołuje samo siebie).',
            'Event calls are nested too deeply (an event probably triggers itself).',
          ),
        ),
        label,
      );
      return;
    }
    try {
      const r = f(sender, e);
      if (r && typeof r.then === 'function')
        r.catch(err => {
          if (!(err instanceof ExitSignal)) rt.exception(err, label);
        });
    } catch (err) {
      if (!(err instanceof ExitSignal)) rt.exception(err, label);
    } finally {
      rt.depth--;
    }
    if (D && rt.depth === 0 && !D.paused && !rt.closed) {
      if (D.hits.length) dbgBreak(rt, D.hits[0], 'bp');
      else if (D.excBreak && D.excTrace) {
        D.excBreak = false;
        D.trace = D.excTrace;
        dbgBreak(rt, D.trace.length - 1, 'exc');
      }
    }
  };
  rt.has = (n, ev) =>
    !!((n.ev && n.ev[ev]) || (rt.dyn.get(n.id) && rt.dyn.get(n.id)[ev] && rt.dyn.get(n.id)[ev].length));
  rt.fire = (n, ev, e) => {
    if (rt.closed) return;
    const sender = n.id === 'win' ? rt.winProxy : rt.proxy(n);
    const h = n.ev && n.ev[ev];
    if (h) {
      const f = mod.fns[h];
      if (f) rt.call(f, sender, e, h);
      else
        rt.log(L(`Brak metody ${h} — zdarzenie ${ev} pominięte.`, `Method ${h} is missing; event ${ev} skipped.`), 'e');
    }
    const d = rt.dyn.get(n.id);
    if (d && d[ev]) d[ev].slice().forEach(f => rt.call(f, sender, e, ev));
  };
  rt.fireItem = (hname, text, tag) => {
    const f = mod.fns[hname];
    if (f) rt.call(f, itemObj(text, tag, hname), { Handled: false, Source: itemObj(text, tag) }, hname);
    else rt.log(L(`Brak metody ${hname}.`, `Method ${hname} is missing.`), 'e');
  };
  rt.mouseArgs = (n, ev) => ({
    Handled: false,
    ChangedButton: ['Left', 'Middle', 'Right'][ev.button] || 'Left',
    ClickCount: ev.detail || 1,
    LeftButton: ev.buttons & 1 ? 'Pressed' : 'Released',
    RightButton: ev.buttons & 2 ? 'Pressed' : 'Released',
    Delta: ev.deltaY ? -Math.sign(ev.deltaY) * 120 : 0,
    Source: n.id === 'win' ? rt.winProxy : rt.proxy(n),
    GetPosition: rel => posIn(rel, ev),
  });
  const posIn = (rel, ev) => {
    let el = rel && rel.__node ? rt.els.get(rel.__node.id) : rt.client;
    if (!el) el = rt.client;
    const r = el.getBoundingClientRect();
    return makeScopeCache.Point((ev.clientX - r.left) / rt.scale, (ev.clientY - r.top) / rt.scale);
  };
  rt.lastMouse = { clientX: 0, clientY: 0 };
  rt.mousePos = rel => posIn(rel, rt.lastMouse);
  rt.keyArgs = ev => ({
    Key: mapKey(ev),
    Handled: false,
    IsRepeat: ev.repeat,
    SystemKey: 'None',
    KeyboardDevice: { Modifiers: rt.mods },
  });
  /* --- wiązanie zdarzeń DOM --- */
  rt.bind = (el, n) => {
    rt.els.set(n.id, el);
    for (const [ev, dom] of Object.entries(DOM_EV)) {
      el.addEventListener(dom, e => {
        if (!rt.has(n, ev)) return;
        if (ev === 'MouseLeftButtonDown' && e.button !== 0) return;
        if (ev === 'MouseRightButtonDown' && e.button !== 2) return;
        if (ev === 'MouseEnter' || ev === 'MouseLeave') {
        } else if (e.__done && e.__done.has(n.id + ev)) return;
        (e.__done = e.__done || new Set()).add(n.id + ev);
        const args = dom.startsWith('key') ? rt.keyArgs(e) : rt.mouseArgs(n, e);
        rt.fire(n, ev, args);
        if (args.Handled && dom.startsWith('key')) e.preventDefault();
      });
    }
    const v = el.firstElementChild;
    switch (n.t) {
      case 'Button':
        el.addEventListener('click', () => {
          if (n.p.IsEnabled !== 'False') rt.fire(n, 'Click', { Handled: false, Source: rt.proxy(n) });
        });
        break;
      case 'RepeatButton': {
        let to, iv;
        const stop = () => {
          clearTimeout(to);
          clearInterval(iv);
        };
        el.addEventListener('pointerdown', () => {
          const f = () => rt.fire(n, 'Click', {});
          f();
          to = setTimeout(
            () => {
              iv = setInterval(f, num(n.p.Interval, 33));
            },
            num(n.p.Delay, 500),
          );
        });
        el.addEventListener('pointerup', stop);
        el.addEventListener('pointerleave', stop);
        break;
      }
      case 'ToggleButton':
      case 'CheckBox':
        el.addEventListener('click', () => {
          const c = getP(n, 'IsChecked');
          setP(n, 'IsChecked', isTrue(n.p.IsThreeState) ? (c === true ? null : c === null ? false : true) : !c);
          rt.fire(n, 'Click', {});
        });
        break;
      case 'RadioButton':
        el.addEventListener('click', () => {
          if (!getP(n, 'IsChecked')) setP(n, 'IsChecked', true);
          rt.fire(n, 'Click', {});
        });
        break;
      case 'TextBox':
      case 'PasswordBox':
      case 'RichTextBox': {
        const f = v.querySelector('input,textarea,[contenteditable]');
        if (!f) break;
        f.addEventListener('beforeinput', e => {
          if (e.data && rt.has(n, 'PreviewTextInput')) {
            const a = { Text: e.data, Handled: false };
            rt.fire(n, 'PreviewTextInput', a);
            if (a.Handled) e.preventDefault();
          }
        });
        f.addEventListener('input', () => {
          if (n.t === 'PasswordBox') setP(n, 'Password', f.value, true);
          else if (n.t === 'RichTextBox') setP(n, 'Text', f.innerText, true);
          else
            setP(
              n,
              'Text',
              n.p.CharacterCasing === 'Upper'
                ? f.value.toUpperCase()
                : n.p.CharacterCasing === 'Lower'
                  ? f.value.toLowerCase()
                  : f.value,
              true,
            );
        });
        if (f.tagName === 'INPUT' && n.t === 'TextBox')
          f.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !isTrue(n.p.AcceptsReturn)) {
              const def = [...nodes.values()].find(o => o.t === 'Button' && isTrue(o.p.IsDefault));
              if (def) {
                e.preventDefault();
                rt.fire(def, 'Click', {});
              }
            }
          });
        break;
      }
      case 'ComboBox': {
        const s = v.querySelector('select');
        if (s) {
          s.addEventListener('change', () => setP(n, 'SelectedIndex', +s.value));
          s.addEventListener('focus', () => rt.fire(n, 'DropDownOpened', {}));
        }
        break;
      }
      case 'ListBox':
      case 'ListView':
      case 'DataGrid':
        v.addEventListener('click', e => {
          const r = e.target.closest('[data-i]');
          if (r) setP(n, 'SelectedIndex', +r.dataset.i);
        });
        break;
      case 'TabControl':
        v.querySelector('.tabs').addEventListener('click', e => {
          const t = e.target.closest('.tabh');
          if (t) setP(n, 'SelectedIndex', +t.dataset.tab);
        });
        break;
      case 'Expander':
        v.querySelector('.eh').addEventListener('click', () => setP(n, 'IsExpanded', !getP(n, 'IsExpanded')));
        break;
      case 'TreeView':
        v.addEventListener('click', e => {
          const st = rt.treeState(n);
          const tw = e.target.closest('[data-tw]');
          if (tw && tw.textContent) {
            const i = +tw.dataset.tw;
            st.closed.has(i) ? st.closed.delete(i) : st.closed.add(i);
            rt.refresh(n);
            return;
          }
          const r = e.target.closest('.ti');
          if (r) {
            const old = getP(n, 'SelectedItem');
            st.sel = +r.dataset.i;
            rt.refresh(n);
            const nv = getP(n, 'SelectedItem');
            rt.fire(n, 'SelectedItemChanged', { OldValue: old, NewValue: nv });
            if (nv && nv.__h) rt.fireItem(nv.__h, nv.__text, 'TreeViewItem');
          }
        });
        break;
      case 'Slider':
      case 'ScrollBar': {
        const vert = n.t === 'ScrollBar' ? n.p.Orientation !== 'Horizontal' : n.p.Orientation === 'Vertical';
        const inp = document.createElement('input');
        inp.type = 'range';
        if (vert) inp.className = 'vert';
        inp.min = getP(n, 'Minimum');
        inp.max = getP(n, 'Maximum');
        inp.step = isTrue(n.p.IsSnapToTickEnabled) ? num(n.p.TickFrequency, 1) : 'any';
        inp.value = getP(n, 'Value');
        inp.setAttribute('aria-label', n.name || n.t);
        if (n.t === 'ScrollBar' && vert) inp.style.direction = 'ltr';
        inp.addEventListener('input', () => {
          setP(n, 'Value', +inp.value, true);
          const tmp = document.createElement('div');
          tmp.innerHTML = R[n.t](n.p, n);
          [...v.children].forEach(c => {
            if (c !== inp) c.remove();
          });
          [...tmp.firstElementChild.children].forEach(c => v.insertBefore(c, inp));
          if (n.t === 'ScrollBar') rt.fire(n, 'Scroll', {});
        });
        v.appendChild(inp);
        break;
      }
      case 'Calendar':
        v.addEventListener('click', e => {
          const d = e.target.closest('[data-d]');
          if (d) {
            setP(n, 'SelectedDate', parseDate(d.dataset.d));
            return;
          }
          const nv = e.target.closest('[data-nav]');
          if (nv) {
            const cur = parseDate(n.p.DisplayDate) || parseDate(n.p.SelectedDate) || new Date();
            cur.setDate(1);
            cur.setMonth(cur.getMonth() + +nv.dataset.nav);
            n.p.DisplayDate = isoD(cur);
            rt.refresh(n);
            rt.fire(n, 'DisplayDateChanged', {});
          }
        });
        break;
      case 'DatePicker': {
        const i = v.querySelector('input');
        if (i) i.addEventListener('change', () => setP(n, 'SelectedDate', i.value ? parseDate(i.value) : null, true));
        break;
      }
      case 'Menu':
        v.addEventListener('click', e => {
          const mi = e.target.closest('.mi');
          if (mi) rt.openMenu(n, +mi.dataset.i, mi);
        });
        break;
      case 'ToolBar':
        v.addEventListener('click', e => {
          const b = e.target.closest('.tbb');
          if (!b) return;
          const it = parseItems(n.p.Items, false)[+b.dataset.i];
          if (it && it.h) rt.fireItem(it.h, it.text, 'Button');
        });
        break;
      case 'InkCanvas':
        inkBind(el, n);
        break;
    }
  };
  function inkBind(el, n) {
    const c = el.querySelector('canvas');
    if (!c) return;
    requestAnimationFrame(() => {
      c.width = c.clientWidth;
      c.height = c.clientHeight;
    });
    let drawing = false;
    const g = () => c.getContext('2d');
    c.addEventListener('pointerdown', e => {
      if (n.p.EditingMode === 'None') return;
      drawing = true;
      c.setPointerCapture(e.pointerId);
      const r = c.getBoundingClientRect();
      const x = g();
      x.lineWidth = 2;
      x.lineCap = 'round';
      x.strokeStyle = '#000';
      x.globalCompositeOperation = /Erase/.test(n.p.EditingMode || '') ? 'destination-out' : 'source-over';
      if (/Erase/.test(n.p.EditingMode || '')) x.lineWidth = 14;
      x.beginPath();
      x.moveTo((e.clientX - r.left) / rt.scale, (e.clientY - r.top) / rt.scale);
    });
    c.addEventListener('pointermove', e => {
      if (!drawing) return;
      const r = c.getBoundingClientRect();
      const x = g();
      x.lineTo((e.clientX - r.left) / rt.scale, (e.clientY - r.top) / rt.scale);
      x.stroke();
    });
    c.addEventListener('pointerup', () => {
      if (drawing) {
        drawing = false;
        rt.inkCount = (rt.inkCount || 0) + 1;
        rt.fire(n, 'StrokeCollected', {});
      }
    });
  }
  rt.openMenu = (n, idx, anchor) => {
    rt.closeMenus();
    const items = parseItems(n.p.Items, true);
    const it = items[idx];
    if (!it) return;
    if (!it.ch.length) {
      if (it.h) rt.fireItem(it.h, it.text, 'MenuItem');
      return;
    }
    anchor.classList.add('open');
    const show = (list, x, y) => {
      const d = document.createElement('div');
      d.className = 'mdrop';
      d.innerHTML = list
        .map((c, i) =>
          c.sep ? '<hr>' : `<div class="md${c.ch.length ? ' sub' : ''}" data-i="${i}">${esc(c.text)}</div>`,
        )
        .join('');
      const cr = rt.client.getBoundingClientRect();
      d.style.left = (x - cr.left) / rt.scale + 'px';
      d.style.top = (y - cr.top) / rt.scale + 'px';
      rt.client.appendChild(d);
      d.addEventListener('click', e => {
        e.stopPropagation();
        const m = e.target.closest('.md');
        if (!m) return;
        const c = list[+m.dataset.i];
        if (c.ch.length) {
          const r = m.getBoundingClientRect();
          show(c.ch, r.right, r.top);
          return;
        }
        rt.closeMenus();
        if (c.h) rt.fireItem(c.h, c.text, 'MenuItem');
      });
    };
    const r = anchor.getBoundingClientRect();
    show(it.ch, r.left, r.bottom);
  };
  rt.closeMenus = () => {
    if (!rt.client) return;
    rt.client.querySelectorAll('.mdrop').forEach(d => d.remove());
    rt.host && rt.host.querySelectorAll('.mi.open').forEach(m => m.classList.remove('open'));
  };
  /* --- odświeżanie --- */
  rt.refresh = n => {
    if (rt.closed) return;
    const old = rt.els.get(n.id);
    if (!old || !old.isConnected) return;
    const par = parents.get(n.id);
    const ae = document.activeElement;
    const had = old.contains(ae) && ae;
    const ss = had && 'selectionStart' in had ? [had.selectionStart, had.selectionEnd] : null;
    const pk = !par
      ? 'root'
      : (() => {
          const c = TY[par.t].cont;
          if (c === 'stack') return par.p.Orientation === 'Horizontal' ? 'stackH' : 'stackV';
          return c === 'tab' ? 'abs' : c;
        })();
    if (pk === 'dock') {
      rt.refresh(par);
      return;
    }
    const ne = build(n, pk, { run: true, rt });
    old.replaceWith(ne);
    if (had) {
      const f = ne.querySelector(had.tagName === 'DIV' ? '[contenteditable]' : had.tagName.toLowerCase());
      if (f) {
        f.focus();
        if (ss && 'setSelectionRange' in f)
          try {
            f.setSelectionRange(...ss);
          } catch (e) {}
      }
    }
  };
  rt.refreshWin = () => {
    if (!rt.host) return;
    const t = rt.host.querySelector('.ttl');
    if (t) t.textContent = M.win.p.Title ?? '';
    const wnd = rt.host.querySelector('.wnd');
    wnd.style.width = M.win.w + 'px';
    wnd.style.height = M.win.h + 'px';
    rt.client.style.background = brush(M.win.p.Background, '#fff');
    rt.fit();
  };
  /* --- komunikaty --- */
  const ICONS = {
    Information:
      '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#1e74d0"/><path d="M16 9.5v1.5M16 14v9" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
    Asterisk: 'Information',
    Warning:
      '<svg viewBox="0 0 32 32"><path d="M16 3l14 25H2z" fill="#f4c20d"/><path d="M16 12v8M16 23.5v.5" stroke="#000" stroke-width="2.6" stroke-linecap="round"/></svg>',
    Exclamation: 'Warning',
    Error:
      '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#d13438"/><path d="M11 11l10 10M21 11L11 21" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
    Hand: 'Error',
    Stop: 'Error',
    Question:
      '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#1e74d0"/><path d="M12 12.5a4 4 0 1 1 5.5 3.7c-1 .5-1.5 1.2-1.5 2.3v1M16 23.5v.5" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  };
  rt.msg = (text, cap, btns, icon) => {
    if (!rt.client || rt.closed) return 'OK';
    const ic = ICONS[icon];
    const svg = typeof ic === 'string' && ICONS[ic] ? ICONS[ic] : ic;
    const B = {
      OK: ['OK'],
      OKCancel: ['OK', L('Anuluj', 'Cancel')],
      YesNo: [L('Tak', 'Yes'), L('Nie', 'No')],
      YesNoCancel: [L('Tak', 'Yes'), L('Nie', 'No'), L('Anuluj', 'Cancel')],
    }[btns] || ['OK'];
    const m = document.createElement('div');
    m.className = 'run-modal';
    m.innerHTML = `<div class="msgbox" role="dialog" aria-label="${esc(cap)}"><div class="mt">${esc(cap)}</div><div class="mb">${svg || ''}<div>${esc(text)}</div></div><div class="mf">${B.map(b => `<button>${b}</button>`).join('')}</div></div>`;
    rt.client.appendChild(m);
    m.querySelector('button').focus();
    m.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') m.remove();
    });
    rt.log(`MessageBox: ${text}`);
    if (btns && btns !== 'OK')
      rt.log(
        L(
          'Uwaga (symulacja): MessageBox.Show nie wstrzymuje kodu — zwrócono pierwszy przycisk (',
          'Note (simulation): MessageBox.Show does not pause the code; the first button was returned (',
        ) +
          { OKCancel: 'OK', YesNo: 'Yes', YesNoCancel: 'Yes' }[btns] +
          ').',
        'w',
      );
    return { OK: 'OK', OKCancel: 'OK', YesNo: 'Yes', YesNoCancel: 'Yes' }[btns] || 'OK';
  };
  rt.exception = (err, where) => {
    let type = err && err.netType,
      msg = err && err.message;
    if (!type) {
      if (err instanceof TypeError && /null|undefined/.test(msg)) {
        type = 'System.NullReferenceException';
        msg = L(
          'Object reference not set to an instance of an object. (Odwołanie do obiektu, który ma wartość null).',
          'Object reference not set to an instance of an object.',
        );
      } else if (err instanceof ReferenceError) {
        type = L('Symulacja: nieznana nazwa', 'Simulation: unknown name');
        msg = L(
          `${msg.replace(' is not defined', '')} — symulator nie zna tego typu lub metody .NET (np. z pakietu NuGet albo mniej popularnej części biblioteki). Kod zadziała po kompilacji w Visual Studio, jeśli jest poprawny.`,
          `${msg.replace(' is not defined', '')}: the simulator doesn't know this .NET type or method (for example from a NuGet package or a less common part of the library). If the code is correct, it works after building in Visual Studio.`,
        );
      } else if (err instanceof RangeError && /call stack/.test(msg)) {
        type = 'System.StackOverflowException';
        msg = L(
          'Przepełnienie stosu — metoda wywołuje samą siebie bez końca.',
          'Stack overflow: a method calls itself endlessly.',
        );
      } else if (err instanceof TypeError && /is not a function/.test(msg)) {
        type = L('Symulacja: nieobsługiwana metoda', 'Simulation: unsupported method');
        msg =
          msg.replace(/\(intermediate value\)\.?/g, '') +
          L(
            ' — ta metoda nie jest dostępna w symulatorze; sprawdź ją po kompilacji w VS.',
            ': this method is not available in the simulator; check it after building in VS.',
          );
      } else type = 'System.Exception';
    }
    rt.log(
      L(
        `Zgłoszono wyjątek: '${type}' w ${where || 'kodzie'}: ${msg}`,
        `Exception thrown: '${type}' in ${where || 'code'}: ${msg}`,
      ),
      'e',
    );
    const D = rt.dbg;
    let loc = null;
    if (D && err && err.__dbg && err.__dbg.length) {
      const fr = err.__dbg;
      const top = fr[fr.length - 1];
      loc = top;
      fr.slice()
        .reverse()
        .forEach(f => {
          const m = D.info.methods[f.id] || {};
          rt.log(
            `   ${L('w', 'at')} ${P.name}.${m.label || '?'} ${L('w', 'in')} ${f.file}:${L('wiersz', 'line')} ${f.line}`,
            'e',
          );
        });
      D.trace.push({
        line: top.line,
        file: top.file,
        depth: fr.length,
        frames: fr.map(f => ({ id: f.id, line: f.line, file: f.file })),
        vars: top.vars,
        exc: { type, msg },
      });
      D.excIdx = D.trace.length - 1;
      D.excTrace = D.trace;
      if (D.hits.length) return; // najpierw zatrzymamy się na punkcie przerwania; wyjątek pojawi się dalej w śladzie
    }
    if (!rt.client) return;
    const m = document.createElement('div');
    m.className = 'run-modal';
    m.innerHTML = `<div class="exbox" role="alertdialog"><h3>${L('Nieobsłużony wyjątek', 'Unhandled exception')}</h3><p><code>${esc(type)}</code></p><p>${esc(msg)}</p><p style="color:#555">${L('Miejsce', 'Location')}: <code>${esc(loc ? `${loc.file}, ${L('wiersz', 'line')} ${loc.line}` : where || '?')}</code></p><div class="mf">${loc ? `<button class="btn pri" data-x="brk">${L('Przerwij (pokaż wiersz i zmienne)', 'Break (show line and variables)')}</button>` : ''}<button class="btn" data-x="go">${L('Przejdź do kodu', 'Go to code')}</button><button class="btn" data-x="cont">${L('Kontynuuj', 'Continue')}</button><button class="btn pri" data-x="stop">${L('Zatrzymaj', 'Stop')}</button></div></div>`;
    rt.client.appendChild(m);
    m.addEventListener('click', e => {
      const x = e.target.dataset.x;
      if (!x) return;
      m.remove();
      if (x === 'stop') rt.close(false);
      if (x === 'brk' && D && D.excTrace) {
        D.trace = D.excTrace;
        D.hits = [];
        if (rt.depth === 0) dbgBreak(rt, D.trace.length - 1, 'exc');
        else D.excBreak = true;
      }
      if (x === 'go') {
        rt.close(false);
        if (loc) {
          openDoc(loc.file);
          setTimeout(() => edGoto(EDC, loc.line), 30);
        } else if (where && methodLine(where)) gotoHandler(where);
      }
    });
  };
  /* --- start / stop --- */
  rt.fit = () => {
    const host = rt.host;
    if (!host) return;
    const vw = innerWidth - 40,
      vh = innerHeight - 110;
    rt.scale = Math.min(1, vw / M.win.w, vh / M.win.h);
    const wnd = host.querySelector('.wnd');
    wnd.style.transform = `scale(${rt.scale})`;
    wnd.style.transformOrigin = '0 0';
    host.style.width = M.win.w * rt.scale + 'px';
    host.style.height = M.win.h * rt.scale + 'px';
  };
  rt.start = () => {
    // kompilacja modułu
    const scope = makeScopeCache;
    const sn = Object.keys(scope);
    const cn = Object.keys(byName).filter(k => IDRE.test(k) && !sn.includes(k));
    let fns;
    try {
      const f = new Function(...sn, ...cn, mod.js);
      const r = f(...sn.map(k => scope[k]), ...cn.map(k => rt.proxy(byName[k])));
      fns = r;
    } catch (e) {
      out(L('Nie udało się przygotować symulacji: ', 'Could not prepare the simulation: ') + e.message, 'e');
      dialog(
        L('Symulacja niedostępna dla tego kodu', 'Simulation not available for this code'),
        L(
          `<p>Kod jest poprawny dla kontroli kompilacji, ale zawiera konstrukcje, których symulator przeglądarkowy nie obsługuje:</p><p><code>${esc(e.message)}</code></p><p>Pobierz projekt (.zip) i uruchom go w Visual Studio, aby sprawdzić pełne działanie.</p>`,
          `<p>The code passes the build check, but it uses constructs the browser simulator can't run:</p><p><code>${esc(e.message)}</code></p><p>Download the project (.zip) and run it in Visual Studio to check how it works.</p>`,
        ),
        [['OK', null, true]],
      );
      RUN = null;
      return;
    }
    mod.fns = fns.m;
    const RL = $('#runLayer');
    RL.hidden = false;
    RL.innerHTML = `<div class="runbar"><span class="live"><i></i>${L('Debugowanie', 'Debugging')}</span><span>${esc(P.name)} — ${L('symulacja WPF w przeglądarce', 'WPF simulation in the browser')}</span><button class="btn" data-run="restart">↻ ${L('Uruchom ponownie', 'Restart')}</button><button class="btn pri" data-run="stop">■ ${L('Zatrzymaj', 'Stop')} (Shift+F5)</button></div><div id="runHost" class="run" tabindex="-1"></div>`;
    rt.host = $('#runHost');
    const wnd = winFrame({ run: true, rt }, M);
    rt.host.appendChild(wnd);
    rt.client = wnd.querySelector('.client');
    rt.fit();
    rt.onResize = () => rt.fit();
    addEventListener('resize', rt.onResize);
    wnd.querySelector('.cb.x')?.addEventListener('click', () => rt.close(true));
    RL.querySelector('[data-run=stop]').onclick = () => rt.close(false);
    RL.querySelector('[data-run=restart]').onclick = () => {
      rt.close(false);
      setTimeout(startRun, 30);
    };
    rt.kd = e => {
      if (rt.closed) return;
      if (rt.dbg && rt.dbg.paused) {
        dbgKey(rt, e);
        return;
      }
      rt.keys.add(mapKey(e));
      rt.mods = e.ctrlKey ? 'Control' : e.shiftKey ? 'Shift' : e.altKey ? 'Alt' : 'None';
      if (e.key === 'F5' && e.shiftKey) {
        e.preventDefault();
        rt.close(false);
        return;
      }
      if (rt.has(M.win, 'KeyDown') || rt.has(M.win, 'PreviewKeyDown')) {
        const a = rt.keyArgs(e);
        rt.fire(M.win, 'PreviewKeyDown', a);
        rt.fire(M.win, 'KeyDown', a);
        if (a.Handled) e.preventDefault();
        else if (/^Arrow| $/.test(e.key) && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))
          e.preventDefault();
      }
      if (e.key === 'Escape') {
        const def = [...nodes.values()].find(o => o.t === 'Button' && isTrue(o.p.IsCancel));
        if (def) rt.fire(def, 'Click', {});
      }
    };
    rt.ku = e => {
      rt.keys.delete(mapKey(e));
      rt.mods = 'None';
      if (rt.has(M.win, 'KeyUp')) rt.fire(M.win, 'KeyUp', rt.keyArgs(e));
    };
    rt.mm = e => {
      rt.lastMouse = e;
      if (rt.has(M.win, 'MouseMove') && rt.client.contains(e.target))
        rt.fire(M.win, 'MouseMove', rt.mouseArgs(M.win, e));
    };
    rt.md = e => {
      if (!e.target.closest('.v-menu,.mdrop')) rt.closeMenus();
      if (rt.client.contains(e.target) && rt.has(M.win, 'MouseDown'))
        rt.fire(M.win, 'MouseDown', rt.mouseArgs(M.win, e));
    };
    rt.mu = e => {
      if (rt.client.contains(e.target) && rt.has(M.win, 'MouseUp')) rt.fire(M.win, 'MouseUp', rt.mouseArgs(M.win, e));
    };
    addEventListener('keydown', rt.kd, true);
    addEventListener('keyup', rt.ku, true);
    rt.host.addEventListener('mousemove', rt.mm);
    rt.host.addEventListener('mousedown', rt.md);
    rt.host.addEventListener('mouseup', rt.mu);
    rt.host.addEventListener(
      'wheel',
      e => {
        if (rt.has(M.win, 'MouseWheel')) rt.fire(M.win, 'MouseWheel', rt.mouseArgs(M.win, e));
      },
      { passive: true },
    );
    rt.host.focus({ preventScroll: true });
    // konstruktor, Loaded
    rt.call(() => fns.ctor(), rt.winProxy, {}, 'MainWindow()');
    nodes.forEach(n => {
      if (rt.has(n, 'Loaded')) rt.fire(n, 'Loaded', {});
    });
    rt.fire(M.win, 'Loaded', {});
    rt.fire(M.win, 'ContentRendered', {});
    const first = rt.host.querySelector('.client input, .client textarea');
    if (first && !rt.has(M.win, 'KeyDown')) first.focus();
    status(
      L(
        'Debugowanie: symulacja działa. Shift+F5 zatrzymuje.',
        'Debugging: the simulation is running. Shift+F5 stops it.',
      ),
    );
  };
  rt.close = user => {
    if (rt.closed) return;
    if (rt.dbg && rt.dbg.paused) dbgResume(rt, true);
    if (user && rt.has(M.win, 'Closing')) {
      const e = { Cancel: false };
      rt.fire(M.win, 'Closing', e);
      if (e.Cancel) {
        rt.log(L('Zamykanie anulowane (e.Cancel = true).', 'Closing cancelled (e.Cancel = true).'));
        return;
      }
    }
    if (rt.has(M.win, 'Closed')) rt.fire(M.win, 'Closed', {});
    rt.closed = true;
    rt.timers.forEach(t => t.Stop());
    rt.pending.forEach(h => clearTimeout(h));
    removeEventListener('keydown', rt.kd, true);
    removeEventListener('keyup', rt.ku, true);
    removeEventListener('resize', rt.onResize);
    const RL = $('#runLayer');
    RL.hidden = true;
    RL.innerHTML = '';
    out(
      L(
        `Program '[symulacja] ${P.name}.exe' zakończył działanie z kodem 0 (0x0).`,
        `The program '[simulation] ${P.name}.exe' has exited with code 0 (0x0).`,
      ),
    );
    RUN = null;
    status(L('Gotowe', 'Ready'));
  };
  return rt;
}
let makeScopeCache = null;
