# Składniki zewnętrzne

| Składnik | Wersja | Licencja | Użycie |
|---|---|---|---|
| [CodeMirror](https://codemirror.net/5/) | 5.65.16 | MIT | edytory XAML i C# (wbudowany w plik HTML) |
| [JSZip](https://stuk.github.io/jszip/) | 3.10.1 | MIT lub GPLv3 (wybrano MIT) | eksport projektu do .zip (wbudowany w plik HTML) |
| [Electron](https://www.electronjs.org/) | 33.2.1 | MIT | wersja desktopowa |
| [electron-builder](https://www.electron.build/) | 25.1.8 | MIT | pakowanie wersji desktopowej (tylko przy budowaniu) |
| Pliki referencyjne API [dotnet/wpf](https://github.com/dotnet/wpf), [dotnet/runtime](https://github.com/dotnet/runtime) | main | MIT (.NET Foundation) | źródło danych `src/data/api.txt` (nazwy typów i sygnatury) |
| Czcionki IBM Plex Sans, JetBrains Mono (Google Fonts) | — | SIL Open Font License 1.1 | interfejs; ładowane z sieci, offline zastępowane czcionkami systemowymi |

Pełne teksty licencji znajdują się w pakietach w `node_modules/` po `npm install`.
