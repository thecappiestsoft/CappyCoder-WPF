# CappyCoder WPF

Wizualny projektant aplikacji WPF działający w przeglądarce i jako aplikacja desktopowa (Windows, macOS, Linux).
Zawiera projektant okien z przybornikiem kontrolek, edytor XAML i C# z IntelliSense, listę błędów (XAML i C#),
symulację uruchomienia (F5), debuger z punktami przerwania oraz eksport projektu .NET 10 do Visual Studio 2026.

© 2026 CappySoft.pl

---

## Szybki start

Potrzebny jest **Node.js 18 lub nowszy** (https://nodejs.org). Python 3 jest potrzebny tylko do odświeżania bazy API.

| Co chcesz zrobić | Windows | macOS / Linux |
|---|---|---|
| Jeden plik `.html` (działa offline) | `scripts\build-html.bat` | `./scripts/build-html.sh` |
| Jeden plik `.html` z bibliotekami z CDN | `scripts\build-html.bat --cdn` | `./scripts/build-html.sh --cdn` |
| Aplikacja desktopowa Windows | `scripts\build-windows.bat` (lub `.ps1`) | — |
| Aplikacja desktopowa macOS | — | `./scripts/build-mac.sh` (tylko na Macu) |
| Aplikacja desktopowa Linux | — | `./scripts/build-linux.sh` |
| Wszystko, co się da na tym systemie | — | `./scripts/build-all.sh` |
| Uruchomienie wersji desktopowej bez pakowania | `npm start` | `./scripts/run-desktop.sh` |

Skrypty same instalują zależności (`npm install`) przy pierwszym uruchomieniu.

### Wyniki

| Skrypt | Gdzie | Pliki |
|---|---|---|
| build-html | `dist/` | `cappycoder-wpf.html` — cała aplikacja w jednym pliku (~2 MB) |
| build-windows | `release/` | `CappyCoder WPF Setup 1.0.0.exe` (instalator x64 + ARM64), `CappyCoder WPF-1.0.0-portable.exe` |
| build-mac | `release/` | `CappyCoder WPF-1.0.0-universal.dmg`, `…-universal-mac.zip` (Intel + Apple Silicon) |
| build-linux | `release/` | `CappyCoder WPF-1.0.0.AppImage`, `cappycoder-wpf_1.0.0_amd64.deb`, `cappycoder-wpf-1.0.0.tar.gz` |

### Uwagi o platformach

- **macOS** — wersję dla Maca można zbudować tylko na macOS (wymaga narzędzi Apple). Aplikacja nie jest podpisana,
  więc przy pierwszym uruchomieniu: prawy przycisk na aplikacji → *Otwórz*. Aby podpisać i notaryzować, ustaw zmienne
  `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` i usuń `"identity": null`
  z sekcji `build.mac` w `package.json`.
- **Windows** — instalator nie jest podpisany, więc SmartScreen pokaże ostrzeżenie (*Więcej informacji → Uruchom mimo to*).
  Podpisywanie: zmienne `CSC_LINK` i `CSC_KEY_PASSWORD` z certyfikatem Code Signing.
  Zbudowanie wersji Windows na Linuksie/macOS jest możliwe po zainstalowaniu `wine` (robi to `build-all.sh`).
- **Linux** — AppImage: `chmod +x "CappyCoder WPF-1.0.0.AppImage"`, potem uruchom. Pakiet `.deb`: `sudo apt install ./cappycoder-wpf_1.0.0_amd64.deb`.

---

## Praca nad kodem

```bash
npm install          # zależności (CodeMirror, JSZip, Electron, electron-builder, Prettier)
npm run watch        # buduje dist/cappycoder-wpf.html przy każdej zmianie w src/
                     # → otwórz plik w przeglądarce i odświeżaj (F5 przeglądarki = Ctrl+R, bo F5 w IDE uruchamia program)
npm start            # buduje i otwiera wersję desktopową (Ctrl+Shift+I — narzędzia deweloperskie)
npm run format       # formatowanie kodu (Prettier, ustawienia w .prettierrc.json)
```

W konsoli przeglądarki dostępny jest obiekt `window.__CC` z modułami `IS` (IntelliSense), `SEM` (analizator C#)
i `CS` (tłumacz C#), np. `__CC.IS.membersOf('TextBox')` albo `__CC.SEM.check([{ name: 'a.cs', src: '…' }], {})`.

### Struktura

```
src/
  body.html               układ okna IDE (menu, przybornik, edytory, panele)
  styles.css              wygląd (motyw jasny/ciemny, styl Windows 11 kontrolek, CodeMirror)
  lib/csharp.js           tokenizer i tłumacz C# → JS, środowisko wykonawcze symulacji (globalne CS, CSRT, L)
  js/01-model.js … 10-app.js   moduły IDE — sklejane w tej kolejności w jedną funkcję (wspólny zasięg)
  data/api.txt            pełne API .NET 10 / WPF (typy, składowe, przeciążenia) dla IntelliSense i analizatora
  assets/logo.svg         logo (także ikona aplikacji i favicon)
tools/
  build.mjs               budowanie pojedynczego pliku .html (bez zależności poza Node)
  api-db/                 generator src/data/api.txt z oficjalnych plików referencyjnych dotnet/wpf i dotnet/runtime
desktop/main.js           proces główny Electrona (okno, pobieranie plików, linki)
build/icon.png            ikona aplikacji desktopowej (1024×1024)
scripts/                  gotowe skrypty budowania dla Windows / macOS / Linux
docs/ARCHITEKTURA.md      opis modułów, przepływu danych i najważniejszych mechanizmów
```

Opis modułów i tego, jak działają analizator, symulacja i debuger: **[docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md)**.

### Odświeżenie bazy API .NET / WPF

```bash
./tools/api-db/regenerate.sh    # pobiera najnowsze pliki ref/*.cs z GitHuba i zapisuje src/data/api.txt
npm run build
```

Zakres typów (przestrzenie nazw) ustawia się w `tools/api-db/build_db.py`.

### Wersja aplikacji

Numer wersji jest w `package.json` (`version`) — trafia do nazw plików instalacyjnych i do stałej `APP_VERSION` w aplikacji.

---

Biblioteki zewnętrzne i ich licencje: [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
