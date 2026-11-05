/**
 * CappyCoder WPF — wersja desktopowa (Electron)
 *
 * Otwiera zbudowany plik dist/cappycoder-wpf.html w oknie aplikacji. Cała logika IDE jest w tym pliku HTML,
 * więc wersja desktopowa i przeglądarkowa działają tak samo. Tutaj są tylko sprawy okna:
 *  - brak domyślnego menu Electrona (F5, F9–F12, Ctrl+R są potrzebne w IDE, a nie do przeładowania strony),
 *  - linki zewnętrzne otwierają się w przeglądarce systemowej,
 *  - pobieranie (.zip projektu) pyta, gdzie zapisać plik,
 *  - zapamiętanie rozmiaru i położenia okna.
 */
const { app, BrowserWindow, Menu, shell, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const HTML = path.join(__dirname, '..', 'dist', 'cappycoder-wpf.html');
const STATE = () => path.join(app.getPath('userData'), 'window-state.json');

function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE(), 'utf8'));
    const area = screen.getDisplayMatching(s).workArea; // okno musi być widoczne na którymś ekranie
    if (s.x >= area.x - 50 && s.y >= area.y - 50) return s;
  } catch {}
  return { width: 1440, height: 900 };
}

function saveState(win) {
  try {
    const b = win.getNormalBounds();
    fs.writeFileSync(STATE(), JSON.stringify({ ...b, maximized: win.isMaximized() }));
  } catch {}
}

function macMenu() {
  // Na macOS menu aplikacji jest potrzebne do Cmd+C / Cmd+V / Cmd+Q — bez pozycji „Przeładuj”.
  return Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]);
}

function createWindow() {
  const st = loadState();
  const win = new BrowserWindow({
    ...st,
    minWidth: 900,
    minHeight: 600,
    title: 'CappyCoder WPF',
    backgroundColor: '#f3f3f3',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  if (st.maximized) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('close', () => saveState(win));

  // Linki http(s) — do przeglądarki systemowej
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // Pobieranie pliku (np. „Pobierz .zip”) — okno „Zapisz jako”
  win.webContents.session.on('will-download', item => {
    item.setSaveDialogOptions({
      title: 'Zapisz plik',
      defaultPath: path.join(app.getPath('downloads'), item.getFilename()),
    });
  });

  // Ctrl+Shift+I — narzędzia deweloperskie (przydatne przy pracy nad IDE)
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools();
      e.preventDefault();
    }
  });

  win.loadFile(HTML);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) w.restore();
      w.focus();
    }
  });
  app.whenReady().then(() => {
    Menu.setApplicationMenu(process.platform === 'darwin' ? macMenu() : null);
    createWindow();
    app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
  });
  app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
}
