/**
 * CappyCoder WPF — 08 · Walidacja XAML
 *
 * Zadanie: Sprawdza XAML jak projektant VS: błędy składni XML, nieznane elementy i atrybuty, wartości, brakujące
 *   procedury obsługi zdarzeń (kody MC3000, XLS0414, XLS0413, …) wraz z poprawkami jednym kliknięciem.
 * Zależy od: 01, 07
 * Udostępnia: validateXaml, applyXamlFix, suggest
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const XPOS = { handlers: {}, names: {} };
const WPF_OTHER = new Set(
  'Page UserControl Application ResourceDictionary Style Setter Trigger DataTrigger MultiTrigger MultiDataTrigger EventTrigger Condition ControlTemplate DataTemplate ItemsPanelTemplate HierarchicalDataTemplate ContentPresenter ItemsPresenter ScrollContentPresenter ContentControl ItemsControl HeaderedContentControl HeaderedItemsControl Storyboard DoubleAnimation ColorAnimation ThicknessAnimation PointAnimation DoubleAnimationUsingKeyFrames LinearDoubleKeyFrame EasingDoubleKeyFrame BeginStoryboard StopStoryboard VisualStateManager VisualStateGroup VisualState RowDefinition ColumnDefinition TabItem ComboBoxItem ListBoxItem ListViewItem MenuItem TreeViewItem StatusBarItem ToolBarTray ContextMenu ToolTip Popup DataGridTextColumn DataGridCheckBoxColumn DataGridComboBoxColumn DataGridTemplateColumn DataGridHyperlinkColumn GridView GridViewColumn GridViewColumnHeader FlowDocument Paragraph Run Bold Italic Underline LineBreak Hyperlink Span Section List ListItem Table TableColumn TableRowGroup TableRow TableCell BlockUIContainer InlineUIContainer Figure Floater FlowDocumentScrollViewer FlowDocumentReader FlowDocumentPageViewer DocumentViewer Frame WebBrowser GridSplitter Thumb Path Polyline SolidColorBrush LinearGradientBrush RadialGradientBrush GradientStop ImageBrush VisualBrush DrawingBrush DropShadowEffect BlurEffect RotateTransform ScaleTransform TranslateTransform SkewTransform TransformGroup MatrixTransform BitmapImage Binding MultiBinding RelativeSource StaticResource DynamicResource KeyBinding MouseBinding CommandBinding AccessText VirtualizingStackPanel Panel Decorator AdornerDecorator BulletDecorator NavigationWindow Popup TickBar Track ResizeGrip Viewport3D InkPresenter DocumentPageView Glyphs PathGeometry PathFigure LineSegment ArcSegment BezierSegment EllipseGeometry RectangleGeometry LineGeometry GeometryGroup CombinedGeometry StreamGeometry Pen Color FontFamily Thickness CornerRadius Point Rect Size Duration KeyTime Window String Double Int32 Boolean Object Array Null Type Static TaskbarItemInfo ThumbButtonInfo WindowChrome'.split(
    ' ',
  ),
);
const FE_ALL =
  'Name Uid Style DataContext FlowDirection Language LayoutTransform RenderTransform RenderTransformOrigin Focusable IsHitTestVisible SnapsToDevicePixels UseLayoutRounding Effect OpacityMask Clip AllowDrop ContextMenu FocusVisualStyle ForceCursor InputScope BindingGroup Resources Triggers IsManipulationEnabled Visibility Opacity Tag ToolTip Cursor IsEnabled Margin HorizontalAlignment VerticalAlignment Width Height MinWidth MinHeight MaxWidth MaxHeight ClipToBounds'.split(
    ' ',
  );
const CTL_ALL =
  'Template Background Foreground BorderBrush BorderThickness Padding FontFamily FontSize FontWeight FontStyle FontStretch HorizontalContentAlignment VerticalContentAlignment TabIndex IsTabStop'.split(
    ' ',
  );
const CONTENT_ALL =
  'Content ContentTemplate ContentStringFormat ContentTemplateSelector Command CommandParameter CommandTarget'.split(
    ' ',
  );
const ITEMS_ALL =
  'ItemsSource ItemTemplate ItemsPanel ItemContainerStyle DisplayMemberPath AlternationCount ItemStringFormat IsTextSearchEnabled SelectedValuePath SelectedValue SelectedItem IsSynchronizedWithCurrentItem'.split(
    ' ',
  );
const SHAPE_ALL =
  'Fill Stroke StrokeThickness Stretch StrokeStartLineCap StrokeEndLineCap StrokeLineJoin StrokeDashCap StrokeDashOffset StrokeMiterLimit StrokeDashArray'.split(
    ' ',
  );
const TEXT_EXTRA =
  'SelectionBrush CaretBrush SelectionOpacity IsUndoEnabled UndoLimit MinLines MaxLines FontStretch IsInactiveSelectionHighlightEnabled'.split(
    ' ',
  );
const WIN_EXTRA =
  'Left Top Content ShowActivated Owner DataContext Name Style ResizeMode Language FlowDirection Width Height UseLayoutRounding x:Class'.split(
    ' ',
  );
const EV_EXTRA = new Set(
  'Unloaded Initialized IsVisibleChanged DataContextChanged MouseLeftButtonUp MouseRightButtonUp PreviewMouseUp PreviewMouseMove PreviewMouseWheel PreviewMouseLeftButtonDown PreviewMouseLeftButtonUp PreviewMouseRightButtonDown PreviewKeyUp PreviewTextInput PreviewGotKeyboardFocus GotKeyboardFocus LostKeyboardFocus DragEnter DragLeave DragOver Drop PreviewDrop TouchDown TouchUp TouchMove StylusDown ContextMenuOpening ContextMenuClosing ToolTipOpening ToolTipClosing RequestBringIntoView LayoutUpdated SourceUpdated TargetUpdated Selected Unselected Click Checked Unchecked TextChanged SelectionChanged ValueChanged Expanded Collapsed Closing Closed Activated Deactivated ContentRendered StateChanged LocationChanged ManipulationStarted ManipulationDelta ManipulationCompleted'.split(
    ' ',
  ),
);
const ENUM_EXTRA = {
  FontWeight: ['DemiBold', 'UltraBold', 'Heavy', 'Regular', 'ExtraBlack', 'UltraBlack', 'UltraLight'],
  FirstDayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
};
const ENUM_SKIP = new Set(['FontFamily', 'Cursor', 'TextDecorations']);
const INT_PROPS = new Set([
  'SelectedIndex',
  'TabIndex',
  'MaxLength',
  'Rows',
  'FirstColumn',
  'Panel.ZIndex',
  'Grid.Row',
  'Grid.Column',
  'Grid.RowSpan',
  'Grid.ColumnSpan',
  'Band',
  'BandIndex',
  'Delay',
  'Interval',
  'MinLines',
  'MaxLines',
  'AlternationCount',
]);
const SINGLE_CHILD = new Set([
  'Border',
  'Viewbox',
  'ScrollViewer',
  'Expander',
  'GroupBox',
  'Button',
  'RepeatButton',
  'ToggleButton',
  'Label',
  'CheckBox',
  'RadioButton',
  'Window',
  'ContentControl',
  'TabItem',
  'ListBoxItem',
  'ComboBoxItem',
  'Frame',
]);
const PANELS = new Set([
  'Grid',
  'StackPanel',
  'Canvas',
  'WrapPanel',
  'DockPanel',
  'UniformGrid',
  'VirtualizingStackPanel',
]);

function lev(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const m = a.length,
    n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
function suggest(word, cands) {
  let best = null,
    bd = 99;
  for (const c of cands) {
    const d = lev(word, c);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return bd <= Math.max(1, Math.floor(word.length / 3)) ? best : null;
}
function apiAttrs(t) {
  try {
    const ti = IS.T[t];
    if (!ti || !ti.api) return [];
    return IS.membersOf(t, false)
      .filter(
        m =>
          (m.kind === 'p' && !m.ro) ||
          m.kind === 'e' ||
          (m.kind === 'p' &&
            /Collection$|^(Children|Items|Inlines|Blocks|RowDefinitions|ColumnDefinitions|Columns|Resources|Triggers)$/.test(
              m.name,
            )),
      )
      .map(m => m.name);
  } catch (e) {
    return [];
  }
}
function attrsFor(t) {
  if (t === 'Window')
    return new Set([...WIN.pr, ...WIN.ev, ...FE_ALL, ...CTL_ALL, ...WIN_EXTRA, ...apiAttrs('Window')]);
  const T = TY[t];
  if (!T) {
    const a = apiAttrs(t);
    return a.length ? new Set(a) : null;
  }
  const s = new Set([...propKeys({ id: 'x', t }), ...eventKeys({ id: 'x', t }), ...FE_ALL]);
  s.delete('Items');
  if (t === 'DataGrid') s.delete('Columns');
  if (t === 'RichTextBox') s.delete('Text');
  if (T.k === 'ctl') CTL_ALL.forEach(x => s.add(x));
  if (T.k === 'ctl' && (T.pr.includes('Content') || T.cont)) CONTENT_ALL.forEach(x => s.add(x));
  if (T.it || ['ComboBox', 'ListBox', 'ListView', 'DataGrid', 'TabControl'].includes(t))
    ITEMS_ALL.forEach(x => s.add(x));
  if (T.k === 'shp' || t === 'Line' || t === 'Polygon') SHAPE_ALL.forEach(x => s.add(x));
  if (t === 'TextBox' || t === 'PasswordBox' || t === 'RichTextBox') TEXT_EXTRA.forEach(x => s.add(x));
  if (t === 'TextBlock')
    ['FontStretch', 'Inlines', 'TextEffects', 'BaselineOffset', 'IsHyphenationEnabled'].forEach(x => s.add(x));
  if (t === 'Expander' || t === 'GroupBox') ['HeaderTemplate', 'HeaderStringFormat'].forEach(x => s.add(x));
  apiAttrs(t).forEach(x => s.add(x));
  return s;
}
function xmlErrorInfo(raw) {
  raw = String(raw || '');
  let line = 1,
    col = 1;
  let m = /line\s+(\d+)\s+at\s+column\s+(\d+)/i.exec(raw) || /Line Number (\d+), Column (\d+)/i.exec(raw);
  if (m) {
    line = +m[1];
    col = +m[2];
  } else if ((m = /line\s*(\d+)/i.exec(raw))) line = +m[1];
  const body = raw
    .replace(/^This page contains the following errors:/, '')
    .replace(/Below is a rendering[\s\S]*$/, '')
    .replace(/^.*?column \d+:\s*/i, '')
    .replace(/^XML Parsing Error:\s*/i, '')
    .split('\n')[0]
    .trim();
  const T = [
    [
      /Opening and ending tag mismatch: (\S+) line (\d+) and (\S+)/,
      a =>
        L(
          `Znacznik zamykający </${a[3]}> nie pasuje do otwartego <${a[1]}> z wiersza ${a[2]}.`,
          `The closing tag </${a[3]}> does not match the open tag <${a[1]}> from line ${a[2]}.`,
        ),
    ],
    [
      /mismatched tag\. Expected: <\/(\S+)>/,
      a => L(`Oczekiwano znacznika zamykającego </${a[1]}>.`, `Expected the closing tag </${a[1]}>.`),
    ],
    [
      /Premature end of data in tag (\S+) line (\d+)/,
      a =>
        L(
          `Brak znacznika zamykającego </${a[1]}> (element otwarty w wierszu ${a[2]}).`,
          `Missing closing tag </${a[1]}> (element opened on line ${a[2]}).`,
        ),
    ],
    [
      /no root element found|Document is empty|Start tag expected/,
      () =>
        L(
          'Dokument XAML jest pusty albo nie zaczyna się od znacznika.',
          'The XAML document is empty or does not start with a tag.',
        ),
    ],
    [
      /Couldn't find end of Start Tag (\S+)|attributes construct error/,
      a =>
        L(
          `Nieprawidłowa składnia znacznika${a[1] ? ' <' + a[1] + '>' : ''}: sprawdź cudzysłowy, znaki = i zamknięcie „>” lub „/>”.`,
          `Invalid tag syntax${a[1] ? ' in <' + a[1] + '>' : ''}: check the quotes, = signs and the closing ">" or "/>".`,
        ),
    ],
    [
      /Attribute (\S+) redefined|duplicate attribute/,
      a =>
        L(
          `Atrybut ${a[1] ? '„' + a[1] + '” ' : ''}jest ustawiony więcej niż raz.`,
          `The attribute ${a[1] ? "'" + a[1] + "' " : ''}is set more than once.`,
        ),
    ],
    [
      /AttValue: " or ' expected|not well-formed.*attribute/,
      () =>
        L(
          'Wartość atrybutu musi być w cudzysłowie, np. Width="100".',
          'Attribute values must be in quotes, for example Width="100".',
        ),
    ],
    [
      /Specification mandates value for attribute (\S+)/,
      a => L(`Atrybut „${a[1]}” nie ma wartości (brak ="…").`, `The attribute '${a[1]}' has no value (missing ="…").`),
    ],
    [
      /Extra content at the end of the document|junk after document element/,
      () =>
        L(
          'Dodatkowa zawartość po zamknięciu </Window>. Dokument może mieć tylko jeden element główny.',
          'Extra content after the closing </Window> tag. A document can have only one root element.',
        ),
    ],
    [
      /StartTag: invalid element name|not well-formed/,
      () =>
        L(
          'Nieprawidłowa składnia: po „<” musi wystąpić nazwa elementu. Znak < w tekście zapisz jako &lt;.',
          'Invalid syntax: "<" must be followed by an element name. Write a literal < as &lt;.',
        ),
    ],
    [
      /xmlParseEntityRef|EntityRef: expecting ';'|undefined entity/,
      () => L('Znak & musi być zapisany jako &amp;.', 'The & character must be written as &amp;.'),
    ],
    [
      /Namespace prefix (\S+)(?: for (\S+))? on (\S+) is not defined|unbound prefix/,
      a =>
        L(
          `Prefiks przestrzeni nazw „${a[1] || '?'}” nie jest zdefiniowany (brak xmlns:${a[1] || '…'}).`,
          `The namespace prefix '${a[1] || '?'}' is not defined (missing xmlns:${a[1] || '…'}).`,
        ),
    ],
    [
      /Unescaped '<' not allowed in attributes values/,
      () => L('Znak < w wartości atrybutu zapisz jako &lt;.', 'Write < inside an attribute value as &lt;.'),
    ],
    [
      /Comment not terminated|unclosed comment/,
      () => L('Niezamknięty komentarz <!-- … -->.', 'Unterminated comment <!-- … -->.'),
    ],
    [/expected '>'|unclosed token/, () => L('Oczekiwano „>”.', "'>' expected.")],
  ];
  for (const [re, f] of T) {
    const a = re.exec(body);
    if (a) return { line, col, msg: f(a) };
  }
  return { line, col, msg: L('Błąd składni XAML: ', 'XAML syntax error: ') + body.slice(0, 200) };
}
function scanXml(text) {
  const evs = [];
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  const pos = i => {
    let lo = 0,
      hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= i) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: i - starts[lo] + 1 };
  };
  let i = 0;
  while (i < text.length) {
    if (text.startsWith('<!--', i)) {
      const j = text.indexOf('-->', i);
      i = j < 0 ? text.length : j + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', i)) {
      const j = text.indexOf(']]>', i);
      i = j < 0 ? text.length : j + 3;
      continue;
    }
    if (text.startsWith('<?', i)) {
      const j = text.indexOf('?>', i);
      i = j < 0 ? text.length : j + 2;
      continue;
    }
    if (text[i] === '<') {
      const close = text[i + 1] === '/';
      const m = /^<\/?([\w.:-]+)/.exec(text.slice(i, i + 200));
      if (!m) {
        i++;
        continue;
      }
      const name = m[1];
      const p0 = pos(i + (close ? 2 : 1));
      let j = i + m[0].length;
      const attrs = [];
      while (j < text.length && text[j] !== '>' && !(text[j] === '/' && text[j + 1] === '>')) {
        const am = /^\s*([\w.:-]+)\s*=\s*("([^"]*)"|'([^']*)')/.exec(text.slice(j, j + 4000));
        if (am) {
          const ns = j + am[0].indexOf(am[1]);
          const vs = j + am[0].length - am[2].length + 1;
          attrs.push({
            name: am[1],
            value: (am[3] ?? am[4])
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&#xA;/gi, '\n'),
            ...pos(ns),
            vpos: pos(vs),
            vlen: (am[3] ?? am[4]).length,
          });
          j += am[0].length;
        } else j++;
      }
      const self = text[j] === '/';
      evs.push({ type: close ? 'close' : 'open', name, line: p0.line, col: p0.col, attrs, self });
      i = j + (self ? 2 : 1);
      continue;
    }
    const j = text.indexOf('<', i);
    const end = j < 0 ? text.length : j;
    const t = text.slice(i, end);
    if (t.trim()) {
      const k = i + (t.length - t.trimStart().length);
      evs.push({ type: 'text', value: t.trim(), ...pos(k) });
    }
    i = end;
  }
  return evs;
}
function validateXaml(text) {
  const errs = [];
  XPOS.handlers = {};
  XPOS.names = {};
  const E = (sev, code, msg, line, col, len, extra) =>
    errs.push(Object.assign({ sev, code, msg, line, col, len }, extra || {}));
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const pe = doc.getElementsByTagName('parsererror')[0];
  if (pe) {
    const x = xmlErrorInfo(pe.textContent);
    E('err', 'MC3000', x.msg, x.line, x.col, 1);
    return errs;
  }
  const evs = scanXml(text);
  const stack = [];
  const allTypes = [...Object.keys(TY), ...WPF_OTHER];
  let first = true;
  for (const ev of evs) {
    if (ev.type === 'close') {
      stack.pop();
      continue;
    }
    const parent = stack[stack.length - 1];
    if (ev.type === 'text') {
      if (parent && (PANELS.has(parent.name) || (parent.name === 'Window' && parent.kids > 0)))
        E(
          'err',
          'MC3088',
          L(
            `Typ „${parent.name}” nie przyjmuje tekstu bezpośrednio — umieść go w kontrolce, np. TextBlock.`,
            `The type '${parent.name}' does not accept text directly. Put it inside a control such as TextBlock.`,
          ),
          ev.line,
          ev.col,
          Math.min(ev.value.length, 40),
        );
      else if (parent && SINGLE_CHILD.has(parent.name)) {
        parent.kids++;
        if (parent.kids > 1 || parent.contentAttr)
          E(
            'err',
            'XLS0501',
            L(`Właściwość „Content” jest ustawiona więcej niż raz.`, `The property 'Content' is set more than once.`),
            ev.line,
            ev.col,
            Math.min(ev.value.length, 40),
          );
      }
      continue;
    }
    const name = ev.name;
    const local = name.includes(':') ? null : name;
    const dot = local && local.includes('.');
    const node = { name, kids: 0, contentAttr: false, line: ev.line };
    if (first) {
      first = false;
      if (name !== 'Window')
        E(
          'err',
          'XAML',
          L('Elementem głównym musi być <Window>.', 'The root element must be <Window>.'),
          ev.line,
          ev.col,
          name.length,
        );
    }
    if (parent && !dot) {
      if (SINGLE_CHILD.has(parent.name) || parent.name === 'Window') {
        parent.kids++;
        if (parent.kids > 1 || parent.contentAttr)
          E(
            'err',
            'XLS0501',
            L(
              `Właściwość „${parent.name === 'Border' || parent.name === 'Viewbox' ? 'Child' : 'Content'}” jest ustawiona więcej niż raz${parent.name === 'Window' ? ' — okno może mieć tylko jeden element główny (np. Grid)' : ''}.`,
              `The property '${parent.name === 'Border' || parent.name === 'Viewbox' ? 'Child' : 'Content'}' is set more than once${parent.name === 'Window' ? '. A window can have only one root element, such as a Grid' : ''}.`,
            ),
            ev.line,
            ev.col,
            name.length,
          );
      }
      if (['Border', 'Viewbox'].includes(parent.name)) {
      }
    }
    if (local && !dot) {
      if (!TY[local] && !WPF_OTHER.has(local)) {
        const s = suggest(local, allTypes);
        E(
          'err',
          'XLS0414',
          L(
            `Nie znaleziono typu „${local}”.${s ? ` Czy chodziło o „${s}”?` : ''}`,
            `The type '${local}' was not found.${s ? ` Did you mean '${s}'?` : ''}`,
          ),
          ev.line,
          ev.col,
          local.length,
          s ? { fixTo: s, fixKind: 'tag', fixFrom: local } : null,
        );
      } else if (
        !TY[local] &&
        local !== 'Window' &&
        parent &&
        (parent.name === 'Window' || (TY[parent.name] && TY[parent.name].cont && TY[parent.name].cont !== 'tab'))
      ) {
        E(
          'warn',
          'XAML',
          L(
            `Element <${local}> nie jest edytowany wizualnie — zmiana w widoku projektu usunie go z XAML.`,
            `<${local}> is not edited visually; a change in the design view removes it from the XAML.`,
          ),
          ev.line,
          ev.col,
          local.length,
        );
      }
    } else if (dot) {
      const [owner, prop] = local.split('.');
      if (parent && owner !== parent.name && TY[parent.name])
        E(
          'err',
          'MC3018',
          L(
            `Element właściwości <${local}> musi być dzieckiem <${owner}>, a jest w <${parent.name}>.`,
            `The property element <${local}> must be a child of <${owner}>, but it is inside <${parent.name}>.`,
          ),
          ev.line,
          ev.col,
          local.length,
        );
      else if (!(owner === 'DataGrid' && prop === 'Columns') && (owner === 'Window' || TY[owner]))
        E(
          'warn',
          'XAML',
          L(
            `<${local}> nie jest edytowane wizualnie — zmiana w widoku projektu usunie tę sekcję.`,
            `<${local}> is not edited visually; a change in the design view removes this section.`,
          ),
          ev.line,
          ev.col,
          local.length,
        );
    }
    // atrybuty
    const allowed = local && !dot ? attrsFor(local) : null;
    for (const a of ev.attrs) {
      const an = a.name,
        v = a.value;
      if (
        /^(xmlns|mc:|d:)/.test(an) ||
        an === 'x:Class' ||
        an === 'x:Key' ||
        an === 'x:Uid' ||
        an === 'x:FieldModifier'
      )
        continue;
      if (an === 'x:Name' || an === 'Name') {
        if (!IDRE.test(v) || CS.KW.has(v))
          E(
            'err',
            'MC3062',
            L(
              `„${v}” nie jest prawidłową wartością x:Name — musi być identyfikatorem C# (litery, cyfry i _, bez spacji i polskich znaków, nie zaczyna się cyfrą).`,
              `'${v}' is not a valid x:Name value. It must be a C# identifier (letters, digits and _, no spaces, not starting with a digit).`,
            ),
            a.vpos.line,
            a.vpos.col,
            Math.max(1, a.vlen),
          );
        else if (XPOS.names[v])
          E(
            'err',
            'MC3093',
            L(
              `Nazwa „${v}” jest już zarejestrowana w tym zakresie nazw (wiersz ${XPOS.names[v]}).`,
              `The name '${v}' is already registered in this name scope (line ${XPOS.names[v]}).`,
            ),
            a.vpos.line,
            a.vpos.col,
            a.vlen,
          );
        else XPOS.names[v] = a.line;
        continue;
      }
      if (an.startsWith('x:')) continue;
      const isEvent = ALL_EVENTS.has(an) || EV_EXTRA.has(an);
      if (isEvent) {
        if (!IDRE.test(v))
          E(
            'err',
            'XLS0508',
            L(
              `„${v}” nie jest prawidłową nazwą metody obsługi zdarzenia ${an}.`,
              `'${v}' is not a valid handler name for event ${an}.`,
            ),
            a.vpos.line,
            a.vpos.col,
            Math.max(1, a.vlen),
          );
        else if (!XPOS.handlers[v]) XPOS.handlers[v] = { line: a.vpos.line, col: a.vpos.col, len: a.vlen };
        if (allowed && !allowed.has(an) && !EV_EXTRA.has(an))
          E(
            'err',
            'XLS0413',
            L(
              `Zdarzenie „${an}” nie istnieje w typie „${local}”.`,
              `The event '${an}' does not exist in type '${local}'.`,
            ),
            a.line,
            a.col,
            an.length,
          );
        continue;
      }
      if (an.includes('.')) {
        const owner = an.split('.')[0];
        if (
          !TY[owner] &&
          !WPF_OTHER.has(owner) &&
          !/^(ToolTipService|AutomationProperties|KeyboardNavigation|ScrollViewer|VirtualizingPanel|VirtualizingStackPanel|TextOptions|RenderOptions|Validation|Typography|SpellCheck|InputMethod|FocusManager|ContextMenuService|Selector|TextSearch|Panel|Grid|Canvas|DockPanel|ToolBar|Stylus|Binding|TextElement|Control|FrameworkElement|UIElement|Window|Interaction|i)$/.test(
            owner,
          )
        )
          E(
            'err',
            'XLS0414',
            L(
              `Nie znaleziono typu „${owner}” dla właściwości dołączonej „${an}”.`,
              `The type '${owner}' was not found for the attached property '${an}'.`,
            ),
            a.line,
            a.col,
            an.length,
          );
        if (INT_PROPS.has(an) && !/^\{/.test(v) && !/^-?\d+$/.test(v.trim()))
          E(
            'err',
            'XDG0062',
            L(`„${v}” nie jest prawidłową liczbą całkowitą dla „${an}”.`, `'${v}' is not a valid integer for '${an}'.`),
            a.vpos.line,
            a.vpos.col,
            Math.max(1, a.vlen),
          );
        if (/^Grid\.(Row|Column|RowSpan|ColumnSpan)$/.test(an) && TY[local])
          E(
            'warn',
            'XAML',
            L(
              `${an}: wiersze i kolumny Grid nie są edytowane wizualnie — projektant zachowa pozycję z Margin.`,
              `${an}: Grid rows and columns are not edited visually; the designer keeps the Margin position.`,
            ),
            a.line,
            a.col,
            an.length,
          );
        if (/^Canvas\.(Left|Top|Right|Bottom)$/.test(an) && !/^\{/.test(v) && isNaN(parseFloat(v)))
          E(
            'err',
            'XDG0062',
            L(`„${v}” nie jest prawidłową liczbą dla „${an}”.`, `'${v}' is not a valid number for '${an}'.`),
            a.vpos.line,
            a.vpos.col,
            Math.max(1, a.vlen),
          );
        continue;
      }
      if (allowed && !allowed.has(an)) {
        const s = suggest(an, [...allowed]);
        E(
          'err',
          'XLS0413',
          L(
            `Nie znaleziono właściwości „${an}” w typie „${local}”.${s ? ` Czy chodziło o „${s}”?` : ''}`,
            `The property '${an}' was not found in type '${local}'.${s ? ` Did you mean '${s}'?` : ''}`,
          ),
          a.line,
          a.col,
          an.length,
          s ? { fixTo: s, fixKind: 'attr', fixFrom: an } : null,
        );
        continue;
      }
      if (an === 'Content' && local && SINGLE_CHILD.has(local)) node.contentAttr = true;
      if (!allowed || /^\{/.test(v)) continue;
      const bad = checkValue(local, an, v);
      if (bad) E('err', 'XDG0062', bad, a.vpos.line, a.vpos.col, Math.max(1, a.vlen));
      if (local === 'Image' && an === 'Source' && v && !assetUrl(v) && !/^https?:|^pack:/.test(v))
        E(
          'warn',
          'XAML',
          L(
            `Plik „${v}” nie został dodany do projektu — użyj przycisku „Plik…” we właściwości Source.`,
            `The file '${v}' has not been added to the project. Use the "File…" button on the Source property.`,
          ),
          a.vpos.line,
          a.vpos.col,
          Math.max(1, a.vlen),
        );
    }
    if (!ev.self) stack.push(node);
    else if (node.contentAttr) {
    }
  }
  return errs;
}
function checkValue(t, an, v) {
  const pt = ptype(t === 'Window' ? 'Window' : t, an);
  const s = v.trim();
  const isNum = x => /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(x);
  const commaHint = /^\d+,\d+$/.test(s)
    ? L(
        ' W XAML część dziesiętną oddziela się kropką (np. 1.5).',
        ' In XAML the decimal separator is a dot (for example 1.5).',
      )
    : '';
  if (Array.isArray(pt)) {
    if (ENUM_SKIP.has(an)) return null;
    const opts = [...pt, ...(ENUM_EXTRA[an] || [])];
    if (!opts.some(o => o.toLowerCase() === s.toLowerCase())) {
      const sg = suggest(s, opts);
      return L(
        `„${v}” nie jest prawidłową wartością właściwości „${an}”.${sg ? ` Czy chodziło o „${sg}”?` : ''} Dozwolone: ${opts.join(', ')}.`,
        `'${v}' is not a valid value for property '${an}'.${sg ? ` Did you mean '${sg}'?` : ''} Allowed: ${opts.join(', ')}.`,
      );
    }
    return null;
  }
  if (pt === 'bool')
    return /^(true|false)$/i.test(s) || /x:Null/.test(s)
      ? null
      : L(
          `„${v}” nie jest prawidłową wartością dla „${an}” (dozwolone: True lub False).`,
          `'${v}' is not a valid value for '${an}' (allowed: True or False).`,
        );
  if (pt === 'size')
    return isNum(s) || /^(auto|nan)$/i.test(s)
      ? null
      : L(
          `„${v}” nie jest prawidłową wartością dla „${an}” (liczba lub Auto).${commaHint}`,
          `'${v}' is not a valid value for '${an}' (a number or Auto).${commaHint}`,
        );
  if (pt === 'num') {
    if (INT_PROPS.has(an) || (an === 'Columns' && t === 'UniformGrid'))
      return /^-?\d+$/.test(s)
        ? null
        : L(`„${v}” nie jest prawidłową liczbą całkowitą dla „${an}”.`, `'${v}' is not a valid integer for '${an}'.`);
    return isNum(s)
      ? null
      : L(
          `„${v}” nie jest prawidłową liczbą dla „${an}”.${commaHint}`,
          `'${v}' is not a valid number for '${an}'.${commaHint}`,
        );
  }
  if (pt === 'thick' || pt === 'margin') {
    const p = s.split(/\s*,\s*|\s+/);
    return (p.length === 1 || p.length === 2 || p.length === 4) && p.every(isNum)
      ? null
      : L(
          `„${v}” nie jest prawidłową wartością Thickness dla „${an}” (1, 2 lub 4 liczby, np. 10,5,10,5).`,
          `'${v}' is not a valid Thickness for '${an}' (1, 2 or 4 numbers, for example 10,5,10,5).`,
        );
  }
  if (an === 'CornerRadius') {
    const p = s.split(/\s*,\s*|\s+/);
    return (p.length === 1 || p.length === 4) && p.every(isNum)
      ? null
      : L(
          `„${v}” nie jest prawidłową wartością CornerRadius (1 lub 4 liczby).`,
          `'${v}' is not a valid CornerRadius (1 or 4 numbers).`,
        );
  }
  if (pt === 'brush') {
    if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) || /^sc#/i.test(s)) return null;
    if (
      /^[A-Za-z]+$/.test(s) &&
      (s.toLowerCase() === 'transparent' || (window.CSS && CSS.supports && CSS.supports('color', s)))
    )
      return null;
    const sg = suggest(s, NAMED);
    return L(
      `„${v}” nie jest prawidłowym kolorem dla „${an}”.${sg ? ` Czy chodziło o „${sg}”?` : ''} Użyj nazwy (np. Red) lub zapisu #RRGGBB / #AARRGGBB.`,
      `'${v}' is not a valid color for '${an}'.${sg ? ` Did you mean '${sg}'?` : ''} Use a name (for example Red) or #RRGGBB / #AARRGGBB.`,
    );
  }
  return null;
}
/* szybka poprawka: zamiana nazwy w tekście XAML */
function applyXamlFix(e) {
  const lines = EDX.get().split('\n');
  const ln = lines[e.line - 1];
  if (ln == null) return;
  const i = e.col - 1;
  if (ln.substr(i, e.fixFrom.length) !== e.fixFrom) return;
  lines[e.line - 1] = ln.slice(0, i) + e.fixTo + ln.slice(i + e.fixFrom.length);
  let txt = lines.join('\n');
  if (e.fixKind === 'tag') txt = txt.replace(new RegExp('</' + e.fixFrom + '>', ''), '</' + e.fixTo + '>');
  EDX.set(txt);
  applyXaml();
  status(L(`Zmieniono „${e.fixFrom}” na „${e.fixTo}”.`, `Changed '${e.fixFrom}' to '${e.fixTo}'.`));
}
