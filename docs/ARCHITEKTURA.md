# Architektura CappyCoder WPF

CappyCoder WPF to aplikacja jednostronicowa bez frameworka i bez serwera. Cały kod działa w przeglądarce
(lub w oknie Electrona). Wynikiem budowania jest jeden plik HTML: style, układ, baza API i skrypty są w nim wbudowane.

## Jak składany jest plik HTML

`tools/build.mjs` skleja w tej kolejności:

1. `<head>`: tytuł, favicon (z `src/assets/logo.svg`), czcionki Google (opcjonalnie), `src/styles.css`.
2. `<body>`: `src/body.html` — statyczny układ IDE.
3. `<script type="text/plain" id="apidb">` — `src/data/api.txt` (czytany przez moduł 07 przy starcie).
4. Biblioteki: CodeMirror 5 (edytor + tryby C#/XML + dodatki) i JSZip (eksport .zip) — wbudowane z `node_modules`
   albo, z opcją `--cdn`, ładowane z cdnjs.
5. `src/lib/csharp.js` — osobny skrypt, definiuje globalne `UI_LANG`, `L()`, `CS`, `CSRT`.
6. Moduły `src/js/NN-*.js` sklejone **w kolejności numerów** wewnątrz jednej funkcji `(function () { … })()`.
   Dzięki temu moduły współdzielą zasięg (funkcje i stałe z modułu 01 są widoczne w 10) i nic nie wycieka do `window`
   oprócz celowo wystawionego `window.__CC`. Przed zapisem skrypt sprawdza składnię (`vm.Script`).

> Konsekwencja wspólnego zasięgu: deklaracje `const`/`let` z modułu o wyższym numerze **nie są** dostępne podczas
> wykonywania kodu najwyższego poziomu modułów wcześniejszych (TDZ) — tylko wewnątrz funkcji wywoływanych później.
> Deklaracje `function` są dostępne wszędzie. Kod startowy jest w module 10, który idzie na końcu.

## Moduły

| Plik | Odpowiada za | Najważniejsze nazwy |
|---|---|---|
| `lib/csharp.js` | tokenizer C# (`CS.tokenize`, literały zastępowane znacznikami `\u0001N\u0002`), skanowanie typów i składowych (`CS.scanTypes`), szybka kontrola składni (`CS.check`), tłumaczenie C# → JS (`CS.transpile`), środowisko wykonawcze `CSRT` (formatowanie liczb/dat zależne od języka, `Math`, `Convert`, `DateTime`, `Random`, kolekcje, wyjątki .NET) | `CS`, `CSRT`, `L(pl, en)` |
| `01-model.js` | definicje kontrolek przybornika (`TY`: właściwości, zdarzenia, domyślne wartości), model projektu `P`, generowanie i parsowanie XAML, `LS` (bezpieczny localStorage) | `P`, `TY`, `genXaml`, `parseXaml`, `walk`, `blankProject` |
| `02-render.js` | rysowanie kontrolek w stylu Windows 11 (`R.Button`, `R.DataGrid`, …) i ramki okna | `R`, `winFrame` |
| `03-designer.js` | powierzchnia projektowa: zaznaczanie, przeciąganie, uchwyty, przybornik, Eksplorator rozwiązań, cofanie/ponawianie, zapis lokalny, dokumenty edytora (`DOCS`, `openDoc`) | `select`, `openDoc`, `saveLocal`, `commit`, `undo` |
| `04-panels.js` | okno Właściwości/Zdarzenia, Lista błędów, podkreślenia w edytorze, Dane wyjściowe, „Kompiluj” | `runChecks`, `renderErrors`, `setBottom`, `out` |
| `05-runtime.js` | symulacja F5: tworzy okno programu, wiąże zdarzenia, wykonuje kod z `CS.transpile`, timery, `MessageBox`, obsługa wyjątków | `startRun`, `createRuntime`, `RUN` |
| `06-debugger.js` | punkty przerwania, tryb przerwania, krokowanie po zapisanym śladzie, Zmienne lokalne, Stos wywołań, podgląd wartości | `toggleBp`, `dbgBreak`, `dbgCmd`, `dbgScope` |
| `07-intellisense.js` | baza typów (opisy ręczne PL/EN + pełne API z `api.txt`), wnioskowanie typów wyrażeń, uzupełnianie C# i XAML, podpowiedzi parametrów, opisy po najechaniu | `IS` |
| `08-xaml-validator.js` | walidacja XAML (składnia XML, elementy, atrybuty, wartości, procedury obsługi) z pozycjami i poprawkami | `validateXaml`, `applyXamlFix` |
| `09-semantic.js` | analizator semantyczny C#: lekser, parser Pratta, kontrola typów i konwersji, rozstrzyganie przeciążeń, przypisanie określone; instrumentacja kodu dla debugera | `SEM` |
| `10-app.js` | eksport projektu (.zip z `.csproj`, `App.xaml`, `build.bat`), NuGet i .dll, okna dialogowe, menu, skróty klawiszowe, PL/EN, inicjalizacja edytorów, start | `exportZip`, `loadProject`, `ACT`, `MENUS` |

## Model projektu

```js
P = {
  name: 'WpfApp1',
  win:  { Title, Width, Height, … },              // właściwości okna
  root: { id, t: 'Grid', name, p: {…}, ev: {…}, ch: [ … ] },   // drzewo kontrolek (t = typ, p = właściwości, ev = zdarzenia)
  code: '…MainWindow.xaml.cs…',
  files: [{ name: 'Model.cs', src: '…' }],        // dodatkowe pliki C#
  pkgs, refs, assets,                             // pakiety NuGet, odwołania .dll, zasoby
  xamlText,                                       // tekst XAML z edytora (zachowuje formatowanie użytkownika)
  bps: { 'MainWindow.xaml.cs': [27, 31] }         // punkty przerwania
}
```

Zapis w `localStorage`: `wpf-designer-project` (projekt), `wpf-lang`, `wpf-theme`, `wpf-tb-closed`, `wpf-pg-closed`.

Projektant i XAML są zsynchronizowane w obie strony: zmiany w projektancie → `genXaml()` → edytor XAML;
edycja XAML → `parseXaml()` → `P.root`.

## Lista błędów (`runChecks` w 04)

Uruchamiana po każdej zmianie (z opóźnieniem). Łączy, usuwając duplikaty:

1. `validateXaml(tekst)` — błędy XAML (kody VS: `MC3000`, `XLS0414`, `XLS0413`, …).
2. `CS.check` — szybka kontrola składni C# (nawiasy, średniki, słowa kluczowe).
3. `SEM.check(pliki, { handlers })` — analiza semantyczna: konwersje wg tabeli „Built-in numeric conversions”
   (`CS0266` dla `int x = d;` z `double d`), `CS0029`, `CS1061` z podpowiedzią „Czy chodziło o…”, `CS1501/1503`
   (przeciążenia), `CS0200` (tylko do odczytu), `CS0165` (nieprzypisana zmienna) i inne.
4. Brakujące dyrektywy `using` (`CS0246`) i ostrzeżenia symulacji.

Typy i składowe .NET/WPF pochodzą z `IS` (moduł 07). Typ jest „domknięty” (brak składowej = błąd), gdy cała jego
hierarchia bazowa jest opisana w oficjalnym API (`apiComplete` w 09).

## Baza API (`src/data/api.txt`)

Generowana przez `tools/api-db` z plików `ref/*.cs` repozytoriów **dotnet/wpf** i **dotnet/runtime** (gałąź main) —
to publiczne API zestawów, z którego korzysta kompilator. Format tekstowy, jedna linia na typ lub składową:

```
#System|System.Collections.Generic|…                       ← lista przestrzeni nazw
@TextBox|c|15||TextBoxBase|IAddChild|                      ← @typ|rodzaj|nr ns|parametry generyczne|baza|interfejsy|static
p|Text|string||                                            ← rodzaj|nazwa|typ|parametry|flagi (s=static, r=tylko odczyt, x=rozszerzenie)
m|Select|void|int start, int length|
```

Rodzaje: `c` klasa, `s` struktura, `i` interfejs, `e` wyliczenie, `d` delegat; składowe `p` właściwość, `m` metoda,
`f` pole, `e` zdarzenie, `c` wartość wyliczenia, `k` konstruktor, `i` indeksator.

Przy starcie `mergeApi()` (07) łączy tę bazę z ręcznymi opisami (dokumentacja PL/EN zostaje), ustala prawdziwą
hierarchię dziedziczenia, a metody `System.Linq.Enumerable` przenosi na `IEnumerable<T>`.
Pominięte są składowe oznaczone `EditorBrowsable(Never)` (VS też ich nie pokazuje) oraz typy wskaźnikowe/`Span`.

## Symulacja F5 (05 + `CS.transpile`)

`CS.transpile` tłumaczy pliki C# na jeden moduł JavaScript (typy proste, klasy, rekordy, właściwości, LINQ,
interpolacja, `async/await`, `try/catch` z filtrowaniem typu wyjątku). Kontrolki z XAML trafiają do kodu jako obiekty
proxy (`textBox1.Text = …` zmienia model i odświeża okno). Pętle mają licznik zabezpieczający przed zawieszeniem.

Ograniczenia (opisane też w *Pomoc → Co obsługuje symulacja*): pliki, sieć, bazy danych, pakiety NuGet, wiązanie
danych i tworzenie kontrolek w kodzie działają dopiero po kompilacji w Visual Studio (eksport .zip).

## Debuger (06 + `SEM.instrument`)

Przeglądarka nie potrafi zatrzymać wykonywanego JavaScriptu, więc debuger działa na **zapisie wykonania**:

1. Przy F5 (`startRun`) kod przechodzi przez `SEM.instrument` **przed** tłumaczeniem do JS. Parser z modułu 09 wstawia:
   - na początku każdej metody i lambdy `__E(id); try {` … `} catch (e) { __XE(e); throw e; } finally { __X(); }` — stos wywołań,
   - przed każdą instrukcją `__T(wiersz, idMeta, () => [zmienne w zasięgu])`.
2. Podczas obsługi zdarzenia `__T` zapisuje do śladu wiersz, stos i sformatowane wartości zmiennych (do 20 000 kroków).
3. Gdy w śladzie jest trafienie punktu przerwania, po zakończeniu obsługi zdarzenia IDE przechodzi w tryb przerwania:
   pokazuje wiersz, Zmienne lokalne i Stos wywołań. F10/F11/Shift+F11/F5 przesuwają się po śladzie
   (przekrocz = następny krok na tej samej lub mniejszej głębokości stosu, wyjdź = mniejszej, kontynuuj = następny punkt przerwania).
4. Nieobsłużony wyjątek: `__XE` zapisuje stos z wartościami zmiennych w obiekcie wyjątku; okno wyjątku ma przycisk *Przerwij*.

Ctrl+F5 uruchamia bez instrumentacji. Jeśli instrumentacja wyprodukuje niepoprawny kod, `startRun` po cichu wraca
do wersji bez debugera i pisze o tym w Danych wyjściowych.

## Języki interfejsu

Każdy tekst w kodzie: `L('po polsku', 'in English')`. Teksty statyczne w `body.html`: polski w treści, angielski
w atrybutach `data-en`, `data-en-title`, `data-en-placeholder`, `data-en-aria-label` (podmienia je `applyStatic` w 10).
Uwaga: nie nazywaj zmiennych lokalnych `L` — przesłonią funkcję tłumaczącą.

## Wersja desktopowa

`desktop/main.js` (Electron) wczytuje `dist/cappycoder-wpf.html`. Wyłącza domyślne menu Electrona (żeby F5, F9–F12,
Ctrl+R trafiały do IDE), otwiera linki w przeglądarce systemowej, pokazuje okno „Zapisz jako” przy pobieraniu .zip
i pamięta rozmiar okna. Pakowanie: `electron-builder`, konfiguracja w sekcji `build` w `package.json`.

## Testowanie zmian

- `npm run build` zatrzyma się z komunikatem, jeśli w module jest błąd składni.
- W konsoli przeglądarki: `__CC.SEM.check([{ name: 'MainWindow.xaml.cs', src }], { handlers: [] })` zwraca listę
  błędów, `__CC.IS.membersOf('List<int>')` — składowe z typami po podstawieniu.
- Scenariusze do ręcznego sprawdzenia po zmianach: przeciągnięcie kontrolki, dwuklik → procedura obsługi,
  błąd typu w C# (lista błędów), IntelliSense po kropce, F5 z punktem przerwania i krokowaniem, eksport .zip.
