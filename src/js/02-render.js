/**
 * CappyCoder WPF — 02 · Renderowanie kontrolek
 *
 * Zadanie: Rysuje kontrolki w stylu Windows 11 (R.*) — w projektancie i w uruchomionej symulacji.
 * Zależy od: 01
 * Udostępnia: R, winFrame, …
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const CHECK =
  '<svg viewBox="0 0 10 10"><path d="M1.5 5.2l2.4 2.3 4.6-5" fill="none" stroke="#212121" stroke-width="1.5"/></svg>';
const ARROW = '<svg viewBox="0 0 8 5" width="8" height="5"><path d="M0 0l4 4 4-4" fill="none" stroke="#606060"/></svg>';
const CALICON =
  '<svg viewBox="0 0 16 16" width="14" height="14"><rect x="1.5" y="2.5" width="13" height="12" fill="#fff" stroke="#555"/><path d="M1.5 5.5h13" stroke="#555"/><path d="M4 8h2M7 8h2M10 8h2M4 11h2M7 11h2" stroke="#555"/></svg>';
const MONTHS_PL = [
  'styczeń',
  'luty',
  'marzec',
  'kwiecień',
  'maj',
  'czerwiec',
  'lipiec',
  'sierpień',
  'wrzesień',
  'październik',
  'listopad',
  'grudzień',
];
const MONTHS_EN = [
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
];
function parseDate(v) {
  if (!v) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v) || /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(v);
  if (!m) return null;
  return m[1].length === 4 ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(+m[3], +m[2] - 1, +m[1]);
}
const fmtD = d =>
  `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
const isoD = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function assetUrl(src) {
  if (!src) return null;
  if (/^(data:|blob:)/.test(src)) return src;
  const k = String(src).replace(/^\/|^pack:\/\/application:,,,\//, '');
  return P.assets[k] || P.assets[k.replace(/\\/g, '/')] || null;
}

/* item value → tekst */
const itemText = it =>
  it == null ? '' : typeof it === 'object' ? (it.__text != null ? it.__text : CSRT.fmt(it)) : CSRT.fmt(it);

const R = {};
R.Button =
  R.RepeatButton =
  R.ToggleButton =
    (s, n, x) => {
      const on = n.t === 'ToggleButton' && isTrue(s.IsChecked);
      return `<div class="v v-btn" style="${boxCss(s, { bg: on ? '#FFBEE6FD' : '#FFDDDDDD', bb: on ? '#FF3C7FB1' : '#FF707070', bt: '1', pad: '1' })}${fontCss(s)}justify-content:${AL[s.HorizontalContentAlignment || 'Center']};align-items:${AL[s.VerticalContentAlignment || 'Center']}"><span class="cnt">${esc(s.Content)}</span></div>`;
    };
R.Label = s =>
  `<div class="v v-lbl" style="${boxCss(s, { pad: '5' })}${fontCss(s)}justify-content:${AL[s.HorizontalContentAlignment || 'Left']};align-items:${AL[s.VerticalContentAlignment || 'Top']}"><span class="cnt">${esc(s.Content)}</span></div>`;
R.TextBlock = s => {
  const wrap = (s.TextWrapping || 'NoWrap') !== 'NoWrap';
  const deco = s.TextDecorations
    ? `text-decoration:${{ Underline: 'underline', Strikethrough: 'line-through', OverLine: 'overline' }[s.TextDecorations] || 'none'};`
    : '';
  return `<div class="v v-tb" style="background:${brush(s.Background, 'transparent')};padding:${th(s.Padding)};${fontCss(s)}white-space:${wrap ? 'pre-wrap' : 'pre'};text-align:${(s.TextAlignment || 'Left').toLowerCase()};${s.TextTrimming && s.TextTrimming !== 'None' ? 'text-overflow:ellipsis;' : ''}${deco}${s.LineHeight ? `line-height:${num(s.LineHeight, 16)}px;` : ''}">${esc(s.Text)}</div>`;
};
R.TextBox = (s, n, x) => {
  const wrap = (s.TextWrapping || 'NoWrap') !== 'NoWrap';
  const css = `${boxCss(s, { bg: '#FFFFFFFF', bb: '#FFABADB3', bt: '1', pad: '1' })}${fontCss(s)}text-align:${(s.TextAlignment || 'Left').toLowerCase()};align-items:${AL[s.VerticalContentAlignment || 'Top']}`;
  if (x && x.run) {
    const multi = isTrue(s.AcceptsReturn) || wrap;
    const ro = isTrue(s.IsReadOnly) ? ' readonly' : '';
    const ml = s.MaxLength && +s.MaxLength > 0 ? ` maxlength="${+s.MaxLength}"` : '';
    const cc =
      s.CharacterCasing === 'Upper'
        ? 'text-transform:uppercase;'
        : s.CharacterCasing === 'Lower'
          ? 'text-transform:lowercase;'
          : '';
    return `<div class="v v-txt" style="${css}">${multi ? `<textarea spellcheck="false"${ro}${ml} style="${cc}white-space:${wrap ? 'pre-wrap' : 'pre'}">${esc(s.Text)}</textarea>` : `<input spellcheck="false"${ro}${ml} style="${cc}" value="${esc(s.Text)}">`}</div>`;
  }
  return `<div class="v v-txt" style="${css}"><div class="t" style="white-space:${wrap ? 'pre-wrap' : 'pre'}">${esc(s.Text)}</div></div>`;
};
R.PasswordBox = (s, n, x) => {
  const css = `${boxCss(s, { bg: '#FFFFFFFF', bb: '#FFABADB3', bt: '1', pad: '1' })}${fontCss(s)}`;
  if (x && x.run)
    return `<div class="v v-txt v-pwd" style="${css}"><input type="password" value="${esc(s.Password || '')}"${s.MaxLength ? ` maxlength="${+s.MaxLength}"` : ''}></div>`;
  return `<div class="v v-txt v-pwd" style="${css}"><div class="t">${'●'.repeat((s.Password || '').length)}</div></div>`;
};
R.RichTextBox = (s, n, x) => {
  const css = `${boxCss(s, { bg: '#FFFFFFFF', bb: '#FFABADB3', bt: '1', pad: '1' })}${fontCss(s)}`;
  if (x && x.run)
    return `<div class="v v-txt v-rich" style="${css}"><div ${isTrue(s.IsReadOnly) ? '' : 'contenteditable="plaintext-only"'} style="padding:0 4px;white-space:pre-wrap;overflow:auto;height:100%">${esc(s.Text)}</div></div>`;
  return `<div class="v v-txt v-rich" style="${css}"><div class="t" style="padding:0 4px">${esc(s.Text)}</div></div>`;
};
R.CheckBox = R.RadioButton = (s, n) => {
  const rad = n.t === 'RadioButton';
  const ch = isTrue(s.IsChecked);
  const ind = /x:Null/.test(s.IsChecked || '');
  const mark = rad
    ? ch
      ? '<i></i>'
      : ''
    : ch
      ? CHECK
      : ind
        ? '<i style="width:7px;height:7px;background:#212121;display:block"></i>'
        : '';
  return `<div class="v v-chk${rad ? ' rad' : ''}" style="${fontCss(s)}padding:${th(s.Padding)};background:${brush(s.Background, 'transparent')};justify-content:${AL[s.HorizontalContentAlignment || 'Left']}"><span class="box" style="border-color:${brush(s.BorderBrush, '#707070')}">${mark}</span><span class="cnt">${esc(s.Content)}</span></div>`;
};
function flatItems(n, x) {
  if (x && x.run) return x.rt.items(n);
  return parseItems(n.p.Items, false).map(i => ({ __text: i.sep ? '────────' : i.text, sep: i.sep, h: i.h }));
}
R.ComboBox = (s, n, x) => {
  const items = flatItems(n, x);
  const si = num(s.SelectedIndex, -1);
  const txt = si >= 0 && items[si] ? itemText(items[si]) : s.Text || '';
  const sel =
    x && x.run
      ? `<select class="ovl" aria-label="${esc(n.name || 'ComboBox')}">${items.map((it, i) => `<option value="${i}"${i === si ? ' selected' : ''}>${esc(itemText(it))}</option>`).join('')}${si < 0 ? '<option value="-1" selected hidden></option>' : ''}</select>`
      : '';
  return `<div class="v v-combo" style="${boxCss(s, { bg: '#FFE9E9E9', bb: '#FFACACAC', bt: '1', pad: '2' })}${s.Background ? '' : 'background:linear-gradient(#f0f0f0,#e5e5e5);'}${fontCss(s)}"><span class="cbt">${esc(txt)}</span><span class="arr">${ARROW}</span>${sel}</div>`;
};
R.ListBox = R.ListView = (s, n, x) => {
  const items = flatItems(n, x);
  const si = num(s.SelectedIndex, -1);
  return `<div class="v v-list" style="${boxCss(s, { bg: '#FFFFFFFF', bb: n.t === 'ListView' ? '#FF828790' : '#FFABADB3', bt: '1', pad: '1' })}${fontCss(s)}">${items.map((it, i) => `<div class="li${i === si ? ' sel' : ''}" data-i="${i}">${esc(itemText(it))}</div>`).join('')}</div>`;
};
R.DataGrid = (s, n, x) => {
  const cols = parseItems(s.Columns, false).map(c => c.text);
  const rows = x && x.run ? x.rt.rows(n) : [];
  let cn = cols.length
    ? cols
    : rows[0] && typeof rows[0] === 'object'
      ? Object.keys(rows[0]).filter(k => !k.startsWith('__'))
      : [];
  const tpl = `12px ${cn.map(() => 'minmax(70px,max-content)').join(' ')} 1fr`;
  const si = num(s.SelectedIndex, -1);
  const cell = (r, c) => {
    if (r == null) return '';
    if (typeof r !== 'object') return CSRT.fmt(r);
    let v = r[c];
    if (v === undefined) v = r[ident(c)];
    return CSRT.fmt(v);
  };
  let h = `<div class="dgr dgh" style="grid-template-columns:${tpl}"><div class="rh"></div>${cn.map(c => `<div>${esc(c)}</div>`).join('')}<div></div></div>`;
  rows.forEach((r, i) => {
    h += `<div class="dgr${i === si ? ' sel' : ''}" data-i="${i}" style="grid-template-columns:${tpl}"><div class="rh"></div>${cn.map(c => `<div style="background:${i % 2 && s.AlternatingRowBackground ? brush(s.AlternatingRowBackground) : ''}">${esc(cell(r, c))}</div>`).join('')}<div style="border-right:0"></div></div>`;
  });
  if (s.CanUserAddRows !== 'False' && !isTrue(s.IsReadOnly))
    h += `<div class="dgr" style="grid-template-columns:${tpl}"><div class="rh"></div>${cn.map(() => '<div>&nbsp;</div>').join('')}<div style="border-right:0"></div></div>`;
  return `<div class="v v-dg" style="${boxCss(s, { bg: '#FFF0F0F0', bb: '#FF688CAF', bt: '1' })}${fontCss(s)}">${h}</div>`;
};
R.TreeView = (s, n, x) => {
  const items = parseItems(s.Items, true);
  let h = '';
  let idx = 0;
  const st = x && x.run ? x.rt.treeState(n) : { closed: new Set(), sel: -1 };
  const rec = (a, lvl) =>
    a.forEach(it => {
      const i = idx++;
      const open = !st.closed.has(i);
      h += `<div class="ti${st.sel === i ? ' sel' : ''}" data-i="${i}" style="padding-left:${lvl * 19}px"><span class="tw" data-tw="${i}">${it.ch.length ? (open ? '◢' : '▷') : ''}</span><span class="tx">${esc(it.text)}</span></div>`;
      if (it.ch.length && open) rec(it.ch, lvl + 1);
      else if (it.ch.length) {
        const skip = b =>
          b.forEach(c => {
            idx++;
            skip(c.ch);
          });
        skip(it.ch);
      }
    });
  rec(items, 0);
  if (x && x.run) {
    x.rt.extraItems(n).forEach((t, k) => {
      h += `<div class="ti${st.sel === idx ? ' sel' : ''}" data-i="${idx}"><span class="tw"></span><span class="tx">${esc(itemText(t))}</span></div>`;
      idx++;
    });
  }
  return `<div class="v v-tree" style="${boxCss(s, { bg: '#FFFFFFFF', bb: '#FF828790', bt: '1', pad: '1' })}${fontCss(s)}">${h}</div>`;
};
R.Menu = s =>
  `<div class="v v-menu" style="background:${brush(s.Background, '#f0f0f0')};${fontCss(s)}">${parseItems(s.Items, true)
    .map((it, i) => `<div class="mi" data-i="${i}">${esc(it.text)}</div>`)
    .join('')}</div>`;
R.ToolBar = s =>
  `<div class="v v-toolbar" style="background:${brush(s.Background, '#eef5fd')};${fontCss(s)}"><span class="grip"></span>${parseItems(
    s.Items,
    false,
  )
    .map((it, i) =>
      it.sep
        ? '<span style="width:1px;height:70%;background:#c5c5c5;margin:0 3px"></span>'
        : `<span class="tbb" data-i="${i}">${esc(it.text)}</span>`,
    )
    .join('')}</div>`;
R.StatusBar = (s, n, x) => {
  const items = x && x.run ? x.rt.items(n) : parseItems(s.Items, false).map(i => ({ __text: i.text }));
  return `<div class="v v-status" style="background:${brush(s.Background, '#f1eded')};${fontCss(s)}">${items.map(it => `<span class="si">${esc(itemText(it))}</span>`).join('')}</div>`;
};
R.Slider = (s, n) => {
  const min = num(s.Minimum, 0),
    max = num(s.Maximum, 10),
    v = Math.min(max, Math.max(min, num(s.Value, 0)));
  const f = max > min ? (v - min) / (max - min) : 0;
  const vert = s.Orientation === 'Vertical';
  const rev = isTrue(s.IsDirectionReversed);
  const ff = rev ? 1 - f : f;
  let ticks = '';
  if (s.TickPlacement && s.TickPlacement !== 'None') {
    const tf = num(s.TickFrequency, 1);
    const cnt = tf > 0 ? Math.min(200, Math.floor((max - min) / tf)) : 0;
    for (let i = 0; i <= cnt; i++) {
      const q = cnt ? i / cnt : 0;
      ticks += vert
        ? `<i class="tk" style="left:${s.TickPlacement === 'BottomRight' ? 'calc(50% + 9px)' : 'calc(50% - 13px)'};width:4px;height:1px;top:calc(5px + (100% - 11px) * ${1 - q})"></i>`
        : `<i class="tk" style="top:${s.TickPlacement === 'BottomRight' ? 'calc(50% + 9px)' : 'calc(50% - 13px)'};height:4px;width:1px;left:calc(5px + (100% - 11px) * ${q})"></i>`;
    }
  }
  const trk = vert
    ? `left:calc(50% - 2px);width:4px;top:5px;bottom:5px`
    : `top:calc(50% - 2px);height:4px;left:5px;right:5px`;
  const thm = vert
    ? `left:calc(50% - 9px);width:18px;height:11px;top:calc((100% - 11px) * ${1 - ff})`
    : `top:calc(50% - 9px);height:18px;width:11px;left:calc((100% - 11px) * ${ff})`;
  return `<div class="v v-slider"><div class="trk" style="${trk}"></div>${ticks}<div class="thm" style="${thm}"></div></div>`;
};
R.ScrollBar = s => {
  const vert = s.Orientation !== 'Horizontal';
  const min = num(s.Minimum, 0),
    max = num(s.Maximum, 100),
    v = num(s.Value, 0);
  const f = max > min ? (v - min) / (max - min) : 0;
  return vert
    ? `<div class="v v-sbar"><div class="a" style="top:0;left:0;right:0;height:17px">▲</div><div class="th" style="left:3px;right:3px;height:30px;top:calc(17px + (100% - 64px) * ${f})"></div><div class="a" style="bottom:0;left:0;right:0;height:17px">▼</div></div>`
    : `<div class="v v-sbar"><div class="a" style="left:0;top:0;bottom:0;width:17px">◀</div><div class="th" style="top:3px;bottom:3px;width:30px;left:calc(17px + (100% - 64px) * ${f})"></div><div class="a" style="right:0;top:0;bottom:0;width:17px">▶</div></div>`;
};
R.ProgressBar = s => {
  const min = num(s.Minimum, 0),
    max = num(s.Maximum, 100),
    v = Math.min(max, Math.max(min, num(s.Value, 0)));
  const f = max > min ? ((v - min) / (max - min)) * 100 : 0;
  const vert = s.Orientation === 'Vertical';
  return `<div class="v v-pb${isTrue(s.IsIndeterminate) ? ' ind' : ''}${vert ? ' vert' : ''}" style="${boxCss(s, { bg: '#FFE6E6E6', bb: '#FFBCBCBC', bt: '1' })}"><div class="fill" style="${vert ? `height:${f}%;left:0;bottom:0` : `width:${f}%`};background:${brush(s.Foreground, '#06b025')}"></div></div>`;
};
R.Separator = s =>
  `<div class="v v-sep" style="background:${brush(s.Background, 'transparent')}"><div style="border-top-color:${brush(s.BorderBrush, '#a0a0a0')}"></div></div>`;
R.Image = (s, n, x) => {
  const u = assetUrl(s.Source) || (/^https?:/.test(s.Source || '') ? null : null);
  const fit = { None: 'none', Fill: 'fill', Uniform: 'contain', UniformToFill: 'cover' }[s.Stretch || 'Uniform'];
  if (u) return `<div class="v v-img"><img src="${esc(u)}" alt="" style="object-fit:${fit}"></div>`;
  if (x && x.run) return `<div class="v v-img"></div>`;
  return `<div class="v v-img ph"><svg viewBox="0 0 16 16">${GL.img}</svg><span>${esc(s.Source || L('Image — ustaw Source', 'Image: set Source'))}</span></div>`;
};
R.Rectangle = R.Ellipse = (s, n) => {
  const st = s.Stroke ? num(s.StrokeThickness, 1) : 0;
  const rad = n.t === 'Ellipse' ? '50%' : `${num(s.RadiusX, 0)}px / ${num(s.RadiusY, num(s.RadiusX, 0))}px`;
  const dash = s.StrokeDashArray ? 'dashed' : 'solid';
  return `<div class="v v-shape" style="background:${brush(s.Fill, 'transparent')};border:${st}px ${dash} ${brush(s.Stroke, 'transparent')};border-radius:${rad}"></div>`;
};
R.Line = s => {
  const st = num(s.StrokeThickness, 1);
  return `<svg class="v v-line" style="overflow:visible"><line x1="${num(s.X1, 0)}" y1="${num(s.Y1, 0)}" x2="${num(s.X2, 0)}" y2="${num(s.Y2, 0)}" stroke="${brush(s.Stroke, 'black')}" stroke-width="${st}"${
    s.StrokeDashArray
      ? ` stroke-dasharray="${esc(
          String(s.StrokeDashArray)
            .split(/[\s,]+/)
            .map(x => num(x, 1) * st)
            .join(' '),
        )}"`
      : ''
  }/></svg>`;
};
R.Polygon = s =>
  `<svg class="v v-line" style="overflow:visible"><polygon points="${esc(s.Points || '')}" fill="${brush(s.Fill, 'none')}" stroke="${brush(s.Stroke, 'none')}" stroke-width="${num(s.StrokeThickness, 1)}"/></svg>`;
R.Border = s =>
  `<div class="v" style="${boxCss(s, { bt: '0' })}border-radius:${th(s.CornerRadius, '0').split(' ').reverse().join(' ')};padding:0"><div class="cbox" style="width:100%;height:100%;margin:0;box-sizing:border-box;padding:${th(s.Padding)}"><div class="cbox-in" style="position:relative;width:100%;height:100%"></div></div></div>`;
R.Grid = R.Canvas = s => `<div class="v cbox" style="background:${brush(s.Background, 'transparent')}"></div>`;
R.StackPanel = s =>
  `<div class="v cbox" style="background:${brush(s.Background, 'transparent')};display:flex;flex-direction:${s.Orientation === 'Horizontal' ? 'row' : 'column'}"></div>`;
R.WrapPanel = s =>
  `<div class="v cbox" style="background:${brush(s.Background, 'transparent')};display:flex;flex-wrap:wrap;flex-direction:${s.Orientation === 'Vertical' ? 'column' : 'row'};align-content:flex-start;align-items:flex-start"></div>`;
R.DockPanel = s => `<div class="v cbox" style="background:${brush(s.Background, 'transparent')};display:flex"></div>`;
R.UniformGrid = (s, n) => {
  const cnt = Math.max(1, n.ch.length);
  let c = num(s.Columns, 0),
    r = num(s.Rows, 0);
  if (!c && !r) {
    c = Math.ceil(Math.sqrt(cnt));
    r = Math.ceil(cnt / c);
  } else if (!c) c = Math.ceil(cnt / r);
  else if (!r) r = Math.ceil((cnt + num(s.FirstColumn, 0)) / c);
  return `<div class="v cbox" style="background:${brush(s.Background, 'transparent')};display:grid;grid-template-columns:repeat(${c},minmax(0,1fr));grid-template-rows:repeat(${r},minmax(0,1fr))"></div>`;
};
R.Viewbox = () => `<div class="v cbox"></div>`;
R.GroupBox = s =>
  `<div class="v v-group" style="${fontCss(s)}"><fieldset style="border-color:${brush(s.BorderBrush, '#d5dfe5')};background:${brush(s.Background, 'transparent')}"><legend>${esc(s.Header)}</legend><div class="cbox"></div></fieldset></div>`;
R.Expander = s => {
  const open = isTrue(s.IsExpanded ?? 'False');
  const arr = open
    ? '<path d="M1 6l3.5-3.5L8 6" fill="none" stroke="#333" stroke-width="1.3"/>'
    : '<path d="M1 3l3.5 3.5L8 3" fill="none" stroke="#333" stroke-width="1.3"/>';
  return `<div class="v v-exp" style="${fontCss(s)}background:${brush(s.Background, 'transparent')}"><div class="eh"><span class="circ"><svg viewBox="0 0 9 9">${arr}</svg></span><span>${esc(s.Header)}</span></div><div class="cbox"${open ? '' : ' hidden'}></div></div>`;
};
R.ScrollViewer = s =>
  `<div class="v v-sv"><div class="cbox" style="overflow-y:${{ Disabled: 'hidden', Auto: 'auto', Hidden: 'hidden', Visible: 'scroll' }[s.VerticalScrollBarVisibility || 'Visible']};overflow-x:${{ Disabled: 'hidden', Auto: 'auto', Hidden: 'hidden', Visible: 'scroll' }[s.HorizontalScrollBarVisibility || 'Disabled']}"></div></div>`;
R.TabControl = s => {
  const heads = parseItems(s.Items, false);
  const si = Math.max(0, Math.min(heads.length - 1, num(s.SelectedIndex, 0)));
  const pl = (s.TabStripPlacement || 'Top').toLowerCase();
  return `<div class="v v-tab ${pl}" style="${fontCss(s)}"><div class="tabs">${heads.map((h, i) => `<div class="tabh${i === si ? ' on' : ''}" data-tab="${i}">${esc(h.text)}</div>`).join('')}</div><div class="tabbody" style="border-color:${brush(s.BorderBrush, '#acacac')};background:${brush(s.Background, '#fff')}"><div class="cbox" style="background:#e5e5e5"></div></div></div>`;
};
R.Calendar = (s, n, x) => {
  const sel = parseDate(s.SelectedDate);
  const disp = parseDate(s.DisplayDate) || sel || new Date();
  const y = disp.getFullYear(),
    m = disp.getMonth();
  const first = new Date(y, m, 1);
  const off = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - (off || 7));
  const today = new Date();
  let g = L(['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd'], ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'])
    .map(d => `<div class="wd">${d}</div>`)
    .join('');
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const cls =
      (d.getMonth() !== m ? ' o' : '') +
      (d.toDateString() === today.toDateString() && s.IsTodayHighlighted !== 'False' ? ' today' : '') +
      (sel && d.toDateString() === sel.toDateString() ? ' sel' : '');
    g += `<div class="dy${cls}" data-d="${isoD(d)}">${d.getDate()}</div>`;
  }
  return `<div class="v v-cal" style="${fontCss(s)}min-width:178px"><div class="ch"><span class="nav" data-nav="-1">◀</span><span>${(UI_LANG === 'en' ? MONTHS_EN : MONTHS_PL)[m]} ${y}</span><span class="nav" data-nav="1">▶</span></div><div class="cg">${g}</div></div>`;
};
R.DatePicker = (s, n, x) => {
  const sel = parseDate(s.SelectedDate);
  const css = `${boxCss(s, { bg: '#FFFFFFFF', bb: '#FFABADB3', bt: '1' })}${fontCss(s)}`;
  if (x && x.run)
    return `<div class="v v-dp" style="${css}"><input type="date" value="${sel ? isoD(sel) : ''}" aria-label="${esc(n.name || 'Data')}"></div>`;
  return `<div class="v v-dp" style="${css}"><span class="t">${sel ? fmtD(sel) : `<span class="ph">${L('Wybierz datę', 'Select a date')}</span>`}</span><span class="ic">${CALICON}</span></div>`;
};
R.MediaElement = (s, n, x) => {
  const u = assetUrl(s.Source);
  if (u && x && x.run)
    return `<div class="v v-media"><video src="${esc(u)}" ${(s.LoadedBehavior || 'Play') === 'Play' ? 'autoplay' : ''} ${isTrue(s.IsMuted) ? 'muted' : ''} playsinline style="object-fit:${{ Fill: 'fill', UniformToFill: 'cover' }[s.Stretch] || 'contain'}"></video></div>`;
  return `<div class="v v-media"><div>▶<br>${esc(s.Source || 'MediaElement')}</div></div>`;
};
R.InkCanvas = (s, n, x) =>
  `<div class="v v-ink" style="background:${brush(s.Background, '#fff')}">${x && x.run ? '<canvas></canvas>' : ''}</div>`;

/* ---------- budowanie drzewa DOM ---------- */
function stOf(n) {
  return n.p;
}
function place(el, n, s, pk) {
  const st = el.style;
  const [l, t, r, b] = n.m;
  const W = n.w,
    H = n.h;
  if (s.MinWidth) st.minWidth = num(s.MinWidth, 0) + 'px';
  if (s.MinHeight) st.minHeight = num(s.MinHeight, 0) + 'px';
  if (s.MaxWidth) st.maxWidth = num(s.MaxWidth, 0) + 'px';
  if (s.MaxHeight) st.maxHeight = num(s.MaxHeight, 0) + 'px';
  if (s['Panel.ZIndex']) st.zIndex = num(s['Panel.ZIndex'], 0);
  if (pk === 'canvas') {
    st.position = 'absolute';
    st.left = l + 'px';
    st.top = t + 'px';
    if (W != null) st.width = W + 'px';
    if (H != null) st.height = H + 'px';
    return;
  }
  if (pk === 'abs' || pk === 'root') {
    st.position = 'absolute';
    const ha = s.HorizontalAlignment || 'Stretch',
      va = s.VerticalAlignment || 'Stretch';
    const tf = [];
    if (ha === 'Left') st.left = l + 'px';
    else if (ha === 'Right') st.right = r + 'px';
    else if (ha === 'Stretch' && W == null) {
      st.left = l + 'px';
      st.right = r + 'px';
    } else {
      st.left = `calc(50% + ${(l - r) / 2}px)`;
      tf.push('translateX(-50%)');
    }
    if (va === 'Top') st.top = t + 'px';
    else if (va === 'Bottom') st.bottom = b + 'px';
    else if (va === 'Stretch' && H == null) {
      st.top = t + 'px';
      st.bottom = b + 'px';
    } else {
      st.top = `calc(50% + ${(t - b) / 2}px)`;
      tf.push('translateY(-50%)');
    }
    if (tf.length) st.transform = tf.join(' ');
    if (W != null) st.width = W + 'px';
    if (H != null) st.height = H + 'px';
    return;
  }
  // przepływ: stack, wrap, uni, dock
  st.position = 'relative';
  st.margin = `${t}px ${r}px ${b}px ${l}px`;
  st.flex = 'none';
  if (W != null) st.width = W + 'px';
  if (H != null) st.height = H + 'px';
  const ha = s.HorizontalAlignment || 'Stretch',
    va = s.VerticalAlignment || 'Stretch';
  if (pk === 'stackV') {
    st.alignSelf = W != null && ha === 'Stretch' ? 'center' : AL[ha];
  } else if (pk === 'stackH') {
    st.alignSelf = H != null && va === 'Stretch' ? 'center' : AL[va];
  } else if (pk === 'uni') {
    st.justifySelf = W != null && ha === 'Stretch' ? 'center' : AL[ha];
    st.alignSelf = H != null && va === 'Stretch' ? 'center' : AL[va];
    st.minHeight = '0';
  }
}
function build(n, pk, x) {
  const T = TY[n.t];
  const s = stOf(n);
  const el = document.createElement('div');
  el.className = 'c c-' + n.t;
  el.dataset.id = n.id;
  place(el, n, s, pk);
  if (n.t === 'Line' || n.t === 'Polygon') {
    if (n.w == null) el.style.width = Math.max(num(s.X1, 0), num(s.X2, 0), 1) + 'px';
    if (n.h == null) el.style.height = Math.max(num(s.Y1, 0), num(s.Y2, 0), 1) + 'px';
    if (n.t === 'Polygon' && n.w == null) {
      const pts = String(s.Points || '')
        .split(/[\s,]+/)
        .map(Number);
      let mx = 1,
        my = 1;
      for (let i = 0; i < pts.length; i += 2) {
        mx = Math.max(mx, pts[i] || 0);
        my = Math.max(my, pts[i + 1] || 0);
      }
      el.style.width = mx + 'px';
      el.style.height = my + 'px';
    }
  }
  if (n.t === 'Calendar' && n.w == null) {
    el.style.width = '179px';
  }
  if (n.t === 'Calendar' && n.h == null) el.style.height = '169px';
  el.innerHTML = (R[n.t] || R.Grid)(s, n, x);
  if (s.Opacity != null && s.Opacity !== '') el.style.opacity = num(s.Opacity, 1);
  const vis = s.Visibility || 'Visible';
  if (vis !== 'Visible') {
    if (x && x.run) {
      if (vis === 'Collapsed') el.style.display = 'none';
      else el.style.visibility = 'hidden';
    } else el.classList.add('hid');
  }
  if (s.IsEnabled === 'False') el.classList.add('dis');
  if (s.ToolTip && x && x.run) el.title = s.ToolTip;
  if (x && x.run && s.Cursor)
    el.style.cursor =
      {
        Hand: 'pointer',
        IBeam: 'text',
        Wait: 'wait',
        Cross: 'crosshair',
        SizeAll: 'move',
        SizeNS: 'ns-resize',
        SizeWE: 'ew-resize',
        No: 'not-allowed',
        Help: 'help',
        None: 'none',
        Arrow: 'default',
      }[s.Cursor] || '';
  if (s.ClipToBounds === 'True' && el.firstElementChild) el.firstElementChild.style.overflow = 'hidden';
  if (T.cont) {
    let box = el.querySelector('.cbox-in') || el.querySelector('.cbox') || el.firstElementChild;
    box.dataset.cont = n.id;
    let kids = n.ch;
    if (n.t === 'TabControl') {
      const nh = parseItems(s.Items, false).length;
      const si = Math.max(0, Math.min(nh - 1, num(s.SelectedIndex, 0)));
      kids = n.ch.filter(c => (c.tab || 0) === si);
    }
    let ck = T.cont === 'tab' ? 'abs' : T.cont;
    if (T.cont === 'stack') ck = s.Orientation === 'Horizontal' ? 'stackH' : 'stackV';
    if (T.cont === 'wrap') ck = 'wrap';
    if (n.t === 'Viewbox') ck = 'abs';
    if (T.cont === 'dock') {
      buildDock(box, n, kids, x);
    } else kids.forEach(c => box.appendChild(build(c, ck, x)));
    if (n.t === 'Viewbox' && x && x.run) requestAnimationFrame(() => fitViewbox(el, box));
  }
  if (x && x.run) x.rt.bind(el, n);
  return el;
}
function buildDock(box, n, kids, x) {
  let cur = box;
  cur.style.display = 'flex';
  const fill = n.p.LastChildFill !== 'False';
  kids.forEach((c, i) => {
    const last = i === kids.length - 1 && fill;
    const d = c.dock || 'Left';
    const ce = build(c, 'dock', x);
    if (last) {
      cur.style.flexDirection = 'row';
      ce.style.flex = '1 1 auto';
      ce.style.alignSelf = 'stretch';
      if (c.w == null) ce.style.width = 'auto';
      cur.appendChild(ce);
      return;
    }
    cur.style.flexDirection = { Left: 'row', Right: 'row-reverse', Top: 'column', Bottom: 'column-reverse' }[d];
    if (d === 'Left' || d === 'Right') {
      if (c.h == null) ce.style.alignSelf = 'stretch';
    } else {
      if (c.w == null) ce.style.alignSelf = 'stretch';
    }
    cur.appendChild(ce);
    const rest = document.createElement('div');
    rest.style.cssText = 'flex:1 1 auto;display:flex;min-width:0;min-height:0;position:relative';
    rest.dataset.dockRest = '1';
    cur.appendChild(rest);
    cur = rest;
  });
}
function fitViewbox(el, box) {
  const k = box.firstElementChild;
  if (!k) return;
  const bw = el.clientWidth,
    bh = el.clientHeight;
  const kw = k.offsetWidth,
    kh = k.offsetHeight;
  if (!kw || !kh) return;
  const sc = Math.min(bw / kw, bh / kh);
  k.style.transformOrigin = '0 0';
  k.style.transform = `scale(${sc})`;
}

function winFrame(x, M) {
  M = M || P;
  const W = M.win;
  const s = W.p;
  const wnd = document.createElement('div');
  wnd.className = 'wnd';
  wnd.dataset.id = 'win';
  wnd.style.width = W.w + 'px';
  wnd.style.height = W.h + 'px';
  const tool = s.WindowStyle === 'ToolWindow',
    none = s.WindowStyle === 'None';
  const rm = s.ResizeMode || 'CanResize';
  const btn = (k, p) => `<span class="cb ${k}"><svg viewBox="0 0 10 10">${p}</svg></span>`;
  const btns =
    (tool
      ? ''
      : rm === 'NoResize'
        ? ''
        : btn('min', '<path d="M0 5.5h10"/>') +
          (rm === 'CanMinimize' ? '' : btn('max', '<rect x=".5" y=".5" width="9" height="9"/>'))) +
    btn('x', '<path d="M0 0l10 10M10 0L0 10"/>');
  wnd.innerHTML = `${none ? '' : `<div class="chrome"><svg class="ico" viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" fill="#fff" stroke="#3c7fb1"/><path d="M1.5 5.5h13" stroke="#3c7fb1"/></svg><span class="ttl">${esc(s.Title ?? 'MainWindow')}</span>${btns}</div>`}<div class="client" style="top:${none ? 0 : 31}px;background:${brush(s.Background, '#fff')};${fontCss(s)}"></div>${rm === 'CanResizeWithGrip' || !x ? `<div class="grip" title="${L('Zmień rozmiar okna', 'Resize window')}"></div>` : ''}`;
  const client = wnd.querySelector('.client');
  client.dataset.cont = 'root-host';
  client.appendChild(build(M.root, 'root', x));
  return wnd;
}
