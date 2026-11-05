/**
 * CappyCoder WPF — 10 · Aplikacja
 *
 * Zadanie: Eksport projektu .zip (csproj, App.xaml, build.bat), NuGet/.dll, dialogi, menu, skróty klawiszowe,
 *   przełączanie języka PL/EN, inicjalizacja edytorów i start aplikacji. Ten plik musi być ostatni.
 * Zależy od: wszystkie
 * Udostępnia: —
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const CRLF = s => s.replace(/\r?\n/g, '\r\n');
function csproj() {
  const pk = P.pkgs.length
    ? `\n  <ItemGroup>\n${P.pkgs.map(p => `    <PackageReference Include="${xa(p.id)}" Version="${xa(p.ver || '*')}" />`).join('\n')}\n  </ItemGroup>\n`
    : '';
  const rf = P.refs.length
    ? `\n  <ItemGroup>\n${P.refs.map(r => `    <Reference Include="${xa(r.name.replace(/\.dll$/i, ''))}">\n      <HintPath>libs\\${xa(r.name)}</HintPath>\n    </Reference>`).join('\n')}\n  </ItemGroup>\n`
    : '';
  const as = Object.keys(P.assets);
  const img = as.filter(a => !/^Media\//.test(a)),
    med = as.filter(a => /^Media\//.test(a));
  const ar = as.length
    ? `\n  <ItemGroup>\n${img.map(a => `    <Resource Include="${xa(a.replace(/\//g, '\\'))}" />`).join('\n')}${img.length && med.length ? '\n' : ''}${med.map(a => `    <Content Include="${xa(a.replace(/\//g, '\\'))}">\n      <CopyToOutputDirectory>PreserveNewest</CopyToOutputDirectory>\n    </Content>`).join('\n')}\n  </ItemGroup>\n`
    : '';
  return `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net10.0-windows</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <UseWPF>true</UseWPF>
  </PropertyGroup>
${pk}${rf}${ar}
</Project>
`;
}
function genFile(name) {
  const ns = P.name;
  if (name === `${ns}.csproj`) return csproj();
  if (name === 'App.xaml')
    return `<Application x:Class="${ns}.App"
             xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
             xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
             xmlns:local="clr-namespace:${ns}"
             StartupUri="MainWindow.xaml">
    <Application.Resources>
${
  P.pkgs.some(p => /^MaterialDesignThemes$/i.test(p.id))
    ? `        <ResourceDictionary>
            <ResourceDictionary.MergedDictionaries>
                <!-- Material Design: dodaj tu słowniki zasobów z dokumentacji pakietu -->
            </ResourceDictionary.MergedDictionaries>
        </ResourceDictionary>
`
    : ''
}    </Application.Resources>
</Application>
`;
  if (name === 'App.xaml.cs')
    return `using System.Configuration;
using System.Data;
using System.Windows;

namespace ${ns}
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
    }

}
`;
  if (name === 'AssemblyInfo.cs')
    return `using System.Windows;

[assembly: ThemeInfo(
    ResourceDictionaryLocation.None,            //where theme specific resource dictionaries are located
                                                //(used if a resource is not found in the page,
                                                // or application resource dictionaries)
    ResourceDictionaryLocation.SourceAssembly   //where the generic resource dictionary is located
                                                //(used if a resource is not found in the page,
                                                // app, or any theme specific resource dictionaries)
)]
`;
  return '';
}
function projectFiles() {
  saveLocal();
  const ns = P.name;
  const F = {};
  F[`${ns}.slnx`] = `<Solution>\n  <Project Path="${ns}/${ns}.csproj" />\n</Solution>\n`;
  F[`${ns}/${ns}.csproj`] = csproj();
  F[`${ns}/App.xaml`] = genFile('App.xaml');
  F[`${ns}/App.xaml.cs`] = genFile('App.xaml.cs');
  F[`${ns}/AssemblyInfo.cs`] = genFile('AssemblyInfo.cs');
  F[`${ns}/MainWindow.xaml`] = EDX.get() || genXaml();
  F[`${ns}/MainWindow.xaml.cs`] = P.code;
  P.files.forEach(f => (F[`${ns}/${f.name}`] = f.code));
  Object.entries(P.assets).forEach(([k, v]) => (F[`${ns}/${k}`] = dataToBytes(v)));
  P.refs.forEach(r => (F[`${ns}/libs/${r.name}`] = dataToBytes(r.data)));
  F['build.bat'] =
    `@echo off\nchcp 65001 >nul\ncd /d "%~dp0"\necho ${L('Kompilowanie projektu', 'Building project')} ${ns} (.NET 10, WPF)...\ndotnet build "${ns}\\${ns}.csproj" -c Debug\nif errorlevel 1 (\n  echo.\n  echo ${L('Kompilacja nie powiodla sie. Sprawdz komunikaty powyzej.', 'Build failed. Check the messages above.')}\n  pause\n  exit /b 1\n)\necho.\necho ${L('Gotowe. Uruchamiam aplikacje...', 'Done. Starting the app...')}\nstart "" "${ns}\\bin\\Debug\\net10.0-windows\\${ns}.exe"\n`;
  F['run.bat'] = `@echo off\ncd /d "%~dp0"\ndotnet run --project "${ns}\\${ns}.csproj"\n`;
  if (UI_LANG === 'en')
    F['README.txt'] = `WPF project "${ns}" created in CappyCoder WPF
=========================================================

Requirements (Windows 10/11):
  • .NET 10 SDK: https://dotnet.microsoft.com/download
    or Visual Studio 2026 with the ".NET desktop development" workload.

Option 1: Visual Studio 2026
  Open ${ns}.slnx and press F5.

Option 2: without Visual Studio
  Double-click build.bat (builds and starts the program).
  Manually:  dotnet build ${ns}\\${ns}.csproj
             dotnet run --project ${ns}\\${ns}.csproj

NuGet packages (${P.pkgs.length}): ${P.pkgs.map(p => p.id + ' ' + (p.ver || 'latest')).join(', ') || 'none'}
  They are downloaded automatically on the first build (needs Internet).
.dll references (${P.refs.length}): ${P.refs.map(r => r.name).join(', ') || 'none'}, in the ${ns}\\libs folder.
`;
  else
    F['CZYTAJ.txt'] = `Projekt WPF „${ns}” utworzony w CappyCoder WPF
=========================================================

Wymagania (Windows 10/11):
  • .NET 10 SDK — https://dotnet.microsoft.com/download
    lub Visual Studio 2026 z obciążeniem „Programowanie aplikacji klasycznych dla platformy .NET”.

Sposób 1 — Visual Studio 2026:
  Otwórz plik ${ns}.slnx i naciśnij F5.

Sposób 2 — bez Visual Studio:
  Kliknij dwukrotnie build.bat (kompiluje i uruchamia program).
  Ręcznie:  dotnet build ${ns}\\${ns}.csproj
            dotnet run --project ${ns}\\${ns}.csproj

Pakiety NuGet (${P.pkgs.length}): ${P.pkgs.map(p => p.id + ' ' + (p.ver || 'najnowsza')).join(', ') || 'brak'}
  Są pobierane automatycznie przy pierwszej kompilacji (wymaga Internetu).
Odwołania .dll (${P.refs.length}): ${P.refs.map(r => r.name).join(', ') || 'brak'} — w folderze ${ns}\\libs.
`;
  return F;
}
function dataToBytes(d) {
  const b64 = String(d).split(',')[1] || '';
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return u => {
    let c = 0xffffffff;
    for (let i = 0; i < u.length; i++) c = t[(c ^ u[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();
function makeZip(files) {
  const enc = new TextEncoder();
  const parts = [],
    central = [];
  let off = 0;
  const d = new Date();
  const dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff,
    dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  for (const [name, content] of Object.entries(files)) {
    const data =
      typeof content === 'string'
        ? enc.encode(
            /\.(bat|txt|cs|xaml|csproj|slnx)$/.test(name)
              ? CRLF(content).replace(/^/, /\.(cs|xaml|csproj)$/.test(name) ? '\uFEFF' : '')
              : content,
          )
        : content;
    const nm = enc.encode(name);
    const crc = CRC(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true);
    lh.setUint16(8, 0, true);
    lh.setUint16(10, dt, true);
    lh.setUint16(12, dd, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, nm.length, true);
    lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nm, data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true);
    ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, dt, true);
    ch.setUint16(14, dd, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true);
    ch.setUint32(24, data.length, true);
    ch.setUint16(28, nm.length, true);
    ch.setUint32(42, off, true);
    central.push(new Uint8Array(ch.buffer), nm);
    off += 30 + nm.length + data.length;
  }
  const csize = central.reduce((a, b) => a + b.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, Object.keys(files).length, true);
  end.setUint16(10, Object.keys(files).length, true);
  end.setUint32(12, csize, true);
  end.setUint32(16, off, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
async function saveFile(name, data) {
  try {
    if (window.claude && claude.use) {
      const d = await claude.use('downloads');
      if (d) {
        try {
          await d.save({ filename: name, data });
          status(L(`Zapisano plik ${name}.`, `Saved ${name}.`));
          return true;
        } catch (e) {
          if (e && e.code === 'declined') {
            status(L('Zapis anulowany.', 'Save cancelled.'));
            return false;
          }
          if (e && e.code !== 'unavailable') {
            status(L('Nie udało się zapisać pliku: ', 'Could not save the file: ') + (e.message || e.code), 'err');
            return false;
          }
        }
      }
    }
  } catch (e) {}
  try {
    const blob = data instanceof Blob ? data : new Blob([data]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1500);
    status(L(`Pobieranie: ${name}`, `Downloading: ${name}`));
    return true;
  } catch (e) {
    status(L('Ta przeglądarka zablokowała pobieranie pliku.', 'This browser blocked the download.'), 'err');
    return false;
  }
}
async function exportZip() {
  const nErr = buildSolution();
  const go = async () => {
    const blob = makeZip(projectFiles());
    await saveFile(`${P.name}.zip`, blob);
    out(
      L(
        `Utworzono archiwum ${P.name}.zip (${Math.round(blob.size / 1024)} KB): rozpakuj i uruchom build.bat albo otwórz ${P.name}.slnx w Visual Studio 2026.`,
        `Created ${P.name}.zip (${Math.round(blob.size / 1024)} KB): unzip it and run build.bat, or open ${P.name}.slnx in Visual Studio 2026.`,
      ),
      'ok',
    );
  };
  if (nErr)
    dialog(
      L('Projekt zawiera błędy', 'The project has errors'),
      L(
        `<p>Kontrola wykryła błędy: ${nErr}. Visual Studio zgłosi je przy kompilacji. Czy mimo to pobrać projekt?</p>`,
        `<p>The check found ${nErr} error(s). Visual Studio will report them when building. Download the project anyway?</p>`,
      ),
      [[L('Anuluj', 'Cancel')], [L('Pobierz mimo to', 'Download anyway'), go, true]],
    );
  else go();
}
async function saveJson() {
  saveLocal();
  const data = JSON.stringify(Object.assign({ format: 'cappycoder-wpf', xamlText: EDX.get() }, P), null, 1);
  await saveFile(`${P.name}.json`, data);
}

/* ---------- import ---------- */
async function importFiles(list) {
  const files = [...list];
  if (!files.length) return;
  try {
    const j = files.find(f => /\.json$/i.test(f.name));
    if (j) {
      const o = JSON.parse(await j.text());
      if (!o.win || !o.root || typeof o.code !== 'string')
        throw new Error(L('To nie jest plik projektu CappyCoder WPF.', 'This is not a CappyCoder WPF project file.'));
      loadProject(o);
      status(L(`Otwarto projekt „${P.name}”.`, `Opened project '${P.name}'.`));
      return;
    }
    const z = files.find(f => /\.zip$/i.test(f.name));
    if (z) {
      if (!window.JSZip)
        throw new Error(
          L(
            'Biblioteka do odczytu ZIP nie załadowała się. Otwórz pliki MainWindow.xaml i MainWindow.xaml.cs bezpośrednio.',
            'The ZIP library did not load. Open MainWindow.xaml and MainWindow.xaml.cs directly.',
          ),
        );
      const zip = await JSZip.loadAsync(await z.arrayBuffer());
      const ents = Object.values(zip.files).filter(e => !e.dir && !/(^|\/)(bin|obj)\//.test(e.name));
      const find = re => ents.find(e => re.test(e.name));
      const xe = find(/(^|\/)MainWindow\.xaml$/),
        ce = find(/(^|\/)MainWindow\.xaml\.cs$/);
      if (!xe)
        throw new Error(L('W archiwum nie ma pliku MainWindow.xaml.', 'The archive has no MainWindow.xaml file.'));
      const base = xe.name.replace(/MainWindow\.xaml$/, '');
      const pr = blankProject();
      pr.code = ce ? await ce.async('string') : blankCode(pr.name);
      for (const e of ents) {
        const rel = e.name.slice(base.length);
        if (!e.name.startsWith(base)) continue;
        if (
          /\.cs$/i.test(rel) &&
          !/^(MainWindow\.xaml\.cs|App\.xaml\.cs|AssemblyInfo\.cs)$/.test(rel) &&
          !rel.includes('/')
        )
          pr.files.push({ name: rel, code: (await e.async('string')).replace(/^﻿/, '') });
        else if (/\.(png|jpe?g|gif|bmp|ico|svg|webp)$/i.test(rel))
          pr.assets[rel.replace(/\\/g, '/')] = `data:${mimeOf(rel)};base64,` + (await e.async('base64'));
        else if (/^libs\/.+\.dll$/i.test(rel))
          pr.refs.push({
            name: rel.slice(5),
            data: 'data:application/octet-stream;base64,' + (await e.async('base64')),
          });
        else if (/\.csproj$/i.test(rel)) {
          const t = await e.async('string');
          [...t.matchAll(/<PackageReference\s+Include="([^"]+)"\s+Version="([^"]*)"/g)].forEach(m =>
            pr.pkgs.push({ id: m[1], ver: m[2] }),
          );
          pr.name = rel.replace(/\.csproj$/i, '');
        }
      }
      pr.code = pr.code.replace(/^﻿/, '');
      loadProject(pr, (await xe.async('string')).replace(/^﻿/, ''));
      status(L(`Zaimportowano projekt z ${z.name}.`, `Imported the project from ${z.name}.`));
      return;
    }
    const x = files.find(f => /\.xaml$/i.test(f.name));
    const cs = files.filter(f => /\.cs$/i.test(f.name));
    if (x || cs.length) {
      snap();
      if (cs.length)
        for (const f of cs) {
          const t = (await f.text()).replace(/^﻿/, '');
          if (/MainWindow\.xaml\.cs$/i.test(f.name) || /\bclass\s+MainWindow\b/.test(t)) {
            setMainCode(t);
          } else {
            const ex = P.files.find(q => q.name === f.name);
            if (ex) ex.code = t;
            else P.files.push({ name: f.name, code: t });
          }
        }
      if (x) {
        EDX.set((await x.text()).replace(/^﻿/, ''));
        applyXaml();
      }
      commit({ noXaml: !!x });
      status(L('Zaimportowano pliki.', 'Imported the files.'));
      return;
    }
    throw new Error(
      L(
        'Obsługiwane pliki: .json (projekt), .zip (projekt .NET), .xaml, .cs.',
        'Supported files: .json (project), .zip (.NET project), .xaml, .cs.',
      ),
    );
  } catch (e) {
    dialog(L('Nie można otworzyć pliku', 'Cannot open the file'), `<p>${esc(e.message || e)}</p>`, [
      ['OK', null, true],
    ]);
  }
}
const mimeOf = n =>
  ({
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
  })[n.split('.').pop().toLowerCase()] || 'application/octet-stream';
function loadProject(o, xamlText) {
  P = Object.assign(blankProject(o.name || 'WpfApp1'), o);
  P.files = P.files || [];
  P.pkgs = P.pkgs || [];
  P.refs = P.refs || [];
  P.assets = P.assets || {};
  delete P.format;
  seq = 0;
  walk(n => {
    const m = /^n(\d+)$/.exec(n.id);
    if (m) seq = Math.max(seq, +m[1]);
  });
  Object.keys(DOCS).forEach(k => delete DOCS[k]);
  undoS = [];
  redoS = [];
  sel = [];
  xamlBroken = null;
  xamlWarns = [];
  openDocs = [MAIN_X, MAIN_CS];
  activeDoc = MAIN_X;
  codeFile = MAIN_CS;
  $('#projName').value = P.name;
  const xt = xamlText || o.xamlText;
  delete P.xamlText;
  if (xt) {
    EDX.set(xt);
    applyXaml(true);
  } else EDX.set(genXaml());
  showCodeFile(MAIN_CS);
  openDoc(MAIN_X);
  commit({ noXaml: !!xt });
}
let xT = null;
function applyXaml(silent) {
  const txt = EDX.get();
  const selNames = sel.map(id => (byId(id) || {}).name).filter(Boolean);
  try {
    const r = parseXaml(txt);
    if (!silent) snap();
    P.win = r.win;
    P.root = r.root;
    xamlWarns = r.warns;
    if (r.ns && r.ns !== P.name)
      xamlWarns.push(
        L(
          `x:Class wskazuje przestrzeń nazw „${r.ns}”, a projekt nazywa się „${P.name}” — przy eksporcie użyta zostanie nazwa projektu.`,
          `x:Class uses the namespace '${r.ns}' but the project is called '${P.name}'; the project name is used on export.`,
        ),
      );
    xamlBroken = null;
    $('#xamlInvalid')?.remove();
    sel = [];
    walk(n => {
      if (n.name && selNames.includes(n.name)) sel.push(n.id);
    });
    genXaml();
    renderDesign();
    renderOutline();
    renderProps();
    scheduleSave();
    scheduleCheck();
  } catch (e) {
    if (e && e.msg) {
      xamlBroken = e;
      showInvalid();
      scheduleCheck();
      scheduleSave();
    } else {
      console.error(e);
      xamlBroken = { line: 1, msg: String(e.message || e) };
      showInvalid();
      scheduleCheck();
    }
  }
}
function showInvalid() {
  let d = $('#xamlInvalid');
  if (!d) {
    d = document.createElement('div');
    d.id = 'xamlInvalid';
    d.className = 'invalid';
    $('#designWrap').appendChild(d);
  }
  d.innerHTML = `<div><b>${L('Nieprawidłowy kod znaczników', 'Invalid markup')}</b><p style="margin:8px 0 0">${esc(xamlBroken.msg)}</p><p style="margin:6px 0 0;color:var(--muted)">${L(`Wiersz ${xamlBroken.line}. Popraw XAML poniżej — projektant odświeży się sam.`, `Line ${xamlBroken.line}. Fix the XAML below; the designer refreshes by itself.`)}</p></div>`;
}

/* ---------- dialogi ---------- */
function dialog(title, html, buttons, onOpen) {
  const m = document.createElement('div');
  m.className = 'modal';
  m.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${esc(title)}</h2><div class="db">${html}</div><div class="df">${buttons.map((b, i) => `<button class="btn${b[2] ? ' pri' : ''}" data-b="${i}">${esc(b[0])}</button>`).join('')}</div></div>`;
  document.body.appendChild(m);
  const close = () => {
    m.remove();
    document.removeEventListener('keydown', kd, true);
  };
  const kd = e => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', kd, true);
  m.addEventListener('click', e => {
    if (e.target === m) close();
    const b = e.target.closest('[data-b]');
    if (b) {
      const fn = buttons[+b.dataset.b][1];
      if (!fn || fn(m) !== false) close();
    }
  });
  if (onOpen) onOpen(m, close);
  const f = m.querySelector('input,select,textarea') || m.querySelector('.btn.pri');
  if (f) setTimeout(() => f.focus(), 20);
  return m;
}
const PRESETS = [
  [
    'CommunityToolkit.Mvvm',
    '8.3.2',
    [
      'MVVM: ObservableObject, RelayCommand, generatory źródeł',
      'MVVM: ObservableObject, RelayCommand, source generators',
    ],
  ],
  ['Newtonsoft.Json', '13.0.3', ['Serializacja JSON (Json.NET)', 'JSON serialization (Json.NET)']],
  ['Microsoft.Data.Sqlite', '8.0.10', ['Lekka baza danych SQLite', 'Lightweight SQLite database']],
  [
    'Microsoft.EntityFrameworkCore.Sqlite',
    '8.0.10',
    ['Entity Framework Core z SQLite', 'Entity Framework Core with SQLite'],
  ],
  ['Microsoft.Data.SqlClient', '5.2.2', ['Połączenie z SQL Server', 'SQL Server connection']],
  ['MySqlConnector', '2.3.7', ['Połączenie z MySQL / MariaDB', 'MySQL / MariaDB connection']],
  ['Dapper', '2.1.35', ['Prosty mapper SQL → obiekty', 'Simple SQL-to-object mapper']],
  ['MaterialDesignThemes', '5.1.0', ['Styl Material Design dla WPF', 'Material Design styles for WPF']],
  ['MahApps.Metro', '2.4.10', ['Nowoczesne okna i kontrolki Metro', 'Modern Metro windows and controls']],
  [
    'Extended.Wpf.Toolkit',
    '4.6.1',
    ['Dodatkowe kontrolki (IntegerUpDown, ColorPicker…)', 'Extra controls (IntegerUpDown, ColorPicker…)'],
  ],
  ['HandyControl', '3.5.1', ['Rozbudowany zestaw kontrolek', 'A large set of controls']],
  ['ScottPlot.WPF', '5.0.40', ['Wykresy i dane naukowe', 'Charts and scientific plots']],
  ['Microsoft.Web.WebView2', '1.0.2792.45', ['Przeglądarka Edge w aplikacji', 'Edge browser inside the app']],
  ['Microsoft.Xaml.Behaviors.Wpf', '1.1.122', ['Zachowania i wyzwalacze XAML', 'XAML behaviors and triggers']],
  ['ClosedXML', '0.104.1', ['Odczyt i zapis plików Excel', 'Read and write Excel files']],
  ['NAudio', '2.2.1', ['Odtwarzanie i nagrywanie dźwięku', 'Audio playback and recording']],
];
function nugetDialog() {
  const render = m => {
    const inst = new Set(P.pkgs.map(p => p.id.toLowerCase()));
    m.querySelector('#pkgInst').innerHTML = P.pkgs.length
      ? P.pkgs
          .map(
            p =>
              `<div class="pkg"><b>${esc(p.id)}</b><span>${L('wersja', 'version')} ${esc(p.ver === '*' || !p.ver ? L('* (najnowsza stabilna)', '* (latest stable)') : p.ver)}</span><button class="btn" data-rm="${esc(p.id)}">${L('Odinstaluj', 'Uninstall')}</button></div>`,
          )
          .join('')
      : `<p style="color:var(--muted)">${L('Brak pakietów. Dodaj z listy lub wpisz nazwę z nuget.org.', 'No packages. Add one from the list or type a name from nuget.org.')}</p>`;
    m.querySelector('#pkgList').innerHTML = PRESETS.map(
      ([id, v, d]) =>
        `<div class="pkg"><b>${esc(id)}</b><span>${esc(L(d[0], d[1]))} · ${esc(v)}</span>${inst.has(id.toLowerCase()) ? `<span class="btn" style="opacity:.6">${L('Zainstalowany', 'Installed')}</span>` : `<button class="btn pri" data-add="${esc(id)}" data-ver="${esc(v)}">${L('Instaluj', 'Install')}</button>`}</div>`,
    ).join('');
  };
  dialog(
    L('Menedżer pakietów NuGet', 'NuGet Package Manager'),
    L(
      `
    <p>Pakiety trafiają do pliku <code>${esc(P.name)}.csproj</code> jako <code>PackageReference</code>. Visual Studio lub <code>dotnet build</code> pobierze je z nuget.org przy kompilacji. Cała biblioteka standardowa .NET 10 (System.*, LINQ, System.Text.Json, System.IO, HttpClient…) jest dostępna bez instalowania.</p>`,
      `
    <p>Packages go into <code>${esc(P.name)}.csproj</code> as <code>PackageReference</code> entries. Visual Studio or <code>dotnet build</code> downloads them from nuget.org when building. The whole .NET 10 standard library (System.*, LINQ, System.Text.Json, System.IO, HttpClient…) is available without installing anything.</p>`,
    ) +
      `
    <h3 style="font-size:13px;margin:12px 0 4px">${L('Zainstalowane', 'Installed')}</h3><div class="pkgs" id="pkgInst"></div>
    <h3 style="font-size:13px;margin:12px 0 4px">${L('Dodaj dowolny pakiet', 'Add any package')}</h3>
    <div style="display:flex;gap:6px;flex-wrap:wrap"><input id="pkgId" placeholder="${L('np. Humanizer', 'for example Humanizer')}" style="flex:2;min-width:140px" aria-label="${L('Nazwa pakietu', 'Package name')}"><input id="pkgVer" placeholder="${L('wersja (puste = najnowsza)', 'version (empty = latest)')}" style="flex:1;min-width:120px" aria-label="${L('Wersja', 'Version')}"><button class="btn pri" id="pkgAdd">${L('Dodaj', 'Add')}</button></div>
    <h3 style="font-size:13px;margin:14px 0 4px">${L('Popularne pakiety dla WPF', 'Popular packages for WPF')}</h3><div class="pkgs" id="pkgList"></div>
    <p style="color:var(--muted);font-size:12px">${L('Symulacja F5 nie wykonuje kodu z pakietów — sprawdzisz go po kompilacji w Visual Studio.', 'The F5 simulation does not run package code; check it after building in Visual Studio.')}</p>`,
    [[L('Zamknij', 'Close'), null, true]],
    m => {
      render(m);
      const add = (id, ver) => {
        id = id.trim();
        if (!/^[A-Za-z0-9_.\-]+$/.test(id)) {
          status(L('Nieprawidłowa nazwa pakietu.', 'Invalid package name.'), 'err');
          return;
        }
        if (P.pkgs.some(p => p.id.toLowerCase() === id.toLowerCase())) return;
        P.pkgs.push({ id, ver: (ver || '').trim() || '*' });
        render(m);
        renderSol();
        scheduleSave();
        status(L(`Dodano pakiet ${id}.`, `Added package ${id}.`));
      };
      m.addEventListener('click', e => {
        const a = e.target.closest('[data-add]');
        if (a) add(a.dataset.add, a.dataset.ver);
        const r = e.target.closest('[data-rm]');
        if (r) {
          P.pkgs = P.pkgs.filter(p => p.id !== r.dataset.rm);
          render(m);
          renderSol();
          scheduleSave();
        }
      });
      m.querySelector('#pkgAdd').onclick = () => {
        add(m.querySelector('#pkgId').value, m.querySelector('#pkgVer').value);
        m.querySelector('#pkgId').value = '';
        m.querySelector('#pkgVer').value = '';
      };
      m.querySelector('#pkgId').addEventListener('keydown', e => {
        if (e.key === 'Enter') m.querySelector('#pkgAdd').click();
      });
    },
  );
}
function addClassDialog() {
  dialog(
    L('Dodaj nowy element', 'Add New Item'),
    `<p><label>${L('Szablon', 'Template')}<br><select id="ncKind" style="margin-top:4px;padding:4px 8px;border:1px solid var(--line);border-radius:5px;background:var(--panel)"><option value="class">${L('Klasa', 'Class')}</option><option value="interface">${L('Interfejs', 'Interface')}</option><option value="enum">${L('Wyliczenie (enum)', 'Enum')}</option><option value="record">${L('Rekord', 'Record')}</option></select></label></p><p><label>${L('Nazwa', 'Name')}<br><input id="ncName" value="${esc(nextClassName())}" style="width:100%;margin-top:4px" spellcheck="false"></label></p><p style="color:var(--muted);font-size:12px">${L('Plik .cs zostanie dodany do projektu. Klasy, rekordy i wyliczenia działają też w symulacji F5.', 'A .cs file is added to the project. Classes, records and enums also work in the F5 simulation.')}</p>`,
    [
      [L('Anuluj', 'Cancel')],
      [
        L('Dodaj', 'Add'),
        m => {
          const nm = m.querySelector('#ncName').value.trim().replace(/\.cs$/i, '');
          const kind = m.querySelector('#ncKind').value;
          if (!IDRE.test(nm) || CS.KW.has(nm)) {
            status(L('Nazwa musi być identyfikatorem C#.', 'The name must be a C# identifier.'), 'err');
            return false;
          }
          if (
            P.files.some(f => f.name.toLowerCase() === (nm + '.cs').toLowerCase()) ||
            nm === 'MainWindow' ||
            nm === 'App'
          ) {
            status(L('Plik o tej nazwie już istnieje.', 'A file with this name already exists.'), 'err');
            return false;
          }
          const body =
            kind === 'enum'
              ? `    public enum ${nm}\n    {\n        ${L('Pierwszy', 'First')},\n        ${L('Drugi', 'Second')}\n    }`
              : kind === 'interface'
                ? `    public interface ${nm}\n    {\n    }`
                : kind === 'record'
                  ? `    public record ${nm}(string ${L('Nazwa', 'Name')}, int ${L('Wartosc', 'Value')});`
                  : `    public class ${nm}\n    {\n        public ${nm}()\n        {\n        }\n    }`;
          P.files.push({ name: nm + '.cs', code: `namespace ${P.name}\n{\n${body}\n}\n` });
          renderSol();
          scheduleSave();
          scheduleCheck();
          openDoc(nm + '.cs');
          status(L(`Dodano ${nm}.cs.`, `Added ${nm}.cs.`));
        },
        true,
      ],
    ],
  );
}
function nextClassName() {
  const b = L('Klasa', 'Class');
  let i = 1;
  while (P.files.some(f => f.name === `${b}${i}.cs`)) i++;
  return b + i;
}
function pickFile(accept, cb) {
  const inp = $('#assetIn');
  inp.value = '';
  inp.accept = accept;
  inp.onchange = () => {
    const f = inp.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => cb(f, r.result);
    r.readAsDataURL(f);
  };
  inp.click();
}
function addDll() {
  pickFile('.dll', (f, data) => {
    if (f.size > 6e6) {
      dialog(
        L('Plik jest za duży', 'The file is too large'),
        L(
          '<p>Biblioteka ma ponad 6 MB — przeglądarka może jej nie zapamiętać. Rozważ dodanie jej jako pakietu NuGet.</p>',
          '<p>The library is over 6 MB, so the browser may not keep it. Consider adding it as a NuGet package.</p>',
        ),
        [['OK', null, true]],
      );
      return;
    }
    const name = f.name.replace(/[^\w.\-]/g, '_');
    P.refs = P.refs.filter(r => r.name !== name);
    P.refs.push({ name, data });
    renderSol();
    scheduleSave();
    status(
      L(
        `Dodano odwołanie do ${name}. Dodaj dyrektywę using z przestrzenią nazw tej biblioteki.`,
        `Added a reference to ${name}. Add a using directive with the library's namespace.`,
      ),
    );
  });
}
function addAsset(cb) {
  pickFile('image/*,video/mp4,video/webm,audio/*', (f, data) => {
    if (f.size > 4e6) {
      dialog(
        L('Plik jest za duży', 'The file is too large'),
        L(
          '<p>Zasób ma ponad 4 MB. Użyj mniejszego pliku — projekt jest przechowywany w przeglądarce.</p>',
          '<p>The resource is over 4 MB. Use a smaller file; the project is stored in the browser.</p>',
        ),
        [['OK', null, true]],
      );
      return;
    }
    const folder = /^(video|audio)\//.test(f.type) ? 'Media' : 'Images';
    const key = `${folder}/${f.name.replace(/[^\w.\-]/g, '_')}`;
    P.assets[key] = data;
    renderSol();
    scheduleSave();
    if (cb) cb(key);
    else status(L(`Dodano zasób ${key}.`, `Added resource ${key}.`));
  });
}
function renameProject(v) {
  v = v.trim();
  if (!IDRE.test(v) || CS.KW.has(v)) {
    status(
      L(
        'Nazwa projektu musi być identyfikatorem C# (bez spacji i polskich znaków).',
        'The project name must be a C# identifier (no spaces or accented letters).',
      ),
      'err',
    );
    $('#projName').value = P.name;
    return;
  }
  if (v === P.name) return;
  const old = P.name;
  const re = new RegExp(`\\bnamespace\\s+${old}\\b`, 'g');
  setMainCode(P.code.replace(re, 'namespace ' + v));
  P.files.forEach(f => {
    f.code = f.code.replace(re, 'namespace ' + v);
    if (DOCS[f.name]) DOCS[f.name].setValue(f.code);
  });
  P.name = v;
  EDX.set(
    EDX.get()
      .replace(new RegExp(`x:Class="${old}\\.MainWindow"`), `x:Class="${v}.MainWindow"`)
      .replace(new RegExp(`clr-namespace:${old}"`), `clr-namespace:${v}"`),
  );
  commit();
  status(L(`Zmieniono nazwę projektu na ${v}.`, `Renamed the project to ${v}.`));
}
function newProject() {
  dialog(
    L('Nowy projekt', 'New project'),
    L(
      '<p>Utworzyć pusty projekt WPF? Bieżący projekt zostanie zastąpiony — zapisz go wcześniej (Plik → Zapisz projekt), jeśli chcesz do niego wrócić.</p>',
      '<p>Create an empty WPF project? The current project will be replaced, so save it first (File → Save project) if you want to come back to it.</p>',
    ),
    [
      [L('Anuluj', 'Cancel')],
      [
        L('Utwórz pusty projekt', 'Create empty project'),
        () => {
          loadProject(blankProject('WpfApp1'));
          status(L('Utworzono nowy projekt.', 'Created a new project.'));
        },
        true,
      ],
    ],
  );
}
function loadSample() {
  dialog(
    L('Przykład: Kalkulator BMI', 'Sample: BMI Calculator'),
    L(
      '<p>Wczytać projekt przykładowy? Bieżący projekt zostanie zastąpiony.</p>',
      '<p>Load the sample project? The current project will be replaced.</p>',
    ),
    [[L('Anuluj', 'Cancel')], [L('Wczytaj', 'Load'), () => loadProject(sampleProject()), true]],
  );
}
function helpKeys() {
  const rows = [
    ['F5', 'Rozpocznij debugowanie / Kontynuuj', 'Start debugging / Continue'],
    ['Ctrl+F5', 'Uruchom bez debugowania', 'Start without debugging'],
    ['Shift+F5', 'Zatrzymaj', 'Stop'],
    ['F9', 'Przełącz punkt przerwania', 'Toggle breakpoint'],
    ['Ctrl+Shift+F9', 'Usuń wszystkie punkty przerwania', 'Delete all breakpoints'],
    [
      'F10 / F11 / Shift+F11',
      'Przekrocz / wkrocz / wyjdź (w trybie przerwania)',
      'Step over / into / out (in break mode)',
    ],
    ['Alt+[', 'Krok wstecz (w trybie przerwania)', 'Step back (in break mode)'],
    ['Ctrl+Shift+B', 'Kompiluj (kontrola błędów)', 'Build (error check)'],
    ['F7 / Shift+F7', 'Kod / projektant', 'Code / designer'],
    [L('F12 (w kodzie)', 'F12 (in code)'), 'Przejdź do kontrolki pod kursorem', 'Go to the control under the cursor'],
    [
      L('Pisanie', 'Typing'),
      'Lista IntelliSense otwiera się sama; Enter lub Tab wstawia',
      'The IntelliSense list opens by itself; Enter or Tab inserts',
    ],
    ['Ctrl+Spacja / Ctrl+Space', 'Pokaż podpowiedzi', 'Show completions'],
    ['Ctrl+Shift+Spacja', 'Pokaż parametry metody', 'Show parameter info'],
    [
      L('Dwuklik na kontrolce', 'Double-click a control'),
      'Utwórz domyślną metodę zdarzenia',
      'Create the default event handler',
    ],
    [L('Strzałki / Shift+strzałki', 'Arrows / Shift+arrows'), 'Przesuń o 1 / 10 px', 'Move by 1 / 10 px'],
    [L('Ctrl+klik', 'Ctrl+click'), 'Zaznacz wiele', 'Select several'],
    ['Esc', 'Zaznacz element nadrzędny', 'Select the parent element'],
    ['Delete', 'Usuń', 'Delete'],
    ['Ctrl+C / X / V / D', 'Kopiuj / wytnij / wklej / duplikuj', 'Copy / cut / paste / duplicate'],
    ['Ctrl+Z / Ctrl+Y', 'Cofnij / ponów', 'Undo / redo'],
    ['Ctrl+S', 'Zapisz projekt (.json)', 'Save project (.json)'],
    ['Ctrl+O', 'Otwórz', 'Open'],
  ];
  dialog(
    L('Skróty klawiszowe', 'Keyboard shortcuts'),
    `<div class="kbd-list">${rows.map(([k, pl, en]) => `<kbd>${k}</kbd><span>${L(pl, en)}</span>`).join('')}</div>`,
    [['OK', null, true]],
  );
}
function helpSim() {
  dialog(
    L('Co obsługuje symulacja F5', 'What the F5 simulation supports'),
    L(
      `<p>Przycisk <b>Start</b> uruchamia okno w przeglądarce i wykonuje Twój kod C# przetłumaczony na JavaScript. Służy do szybkiego sprawdzania logiki. Pełną kompilację wykonuje Visual Studio 2026 albo <code>dotnet build</code> — pobierz projekt przyciskiem <b>Pobierz .zip</b>.</p>
  <table><tr><th>Działa</th><td>zmienne, typy proste, <code>if/switch/for/foreach/while</code>, metody, pola, właściwości, klasy i rekordy z innych plików, dziedziczenie, <code>enum</code>, <code>List&lt;T&gt;</code>, <code>Dictionary</code>, tablice, LINQ (<code>Where, Select, Sum, OrderBy…</code>), <code>$"…{x:F2}"</code>, <code>Parse/TryParse</code>, <code>Math</code>, <code>Random</code>, <code>DateTime</code>, <code>DispatcherTimer</code>, <code>async/await Task.Delay</code>, <code>try/catch</code>, <code>MessageBox.Show</code>, zdarzenia klawiatury i myszy, <code>Canvas.SetLeft</code>, właściwości wszystkich kontrolek z przybornika</td></tr>
  <tr><th>Debuger</th><td>F9 lub kliknięcie marginesu ustawia punkt przerwania. F5 uruchamia debugowanie; gdy program dojdzie do punktu przerwania albo zgłosi nieobsłużony wyjątek, IDE pokazuje bieżący wiersz, <b>Zmienne lokalne</b> i <b>Stos wywołań</b>. F10 przekracza, F11 wkracza do metody, Shift+F11 wychodzi z niej, Alt+[ cofa o krok, a najechanie myszą na zmienną pokazuje jej wartość. Przeglądarka nie potrafi naprawdę wstrzymać kodu, więc symulator zapisuje przebieg obsługi zdarzenia i pozwala przejść go krok po kroku — okno programu pokazuje stan po zakończeniu tej obsługi. Ctrl+F5 uruchamia bez debugowania.</td></tr>
  <tr><th>Różnice</th><td><code>MessageBox.Show</code> nie zatrzymuje kodu (zwraca pierwszy przycisk). Łączenie tekstu z liczbą operatorem <code>+</code> pokazuje kropkę dziesiętną zamiast przecinka (formatowanie <code>$"{x}"</code> i <code>ToString()</code> używa przecinka jak polski Windows). Przeciążone metody — używana jest ostatnia definicja.</td></tr>
  <tr><th>Tylko po kompilacji</th><td>pliki i foldery (<code>System.IO</code>), bazy danych, sieć, pakiety NuGet, biblioteki .dll, tworzenie kontrolek w kodzie (<code>new Button()</code>), nowe okna, style i szablony, wiązanie danych <code>{Binding}</code>.</td></tr></table>`,
      `<p><b>Start</b> opens the window in the browser and runs your C# code translated to JavaScript. Use it to check your logic quickly. The full build runs in Visual Studio 2026 or <code>dotnet build</code>: download the project with <b>Download .zip</b>.</p>
  <table><tr><th>Works</th><td>variables, primitive types, <code>if/switch/for/foreach/while</code>, methods, fields, properties, classes and records from other files, inheritance, <code>enum</code>, <code>List&lt;T&gt;</code>, <code>Dictionary</code>, arrays, LINQ (<code>Where, Select, Sum, OrderBy…</code>), <code>$"…{x:F2}"</code>, <code>Parse/TryParse</code>, <code>Math</code>, <code>Random</code>, <code>DateTime</code>, <code>DispatcherTimer</code>, <code>async/await Task.Delay</code>, <code>try/catch</code>, <code>MessageBox.Show</code>, keyboard and mouse events, <code>Canvas.SetLeft</code>, the properties of every Toolbox control</td></tr>
  <tr><th>Debugger</th><td>F9 or a click in the margin sets a breakpoint. F5 starts debugging; when the program reaches a breakpoint or throws an unhandled exception, the IDE shows the current line, <b>Locals</b> and the <b>Call Stack</b>. F10 steps over, F11 steps into a method, Shift+F11 steps out, Alt+[ steps back, and hovering a variable shows its value. A browser can't truly pause code, so the simulator records the event handler as it runs and lets you walk through it step by step; the program window shows the state after the handler finished. Ctrl+F5 runs without debugging.</td></tr>
  <tr><th>Differences</th><td><code>MessageBox.Show</code> does not pause the code (it returns the first button). Numbers follow the interface language: Polish uses a decimal comma, English a decimal point. For overloaded methods the last definition is used.</td></tr>
  <tr><th>Only after building</th><td>files and folders (<code>System.IO</code>), databases, networking, NuGet packages, .dll libraries, creating controls in code (<code>new Button()</code>), new windows, styles and templates, <code>{Binding}</code> data binding.</td></tr></table>`,
    ),
    [['OK', null, true]],
  );
}
function helpBuild() {
  dialog(
    L('Jak skompilować projekt', 'How to build the project'),
    L(
      `<p>1. Kliknij <b>Pobierz .zip</b> i rozpakuj archiwum na komputerze z Windows.</p><p>2. Otwórz <code>${esc(P.name)}.slnx</code> w Visual Studio 2026 i naciśnij F5 — albo kliknij dwukrotnie <code>build.bat</code> (wymaga .NET 10 SDK).</p><p>Archiwum zawiera kompletny projekt: <code>.csproj</code> (net10.0-windows, UseWPF), <code>App.xaml</code>, <code>MainWindow.xaml</code> z kodem, Twoje klasy, obrazy, odwołania .dll i pakiety NuGet.</p><p>Możesz też wrócić z projektem tutaj: <b>Otwórz</b> przyjmuje pobrany .zip, plik .json albo pojedyncze pliki .xaml i .cs.</p>`,
      `<p>1. Click <b>Download .zip</b> and unzip the archive on a Windows computer.</p><p>2. Open <code>${esc(P.name)}.slnx</code> in Visual Studio 2026 and press F5, or double-click <code>build.bat</code> (needs the .NET 10 SDK).</p><p>The archive has the complete project: <code>.csproj</code> (net10.0-windows, UseWPF), <code>App.xaml</code>, <code>MainWindow.xaml</code> with its code, your classes, images, .dll references and NuGet packages.</p><p>You can bring the project back here too: <b>Open</b> accepts the downloaded .zip, a .json file, or single .xaml and .cs files.</p>`,
    ),
    [['OK', null, true]],
  );
}
function helpAbout() {
  dialog(
    'CappyCoder WPF',
    `<div style="display:flex;gap:16px;align-items:center"><span style="width:72px;height:72px;flex:none">${LOGO_SVG}</span><p>${L('Wizualny projektant aplikacji WPF w przeglądarce: XAML, C# z IntelliSense, lista błędów, symulacja F5 i eksport projektu .NET 10 do Visual Studio 2026.', 'A visual WPF app designer in the browser: XAML, C# with IntelliSense, an error list, the F5 simulation, and .NET 10 project export for Visual Studio 2026.')}</p></div>`,
    [['OK', null, true]],
  );
}

/* ---------- menu ---------- */
const MENUS = () => ({
  file: [
    [L('Nowy projekt', 'New project'), 'new', 'Ctrl+N'],
    [L('Otwórz… (.json, .zip, .xaml, .cs)', 'Open… (.json, .zip, .xaml, .cs)'), 'open', 'Ctrl+O'],
    [L('Zapisz projekt (.json)', 'Save project (.json)'), 'saveJson', 'Ctrl+S'],
    '-',
    [L('Pobierz projekt .NET (.zip)', 'Download .NET project (.zip)'), 'export'],
    '-',
    [L('Wczytaj przykład: Kalkulator BMI', 'Load sample: BMI Calculator'), 'sample'],
  ],
  edit: [
    [L('Cofnij', 'Undo'), 'undo', 'Ctrl+Z'],
    [L('Ponów', 'Redo'), 'redo', 'Ctrl+Y'],
    '-',
    [L('Wytnij', 'Cut'), 'cut', 'Ctrl+X'],
    [L('Kopiuj', 'Copy'), 'copy', 'Ctrl+C'],
    [L('Wklej', 'Paste'), 'paste', 'Ctrl+V'],
    [L('Duplikuj', 'Duplicate'), 'dup', 'Ctrl+D'],
    [L('Usuń', 'Delete'), 'delete', 'Del'],
    '-',
    [L('Zaznacz wszystko', 'Select all'), 'selAll', 'Ctrl+A'],
    [L('Przenieś na wierzch', 'Bring to front'), 'front'],
    [L('Przenieś na spód', 'Send to back'), 'back'],
  ],
  view: [
    [L('Projektant', 'Designer'), 'viewDesign', 'Shift+F7'],
    [L('Kod', 'Code'), 'viewCode', 'F7'],
    [L('Konspekt dokumentu', 'Document outline'), 'outline'],
    '-',
    [L('Układ: projekt i XAML', 'Layout: design and XAML'), 'lSplit'],
    [L('Układ: tylko projekt', 'Layout: design only'), 'lDesign'],
    [L('Układ: tylko XAML', 'Layout: XAML only'), 'lXaml'],
    '-',
    [L('Siatka przyciągania (8 px)', 'Snap grid (8 px)'), 'snap'],
    [L('Przełącz motyw', 'Toggle theme'), 'theme'],
    [L('Język: English', 'Language: Polski'), 'lang'],
  ],
  project: [
    [L('Dodaj klasę…', 'Add class…'), 'addClass'],
    [L('Zarządzaj pakietami NuGet…', 'Manage NuGet packages…'), 'nuget'],
    [L('Dodaj odwołanie (.dll)…', 'Add reference (.dll)…'), 'addDll'],
    [L('Dodaj zasób (obraz, wideo)…', 'Add resource (image, video)…'), 'addAsset'],
    '-',
    [L('Otwórz plik projektu (.csproj)', 'Open project file (.csproj)'), 'openCsproj'],
  ],
  build: [
    [L('Kompiluj rozwiązanie', 'Build solution'), 'build', 'Ctrl+Shift+B'],
    [L('Pobierz projekt .NET (.zip)', 'Download .NET project (.zip)'), 'export'],
    '-',
    [L('Wyczyść dane wyjściowe', 'Clear output'), 'clearOut'],
  ],
  debug: [
    [L('Rozpocznij debugowanie', 'Start Debugging'), 'run', 'F5'],
    [L('Uruchom bez debugowania', 'Start Without Debugging'), 'runNoDbg', 'Ctrl+F5'],
    [L('Zatrzymaj', 'Stop'), 'stop', 'Shift+F5'],
    '-',
    [L('Przełącz punkt przerwania', 'Toggle Breakpoint'), 'bpToggle', 'F9'],
    [L('Usuń wszystkie punkty przerwania', 'Delete All Breakpoints'), 'bpClear', 'Ctrl+Shift+F9'],
    '-',
    [L('Kontynuuj', 'Continue'), 'dbgCont', 'F5'],
    [L('Wkrocz do', 'Step Into'), 'dbgInto', 'F11'],
    [L('Przekrocz', 'Step Over'), 'dbgOver', 'F10'],
    [L('Wyjdź z metody', 'Step Out'), 'dbgOut', 'Shift+F11'],
    '-',
    [L('Zmienne lokalne', 'Locals'), 'locals'],
    [L('Stos wywołań', 'Call Stack'), 'callStack'],
  ],
  help: [
    [L('Skróty klawiszowe', 'Keyboard shortcuts'), 'helpKeys'],
    [L('Co obsługuje symulacja F5', 'What the F5 simulation supports'), 'helpSim'],
    [L('Jak skompilować projekt', 'How to build the project'), 'helpBuild'],
    '-',
    [L('O programie CappyCoder WPF', 'About CappyCoder WPF'), 'about'],
  ],
});
const ACT = {
  new: newProject,
  open: () => {
    $('#fileIn').value = '';
    $('#fileIn').click();
  },
  saveJson,
  export: exportZip,
  sample: loadSample,
  undo,
  redo,
  cut: () => copySel(true),
  copy: () => copySel(false),
  paste: pasteClip,
  delete: delSel,
  dup: () => {
    copySel(false);
    pasteClip();
  },
  selAll: () => select(P.root.ch.map(c => c.id)),
  front: () => zorder(true),
  back: () => zorder(false),
  viewDesign: () => openDoc(MAIN_X),
  viewCode: () => openDoc(MAIN_CS),
  outline: () => setSolTab('outline'),
  lSplit: () => setLayout('split'),
  lDesign: () => setLayout('design'),
  lXaml: () => setLayout('xaml'),
  snap: () => {
    snapOn = !snapOn;
    $('#snapBtn').classList.toggle('on', snapOn);
    $('#designWrap').classList.toggle('grid', snapOn);
    status(
      snapOn
        ? L('Przyciąganie do siatki 8 px włączone.', 'Snapping to the 8 px grid is on.')
        : L('Przyciąganie wyłączone.', 'Snapping is off.'),
    );
  },
  theme: toggleTheme,
  lang: () => setLang(UI_LANG === 'en' ? 'pl' : 'en'),
  addClass: addClassDialog,
  nuget: nugetDialog,
  addDll,
  addAsset: () => addAsset(),
  openCsproj: () => openDoc(`${P.name}.csproj`),
  build: buildSolution,
  clearOut: () => {
    $('#outPre').textContent = '';
  },
  run: () => startRun(),
  runNoDbg: () => startRun(true),
  stop: () => RUN && RUN.close(false),
  bpToggle: () => {
    if (activeDoc === MAIN_X) openDoc(MAIN_CS);
    setTimeout(() => EDC.cm && toggleBp(EDC.cm.getCursor().line), 20);
  },
  bpClear: clearBps,
  dbgCont: () => RUN && RUN.dbg && dbgCmd(RUN, 'cont'),
  dbgInto: () => RUN && RUN.dbg && dbgCmd(RUN, 'into'),
  dbgOver: () => RUN && RUN.dbg && dbgCmd(RUN, 'over'),
  dbgOut: () => RUN && RUN.dbg && dbgCmd(RUN, 'out'),
  locals: () => setBottom('locals'),
  callStack: () => setBottom('stack'),
  helpKeys,
  helpSim,
  helpBuild,
  about: helpAbout,
};
function openMenu(btn) {
  closeMenus();
  btn.classList.add('open');
  const d = document.createElement('div');
  d.className = 'dropdown';
  d.id = 'menuDrop';
  d.innerHTML = MENUS()
    [btn.dataset.menu].map(it =>
      it === '-' ? '<hr>' : `<button data-act="${it[1]}">${esc(it[0])}${it[2] ? `<kbd>${it[2]}</kbd>` : ''}</button>`,
    )
    .join('');
  const r = btn.getBoundingClientRect();
  d.style.left = Math.min(r.left, innerWidth - 270) + 'px';
  d.style.top = r.bottom + 4 + 'px';
  document.body.appendChild(d);
  d.querySelector('button').focus();
}
function closeMenus() {
  $('#menuDrop')?.remove();
  $('#ctxDrop')?.remove();
  $$('.menubar>button.open').forEach(b => b.classList.remove('open'));
}
function ctxMenu(x, y) {
  closeMenus();
  const d = document.createElement('div');
  d.className = 'dropdown';
  d.id = 'ctxDrop';
  const n = sel.length === 1 ? byId(sel[0]) : null;
  const items = [
    n && n.id !== 'root'
      ? [L('Wyświetl kod / utwórz zdarzenie', 'View code / create event'), 'ctxCode']
      : [L('Wyświetl kod', 'View code'), 'viewCode'],
    '-',
    [L('Wytnij', 'Cut'), 'cut', 'Ctrl+X'],
    [L('Kopiuj', 'Copy'), 'copy', 'Ctrl+C'],
    [L('Wklej', 'Paste'), 'paste', 'Ctrl+V'],
    [L('Usuń', 'Delete'), 'delete', 'Del'],
    '-',
    [L('Przenieś na wierzch', 'Bring to front'), 'front'],
    [L('Przenieś na spód', 'Send to back'), 'back'],
    '-',
    [L('Zaznacz element nadrzędny', 'Select parent'), 'ctxParent'],
  ];
  d.innerHTML = items
    .map(it =>
      it === '-' ? '<hr>' : `<button data-act="${it[1]}">${esc(it[0])}${it[2] ? `<kbd>${it[2]}</kbd>` : ''}</button>`,
    )
    .join('');
  d.style.left = Math.min(x, innerWidth - 270) + 'px';
  d.style.top = Math.min(y, innerHeight - 320) + 'px';
  document.body.appendChild(d);
}
ACT.ctxCode = () => {
  const n = byId(sel[0]);
  if (n) createDefaultHandler(n);
};
ACT.ctxParent = () => {
  const p = sel[0] && parentOf(sel[0]);
  select([p ? p.id : 'win']);
};
function toggleTheme() {
  const r = document.documentElement;
  const cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  r.dataset.theme = cur === 'dark' ? 'light' : 'dark';
  LS.set('wpf-theme', r.dataset.theme);
}
function setSolTab(t) {
  solTab = t;
  $$('#solTabs button').forEach(b => b.classList.toggle('on', b.dataset.s === t));
  $('#solBtns').hidden = t !== 'sol';
  t === 'sol' ? renderSol() : renderOutline();
}

/* ---------- język interfejsu ---------- */
function applyStatic() {
  const en = UI_LANG === 'en';
  $$('[data-en]').forEach(el => {
    if (el.dataset.pl == null) el.dataset.pl = el.textContent;
    el.textContent = en ? el.dataset.en : el.dataset.pl;
  });
  ['title', 'placeholder', 'aria-label'].forEach(a =>
    $$(`[data-en-${a}]`).forEach(el => {
      if (!el.hasAttribute(`data-pl-${a}`)) el.setAttribute(`data-pl-${a}`, el.getAttribute(a) || '');
      el.setAttribute(a, en ? el.getAttribute(`data-en-${a}`) : el.getAttribute(`data-pl-${a}`));
    }),
  );
  $$('#langSeg button').forEach(b => b.classList.toggle('on', b.dataset.lang === UI_LANG));
  document.documentElement.lang = UI_LANG;
  $('#propSearch').placeholder =
    propTab === 'events' ? L('Szukaj zdarzenia', 'Search events') : L('Szukaj właściwości', 'Search properties');
}
function setLang(l) {
  if (l !== 'pl' && l !== 'en') return;
  UI_LANG = l;
  LS.set('wpf-lang', l);
  applyStatic();
  closeMenus();
  if (!xamlBroken && xamlWarns.length) applyXaml(true);
  renderToolbox();
  renderDocTabs();
  refreshMemberNav();
  renderDesign();
  renderOutline();
  renderProps();
  renderSol();
  runChecks();
  if (EDF && activeDoc && docKind(activeDoc) === 'file') openDoc(activeDoc);
  status(L('Język interfejsu: polski.', 'Interface language: English.'));
}

/* ---------- podłączenie zdarzeń interfejsu ---------- */
function wire() {
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a && ACT[a.dataset.act]) {
      closeMenus();
      ACT[a.dataset.act]();
      return;
    }
    const mb = e.target.closest('.menubar>button');
    if (mb) {
      mb.classList.contains('open') ? closeMenus() : openMenu(mb);
      return;
    }
    if (!e.target.closest('.dropdown')) closeMenus();
  });
  $('#menubar').addEventListener('mouseover', e => {
    const mb = e.target.closest('button');
    if (mb && $('#menuDrop') && !mb.classList.contains('open')) openMenu(mb);
  });
  $('#themeBtn').onclick = toggleTheme;
  $('#langSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-lang]');
    if (b) setLang(b.dataset.lang);
  });
  $('#projName').addEventListener('change', e => renameProject(e.target.value));
  $('#fileIn').addEventListener('change', e => importFiles(e.target.files));
  // projektant
  const dw = $('#designWrap');
  dw.addEventListener('pointerdown', designDown);
  dw.addEventListener('pointermove', designMove);
  dw.addEventListener('pointerup', designUp);
  dw.addEventListener('pointercancel', designUp);
  dw.addEventListener('dblclick', e => {
    const hit = document.elementFromPoint(e.clientX, e.clientY) || e.target;
    if (hit.closest('.selbox .h')) return;
    const c = hit.closest('#winScale .c');
    const w = hit.closest('#winScale .wnd');
    if (c) {
      const n = byId(c.dataset.id);
      if (n.id === 'root') return;
      createDefaultHandler(n);
    } else if (w) createDefaultHandler(P.win);
  });
  dw.addEventListener('contextmenu', e => {
    if (!e.target.closest('#winScale')) return;
    e.preventDefault();
    const c = e.target.closest('#winScale .c');
    if (c && !sel.includes(c.dataset.id)) select([c.dataset.id]);
    ctxMenu(e.clientX, e.clientY);
  });
  dw.addEventListener('scroll', () => drawOverlay());
  // przybornik
  $('#tbList').addEventListener('pointerdown', tbDown);
  addEventListener('pointermove', tbMove);
  addEventListener('pointerup', tbUp);
  $('#tbList').addEventListener('dblclick', e => {
    const it = e.target.closest('.tbi');
    if (it) {
      if (activeDoc !== MAIN_X) openDoc(MAIN_X);
      addControl(it.dataset.t);
    }
  });
  $('#tbSearch').addEventListener('input', renderToolbox);
  // dokumenty
  $('#docTabs').addEventListener('click', e => {
    const x = e.target.closest('[data-close]');
    if (x) {
      e.stopPropagation();
      closeDoc(x.dataset.close);
      return;
    }
    const t = e.target.closest('[data-doc]');
    if (t) openDoc(t.dataset.doc);
  });
  $('#docTabs').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const t = e.target.closest('[data-doc]');
      if (t) openDoc(t.dataset.doc);
    }
  });
  $('#layoutSeg').addEventListener('click', e => {
    const b = e.target.closest('[data-l]');
    if (b) setLayout(b.dataset.l);
  });
  $('#zoomSel').addEventListener('change', e => {
    const v = e.target.value;
    if (v === 'fit') {
      const r = $('#designWrap').getBoundingClientRect();
      zoom = Math.max(0.25, Math.min(2, (r.width - 64) / P.win.w, (r.height - 64) / P.win.h));
    } else zoom = +v;
    renderDesign();
  });
  $('#memberNav').addEventListener('change', e => {
    if (e.target.value) {
      edGoto(EDC, +e.target.value);
      e.target.value = '';
    }
  });
  // panele
  $('#botTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-b]');
    if (b) setBottom(b.dataset.b);
  });
  $('#errBody').addEventListener('click', e => {
    const fx = e.target.closest('[data-fix]');
    if (fx) {
      const er = lastErrs[+fx.dataset.fix];
      gotoHandler(er.fix.name, er.fix.event);
      return;
    }
    const fxx = e.target.closest('[data-fixx]');
    if (fxx) {
      applyXamlFix(lastErrs[+fxx.dataset.fixx]);
      return;
    }
    const fu = e.target.closest('[data-fixu]');
    if (fu) {
      const er = lastErrs[+fu.dataset.fixu];
      const code = getCode(er.file);
      const lines = code.split('\n');
      let last = -1;
      lines.forEach((l, i) => {
        if (/^\s*using\s+[\w.]+\s*;/.test(l)) last = i;
      });
      lines.splice(last + 1, 0, `using ${er.fixUsing};`);
      const nv = lines.join('\n');
      if (er.file === MAIN_CS) setMainCode(nv);
      else {
        setCode(er.file, nv);
        if (DOCS[er.file]) DOCS[er.file].setValue(nv);
      }
      runChecks();
      status(L(`Dodano using ${er.fixUsing};`, `Added using ${er.fixUsing};`));
      return;
    }
    const r = e.target.closest('[data-err]');
    if (r) gotoError(lastErrs[+r.dataset.err]);
  });
  $('#solTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-s]');
    if (b) setSolTab(b.dataset.s);
  });
  $('#solBody').addEventListener('click', e => {
    const s = e.target.closest('[data-sel]');
    if (s) {
      select([s.dataset.sel]);
      if (activeDoc !== MAIN_X) openDoc(MAIN_X);
      return;
    }
    const dl = e.target.closest('[data-del]');
    if (dl) {
      const nm = dl.dataset.del;
      dialog(
        L('Usuń plik', 'Remove file'),
        L(`<p>Usunąć ${esc(nm)} z projektu?</p>`, `<p>Remove ${esc(nm)} from the project?</p>`),
        [
          [L('Anuluj', 'Cancel')],
          [
            L('Usuń', 'Remove'),
            () => {
              P.files = P.files.filter(f => f.name !== nm);
              delete DOCS[nm];
              closeDoc(nm);
              renderSol();
              scheduleSave();
              scheduleCheck();
            },
            true,
          ],
        ],
      );
      return;
    }
    const da = e.target.closest('[data-delasset]');
    if (da) {
      delete P.assets[da.dataset.delasset];
      renderSol();
      renderDesign();
      scheduleSave();
      return;
    }
    if (e.target.closest('[data-pkg]')) {
      nugetDialog();
      return;
    }
    const rf = e.target.closest('[data-ref]');
    if (rf) {
      dialog(
        L('Odwołanie ', 'Reference ') + rf.dataset.ref,
        L('<p>Usunąć to odwołanie z projektu?</p>', '<p>Remove this reference from the project?</p>'),
        [
          [L('Anuluj', 'Cancel')],
          [
            L('Usuń', 'Remove'),
            () => {
              P.refs = P.refs.filter(r => r.name !== rf.dataset.ref);
              renderSol();
              scheduleSave();
            },
            true,
          ],
        ],
      );
      return;
    }
    const o = e.target.closest('[data-open]');
    if (o) openDoc(o.dataset.open);
  });
  // właściwości
  $('#propTabs').addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    propTab = b.dataset.p;
    $$('#propTabs button').forEach(x => x.classList.toggle('on', x === b));
    $('#propSearch').placeholder =
      propTab === 'events' ? L('Szukaj zdarzenia', 'Search events') : L('Szukaj właściwości', 'Search properties');
    renderProps();
  });
  $('#propSearch').addEventListener('input', renderProps);
  $('#pName').addEventListener('change', e => renameSel(e.target.value));
  $('#pName').addEventListener('keydown', e => {
    if (e.key === 'Enter') e.target.blur();
  });
  const pb = $('#propBody');
  pb.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.ev) {
      const n = selNodes()[0];
      const v = t.value.trim();
      if (v && !IDRE.test(v)) {
        status(L('Nazwa metody musi być identyfikatorem C#.', 'The method name must be a C# identifier.'), 'err');
        t.value = n.ev[t.dataset.ev] || '';
        return;
      }
      snap();
      if (v) {
        n.ev[t.dataset.ev] = v;
        ensureHandler(v, t.dataset.ev);
      } else delete n.ev[t.dataset.ev];
      commit();
      return;
    }
    if (t.dataset.color) {
      const hex = t.value.replace('#', '').toUpperCase();
      applyProp(t.dataset.k, '#FF' + hex);
      return;
    }
    if (t.dataset.k)
      applyProp(t.dataset.k, t.type === 'date' ? (t.value ? fmtD(parseDate(t.value)) : '') : t.value, t.dataset.i);
  });
  pb.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.color) {
      const sw = t.parentElement.querySelector('i');
      if (sw) sw.style.background = t.value;
    }
  });
  pb.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      if (e.target.dataset.ev && !e.target.value.trim()) {
        const n = selNodes()[0];
        e.target.value = defaultHandlerName(n, e.target.dataset.ev);
      }
      e.target.blur();
    }
  });
  pb.addEventListener('dblclick', e => {
    const t = e.target.closest('[data-ev]');
    if (!t) return;
    const n = selNodes()[0];
    const ev = t.dataset.ev;
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
  });
  pb.addEventListener('click', e => {
    const g = e.target.closest('[data-go]');
    if (g) {
      const n = selNodes()[0];
      const ev = g.dataset.go;
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
      return;
    }
    const r = e.target.closest('[data-reset]');
    if (r) {
      resetProp(r.dataset.reset);
      return;
    }
    const as = e.target.closest('[data-asset]');
    if (as) {
      addAsset(key => applyProp(as.dataset.asset, key));
      return;
    }
  });
  pb.addEventListener(
    'toggle',
    e => {
      const d = e.target.closest('details[data-g]');
      if (!d) return;
      const cl = new Set(JSON.parse(LS.get('wpf-pg-closed') || '[]'));
      d.open ? cl.delete(d.dataset.g) : cl.add(d.dataset.g);
      LS.set('wpf-pg-closed', JSON.stringify([...cl]));
    },
    true,
  );
  // podziały paneli
  $$('.split').forEach(sp =>
    sp.addEventListener('pointerdown', e => {
      e.preventDefault();
      sp.setPointerCapture(e.pointerId);
      sp.classList.add('drag');
      const k = sp.dataset.split;
      const root = document.documentElement;
      const start = {
        x: e.clientX,
        y: e.clientY,
        lw: $('#toolbox').offsetWidth,
        rw: $('#right').offsetWidth,
        bh: $('#bottom').offsetHeight,
        xh: $('#xamlPane').offsetHeight,
        sh: $('#solPane').offsetHeight,
      };
      const mv = ev => {
        const dx = ev.clientX - start.x,
          dy = ev.clientY - start.y;
        if (k === 'left') root.style.setProperty('--lw', Math.max(150, Math.min(420, start.lw + dx)) + 'px');
        if (k === 'right') root.style.setProperty('--rw', Math.max(220, Math.min(560, start.rw - dx)) + 'px');
        if (k === 'bottom')
          root.style.setProperty('--bh', Math.max(60, Math.min(innerHeight * 0.6, start.bh - dy)) + 'px');
        if (k === 'xaml') root.style.setProperty('--xh', Math.max(60, start.xh - dy) + 'px');
        if (k === 'rightsplit') root.style.setProperty('--sh', Math.max(80, start.sh + dy) + 'px');
        drawOverlay();
      };
      const up = () => {
        sp.classList.remove('drag');
        sp.removeEventListener('pointermove', mv);
        sp.removeEventListener('pointerup', up);
        EDX.refresh();
        EDC.refresh();
        renderDesign();
      };
      sp.addEventListener('pointermove', mv);
      sp.addEventListener('pointerup', up);
    }),
  );
  addEventListener('resize', () => drawOverlay());
  // skróty klawiszowe
  addEventListener('keydown', e => {
    if (RUN) return;
    if (document.querySelector('.modal')) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const k = e.key;
    const inField = e.target.closest && e.target.closest('input,textarea,select,[contenteditable],.CodeMirror');
    if (k === 'F5' && !e.shiftKey) {
      e.preventDefault();
      startRun(ctrl ? true : undefined);
      return;
    }
    if (k === 'F9' && ctrl && e.shiftKey) {
      e.preventDefault();
      clearBps();
      return;
    }
    if (k === 'F9' && activeDoc !== MAIN_X && EDC.cm) {
      e.preventDefault();
      toggleBp(EDC.cm.getCursor().line);
      return;
    }
    if (ctrl && e.shiftKey && (k === 'B' || k === 'b')) {
      e.preventDefault();
      buildSolution();
      return;
    }
    if (k === 'F7') {
      e.preventDefault();
      e.shiftKey ? openDoc(MAIN_X) : openDoc(MAIN_CS);
      return;
    }
    if (ctrl && (k === 's' || k === 'S')) {
      e.preventDefault();
      saveLocal();
      saveJson();
      return;
    }
    if (ctrl && (k === 'o' || k === 'O')) {
      e.preventDefault();
      ACT.open();
      return;
    }
    if (k === 'Escape') closeMenus();
    if (inField || activeDoc !== MAIN_X) return;
    if (k === 'Delete' || k === 'Backspace') {
      e.preventDefault();
      delSel();
    } else if (k.startsWith('Arrow')) {
      const s = e.shiftKey ? 10 : 1;
      if (nudge(k === 'ArrowLeft' ? -s : k === 'ArrowRight' ? s : 0, k === 'ArrowUp' ? -s : k === 'ArrowDown' ? s : 0))
        e.preventDefault();
    } else if (ctrl && (k === 'c' || k === 'C')) {
      e.preventDefault();
      copySel(false);
    } else if (ctrl && (k === 'x' || k === 'X')) {
      e.preventDefault();
      copySel(true);
    } else if (ctrl && (k === 'v' || k === 'V')) {
      e.preventDefault();
      pasteClip();
    } else if (ctrl && (k === 'd' || k === 'D')) {
      e.preventDefault();
      ACT.dup();
    } else if (ctrl && (k === 'z' || k === 'Z')) {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    } else if (ctrl && (k === 'y' || k === 'Y')) {
      e.preventDefault();
      redo();
    } else if (ctrl && (k === 'a' || k === 'A')) {
      e.preventDefault();
      ACT.selAll();
    } else if (ctrl && (k === 'n' || k === 'N')) {
      e.preventDefault();
      newProject();
    } else if (k === 'Escape') ACT.ctxParent();
  });
}

/* ---------- start ---------- */
function init() {
  const th = LS.get('wpf-theme');
  if (th) document.documentElement.dataset.theme = th;
  const lg = LS.get('wpf-lang');
  UI_LANG = lg === 'en' || lg === 'pl' ? lg : (navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en';
  $$('.brand-logo').forEach(el => (el.innerHTML = LOGO_SVG));
  const dl = document.createElement('div');
  dl.hidden = true;
  dl.innerHTML = `<datalist id="dlColors">${NAMED.map(c => `<option value="${c}">`).join('')}</datalist><datalist id="dlFonts">${PD.FontFamily.map(c => `<option value="${c}">`).join('')}</datalist>`;
  document.body.appendChild(dl);
  const goCtl = cm => {
    const w = cm.findWordAt(cm.getCursor());
    const word = cm.getRange(w.anchor, w.head);
    let f = null;
    walk(n => {
      if (n.name === word) {
        f = n;
        return false;
      }
    });
    if (f) {
      openDoc(MAIN_X);
      select([f.id]);
    } else status(L(`„${word}” nie jest nazwą kontrolki.`, `'${word}' is not a control name.`));
  };
  const tab = c => {
    if (c.state.completionActive) return CodeMirror.Pass;
    return c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ', 'end');
  };
  EDX = mkEd($('#xamlEd'), 'xml', { extraKeys: { 'Ctrl-Space': cm => IS.show(cm, 'xaml'), Tab: tab } });
  EDC = mkEd($('#codeEd'), 'text/x-csharp', {
    extraKeys: {
      'Ctrl-Space': cm => IS.show(cm, 'cs'),
      'Ctrl-Shift-Space': cm => IS.updateSig(cm, true),
      'Ctrl-J': cm => IS.show(cm, 'cs'),
      Tab: tab,
      F12: goCtl,
    },
    gutters: ['bp-gutter', 'CodeMirror-linenumbers'],
  });
  EDF = mkEd($('#fileEd'), 'xml', { readOnly: true });
  if (EDC.cm) {
    IS.attachCs(EDC.cm);
    EDC.cm.on('cursorActivity', cm => {
      const c = cm.getCursor();
      $('#stPos').textContent = `${L('Wrs', 'Ln')} ${c.line + 1}  ${L('Kol', 'Col')} ${c.ch + 1}`;
    });
  }
  if (EDC.cm) {
    EDC.cm.on('gutterClick', (cm, line, g) => {
      if (g === 'bp-gutter' || g === 'CodeMirror-linenumbers') toggleBp(line);
    });
    EDC.cm.getWrapperElement().addEventListener('mousemove', ev => dbgHover(EDC.cm, ev));
    EDC.cm.getWrapperElement().addEventListener('mouseleave', hideDbgTip);
  }
  if (EDX.cm) IS.attachXaml(EDX.cm);
  let codeT;
  EDC.on(() => {
    setCode(codeFile, EDC.get());
    clearTimeout(codeT);
    codeT = setTimeout(() => {
      refreshMemberNav();
      scheduleSave();
      runChecks();
    }, 500);
  });
  EDX.on(() => {
    clearTimeout(xT);
    xT = setTimeout(() => applyXaml(), 650);
  });
  applyStatic();
  wire();
  renderToolbox();
  let pr = null;
  try {
    const s = LS.get('wpf-designer-project');
    if (s) pr = JSON.parse(s);
  } catch (e) {}
  loadProject(pr && pr.root ? pr : blankProject('WpfApp1'));
  setSolTab('sol');
  setLayout('split');
  status(L('Gotowe', 'Ready'));
  if (!window.CodeMirror)
    status(
      L(
        'Edytor kodu działa w trybie podstawowym (nie wczytano biblioteki podświetlania składni).',
        'The code editor runs in basic mode (the syntax highlighting library did not load).',
      ),
    );
}
init();
try {
  window.__CC = { IS, SEM, CS };
} catch (e) {}
