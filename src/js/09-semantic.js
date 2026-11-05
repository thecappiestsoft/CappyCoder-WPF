/**
 * CappyCoder WPF — 09 · Analiza semantyczna C#
 *
 * Zadanie: Lekser, parser (Pratt) i kontrola typów zgodna ze specyfikacją C#: konwersje liczbowe, przeciążenia,
 *   przypisanie określone, składowe tylko do odczytu, kody CS0029, CS0266, CS1061, CS1503, …
 *   Zawiera też instrument() — przygotowanie kodu do debugowania.
 * Zależy od: csharp.js, 07, 08
 * Udostępnia: SEM (check, instrument, conv, …)
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const SEM = (() => {
  /* ---------- typy wbudowane i konwersje ---------- */
  const ALIAS = {
    Int32: 'int',
    Int64: 'long',
    Int16: 'short',
    Byte: 'byte',
    SByte: 'sbyte',
    UInt32: 'uint',
    UInt64: 'ulong',
    UInt16: 'ushort',
    Single: 'float',
    Double: 'double',
    Decimal: 'decimal',
    Char: 'char',
    Boolean: 'bool',
    String: 'string',
    Object: 'object',
    IntPtr: 'nint',
    UIntPtr: 'nuint',
  };
  const NUMS = [
    'sbyte',
    'byte',
    'short',
    'ushort',
    'int',
    'uint',
    'long',
    'ulong',
    'nint',
    'nuint',
    'float',
    'double',
    'decimal',
  ];
  const NUM = new Set([...NUMS, 'char']);
  const INTEGRAL = new Set([
    'sbyte',
    'byte',
    'short',
    'ushort',
    'int',
    'uint',
    'long',
    'ulong',
    'nint',
    'nuint',
    'char',
  ]);
  const IMPL = {
    sbyte: ['short', 'int', 'long', 'float', 'double', 'decimal', 'nint'],
    byte: ['short', 'ushort', 'int', 'uint', 'long', 'ulong', 'float', 'double', 'decimal', 'nint', 'nuint'],
    short: ['int', 'long', 'float', 'double', 'decimal', 'nint'],
    ushort: ['int', 'uint', 'long', 'ulong', 'float', 'double', 'decimal', 'nint', 'nuint'],
    int: ['long', 'float', 'double', 'decimal', 'nint'],
    uint: ['long', 'ulong', 'float', 'double', 'decimal', 'nuint'],
    long: ['float', 'double', 'decimal'],
    ulong: ['float', 'double', 'decimal'],
    float: ['double'],
    nint: ['long', 'float', 'double', 'decimal'],
    nuint: ['ulong', 'float', 'double', 'decimal'],
    char: ['ushort', 'int', 'uint', 'long', 'ulong', 'float', 'double', 'decimal'],
    double: [],
    decimal: [],
  };
  const RANGE = {
    sbyte: [-128, 127],
    byte: [0, 255],
    short: [-32768, 32767],
    ushort: [0, 65535],
    uint: [0, 4294967295],
    ulong: [0, Infinity],
    nint: [-2147483648, 2147483647],
    nuint: [0, 4294967295],
    int: [-2147483648, 2147483647],
    long: [-9223372036854775808, 9223372036854775807],
  };
  const PRIM_KW = new Set([
    'int',
    'long',
    'short',
    'byte',
    'sbyte',
    'uint',
    'ulong',
    'ushort',
    'float',
    'double',
    'decimal',
    'char',
    'bool',
    'string',
    'object',
    'void',
    'nint',
    'nuint',
    'dynamic',
  ]);
  const VALUE_TYPES = new Set([
    ...NUM,
    'bool',
    'DateTime',
    'TimeSpan',
    'Thickness',
    'Point',
    'Size',
    'Color',
    'CornerRadius',
    'KeyValuePair',
    'Rect',
    'Vector',
    'Duration',
    'GridLength',
    'FontWeight',
    'FontStyle',
    'Guid',
  ]);
  const EXC = [
    'FormatException',
    'DivideByZeroException',
    'ArgumentException',
    'ArgumentNullException',
    'ArgumentOutOfRangeException',
    'InvalidOperationException',
    'NullReferenceException',
    'IndexOutOfRangeException',
    'OverflowException',
    'NotImplementedException',
    'NotSupportedException',
    'KeyNotFoundException',
    'IOException',
    'FileNotFoundException',
    'InvalidCastException',
    'StackOverflowException',
    'OperationCanceledException',
    'TimeoutException',
    'UnauthorizedAccessException',
    'SystemException',
    'ApplicationException',
  ];
  const BASE_EXTRA = { MainWindow: 'Window' };
  EXC.forEach(e => (BASE_EXTRA[e] = 'Exception'));
  const DELEGATE = {
    RoutedEventArgs: 'RoutedEventHandler',
    MouseButtonEventArgs: 'MouseButtonEventHandler',
    MouseEventArgs: 'MouseEventHandler',
    MouseWheelEventArgs: 'MouseWheelEventHandler',
    KeyEventArgs: 'KeyEventHandler',
    TextChangedEventArgs: 'TextChangedEventHandler',
    TextCompositionEventArgs: 'TextCompositionEventHandler',
    SelectionChangedEventArgs: 'SelectionChangedEventHandler',
    EventArgs: 'EventHandler',
    'RoutedPropertyChangedEventArgs<double>': 'RoutedPropertyChangedEventHandler<double>',
    'RoutedPropertyChangedEventArgs<object>': 'RoutedPropertyChangedEventHandler<object>',
    CancelEventArgs: 'CancelEventHandler',
    'System.ComponentModel.CancelEventArgs': 'CancelEventHandler',
    SizeChangedEventArgs: 'SizeChangedEventHandler',
  };
  /* pełne listy składowych typów zamkniętych — nieznana nazwa to na pewno błąd CS1061/CS0117 */
  const LINQN =
    'Aggregate AggregateBy All Any Append AsEnumerable Average Cast Chunk Concat Contains Count CountBy DefaultIfEmpty Distinct DistinctBy ElementAt ElementAtOrDefault Except ExceptBy First FirstOrDefault GroupBy GroupJoin Index Intersect IntersectBy Join Last LastOrDefault LongCount Max MaxBy Min MinBy OfType Order OrderBy OrderByDescending OrderDescending Prepend Reverse Select SelectMany SequenceEqual Single SingleOrDefault Skip SkipLast SkipWhile Sum Take TakeLast TakeWhile ThenBy ToArray ToDictionary ToHashSet ToList ToLookup TryGetNonEnumeratedCount Union UnionBy Where Zip AsParallel AsQueryable';
  const OBJN = 'Equals GetHashCode GetType ToString';
  const CLOSED = {
    object: OBJN,
    string:
      OBJN +
      ' Length Chars Clone CompareTo Contains CopyTo EndsWith EnumerateRunes GetEnumerator GetPinnableReference GetTypeCode IndexOf IndexOfAny Insert IsNormalized LastIndexOf LastIndexOfAny Normalize PadLeft PadRight Remove Replace ReplaceLineEndings Split StartsWith Substring ToCharArray ToLower ToLowerInvariant ToUpper ToUpperInvariant Trim TrimEnd TrimStart TryCopyTo ' +
      LINQN,
    int: OBJN + ' CompareTo GetTypeCode TryFormat',
    double: OBJN + ' CompareTo GetTypeCode TryFormat',
    bool: OBJN + ' CompareTo GetTypeCode TryFormat',
    char: OBJN + ' CompareTo GetTypeCode TryFormat',
    long: OBJN + ' CompareTo GetTypeCode TryFormat',
    decimal: OBJN + ' CompareTo GetTypeCode TryFormat',
    float: OBJN + ' CompareTo GetTypeCode TryFormat',
    List:
      OBJN +
      ' Add AddRange AsReadOnly BinarySearch Capacity Clear Contains ConvertAll CopyTo Count EnsureCapacity Exists Find FindAll FindIndex FindLast FindLastIndex ForEach GetEnumerator GetRange IndexOf Insert InsertRange LastIndexOf Remove RemoveAll RemoveAt RemoveRange Reverse Slice Sort ToArray TrimExcess TrueForAll ' +
      LINQN,
    Array:
      OBJN +
      ' Length LongLength Rank Clone CopyTo GetLength GetLongLength GetLowerBound GetUpperBound GetValue SetValue Initialize IsFixedSize IsReadOnly IsSynchronized SyncRoot GetEnumerator ' +
      LINQN,
    Dictionary:
      OBJN +
      ' Add Clear Comparer ContainsKey ContainsValue Count EnsureCapacity GetEnumerator GetObjectData Keys OnDeserialization Remove TrimExcess TryAdd TryGetValue Values GetAlternateLookup Capacity ' +
      LINQN,
  };
  const CLOSED_STATIC = {
    Math: 'Abs Acos Acosh Asin Asinh Atan Atan2 Atanh BigMul BitDecrement BitIncrement Cbrt Ceiling Clamp CopySign Cos Cosh DivRem E Exp Floor FusedMultiplyAdd IEEERemainder ILogB Log Log10 Log2 Max MaxMagnitude Min MinMagnitude PI ReciprocalEstimate ReciprocalSqrtEstimate Round ScaleB Sign Sin SinCos Sinh Sqrt Tan Tanh Tau Truncate Equals ReferenceEquals',
    MessageBox: 'Show Equals ReferenceEquals',
    Convert:
      'ChangeType DBNull FromBase64CharArray FromBase64String FromHexString GetTypeCode IsDBNull ToBase64CharArray ToBase64String ToBoolean ToByte ToChar ToDateTime ToDecimal ToDouble ToHexString ToHexStringLower ToInt16 ToInt32 ToInt64 ToSByte ToSingle ToString ToUInt16 ToUInt32 ToUInt64 TryFromBase64Chars TryFromBase64String TryToBase64Chars TryToHexString TryToHexStringLower Equals ReferenceEquals',
  };
  const NOT_MEMBER = { RichTextBox: ['Text'] };
  const RO = new Set([
    'string.Length',
    'List.Count',
    'Array.Length',
    'Dictionary.Count',
    'Dictionary.Keys',
    'Dictionary.Values',
    'ItemCollection.Count',
    'UIElementCollection.Count',
    'FrameworkElement.ActualWidth',
    'FrameworkElement.ActualHeight',
    'FrameworkElement.IsMouseOver',
    'FrameworkElement.IsFocused',
    'FrameworkElement.Parent',
    'UIElement.IsVisible',
    '*.Items',
    '*.Children',
    'TreeView.SelectedItem',
    'ListBox.SelectedItems',
    'DataGrid.SelectedItems',
    'TextBox.LineCount',
    'Exception.Message',
    'Exception.StackTrace',
    'Exception.InnerException',
    'KeyValuePair.Key',
    'KeyValuePair.Value',
    'Stopwatch.Elapsed',
    'Stopwatch.ElapsedMilliseconds',
    'Stopwatch.IsRunning',
    'KeyEventArgs.Key',
    'MouseButtonEventArgs.ClickCount',
    'MouseButtonEventArgs.ChangedButton',
    'MouseWheelEventArgs.Delta',
    'TextCompositionEventArgs.Text',
    'SelectionChangedEventArgs.AddedItems',
    'SelectionChangedEventArgs.RemovedItems',
    'RoutedPropertyChangedEventArgs.OldValue',
    'RoutedPropertyChangedEventArgs.NewValue',
    'Math.PI',
    'Math.E',
    'Math.Tau',
    'string.Empty',
    'int.MaxValue',
    'int.MinValue',
    'double.MaxValue',
    'double.MinValue',
    'double.NaN',
    'Environment.NewLine',
  ]);
  /* przeciążenia sprawdzane dokładnie (pełne listy wg dokumentacji .NET 10) */
  const NUMOV = (list, n, ret) =>
    list.map(t => ({
      params: Array(n)
        .fill(t)
        .map((x, i) => `${x} ${'abc'[i]}`)
        .join(', '),
      type: ret || t,
    }));
  const ABS_T = ['sbyte', 'short', 'int', 'long', 'float', 'double', 'decimal', 'nint'];
  const MAX_T = [
    'byte',
    'sbyte',
    'short',
    'ushort',
    'int',
    'uint',
    'long',
    'ulong',
    'float',
    'double',
    'decimal',
    'nint',
    'nuint',
  ];
  const MB =
    'string messageBoxText|string messageBoxText, string caption|Window owner, string messageBoxText|string messageBoxText, string caption, MessageBoxButton button|Window owner, string messageBoxText, string caption|string messageBoxText, string caption, MessageBoxButton button, MessageBoxImage icon|Window owner, string messageBoxText, string caption, MessageBoxButton button|string messageBoxText, string caption, MessageBoxButton button, MessageBoxImage icon, MessageBoxResult defaultResult|Window owner, string messageBoxText, string caption, MessageBoxButton button, MessageBoxImage icon|string messageBoxText, string caption, MessageBoxButton button, MessageBoxImage icon, MessageBoxResult defaultResult, MessageBoxOptions options|Window owner, string messageBoxText, string caption, MessageBoxButton button, MessageBoxImage icon, MessageBoxResult defaultResult|Window owner, string messageBoxText, string caption, MessageBoxButton button, MessageBoxImage icon, MessageBoxResult defaultResult, MessageBoxOptions options';
  const parseOv = (s, ret) => s.split('|').map(p => ({ params: p, type: ret }));
  const OVL = {
    'MessageBox.Show': parseOv(MB, 'MessageBoxResult'),
    'Math.Abs': NUMOV(ABS_T, 1),
    'Math.Max': NUMOV(MAX_T, 2),
    'Math.Min': NUMOV(MAX_T, 2),
    'Math.Clamp': NUMOV(MAX_T, 3),
    'Math.Sign': NUMOV(ABS_T, 1, 'int'),
    'Math.Round': parseOv(
      'double a|double a, int digits|double a, MidpointRounding mode|double a, int digits, MidpointRounding mode',
      'double',
    ).concat(
      parseOv(
        'decimal d|decimal d, int decimals|decimal d, MidpointRounding mode|decimal d, int decimals, MidpointRounding mode',
        'decimal',
      ),
    ),
    'Math.Floor': [
      { params: 'double d', type: 'double' },
      { params: 'decimal d', type: 'decimal' },
    ],
    'Math.Ceiling': [
      { params: 'double a', type: 'double' },
      { params: 'decimal d', type: 'decimal' },
    ],
    'Math.Truncate': [
      { params: 'double d', type: 'double' },
      { params: 'decimal d', type: 'decimal' },
    ],
    'Math.Pow': [{ params: 'double x, double y', type: 'double' }],
    'Math.Sqrt': [{ params: 'double d', type: 'double' }],
    'Math.Sin': [{ params: 'double a', type: 'double' }],
    'Math.Cos': [{ params: 'double d', type: 'double' }],
    'Math.Tan': [{ params: 'double a', type: 'double' }],
    'Math.Atan2': [{ params: 'double y, double x', type: 'double' }],
    'Math.Log10': [{ params: 'double d', type: 'double' }],
    'Math.Exp': [{ params: 'double d', type: 'double' }],
    'Math.Log': [
      { params: 'double d', type: 'double' },
      { params: 'double a, double newBase', type: 'double' },
    ],
    'int.Parse': parseOv(
      'string s|string s, IFormatProvider provider|string s, NumberStyles style|string s, NumberStyles style, IFormatProvider provider',
      'int',
    ),
    'int.TryParse': parseOv(
      'string s, out int result|string s, IFormatProvider provider, out int result|string s, NumberStyles style, IFormatProvider provider, out int result',
      'bool',
    ),
    'double.Parse': parseOv(
      'string s|string s, IFormatProvider provider|string s, NumberStyles style|string s, NumberStyles style, IFormatProvider provider',
      'double',
    ),
    'double.TryParse': parseOv(
      'string s, out double result|string s, IFormatProvider provider, out double result|string s, NumberStyles style, IFormatProvider provider, out double result',
      'bool',
    ),
    'decimal.Parse': parseOv('string s|string s, IFormatProvider provider', 'decimal'),
    'decimal.TryParse': parseOv(
      'string s, out decimal result|string s, IFormatProvider provider, out decimal result',
      'bool',
    ),
    'long.Parse': parseOv('string s|string s, IFormatProvider provider', 'long'),
    'long.TryParse': parseOv('string s, out long result|string s, IFormatProvider provider, out long result', 'bool'),
    'bool.Parse': parseOv('string value', 'bool'),
    'bool.TryParse': parseOv('string value, out bool result', 'bool'),
    'string.IsNullOrEmpty': parseOv('string value', 'bool'),
    'string.IsNullOrWhiteSpace': parseOv('string value', 'bool'),
    'Random.Next': parseOv('|int maxValue|int minValue, int maxValue', 'int'),
    'Random.NextDouble': parseOv('', 'double'),
    'List.Add': parseOv('T item', 'void'),
    'List.Insert': parseOv('int index, T item', 'void'),
    'List.RemoveAt': parseOv('int index', 'void'),
    'List.Remove': parseOv('T item', 'bool'),
    'List.Contains': parseOv('T item', 'bool'),
    'List.Clear': parseOv('', 'void'),
    'List.IndexOf': parseOv('T item|T item, int index|T item, int index, int count', 'int'),
    'Dictionary.Add': parseOv('K key, V value', 'void'),
    'Dictionary.ContainsKey': parseOv('K key', 'bool'),
    'Dictionary.Remove': parseOv('K key', 'bool'),
    'ItemCollection.Add': parseOv('object newItem', 'int'),
    'ItemCollection.Insert': parseOv('int insertIndex, object insertItem', 'void'),
    'ItemCollection.RemoveAt': parseOv('int removeIndex', 'void'),
    'ItemCollection.Clear': parseOv('', 'void'),
    'DateTime.AddDays': parseOv('double value', 'DateTime'),
    'DateTime.AddHours': parseOv('double value', 'DateTime'),
    'DateTime.AddMinutes': parseOv('double value', 'DateTime'),
    'DateTime.AddSeconds': parseOv('double value', 'DateTime'),
    'DateTime.AddMonths': parseOv('int months', 'DateTime'),
    'DateTime.AddYears': parseOv('int value', 'DateTime'),
    'Canvas.SetLeft': parseOv('UIElement element, double length', 'void'),
    'Canvas.SetTop': parseOv('UIElement element, double length', 'void'),
    'Canvas.GetLeft': parseOv('UIElement element', 'double'),
    'Canvas.GetTop': parseOv('UIElement element', 'double'),
    'TextBox.AppendText': parseOv('string textData', 'void'),
    'TextBox.Clear': parseOv('', 'void'),
    'TextBox.SelectAll': parseOv('', 'void'),
    'char.IsDigit': parseOv('char c|string s, int index', 'bool'),
    'char.IsLetter': parseOv('char c|string s, int index', 'bool'),
    'char.IsLetterOrDigit': parseOv('char c|string s, int index', 'bool'),
    'char.IsUpper': parseOv('char c|string s, int index', 'bool'),
    'char.IsLower': parseOv('char c|string s, int index', 'bool'),
    'char.IsWhiteSpace': parseOv('char c|string s, int index', 'bool'),
    'Stack.Push': parseOv('T item', 'void'),
    'Queue.Enqueue': parseOv('T item', 'void'),
    'HashSet.Add': parseOv('T item', 'bool'),
    'FrameworkElement.Focus': parseOv('', 'bool'),
    'UIElement.Focus': parseOv('', 'bool'),
  };
  const CTORS = {
    Random: parseOv('|int Seed', ''),
    DispatcherTimer: null,
    Thickness: parseOv('double uniformLength|double left, double top, double right, double bottom', ''),
    Point: parseOv('|double x, double y', ''),
    SolidColorBrush: parseOv('|Color color', ''),
    DateTime: parseOv(
      '|long ticks|int year, int month, int day|int year, int month, int day, int hour, int minute, int second|int year, int month, int day, int hour, int minute, int second, int millisecond',
      '',
    ),
    TimeSpan: parseOv(
      '|long ticks|int hours, int minutes, int seconds|int days, int hours, int minutes, int seconds|int days, int hours, int minutes, int seconds, int milliseconds',
      '',
    ),
  };

  let USERT = {};
  const norm = t => {
    if (t == null) return null;
    t = String(t)
      .trim()
      .replace(/^global::/, '')
      .replace(/^System\.(?=[A-Z])/, '');
    if (ALIAS[t]) return ALIAS[t];
    const m = /^(\w+)\?$/.exec(t);
    if (m && ALIAS[m[1]]) return ALIAS[m[1]] + '?';
    return t.replace(/\s+/g, ' ').replace(/\s*([<>,\[\]])\s*/g, (a, c) => (c === ',' ? ', ' : c));
  };
  const P2 = t => IS.ptype2(t);
  const isNullable = t => /\?$/.test(t);
  const under = t => t.replace(/\?$/, '');
  function isEnum(t) {
    t = under(t);
    if (USERT[t]) return USERT[t].kind === 'enum';
    const x = IS.T[t];
    return (
      !!(x && x.isEnum && !['Brushes', 'Colors', 'Key'].includes(t)) ||
      t === 'Key' ||
      [
        'DayOfWeek',
        'MessageBoxResult',
        'MessageBoxButton',
        'MessageBoxImage',
        'Visibility',
        'HorizontalAlignment',
        'VerticalAlignment',
        'Orientation',
        'TextWrapping',
        'TextAlignment',
        'Stretch',
        'WindowState',
        'ResizeMode',
        'MouseButton',
        'MouseButtonState',
        'ModifierKeys',
        'StringSplitOptions',
        'MidpointRounding',
        'Dock',
        'SelectionMode',
        'ScrollBarVisibility',
        'TextTrimming',
        'WindowStyle',
      ].includes(t)
    );
  }
  function isKnown(t) {
    if (!t) return false;
    t = under(norm(t));
    if (PRIM_KW.has(t) || t === 'null') return true;
    const p = P2(t);
    if (!p) return false;
    if (p.base === 'Array') return isKnown(p.args[0]);
    if (/^I[A-Z]/.test(p.base)) return false;
    if (p.args.length && p.args.some(a => /^[A-Z]$|^T[A-Z]\w*$/.test(a) || !isKnown(a))) return false;
    return !!(
      USERT[p.base] ||
      IS.T[p.base] ||
      TY[p.base] ||
      BASE_EXTRA[p.base] ||
      VALUE_TYPES.has(p.base) ||
      isEnum(p.base)
    );
  }
  function isValue(t) {
    t = norm(t);
    if (isNullable(t)) return false;
    const p = P2(t);
    if (!p) return false;
    if (USERT[p.base]) return USERT[p.base].kind === 'struct' || USERT[p.base].kind === 'enum';
    return VALUE_TYPES.has(p.base) || isEnum(p.base);
  }
  function baseOf(t) {
    const p = P2(t);
    if (!p) return null;
    const b = p.base;
    if (USERT[b])
      return USERT[b].base
        ? norm(USERT[b].base)
        : USERT[b].kind === 'struct' || USERT[b].kind === 'enum'
          ? 'ValueType'
          : 'object';
    if (BASE_EXTRA[b]) return BASE_EXTRA[b];
    const x = IS.T[b];
    if (x && x.base) return x.base;
    if (b === 'object') return null;
    return 'object';
  }
  function isSub(a, b) {
    let t = a,
      g = 0;
    const tb = P2(b) && P2(b).base;
    while (t && g++ < 12) {
      if (P2(t) && P2(t).base === tb && norm(t) === norm(b)) return true;
      if (P2(t) && P2(t).base === tb && !P2(b).args.length) return true;
      t = baseOf(t);
    }
    return false;
  }
  function constVal(node) {
    if (!node) return null;
    if (node.k === 'lit' && node.cv !== undefined) return node.cv;
    if (node.k === 'un' && node.op === '-' && node.x.k === 'lit' && typeof node.x.cv === 'number') return -node.x.cv;
    if (node.k === 'paren') return constVal(node.x);
    return null;
  }
  function conv(from, to, node) {
    if (!from || !to) return '?';
    from = norm(from);
    to = norm(to);
    if (from === to) return 'id';
    if (from === 'dynamic' || to === 'dynamic' || from === 'default' || from === 'throw') return 'imp';
    if (to === 'object') return from === 'void' ? 'none' : 'imp';
    if (from === 'void') return 'none';
    if (from === 'null') {
      if (!isKnown(to)) return '?';
      return isNullable(to) || !isValue(to) ? 'imp' : 'none';
    }
    {
      const pt = P2(to);
      if (
        pt &&
        /^(IEnumerable|IReadOnlyList|IReadOnlyCollection|IList|ICollection)$/.test(pt.base) &&
        pt.args.length === 1 &&
        isKnown(from) &&
        isKnown(pt.args[0])
      ) {
        const pf = P2(from);
        const el = IS.elemType(pf);
        const X = norm(pt.args[0]);
        if (el && isKnown(el)) {
          if (norm(el) === X)
            return /^(IEnumerable|IReadOnly)/.test(pt.base) ||
              ['List', 'Array', 'ObservableCollection', 'Collection'].includes(pf.base)
              ? 'imp'
              : '?';
          if (/^(IEnumerable|IReadOnly)/.test(pt.base) && !isValue(el) && (X === 'object' || isSub(el, X)))
            return 'imp';
          return 'none';
        }
      }
    }
    if (!isKnown(from) || !isKnown(to)) return '?';
    if (isNullable(to)) {
      const c = isNullable(from) ? conv(under(from), under(to), node) : conv(from, under(to), node);
      return c === 'id' || c === 'imp' ? 'imp' : c;
    }
    if (isNullable(from)) {
      const c = conv(under(from), to, node);
      return c === 'id' || c === 'imp' || c === 'exp' ? 'exp' : c;
    }
    if (NUM.has(from) && NUM.has(to)) {
      if (IMPL[from].includes(to)) return 'imp';
      const cv = constVal(node);
      if (
        from === 'int' &&
        typeof cv === 'number' &&
        RANGE[to] &&
        to !== 'char' &&
        cv >= RANGE[to][0] &&
        cv <= RANGE[to][1]
      )
        return 'imp';
      if (from === 'long' && to === 'ulong' && typeof cv === 'number' && cv >= 0) return 'imp';
      return 'exp';
    }
    if (isEnum(to) && NUM.has(from)) return constVal(node) === 0 && INTEGRAL.has(from) ? 'imp' : 'exp';
    if (isEnum(from) && (NUM.has(to) || isEnum(to))) return 'exp';
    if (from === 'object') return 'exp';
    if (isSub(from, to)) return 'imp';
    if (isSub(to, from)) return 'exp';
    return 'none';
  }
  const disp = t => (t === 'null' ? '<null>' : t === 'default' ? 'default' : t);

  /* ---------- lekser ---------- */
  const OPS = [
    '??=',
    '<<=',
    '=>',
    '==',
    '!=',
    '<=',
    '>=',
    '&&',
    '||',
    '++',
    '--',
    '+=',
    '-=',
    '*=',
    '/=',
    '%=',
    '&=',
    '|=',
    '^=',
    '??',
    '?.',
    '<<',
    '::',
    '->',
    '..',
  ];
  const KWS = new Set(
    'abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while'.split(
      ' ',
    ),
  );
  function lex(code, strs) {
    const toks = [];
    let i = 0,
      line = 1,
      ls = 0;
    const n = code.length;
    const numRe =
      /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?|\.\d[\d_]*(?:[eE][+-]?\d+)?)(?:[uU][lL]?|[lL][uU]?|[fFdDmM])?/;
    while (i < n) {
      const c = code[i];
      if (c === '\n') {
        line++;
        i++;
        ls = i;
        continue;
      }
      if (c === ' ' || c === '\t' || c === '\r') {
        i++;
        continue;
      }
      const col = i - ls + 1;
      if (c === '\u0001') {
        const j = code.indexOf('\u0002', i);
        const idx = +code.slice(i + 1, j);
        const st = strs[idx];
        toks.push({ k: 'str', v: st, pos: i, end: j + 1, line, col, len: Math.max(2, (st.raw || '').length + 2) });
        i = j + 1;
        continue;
      }
      if (/[A-Za-z_@]/.test(c)) {
        let j = i + 1;
        while (j < n && /\w/.test(code[j])) j++;
        let v = code.slice(i, j);
        const verb = v[0] === '@';
        if (verb) v = v.slice(1);
        toks.push({ k: !verb && KWS.has(v) ? 'kw' : 'id', v, pos: i, end: j, line, col, len: j - i });
        i = j;
        continue;
      }
      if (/\d/.test(c) || (c === '.' && /\d/.test(code[i + 1] || ''))) {
        const m = numRe.exec(code.slice(i, i + 80));
        const raw = m[0];
        toks.push({ k: 'num', v: raw, pos: i, end: i + raw.length, line, col, len: raw.length });
        i += raw.length;
        continue;
      }
      let op = OPS.find(o => code.startsWith(o, i)) || c;
      toks.push({ k: 'op', v: op, pos: i, end: i + op.length, line, col, len: op.length });
      i += op.length;
    }
    toks.push({ k: 'eof', v: '', pos: n, end: n, line, col: 1, len: 0 });
    return toks;
  }
  function numLit(raw) {
    let s = raw.replace(/_/g, '');
    const suf = (/([uU][lL]?|[lL][uU]?|[fFdDmM])$/.exec(s) || [''])[0].toLowerCase();
    if (suf) s = s.slice(0, -suf.length);
    let v;
    if (/^0x/i.test(s)) v = parseInt(s.slice(2), 16);
    else if (/^0b/i.test(s)) v = parseInt(s.slice(2), 2);
    else v = parseFloat(s);
    const real = /[.eE]/.test(s) && !/^0x/i.test(s);
    let t;
    if (suf === 'f') t = 'float';
    else if (suf === 'd') t = 'double';
    else if (suf === 'm') t = 'decimal';
    else if (real) t = 'double';
    else if (suf === 'ul' || suf === 'lu') t = 'ulong';
    else if (suf === 'u') t = v <= 4294967295 ? 'uint' : 'ulong';
    else if (suf === 'l') t = v <= 9223372036854775807 ? 'long' : 'ulong';
    else t = v <= 2147483647 ? 'int' : v <= 4294967295 ? 'uint' : v <= 9223372036854775807 ? 'long' : 'ulong';
    return { t, v, real: real && !suf };
  }

  /* ---------- parser ---------- */
  class PE extends Error {}
  const PREC = {
    '||': 1,
    '&&': 2,
    '|': 3,
    '^': 4,
    '&': 5,
    '==': 6,
    '!=': 6,
    '<': 7,
    '>': 7,
    '<=': 7,
    '>=': 7,
    is: 7,
    as: 7,
    '<<': 8,
    '>>': 8,
    '+': 9,
    '-': 9,
    '*': 10,
    '/': 10,
    '%': 10,
  };
  const ASG = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '??=']);
  function Parser(toks) {
    this.t = toks;
    this.i = 0;
  }
  const PP = Parser.prototype;
  PP.peek = function (o = 0) {
    return this.t[Math.min(this.i + o, this.t.length - 1)];
  };
  PP.next = function () {
    return this.t[Math.min(this.i++, this.t.length - 1)];
  };
  PP.is = function (v, o = 0) {
    const t = this.peek(o);
    return (t.k === 'op' || t.k === 'kw') && t.v === v;
  };
  PP.expect = function (v) {
    if (!this.is(v)) throw new PE('expected ' + v);
    return this.next();
  };
  PP.tryType = function () {
    const s = this.i;
    const r = this.typeName();
    if (r == null) {
      this.i = s;
      return null;
    }
    return r;
  };
  PP.typeName = function () {
    let t = this.peek();
    let name;
    if (t.k === 'kw' && PRIM_KW.has(t.v)) {
      name = t.v;
      this.next();
    } else if (t.k === 'id') {
      name = t.v;
      this.next();
      while (this.is('.') && this.peek(1).k === 'id') {
        this.next();
        name += '.' + this.next().v;
      }
    } else if (this.is('(')) {
      // krotka (int a, string b)
      const s = this.i;
      this.next();
      const parts = [];
      while (true) {
        const ty = this.typeName();
        if (ty == null) {
          this.i = s;
          return null;
        }
        parts.push(ty);
        if (this.peek().k === 'id') this.next();
        if (this.is(',')) {
          this.next();
          continue;
        }
        break;
      }
      if (!this.is(')') || parts.length < 2) {
        this.i = s;
        return null;
      }
      this.next();
      name = '(' + parts.join(', ') + ')';
    } else return null;
    if (this.is('<')) {
      const s = this.i;
      this.next();
      const args = [];
      while (true) {
        const a = this.typeName();
        if (a == null) {
          this.i = s;
          return name;
        }
        args.push(a);
        if (this.is(',')) {
          this.next();
          continue;
        }
        break;
      }
      if (!this.is('>')) {
        this.i = s;
        return name;
      }
      this.next();
      name += '<' + args.join(', ') + '>';
    }
    if (this.is('?') && !(this.peek(1).k === 'op' && ['.', '['].includes(this.peek(1).v))) {
      const nx = this.peek(1);
      if (nx.k === 'id' || (nx.k === 'op' && ['>', ',', ')', '[', ']'].includes(nx.v))) {
        this.next();
        name += '?';
      }
    }
    while (this.is('[') && (this.is(']', 1) || this.is(',', 1))) {
      this.next();
      while (this.is(',')) this.next();
      this.expect(']');
      name += '[]';
    }
    return name;
  };
  PP.expr = function () {
    return this.assign();
  };
  PP.lambdaAhead = function () {
    let o = 0;
    if (this.peek().k === 'id' && this.peek().v === 'async') o = 1;
    const t = this.peek(o);
    if (t.k === 'id' && this.is('=>', o + 1)) return true;
    if (this.is('(', o)) {
      let d = 0,
        j = o;
      while (true) {
        const x = this.peek(j);
        if (x.k === 'eof') return false;
        if (x.k === 'op' && x.v === '(') d++;
        else if (x.k === 'op' && x.v === ')') {
          d--;
          if (!d) break;
        }
        j++;
      }
      return this.is('=>', j + 1);
    }
    return false;
  };
  PP.lambda = function () {
    const tok = this.peek();
    if (this.peek().v === 'async' && this.peek().k === 'id') this.next();
    const params = [];
    if (this.peek().k === 'id') params.push({ name: this.next().v, type: null });
    else {
      this.expect('(');
      while (!this.is(')')) {
        const s = this.i;
        let ty = this.tryType();
        let nm;
        if (ty != null && this.peek().k === 'id') nm = this.next().v;
        else {
          this.i = s;
          ty = null;
          nm = this.next().v;
        }
        params.push({ name: nm, type: ty });
        if (this.is(',')) this.next();
      }
      this.expect(')');
    }
    this.expect('=>');
    const body = this.is('{') ? this.block() : this.expr();
    return { k: 'lambda', params, body, tok };
  };
  PP.assign = function () {
    if (this.lambdaAhead()) return this.lambda();
    const left = this.cond();
    const t = this.peek();
    if (t.k === 'op' && ASG.has(t.v)) {
      this.next();
      const right = this.assign();
      return { k: 'asg', op: t.v, a: left, b: right, tok: t };
    }
    if (t.k === 'op' && t.v === '>' && this.is('>=', 1) && this.peek(1).pos === t.end) {
      this.next();
      this.next();
      const right = this.assign();
      return { k: 'asg', op: '>>=', a: left, b: right, tok: t };
    }
    return left;
  };
  PP.cond = function () {
    const c = this.coalesce();
    if (this.is('?')) {
      const tok = this.next();
      const a = this.assign();
      this.expect(':');
      const b = this.assign();
      return { k: 'cond', c, a, b, tok };
    }
    return c;
  };
  PP.coalesce = function () {
    const a = this.bin(1);
    if (this.is('??')) {
      const tok = this.next();
      const b = this.coalesce();
      return { k: 'bin', op: '??', a, b, tok };
    }
    return a;
  };
  PP.bin = function (min) {
    let left = this.unary();
    while (true) {
      const t = this.peek();
      let op = t.k === 'op' || t.k === 'kw' ? t.v : null;
      if (op === '>' && this.is('>', 1) && this.peek(1).pos === t.end && !this.is('=', 2)) op = '>>';
      const p = PREC[op];
      if (!p || p < min) break;
      if (op === '>>') {
        this.next();
        this.next();
      } else this.next();
      if (op === 'is') {
        let neg = false;
        if (this.peek().k === 'id' && this.peek().v === 'not') {
          this.next();
          neg = true;
        }
        if (this.is('null')) {
          this.next();
          left = { k: 'is', x: left, type: null, isNull: true, tok: t };
          continue;
        }
        const s = this.i;
        const ty = this.tryType();
        let name = null;
        if (ty != null && this.peek().k === 'id' && !['and', 'or'].includes(this.peek().v)) name = this.next().v;
        if (ty == null) {
          this.i = s;
          const c = this.bin(8);
          left = { k: 'is', x: left, type: null, pat: c, tok: t };
          continue;
        }
        left = { k: 'is', x: left, type: ty, name, tok: t, neg };
        continue;
      }
      if (op === 'as') {
        const ty = this.typeName();
        left = { k: 'as', x: left, type: ty, tok: t };
        continue;
      }
      const right = this.bin(p + 1);
      left = { k: 'bin', op, a: left, b: right, tok: t };
    }
    return left;
  };
  PP.castAhead = function () {
    const s = this.i;
    this.next();
    const ty = this.tryType();
    if (ty == null || !this.is(')')) {
      this.i = s;
      return null;
    }
    this.next();
    const nx = this.peek();
    const prim = PRIM_KW.has(ty.replace(/[?\[\]]/g, ''));
    const startsOperand =
      nx.k === 'id' ||
      nx.k === 'num' ||
      nx.k === 'str' ||
      (nx.k === 'kw' &&
        ['this', 'new', 'typeof', 'default', 'true', 'false', 'null', 'base', 'checked', 'sizeof'].includes(nx.v)) ||
      (nx.k === 'kw' && PRIM_KW.has(nx.v)) ||
      (nx.k === 'op' && ['(', '!', '~'].includes(nx.v));
    const signOk = prim && nx.k === 'op' && ['-', '+'].includes(nx.v);
    if ((startsOperand || signOk) && (prim || /^[A-Z]/.test(ty) || /\./.test(ty))) return ty;
    this.i = s;
    return null;
  };
  PP.unary = function () {
    const t = this.peek();
    if (t.k === 'op' && ['!', '-', '+', '~', '++', '--', '^', '&', '*'].includes(t.v)) {
      this.next();
      const x = this.unary();
      return { k: 'un', op: t.v, x, tok: t };
    }
    if (t.k === 'id' && t.v === 'await') {
      this.next();
      return { k: 'await', x: this.unary(), tok: t };
    }
    if (t.k === 'kw' && t.v === 'throw') {
      this.next();
      this.expr();
      return { k: 'throw', tok: t };
    }
    if (this.is('(')) {
      const ty = this.castAhead();
      if (ty != null) {
        const x = this.unary();
        return { k: 'cast', type: ty, x, tok: t };
      }
    }
    return this.postfix(this.primary());
  };
  PP.args = function (close) {
    const args = [];
    while (!this.is(close)) {
      if (this.peek().k === 'id' && this.is(':', 1)) {
        this.next();
        this.next();
      }
      let mod = null;
      if (this.peek().k === 'kw' && ['out', 'ref', 'in'].includes(this.peek().v)) mod = this.next().v;
      if (mod === 'out') {
        const s = this.i;
        let decl = null;
        if (this.peek().k === 'id' && this.peek().v === 'var' && this.peek(1).k === 'id') {
          this.next();
          decl = { type: 'var', name: this.next() };
        } else if (this.peek().k === 'id' && this.peek().v === '_') {
          this.next();
          decl = { type: 'var', name: null };
        } else {
          const ty = this.tryType();
          if (ty != null && this.peek().k === 'id') decl = { type: ty, name: this.next() };
          else this.i = s;
        }
        if (decl) {
          args.push({ mod, decl, tok: this.peek(-1) });
          if (this.is(',')) this.next();
          continue;
        }
      }
      const e = this.expr();
      args.push({ e, mod, tok: e.tok });
      if (this.is(',')) this.next();
      else break;
    }
    this.expect(close);
    return args;
  };
  PP.initList = function () {
    this.expect('{');
    const items = [];
    while (!this.is('}')) {
      if (this.peek().k === 'id' && this.is('=', 1)) {
        const n = this.next();
        this.next();
        const v = this.is('{') ? { k: 'initlist', items: this.initList() } : this.expr();
        items.push({ kind: 'member', name: n, v });
      } else if (this.is('[')) {
        this.next();
        const key = this.expr();
        this.expect(']');
        this.expect('=');
        items.push({ kind: 'index', key, v: this.expr() });
      } else if (this.is('{')) {
        items.push({ kind: 'nested', items: this.initList() });
      } else items.push({ kind: 'elem', v: this.expr() });
      if (this.is(',')) this.next();
      else break;
    }
    this.expect('}');
    return items;
  };
  PP.newExpr = function (tok) {
    if (this.is('(')) {
      this.next();
      const args = this.args(')');
      let init = null;
      if (this.is('{')) init = this.initList();
      return { k: 'new', type: null, args, init, tok };
    }
    if (this.is('[')) {
      this.next();
      this.expect(']');
      const init = this.initList();
      return { k: 'new', type: null, arr: true, init, tok };
    }
    if (this.is('{')) {
      this.initList();
      return { k: 'new', type: null, anon: true, tok };
    }
    let t = this.peek();
    let name;
    if (t.k === 'kw' && PRIM_KW.has(t.v)) {
      name = t.v;
      this.next();
    } else if (t.k === 'id') {
      name = t.v;
      this.next();
      while (this.is('.') && this.peek(1).k === 'id') {
        this.next();
        name += '.' + this.next().v;
      }
    } else throw new PE('new');
    if (this.is('<')) {
      this.next();
      const a = [];
      while (true) {
        a.push(this.typeName());
        if (this.is(',')) {
          this.next();
          continue;
        }
        break;
      }
      this.expect('>');
      name += '<' + a.join(', ') + '>';
    }
    if (this.is('?')) {
      this.next();
      name += '?';
    }
    if (this.is('[')) {
      this.next();
      const dims = [];
      if (!this.is(']')) {
        while (true) {
          dims.push(this.expr());
          if (this.is(',')) {
            this.next();
            continue;
          }
          break;
        }
      }
      this.expect(']');
      let t2 = name + '[]';
      while (this.is('[')) {
        this.next();
        this.expect(']');
        t2 += '[]';
      }
      let init = null;
      if (this.is('{')) init = this.initList();
      return { k: 'new', type: t2, arr: true, dims, init, tok };
    }
    let args = null;
    if (this.is('(')) {
      this.next();
      args = this.args(')');
    }
    let init = null;
    if (this.is('{')) init = this.initList();
    if (args === null && init === null) throw new PE('new');
    return { k: 'new', type: name, args: args || [], init, tok };
  };
  PP.primary = function () {
    const t = this.next();
    if (t.k === 'num') {
      const n = numLit(t.v);
      return { k: 'lit', t: n.t, cv: n.v, real: n.real, tok: t };
    }
    if (t.k === 'str') {
      const s = t.v;
      if (s.k === 'c') return { k: 'lit', t: 'char', cv: CS.decodeEsc(s.raw), tok: t };
      if (s.k === 'i' || s.k === 'iv') return { k: 'interp', raw: s.raw, tok: t };
      return { k: 'lit', t: 'string', cv: s.raw, tok: t };
    }
    if (t.k === 'kw') {
      switch (t.v) {
        case 'true':
        case 'false':
          return { k: 'lit', t: 'bool', cv: t.v === 'true', tok: t };
        case 'null':
          return { k: 'lit', t: 'null', tok: t };
        case 'this':
          return { k: 'this', tok: t };
        case 'base':
          return { k: 'base', tok: t };
        case 'new':
          return this.newExpr(t);
        case 'typeof':
          this.expect('(');
          this.typeName();
          this.expect(')');
          return { k: 'lit', t: 'Type', tok: t };
        case 'sizeof':
          this.expect('(');
          this.typeName();
          this.expect(')');
          return { k: 'lit', t: 'int', tok: t };
        case 'default':
          if (this.is('(')) {
            this.next();
            const ty = this.typeName();
            this.expect(')');
            return { k: 'lit', t: ty, tok: t, dflt: true };
          }
          return { k: 'lit', t: 'default', tok: t };
        case 'checked':
        case 'unchecked':
          this.expect('(');
          {
            const x = this.expr();
            this.expect(')');
            return { k: 'paren', x, tok: t };
          }
        case 'stackalloc':
          throw new PE('stackalloc');
        case 'delegate':
          throw new PE('delegate');
        default:
          if (PRIM_KW.has(t.v)) return { k: 'name', v: t.v, tok: t, prim: true };
      }
      throw new PE('kw ' + t.v);
    }
    if (t.k === 'id') {
      if (t.v === 'nameof' && this.is('(')) {
        this.next();
        let d = 1;
        while (d) {
          const x = this.next();
          if (x.k === 'eof') throw new PE('eof');
          if (x.v === '(') d++;
          else if (x.v === ')') d--;
        }
        return { k: 'lit', t: 'string', tok: t };
      }
      // wywołanie metody generycznej: Metoda<int>(...)
      if (this.is('<')) {
        const s = this.i;
        this.next();
        const a = [];
        let ok = true;
        while (true) {
          const ty = this.typeName();
          if (ty == null) {
            ok = false;
            break;
          }
          a.push(ty);
          if (this.is(',')) {
            this.next();
            continue;
          }
          break;
        }
        if (ok && this.is('>') && (this.is('(', 1) || this.is('.', 1))) {
          this.next();
          return { k: 'name', v: t.v, targs: a, tok: t };
        }
        this.i = s;
      }
      return { k: 'name', v: t.v, tok: t };
    }
    if (t.k === 'op' && t.v === '(') {
      const x = this.expr();
      if (this.is(',')) {
        while (this.is(',')) {
          this.next();
          this.expr();
        }
        this.expect(')');
        return { k: 'tuple', tok: t };
      }
      this.expect(')');
      return { k: 'paren', x, tok: t };
    }
    if (t.k === 'op' && t.v === '[') {
      if (!this.is(']')) {
        while (true) {
          this.expr();
          if (this.is(',')) {
            this.next();
            continue;
          }
          break;
        }
      }
      this.expect(']');
      return { k: 'collexpr', tok: t };
    }
    throw new PE('unexpected ' + t.v);
  };
  PP.postfix = function (x) {
    while (true) {
      const t = this.peek();
      if (t.k === 'op' && (t.v === '.' || t.v === '?.')) {
        this.next();
        const n = this.next();
        if (n.k !== 'id' && !(n.k === 'kw' && false)) throw new PE('member');
        let targs = null;
        if (this.is('<')) {
          const s = this.i;
          this.next();
          const a = [];
          let ok = true;
          while (true) {
            const ty = this.typeName();
            if (ty == null) {
              ok = false;
              break;
            }
            a.push(ty);
            if (this.is(',')) {
              this.next();
              continue;
            }
            break;
          }
          if (ok && this.is('>') && this.is('(', 1)) {
            this.next();
            targs = a;
          } else this.i = s;
        }
        x = { k: 'mem', o: x, n: n.v, ntok: n, cond: t.v === '?.', targs, tok: n };
        continue;
      }
      if (t.k === 'op' && t.v === '(') {
        this.next();
        const args = this.args(')');
        x = { k: 'call', f: x, args, tok: x.tok || t };
        continue;
      }
      if (t.k === 'op' && t.v === '[') {
        this.next();
        const args = this.args(']');
        x = { k: 'idx', o: x, args, tok: t };
        continue;
      }
      if (t.k === 'op' && (t.v === '++' || t.v === '--')) {
        this.next();
        x = { k: 'un', op: t.v, x, post: true, tok: t };
        continue;
      }
      if (t.k === 'op' && t.v === '!' && (this.is('.', 1) || this.is(')', 1) || this.is(';', 1))) {
        this.next();
        continue;
      }
      if (t.k === 'kw' && t.v === 'switch') throw new PE('switch expr');
      if (t.k === 'id' && t.v === 'with') throw new PE('with');
      break;
    }
    return x;
  };
  /* instrukcje */
  PP.block = function () {
    const tok = this.expect('{');
    const list = [];
    while (!this.is('}')) {
      if (this.peek().k === 'eof') throw new PE('eof');
      list.push(this.safeStmt());
    }
    const end = this.next();
    return { k: 'block', list, tok, end };
  };
  PP.skipStmt = function () {
    let d = 0;
    while (true) {
      const t = this.peek();
      if (t.k === 'eof') return;
      if (t.k === 'op') {
        if ('([{'.includes(t.v)) d++;
        else if (')]}'.includes(t.v)) {
          if (d === 0) return;
          d--;
          if (d === 0 && t.v === '}') {
            this.next();
            if (!this.is(';') && !this.is(')') && !this.is(',')) return;
          }
        } else if (t.v === ';' && d === 0) {
          this.next();
          return;
        }
      }
      this.next();
    }
  };
  PP.safeStmt = function () {
    const s = this.i;
    try {
      const r = this.stmt();
      if (r && typeof r === 'object') r.last = this.t[this.i - 1];
      return r;
    } catch (e) {
      if (!(e instanceof PE)) throw e;
      this.i = s;
      const tok = this.peek();
      this.skipStmt();
      if (this.i === s) this.next();
      return { k: 'bad', tok };
    }
  };
  PP.declAhead = function () {
    const s = this.i;
    let isConst = false;
    if (this.is('const')) {
      this.next();
      isConst = true;
    }
    let ty;
    if (this.peek().k === 'id' && this.peek().v === 'var' && this.peek(1).k === 'id') {
      this.next();
      ty = 'var';
    } else ty = this.tryType();
    if (ty === 'await' || ty === 'yield' || ty === 'nameof') {
      this.i = s;
      return null;
    }
    if (ty != null && this.peek().k === 'id') {
      const nx = this.peek(1);
      if (nx.k === 'op' && ['=', ';', ','].includes(nx.v)) return { ty, isConst };
      if (nx.k === 'op' && nx.v === '(' && !isConst) {
        return { ty, fn: true };
      }
      if (nx.k === 'kw' && nx.v === 'in') return { ty, foreach: true };
    }
    this.i = s;
    return null;
  };
  PP.declarators = function (ty, tok, isConst) {
    const list = [];
    while (true) {
      const n = this.next();
      if (n.k !== 'id') throw new PE('decl');
      let init = null;
      if (this.is('=')) {
        this.next();
        init = this.is('{') ? { k: 'arrinit', items: this.initList(), tok: this.peek() } : this.expr();
      }
      list.push({ name: n.v, tok: n, init });
      if (this.is(',')) {
        this.next();
        continue;
      }
      break;
    }
    return { k: 'decl', type: ty, list, tok, isConst };
  };
  PP.params = function () {
    const ps = [];
    this.expect('(');
    while (!this.is(')')) {
      let mod = null;
      if (this.peek().k === 'kw' && ['out', 'ref', 'in', 'params', 'this'].includes(this.peek().v)) mod = this.next().v;
      const ty = this.typeName();
      const n = this.next();
      let def = null;
      if (this.is('=')) {
        this.next();
        def = this.expr();
      }
      ps.push({ type: ty, name: n.v, tok: n, mod, def });
      if (this.is(',')) this.next();
    }
    this.expect(')');
    return ps;
  };
  PP.stmt = function () {
    const t = this.peek();
    if (t.k === 'op' && t.v === '{') return this.block();
    if (t.k === 'op' && t.v === ';') {
      this.next();
      return { k: 'empty', tok: t };
    }
    if (t.k === 'kw') {
      switch (t.v) {
        case 'if': {
          this.next();
          this.expect('(');
          const c = this.expr();
          this.expect(')');
          const a = this.safeStmt();
          let b = null;
          if (this.is('else')) {
            this.next();
            b = this.safeStmt();
          }
          return { k: 'if', c, a, b, tok: t };
        }
        case 'while': {
          this.next();
          this.expect('(');
          const c = this.expr();
          this.expect(')');
          return { k: 'while', c, body: this.safeStmt(), tok: t };
        }
        case 'do': {
          this.next();
          const body = this.safeStmt();
          this.expect('while');
          this.expect('(');
          const c = this.expr();
          this.expect(')');
          this.expect(';');
          return { k: 'do', c, body, tok: t };
        }
        case 'for': {
          this.next();
          this.expect('(');
          let init = [];
          if (!this.is(';')) {
            const d = this.declAhead();
            if (d) init = [this.declarators(d.ty, this.peek(), d.isConst)];
            else {
              while (true) {
                init.push({ k: 'expr', e: this.expr(), tok: this.peek() });
                if (this.is(',')) {
                  this.next();
                  continue;
                }
                break;
              }
            }
          }
          this.expect(';');
          const c = this.is(';') ? null : this.expr();
          this.expect(';');
          const it = [];
          while (!this.is(')')) {
            it.push(this.expr());
            if (this.is(',')) this.next();
          }
          this.expect(')');
          return { k: 'for', init, c, it, body: this.safeStmt(), tok: t };
        }
        case 'foreach': {
          this.next();
          this.expect('(');
          let ty;
          if (this.peek().k === 'id' && this.peek().v === 'var') {
            this.next();
            ty = 'var';
          } else ty = this.typeName();
          if (this.is('(')) throw new PE('deconstruct');
          const n = this.next();
          this.expect('in');
          const e = this.expr();
          this.expect(')');
          return { k: 'foreach', type: ty, name: n, e, body: this.safeStmt(), tok: t };
        }
        case 'switch': {
          this.next();
          this.expect('(');
          const e = this.expr();
          this.expect(')');
          this.expect('{');
          const secs = [];
          while (!this.is('}')) {
            const labels = [];
            while (this.is('case') || this.is('default')) {
              const lt = this.next();
              if (lt.v === 'default') {
                this.expect(':');
                labels.push({ dflt: true, tok: lt });
                continue;
              }
              let pat = null,
                v = null;
              const s = this.i;
              const ty = this.tryType();
              if (ty != null && this.peek().k === 'id' && this.is(':', 1) === false && !this.is(':')) {
                const nm = this.next();
                pat = { type: ty, name: nm };
              } else {
                this.i = s;
                v = this.cond();
              }
              let when = null;
              if (this.peek().k === 'id' && this.peek().v === 'when') {
                this.next();
                when = this.expr();
              }
              this.expect(':');
              labels.push({ v, pat, when, tok: lt });
            }
            if (!labels.length) throw new PE('switch');
            const body = [];
            while (!this.is('case') && !this.is('default') && !this.is('}')) {
              if (this.peek().k === 'eof') throw new PE('eof');
              body.push(this.safeStmt());
            }
            secs.push({ labels, body });
          }
          this.expect('}');
          return { k: 'switch', e, secs, tok: t };
        }
        case 'try': {
          this.next();
          const b = this.block();
          const cs = [];
          while (this.is('catch')) {
            const ct = this.next();
            let type = null,
              name = null;
            if (this.is('(')) {
              this.next();
              type = this.typeName();
              if (this.peek().k === 'id') name = this.next();
              this.expect(')');
            }
            if (this.peek().k === 'id' && this.peek().v === 'when') {
              this.next();
              this.expect('(');
              this.expr();
              this.expect(')');
            }
            cs.push({ type, name, body: this.block(), tok: ct });
          }
          let fin = null;
          if (this.is('finally')) {
            this.next();
            fin = this.block();
          }
          return { k: 'try', b, cs, fin, tok: t };
        }
        case 'return': {
          this.next();
          const e = this.is(';') ? null : this.expr();
          this.expect(';');
          return { k: 'return', e, tok: t };
        }
        case 'throw': {
          this.next();
          const e = this.is(';') ? null : this.expr();
          this.expect(';');
          return { k: 'throw', e, tok: t };
        }
        case 'break':
          this.next();
          this.expect(';');
          return { k: 'break', tok: t };
        case 'continue':
          this.next();
          this.expect(';');
          return { k: 'continue', tok: t };
        case 'goto':
          throw new PE('goto');
        case 'lock': {
          this.next();
          this.expect('(');
          const e = this.expr();
          this.expect(')');
          return { k: 'lock', e, body: this.safeStmt(), tok: t };
        }
        case 'using': {
          this.next();
          if (this.is('(')) {
            this.next();
            const d = this.declAhead();
            let s1;
            if (d) s1 = this.declarators(d.ty, this.peek(), false);
            else s1 = { k: 'expr', e: this.expr(), tok: t };
            this.expect(')');
            return { k: 'block', list: [s1, this.safeStmt()], tok: t, using: true };
          }
          const d = this.declAhead();
          if (!d) throw new PE('using');
          const s1 = this.declarators(d.ty, t, false);
          this.expect(';');
          return s1;
        }
        case 'checked':
        case 'unchecked':
        case 'unsafe':
          if (this.is('{', 1)) {
            this.next();
            return this.block();
          }
          break;
        case 'static':
        case 'const':
          break;
      }
    }
    if (t.k === 'id' && t.v === 'yield') {
      this.next();
      if (this.is('break')) {
        this.next();
        this.expect(';');
        return { k: 'empty', tok: t };
      }
      this.expect('return');
      const e = this.expr();
      this.expect(';');
      return { k: 'yield', e, tok: t };
    }
    if ((t.k === 'kw' && t.v === 'static') || (t.k === 'id' && t.v === 'async' && this.peek(1).k !== 'op')) {
      this.next();
    }
    const d = this.declAhead();
    if (d) {
      if (d.fn) {
        const n = this.next();
        const ps = this.params();
        let body;
        if (this.is('=>')) {
          this.next();
          body = this.expr();
          this.expect(';');
        } else body = this.block();
        return { k: 'localfn', type: d.ty, name: n, params: ps, body, tok: t };
      }
      if (d.foreach) throw new PE('foreach-like');
      const s = this.declarators(d.ty, t, d.isConst);
      this.expect(';');
      return s;
    }
    if (t.k === 'id' && this.is(':', 1) && !this.is(':', 2)) {
      this.next();
      this.next();
      return this.safeStmt();
    }
    const e = this.expr();
    this.expect(';');
    return { k: 'expr', e, tok: t };
  };

  /* ---------- analiza ---------- */
  let ERRS, FILE, CTRL, STRS_CACHE;
  const err = (code, tok, msg, sev = 'err', extra) => {
    if (!tok) return;
    ERRS.push(
      Object.assign({ sev, code, msg, file: FILE, line: tok.line, col: tok.col, len: tok.len || 1 }, extra || {}),
    );
  };
  const M = {
    c0029: (a, b) =>
      L(
        `Nie można niejawnie przekonwertować typu „${disp(a)}” na „${b}”.`,
        `Cannot implicitly convert type '${disp(a)}' to '${b}'`,
      ),
    c0266: (a, b) =>
      L(
        `Nie można niejawnie przekonwertować typu „${a}” na „${b}”. Istnieje konwersja jawna (czy nie brakuje rzutowania, np. (${under(b)})?).`,
        `Cannot implicitly convert type '${a}' to '${b}'. An explicit conversion exists (are you missing a cast?)`,
      ),
  };
  function scopeNew(st, boundary) {
    st.scopes.push({ vars: new Map(), boundary: !!boundary });
  }
  function scopePop(st) {
    const s = st.scopes.pop();
    s.vars.forEach(sym => finishSym(sym));
  }
  function finishSym(sym) {
    if (sym.kind !== 'local' || sym.noWarn) return;
    if (sym.reads === 0 && sym.writes === 0 && !sym.init)
      err(
        'CS0168',
        sym.tok,
        L(
          `Zmienna „${sym.name}” jest zadeklarowana, ale nigdy nie jest używana.`,
          `The variable '${sym.name}' is declared but never used`,
        ),
        'warn',
      );
    else if (sym.reads === 0 && sym.constInit && sym.writes <= 1)
      err(
        'CS0219',
        sym.tok,
        L(
          `Zmienna „${sym.name}” ma przypisaną wartość, ale ta wartość nigdy nie jest używana.`,
          `The variable '${sym.name}' is assigned but its value is never used`,
        ),
        'warn',
      );
  }
  function lookupLocal(st, name) {
    for (let i = st.scopes.length - 1; i >= 0; i--) {
      const v = st.scopes[i].vars.get(name);
      if (v) return v;
    }
    return null;
  }
  function declare(st, name, type, tok, opt = {}) {
    if (!name || name === '_') return null;
    const cur = st.scopes[st.scopes.length - 1];
    if (cur.vars.has(name))
      err(
        'CS0128',
        tok,
        L(
          `Zmienna lokalna lub funkcja o nazwie „${name}” jest już zdefiniowana w tym zakresie.`,
          `A local variable or function named '${name}' is already defined in this scope`,
        ),
      );
    else {
      for (let i = st.scopes.length - 2; i >= 0; i--) {
        if (st.scopes[i + 1].boundary) break;
        if (st.scopes[i].vars.has(name)) {
          err(
            'CS0136',
            tok,
            L(
              `Nie można zadeklarować zmiennej lokalnej ani parametru o nazwie „${name}” w tym zakresie, ponieważ ta nazwa jest używana w otaczającym zakresie lokalnym.`,
              `A local or parameter named '${name}' cannot be declared in this scope because that name is used in an enclosing local scope to define a local or parameter`,
            ),
          );
          break;
        }
      }
    }
    const sym = {
      name,
      type: type ? norm(type) : null,
      tok,
      kind: opt.kind || 'local',
      reads: 0,
      writes: opt.assigned ? 1 : 0,
      init: !!opt.assigned,
      constInit: !!opt.constInit,
      id: ++st.symId,
      iter: !!opt.iter,
      noWarn: !!opt.noWarn,
      isConst: !!opt.isConst,
    };
    cur.vars.set(name, sym);
    if (opt.assigned) st.A.add(sym.id);
    return sym;
  }
  const cloneSt = st => Object.assign({}, st, { A: new Set(st.A), dead: st.dead });
  function merge(a, b) {
    if (!a) return b;
    if (!b) return a;
    if (a.dead) return Object.assign(cloneSt(b));
    if (b.dead) return cloneSt(a);
    const r = cloneSt(a);
    r.A = new Set([...a.A].filter(x => b.A.has(x)));
    r.dead = false;
    return r;
  }
  function setFrom(st, src) {
    st.A = new Set(src.A);
    st.dead = src.dead;
  }

  /* typy składowych */
  function userMember(tname, name) {
    let t = tname,
      g = 0;
    while (t && g++ < 10) {
      const u = USERT[P2(t).base];
      if (!u) return { member: null, onUser: g > 1 ? 'inherited' : false, next: t };
      const ms = u.members.filter(m => m.name === name && m.kind !== 'ctor');
      if (ms.length) return { member: ms, owner: u.name };
      t = u.base || null;
      if (!t) break;
    }
    return { member: null, onUser: true };
  }
  /* typ w pełni opisany przez oficjalne API (cała hierarchia bazowa znana) — brak składowej to na pewno błąd */
  const apiCache = new Map();
  function apiComplete(type) {
    const p = P2(type);
    if (!p) return false;
    if (p.base === 'Array') return true;
    if (apiCache.has(p.base)) return apiCache.get(p.base);
    let ok = false;
    const t0 = IS.T[p.base];
    if (t0 && t0.api && !t0.iface) {
      let t = t0,
        g = 0;
      ok = true;
      while (t && g++ < 20) {
        if (!t.api && t !== IS.T.IEnumerable) {
          ok = false;
          break;
        }
        if (!t.base || t.base === 'object') break;
        const nb = P2(t.base);
        t = nb && IS.T[nb.base];
        if (!t) {
          ok = false;
          break;
        }
      }
    }
    apiCache.set(p.base, ok);
    return ok;
  }
  function lookupMember(type, name, isStatic, tok) {
    type = norm(type);
    if (!type) return null;
    if (isNullable(type) && !isStatic) {
      const u = under(type);
      if (name === 'Value') return { kind: 'p', type: u, ro: true };
      if (name === 'HasValue') return { kind: 'p', type: 'bool', ro: true };
      if (name === 'GetValueOrDefault')
        return {
          kind: 'm',
          sigs: [
            { params: '', type: u },
            { params: `${u} defaultValue`, type: u },
          ],
          exact: true,
          owner: type,
        };
      if (['ToString', 'Equals', 'GetHashCode', 'GetType'].includes(name))
        return lookupMember('object', name, false, tok);
      const m = lookupMember(u, name, false, null);
      if (m)
        err(
          'CS1061',
          tok,
          L(
            `„${type}” nie zawiera definicji „${name}”. Użyj „.Value.${name}” albo sprawdź HasValue.`,
            `'${type}' does not contain a definition for '${name}'. Use '.Value.${name}' or check HasValue.`,
          ),
        );
      return null;
    }
    const p = P2(type);
    if (!p) return null;
    // typy użytkownika
    if (USERT[p.base]) {
      let t = p.base,
        g = 0;
      while (t && g++ < 10) {
        const u = USERT[t];
        if (!u) {
          const r = lookupMember(t, name, isStatic, tok);
          return r;
        }
        const ms = u.members.filter(m => m.name === name && m.kind !== 'ctor');
        if (ms.length) {
          const m0 = ms[0];
          if (u.kind !== 'enum') {
            if (isStatic && !m0.isStatic && m0.kind !== 'c')
              err(
                'CS0120',
                tok,
                L(
                  `Odwołanie do obiektu jest wymagane dla niestatycznej składowej „${u.name}.${name}”.`,
                  `An object reference is required for the non-static field, method, or property '${u.name}.${name}'`,
                ),
              );
            else if (!isStatic && (m0.isStatic || m0.kind === 'c'))
              err(
                'CS0176',
                tok,
                L(
                  `Do składowej „${u.name}.${name}” nie można uzyskać dostępu przez odwołanie do wystąpienia; użyj nazwy typu.`,
                  `Member '${u.name}.${name}' cannot be accessed with an instance reference; qualify it with a type name instead`,
                ),
              );
          }
          if (m0.kind === 'm')
            return {
              kind: 'm',
              sigs: ms.map(m => ({ params: m.params || '', type: m.type || 'void' })),
              exact: true,
              owner: u.name,
              name,
            };
          return {
            kind: m0.kind === 'c' ? 'c' : m0.kind === 'f' ? 'f' : 'p',
            type: u.kind === 'enum' ? u.name : m0.type,
            ro: !!m0.ro,
            auto: !!m0.auto,
            owner: u.name,
            name,
            userProp: m0.kind === 'p',
          };
        }
        if (t === 'MainWindow' && CTRL[name]) return { kind: 'f', type: CTRL[name], ctl: true };
        if (t === 'MainWindow' && name === 'InitializeComponent')
          return { kind: 'm', sigs: [{ params: '', type: 'void' }], exact: true, owner: t, name };
        t = u.base ? P2(u.base).base : u.kind === 'enum' ? null : 'object';
        if (t && t !== 'object' && !USERT[t]) {
          if (!IS.T[t] && !BASE_EXTRA[t] && !TY[t]) return null;
          return lookupMember(t, name, isStatic, tok);
        }
        if (t === 'object') {
          const r = lookupMember('object', name, isStatic, null);
          if (r) return r;
          break;
        }
      }
      if (
        USERT[p.base].kind === 'enum' &&
        !isStatic &&
        ['ToString', 'Equals', 'GetHashCode', 'GetType', 'CompareTo', 'HasFlag'].includes(name)
      )
        return {
          kind: 'm',
          sigs: [{ params: '', type: name === 'ToString' ? 'string' : name === 'HasFlag' ? 'bool' : 'int' }],
        };
      err(
        isStatic ? 'CS0117' : 'CS1061',
        tok,
        isStatic
          ? L(
              `Typ „${p.base}” nie zawiera definicji „${name}”.`,
              `'${p.base}' does not contain a definition for '${name}'`,
            )
          : L(
              `„${type}” nie zawiera definicji „${name}”, a nie odnaleziono dostępnej metody rozszerzającej „${name}”, która przyjmuje pierwszy argument typu „${type}”.`,
              `'${type}' does not contain a definition for '${name}' and no accessible extension method '${name}' accepting a first argument of type '${type}' could be found`,
            ),
      );
      return null;
    }
    // baza IntelliSense
    const list = IS.membersOf(type, isStatic);
    const m = list.find(x => x.name === name);
    const key = o => `${o}.${name}`;
    const roKey = () => {
      let t = p.base,
        g = 0;
      while (t && g++ < 10) {
        if (RO.has(`${t}.${name}`)) return true;
        t = (IS.T[t] || {}).base;
      }
      return RO.has(`*.${name}`);
    };
    const ovlFor = () => {
      let t = p.base,
        g = 0;
      while (t && g++ < 10) {
        if (OVL[key(t)])
          return { sigs: OVL[key(t)].map(s => ({ params: subst(s.params, p), type: subst(s.type, p) })), exact: true };
        t = (IS.T[t] || {}).base;
      }
      return null;
    };
    if (m && !(NOT_MEMBER[p.base] || []).includes(name)) {
      if (m.kind === 'm') {
        const o = ovlFor();
        const apiExact = !o && m.api && m.sigs.length && m.sigs.every(s => s.api);
        return { kind: 'm', sigs: o ? o.sigs : m.sigs, exact: !!o || apiExact, owner: p.base, name };
      }
      if (m.kind === 'e') return { kind: 'e', type: m.type, owner: p.base, name };
      return {
        kind: m.kind === 'c' ? 'c' : m.kind,
        type: m.type,
        ro: (m.api ? !!m.ro : false) || roKey(),
        owner: p.base,
        name,
      };
    }
    const o = ovlFor();
    if (o) return { kind: 'm', sigs: o.sigs, exact: true, owner: p.base, name };
    // pełne listy (typy zamknięte)
    const all = list.map(x => x.name);
    const closed = isStatic
      ? CLOSED_STATIC[p.base] || (apiComplete(type) ? all.join(' ') : null)
      : CLOSED[p.base] || (p.base === 'Array' ? CLOSED.Array : null) || (apiComplete(type) ? all.join(' ') : null);
    const ci = all.find(x => x.toLowerCase() === name.toLowerCase());
    if ((closed && !closed.split(' ').includes(name)) || ci || (NOT_MEMBER[p.base] || []).includes(name)) {
      const cands = closed ? closed.split(' ') : all;
      const s = ci || (typeof suggest === 'function' ? suggest(name, cands) : null);
      const tn = isStatic ? p.base : type;
      err(
        isStatic ? 'CS0117' : 'CS1061',
        tok,
        (isStatic
          ? L(`Typ „${tn}” nie zawiera definicji „${name}”.`, `'${tn}' does not contain a definition for '${name}'`)
          : L(
              `„${tn}” nie zawiera definicji „${name}”, a nie odnaleziono dostępnej metody rozszerzającej „${name}”, która przyjmuje pierwszy argument typu „${tn}”.`,
              `'${tn}' does not contain a definition for '${name}' and no accessible extension method '${name}' accepting a first argument of type '${tn}' could be found`,
            )) +
          (s
            ? ci
              ? L(
                  ` Czy chodziło o „${s}”? (C# rozróżnia wielkość liter)`,
                  ` Did you mean '${s}'? (C# is case-sensitive)`,
                )
              : L(` Czy chodziło o „${s}”?`, ` Did you mean '${s}'?`)
            : ''),
      );
    }
    return null;
  }
  function subst(s, p) {
    if (!s || !p) return s;
    const names =
      {
        List: ['T'],
        Array: ['T'],
        Dictionary: ['K', 'V'],
        HashSet: ['T'],
        Queue: ['T'],
        Stack: ['T'],
        IEnumerable: ['T'],
        KeyValuePair: ['K', 'V'],
      }[p.base] ||
      IS.GEN[p.base] ||
      [];
    names.forEach((n, i) => {
      if (p.args[i]) s = s.replace(new RegExp('\\b' + n + '\\b', 'g'), p.args[i]);
    });
    return s;
  }
  function parseParams(s) {
    if (!s || !s.trim()) return [];
    return CS.splitTop(s, ',').map(x => {
      x = x.trim().replace(/^(\[[^\]]*\]\s*)+/, '');
      let mod = null;
      const mm = /^(out|ref|in|params|this)\s+/.exec(x);
      if (mm) {
        mod = mm[1];
        x = x.slice(mm[0].length);
      }
      const eq = CS.splitTop(x, '=');
      const left = eq[0].trim();
      const opt = eq.length > 1;
      const nm = /(\w+)\s*$/.exec(left);
      const type = nm ? left.slice(0, nm.index).trim() : left;
      return { mod, type: norm(type) || null, name: nm ? nm[1] : '', opt, params: mod === 'params' };
    });
  }
  /* rozstrzyganie przeciążeń */
  function better(a, b, argT) {
    // czy konwersja do a lepsza niż do b
    a = norm(a);
    b = norm(b);
    argT = norm(argT);
    if (a === b) return false;
    if (argT === a) return true;
    if (argT === b) return false;
    const ab = conv(a, b),
      ba = conv(b, a);
    if ((ab === 'imp' || ab === 'id') && !(ba === 'imp' || ba === 'id')) return true;
    if (NUM.has(a) && NUM.has(b)) {
      const signedA = ['sbyte', 'short', 'int', 'long', 'nint'].includes(a),
        unsB = ['byte', 'ushort', 'uint', 'ulong', 'nuint'].includes(b);
      if (signedA && unsB) return true;
    }
    return false;
  }
  function resolve(sigs, args, argTypes, name, tok, exact, st) {
    const cands = sigs.map(s => ({ s, ps: parseParams(s.params) }));
    const applicable = [];
    for (const c of cands) {
      const req = c.ps.filter(p => !p.opt && !p.params).length;
      const max = c.ps.some(p => p.params) ? Infinity : c.ps.length;
      if (args.length < req || args.length > max) continue;
      let ok = true;
      for (let i = 0; i < args.length && ok; i++) {
        const p = c.ps[Math.min(i, c.ps.length - 1)];
        const a = args[i];
        let pt = p.type;
        if (p.params && pt && /\[\]$/.test(pt) && !(args.length === c.ps.length && /\[\]$/.test(argTypes[i] || '')))
          pt = pt.slice(0, -2);
        if ((p.mod === 'out' || p.mod === 'ref') !== (a.mod === 'out' || a.mod === 'ref')) {
          ok = false;
          break;
        }
        if (a.mod === 'out' || a.mod === 'ref') {
          if (a.decl && a.decl.type === 'var') continue;
          const at = argTypes[i];
          if (at && pt && isKnown(at) && isKnown(pt) && norm(at) !== norm(pt)) ok = false;
          continue;
        }
        if (a.lambda) continue;
        const c2 = conv(argTypes[i], pt, a.e);
        if (c2 === 'exp' || c2 === 'none') ok = false;
        else if (c2 === '?') c.unc = true;
      }
      if (ok) applicable.push(c);
    }
    if (!applicable.length) {
      if (!exact || argTypes.some((t, i) => t == null && !args[i].decl && !args[i].lambda))
        return cands.length
          ? { sig: cands.find(c => c.ps.length === args.length) || cands[0], unresolved: true }
          : null;
      const byCount = cands.filter(c => {
        const req = c.ps.filter(p => !p.opt && !p.params).length;
        const max = c.ps.some(p => p.params) ? Infinity : c.ps.length;
        return args.length >= req && args.length <= max;
      });
      if (!byCount.length) {
        err(
          'CS1501',
          tok,
          L(
            `Żadne przeciążenie metody „${name}” nie przyjmuje ${args.length} argumentów.`,
            `No overload for method '${name}' takes ${args.length} arguments`,
          ),
        );
        return { sig: cands[0], failed: true };
      }
      const c = byCount[0];
      for (let i = 0; i < args.length; i++) {
        const p = c.ps[Math.min(i, c.ps.length - 1)];
        const a = args[i];
        const am = a.mod === 'out' || a.mod === 'ref',
          pm = p.mod === 'out' || p.mod === 'ref';
        if (am !== pm) {
          err(
            'CS1620',
            a.tok || tok,
            L(
              `Argument ${i + 1} musi być przekazany ze słowem kluczowym „${p.mod}”.`,
              `Argument ${i + 1} must be passed with the '${p.mod}' keyword`,
            ),
          );
          return { sig: c, failed: true };
        }
        if (am) {
          if (a.decl && a.decl.type === 'var') continue;
          const at = argTypes[i];
          if (at && p.type && norm(at) !== norm(p.type)) {
            err(
              'CS1503',
              a.tok || tok,
              L(
                `Argument ${i + 1}: nie można przekonwertować z „${a.mod} ${at}” na „${p.mod} ${p.type}”.`,
                `Argument ${i + 1}: cannot convert from '${a.mod} ${at}' to '${p.mod} ${p.type}'`,
              ),
            );
            return { sig: c, failed: true };
          }
          continue;
        }
        const cv = conv(argTypes[i], p.type, a.e);
        if (cv === 'exp' || cv === 'none') {
          err(
            'CS1503',
            a.tok || tok,
            L(
              `Argument ${i + 1}: nie można przekonwertować z „${disp(argTypes[i])}” na „${p.type}”.`,
              `Argument ${i + 1}: cannot convert from '${disp(argTypes[i])}' to '${p.type}'`,
            ),
          );
          return { sig: c, failed: true };
        }
      }
      return { sig: c, failed: true };
    }
    let best = applicable[0];
    if (applicable.length > 1) {
      const isBetter = (x, y) => {
        let any = false;
        for (let i = 0; i < args.length; i++) {
          const px = x.ps[Math.min(i, x.ps.length - 1)].type,
            py = y.ps[Math.min(i, y.ps.length - 1)].type;
          if (!px || !py) continue;
          if (better(py, px, argTypes[i])) return false;
          if (better(px, py, argTypes[i])) any = true;
        }
        return any || (x.ps.length === args.length && y.ps.length !== args.length);
      };
      let winners = applicable.filter(x => applicable.every(y => y === x || isBetter(x, y)));
      if (winners.length !== 1) {
        const tied = winners.length ? winners : applicable;
        const nonGen = tied.filter(x => !x.s.tparams && !x.s.gen);
        if (nonGen.length === 1 && nonGen.length < tied.length) winners = nonGen;
        else if (!winners.length) {
          const ng = applicable.filter(x => !x.s.tparams && !x.s.gen);
          if (ng.length === 1) winners = ng;
        }
      }
      if (winners.length !== 1 && applicable.some(x => x.unc || x.s.tparams || x.s.gen)) {
        best = winners[0] || applicable[0];
      } else if (winners.length === 1) best = winners[0];
      else if (exact && argTypes.every(t => t)) {
        const a = applicable[0],
          b = applicable[1];
        const sig = x => `${name}(${x.ps.map(p => p.type).join(', ')})`;
        err(
          'CS0121',
          tok,
          L(
            `Wywołanie jest niejednoznaczne między następującymi metodami lub właściwościami: „${sig(a)}” i „${sig(b)}”.`,
            `The call is ambiguous between the following methods or properties: '${sig(a)}' and '${sig(b)}'`,
          ),
        );
      }
    }
    return { sig: best };
  }

  /* ---------- typowanie wyrażeń ---------- */
  const R = (t, extra) => Object.assign({ t: t == null ? null : norm(t) }, extra || {});
  function resolveName(node, st, opt) {
    const name = node.v;
    if (node.prim) return R(ALIAS[name] || name, { isType: true });
    const sym = lookupLocal(st, name);
    if (sym) {
      if (!opt.write) {
        sym.reads++;
        if (sym.kind === 'local' && !st.A.has(sym.id) && !st.dead && !sym.reported && !sym.isConst) {
          sym.reported = true;
          err(
            'CS0165',
            node.tok,
            L(`Użycie nieprzypisanej zmiennej lokalnej „${name}”.`, `Use of unassigned local variable '${name}'`),
          );
        }
      }
      return R(sym.type, { sym, fn: sym.fn });
    }
    if (st.cls) {
      const m = lookupMemberQuiet(st.cls, name, st.isStaticCtx);
      if (m) {
        if (m.kind === 'm') return R(null, { group: m, name });
        if (st.isStaticCtx && m.instance)
          err(
            'CS0120',
            node.tok,
            L(
              `Odwołanie do obiektu jest wymagane dla niestatycznej składowej „${name}”.`,
              `An object reference is required for the non-static field, method, or property '${st.cls}.${name}'`,
            ),
          );
        return R(m.type, { member: m });
      }
    }
    if (USERT[name]) return R(name, { isType: true });
    const p = IS.T[name];
    if (p || BASE_EXTRA[name] || TY[name] || ALIAS[name]) return R(ALIAS[name] || name, { isType: true });
    if (/^[A-Z]/.test(name) && opt.receiver) return R(null, { ns: name });
    if (/^[A-Z]/.test(name) && !opt.receiver && node.tok) {
      /* nieznana nazwa z wielkiej litery: może to być typ .NET spoza bazy */ if (opt.call) {
        err(
          'CS0103',
          node.tok,
          L(
            `Nazwa „${name}” nie istnieje w bieżącym kontekście.`,
            `The name '${name}' does not exist in the current context`,
          ),
        );
      }
      return R(null, { unknown: true });
    }
    err(
      'CS0103',
      node.tok,
      L(
        `Nazwa „${name}” nie istnieje w bieżącym kontekście.`,
        `The name '${name}' does not exist in the current context`,
      ),
    );
    return R(null, { unknown: true });
  }
  function lookupMemberQuiet(cls, name, isStaticCtx) {
    let t = cls,
      g = 0;
    while (t && g++ < 10) {
      const u = USERT[t];
      if (!u) {
        const list = IS.membersOf(t, false);
        const m = list.find(x => x.name === name);
        if (m)
          return m.kind === 'm'
            ? {
                kind: 'm',
                sigs: OVL[`${t}.${name}`] || m.sigs,
                exact: !!OVL[`${t}.${name}`] || (m.api && m.sigs.every(s => s.api)),
                owner: t,
                name,
              }
            : { kind: m.kind, type: m.type, owner: t, name, instance: true, isEvent: m.kind === 'e' };
        t = (IS.T[t] || {}).base;
        continue;
      }
      const ms = u.members.filter(m => m.name === name && m.kind !== 'ctor');
      if (ms.length) {
        const m0 = ms[0];
        if (m0.kind === 'm')
          return {
            kind: 'm',
            sigs: ms.map(m => ({ params: m.params || '', type: m.type || 'void', isStatic: m.isStatic })),
            exact: true,
            owner: u.name,
            name,
          };
        return {
          kind: m0.kind,
          type: u.kind === 'enum' ? u.name : m0.type,
          ro: !!m0.ro,
          auto: !!m0.auto,
          owner: u.name,
          name,
          instance: !m0.isStatic && m0.kind !== 'c',
          userProp: m0.kind === 'p',
        };
      }
      if (t === 'MainWindow' && CTRL[name]) return { kind: 'f', type: CTRL[name], ctl: true, instance: true };
      if (t === 'MainWindow' && name === 'InitializeComponent')
        return { kind: 'm', sigs: [{ params: '', type: 'void' }], exact: true, owner: t, name };
      t = u.base ? P2(u.base).base : u.name === 'MainWindow' ? 'Window' : 'object';
      if (t === 'object') break;
    }
    return null;
  }
  function typeOf(node, st, opt = {}) {
    if (!node) return R(null);
    try {
      return typeOf0(node, st, opt);
    } catch (e) {
      if (e instanceof PE) return R(null);
      throw e;
    }
  }
  function typeOf0(node, st, opt) {
    switch (node.k) {
      case 'lit':
        return R(node.t, { lit: true });
      case 'interp':
        checkInterp(node, st);
        return R('string');
      case 'paren':
        return typeOf(node.x, st, opt);
      case 'name':
        return resolveName(node, st, opt);
      case 'this':
        return R(st.cls, { isThis: true });
      case 'base':
        return R(baseOf(st.cls), { isThis: true });
      case 'tuple':
      case 'collexpr':
        return R(null);
      case 'throw':
        return R('throw');
      case 'mem': {
        const r = typeOf(node.o, st, { receiver: true });
        if (r.ns) {
          const full = r.ns + '.' + node.n;
          const last = node.n;
          if (IS.T[last] || USERT[last] || ALIAS[last]) return R(ALIAS[last] || last, { isType: true });
          return R(null, { ns: full });
        }
        if (!r.t) return R(null);
        if (r.group) return R(null);
        // reguła „Color Color”: właściwość o tej samej nazwie co jej typ (np. Visibility.Hidden w oknie)
        let colorColor = false;
        if (node.o.k === 'name' && !r.isType && (r.member || r.sym) && P2(r.t) && P2(r.t).base === node.o.v) {
          const u = USERT[node.o.v];
          colorColor = u
            ? u.members.some(x => x.name === node.n && (x.isStatic || x.kind === 'c'))
            : IS.membersOf(r.t, true).some(x => x.name === node.n);
        }
        const m = lookupMember(r.t, node.n, !!r.isType || colorColor, node.ntok);
        if (!m) return R(null);
        if (m.kind === 'm') return R(null, { group: m, name: node.n, recv: r });
        let t = m.type;
        if (node.cond && t && isValue(t)) t = t + '?';
        return R(t, { member: m, recv: r });
      }
      case 'call':
        return typeCall(node, st, opt);
      case 'idx': {
        const r = typeOf(node.o, st);
        const ats = node.args.map(a => typeOf(a.e, st).t);
        if (!r.t) return R(null);
        const p = P2(r.t);
        if (!p) return R(null);
        const idxCheck = want => {
          node.args.forEach((a, i) => {
            const c = conv(ats[i], want, a.e);
            if (c === 'exp') err('CS0266', a.tok, M.c0266(ats[i], want));
            else if (c === 'none') err('CS0029', a.tok, M.c0029(ats[i], want));
          });
        };
        if (r.t === 'string') {
          idxCheck('int');
          return R('char', { roIdx: true });
        }
        if (p.base === 'Array') {
          idxCheck('int');
          return R(p.args[0]);
        }
        if (p.base === 'List') {
          idxCheck('int');
          return R(p.args[0]);
        }
        if (p.base === 'Dictionary') {
          idxCheck(p.args[0]);
          return R(p.args[1]);
        }
        if (p.base === 'ItemCollection' || p.base === 'UIElementCollection') {
          idxCheck('int');
          return R(p.base === 'ItemCollection' ? 'object' : 'UIElement');
        }
        if (NUM.has(r.t) || r.t === 'bool')
          err(
            'CS0021',
            node.tok,
            L(
              `Nie można zastosować indeksowania przez [] do wyrażenia typu „${r.t}”.`,
              `Cannot apply indexing with [] to an expression of type '${r.t}'`,
            ),
          );
        return R(null);
      }
      case 'un': {
        const isInc = node.op === '++' || node.op === '--';
        const r = typeOf(node.x, st, isInc ? { rw: true } : {});
        if (!r.t) return R(null);
        const t = r.t;
        if (node.op === '!') {
          if (under(t) !== 'bool') {
            err(
              'CS0023',
              node.tok,
              L(
                `Operatora „!” nie można zastosować do argumentu typu „${t}”.`,
                `Operator '!' cannot be applied to operand of type '${t}'`,
              ),
            );
            return R('bool');
          }
          return R(t);
        }
        if (isInc) {
          if (r.sym) {
            r.sym.writes++;
          }
          if (!NUM.has(under(t)) && isKnown(t) && !isEnum(t))
            err(
              'CS0023',
              node.tok,
              L(
                `Operatora „${node.op}” nie można zastosować do argumentu typu „${t}”.`,
                `Operator '${node.op}' cannot be applied to operand of type '${t}'`,
              ),
            );
          checkWritable(node.x, r, st, node.tok);
          return R(t);
        }
        if (node.op === '-' || node.op === '+') {
          const u = under(t);
          if (!NUM.has(u)) {
            if (isKnown(t))
              err(
                'CS0023',
                node.tok,
                L(
                  `Operatora „${node.op}” nie można zastosować do argumentu typu „${t}”.`,
                  `Operator '${node.op}' cannot be applied to operand of type '${t}'`,
                ),
              );
            return R(null);
          }
          const res = ['sbyte', 'byte', 'short', 'ushort', 'char'].includes(u)
            ? 'int'
            : node.op === '-' && u === 'uint'
              ? 'long'
              : u;
          return R(isNullable(t) ? res + '?' : res);
        }
        if (node.op === '~') {
          return R(['sbyte', 'byte', 'short', 'ushort', 'char'].includes(t) ? 'int' : t);
        }
        return R(null);
      }
      case 'bin':
        return typeBin(node, st);
      case 'asg':
        return typeAssign(node, st);
      case 'cond': {
        const c = typeOf(node.c, st);
        checkBool(c.t, node.c, 'cond');
        const s1 = cloneSt(st);
        const a = typeOf(node.a, s1);
        const s2 = cloneSt(st);
        const b = typeOf(node.b, s2);
        setFrom(st, merge(s1, s2));
        if (!a.t || !b.t) return R(a.t || b.t ? null : null);
        if (norm(a.t) === norm(b.t)) return R(a.t);
        const ab = conv(a.t, b.t, node.a),
          ba = conv(b.t, a.t, node.b);
        if (ab === 'imp' && ba !== 'imp') return R(b.t);
        if (ba === 'imp' && ab !== 'imp') return R(a.t);
        if (a.t === 'null' && !isValue(b.t)) return R(b.t);
        if (b.t === 'null' && !isValue(a.t)) return R(a.t);
        if (opt.expected) return R(opt.expected, { targetTyped: true });
        if (isKnown(a.t) && isKnown(b.t) && ab !== '?' && ba !== '?')
          err(
            'CS0173',
            node.tok,
            L(
              `Nie można określić typu wyrażenia warunkowego, ponieważ nie istnieje niejawna konwersja między „${disp(a.t)}” i „${disp(b.t)}”.`,
              `Type of conditional expression cannot be determined because there is no implicit conversion between '${disp(a.t)}' and '${disp(b.t)}'`,
            ),
          );
        return R(null);
      }
      case 'cast': {
        const x = typeOf(node.x, st);
        const T = norm(node.type);
        checkTypeName(node.type, node.tok);
        if (x.t && x.t !== 'null') {
          const c = conv(x.t, T, node.x);
          if (c === 'none' && isKnown(x.t) && isKnown(T))
            err(
              'CS0030',
              node.tok,
              L(`Nie można przekonwertować typu „${x.t}” na „${T}”.`, `Cannot convert type '${x.t}' to '${T}'`),
            );
        }
        if (x.t === 'null' && isValue(T))
          err(
            'CS0037',
            node.tok,
            L(
              `Nie można przekonwertować wartości null na typ „${T}”, ponieważ jest to typ wartości, który nie dopuszcza wartości null.`,
              `Cannot convert null to '${T}' because it is a non-nullable value type`,
            ),
          );
        return R(T);
      }
      case 'is': {
        const x = typeOf(node.x, st);
        if (node.pat) typeOf(node.pat, st);
        if (node.name) declare(st, node.name, node.type, node.tok, { assigned: true, noWarn: true });
        return R('bool');
      }
      case 'as': {
        typeOf(node.x, st);
        const T = norm(node.type);
        if (isValue(T))
          err(
            'CS0077',
            node.tok,
            L(
              `Operator „as” musi być użyty z typem referencyjnym lub typem dopuszczającym wartość null („${T}” jest typem wartości).`,
              `The as operator must be used with a reference type or nullable type ('${T}' is a non-nullable value type)`,
            ),
          );
        return R(T);
      }
      case 'await': {
        const x = typeOf(node.x, st);
        if (!x.t) return R(null);
        const p = P2(x.t);
        if (p && p.base === 'Task') return R(p.args[0] || 'void');
        return R(null);
      }
      case 'lambda': {
        const st2 = Object.assign({}, st, { retType: null, inLambda: true, breaks: null });
        scopeNew(st, true);
        node.params.forEach((p, i) =>
          declare(st, p.name, p.type || (opt.lambdaParams && opt.lambdaParams[i]) || null, node.tok, {
            kind: 'param',
            assigned: true,
            noWarn: true,
          }),
        );
        const inner = cloneSt(st);
        inner.retType = null;
        inner.inLambda = true;
        inner.scopes = st.scopes;
        if (node.body.k === 'block') walkStmt(node.body, inner);
        else typeOf(node.body, inner);
        scopePop(st);
        return R(null, { lambda: true });
      }
      case 'new':
        return typeNew(node, st, opt);
      default:
        return R(null);
    }
  }
  function checkInterp(node, st) {
    const raw = node.raw;
    let i = 0;
    const holes = [];
    while (i < raw.length) {
      const c = raw[i];
      if (c === '{' && raw[i + 1] === '{') {
        i += 2;
        continue;
      }
      if (c === '{') {
        let d = 1,
          j = i + 1;
        while (j < raw.length && d) {
          if (raw[j] === '{') d++;
          else if (raw[j] === '}') d--;
          else if (raw[j] === '"') {
            j++;
            while (j < raw.length && raw[j] !== '"') j++;
          }
          if (d) j++;
        }
        holes.push(raw.slice(i + 1, j));
        i = j + 1;
        continue;
      }
      i++;
    }
    holes.forEach(h => {
      let d = 0,
        cut = h.length;
      for (let k = 0; k < h.length; k++) {
        const c = h[k];
        if ('([{'.includes(c)) d++;
        else if (')]}'.includes(c)) d--;
        else if (
          d === 0 &&
          (c === ':' || c === ',') &&
          h[k + 1] !== ':' &&
          h[k - 1] !== ':' &&
          !/\?/.test(h.slice(0, k))
        ) {
          cut = k;
          break;
        }
      }
      const expr = h.slice(0, cut);
      const t = CS.tokenize(expr);
      const toks = lex(t.code, t.strs).map(x =>
        Object.assign(x, { line: node.tok.line, col: node.tok.col, len: node.tok.len }),
      );
      try {
        const p = new Parser(toks);
        const e = p.expr();
        typeOf(e, st);
      } catch (e) {
        if (!(e instanceof PE)) throw e;
      }
    });
  }
  function checkTypeName(t, tok) {
    if (!t || t === 'var') return;
    const p = P2(norm(t));
    if (!p) return;
    const names = [p.base, ...(p.args || [])].map(x => (P2(norm(x)) ? P2(norm(x)).base : x));
    for (const b of names) {
      if (
        !b ||
        PRIM_KW.has(b) ||
        isKnown(b) ||
        IS.T[b] ||
        USERT[b] ||
        TY[b] ||
        /^[A-Z]$|^T[A-Z]/.test(b) ||
        /\./.test(b) ||
        /^\(/.test(b)
      )
        continue;
      const known = [...PRIM_KW, ...Object.keys(IS.T), ...Object.keys(USERT), ...Object.keys(TY)];
      const s = typeof suggest === 'function' ? suggest(b, known) : null;
      if (/^[a-z]/.test(b) || s)
        err(
          'CS0246',
          tok,
          L(
            `Nie można znaleźć nazwy typu lub przestrzeni nazw „${b}”.${s ? ` Czy chodziło o „${s}”?` : ''}`,
            `The type or namespace name '${b}' could not be found (are you missing a using directive or an assembly reference?)${s ? ` Did you mean '${s}'?` : ''}`,
          ),
        );
    }
  }
  function checkBool(t, node, what) {
    if (!t) return;
    if (t === 'bool') return;
    if (t === 'bool?') {
      err(
        'CS0266',
        node.tok,
        M.c0266('bool?', 'bool') +
          L(' Dla CheckBox użyj np. „IsChecked == true”.', " For a CheckBox use for example 'IsChecked == true'."),
      );
      return;
    }
    if (isKnown(t))
      err(
        'CS0029',
        node.tok,
        M.c0029(t, 'bool') +
          (node.k === 'asg' && node.op === '='
            ? L(' Do porównania użyj „==”, a nie „=”.', ' To compare, use "==" instead of "=".')
            : ''),
      );
  }
  function assignCheck(from, to, node, tok) {
    if (!to || !from) return;
    if (from.group) {
      if (isKnown(to) && !/Handler|Action|Func|Predicate|Comparison/.test(to))
        err(
          'CS0428',
          tok,
          L(
            `Nie można przekonwertować grupy metod „${from.name}” na typ niebędący delegatem „${to}”. Czy chodziło o wywołanie metody — „${from.name}()”?`,
            `Cannot convert method group '${from.name}' to non-delegate type '${to}'. Did you intend to invoke the method?`,
          ),
        );
      return;
    }
    if (from.lambda) return;
    const t = from.t;
    if (!t) return;
    if (t === 'void') {
      err('CS0029', tok, M.c0029('void', to));
      return;
    }
    const c = conv(t, to, node);
    if (c === 'id' || c === 'imp' || c === '?') return;
    if (c === 'exp') {
      if (node && node.k === 'lit' && node.real && (under(to) === 'float' || under(to) === 'decimal')) {
        err(
          'CS0664',
          tok,
          L(
            `Literału typu double nie można niejawnie przekonwertować na typ „${to}”. Użyj sufiksu „${under(to) === 'float' ? 'F' : 'M'}”, aby utworzyć literał tego typu.`,
            `Literal of type double cannot be implicitly converted to type '${to}'; use an '${under(to) === 'float' ? 'F' : 'M'}' suffix to create a literal of this type`,
          ),
        );
        return;
      }
      const cv = constVal(node);
      if (t === 'int' && typeof cv === 'number' && RANGE[under(to)] && NUM.has(under(to))) {
        err(
          'CS0031',
          tok,
          L(
            `Wartości stałej „${cv}” nie można przekonwertować na typ „${to}”.`,
            `Constant value '${cv}' cannot be converted to a '${to}'`,
          ),
        );
        return;
      }
      err('CS0266', tok, M.c0266(t, to));
      return;
    }
    if (t === 'null') {
      err(
        'CS0037',
        tok,
        L(
          `Nie można przekonwertować wartości null na typ „${to}”, ponieważ jest to typ wartości, który nie dopuszcza wartości null.`,
          `Cannot convert null to '${to}' because it is a non-nullable value type`,
        ),
      );
      return;
    }
    let hint = '';
    if (to === 'string' && NUM.has(t)) hint = L(' Użyj np. „.ToString()”.', " Use for example '.ToString()'.");
    else if (NUM.has(under(to)) && t === 'string')
      hint = L(
        ` Użyj np. „${under(to)}.Parse(...)” albo „${under(to)}.TryParse(...)”.`,
        ` Use for example '${under(to)}.Parse(...)' or '${under(to)}.TryParse(...)'.`,
      );
    else if (to === 'Brush' && t === 'Color')
      hint = L(
        ' Użyj „new SolidColorBrush(kolor)” albo „Brushes.…”.',
        " Use 'new SolidColorBrush(color)' or 'Brushes.…'.",
      );
    else if (to === 'Brush' && t === 'string') hint = L(' Użyj np. „Brushes.Red”.', " Use for example 'Brushes.Red'.");
    else if (to === 'string' && t === 'char') hint = L(' Użyj „.ToString()”.', " Use '.ToString()'.");
    err('CS0029', tok, M.c0029(t, to) + hint);
  }
  function checkWritable(target, r, st, tok) {
    if (r.sym && r.sym.iter) {
      err(
        'CS1656',
        tok,
        L(
          `Nie można przypisać do „${r.sym.name}”, ponieważ jest to zmienna iteracji pętli foreach.`,
          `Cannot assign to '${r.sym.name}' because it is a 'foreach iteration variable'`,
        ),
      );
      return;
    }
    if (r.sym && r.sym.isConst) {
      err(
        'CS0131',
        tok,
        L(
          'Lewa strona przypisania musi być zmienną, właściwością lub indeksatorem.',
          'The left-hand side of an assignment must be a variable, property or indexer',
        ),
      );
      return;
    }
    const m = r.member;
    if (m && m.ro && !(m.auto && st.inCtorOf === m.owner)) {
      err(
        'CS0200',
        tok,
        L(
          `Nie można przypisać wartości do właściwości lub indeksatora „${m.owner ? m.owner + '.' : ''}${m.name}” — jest tylko do odczytu.`,
          `Property or indexer '${m.owner ? m.owner + '.' : ''}${m.name}' cannot be assigned to -- it is read only`,
        ),
      );
      return;
    }
    if (r.roIdx)
      err(
        'CS0200',
        tok,
        L(
          'Nie można przypisać wartości do indeksatora „string.this[int]” — jest tylko do odczytu (teksty są niezmienne).',
          "Property or indexer 'string.this[int]' cannot be assigned to -- it is read only",
        ),
      );
    if (target.k === 'lit' || target.k === 'call' || target.k === 'bin')
      err(
        'CS0131',
        tok,
        L(
          'Lewa strona przypisania musi być zmienną, właściwością lub indeksatorem.',
          'The left-hand side of an assignment must be a variable, property or indexer',
        ),
      );
  }
  function typeAssign(node, st) {
    const plain = node.op === '=';
    const tr = typeOf(node.a, st, { write: plain, rw: !plain });
    if (tr.member && tr.member.kind === 'e') {
      if (plain) {
        err(
          'CS0079',
          node.tok,
          L(
            `Zdarzenie „${tr.member.owner}.${tr.member.name}” może występować tylko po lewej stronie operatora += lub -=.`,
            `The event '${tr.member.owner}.${tr.member.name}' can only appear on the left hand side of += or -=`,
          ),
        );
        return R(null);
      }
      const h = typeOf(node.b, st, { lambdaParams: ['object', tr.member.type] });
      if (h.group && h.group.sigs) {
        const ok = h.group.sigs.some(s => {
          const ps = parseParams(s.params);
          if (ps.length !== 2) return false;
          const c = conv(tr.member.type, ps[1].type);
          return c !== 'none' && c !== 'exp';
        });
        if (!ok)
          err(
            'CS0123',
            node.b.tok,
            L(
              `Żadne przeciążenie „${h.name}” nie pasuje do delegata „${DELEGATE[tr.member.type] || 'EventHandler'}” (oczekiwano: object sender, ${tr.member.type} e).`,
              `No overload for '${h.name}' matches delegate '${DELEGATE[tr.member.type] || 'EventHandler'}'`,
            ),
          );
      }
      return R('void');
    }
    const vr = typeOf(node.b, st, { expected: tr.t });
    if (tr.sym) {
      if (plain) {
        st.A.add(tr.sym.id);
        tr.sym.writes++;
      } else {
        tr.sym.writes++;
      }
    }
    checkWritable(node.a, tr, st, node.a.tok || node.tok);
    if (!tr.t) return R(null);
    if (plain) {
      assignCheck(vr, tr.t, node.b, node.b.tok || node.tok);
      return R(tr.t);
    }
    // przypisanie złożone: x op= y  →  x = (T)(x op y), gdy y jest niejawnie konwertowalne do T
    if (node.op === '??=') return R(tr.t);
    const op = node.op.slice(0, -1);
    if (op === '+' && tr.t === 'string') return R('string');
    const res = binType(op, tr.t, vr.t, node, node.a, node.b);
    if (!res || !vr.t) return R(tr.t);
    const c1 = conv(res, tr.t, null);
    if (c1 === 'imp' || c1 === 'id' || c1 === '?') return R(tr.t);
    if (c1 === 'exp') {
      const c2 = conv(vr.t, tr.t, node.b);
      if (c2 === 'imp' || c2 === 'id' || c2 === '?' || op === '<<' || op === '>>') return R(tr.t);
      err('CS0266', node.b.tok || node.tok, M.c0266(vr.t, tr.t));
      return R(tr.t);
    }
    err('CS0029', node.tok, M.c0029(res, tr.t));
    return R(tr.t);
  }
  function binType(op, a, b, node, na, nb) {
    if (!a || !b) return null;
    a = norm(a);
    b = norm(b);
    const nullable = isNullable(a) || isNullable(b);
    const ua = under(a),
      ub = under(b);
    const fail = () => {
      if (isKnown(a) && isKnown(b) && a !== 'null' && b !== 'null')
        err(
          'CS0019',
          node.tok,
          L(
            `Operatora „${op}” nie można zastosować do operandów typu „${disp(a)}” i „${disp(b)}”.`,
            `Operator '${op}' cannot be applied to operands of type '${disp(a)}' and '${disp(b)}'`,
          ),
        );
      return null;
    };
    const lift = t => (nullable && t !== 'bool' && t !== 'string' ? t + '?' : t);
    if (['+', '-', '*', '/', '%'].includes(op)) {
      if (op === '+' && (a === 'string' || b === 'string')) {
        if (a === 'void' || b === 'void') return fail();
        return 'string';
      }
      if (op === '+' && (a === 'null' || b === 'null')) return null;
      if (NUM.has(ua) && NUM.has(ub)) {
        if (
          (ua === 'decimal' && (ub === 'float' || ub === 'double')) ||
          (ub === 'decimal' && (ua === 'float' || ua === 'double'))
        )
          return fail();
        if (ua === 'decimal' || ub === 'decimal') return lift('decimal');
        if (ua === 'double' || ub === 'double') return lift('double');
        if (ua === 'float' || ub === 'float') return lift('float');
        if (ua === 'ulong' || ub === 'ulong') {
          if (
            ['sbyte', 'short', 'int', 'long', 'nint'].includes(ua === 'ulong' ? ub : ua) &&
            constVal(ua === 'ulong' ? nb : na) == null
          )
            return fail();
          return lift('ulong');
        }
        if (ua === 'long' || ub === 'long') return lift('long');
        if (ua === 'uint' || ub === 'uint') {
          const o = ua === 'uint' ? ub : ua;
          if (['sbyte', 'short', 'int', 'nint'].includes(o)) return lift('long');
          return lift('uint');
        }
        return lift('int');
      }
      if (ua === 'DateTime' && ub === 'DateTime' && op === '-') return 'TimeSpan';
      if (ua === 'DateTime' && ub === 'TimeSpan' && (op === '+' || op === '-')) return 'DateTime';
      if (ua === 'TimeSpan' && ub === 'TimeSpan' && (op === '+' || op === '-')) return 'TimeSpan';
      if (isEnum(ua) && INTEGRAL.has(ub) && (op === '+' || op === '-')) return ua;
      return fail();
    }
    if (['<', '>', '<=', '>='].includes(op)) {
      if (NUM.has(ua) && NUM.has(ub)) {
        if (
          (ua === 'decimal' && (ub === 'float' || ub === 'double')) ||
          (ub === 'decimal' && (ua === 'float' || ua === 'double'))
        )
          return fail();
        return 'bool';
      }
      if (ua === ub && (['DateTime', 'TimeSpan'].includes(ua) || isEnum(ua))) return 'bool';
      return fail();
    }
    if (op === '==' || op === '!=') {
      if (a === 'null' || b === 'null') {
        if ((a === 'null' && isValue(b)) || (b === 'null' && isValue(a))) {
          /* porównanie typu wartości z null jest dozwolone (zawsze false) */
        }
        return 'bool';
      }
      if (NUM.has(ua) && NUM.has(ub)) return 'bool';
      if (ua === ub) return 'bool';
      const ab = conv(a, b),
        ba = conv(b, a);
      if (ab === '?' || ba === '?') return 'bool';
      if (ab === 'imp' || ba === 'imp' || (ab === 'exp' && !isValue(a) && !isValue(b))) return 'bool';
      return fail() || 'bool';
    }
    if (op === '&&' || op === '||') {
      if (ua !== 'bool' || ub !== 'bool') {
        fail();
        return 'bool';
      }
      if (isNullable(a) || isNullable(b)) {
        fail();
        return 'bool';
      }
      return 'bool';
    }
    if (op === '&' || op === '|' || op === '^') {
      if (ua === 'bool' && ub === 'bool') return lift('bool');
      if (INTEGRAL.has(ua) && INTEGRAL.has(ub)) return binType('+', ua, ub, node, na, nb);
      if (isEnum(ua) && ua === ub) return ua;
      return fail();
    }
    if (op === '<<' || op === '>>') {
      if (INTEGRAL.has(ua) && INTEGRAL.has(ub))
        return ['sbyte', 'byte', 'short', 'ushort', 'char'].includes(ua) ? 'int' : ua;
      return fail();
    }
    if (op === '??') {
      if (a === 'null') return b;
      if (isNullable(a)) {
        const c = conv(b, ua);
        return c === 'imp' || c === 'id' ? ua : a;
      }
      return a;
    }
    return null;
  }
  function typeBin(node, st) {
    if (node.op === '&&' || node.op === '||') {
      const a = typeOf(node.a, st);
      const b = typeOf(node.b, st);
      if (a.t && under(a.t) !== 'bool' && isKnown(a.t)) {
        binType(node.op, a.t, b.t || 'bool', node);
        return R('bool');
      }
      if (b.t && under(b.t) !== 'bool' && isKnown(b.t)) {
        binType(node.op, a.t || 'bool', b.t, node);
        return R('bool');
      }
      if (a.t === 'bool?' || b.t === 'bool?') binType(node.op, a.t, b.t, node);
      return R('bool');
    }
    const a = typeOf(node.a, st);
    const b = typeOf(node.b, st);
    if (a.group || b.group) {
      err(
        'CS0019',
        node.tok,
        L(
          `Operatora „${node.op}” nie można zastosować do grupy metod — brakuje nawiasów „()” przy wywołaniu metody „${(a.group ? a : b).name}”.`,
          `Operator '${node.op}' cannot be applied to a method group: the call to '${(a.group ? a : b).name}' is missing "()"`,
        ),
      );
      return R(null);
    }
    return R(binType(node.op, a.t, b.t, node, node.a, node.b));
  }
  function typeCall(node, st, opt) {
    const f = node.f;
    let g = null,
      recvR = null,
      name = '';
    if (f.k === 'name') {
      const sym = lookupLocal(st, f.v);
      if (sym && sym.fn) {
        g = { kind: 'm', sigs: sym.fn, exact: true, name: f.v };
        sym.reads++;
      } else if (sym) {
        sym.reads++;
        argsType(node.args, st);
        return R(null);
      } else {
        const r = resolveName(f, st, { call: true });
        if (r.group) g = r.group;
        name = f.v;
        if (!g) {
          argsType(node.args, st);
          return R(null);
        }
      }
      name = f.v;
    } else if (f.k === 'mem') {
      const r = typeOf(f, st);
      name = f.n;
      if (r.group) {
        g = r.group;
        recvR = r.recv;
      } else if (r.t && /Action|Func|Handler/.test(r.t)) {
        argsType(node.args, st);
        return R(null);
      } else {
        if (r.t && isKnown(r.t) && r.member)
          err(
            'CS1955',
            f.ntok,
            L(
              `Nie można wywołać składowej „${f.n}”, która nie jest metodą — usuń nawiasy „()”.`,
              `Non-invocable member '${f.n}' cannot be used like a method.`,
            ),
          );
        argsType(node.args, st);
        return R(null);
      }
    } else {
      typeOf(f, st);
      argsType(node.args, st);
      return R(null);
    }
    // typy argumentów (lambdy później)
    const argTypes = node.args.map(a => {
      if (a.decl) return a.decl.type === 'var' ? null : norm(a.decl.type);
      if (a.e && a.e.k === 'lambda') {
        a.lambda = true;
        return null;
      }
      const r = typeOf(a.e, st, { write: a.mod === 'out' });
      if (r.group) {
        a.group = true;
        return null;
      }
      if (a.mod === 'out' && r.sym) {
        st.A.add(r.sym.id);
        r.sym.writes++;
      }
      return r.t;
    });
    const res = resolve(g.sigs, node.args, argTypes, name, f.ntok || f.tok || node.tok, g.exact, st);
    const ps = res && res.sig ? res.sig.ps || parseParams(res.sig.s.params) : [];
    node.args.forEach((a, i) => {
      if (a.decl) {
        const pt = ps[i] ? ps[i].type : null;
        declare(st, a.decl.name && a.decl.name.v, a.decl.type === 'var' ? pt : a.decl.type, a.decl.name, {
          assigned: true,
          noWarn: true,
        });
      }
      if (a.lambda) {
        const pt = ps[i] ? ps[i].type : '';
        const m = /^(?:Func|Action|Predicate)<(.+)>$/.exec(pt || '');
        typeOf(a.e, st, { lambdaParams: m ? CS.splitTop(m[1], ',').map(x => x.trim()) : [] });
      }
    });
    if (!res || !res.sig) return R(null);
    let rt = res.sig.s ? res.sig.s.type : null;
    if (rt && (/\bT(Result|Key|Source)\b/.test(rt) || /^[A-Z]$/.test(rt) || /<[A-Z]>/.test(rt))) rt = null;
    return R(rt || null);
  }
  function argsType(args, st) {
    args.forEach(a => {
      if (a.decl)
        declare(st, a.decl.name && a.decl.name.v, a.decl.type === 'var' ? null : a.decl.type, a.decl.name, {
          assigned: true,
          noWarn: true,
        });
      else if (a.e) typeOf(a.e, st);
    });
  }
  function typeNew(node, st, opt) {
    let T = node.type ? norm(node.type) : opt.expected || null;
    if (node.anon) return R(null);
    if (node.arr) {
      let elem = T ? T.replace(/\[\]$/, '') : null;
      (node.dims || []).forEach(d => {
        const r = typeOf(d, st);
        if (r.t) {
          const c = conv(r.t, 'int', d);
          if (c === 'exp') err('CS0266', d.tok, M.c0266(r.t, 'int'));
          else if (c === 'none') err('CS0029', d.tok, M.c0029(r.t, 'int'));
        }
      });
      if (node.init)
        node.init.forEach(it => {
          if (it.kind === 'elem') {
            const r = typeOf(it.v, st);
            if (elem) assignCheck(r, elem, it.v, it.v.tok);
            else if (r.t && !elem) elem = r.t;
          }
        });
      if (node.type) checkTypeName(elem, node.tok);
      return R(elem ? elem + '[]' : null);
    }
    if (node.type) checkTypeName(node.type, node.tok);
    const argTypes = (node.args || []).map(a => (a.decl ? null : a.e && a.e.k === 'lambda' ? null : typeOf(a.e, st).t));
    const p = T ? P2(T) : null;
    if (p && USERT[p.base] && USERT[p.base].kind !== 'enum') {
      const ctors = USERT[p.base].members.filter(m => m.kind === 'ctor');
      const sigs = ctors.length ? ctors.map(c => ({ params: c.params || '', type: '' })) : [{ params: '', type: '' }];
      const r = resolve(sigs, node.args || [], argTypes, p.base, node.tok, false, st);
      if (r && r.unresolved === undefined && !r.sig) {
      }
      if (!r || r.failed || r.unresolved) {
        if (argTypes.every(t => t)) {
          const counts = sigs.map(s => parseParams(s.params).length);
          if (!counts.includes((node.args || []).length))
            err(
              'CS7036',
              node.tok,
              L(
                `Typ „${p.base}” nie zawiera konstruktora, który przyjmuje ${(node.args || []).length} argumentów.`,
                `'${p.base}' does not contain a constructor that takes ${(node.args || []).length} arguments`,
              ),
            );
          else {
            const s0 = sigs.find(s => parseParams(s.params).length === (node.args || []).length);
            resolve([s0], node.args, argTypes, p.base, node.tok, true, st);
          }
        }
      }
    } else if (p && CTORS[p.base]) {
      resolve(CTORS[p.base], node.args || [], argTypes, p.base, node.tok, true, st);
    } else if (p && IS.T[p.base] && IS.T[p.base].api && (IS.T[p.base].ctors || []).length) {
      resolve(
        IS.T[p.base].ctors.map(c => ({ params: subst(c.params, p), type: '' })),
        node.args || [],
        argTypes,
        p.base,
        node.tok,
        true,
        st,
      );
    } else if (p && TY[p.base] && (node.args || []).length)
      err(
        'CS1729',
        node.tok,
        L(
          `Typ „${p.base}” nie zawiera konstruktora, który przyjmuje ${(node.args || []).length} argumentów.`,
          `'${p.base}' does not contain a constructor that takes ${(node.args || []).length} arguments`,
        ),
      );
    if (node.init && T) {
      const elemT =
        p && (p.base === 'List' || p.base === 'HashSet' || p.base === 'Queue' || p.base === 'Stack') ? p.args[0] : null;
      node.init.forEach(it => {
        if (it.kind === 'member') {
          const m = lookupMember(T, it.name.v, false, it.name);
          if (it.v.k === 'initlist') return;
          const r = typeOf(it.v, st, { expected: m && m.type });
          if (m && m.type) {
            if (m.ro)
              err(
                'CS0200',
                it.name,
                L(
                  `Nie można przypisać wartości do właściwości „${it.name.v}” — jest tylko do odczytu.`,
                  `Property or indexer '${p.base}.${it.name.v}' cannot be assigned to -- it is read only`,
                ),
              );
            assignCheck(r, m.type, it.v, it.v.tok);
          }
        } else if (it.kind === 'elem') {
          const r = typeOf(it.v, st);
          if (elemT) assignCheck(r, elemT, it.v, it.v.tok);
        } else if (it.kind === 'index') {
          const k = typeOf(it.key, st);
          const v = typeOf(it.v, st);
          if (p.base === 'Dictionary') {
            assignCheck(k, p.args[0], it.key, it.key.tok);
            assignCheck(v, p.args[1], it.v, it.v.tok);
          }
        } else if (it.kind === 'nested' && p.base === 'Dictionary' && it.items.length === 2) {
          const k = typeOf(it.items[0].v, st),
            v = typeOf(it.items[1].v, st);
          assignCheck(k, p.args[0], it.items[0].v, it.items[0].v.tok);
          assignCheck(v, p.args[1], it.items[1].v, it.items[1].v.tok);
        }
      });
    }
    return R(T);
  }

  /* ---------- instrukcje i przepływ ---------- */
  const isStmtExpr = e =>
    e &&
    (e.k === 'asg' ||
      e.k === 'call' ||
      (e.k === 'un' && (e.op === '++' || e.op === '--')) ||
      e.k === 'await' ||
      e.k === 'new' ||
      e.k === 'throw');
  function constBool(e) {
    return e && e.k === 'lit' && e.t === 'bool' ? e.cv : null;
  }
  function hasBreak(s, depth = 0) {
    if (!s) return false;
    if (s.k === 'break') return depth === 0;
    if (['while', 'do', 'for', 'foreach'].includes(s.k)) return false;
    if (s.k === 'switch') return false;
    const kids =
      s.k === 'block'
        ? s.list
        : s.k === 'if'
          ? [s.a, s.b]
          : s.k === 'try'
            ? [s.b, ...s.cs.map(c => c.body), s.fin]
            : s.k === 'lock'
              ? [s.body]
              : [];
    return kids.some(k => hasBreak(k, depth));
  }
  function walkStmt(s, st) {
    if (!s) return st;
    switch (s.k) {
      case 'bad':
      case 'empty':
        return st;
      case 'block': {
        scopeNew(st);
        for (const x of s.list) walkStmt(x, st);
        scopePop(st);
        return st;
      }
      case 'decl': {
        for (const d of s.list) {
          let T = s.type === 'var' ? null : norm(s.type);
          if (s.type !== 'var') checkTypeName(s.type, s.tok.k === 'id' || s.tok.k === 'kw' ? s.tok : d.tok);
          if (d.init) {
            let r;
            if (d.init.k === 'arrinit') {
              r = R(T);
              d.init.items.forEach(it => {
                if (it.kind === 'elem') {
                  const er = typeOf(it.v, st);
                  if (T && /\[\]$/.test(T)) assignCheck(er, T.slice(0, -2), it.v, it.v.tok);
                }
              });
            } else r = typeOf(d.init, st, { expected: T });
            if (s.type === 'var') {
              if (r.t === 'null')
                err(
                  'CS0815',
                  d.tok,
                  L(
                    'Nie można przypisać wartości <null> do zmiennej o niejawnie określonym typie.',
                    'Cannot assign <null> to an implicitly-typed variable',
                  ),
                );
              else if (r.t === 'void')
                err(
                  'CS0815',
                  d.tok,
                  L(
                    'Nie można przypisać wartości void do zmiennej o niejawnie określonym typie.',
                    'Cannot assign void to an implicitly-typed variable',
                  ),
                );
              else if (r.group)
                err(
                  'CS8917',
                  d.tok,
                  L(
                    `Nie można określić typu delegata dla grupy metod „${r.name}” — brakuje „()” przy wywołaniu?`,
                    `The delegate type could not be inferred for method group '${r.name}'. Did you mean '${r.name}()'?`,
                  ),
                );
              T = r.t;
            } else assignCheck(r, T, d.init, d.init.tok || d.tok);
            declare(st, d.name, T, d.tok, {
              assigned: true,
              constInit: d.init.k === 'lit' || (d.init.k === 'un' && d.init.x.k === 'lit'),
              isConst: s.isConst,
            });
          } else {
            if (s.type === 'var')
              err(
                'CS0818',
                d.tok,
                L(
                  'Zmienne o niejawnie określonym typie (var) muszą zostać zainicjowane.',
                  'Implicitly-typed variables must be initialized',
                ),
              );
            if (s.isConst)
              err(
                'CS0145',
                d.tok,
                L('Pole const wymaga podania wartości.', 'A const field requires a value to be provided'),
              );
            declare(st, d.name, T, d.tok, {});
          }
        }
        return st;
      }
      case 'expr': {
        const r = typeOf(s.e, st);
        if (!isStmtExpr(s.e))
          err(
            'CS0201',
            s.e.tok || s.tok,
            L(
              'Jako instrukcji można użyć tylko przypisania, wywołania, inkrementacji, dekrementacji, await lub utworzenia obiektu (new).',
              'Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement',
            ) +
              (s.e.k === 'bin' && s.e.op === '=='
                ? L(' Czy chodziło o przypisanie „=”?', " Did you mean the assignment '='?")
                : ''),
          );
        return st;
      }
      case 'if': {
        const c = typeOf(s.c, st);
        checkBool(c.t, s.c);
        const cb = constBool(s.c);
        const a = cloneSt(st);
        walkStmt(s.a, a);
        const b = cloneSt(st);
        if (s.b) walkStmt(s.b, b);
        if (cb === true) setFrom(st, a);
        else if (cb === false) setFrom(st, b);
        else setFrom(st, merge(a, b));
        return st;
      }
      case 'while': {
        const c = typeOf(s.c, st);
        checkBool(c.t, s.c);
        const body = cloneSt(st);
        body.breaks = [];
        walkStmt(s.body, body);
        const inf = constBool(s.c) === true;
        let after = inf ? null : cloneSt(st);
        body.breaks.forEach(b => (after = merge(after, b)));
        setFrom(st, after || Object.assign(cloneSt(st), { dead: true }));
        return st;
      }
      case 'do': {
        const body = cloneSt(st);
        body.breaks = [];
        walkStmt(s.body, body);
        const c = typeOf(s.c, body);
        checkBool(c.t, s.c);
        let after = constBool(s.c) === true ? null : cloneSt(body);
        if (after) after.dead = false;
        body.breaks.forEach(b => (after = merge(after, b)));
        setFrom(st, after || Object.assign(cloneSt(st), { dead: true }));
        return st;
      }
      case 'for': {
        scopeNew(st);
        s.init.forEach(x => (x.k === 'decl' ? walkStmt(x, st) : typeOf(x.e, st)));
        if (s.c) {
          const c = typeOf(s.c, st);
          checkBool(c.t, s.c);
        }
        const body = cloneSt(st);
        body.breaks = [];
        walkStmt(s.body, body);
        s.it.forEach(e => typeOf(e, body));
        let after = s.c && constBool(s.c) !== true ? cloneSt(st) : null;
        body.breaks.forEach(b => (after = merge(after, b)));
        setFrom(st, after || Object.assign(cloneSt(st), { dead: true }));
        scopePop(st);
        return st;
      }
      case 'foreach': {
        const r = typeOf(s.e, st);
        let elem = null;
        if (r.t) {
          const p = P2(r.t);
          if (r.t === 'string') elem = 'char';
          else if (
            p &&
            (p.base === 'Array' ||
              p.base === 'List' ||
              p.base === 'HashSet' ||
              p.base === 'Queue' ||
              p.base === 'Stack' ||
              p.base === 'IEnumerable')
          )
            elem = p.args[0];
          else if (p && p.base === 'Dictionary') elem = `KeyValuePair<${p.args.join(', ')}>`;
          else if (p && p.base === 'ItemCollection') elem = 'object';
          else if (p && p.base === 'UIElementCollection') elem = 'UIElement';
          else if (NUM.has(r.t) || r.t === 'bool' || (isKnown(r.t) && (VALUE_TYPES.has(r.t) || TY[r.t])))
            err(
              'CS1579',
              s.e.tok,
              L(
                `Instrukcja foreach nie może działać na zmiennych typu „${r.t}”, ponieważ typ „${r.t}” nie zawiera publicznej definicji „GetEnumerator”.`,
                `foreach statement cannot operate on variables of type '${r.t}' because '${r.t}' does not contain a public instance or extension definition for 'GetEnumerator'`,
              ),
            );
        }
        let T = s.type === 'var' ? elem : norm(s.type);
        if (s.type !== 'var' && elem) {
          const c = conv(elem, T);
          if (c === 'none' && isKnown(elem) && isKnown(T))
            err(
              'CS0030',
              s.name,
              L(`Nie można przekonwertować typu „${elem}” na „${T}”.`, `Cannot convert type '${elem}' to '${T}'`),
            );
        }
        scopeNew(st);
        declare(st, s.name.v, T, s.name, { assigned: true, iter: true, noWarn: true });
        const body = cloneSt(st);
        body.breaks = [];
        walkStmt(s.body, body);
        scopePop(st);
        return st;
      }
      case 'switch': {
        const r = typeOf(s.e, st);
        let after = null;
        let hasDefault = false;
        const brk = [];
        for (const sec of s.secs) {
          const ss = cloneSt(st);
          scopeNew(ss);
          for (const lb of sec.labels) {
            if (lb.dflt) {
              hasDefault = true;
              continue;
            }
            if (lb.pat) {
              declare(ss, lb.pat.name.v, lb.pat.type, lb.pat.name, { assigned: true, noWarn: true });
              continue;
            }
            if (lb.v) {
              const cr = typeOf(lb.v, ss);
              if (r.t && cr.t && cr.t !== 'null') {
                const c = conv(cr.t, r.t, lb.v);
                if (c === 'none' && isKnown(cr.t) && isKnown(r.t)) err('CS0029', lb.v.tok, M.c0029(cr.t, r.t));
                else if (c === 'exp' && !isEnum(r.t)) err('CS0266', lb.v.tok, M.c0266(cr.t, r.t));
              }
            }
            if (lb.when) typeOf(lb.when, ss);
          }
          ss.breaks = brk;
          for (const x of sec.body) walkStmt(x, ss);
          scopePop(ss);
          if (!ss.dead)
            err(
              'CS0163',
              sec.labels[0].tok,
              L(
                `Sterowanie nie może przejść z jednej etykiety case („${sec.labels[0].v ? 'case' : 'default'}”) do następnej — dodaj „break;”.`,
                `Control cannot fall through from one case label ('${sec.labels[0].v ? 'case' : 'default'}') to another; add 'break;'`,
              ),
            );
        }
        brk.forEach(b => (after = merge(after, b)));
        if (!hasDefault) after = merge(after, cloneSt(st));
        setFrom(st, after || Object.assign(cloneSt(st), { dead: true }));
        return st;
      }
      case 'try': {
        const t1 = cloneSt(st);
        walkStmt(s.b, t1);
        let after = t1;
        for (const c of s.cs) {
          const cs = cloneSt(st);
          scopeNew(cs);
          if (c.type) checkTypeName(c.type, c.tok);
          if (c.name) declare(cs, c.name.v, c.type, c.name, { assigned: true });
          walkStmt(c.body, cs);
          scopePop(cs);
          after = merge(after, cs);
        }
        setFrom(st, after);
        if (s.fin) {
          const f = cloneSt(st);
          f.dead = false;
          walkStmt(s.fin, f);
          if (f.dead) st.dead = true;
          f.A.forEach(x => st.A.add(x));
        }
        return st;
      }
      case 'return': {
        if (st.inLambda) {
          if (s.e) typeOf(s.e, st);
          st.dead = true;
          return st;
        }
        const rt = st.retType;
        if (s.e) {
          const r = typeOf(s.e, st, { expected: rt });
          if (rt === 'void')
            err(
              'CS0127',
              s.tok,
              L(
                `Ponieważ „${st.method}” zwraca void, po słowie kluczowym return nie może wystąpić wyrażenie.`,
                `Since '${st.method}' returns void, a return keyword must not be followed by an object expression`,
              ),
            );
          else if (rt) assignCheck(r, rt, s.e, s.e.tok);
        } else if (rt && rt !== 'void' && !st.isAsyncVoid)
          err(
            'CS0126',
            s.tok,
            L(
              `Wymagany jest obiekt typu konwertowalnego na „${rt}”.`,
              `An object of a type convertible to '${rt}' is required`,
            ),
          );
        st.dead = true;
        return st;
      }
      case 'throw': {
        if (s.e) typeOf(s.e, st);
        st.dead = true;
        return st;
      }
      case 'break': {
        if (st.breaks) st.breaks.push(cloneSt(st));
        st.dead = true;
        return st;
      }
      case 'continue': {
        st.dead = true;
        return st;
      }
      case 'lock':
        typeOf(s.e, st);
        walkStmt(s.body, st);
        return st;
      case 'yield':
        typeOf(s.e, st);
        return st;
      case 'localfn': {
        const ps = s.params;
        const sig = [
          { params: ps.map(p => `${p.mod ? p.mod + ' ' : ''}${p.type} ${p.name}`).join(', '), type: s.type },
        ];
        const sym = declare(st, s.name.v, null, s.name, { assigned: true, noWarn: true });
        if (sym) sym.fn = sig;
        const inner = Object.assign(cloneSt(st), {
          retType: norm(s.type),
          method: s.name.v,
          inLambda: false,
          breaks: null,
        });
        scopeNew(st, true);
        ps.forEach(p => declare(st, p.name, p.type, p.tok, { kind: 'param', assigned: true }));
        inner.scopes = st.scopes;
        if (s.body.k === 'block') walkStmt(s.body, inner);
        else {
          const r = typeOf(s.body, inner);
          if (inner.retType && inner.retType !== 'void') assignCheck(r, inner.retType, s.body, s.body.tok);
        }
        scopePop(st);
        return st;
      }
    }
    return st;
  }

  /* ---------- składowe klas ---------- */
  function typeFromHdr(m) {
    const rest = (m.hdr || '').slice((m.mods || '').length).trim();
    const mm = /^(.*?)\s*\b(\w+)\s*(?:<[^>]*>)?\s*(\(|=>|$)/.exec(rest);
    return mm
      ? mm[1].replace(/\b(async|override|virtual|abstract|new|static|partial|sealed|extern|unsafe)\s+/g, '').trim()
      : '';
  }
  function checkMember(ty, m, toks, code, st0) {
    const st = {
      scopes: [],
      A: new Set(),
      dead: false,
      symId: 0,
      cls: ty.name,
      isStaticCtx: !!m.isStatic,
      retType: null,
      method: m.name,
      breaks: null,
      inCtorOf: null,
    };
    const range = (a, b) => {
      const lo = bs(toks, a),
        hi = bs(toks, b);
      return toks
        .slice(lo, hi)
        .concat([
          {
            k: 'eof',
            v: '',
            line: toks[Math.max(0, hi - 1)] ? toks[Math.max(0, hi - 1)].line : 1,
            col: 1,
            len: 0,
            pos: b,
          },
        ]);
    };
    if (m.kind === 'method') {
      const isCtor = m.name === ty.name;
      const rt = isCtor ? 'void' : norm(typeFromHdr(m)) || null;
      const isAsync = /\basync\b/.test(m.mods || '');
      st.retType = isAsync
        ? rt === 'Task' || rt === 'void'
          ? 'void'
          : P2(rt) && P2(rt).base === 'Task'
            ? P2(rt).args[0]
            : rt
        : rt;
      st.isAsyncVoid = isAsync;
      if (isCtor) st.inCtorOf = ty.name;
      scopeNew(st, true);
      const ps = parseParams(m.params || '');
      ps.forEach(p => {
        if (p.type) checkTypeName(p.type, null);
        const sym = declare(st, p.name, p.type, null, { kind: 'param', assigned: p.mod !== 'out', noWarn: true });
      });
      if (m.body && m.body.close > 0) {
        const tk = range(m.body.open, m.body.close + 1);
        const p = new Parser(tk);
        let blk;
        try {
          blk = p.block();
        } catch (e) {
          if (!(e instanceof PE)) throw e;
          scopePop(st);
          return;
        }
        walkStmt(blk, st);
        if (st.retType && st.retType !== 'void' && !st.dead && !/\b(abstract|extern|partial)\b/.test(m.mods || '')) {
          const ntok = findTok(toks, m.name, m.line);
          err(
            'CS0161',
            ntok || { line: m.line, col: 1, len: 1 },
            L(
              `„${ty.name}.${m.name}(${ps.map(x => x.type).join(', ')})”: nie wszystkie ścieżki kodu zwracają wartość.`,
              `'${ty.name}.${m.name}(${ps.map(x => x.type).join(', ')})': not all code paths return a value`,
            ),
          );
        }
      }
      scopePop(st);
    } else if (m.kind === 'prop' && m.body) {
      const pt = norm(m.type);
      const body = code.slice(m.body.open + 1, m.body.close);
      const gm = /\bget\s*\{/.exec(body);
      if (gm) {
        const o = m.body.open + 1 + gm.index + gm[0].length - 1;
        const c = CS.match(code, o, '{', '}');
        if (c > 0) {
          st.retType = pt;
          scopeNew(st, true);
          const p = new Parser(range(o, c + 1));
          try {
            const blk = p.block();
            walkStmt(blk, st);
            if (!st.dead && pt)
              err(
                'CS0161',
                findTok(toks, m.name, m.line) || { line: m.line, col: 1, len: 1 },
                L(
                  `„${ty.name}.${m.name}.get”: nie wszystkie ścieżki kodu zwracają wartość.`,
                  `'${ty.name}.${m.name}.get': not all code paths return a value`,
                ),
              );
          } catch (e) {
            if (!(e instanceof PE)) throw e;
          }
          scopePop(st);
        }
      }
      const sm = /\bset\s*\{/.exec(body);
      if (sm) {
        const o = m.body.open + 1 + sm.index + sm[0].length - 1;
        const c = CS.match(code, o, '{', '}');
        if (c > 0) {
          const s2 = Object.assign({}, st, { scopes: [], A: new Set(), dead: false, retType: 'void', method: m.name });
          scopeNew(s2, true);
          declare(s2, 'value', pt, null, { kind: 'param', assigned: true, noWarn: true });
          const p = new Parser(range(o, c + 1));
          try {
            walkStmt(p.block(), s2);
          } catch (e) {
            if (!(e instanceof PE)) throw e;
          }
          scopePop(s2);
        }
      }
    }
  }
  function bs(toks, pos) {
    let lo = 0,
      hi = toks.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (toks[mid].pos < pos) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
  function findTok(toks, name, line) {
    return toks.find(t => t.line === line && t.v === name) || null;
  }
  function checkExprMembers(ty, toks, code) {
    // pola z inicjalizatorem i składowe z ciałem wyrażeniowym (=>)
    const st = {
      scopes: [{ vars: new Map(), boundary: true }],
      A: new Set(),
      dead: false,
      symId: 0,
      cls: ty.name,
      isStaticCtx: false,
      retType: null,
      method: '',
      breaks: null,
    };
    const openTok = bs(toks, ty.open + 1),
      closeTok = bs(toks, ty.close);
    let i = openTok,
      depth = 0;
    while (i < closeTok) {
      const t = toks[i];
      if (t.k === 'op' && t.v === '{') {
        depth++;
        i++;
        continue;
      }
      if (t.k === 'op' && t.v === '}') {
        depth--;
        i++;
        continue;
      }
      if (depth === 0 && t.k === 'op' && (t.v === '=' || t.v === '=>')) {
        // znajdź początek deklaracji (po ; lub } lub {)
        let j = i - 1;
        while (j > openTok && !(toks[j].k === 'op' && [';', '}', '{', ']'].includes(toks[j].v))) j--;
        const hdr = toks.slice(j + 1, i);
        if (
          !hdr.length ||
          hdr.some(x => x.k === 'op' && ((x.v === '(' && t.v === '=') || x.v === '=' || x.v === ','))
        ) {
          i++;
          continue;
        }
        const mods = new Set([
          'public',
          'private',
          'protected',
          'internal',
          'static',
          'readonly',
          'const',
          'override',
          'virtual',
          'new',
          'sealed',
          'async',
          'volatile',
          'required',
        ]);
        const core = hdr.filter(x => !(x.k === 'kw' || x.k === 'id') || !mods.has(x.v));
        const isStatic = hdr.some(x => x.v === 'static' || x.v === 'const');
        if (t.v === '=>' && core.some(x => x.v === '(')) {
          // metoda z ciałem wyrażeniowym
          const pi = core.findIndex(x => x.v === '(');
          const nameTok = core[pi - 1];
          const rtToks = core.slice(0, pi - 1);
          const rt = rtToks
            .map(x => x.v)
            .join('')
            .replace(/,/g, ', ');
          let e = i + 1;
          let d = 0;
          while (e < closeTok && !(d === 0 && toks[e].k === 'op' && toks[e].v === ';')) {
            if ('([{'.includes(toks[e].v) && toks[e].k === 'op') d++;
            else if (')]}'.includes(toks[e].v) && toks[e].k === 'op') d--;
            e++;
          }
          const s2 = Object.assign({}, st, {
            scopes: [],
            A: new Set(),
            dead: false,
            isStaticCtx: isStatic,
            retType: norm(rt),
            method: nameTok ? nameTok.v : '',
          });
          scopeNew(s2, true);
          const pstr = toks.slice(j + 1, e).length
            ? (() => {
                const a = core.findIndex(x => x.v === '(');
                let b = a,
                  dd = 0;
                for (; b < core.length; b++) {
                  if (core[b].v === '(') dd++;
                  else if (core[b].v === ')') {
                    dd--;
                    if (!dd) break;
                  }
                }
                return code.slice(core[a].end, core[b].pos);
              })()
            : '';
          parseParams(pstr).forEach(p =>
            declare(s2, p.name, p.type, null, { kind: 'param', assigned: true, noWarn: true }),
          );
          try {
            const p = new Parser(
              toks.slice(i + 1, e).concat([{ k: 'eof', v: '', line: t.line, col: 1, len: 0, pos: 0 }]),
            );
            const ex = p.expr();
            const r = typeOf(ex, s2, { expected: norm(rt) });
            if (rt && rt !== 'void' && nameTok && nameTok.v !== ty.name) assignCheck(r, norm(rt), ex, ex.tok);
          } catch (e2) {
            if (!(e2 instanceof PE)) throw e2;
          }
          scopePop(s2);
          i = e + 1;
          continue;
        }
        const nameTok = core[core.length - 1];
        const rt = core
          .slice(0, -1)
          .map(x => x.v)
          .join('')
          .replace(/,/g, ', ')
          .replace(/(\w)(\w)/g, '$1$2');
        let e = i + 1;
        let d = 0;
        while (e < closeTok && !(d === 0 && toks[e].k === 'op' && (toks[e].v === ';' || toks[e].v === ','))) {
          if (toks[e].k === 'op' && '([{'.includes(toks[e].v)) d++;
          else if (toks[e].k === 'op' && ')]}'.includes(toks[e].v)) d--;
          if (d < 0) break;
          e++;
        }
        if (!nameTok || nameTok.k !== 'id' || core.length < 2) {
          i = e + 1;
          continue;
        }
        const T = norm(typeText(core.slice(0, -1)));
        const s2 = Object.assign({}, st, { isStaticCtx: isStatic, retType: T });
        try {
          const p = new Parser(
            toks.slice(i + 1, e).concat([{ k: 'eof', v: '', line: t.line, col: 1, len: 0, pos: 0 }]),
          );
          const ex = toks[i + 1] && toks[i + 1].v === '{' && t.v === '=' ? null : p.expr();
          if (ex) {
            const r = typeOf(ex, s2, { expected: T });
            assignCheck(r, T, ex, ex.tok);
          }
        } catch (e2) {
          if (!(e2 instanceof PE)) throw e2;
        }
        i = e + 1;
        continue;
      }
      i++;
    }
  }
  function typeText(tks) {
    let s = '';
    tks.forEach((x, k) => {
      const prev = tks[k - 1];
      if (k && prev && (prev.k === 'id' || prev.k === 'kw') && (x.k === 'id' || x.k === 'kw')) s += ' ';
      s += x.v;
      if (x.v === ',') s += ' ';
    });
    return s;
  }

  /* ---------- wejście ---------- */

  /* ---------- instrumentacja dla debugera: ślad wykonania (wiersze, zmienne, stos wywołań) ---------- */
  function instrument(code, strs, file, DBG) {
    const toks = lex(code, strs);
    let types;
    try {
      types = CS.scanTypes(code);
    } catch (e) {
      return code;
    }
    const ins = [];
    let seq = 0;
    const add = (pos, text, pri) => ins.push({ pos, text, pri, seq: seq++ });
    const lines = (DBG.lines[file] = DBG.lines[file] || new Set());
    const range = (a, b) => {
      const lo = bs(toks, a),
        hi = bs(toks, b);
      return toks
        .slice(lo, hi)
        .concat([
          {
            k: 'eof',
            v: '',
            line: toks[Math.max(0, hi - 1)] ? toks[Math.max(0, hi - 1)].line : 1,
            col: 1,
            len: 0,
            pos: b,
            end: b,
          },
        ]);
    };
    for (const ty of types) {
      if (!['class', 'struct', 'record'].includes(ty.tkind) || ty.open < 0) continue;
      const u = USERT[ty.name];
      const isMain = ty.name === 'MainWindow' || (u && u.base === 'Window');
      const fields =
        isMain && u
          ? u.members
              .filter(m => (m.kind === 'f' || m.kind === 'p') && !/^__/.test(m.name))
              .map(m => ({ name: m.name, type: m.type || '', field: true }))
          : [];
      for (const m of ty.members) {
        if (m.kind !== 'method' || !m.body || m.body.close <= 0) continue;
        let blk;
        try {
          blk = new Parser(range(m.body.open, m.body.close + 1)).block();
        } catch (e) {
          continue;
        }
        const isCtor = m.name === ty.name;
        const label = `${ty.name}.${isCtor ? ty.name : m.name}(${parseParams(m.params || '')
          .map(p => p.type)
          .join(', ')})`;
        const isStatic = !!m.isStatic;
        const self = !isMain && !isStatic ? [{ name: 'this', type: ty.name, self: true }] : [];
        const params = parseParams(m.params || '').map(p => ({
          name: p.name,
          type: (p.mod === 'out' || p.mod === 'ref' ? p.mod + ' ' : '') + (p.type || ''),
        }));
        const frame = (b, lab, line, names) => {
          const id = DBG.methods.length;
          DBG.methods.push({ label: lab, file, line });
          add(b.tok.end, `__E(${id});try{`, 0);
          add(b.end.pos, `}catch(System.Exception __dbgE){__XE(__dbgE);throw __dbgE;}finally{__X();}`, 5000);
          walkList(b.list, names, 1, lab);
        };
        const walkList = (list, names, depth, lab) => {
          let cur = names.slice();
          for (const s of list) {
            stmt(s, cur, true, depth, lab);
            if (s && s.k === 'decl') cur = cur.concat(s.list.map(d => ({ name: d.name, type: s.type })));
          }
        };
        const T = (line, names) => {
          lines.add(line);
          const id = DBG.metas.length;
          DBG.metas.push(names.map(n => ({ name: n.name, type: n.type, field: !!n.field, self: !!n.self })));
          return `__T(${line},${id},()=>[${names.map(n => (n.self ? 'this' : n.name)).join(',')}]);`;
        };
        const lambdas = (node, names, depth, lab) => {
          const seen = new Set();
          const go = x => {
            if (!x || typeof x !== 'object' || seen.has(x)) return;
            seen.add(x);
            if (Array.isArray(x)) {
              x.forEach(go);
              return;
            }
            if (x.k === 'lambda') {
              if (x.body && x.body.k === 'block' && x.body.tok)
                frame(
                  x.body,
                  lab.replace(/\(.*$/, '') + '.AnonymousMethod()',
                  x.tok.line,
                  names.concat(x.params.map(p => ({ name: p.name, type: p.type || '' }))),
                );
              return;
            }
            for (const k in x) {
              if (k === 'tok' || k === 'last' || k === 'end' || k === 'ntok' || k === 'name') continue;
              const v = x[k];
              if (v && typeof v === 'object') go(v);
            }
          };
          go(node);
        };
        const stmt = (s, names, inBlock, depth, lab) => {
          if (!s || s.k === 'bad' || !s.tok) return;
          if (s.k === 'block') {
            walkList(s.list, names, depth + 1, lab);
            return;
          }
          const all = names.concat(fields);
          if (inBlock) add(s.tok.pos, T(s.tok.line, all), 10 + depth);
          else if (s.last) {
            add(s.tok.pos, '{' + T(s.tok.line, all), 10 + depth);
            add(s.last.end, '}', 1000 - depth);
          } else return;
          switch (s.k) {
            case 'if':
              lambdas(s.c, names, depth, lab);
              stmt(s.a, names, false, depth + 1, lab);
              if (s.b) stmt(s.b, names, false, depth + 1, lab);
              break;
            case 'while':
            case 'do':
              lambdas(s.c, names, depth, lab);
              stmt(s.body, names, false, depth + 1, lab);
              break;
            case 'lock':
              stmt(s.body, names, false, depth + 1, lab);
              break;
            case 'for': {
              let n2 = names;
              (s.init || []).forEach(d => {
                if (d.k === 'decl') n2 = n2.concat(d.list.map(x => ({ name: x.name, type: d.type })));
              });
              stmt(s.body, n2, false, depth + 1, lab);
              break;
            }
            case 'foreach':
              lambdas(s.e, names, depth, lab);
              stmt(s.body, names.concat([{ name: s.name.v, type: s.type }]), false, depth + 1, lab);
              break;
            case 'switch':
              s.secs.forEach(sec => walkList(sec.body, names, depth + 1, lab));
              break;
            case 'try':
              walkList(s.b.list, names, depth + 1, lab);
              s.cs.forEach(c =>
                walkList(
                  c.body.list,
                  c.name ? names.concat([{ name: c.name.v, type: c.type || 'Exception' }]) : names,
                  depth + 1,
                  lab,
                ),
              );
              if (s.fin) walkList(s.fin.list, names, depth + 1, lab);
              break;
            case 'localfn':
              break;
            default:
              lambdas(s, names, depth, lab);
          }
        };
        frame(blk, label, m.line, self.concat(params));
      }
    }
    ins.sort((a, b) => b.pos - a.pos || b.pri - a.pri || b.seq - a.seq);
    let out = code;
    for (const x of ins) out = out.slice(0, x.pos) + x.text + out.slice(x.pos);
    return out;
  }
  function check(files, ctx) {
    ERRS = [];
    CTRL = {};
    walk(n => {
      if (n.name) CTRL[n.name] = n.t;
    });
    USERT = {};
    files.forEach(f => {
      try {
        CS.memberSigs(f.src).forEach(r => {
          USERT[r.name] = r;
        });
      } catch (e) {}
    });
    if (USERT.MainWindow && !USERT.MainWindow.base) USERT.MainWindow.base = 'Window';
    for (const f of files) {
      FILE = f.name;
      let tk;
      try {
        tk = CS.tokenize(f.src);
      } catch (e) {
        continue;
      }
      const toks = lex(tk.code, tk.strs);
      let types;
      try {
        types = CS.scanTypes(tk.code);
      } catch (e) {
        continue;
      }
      for (const ty of types) {
        if (!['class', 'struct', 'record'].includes(ty.tkind) || ty.open < 0) continue;
        for (const m of ty.members) {
          try {
            checkMember(ty, m, toks, tk.code);
          } catch (e) {
            if (!(e instanceof PE)) console.warn('SEM', e);
          }
        }
        try {
          checkExprMembers(ty, toks, tk.code);
        } catch (e) {
          if (!(e instanceof PE)) console.warn('SEM', e);
        }
      }
    }
    // metody obsługi zdarzeń z XAML: zgodność typów parametrów
    (ctx.handlers || []).forEach(h => {
      const mw = USERT.MainWindow;
      if (!mw) return;
      const ms = mw.members.filter(m => m.kind === 'm' && m.name === h.name);
      if (!ms.length) return;
      const ok = ms.some(m => {
        const ps = parseParams(m.params);
        if (ps.length !== 2) return true;
        const c = conv(norm(h.args), ps[1].type);
        return c !== 'none' && c !== 'exp';
      });
      if (!ok) {
        const m = ms[0];
        FILE = 'MainWindow.xaml.cs';
        ERRS.push({
          sev: 'err',
          code: 'CS0123',
          msg: L(
            `Żadne przeciążenie „${h.name}” nie pasuje do delegata „${DELEGATE[h.args] || 'RoutedEventHandler'}” — zdarzenie ${h.event} przekazuje parametr typu „${h.args}”.`,
            `No overload for '${h.name}' matches delegate '${DELEGATE[h.args] || 'RoutedEventHandler'}': event ${h.event} passes a parameter of type '${h.args}'`,
          ),
          file: 'MainWindow.xaml.cs',
          line: m.line,
        });
      }
    });
    return ERRS;
  }
  return { check, lex, Parser, conv, norm, typeOf, numLit, instrument };
})();
