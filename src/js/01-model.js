/**
 * CappyCoder WPF — 01 · Model projektu i XAML
 *
 * Zadanie: Definicje kontrolek WPF z przybornika (TY), model projektu P (drzewo kontrolek, pliki, pakiety),
 *   generowanie XAML z modelu (genXaml) i wczytywanie modelu z XAML (parseXaml).
 * Zależy od: csharp.js
 * Udostępnia: $, $$, P, TY, genXaml, parseXaml, walk, …
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s =>
  String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const clone = o => JSON.parse(JSON.stringify(o));
const LS = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  },
};

/* ---------- ikony przybornika ---------- */
const GL = {
  btn: '<rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M5 8h6"/>',
  chk: '<rect x="2" y="2" width="12" height="12" rx="1.5"/><path d="M4.5 8.2l2.3 2.3 4.7-5"/>',
  radio: '<circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2.5" fill="currentColor"/>',
  txt: '<rect x="1.5" y="4" width="13" height="8"/><path d="M4 6v4"/>',
  lbl: '<path d="M3 12l3-8h1l3 8M4.2 9h4.6M12 5v7"/>',
  tb: '<path d="M3 4h10M8 4v9"/>',
  combo: '<rect x="1.5" y="4" width="13" height="8"/><path d="M10 4v8M11.3 7l1.2 1.4L13.7 7"/>',
  list: '<rect x="1.5" y="1.5" width="13" height="13"/><path d="M4 5h8M4 8h8M4 11h5"/>',
  lview: '<rect x="1.5" y="1.5" width="13" height="13"/><path d="M4 5h1M7 5h5M4 8h1M7 8h5M4 11h1M7 11h5"/>',
  table: '<rect x="1.5" y="2.5" width="13" height="11"/><path d="M1.5 6h13M1.5 9.5h13M6 2.5v11M10.5 2.5v11"/>',
  grid: '<rect x="1.5" y="1.5" width="13" height="13" stroke-dasharray="2 1.5"/><path d="M8 1.5v13M1.5 8h13"/>',
  img: '<rect x="1.5" y="2.5" width="13" height="11"/><path d="M2 12l4-4 3 3 2-2 3 3"/><circle cx="11" cy="5.5" r="1"/>',
  rect: '<rect x="2" y="3.5" width="12" height="9"/>',
  ellipse: '<ellipse cx="8" cy="8" rx="6.5" ry="5"/>',
  line: '<path d="M2.5 13.5l11-11"/>',
  stack: '<rect x="2" y="1.5" width="12" height="13"/><path d="M4 4.5h8M4 8h8M4 11.5h8"/>',
  wrap: '<rect x="1.5" y="2" width="13" height="12"/><path d="M3.5 5h3M8 5h4.5M3.5 8.5h5M10 8.5h2.5M3.5 12h3"/>',
  dock: '<rect x="1.5" y="1.5" width="13" height="13"/><path d="M1.5 5h13M5 5v9.5M11 5v9.5"/>',
  uni: '<rect x="1.5" y="1.5" width="13" height="13"/><path d="M6 1.5v13M10.5 1.5v13M1.5 6h13M1.5 10.5h13"/>',
  canvas: '<rect x="1.5" y="1.5" width="13" height="13"/><path d="M4 11l3-5 2 3 3-4"/>',
  tab: '<path d="M1.5 14.5V3.5h5l1 2h7v9z"/>',
  border: '<rect x="1.5" y="1.5" width="13" height="13" rx="3"/><rect x="4" y="4" width="8" height="8" rx="1"/>',
  group: '<path d="M5 3.5H1.5v11h13v-11H11M6 3.5h4"/>',
  exp: '<circle cx="5" cy="5" r="3"/><path d="M3.8 4.5L5 5.7 6.2 4.5M10 5h4.5M1.5 10h13"/>',
  cal: '<rect x="1.5" y="2.5" width="13" height="12"/><path d="M1.5 6h13M5 1v3M11 1v3M4 9h1M7.5 9h1M11 9h1M4 12h1M7.5 12h1"/>',
  date: '<rect x="1.5" y="4" width="13" height="8"/><path d="M10 4v8M11 6.5h2.5M11 9h2.5"/>',
  menu: '<path d="M1.5 3.5h13M3 3.5v3M7 3.5v3"/><rect x="3" y="6.5" width="8" height="7"/>',
  tree: '<path d="M3 2v11h4M3 7h4"/><rect x="8" y="5" width="6" height="4"/><rect x="8" y="11" width="6" height="4"/>',
  slider: '<path d="M1.5 8h13"/><rect x="6.5" y="4" width="3" height="8" rx="1" fill="currentColor"/>',
  progress:
    '<rect x="1.5" y="5.5" width="13" height="5"/><rect x="1.5" y="5.5" width="8" height="5" fill="currentColor"/>',
  sbar: '<rect x="5" y="1.5" width="6" height="13"/><rect x="6.5" y="5" width="3" height="5" fill="currentColor"/>',
  sview:
    '<rect x="1.5" y="1.5" width="13" height="13"/><path d="M11.5 1.5v13"/><rect x="12" y="4" width="2" height="4" fill="currentColor"/>',
  sep: '<path d="M1.5 8h13"/>',
  pwd: '<rect x="1.5" y="4" width="13" height="8"/><circle cx="5" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="11" cy="8" r="1" fill="currentColor"/>',
  rich: '<rect x="1.5" y="1.5" width="13" height="13"/><path d="M4 5h8M4 8h8M4 11h5M10.5 10.5l2 2"/>',
  media: '<rect x="1.5" y="2.5" width="13" height="11"/><path d="M6.5 5.5v5l4-2.5z" fill="currentColor"/>',
  ink: '<path d="M2 12c2-6 4 2 6-3s3-4 6-3"/>',
  rbtn: '<rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M5 8h6M9 6l2 2-2 2"/>',
  tbtn: '<rect x="1.5" y="4" width="13" height="8" rx="4"/><circle cx="10.5" cy="8" r="2.2" fill="currentColor"/>',
  status: '<rect x="1.5" y="9" width="13" height="5"/><path d="M6 9v5"/>',
  toolbar: '<rect x="1.5" y="3" width="13" height="6"/><path d="M3.5 4.5v3M6 4.5h2v3H6zM10 4.5h2v3h-2z"/>',
  view: '<rect x="2" y="2" width="12" height="12"/><path d="M4 9l3-3 2 2 3-3"/>',
  win: '<rect x="1.5" y="2" width="13" height="12"/><path d="M1.5 5h13"/>',
  poly: '<path d="M8 2l6 4.5-2.3 7.5H4.3L2 6.5z"/>',
  hyper: '<path d="M6.5 9.5l3-3M7 4.5l1.5-1.5a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5L7.5 13A2.5 2.5 0 0 1 4 9.5L5.5 8"/>',
};
const glyph = g => `<svg viewBox="0 0 16 16" aria-hidden="true">${GL[g] || GL.win}</svg>`;

/* ---------- definicje kontrolek ---------- */
const FE_EV = [
  'Loaded',
  'MouseDown',
  'MouseUp',
  'MouseLeftButtonDown',
  'MouseRightButtonDown',
  'MouseEnter',
  'MouseLeave',
  'MouseMove',
  'MouseWheel',
  'KeyDown',
  'KeyUp',
  'GotFocus',
  'LostFocus',
  'SizeChanged',
  'PreviewMouseDown',
  'PreviewKeyDown',
];
const CTL_EV = ['MouseDoubleClick', ...FE_EV];
const BASE = [
  'Width',
  'Height',
  'HorizontalAlignment',
  'VerticalAlignment',
  'Margin',
  'Visibility',
  'IsEnabled',
  'Opacity',
  'ToolTip',
  'Cursor',
  'Panel.ZIndex',
  'Tag',
  'ClipToBounds',
  'MinWidth',
  'MinHeight',
  'MaxWidth',
  'MaxHeight',
];
const CTLP = [
  'Background',
  'Foreground',
  'BorderBrush',
  'BorderThickness',
  'Padding',
  'FontFamily',
  'FontSize',
  'FontWeight',
  'FontStyle',
  'HorizontalContentAlignment',
  'VerticalContentAlignment',
  'TabIndex',
  'IsTabStop',
];
const TXTP = [
  'Background',
  'Foreground',
  'FontFamily',
  'FontSize',
  'FontWeight',
  'FontStyle',
  'Padding',
  'TextWrapping',
  'TextAlignment',
  'TextTrimming',
  'TextDecorations',
  'LineHeight',
];
const TY = {
  Button: {
    c: 1,
    g: 'btn',
    w: 75,
    h: 20,
    d: { Content: 'Button' },
    de: 'Click',
    ev: ['Click'],
    pr: ['Content', 'IsDefault', 'IsCancel', 'ClickMode'],
    k: 'ctl',
  },
  CheckBox: {
    c: 1,
    g: 'chk',
    d: { Content: 'CheckBox' },
    de: 'Checked',
    ev: ['Checked', 'Unchecked', 'Click', 'Indeterminate'],
    pr: ['Content', 'IsChecked', 'IsThreeState'],
    k: 'ctl',
  },
  ComboBox: {
    c: 1,
    g: 'combo',
    w: 120,
    h: 22,
    d: {},
    de: 'SelectionChanged',
    ev: ['SelectionChanged', 'DropDownOpened', 'DropDownClosed'],
    pr: ['Items', 'SelectedIndex', 'IsEditable', 'Text', 'MaxDropDownHeight'],
    k: 'ctl',
    it: 'flat',
    itTag: 'ComboBoxItem',
  },
  DataGrid: {
    c: 1,
    g: 'table',
    w: 240,
    h: 140,
    get d() {
      return { Columns: L('Imie\nNazwisko', 'FirstName\nLastName') };
    },
    de: 'SelectionChanged',
    ev: ['SelectionChanged', 'CellEditEnding', 'BeginningEdit'],
    pr: [
      'Columns',
      'AutoGenerateColumns',
      'CanUserAddRows',
      'IsReadOnly',
      'SelectionMode',
      'GridLinesVisibility',
      'AlternatingRowBackground',
    ],
    k: 'ctl',
  },
  Grid: {
    c: 1,
    g: 'grid',
    w: 100,
    h: 100,
    d: {},
    de: 'Loaded',
    ev: [],
    pr: ['Background', 'ShowGridLines'],
    k: 'pnl',
    cont: 'abs',
  },
  Image: {
    c: 1,
    g: 'img',
    w: 100,
    h: 100,
    d: {},
    de: 'MouseDown',
    ev: ['ImageFailed'],
    pr: ['Source', 'Stretch', 'StretchDirection'],
    k: 'fe',
  },
  Label: { c: 1, g: 'lbl', d: { Content: 'Label' }, de: 'MouseDown', ev: [], pr: ['Content', 'Target'], k: 'ctl' },
  ListBox: {
    c: 1,
    g: 'list',
    w: 100,
    h: 100,
    d: {},
    de: 'SelectionChanged',
    ev: ['SelectionChanged'],
    pr: ['Items', 'SelectedIndex', 'SelectionMode', 'DisplayMemberPath'],
    k: 'ctl',
    it: 'flat',
    itTag: 'ListBoxItem',
  },
  RadioButton: {
    c: 1,
    g: 'radio',
    d: { Content: 'RadioButton' },
    de: 'Checked',
    ev: ['Checked', 'Unchecked', 'Click'],
    pr: ['Content', 'IsChecked', 'GroupName'],
    k: 'ctl',
  },
  Rectangle: {
    c: 1,
    g: 'rect',
    w: 100,
    h: 100,
    d: { Fill: '#FFF4F4F5', Stroke: 'Black' },
    de: 'MouseDown',
    ev: [],
    pr: ['Fill', 'Stroke', 'StrokeThickness', 'RadiusX', 'RadiusY', 'StrokeDashArray'],
    k: 'shp',
  },
  StackPanel: {
    c: 1,
    g: 'stack',
    w: 100,
    h: 100,
    d: {},
    de: 'Loaded',
    ev: [],
    pr: ['Background', 'Orientation'],
    k: 'pnl',
    cont: 'stack',
  },
  TabControl: {
    c: 1,
    g: 'tab',
    w: 200,
    h: 150,
    d: { Items: 'TabItem\nTabItem' },
    de: 'SelectionChanged',
    ev: ['SelectionChanged'],
    pr: ['Items', 'SelectedIndex', 'TabStripPlacement'],
    k: 'ctl',
    cont: 'tab',
  },
  TextBlock: {
    c: 1,
    g: 'tb',
    d: { TextWrapping: 'Wrap', Text: 'TextBlock' },
    de: 'MouseDown',
    ev: [],
    pr: ['Text'],
    k: 'tb',
  },
  TextBox: {
    c: 1,
    g: 'txt',
    w: 120,
    h: 23,
    d: { TextWrapping: 'Wrap', Text: 'TextBox' },
    de: 'TextChanged',
    ev: ['TextChanged', 'PreviewTextInput', 'SelectionChanged'],
    pr: [
      'Text',
      'IsReadOnly',
      'MaxLength',
      'AcceptsReturn',
      'AcceptsTab',
      'TextWrapping',
      'TextAlignment',
      'VerticalScrollBarVisibility',
      'HorizontalScrollBarVisibility',
      'CharacterCasing',
      'SpellCheck.IsEnabled',
    ],
    k: 'ctl',
  },
  Border: {
    g: 'border',
    w: 100,
    h: 100,
    d: { BorderBrush: 'Black', BorderThickness: '1' },
    de: 'MouseDown',
    ev: [],
    pr: ['Background', 'BorderBrush', 'BorderThickness', 'CornerRadius', 'Padding'],
    k: 'fe',
    cont: 'abs',
    single: 1,
  },
  Calendar: {
    g: 'cal',
    d: {},
    de: 'SelectedDatesChanged',
    ev: ['SelectedDatesChanged', 'DisplayDateChanged'],
    pr: ['SelectedDate', 'DisplayDate', 'SelectionMode', 'FirstDayOfWeek', 'IsTodayHighlighted'],
    k: 'ctl',
  },
  Canvas: { g: 'canvas', w: 100, h: 100, d: {}, de: 'MouseDown', ev: [], pr: ['Background'], k: 'pnl', cont: 'canvas' },
  DatePicker: {
    g: 'date',
    w: 120,
    h: 24,
    d: {},
    de: 'SelectedDateChanged',
    ev: ['SelectedDateChanged', 'CalendarOpened', 'CalendarClosed'],
    pr: ['SelectedDate', 'DisplayDate', 'SelectedDateFormat', 'FirstDayOfWeek'],
    k: 'ctl',
  },
  DockPanel: {
    g: 'dock',
    w: 160,
    h: 100,
    d: {},
    de: 'Loaded',
    ev: [],
    pr: ['Background', 'LastChildFill'],
    k: 'pnl',
    cont: 'dock',
  },
  Ellipse: {
    g: 'ellipse',
    w: 100,
    h: 100,
    d: { Fill: '#FFF4F4F5', Stroke: 'Black' },
    de: 'MouseDown',
    ev: [],
    pr: ['Fill', 'Stroke', 'StrokeThickness', 'StrokeDashArray'],
    k: 'shp',
  },
  Expander: {
    g: 'exp',
    w: 120,
    h: 100,
    d: { Header: 'Expander', IsExpanded: 'True' },
    de: 'Expanded',
    ev: ['Expanded', 'Collapsed'],
    pr: ['Header', 'IsExpanded', 'ExpandDirection'],
    k: 'ctl',
    cont: 'abs',
    single: 1,
  },
  GroupBox: {
    g: 'group',
    w: 120,
    h: 100,
    d: { Header: 'GroupBox' },
    de: 'MouseDown',
    ev: [],
    pr: ['Header'],
    k: 'ctl',
    cont: 'abs',
    single: 1,
  },
  InkCanvas: {
    g: 'ink',
    w: 120,
    h: 100,
    d: {},
    de: 'StrokeCollected',
    ev: ['StrokeCollected'],
    pr: ['Background', 'EditingMode'],
    k: 'fe',
  },
  Line: {
    g: 'line',
    d: { X1: '0', Y1: '0', X2: '100', Y2: '50', Stroke: 'Black' },
    de: 'MouseDown',
    ev: [],
    pr: ['X1', 'Y1', 'X2', 'Y2', 'Stroke', 'StrokeThickness', 'StrokeDashArray'],
    k: 'fe',
  },
  ListView: {
    g: 'lview',
    w: 120,
    h: 100,
    d: {},
    de: 'SelectionChanged',
    ev: ['SelectionChanged'],
    pr: ['Items', 'SelectedIndex', 'SelectionMode', 'DisplayMemberPath'],
    k: 'ctl',
    it: 'flat',
    itTag: 'ListViewItem',
  },
  MediaElement: {
    g: 'media',
    w: 160,
    h: 90,
    d: {},
    de: 'MediaEnded',
    ev: ['MediaEnded', 'MediaOpened', 'MediaFailed'],
    pr: ['Source', 'LoadedBehavior', 'Volume', 'Stretch', 'IsMuted'],
    k: 'fe',
  },
  Menu: {
    g: 'menu',
    w: 200,
    h: 20,
    get d() {
      return { Items: L('Plik\n  Zamknij\nPomoc\n  O programie', 'File\n  Exit\nHelp\n  About') };
    },
    de: 'Loaded',
    ev: [],
    pr: ['Items', 'Background'],
    k: 'ctl',
    it: 'tree',
  },
  PasswordBox: {
    g: 'pwd',
    w: 120,
    h: 23,
    d: {},
    de: 'PasswordChanged',
    ev: ['PasswordChanged'],
    pr: ['Password', 'PasswordChar', 'MaxLength'],
    k: 'ctl',
  },
  Polygon: {
    g: 'poly',
    w: 100,
    h: 100,
    d: { Points: '50,0 100,100 0,100', Fill: '#FFF4F4F5', Stroke: 'Black' },
    de: 'MouseDown',
    ev: [],
    pr: ['Points', 'Fill', 'Stroke', 'StrokeThickness'],
    k: 'fe',
  },
  ProgressBar: {
    g: 'progress',
    w: 100,
    h: 10,
    d: {},
    de: 'ValueChanged',
    ev: ['ValueChanged'],
    pr: ['Minimum', 'Maximum', 'Value', 'IsIndeterminate', 'Orientation'],
    k: 'ctl',
  },
  RepeatButton: {
    g: 'rbtn',
    w: 75,
    h: 20,
    d: { Content: 'RepeatButton' },
    de: 'Click',
    ev: ['Click'],
    pr: ['Content', 'Delay', 'Interval'],
    k: 'ctl',
  },
  RichTextBox: {
    g: 'rich',
    w: 120,
    h: 80,
    d: { Text: 'RichTextBox' },
    de: 'TextChanged',
    ev: ['TextChanged'],
    pr: ['Text', 'IsReadOnly', 'VerticalScrollBarVisibility', 'AcceptsTab'],
    k: 'ctl',
  },
  ScrollBar: {
    g: 'sbar',
    w: 17,
    h: 100,
    d: {},
    de: 'Scroll',
    ev: ['Scroll', 'ValueChanged'],
    pr: ['Orientation', 'Minimum', 'Maximum', 'Value', 'ViewportSize', 'SmallChange', 'LargeChange'],
    k: 'ctl',
  },
  ScrollViewer: {
    g: 'sview',
    w: 120,
    h: 100,
    d: {},
    de: 'ScrollChanged',
    ev: ['ScrollChanged'],
    pr: ['VerticalScrollBarVisibility', 'HorizontalScrollBarVisibility'],
    k: 'ctl',
    cont: 'abs',
    single: 1,
  },
  Separator: { g: 'sep', w: 100, h: 5, d: {}, de: 'Loaded', ev: [], pr: [], k: 'ctl' },
  Slider: {
    g: 'slider',
    w: 120,
    h: 18,
    d: {},
    de: 'ValueChanged',
    ev: ['ValueChanged'],
    pr: [
      'Minimum',
      'Maximum',
      'Value',
      'Orientation',
      'TickFrequency',
      'TickPlacement',
      'IsSnapToTickEnabled',
      'SmallChange',
      'LargeChange',
      'IsDirectionReversed',
    ],
    k: 'ctl',
  },
  StatusBar: {
    g: 'status',
    w: 200,
    h: 24,
    get d() {
      return { Items: L('Gotowe', 'Ready') };
    },
    de: 'Loaded',
    ev: [],
    pr: ['Items'],
    k: 'ctl',
    it: 'flat',
    itTag: 'StatusBarItem',
  },
  ToggleButton: {
    g: 'tbtn',
    w: 75,
    h: 20,
    d: { Content: 'ToggleButton' },
    de: 'Checked',
    ev: ['Checked', 'Unchecked', 'Click'],
    pr: ['Content', 'IsChecked', 'IsThreeState'],
    k: 'ctl',
  },
  ToolBar: {
    g: 'toolbar',
    w: 200,
    h: 26,
    get d() {
      return { Items: L('Nowy\nOtwórz\nZapisz', 'New\nOpen\nSave') };
    },
    de: 'Loaded',
    ev: [],
    pr: ['Items', 'Band', 'BandIndex'],
    k: 'ctl',
    it: 'flat',
    itTag: 'Button',
  },
  TreeView: {
    g: 'tree',
    w: 120,
    h: 100,
    d: { Items: 'Element 1\n  Podelement\nElement 2' },
    de: 'SelectedItemChanged',
    ev: ['SelectedItemChanged'],
    pr: ['Items'],
    k: 'ctl',
    it: 'tree',
  },
  UniformGrid: {
    g: 'uni',
    w: 120,
    h: 100,
    d: { Columns: '2' },
    de: 'Loaded',
    ev: [],
    pr: ['Background', 'Rows', 'Columns', 'FirstColumn'],
    k: 'pnl',
    cont: 'uni',
    pt: { Columns: 'num' },
  },
  Viewbox: {
    g: 'view',
    w: 120,
    h: 100,
    d: {},
    de: 'Loaded',
    ev: [],
    pr: ['Stretch', 'StretchDirection'],
    k: 'fe',
    cont: 'abs',
    single: 1,
  },
  WrapPanel: {
    g: 'wrap',
    w: 120,
    h: 100,
    d: {},
    de: 'Loaded',
    ev: [],
    pr: ['Background', 'Orientation', 'ItemWidth', 'ItemHeight'],
    k: 'pnl',
    cont: 'wrap',
  },
};
const WIN = {
  pr: [
    'Title',
    'Background',
    'Foreground',
    'FontFamily',
    'FontSize',
    'ResizeMode',
    'WindowStartupLocation',
    'WindowState',
    'WindowStyle',
    'SizeToContent',
    'Topmost',
    'ShowInTaskbar',
    'Icon',
    'MinWidth',
    'MinHeight',
    'MaxWidth',
    'MaxHeight',
    'Cursor',
    'Opacity',
    'AllowsTransparency',
    'Tag',
  ],
  ev: [
    'Loaded',
    'Closing',
    'Closed',
    'Activated',
    'Deactivated',
    'ContentRendered',
    'KeyDown',
    'KeyUp',
    'PreviewKeyDown',
    'MouseDown',
    'MouseUp',
    'MouseMove',
    'MouseWheel',
    'SizeChanged',
    'StateChanged',
    'LocationChanged',
    'TextInput',
  ],
};
const EA = {
  Click: 'RoutedEventArgs',
  MouseDown: 'MouseButtonEventArgs',
  MouseUp: 'MouseButtonEventArgs',
  MouseLeftButtonDown: 'MouseButtonEventArgs',
  MouseRightButtonDown: 'MouseButtonEventArgs',
  MouseDoubleClick: 'MouseButtonEventArgs',
  PreviewMouseDown: 'MouseButtonEventArgs',
  MouseEnter: 'MouseEventArgs',
  MouseLeave: 'MouseEventArgs',
  MouseMove: 'MouseEventArgs',
  MouseWheel: 'MouseWheelEventArgs',
  KeyDown: 'KeyEventArgs',
  KeyUp: 'KeyEventArgs',
  PreviewKeyDown: 'KeyEventArgs',
  TextChanged: 'TextChangedEventArgs',
  PreviewTextInput: 'TextCompositionEventArgs',
  TextInput: 'TextCompositionEventArgs',
  SelectionChanged: 'SelectionChangedEventArgs',
  SelectedDateChanged: 'SelectionChangedEventArgs',
  SelectedDatesChanged: 'SelectionChangedEventArgs',
  ValueChanged: 'RoutedPropertyChangedEventArgs<double>',
  SelectedItemChanged: 'RoutedPropertyChangedEventArgs<object>',
  Scroll: 'System.Windows.Controls.Primitives.ScrollEventArgs',
  ScrollChanged: 'ScrollChangedEventArgs',
  Closing: 'System.ComponentModel.CancelEventArgs',
  Closed: 'EventArgs',
  Activated: 'EventArgs',
  Deactivated: 'EventArgs',
  ContentRendered: 'EventArgs',
  StateChanged: 'EventArgs',
  LocationChanged: 'EventArgs',
  SizeChanged: 'SizeChangedEventArgs',
  StrokeCollected: 'InkCanvasStrokeCollectedEventArgs',
  DisplayDateChanged: 'CalendarDateChangedEventArgs',
  MediaFailed: 'ExceptionRoutedEventArgs',
  ImageFailed: 'ExceptionRoutedEventArgs',
  DropDownOpened: 'EventArgs',
  DropDownClosed: 'EventArgs',
  CalendarOpened: 'RoutedEventArgs',
  CellEditEnding: 'DataGridCellEditEndingEventArgs',
  BeginningEdit: 'DataGridBeginningEditEventArgs',
};

const E = (...o) => o;
const PD = {
  Content: 'text',
  Text: 'text',
  Header: 'text',
  Title: 'text',
  ToolTip: 'text',
  Tag: 'text',
  GroupName: 'text',
  Password: 'text',
  PasswordChar: 'text',
  Source: 'source',
  Icon: 'source',
  Points: 'text',
  DisplayMemberPath: 'text',
  Target: 'text',
  StrokeDashArray: 'text',
  CornerRadius: 'text',
  SelectedDate: 'date',
  DisplayDate: 'date',
  IsChecked: 'bool',
  IsThreeState: 'bool',
  IsEnabled: 'bool',
  IsDefault: 'bool',
  IsCancel: 'bool',
  IsEditable: 'bool',
  IsReadOnly: 'bool',
  AcceptsReturn: 'bool',
  AcceptsTab: 'bool',
  IsIndeterminate: 'bool',
  IsExpanded: 'bool',
  IsSnapToTickEnabled: 'bool',
  AutoGenerateColumns: 'bool',
  CanUserAddRows: 'bool',
  Topmost: 'bool',
  ShowInTaskbar: 'bool',
  IsTabStop: 'bool',
  ShowGridLines: 'bool',
  LastChildFill: 'bool',
  ClipToBounds: 'bool',
  IsMuted: 'bool',
  IsDirectionReversed: 'bool',
  IsTodayHighlighted: 'bool',
  AllowsTransparency: 'bool',
  'SpellCheck.IsEnabled': 'bool',
  Width: 'size',
  Height: 'size',
  Margin: 'margin',
  BorderThickness: 'thick',
  Padding: 'thick',
  Background: 'brush',
  Foreground: 'brush',
  BorderBrush: 'brush',
  Fill: 'brush',
  Stroke: 'brush',
  AlternatingRowBackground: 'brush',
  Items: 'items',
  Columns: 'items',
  HorizontalAlignment: E('Left', 'Center', 'Right', 'Stretch'),
  VerticalAlignment: E('Top', 'Center', 'Bottom', 'Stretch'),
  HorizontalContentAlignment: E('Left', 'Center', 'Right', 'Stretch'),
  VerticalContentAlignment: E('Top', 'Center', 'Bottom', 'Stretch'),
  Visibility: E('Visible', 'Hidden', 'Collapsed'),
  Orientation: E('Horizontal', 'Vertical'),
  TextWrapping: E('NoWrap', 'Wrap', 'WrapWithOverflow'),
  TextAlignment: E('Left', 'Right', 'Center', 'Justify'),
  TextTrimming: E('None', 'CharacterEllipsis', 'WordEllipsis'),
  TextDecorations: E('Underline', 'Strikethrough', 'OverLine', 'Baseline'),
  FontWeight: E('Thin', 'ExtraLight', 'Light', 'Normal', 'Medium', 'SemiBold', 'Bold', 'ExtraBold', 'Black'),
  FontStyle: E('Normal', 'Italic', 'Oblique'),
  FontFamily: E(
    'Segoe UI',
    'Arial',
    'Calibri',
    'Cambria',
    'Consolas',
    'Courier New',
    'Georgia',
    'Segoe Print',
    'Segoe Script',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Comic Sans MS',
    'Impact',
    'Cascadia Code',
  ),
  Cursor: E('Arrow', 'Hand', 'IBeam', 'Wait', 'Cross', 'SizeAll', 'SizeNS', 'SizeWE', 'No', 'Help', 'None'),
  Stretch: E('None', 'Fill', 'Uniform', 'UniformToFill'),
  StretchDirection: E('UpOnly', 'DownOnly', 'Both'),
  SelectionMode: E('Single', 'Multiple', 'Extended'),
  TickPlacement: E('None', 'TopLeft', 'BottomRight', 'Both'),
  VerticalScrollBarVisibility: E('Disabled', 'Auto', 'Hidden', 'Visible'),
  HorizontalScrollBarVisibility: E('Disabled', 'Auto', 'Hidden', 'Visible'),
  ExpandDirection: E('Down', 'Up', 'Left', 'Right'),
  TabStripPlacement: E('Top', 'Bottom', 'Left', 'Right'),
  ResizeMode: E('NoResize', 'CanMinimize', 'CanResize', 'CanResizeWithGrip'),
  WindowStartupLocation: E('Manual', 'CenterScreen', 'CenterOwner'),
  WindowState: E('Normal', 'Minimized', 'Maximized'),
  WindowStyle: E('None', 'SingleBorderWindow', 'ThreeDBorderWindow', 'ToolWindow'),
  SizeToContent: E('Manual', 'Width', 'Height', 'WidthAndHeight'),
  LoadedBehavior: E('Play', 'Manual', 'Pause', 'Stop', 'Close'),
  EditingMode: E('None', 'Ink', 'GestureOnly', 'InkAndGesture', 'Select', 'EraseByPoint', 'EraseByStroke'),
  CharacterCasing: E('Normal', 'Lower', 'Upper'),
  ClickMode: E('Release', 'Press', 'Hover'),
  GridLinesVisibility: E('All', 'Horizontal', 'Vertical', 'None'),
  SelectedDateFormat: E('Short', 'Long'),
  FirstDayOfWeek: E('Monday', 'Sunday', 'Saturday'),
};
const GROUP_EN = {
  Wspólne: 'Common',
  Układ: 'Layout',
  Pędzel: 'Brush',
  Wygląd: 'Appearance',
  Tekst: 'Text',
  'Układ (dołączone)': 'Layout (attached)',
  Różne: 'Miscellaneous',
};
const GROUPS = [
  [
    'Wspólne',
    [
      'Content',
      'Text',
      'Header',
      'Title',
      'Items',
      'Columns',
      'IsChecked',
      'GroupName',
      'IsThreeState',
      'SelectedIndex',
      'Password',
      'PasswordChar',
      'Source',
      'Points',
      'SelectedDate',
      'DisplayDate',
      'IsDefault',
      'IsCancel',
      'IsEditable',
      'IsReadOnly',
      'Minimum',
      'Maximum',
      'Value',
      'IsIndeterminate',
      'IsExpanded',
      'ToolTip',
      'IsEnabled',
      'Cursor',
      'TabIndex',
      'IsTabStop',
      'Tag',
    ],
  ],
  [
    'Układ',
    [
      'Width',
      'Height',
      'HorizontalAlignment',
      'VerticalAlignment',
      'Margin',
      'Panel.ZIndex',
      'Orientation',
      'MinWidth',
      'MinHeight',
      'MaxWidth',
      'MaxHeight',
      'Rows',
      'Columns',
      'FirstColumn',
      'ItemWidth',
      'ItemHeight',
      'LastChildFill',
      'ClipToBounds',
      'X1',
      'Y1',
      'X2',
      'Y2',
      'SizeToContent',
      'ResizeMode',
      'WindowStartupLocation',
      'WindowState',
    ],
  ],
  ['Pędzel', ['Background', 'Foreground', 'BorderBrush', 'Fill', 'Stroke', 'AlternatingRowBackground', 'Opacity']],
  [
    'Wygląd',
    [
      'Visibility',
      'BorderThickness',
      'Padding',
      'CornerRadius',
      'StrokeThickness',
      'StrokeDashArray',
      'RadiusX',
      'RadiusY',
      'Stretch',
      'StretchDirection',
      'WindowStyle',
      'Topmost',
      'ShowInTaskbar',
      'Icon',
      'ShowGridLines',
      'AllowsTransparency',
    ],
  ],
  [
    'Tekst',
    [
      'FontFamily',
      'FontSize',
      'FontWeight',
      'FontStyle',
      'TextWrapping',
      'TextAlignment',
      'TextTrimming',
      'TextDecorations',
      'LineHeight',
      'HorizontalContentAlignment',
      'VerticalContentAlignment',
      'MaxLength',
      'AcceptsReturn',
      'AcceptsTab',
      'CharacterCasing',
      'SpellCheck.IsEnabled',
    ],
  ],
];
const NAMED = [
  'AliceBlue',
  'Aqua',
  'Beige',
  'Black',
  'Blue',
  'BlueViolet',
  'Brown',
  'CadetBlue',
  'Chocolate',
  'Coral',
  'CornflowerBlue',
  'Crimson',
  'Cyan',
  'DarkBlue',
  'DarkGray',
  'DarkGreen',
  'DarkOrange',
  'DarkRed',
  'DarkSlateGray',
  'DeepPink',
  'DeepSkyBlue',
  'DimGray',
  'DodgerBlue',
  'Firebrick',
  'ForestGreen',
  'Gold',
  'Gray',
  'Green',
  'GreenYellow',
  'HotPink',
  'IndianRed',
  'Indigo',
  'Ivory',
  'Khaki',
  'Lavender',
  'LightBlue',
  'LightCoral',
  'LightGray',
  'LightGreen',
  'LightPink',
  'LightSkyBlue',
  'LightSteelBlue',
  'LightYellow',
  'Lime',
  'LimeGreen',
  'Magenta',
  'Maroon',
  'MediumPurple',
  'MidnightBlue',
  'MintCream',
  'Navy',
  'Olive',
  'Orange',
  'OrangeRed',
  'Orchid',
  'PaleGreen',
  'Pink',
  'Plum',
  'PowderBlue',
  'Purple',
  'Red',
  'RoyalBlue',
  'SaddleBrown',
  'Salmon',
  'SeaGreen',
  'Sienna',
  'Silver',
  'SkyBlue',
  'SlateBlue',
  'SlateGray',
  'SpringGreen',
  'SteelBlue',
  'Tan',
  'Teal',
  'Tomato',
  'Transparent',
  'Turquoise',
  'Violet',
  'Wheat',
  'White',
  'WhiteSmoke',
  'Yellow',
  'YellowGreen',
];
function ptype(t, k) {
  return (TY[t] && TY[t].pt && TY[t].pt[k]) || PD[k] || 'num';
}
function propKeys(n) {
  if (n.id === 'win') return [...new Set(['Width', 'Height', ...WIN.pr])];
  const T = TY[n.t];
  const ex = T.k === 'ctl' ? CTLP : T.k === 'tb' ? TXTP : T.k === 'pnl' ? ['Background'] : [];
  return [...new Set([...T.pr, ...ex, ...BASE])];
}
function eventKeys(n) {
  if (n.id === 'win') return WIN.ev;
  const T = TY[n.t];
  return [...new Set([...T.ev, ...(T.k === 'ctl' ? CTL_EV : FE_EV)])];
}
const ALL_EVENTS = new Set([...WIN.ev, ...CTL_EV, ...Object.values(TY).flatMap(t => t.ev)]);

/* ---------- model projektu ---------- */
let P = null;
let seq = 0;
const nid = () => 'n' + ++seq;
const CODE_HEAD = ns => `using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
`;
function blankCode(ns) {
  return (
    CODE_HEAD(ns) +
    `
namespace ${ns}
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }
    }
}
`
  );
}
function mkNode(t, opt = {}) {
  const T = TY[t];
  return {
    id: nid(),
    t,
    name: opt.name || null,
    p: Object.assign({}, T.d, opt.p || {}),
    ev: Object.assign({}, opt.ev || {}),
    ch: [],
    m: opt.m || [0, 0, 0, 0],
    w: opt.w !== undefined ? opt.w : (T.w ?? null),
    h: opt.h !== undefined ? opt.h : (T.h ?? null),
    tab: opt.tab || 0,
  };
}
function blankProject(name = 'WpfApp1') {
  const root = mkNode('Grid', { w: null, h: null });
  root.id = 'root';
  return {
    v: 2,
    name,
    win: { id: 'win', t: 'Window', p: { Title: 'MainWindow' }, ev: {}, w: 800, h: 450 },
    root,
    code: blankCode(name),
    files: [],
    pkgs: [],
    refs: [],
    assets: {},
  };
}
function sampleProject() {
  const en = UI_LANG === 'en';
  const N = en
    ? {
        masa: 'txtWeight',
        wzrost: 'txtHeight',
        lm: 'lblWeight',
        lw: 'lblHeight',
        btn: 'btnCalculate',
        wynik: 'lblResult',
        norma: 'tbNormal',
        chk: 'chkHistory',
        lst: 'lstHistory',
        cls: 'BmiReading',
      }
    : {
        masa: 'txtMasa',
        wzrost: 'txtWzrost',
        lm: 'lblMasa',
        lw: 'lblWzrost',
        btn: 'btnOblicz',
        wynik: 'lblWynik',
        norma: 'tbNorma',
        chk: 'chkHistoria',
        lst: 'lstHistoria',
        cls: 'PomiarBmi',
      };
  const pr = blankProject('WpfApp1');
  pr.win.p.Title = en ? 'BMI Calculator' : 'Kalkulator BMI';
  pr.win.w = 440;
  pr.win.h = 320;
  const A = (t, name, x, y, w, h, p = {}, ev = {}) => {
    const n = mkNode(t, {
      name,
      m: [x, y, 0, 0],
      w,
      h,
      p: Object.assign({ HorizontalAlignment: 'Left', VerticalAlignment: 'Top' }, p),
      ev,
    });
    pr.root.ch.push(n);
    return n;
  };
  A('Label', N.lm, 20, 20, null, null, { Content: en ? 'Weight (kg):' : 'Masa (kg):' });
  A('TextBox', N.masa, 120, 24, 120, 23, { Text: '70' });
  A('Label', N.lw, 20, 56, null, null, { Content: en ? 'Height (cm):' : 'Wzrost (cm):' });
  A('TextBox', N.wzrost, 120, 60, 120, 23, { Text: '175' });
  A(
    'Button',
    N.btn,
    264,
    42,
    120,
    26,
    { Content: en ? 'Calculate BMI' : 'Oblicz BMI', IsDefault: 'True' },
    { Click: N.btn + '_Click' },
  );
  A('Label', N.wynik, 20, 100, 260, null, { Content: 'BMI: —', FontSize: '20', FontWeight: 'Bold' });
  A('ProgressBar', 'pbBmi', 24, 150, 360, 14, { Maximum: '40', Value: '0' });
  A('TextBlock', N.norma, 24, 172, null, null, {
    Text: en ? 'Healthy range: 18.5 – 24.9' : 'Norma: 18,5 – 24,9',
    Foreground: 'Gray',
    TextWrapping: 'Wrap',
  });
  A('CheckBox', N.chk, 24, 204, null, null, {
    Content: en ? 'Keep calculation history' : 'Zapisuj historię obliczeń',
    IsChecked: 'True',
  });
  A('ListBox', N.lst, 24, 226, 360, 40, {});
  const v = en
    ? {
        m: 'weight',
        w: 'height',
        r: 'reading',
        cat: 'Category',
        msg: '"Enter a valid weight (kg) and height (cm).", "Invalid input"',
      }
    : {
        m: 'masa',
        w: 'wzrost',
        r: 'wynik',
        cat: 'Kategoria',
        msg: '"Wpisz poprawną masę (kg) i wzrost (cm).", "Błąd danych"',
      };
  pr.code =
    CODE_HEAD('WpfApp1') +
    `
namespace WpfApp1
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void ${N.btn}_Click(object sender, RoutedEventArgs e)
        {
            if (!double.TryParse(${N.masa}.Text, out double ${v.m}) ||
                !double.TryParse(${N.wzrost}.Text, out double ${v.w}) || ${v.w} <= 0)
            {
                MessageBox.Show(${v.msg},
                    MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            var ${v.r} = new ${N.cls}(${v.m}, ${v.w});
            ${N.wynik}.Content = $"BMI: {${v.r}.Bmi:F1} – {${v.r}.${v.cat}}";
            pbBmi.Value = Math.Min(${v.r}.Bmi, 40);

            if (${v.r}.Bmi < 18.5)
                ${N.wynik}.Foreground = Brushes.SteelBlue;
            else if (${v.r}.Bmi < 25)
                ${N.wynik}.Foreground = Brushes.SeaGreen;
            else
                ${N.wynik}.Foreground = Brushes.OrangeRed;

            if (${N.chk}.IsChecked == true)
                ${N.lst}.Items.Insert(0, ${v.r});
        }
    }
}
`;
  pr.files.push({
    name: N.cls + '.cs',
    code: en
      ? `namespace WpfApp1
{
    public class BmiReading
    {
        public double Weight { get; }
        public double Height { get; }
        public DateTime Time { get; } = DateTime.Now;

        public BmiReading(double weight, double heightCm)
        {
            Weight = weight;
            Height = heightCm;
        }

        public double Bmi => Weight / Math.Pow(Height / 100, 2);

        public string Category
        {
            get
            {
                if (Bmi < 18.5) return "underweight";
                if (Bmi < 25) return "healthy";
                if (Bmi < 30) return "overweight";
                return "obese";
            }
        }

        public override string ToString() => $"{Time:HH:mm:ss}  {Weight} kg, {Height} cm → {Bmi:F1}";
    }
}
`
      : `namespace WpfApp1
{
    public class PomiarBmi
    {
        public double Masa { get; }
        public double Wzrost { get; }
        public DateTime Kiedy { get; } = DateTime.Now;

        public PomiarBmi(double masa, double wzrostCm)
        {
            Masa = masa;
            Wzrost = wzrostCm;
        }

        public double Bmi => Masa / Math.Pow(Wzrost / 100, 2);

        public string Kategoria
        {
            get
            {
                if (Bmi < 18.5) return "niedowaga";
                if (Bmi < 25) return "norma";
                if (Bmi < 30) return "nadwaga";
                return "otyłość";
            }
        }

        public override string ToString() => $"{Kiedy:HH:mm:ss}  {Masa} kg, {Wzrost} cm → {Bmi:F1}";
    }
}
`,
  });
  return pr;
}
function walk(fn, n = P.root, parent = null) {
  if (fn(n, parent) === false) return false;
  for (const c of n.ch) if (walk(fn, c, n) === false) return false;
}
function byId(id) {
  if (id === 'win') return P.win;
  let r = null;
  walk(n => {
    if (n.id === id) {
      r = n;
      return false;
    }
  });
  return r;
}
function parentOf(id) {
  let r = null;
  walk((n, p) => {
    if (n.id === id) {
      r = p;
      return false;
    }
  });
  return r;
}
function allNodes() {
  const a = [];
  walk(n => {
    a.push(n);
  });
  return a;
}
function names() {
  const s = new Set();
  walk(n => {
    if (n.name) s.add(n.name);
  });
  return s;
}
function autoName(t) {
  const b = t[0].toLowerCase() + t.slice(1);
  const s = names();
  let i = 1;
  while (s.has(b + i)) i++;
  return b + i;
}
function isDesc(id, ancId) {
  const a = byId(ancId);
  if (!a) return false;
  let f = false;
  walk(n => {
    if (n.id === id) {
      f = true;
      return false;
    }
  }, a);
  return f;
}
function kindOf(parent) {
  if (!parent) return 'abs';
  const c = TY[parent.t] && TY[parent.t].cont;
  return c === 'tab' ? 'abs' : c || 'abs';
}

/* ---------- pomocnicze: kolory, grubości ---------- */
function brush(v, def) {
  if (v == null || v === '') return def;
  v = String(v).trim();
  if (/^\{.*\}$/.test(v)) return def;
  v = v.replace(/["'<>;{}]/g, '');
  if (/^#[0-9a-f]{8}$/i.test(v)) {
    const a = parseInt(v.slice(1, 3), 16) / 255;
    return `rgba(${parseInt(v.slice(3, 5), 16)},${parseInt(v.slice(5, 7), 16)},${parseInt(v.slice(7, 9), 16)},${+a.toFixed(3)})`;
  }
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  if (/^#[0-9a-f]{3,4}$/i.test(v)) {
    if (v.length === 5) {
      const a = parseInt(v[1] + v[1], 16) / 255;
      return `rgba(${parseInt(v[2] + v[2], 16)},${parseInt(v[3] + v[3], 16)},${parseInt(v[4] + v[4], 16)},${a})`;
    }
    return v;
  }
  if (/^\{.*\}$/.test(v)) return def;
  return v.toLowerCase();
}
function th(v, def = '0') {
  const p = String(v == null || v === '' ? def : v)
    .split(/[\s,]+/)
    .map(x => (+x || 0) + 'px');
  if (p.length === 1) return p[0];
  if (p.length === 2) return `${p[1]} ${p[0]}`;
  return `${p[1]} ${p[2]} ${p[3] || p[1]} ${p[0]}`;
}
function thArr(v) {
  const p = String(v || '0')
    .split(/[\s,]+/)
    .map(x => +x || 0);
  if (p.length === 1) return [p[0], p[0], p[0], p[0]];
  if (p.length === 2) return [p[0], p[1], p[0], p[1]];
  return [p[0], p[1], p[2] || 0, p[3] || 0];
}
const num = (v, d) => {
  const x = parseFloat(String(v).replace(',', '.'));
  return isNaN(x) ? d : x;
};
const isTrue = v => String(v) === 'True' || v === true;
const FW = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Normal: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Black: 900,
};
const AL = {
  Left: 'flex-start',
  Top: 'flex-start',
  Center: 'center',
  Right: 'flex-end',
  Bottom: 'flex-end',
  Stretch: 'stretch',
};
function fontCss(s, defFg = '#000') {
  return `font-family:'${String(s.FontFamily || 'Segoe UI').replace(/['"<>;]/g, '')}','Segoe UI',system-ui,sans-serif;font-size:${num(s.FontSize, 12)}px;font-weight:${FW[s.FontWeight] || 400};font-style:${(s.FontStyle || 'Normal') === 'Normal' ? 'normal' : 'italic'};color:${brush(s.Foreground, defFg)};`;
}
function boxCss(s, d) {
  return `background:${brush(s.Background, brush(d.bg || 'transparent'))};border-color:${brush(s.BorderBrush, brush(d.bb || 'transparent'))};border-style:solid;border-width:${th(s.BorderThickness, d.bt || '0')};padding:${th(s.Padding, d.pad || '0')};`;
}

/* ---------- elementy listy (Items) ---------- */
function parseItems(text, tree) {
  const lines = String(text || '')
    .split('\n')
    .filter(l => l.trim() !== '');
  const root = [];
  const stack = [{ lvl: -1, ch: root }];
  for (const l of lines) {
    const lvl = tree ? Math.floor(l.match(/^ */)[0].length / 2) : 0;
    let t = l.trim(),
      h = null;
    const pi = t.lastIndexOf('|');
    if (pi > 0) {
      h = t.slice(pi + 1).trim() || null;
      t = t.slice(0, pi).trim();
    }
    const it = { text: t, h, ch: [], sep: t === '-' };
    while (stack[stack.length - 1].lvl >= lvl) stack.pop();
    stack[stack.length - 1].ch.push(it);
    stack.push({ lvl, ch: it.ch });
  }
  return root;
}
function itemsToText(items, lvl = 0) {
  return items
    .map(
      it =>
        '  '.repeat(lvl) +
        (it.sep ? '-' : it.text) +
        (it.h ? ' | ' + it.h : '') +
        (it.ch.length ? '\n' + itemsToText(it.ch, lvl + 1) : ''),
    )
    .join('\n');
}
function itemHandlers(n) {
  const out = [];
  if (!TY[n.t] || !TY[n.t].it) return out;
  const rec = a =>
    a.forEach(i => {
      if (i.h) out.push({ name: i.h, text: i.text });
      rec(i.ch);
    });
  rec(parseItems(n.p.Items, TY[n.t].it === 'tree'));
  return out;
}
const ident = s => {
  let r = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/[^\w]/g, '');
  if (/^\d/.test(r)) r = '_' + r;
  return r || L('Kolumna', 'Column');
};

/* ---------- generowanie XAML ---------- */
const xa = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').replace(/\n/g, '&#xA;');
let XLINE = {};
function genXaml() {
  const ns = P.name;
  const L = [];
  XLINE = {};
  const W = P.win;
  const wa = [`Title="${xa(W.p.Title ?? 'MainWindow')}"`, `Height="${W.h}"`, `Width="${W.w}"`];
  for (const [k, v] of Object.entries(W.p)) if (k !== 'Title') wa.push(`${k}="${xa(v)}"`);
  for (const [k, v] of Object.entries(W.ev)) wa.push(`${k}="${xa(v)}"`);
  L.push(
    `<Window x:Class="${ns}.MainWindow"`,
    `        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"`,
    `        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"`,
    `        xmlns:d="http://schemas.microsoft.com/expression/blend/2008"`,
    `        xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"`,
    `        xmlns:local="clr-namespace:${ns}"`,
    `        mc:Ignorable="d"`,
    `        ${wa.join(' ')}>`,
  );
  XLINE.win = 1;
  emitNode(P.root, 1, 'root', L);
  L.push('</Window>');
  return L.join('\n') + '\n';
}
const CONTENT_EL = { RichTextBox: 'Text' };
function emitNode(n, ind, pk, L) {
  const T = TY[n.t];
  const pad = '    '.repeat(ind);
  const a = [];
  if (n.name) a.push(`x:Name="${n.name}"`);
  const skip = new Set([
    'HorizontalAlignment',
    'VerticalAlignment',
    'Items',
    n.t === 'DataGrid' ? 'Columns' : '',
    CONTENT_EL[n.t] || '',
  ]);
  for (const [k, v] of Object.entries(n.p)) if (!skip.has(k)) a.push(`${k}="${xa(v)}"`);
  if (n.t === 'DataGrid' && n.p.Columns && n.p.AutoGenerateColumns == null) a.push('AutoGenerateColumns="False"');
  const [ml, mt, mr, mb] = n.m;
  if (pk === 'canvas') {
    if (ml) a.push(`Canvas.Left="${ml}"`);
    if (mt) a.push(`Canvas.Top="${mt}"`);
  } else {
    if (n.p.HorizontalAlignment) a.push(`HorizontalAlignment="${n.p.HorizontalAlignment}"`);
    if (ml || mt || mr || mb) a.push(`Margin="${ml},${mt},${mr},${mb}"`);
    if (n.p.VerticalAlignment) a.push(`VerticalAlignment="${n.p.VerticalAlignment}"`);
  }
  if (pk === 'dock' && n.dock) a.push(`DockPanel.Dock="${n.dock}"`);
  if (n.w != null) a.push(`Width="${n.w}"`);
  if (n.h != null) a.push(`Height="${n.h}"`);
  for (const [k, v] of Object.entries(n.ev)) a.push(`${k}="${xa(v)}"`);
  const head = `${pad}<${n.t}${a.length ? ' ' + a.join(' ') : ''}`;
  const inner = [];
  const sub = '    '.repeat(ind + 1);
  if (T.it === 'flat') {
    parseItems(n.p.Items, false).forEach(it => {
      if (it.sep) inner.push(`${sub}<Separator/>`);
      else if (n.t === 'ToolBar')
        inner.push(`${sub}<Button Content="${xa(it.text)}"${it.h ? ` Click="${xa(it.h)}"` : ''}/>`);
      else
        inner.push(
          `${sub}<${T.itTag} Content="${xa(it.text)}"${it.h && n.t !== 'StatusBar' ? ` Selected="${xa(it.h)}"` : ''}/>`,
        );
    });
  } else if (T.it === 'tree') {
    const tag = n.t === 'Menu' ? 'MenuItem' : 'TreeViewItem';
    const rec = (items, lvl) =>
      items.forEach(it => {
        const p2 = '    '.repeat(ind + 1 + lvl);
        if (it.sep) {
          inner.push(`${p2}<Separator/>`);
          return;
        }
        const at = `Header="${xa(it.text)}"${it.h ? ` ${n.t === 'Menu' ? 'Click' : 'Selected'}="${xa(it.h)}"` : ''}${it.ch.length && tag === 'TreeViewItem' ? ' IsExpanded="True"' : ''}`;
        if (it.ch.length) {
          inner.push(`${p2}<${tag} ${at}>`);
          rec(it.ch, lvl + 1);
          inner.push(`${p2}</${tag}>`);
        } else inner.push(`${p2}<${tag} ${at}/>`);
      });
    rec(parseItems(n.p.Items, true), 0);
  } else if (n.t === 'TabControl') {
    parseItems(n.p.Items, false).forEach((it, i) => {
      const kids = n.ch.filter(c => (c.tab || 0) === i);
      inner.push(`${sub}<TabItem Header="${xa(it.text)}">`);
      inner.push(`${sub}    <Grid Background="#FFE5E5E5"${kids.length ? '>' : '/>'}`);
      kids.forEach(c => emitNode(c, ind + 3, 'abs', inner));
      if (kids.length) inner.push(`${sub}    </Grid>`);
      inner.push(`${sub}</TabItem>`);
    });
  } else if (n.t === 'DataGrid') {
    const cols = parseItems(n.p.Columns, false);
    if (cols.length) {
      inner.push(`${sub}<DataGrid.Columns>`);
      cols.forEach(c =>
        inner.push(`${sub}    <DataGridTextColumn Header="${xa(c.text)}" Binding="{Binding ${ident(c.text)}}"/>`),
      );
      inner.push(`${sub}</DataGrid.Columns>`);
    }
  } else if (n.t === 'RichTextBox') {
    inner.push(
      `${sub}<FlowDocument>`,
      `${sub}    <Paragraph>`,
      `${sub}        <Run Text="${xa(n.p.Text || '')}"/>`,
      `${sub}    </Paragraph>`,
      `${sub}</FlowDocument>`,
    );
  } else if (T.cont && n.ch.length) {
    if (T.single) {
      inner.push(`${sub}<Grid>`);
      n.ch.forEach(c => emitNode(c, ind + 2, 'abs', inner));
      inner.push(`${sub}</Grid>`);
    } else n.ch.forEach(c => emitNode(c, ind + 1, T.cont, inner));
  }
  XLINE[n.id] = L.length + 1;
  if (inner.length) {
    L.push(head + '>');
    inner.forEach(x => L.push(x));
    L.push(`${pad}</${n.t}>`);
  } else L.push(head + '/>');
}

/* ---------- parsowanie XAML → model ---------- */
function parseXaml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const pe = doc.getElementsByTagName('parsererror')[0];
  if (pe) {
    const t = pe.textContent;
    const m = /line\s*(\d+)/i.exec(t) || /(\d+)/.exec(t);
    const xe = xmlErrorInfo(t);
    throw { line: xe.line, col: xe.col, msg: xe.msg };
  }
  const root = doc.documentElement;
  if (root.localName !== 'Window')
    throw { line: 1, msg: L('Elementem głównym musi być <Window>.', 'The root element must be <Window>.') };
  const warns = [];
  const win = { id: 'win', t: 'Window', p: {}, ev: {}, w: 800, h: 450 };
  let ns = null;
  for (const at of root.attributes) {
    const k = at.name,
      v = at.value;
    if (k === 'x:Class') {
      ns = v.replace(/\.MainWindow$/, '');
      continue;
    }
    if (/^(xmlns|mc:|d:)/.test(k)) continue;
    if (k === 'Width') win.w = num(v, 800);
    else if (k === 'Height') win.h = num(v, 450);
    else if (WIN.ev.includes(k)) win.ev[k] = v;
    else win.p[k] = v;
  }
  const kids = [...root.children].filter(e => !e.localName.includes('.'));
  if (kids.length > 1)
    throw {
      line: 1,
      msg: L(
        'Właściwość „Content” jest ustawiona więcej niż raz — okno może mieć tylko jeden element główny (np. Grid).',
        "The property 'Content' is set more than once. A window can have only one root element (for example a Grid).",
      ),
    };
  let rootNode;
  if (!kids.length) {
    rootNode = mkNode('Grid', { w: null, h: null });
  } else {
    rootNode = parseEl(kids[0], warns, 'root');
    if (!rootNode)
      throw {
        line: 1,
        msg: L(
          `Element główny <${kids[0].localName}> nie jest obsługiwany.`,
          `The root element <${kids[0].localName}> is not supported by the designer.`,
        ),
      };
    if (!TY[rootNode.t].cont) {
      const g = mkNode('Grid', { w: null, h: null });
      g.ch.push(rootNode);
      rootNode = g;
      warns.push(L('Zawartość okna owinięto w Grid.', 'The window content was wrapped in a Grid.'));
    }
  }
  rootNode.id = 'root';
  return { win, root: rootNode, ns, warns };
}
function parseEl(el, warns, pk) {
  const t = el.localName;
  if (!TY[t]) return null;
  const T = TY[t];
  const n = { id: nid(), t, name: null, p: {}, ev: {}, ch: [], m: [0, 0, 0, 0], w: null, h: null, tab: 0 };
  const evs = new Set(eventKeys(n));
  for (const at of el.attributes) {
    const k = at.name,
      v = at.value;
    if (k === 'x:Name' || k === 'Name') n.name = v;
    else if (/^(xmlns|d:|mc:)/.test(k)) continue;
    else if (k === 'Margin') {
      n.m = thArr(v);
    } else if (k === 'Canvas.Left') n.m[0] = num(v, 0);
    else if (k === 'Canvas.Top') n.m[1] = num(v, 0);
    else if (k === 'Width') n.w = v === 'Auto' ? null : num(v, null);
    else if (k === 'Height') n.h = v === 'Auto' ? null : num(v, null);
    else if (k === 'DockPanel.Dock') n.dock = v;
    else if (evs.has(k) || (ALL_EVENTS.has(k) && /^[A-Za-z_]\w*$/.test(v))) n.ev[k] = v;
    else if (k === 'Grid.Row' || k === 'Grid.Column' || k === 'Grid.RowSpan' || k === 'Grid.ColumnSpan') {
      /* zgłaszane przez walidator XAML */
    } else n.p[k] = v;
  }
  if (T.d.Text !== undefined && !('Text' in n.p) && t !== 'RichTextBox') {
  }
  const kids = [...el.children];
  if (T.it === 'flat') {
    const items = [];
    kids.forEach(c => {
      if (c.localName === 'Separator') items.push({ text: '-', sep: true, ch: [] });
      else if (!c.localName.includes('.'))
        items.push({
          text: c.getAttribute('Content') || c.getAttribute('Header') || c.textContent.trim(),
          h: c.getAttribute('Click') || c.getAttribute('Selected') || null,
          ch: [],
        });
    });
    if (items.length || 'Items' in T.d) n.p.Items = itemsToText(items);
  } else if (T.it === 'tree') {
    const rec = es =>
      es
        .filter(c => !c.localName.includes('.'))
        .map(c =>
          c.localName === 'Separator'
            ? { text: '-', sep: true, ch: [] }
            : {
                text: c.getAttribute('Header') || '',
                h: c.getAttribute('Click') || c.getAttribute('Selected') || null,
                ch: rec([...c.children]),
              },
        );
    n.p.Items = itemsToText(rec(kids));
  } else if (t === 'TabControl') {
    const heads = [];
    kids
      .filter(c => c.localName === 'TabItem')
      .forEach((ti, i) => {
        heads.push({ text: ti.getAttribute('Header') || 'TabItem', ch: [] });
        const cont = [...ti.children].filter(c => !c.localName.includes('.'));
        let els = cont;
        if (cont.length === 1 && cont[0].localName === 'Grid' && !cont[0].getAttribute('x:Name'))
          els = [...cont[0].children].filter(c => !c.localName.includes('.'));
        els.forEach(c => {
          const cn = parseEl(c, warns, 'abs');
          if (cn) {
            cn.tab = i;
            n.ch.push(cn);
          }
        });
      });
    n.p.Items = itemsToText(heads);
  } else if (t === 'DataGrid') {
    const cols = el.getElementsByTagName('DataGridTextColumn');
    const cs = [...el.querySelectorAll('*')]
      .filter(c => /DataGrid\w*Column$/.test(c.localName))
      .map(c => ({ text: c.getAttribute('Header') || '', ch: [] }));
    n.p.Columns = itemsToText(cs);
  } else if (t === 'RichTextBox') {
    const runs = [...el.querySelectorAll('*')].filter(c => c.localName === 'Run');
    n.p.Text = runs.length ? runs.map(r => r.getAttribute('Text') ?? r.textContent).join('') : el.textContent.trim();
  } else if (T.cont) {
    let els = kids.filter(c => !c.localName.includes('.'));
    if (
      T.single &&
      els.length === 1 &&
      els[0].localName === 'Grid' &&
      !els[0].getAttribute('x:Name') &&
      !els[0].getAttribute('Background')
    )
      els = [...els[0].children].filter(c => !c.localName.includes('.'));
    const ck = T.single ? 'abs' : T.cont === 'tab' ? 'abs' : T.cont;
    els.forEach(c => {
      const cn = parseEl(c, warns, ck);
      if (cn) n.ch.push(cn);
    });
  } else {
    const txt = [...el.childNodes]
      .filter(x => x.nodeType === 3)
      .map(x => x.textContent)
      .join('')
      .trim();
    if (txt) {
      if ('Content' in T.d || T.pr.includes('Content')) n.p.Content = txt;
      else if (T.pr.includes('Text')) n.p.Text = txt;
    }
    const sub = kids.filter(c => !c.localName.includes('.'));
    if (sub.length)
      warns.push(
        L(
          `${t}${n.name ? ' ' + n.name : ''}: zagnieżdżona zawartość <${sub[0].localName}> nie jest edytowana wizualnie.`,
          `${t}${n.name ? ' ' + n.name : ''}: nested content <${sub[0].localName}> is not edited visually.`,
        ),
      );
  }
  return n;
}
