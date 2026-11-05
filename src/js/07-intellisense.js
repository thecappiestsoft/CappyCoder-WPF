/**
 * CappyCoder WPF — 07 · IntelliSense
 *
 * Zadanie: Baza typów .NET 10 / WPF: opisy ręczne (PL/EN) połączone z pełnym API wygenerowanym z oficjalnych plików
 *   referencyjnych (src/data/api.txt), uzupełnianie kodu C# i XAML, podpowiedzi parametrów, opisy po najechaniu.
 * Zależy od: csharp.js, 01, 03
 * Udostępnia: IS (membersOf, typeInfo, exprType, attachCs, attachXaml, …)
 *
 * Moduły z src/js są sklejane (w kolejności numerów) w jedną funkcję — współdzielą zasięg.
 * Szczegóły: docs/ARCHITEKTURA.md
 */
const IS = (() => {
  /* ---------- baza typów .NET / WPF ----------
     wiersz: rodzaj|nazwa|parametry|typ zwracany|opis PL|opis EN   (rodzaj: p właściwość, m metoda, e zdarzenie, f pole, c stała/wartość) */
  const T = {};
  function def(name, base, spec, opts = {}) {
    const t = (T[name] = T[name] || {
      name,
      base,
      m: {},
      st: {},
      enumerable: opts.enumerable || null,
      isEnum: !!opts.isEnum,
      isStatic: !!opts.isStatic,
    });
    if (base) t.base = base;
    spec
      .trim()
      .split('\n')
      .forEach(l => {
        l = l.trim();
        if (!l) return;
        const [k, n, ps, rt, pl, en] = l.split('|');
        const stat = k.startsWith('s');
        const kind = stat ? k.slice(1) : k;
        const tab = stat || opts.isStatic || opts.isEnum ? t.st : t.m;
        const prev = tab[n];
        const sig = { params: ps, type: rt || '', doc: [pl || '', en || ''] };
        if (prev && kind === 'm') prev.sigs.push(sig);
        else tab[n] = { kind, name: n, type: rt || '', sigs: [sig], doc: [pl || '', en || ''] };
      });
    return t;
  }
  const D = s => s;
  def(
    'object',
    null,
    `
m|ToString||string|Zwraca tekstowy opis obiektu.|Returns a string that represents the object.
m|Equals|object obj|bool|Sprawdza, czy obiekty są równe.|Determines whether the objects are equal.
m|GetHashCode||int|Zwraca kod skrótu.|Returns a hash code.
m|GetType||Type|Zwraca typ obiektu.|Gets the runtime type.`,
  );
  def(
    'string',
    'object',
    `
p|Length||int|Liczba znaków w tekście.|Gets the number of characters.
m|Substring|int startIndex|string|Fragment od podanej pozycji do końca.|Substring from the index to the end.
m|Substring|int startIndex, int length|string|Fragment o podanej długości.|Substring of the given length.
m|ToUpper||string|Kopia tekstu wielkimi literami.|Copy in uppercase.
m|ToLower||string|Kopia tekstu małymi literami.|Copy in lowercase.
m|Trim||string|Usuwa białe znaki z początku i końca.|Removes leading and trailing white space.
m|TrimStart||string|Usuwa białe znaki z początku.|Removes leading white space.
m|TrimEnd||string|Usuwa białe znaki z końca.|Removes trailing white space.
m|Contains|string value|bool|Czy tekst zawiera podany fragment.|Whether the string contains the value.
m|StartsWith|string value|bool|Czy tekst zaczyna się od fragmentu.|Whether the string starts with the value.
m|EndsWith|string value|bool|Czy tekst kończy się fragmentem.|Whether the string ends with the value.
m|IndexOf|string value|int|Pozycja pierwszego wystąpienia albo -1.|Index of the first occurrence, or -1.
m|LastIndexOf|string value|int|Pozycja ostatniego wystąpienia albo -1.|Index of the last occurrence, or -1.
m|Replace|string oldValue, string newValue|string|Zamienia wszystkie wystąpienia fragmentu.|Replaces all occurrences.
m|Split|char separator|string[]|Dzieli tekst na części.|Splits the string into parts.
m|Split|char separator, StringSplitOptions options|string[]|Dzieli tekst; RemoveEmptyEntries pomija puste części.|Splits; RemoveEmptyEntries skips empty parts.
m|Insert|int startIndex, string value|string|Wstawia tekst na pozycji.|Inserts a string at the index.
m|Remove|int startIndex, int count|string|Usuwa znaki od pozycji.|Removes characters from the index.
m|PadLeft|int totalWidth, char paddingChar|string|Dopełnia z lewej do długości.|Pads on the left to the width.
m|PadRight|int totalWidth, char paddingChar|string|Dopełnia z prawej do długości.|Pads on the right to the width.
m|ToCharArray||char[]|Tablica znaków tekstu.|Copies the characters into an array.
m|CompareTo|string strB|int|Porównuje alfabetycznie (-1, 0, 1).|Compares alphabetically (-1, 0, 1).
m|Equals|string value|bool|Czy teksty są równe.|Whether the strings are equal.
sm|IsNullOrEmpty|string value|bool|Czy tekst jest null albo pusty.|Whether the string is null or empty.
sm|IsNullOrWhiteSpace|string value|bool|Czy tekst jest null, pusty albo ma tylko spacje.|Whether the string is null, empty or white space.
sm|Join|string separator, IEnumerable<string> values|string|Łączy elementy separatorem.|Joins the elements with a separator.
sm|Format|string format, params object[] args|string|Wstawia wartości w miejsca {0}, {1}…|Replaces {0}, {1}… with the values.
sm|Concat|params object[] args|string|Skleja wartości w jeden tekst.|Concatenates the values.
sm|Compare|string strA, string strB|int|Porównuje dwa teksty.|Compares two strings.
sf|Empty||string|Pusty tekst "".|The empty string "".`,
    { enumerable: 'char' },
  );
  const NUMDOC = `
m|ToString|string format|string|Tekst w podanym formacie, np. "F2", "N0", "C".|String in a format such as "F2", "N0", "C".
m|CompareTo|object value|int|Porównuje z wartością (-1, 0, 1).|Compares with the value (-1, 0, 1).`;
  def(
    'int',
    'object',
    NUMDOC +
      `
sm|Parse|string s|int|Zamienia tekst na liczbę całkowitą; zły tekst rzuca FormatException.|Converts text to an int; invalid text throws FormatException.
sm|TryParse|string s, out int result|bool|Próbuje zamienić tekst; zwraca false przy błędzie.|Tries to convert text; returns false on failure.
sf|MaxValue||int|Największa wartość int (2 147 483 647).|Largest int value (2,147,483,647).
sf|MinValue||int|Najmniejsza wartość int.|Smallest int value.`,
  );
  def(
    'double',
    'object',
    NUMDOC +
      `
sm|Parse|string s|double|Zamienia tekst na liczbę.|Converts text to a double.
sm|TryParse|string s, out double result|bool|Próbuje zamienić tekst; zwraca false przy błędzie.|Tries to convert text; returns false on failure.
sm|IsNaN|double d|bool|Czy wartość to NaN.|Whether the value is NaN.
sf|NaN||double|Wartość „nie liczba”.|Not a number.
sf|PositiveInfinity||double|Plus nieskończoność.|Positive infinity.
sf|MaxValue||double|Największa wartość double.|Largest double value.
sf|MinValue||double|Najmniejsza wartość double.|Smallest double value.`,
  );
  T.decimal = Object.assign({}, T.double, { name: 'decimal' });
  T.float = Object.assign({}, T.double, { name: 'float' });
  T.long = Object.assign({}, T.int, { name: 'long' });
  def(
    'bool',
    'object',
    `
sm|Parse|string value|bool|Zamienia "True"/"False" na bool.|Converts "True"/"False" to bool.
sm|TryParse|string value, out bool result|bool|Próbuje zamienić tekst na bool.|Tries to convert text to bool.`,
  );
  def(
    'char',
    'object',
    `
sm|IsDigit|char c|bool|Czy znak jest cyfrą.|Whether the character is a digit.
sm|IsLetter|char c|bool|Czy znak jest literą.|Whether the character is a letter.
sm|IsLetterOrDigit|char c|bool|Czy znak jest literą lub cyfrą.|Whether it is a letter or digit.
sm|IsUpper|char c|bool|Czy znak jest wielką literą.|Whether it is uppercase.
sm|IsLower|char c|bool|Czy znak jest małą literą.|Whether it is lowercase.
sm|IsWhiteSpace|char c|bool|Czy znak jest biały (spacja, tab).|Whether it is white space.
sm|ToUpper|char c|char|Znak jako wielka litera.|Converts to uppercase.
sm|ToLower|char c|char|Znak jako mała litera.|Converts to lowercase.`,
  );
  const LINQ = `
m|Where|Func<T, bool> predicate|IEnumerable<T>|Elementy spełniające warunek.|Filters elements by a condition.
m|Select|Func<T, TResult> selector|IEnumerable<TResult>|Przekształca każdy element.|Projects each element.
m|OrderBy|Func<T, TKey> keySelector|IEnumerable<T>|Sortuje rosnąco.|Sorts ascending.
m|OrderByDescending|Func<T, TKey> keySelector|IEnumerable<T>|Sortuje malejąco.|Sorts descending.
m|First||T|Pierwszy element (wyjątek, gdy brak).|First element (throws if none).
m|First|Func<T, bool> predicate|T|Pierwszy pasujący element.|First matching element.
m|FirstOrDefault||T|Pierwszy element albo wartość domyślna.|First element or default.
m|FirstOrDefault|Func<T, bool> predicate|T|Pierwszy pasujący albo domyślny.|First match or default.
m|Last||T|Ostatni element.|Last element.
m|LastOrDefault||T|Ostatni element albo domyślny.|Last element or default.
m|Any||bool|Czy kolekcja ma jakikolwiek element.|Whether the sequence has any elements.
m|Any|Func<T, bool> predicate|bool|Czy któryś element spełnia warunek.|Whether any element matches.
m|All|Func<T, bool> predicate|bool|Czy wszystkie elementy spełniają warunek.|Whether all elements match.
m|Count||int|Liczba elementów.|Number of elements.
m|Count|Func<T, bool> predicate|int|Liczba elementów spełniających warunek.|Number of matching elements.
m|Sum||T|Suma elementów.|Sum of the elements.
m|Sum|Func<T, double> selector|double|Suma wybranych wartości.|Sum of the selected values.
m|Average||double|Średnia elementów.|Average of the elements.
m|Average|Func<T, double> selector|double|Średnia wybranych wartości.|Average of the selected values.
m|Min||T|Najmniejszy element.|Minimum element.
m|Max||T|Największy element.|Maximum element.
m|Distinct||IEnumerable<T>|Elementy bez powtórzeń.|Distinct elements.
m|Take|int count|IEnumerable<T>|Pierwsze n elementów.|First n elements.
m|Skip|int count|IEnumerable<T>|Pomija n elementów.|Skips n elements.
m|Reverse||IEnumerable<T>|Odwrotna kolejność.|Reversed order.
m|Contains|T value|bool|Czy kolekcja zawiera element.|Whether the sequence contains the value.
m|ElementAt|int index|T|Element o podanym indeksie.|Element at the index.
m|ToList||List<T>|Kopia jako List<T>.|Copies into a List<T>.
m|ToArray||T[]|Kopia jako tablica.|Copies into an array.
m|GroupBy|Func<T, TKey> keySelector|IEnumerable<IGrouping<TKey, T>>|Grupuje elementy według klucza.|Groups elements by key.`;
  def('IEnumerable', 'object', LINQ, { enumerable: 'T' });
  def(
    'List',
    'IEnumerable',
    `
p|Count||int|Liczba elementów listy.|Number of elements.
p|Capacity||int|Pojemność wewnętrzna.|Internal capacity.
m|Add|T item|void|Dodaje element na koniec.|Adds an item to the end.
m|AddRange|IEnumerable<T> collection|void|Dodaje wiele elementów.|Adds several items.
m|Insert|int index, T item|void|Wstawia element na pozycję.|Inserts an item at the index.
m|Remove|T item|bool|Usuwa pierwsze wystąpienie elementu.|Removes the first occurrence.
m|RemoveAt|int index|void|Usuwa element o indeksie.|Removes the item at the index.
m|RemoveAll|Predicate<T> match|int|Usuwa elementy spełniające warunek.|Removes all matching items.
m|Clear||void|Usuwa wszystkie elementy.|Removes all items.
m|Contains|T item|bool|Czy lista zawiera element.|Whether the list contains the item.
m|IndexOf|T item|int|Indeks elementu albo -1.|Index of the item, or -1.
m|Sort||void|Sortuje listę rosnąco.|Sorts the list.
m|Reverse||void|Odwraca kolejność.|Reverses the order.
m|Find|Predicate<T> match|T|Pierwszy element spełniający warunek.|First item that matches.
m|FindAll|Predicate<T> match|List<T>|Wszystkie elementy spełniające warunek.|All matching items.
m|FindIndex|Predicate<T> match|int|Indeks pierwszego pasującego.|Index of the first match.
m|Exists|Predicate<T> match|bool|Czy istnieje pasujący element.|Whether a match exists.
m|ForEach|Action<T> action|void|Wykonuje akcję dla każdego elementu.|Runs an action for each item.`,
    { enumerable: 'T' },
  );
  def(
    'Array',
    'IEnumerable',
    `
p|Length||int|Liczba elementów tablicy.|Number of elements.`,
    { enumerable: 'T' },
  );
  def(
    'Dictionary',
    'IEnumerable',
    `
p|Count||int|Liczba par klucz–wartość.|Number of key/value pairs.
p|Keys||KeyCollection<K>|Kolekcja kluczy.|The keys.
p|Values||ValueCollection<V>|Kolekcja wartości.|The values.
m|Add|K key, V value|void|Dodaje parę (wyjątek, gdy klucz istnieje).|Adds a pair (throws if the key exists).
m|TryAdd|K key, V value|bool|Dodaje parę, jeśli klucza nie ma.|Adds the pair if the key is new.
m|ContainsKey|K key|bool|Czy słownik ma klucz.|Whether the key exists.
m|ContainsValue|V value|bool|Czy słownik ma wartość.|Whether the value exists.
m|Remove|K key|bool|Usuwa parę o kluczu.|Removes the pair with the key.
m|TryGetValue|K key, out V value|bool|Pobiera wartość, jeśli klucz istnieje.|Gets the value if the key exists.
m|Clear||void|Usuwa wszystkie pary.|Removes all pairs.`,
    { enumerable: 'KeyValuePair<K, V>' },
  );
  def(
    'KeyValuePair',
    'object',
    `
p|Key||K|Klucz.|The key.
p|Value||V|Wartość.|The value.`,
  );
  def('KeyCollection', 'IEnumerable', `p|Count||int|Liczba kluczy.|Number of keys.`, { enumerable: 'K' });
  def('ValueCollection', 'IEnumerable', `p|Count||int|Liczba wartości.|Number of values.`, { enumerable: 'V' });
  def(
    'HashSet',
    'IEnumerable',
    `
p|Count||int|Liczba elementów.|Number of elements.
m|Add|T item|bool|Dodaje element (false, gdy już jest).|Adds the item (false if present).
m|Remove|T item|bool|Usuwa element.|Removes the item.
m|Contains|T item|bool|Czy zbiór zawiera element.|Whether the set contains the item.
m|Clear||void|Usuwa wszystkie elementy.|Removes all items.`,
    { enumerable: 'T' },
  );
  def(
    'Queue',
    'IEnumerable',
    `
p|Count||int|Liczba elementów.|Number of elements.
m|Enqueue|T item|void|Dodaje element na koniec kolejki.|Adds to the end of the queue.
m|Dequeue||T|Zdejmuje element z początku.|Removes and returns the first item.
m|Peek||T|Podgląda pierwszy element.|Returns the first item without removing it.
m|Clear||void|Czyści kolejkę.|Clears the queue.`,
    { enumerable: 'T' },
  );
  def(
    'Stack',
    'IEnumerable',
    `
p|Count||int|Liczba elementów.|Number of elements.
m|Push|T item|void|Kładzie element na stos.|Pushes an item.
m|Pop||T|Zdejmuje element ze szczytu.|Removes and returns the top item.
m|Peek||T|Podgląda szczyt stosu.|Returns the top item without removing it.
m|Clear||void|Czyści stos.|Clears the stack.`,
    { enumerable: 'T' },
  );
  def(
    'DateTime',
    'object',
    `
p|Year||int|Rok.|The year.
p|Month||int|Miesiąc (1–12).|The month (1–12).
p|Day||int|Dzień miesiąca.|Day of the month.
p|Hour||int|Godzina (0–23).|The hour (0–23).
p|Minute||int|Minuta.|The minute.
p|Second||int|Sekunda.|The second.
p|Millisecond||int|Milisekunda.|The millisecond.
p|DayOfWeek||DayOfWeek|Dzień tygodnia.|Day of the week.
p|DayOfYear||int|Dzień roku (1–366).|Day of the year.
p|Date||DateTime|Sama data (godzina 00:00).|The date part (time 00:00).
m|AddDays|double value|DateTime|Data przesunięta o dni.|Adds days.
m|AddHours|double value|DateTime|Data przesunięta o godziny.|Adds hours.
m|AddMinutes|double value|DateTime|Data przesunięta o minuty.|Adds minutes.
m|AddSeconds|double value|DateTime|Data przesunięta o sekundy.|Adds seconds.
m|AddMonths|int months|DateTime|Data przesunięta o miesiące.|Adds months.
m|AddYears|int value|DateTime|Data przesunięta o lata.|Adds years.
m|Subtract|DateTime value|TimeSpan|Różnica między datami.|Difference between dates.
m|ToString|string format|string|Tekst w formacie, np. "dd.MM.yyyy HH:mm".|String in a format such as "dd.MM.yyyy HH:mm".
m|ToShortDateString||string|Krótka data.|Short date string.
m|ToLongDateString||string|Długa data.|Long date string.
m|ToShortTimeString||string|Krótka godzina.|Short time string.
sp|Now||DateTime|Bieżąca data i godzina.|The current date and time.
sp|Today||DateTime|Dzisiejsza data.|Today's date.
sm|Parse|string s|DateTime|Zamienia tekst na datę.|Converts text to a date.
sm|IsLeapYear|int year|bool|Czy rok jest przestępny.|Whether the year is a leap year.
sm|DaysInMonth|int year, int month|int|Liczba dni w miesiącu.|Number of days in the month.`,
  );
  def(
    'TimeSpan',
    'object',
    `
p|TotalMilliseconds||double|Łączny czas w milisekundach.|Total milliseconds.
p|TotalSeconds||double|Łączny czas w sekundach.|Total seconds.
p|TotalMinutes||double|Łączny czas w minutach.|Total minutes.
p|TotalHours||double|Łączny czas w godzinach.|Total hours.
p|TotalDays||double|Łączny czas w dniach.|Total days.
p|Days||int|Część: dni.|Days component.
p|Hours||int|Część: godziny.|Hours component.
p|Minutes||int|Część: minuty.|Minutes component.
p|Seconds||int|Część: sekundy.|Seconds component.
p|Milliseconds||int|Część: milisekundy.|Milliseconds component.
m|Add|TimeSpan ts|TimeSpan|Suma czasów.|Adds a time span.
m|ToString|string format|string|Tekst w formacie, np. @"mm\\:ss".|String in a format such as @"mm\\:ss".
sm|FromMilliseconds|double value|TimeSpan|Czas z milisekund.|Time span from milliseconds.
sm|FromSeconds|double value|TimeSpan|Czas z sekund.|Time span from seconds.
sm|FromMinutes|double value|TimeSpan|Czas z minut.|Time span from minutes.
sm|FromHours|double value|TimeSpan|Czas z godzin.|Time span from hours.
sm|FromDays|double value|TimeSpan|Czas z dni.|Time span from days.
sp|Zero||TimeSpan|Zerowy odcinek czasu.|A zero time span.`,
  );
  def(
    'Random',
    'object',
    `
m|Next||int|Losowa nieujemna liczba całkowita.|A non-negative random int.
m|Next|int maxValue|int|Losowa liczba od 0 do maxValue - 1.|Random int from 0 to maxValue - 1.
m|Next|int minValue, int maxValue|int|Losowa liczba od minValue do maxValue - 1.|Random int from minValue to maxValue - 1.
m|NextDouble||double|Losowa liczba z przedziału [0, 1).|Random double in [0, 1).
sp|Shared||Random|Wspólny generator liczb losowych.|A shared random generator.`,
  );
  def(
    'DispatcherTimer',
    'object',
    `
p|Interval||TimeSpan|Odstęp między zdarzeniami Tick.|Time between Tick events.
p|IsEnabled||bool|Czy zegar działa.|Whether the timer is running.
p|Tag||object|Dowolne dane użytkownika.|Any user data.
m|Start||void|Uruchamia zegar.|Starts the timer.
m|Stop||void|Zatrzymuje zegar.|Stops the timer.
e|Tick||EventArgs|Wywoływane co Interval.|Occurs every Interval.`,
  );
  def(
    'Stopwatch',
    'object',
    `
p|Elapsed||TimeSpan|Zmierzony czas.|Elapsed time.
p|ElapsedMilliseconds||long|Zmierzony czas w ms.|Elapsed milliseconds.
p|IsRunning||bool|Czy pomiar trwa.|Whether it is running.
m|Start||void|Rozpoczyna pomiar.|Starts measuring.
m|Stop||void|Zatrzymuje pomiar.|Stops measuring.
m|Reset||void|Zeruje pomiar.|Resets the time.
m|Restart||void|Zeruje i uruchamia.|Resets and starts.
sm|StartNew||Stopwatch|Tworzy i uruchamia stoper.|Creates and starts a stopwatch.`,
  );
  def(
    'ItemCollection',
    'IEnumerable',
    `
p|Count||int|Liczba elementów.|Number of items.
m|Add|object newItem|int|Dodaje element na koniec listy.|Adds an item to the end.
m|Insert|int insertIndex, object insertItem|void|Wstawia element na pozycję.|Inserts an item at the index.
m|Remove|object removeItem|void|Usuwa element.|Removes the item.
m|RemoveAt|int removeIndex|void|Usuwa element o indeksie.|Removes the item at the index.
m|Clear||void|Usuwa wszystkie elementy.|Removes all items.
m|Contains|object containItem|bool|Czy lista zawiera element.|Whether the item is in the list.
m|IndexOf|object item|int|Indeks elementu.|Index of the item.
m|Refresh||void|Odświeża widok elementów.|Refreshes the view.`,
    { enumerable: 'object' },
  );
  def(
    'UIElementCollection',
    'IEnumerable',
    `
p|Count||int|Liczba elementów podrzędnych.|Number of children.
m|Add|UIElement element|int|Dodaje kontrolkę.|Adds a child element.
m|Remove|UIElement element|void|Usuwa kontrolkę.|Removes a child element.
m|Clear||void|Usuwa wszystkie kontrolki.|Removes all children.`,
    { enumerable: 'UIElement' },
  );
  def(
    'Thickness',
    'object',
    `
p|Left||double|Lewa krawędź.|Left edge.
p|Top||double|Górna krawędź.|Top edge.
p|Right||double|Prawa krawędź.|Right edge.
p|Bottom||double|Dolna krawędź.|Bottom edge.`,
  );
  def(
    'Point',
    'object',
    `
p|X||double|Współrzędna X.|The X coordinate.
p|Y||double|Współrzędna Y.|The Y coordinate.`,
  );
  def('Brush', 'object', `p|Opacity||double|Przezroczystość pędzla (0–1).|Brush opacity (0–1).`);
  def('SolidColorBrush', 'Brush', `p|Color||Color|Kolor pędzla.|The brush color.`);
  def(
    'Color',
    'object',
    `
p|R||byte|Składowa czerwona.|Red component.
p|G||byte|Składowa zielona.|Green component.
p|B||byte|Składowa niebieska.|Blue component.
p|A||byte|Kanał alfa.|Alpha channel.
sm|FromRgb|byte r, byte g, byte b|Color|Kolor ze składowych RGB.|Color from RGB components.
sm|FromArgb|byte a, byte r, byte g, byte b|Color|Kolor ze składowych ARGB.|Color from ARGB components.`,
  );
  def(
    'Exception',
    'object',
    `
p|Message||string|Opis błędu.|The error message.
p|StackTrace||string|Ślad stosu wywołań.|The call stack trace.
p|InnerException||Exception|Wyjątek wewnętrzny.|The inner exception.`,
  );
  def(
    'Task',
    'object',
    `
sm|Delay|int millisecondsDelay|Task|Czeka bez blokowania okna (użyj z await).|Waits without blocking the window (use with await).
sm|Run|Action action|Task|Uruchamia kod w tle.|Runs code in the background.
sp|CompletedTask||Task|Zakończone zadanie.|A completed task.`,
  );
  // argumenty zdarzeń
  def('EventArgs', 'object', ``);
  def(
    'RoutedEventArgs',
    'EventArgs',
    `
p|Handled||bool|Ustaw true, aby zatrzymać dalsze przekazywanie zdarzenia.|Set true to stop the event from routing further.
p|Source||object|Element, który zgłosił zdarzenie.|The element that raised the event.
p|OriginalSource||object|Pierwotne źródło zdarzenia.|The original source.`,
  );
  def(
    'MouseEventArgs',
    'RoutedEventArgs',
    `
p|LeftButton||MouseButtonState|Stan lewego przycisku.|Left button state.
p|RightButton||MouseButtonState|Stan prawego przycisku.|Right button state.
m|GetPosition|IInputElement relativeTo|Point|Pozycja myszy względem elementu.|Mouse position relative to the element.`,
  );
  def(
    'MouseButtonEventArgs',
    'MouseEventArgs',
    `
p|ChangedButton||MouseButton|Który przycisk zmienił stan.|The button that changed.
p|ClickCount||int|Liczba kliknięć (2 = dwuklik).|Number of clicks (2 = double click).`,
  );
  def(
    'MouseWheelEventArgs',
    'MouseEventArgs',
    `p|Delta||int|Obrót kółka (120 na krok).|Wheel rotation (120 per notch).`,
  );
  def(
    'KeyEventArgs',
    'RoutedEventArgs',
    `
p|Key||Key|Naciśnięty klawisz.|The key pressed.
p|IsRepeat||bool|Czy klawisz jest przytrzymany.|Whether the key is repeating.
p|SystemKey||Key|Klawisz systemowy (np. z Alt).|The system key (for example with Alt).
p|KeyboardDevice||KeyboardDevice|Stan klawiatury.|The keyboard state.`,
  );
  def(
    'TextChangedEventArgs',
    'RoutedEventArgs',
    `p|Changes||ICollection<TextChange>|Lista zmian tekstu.|The text changes.`,
  );
  def('TextCompositionEventArgs', 'RoutedEventArgs', `p|Text||string|Wpisywany tekst.|The typed text.`);
  def(
    'SelectionChangedEventArgs',
    'RoutedEventArgs',
    `
p|AddedItems||IList|Nowo zaznaczone elementy.|Items that were selected.
p|RemovedItems||IList|Odznaczone elementy.|Items that were unselected.`,
  );
  def(
    'RoutedPropertyChangedEventArgs',
    'RoutedEventArgs',
    `
p|OldValue||T|Poprzednia wartość.|The old value.
p|NewValue||T|Nowa wartość.|The new value.`,
  );
  def(
    'CancelEventArgs',
    'EventArgs',
    `p|Cancel||bool|Ustaw true, aby anulować (np. zamknięcie okna).|Set true to cancel (for example closing the window).`,
  );
  def(
    'SizeChangedEventArgs',
    'RoutedEventArgs',
    `
p|NewSize||Size|Nowy rozmiar.|The new size.
p|PreviousSize||Size|Poprzedni rozmiar.|The previous size.`,
  );
  def(
    'Size',
    'object',
    `
p|Width||double|Szerokość.|The width.
p|Height||double|Wysokość.|The height.`,
  );
  T['System.ComponentModel.CancelEventArgs'] = T.CancelEventArgs;
  // statyczne klasy pomocnicze
  def(
    'Math',
    null,
    `
m|Abs|double value|double|Wartość bezwzględna.|Absolute value.
m|Sqrt|double d|double|Pierwiastek kwadratowy.|Square root.
m|Pow|double x, double y|double|Potęga x do y.|x raised to the power y.
m|Round|double value|double|Zaokrąglenie do całości (połówki do parzystej).|Rounds to an integer (halves to even).
m|Round|double value, int digits|double|Zaokrąglenie do miejsc po przecinku.|Rounds to the given decimals.
m|Round|double value, int digits, MidpointRounding mode|double|Zaokrąglenie z trybem, np. AwayFromZero.|Rounds with a mode such as AwayFromZero.
m|Floor|double d|double|Zaokrąglenie w dół.|Rounds down.
m|Ceiling|double a|double|Zaokrąglenie w górę.|Rounds up.
m|Truncate|double d|double|Obcina część ułamkową.|Drops the fraction.
m|Max|double val1, double val2|double|Większa z liczb.|The larger value.
m|Min|double val1, double val2|double|Mniejsza z liczb.|The smaller value.
m|Clamp|double value, double min, double max|double|Ogranicza wartość do przedziału.|Limits the value to a range.
m|Sign|double value|int|Znak liczby: -1, 0 lub 1.|Sign: -1, 0 or 1.
m|Sin|double a|double|Sinus (radiany).|Sine (radians).
m|Cos|double d|double|Cosinus (radiany).|Cosine (radians).
m|Tan|double a|double|Tangens (radiany).|Tangent (radians).
m|Atan2|double y, double x|double|Kąt wektora (radiany).|Angle of a vector (radians).
m|Log|double d|double|Logarytm naturalny.|Natural logarithm.
m|Log10|double d|double|Logarytm dziesiętny.|Base-10 logarithm.
m|Exp|double d|double|e do potęgi.|e raised to the power.
f|PI||double|Liczba π ≈ 3,14159.|π ≈ 3.14159.
f|E||double|Liczba e ≈ 2,71828.|e ≈ 2.71828.`,
    { isStatic: true },
  );
  def(
    'Convert',
    null,
    `
m|ToInt32|object value|int|Zamienia na int (zaokrągla liczby).|Converts to int (rounds numbers).
m|ToDouble|object value|double|Zamienia na double.|Converts to double.
m|ToDecimal|object value|decimal|Zamienia na decimal.|Converts to decimal.
m|ToString|object value|string|Zamienia na tekst.|Converts to string.
m|ToBoolean|object value|bool|Zamienia na bool.|Converts to bool.
m|ToChar|object value|char|Zamienia na znak.|Converts to char.`,
    { isStatic: true },
  );
  def(
    'MessageBox',
    null,
    `
m|Show|string messageBoxText|MessageBoxResult|Okno z komunikatem.|Shows a message box.
m|Show|string messageBoxText, string caption|MessageBoxResult|Komunikat z tytułem okna.|Message with a window title.
m|Show|string messageBoxText, string caption, MessageBoxButton button|MessageBoxResult|Komunikat z przyciskami (np. YesNo).|Message with buttons (for example YesNo).
m|Show|string messageBoxText, string caption, MessageBoxButton button, MessageBoxImage icon|MessageBoxResult|Komunikat z przyciskami i ikoną.|Message with buttons and an icon.`,
    { isStatic: true },
  );
  def(
    'Canvas',
    null,
    `
m|SetLeft|UIElement element, double length|void|Ustawia odległość od lewej krawędzi Canvas.|Sets the distance from the Canvas left edge.
m|SetTop|UIElement element, double length|void|Ustawia odległość od górnej krawędzi Canvas.|Sets the distance from the Canvas top edge.
m|GetLeft|UIElement element|double|Odczytuje Canvas.Left.|Gets Canvas.Left.
m|GetTop|UIElement element|double|Odczytuje Canvas.Top.|Gets Canvas.Top.
m|SetZIndex|UIElement element, int value|void|Kolejność rysowania (wyżej = na wierzchu).|Drawing order (higher = on top).`,
    { isStatic: true },
  );
  def(
    'Grid',
    null,
    `
m|SetRow|UIElement element, int value|void|Ustawia wiersz siatki.|Sets the grid row.
m|SetColumn|UIElement element, int value|void|Ustawia kolumnę siatki.|Sets the grid column.`,
    { isStatic: true },
  );
  def('Panel', null, `m|SetZIndex|UIElement element, int value|void|Kolejność rysowania.|Drawing order.`, {
    isStatic: true,
  });
  def(
    'Keyboard',
    null,
    `
m|IsKeyDown|Key key|bool|Czy klawisz jest wciśnięty.|Whether the key is down.
m|IsKeyUp|Key key|bool|Czy klawisz jest puszczony.|Whether the key is up.
p|Modifiers||ModifierKeys|Wciśnięte klawisze Ctrl/Shift/Alt.|Pressed Ctrl/Shift/Alt keys.`,
    { isStatic: true },
  );
  def('Mouse', null, `m|GetPosition|IInputElement relativeTo|Point|Pozycja myszy.|Mouse position.`, { isStatic: true });
  def(
    'Application',
    null,
    `p|Current||App|Bieżąca aplikacja (np. Current.Shutdown()).|The current application (for example Current.Shutdown()).`,
    { isStatic: true },
  );
  def(
    'App',
    'object',
    `
m|Shutdown||void|Zamyka aplikację.|Shuts down the application.
p|MainWindow||Window|Główne okno.|The main window.`,
  );
  def(
    'Console',
    null,
    `
m|WriteLine|string value|void|Wypisuje tekst w oknie Dane wyjściowe.|Writes text to the Output window.
m|Write|string value|void|Wypisuje tekst bez nowego wiersza.|Writes text without a new line.`,
    { isStatic: true },
  );
  T.Debug = Object.assign({}, T.Console, { name: 'Debug' });
  def(
    'Enumerable',
    null,
    `
m|Range|int start, int count|IEnumerable<int>|Kolejne liczby od start.|Consecutive numbers from start.
m|Repeat|T element, int count|IEnumerable<T>|Powtórzony element.|A repeated element.`,
    { isStatic: true },
  );
  def(
    'Environment',
    null,
    `
p|NewLine||string|Znak nowego wiersza.|The newline string.
p|TickCount||int|Milisekundy od startu systemu.|Milliseconds since system start.
m|Exit|int exitCode|void|Kończy program.|Ends the program.`,
    { isStatic: true },
  );
  def(
    'Thread',
    null,
    `m|Sleep|int millisecondsTimeout|void|Wstrzymuje wątek (blokuje okno — lepiej await Task.Delay).|Pauses the thread (blocks the window; prefer await Task.Delay).`,
    { isStatic: true },
  );
  def(
    'Clipboard',
    null,
    `
m|SetText|string text|void|Kopiuje tekst do schowka.|Copies text to the clipboard.
m|GetText||string|Tekst ze schowka.|Text from the clipboard.`,
    { isStatic: true },
  );
  // wyliczenia
  const ENUMS = {
    Visibility: 'Visible Hidden Collapsed',
    HorizontalAlignment: 'Left Center Right Stretch',
    VerticalAlignment: 'Top Center Bottom Stretch',
    Orientation: 'Horizontal Vertical',
    TextWrapping: 'NoWrap Wrap WrapWithOverflow',
    TextAlignment: 'Left Right Center Justify',
    Stretch: 'None Fill Uniform UniformToFill',
    SelectionMode: 'Single Multiple Extended',
    MessageBoxButton: 'OK OKCancel YesNo YesNoCancel',
    MessageBoxImage: 'None Information Warning Error Question Asterisk Exclamation Hand Stop',
    MessageBoxResult: 'None OK Cancel Yes No',
    ModifierKeys: 'None Alt Control Shift Windows',
    MouseButton: 'Left Middle Right XButton1 XButton2',
    MouseButtonState: 'Pressed Released',
    StringSplitOptions: 'None RemoveEmptyEntries TrimEntries',
    MidpointRounding: 'ToEven AwayFromZero ToZero',
    DayOfWeek: 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday',
    WindowState: 'Normal Minimized Maximized',
    ResizeMode: 'NoResize CanMinimize CanResize CanResizeWithGrip',
    Dock: 'Left Top Right Bottom',
    WindowStyle: 'None SingleBorderWindow ThreeDBorderWindow ToolWindow',
    ScrollBarVisibility: 'Disabled Auto Hidden Visible',
    TextTrimming: 'None CharacterEllipsis WordEllipsis',
    FontWeights: 'Thin ExtraLight Light Normal Medium SemiBold Bold ExtraBold Black',
    FontStyles: 'Normal Italic Oblique',
    Cursors: 'Arrow Hand IBeam Wait Cross SizeAll SizeNS SizeWE No Help None AppStarting UpArrow',
    Key:
      [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].join(' ') +
      ' D0 D1 D2 D3 D4 D5 D6 D7 D8 D9 NumPad0 NumPad1 NumPad2 NumPad3 NumPad4 NumPad5 NumPad6 NumPad7 NumPad8 NumPad9 Enter Return Escape Space Tab Back Delete Insert Home End PageUp PageDown Left Right Up Down LeftShift RightShift LeftCtrl RightCtrl LeftAlt RightAlt F1 F2 F3 F4 F5 F6 F7 F8 F9 F10 F11 F12 Add Subtract Multiply Divide OemPlus OemMinus OemComma OemPeriod CapsLock',
    DispatcherPriority: 'Normal Background Render Loaded Input Send',
  };
  for (const [e, vals] of Object.entries(ENUMS)) {
    const t = (T[e] = { name: e, m: {}, st: {}, isEnum: true });
    vals
      .split(' ')
      .forEach(
        v =>
          (t.st[v] = {
            kind: 'c',
            name: v,
            type: e.replace(/s$/, e === 'Cursors' ? '' : e === 'FontWeights' || e === 'FontStyles' ? '' : 's'),
            sigs: [{ params: '', type: e, doc: ['', ''] }],
            doc: ['', ''],
          }),
      );
  }
  T.FontWeights.st && Object.values(T.FontWeights.st).forEach(x => (x.type = 'FontWeight'));
  Object.values(T.FontStyles.st).forEach(x => (x.type = 'FontStyle'));
  Object.values(T.Cursors.st).forEach(x => (x.type = 'Cursor'));
  Object.values(T.Visibility.st).forEach(
    x =>
      (x.doc = {
        Visible: ['Element widoczny.', 'Element is shown.'],
        Hidden: ['Niewidoczny, ale zajmuje miejsce.', 'Invisible but still takes up space.'],
        Collapsed: ['Niewidoczny i nie zajmuje miejsca.', 'Invisible and takes up no space.'],
      }[x.name]),
  );
  T.Brushes = { name: 'Brushes', m: {}, st: {}, isEnum: true };
  T.Colors = { name: 'Colors', m: {}, st: {}, isEnum: true };
  NAMED.forEach(c => {
    T.Brushes.st[c] = {
      kind: 'p',
      name: c,
      type: 'SolidColorBrush',
      sigs: [{ params: '', type: 'SolidColorBrush', doc: ['', ''] }],
      doc: [`Pędzel w kolorze ${c}.`, `A ${c} brush.`],
      color: c,
    };
    T.Colors.st[c] = {
      kind: 'p',
      name: c,
      type: 'Color',
      sigs: [{ params: '', type: 'Color', doc: ['', ''] }],
      doc: ['', ''],
      color: c,
    };
  });
  // kontrolki WPF z przybornika
  const FE = def(
    'FrameworkElement',
    'object',
    `
p|Name||string|Nazwa elementu (x:Name).|The element name (x:Name).
p|Width||double|Szerokość (double.NaN = Auto).|Width (double.NaN = Auto).
p|Height||double|Wysokość (double.NaN = Auto).|Height (double.NaN = Auto).
p|ActualWidth||double|Rzeczywista szerokość po ułożeniu.|Rendered width.
p|ActualHeight||double|Rzeczywista wysokość po ułożeniu.|Rendered height.
p|Margin||Thickness|Margines zewnętrzny.|Outer margin.
p|Visibility||Visibility|Widoczność: Visible, Hidden albo Collapsed.|Visibility: Visible, Hidden or Collapsed.
p|IsEnabled||bool|Czy element reaguje na użytkownika.|Whether the element responds to the user.
p|Opacity||double|Przezroczystość (0–1).|Opacity (0–1).
p|ToolTip||object|Dymek z podpowiedzią.|The tooltip.
p|Tag||object|Dowolne dane powiązane z elementem.|Any data attached to the element.
p|Cursor||Cursor|Kursor myszy nad elementem.|Mouse cursor over the element.
p|DataContext||object|Źródło danych dla wiązań {Binding}.|Data source for {Binding}.
p|Parent||DependencyObject|Element nadrzędny.|The parent element.
p|IsMouseOver||bool|Czy mysz jest nad elementem.|Whether the mouse is over the element.
p|IsFocused||bool|Czy element ma fokus.|Whether the element has focus.
p|HorizontalAlignment||HorizontalAlignment|Wyrównanie w poziomie.|Horizontal alignment.
p|VerticalAlignment||VerticalAlignment|Wyrównanie w pionie.|Vertical alignment.
m|Focus||bool|Ustawia fokus klawiatury na elemencie.|Sets keyboard focus to the element.
m|FindName|string name|object|Szuka elementu po nazwie.|Finds an element by name.`,
  );
  def(
    'Control',
    'FrameworkElement',
    `
p|Background||Brush|Tło, np. Brushes.LightBlue.|Background, for example Brushes.LightBlue.
p|Foreground||Brush|Kolor tekstu.|Text color.
p|BorderBrush||Brush|Kolor obramowania.|Border color.
p|BorderThickness||Thickness|Grubość obramowania.|Border thickness.
p|Padding||Thickness|Margines wewnętrzny.|Inner padding.
p|FontSize||double|Rozmiar czcionki.|Font size.
p|FontWeight||FontWeight|Grubość czcionki, np. FontWeights.Bold.|Font weight, for example FontWeights.Bold.
p|FontFamily||FontFamily|Krój pisma.|Font family.
p|FontStyle||FontStyle|Styl czcionki, np. FontStyles.Italic.|Font style, for example FontStyles.Italic.
p|TabIndex||int|Kolejność przechodzenia klawiszem Tab.|Tab order.`,
  );
  def(
    'Window',
    'Control',
    `
p|Title||string|Tytuł okna.|Window title.
p|Content||object|Zawartość okna.|Window content.
p|Left||double|Pozycja okna od lewej.|Window left position.
p|Top||double|Pozycja okna od góry.|Window top position.
p|WindowState||WindowState|Normal, Minimized albo Maximized.|Normal, Minimized or Maximized.
p|Topmost||bool|Czy okno jest zawsze na wierzchu.|Whether the window stays on top.
p|ResizeMode||ResizeMode|Czy można zmieniać rozmiar okna.|Whether the window can be resized.
m|Close||void|Zamyka okno.|Closes the window.
m|Show||void|Pokazuje okno.|Shows the window.
m|Hide||void|Ukrywa okno.|Hides the window.
m|Activate||bool|Przenosi okno na wierzch.|Brings the window to the front.
m|DragMove||void|Przeciąganie okna myszą (w MouseLeftButtonDown).|Drags the window with the mouse (in MouseLeftButtonDown).
e|Loaded||RoutedEventArgs|Okno zostało załadowane.|The window has loaded.
e|Closing||CancelEventArgs|Okno się zamyka (można anulować).|The window is closing (can be cancelled).
e|KeyDown||KeyEventArgs|Naciśnięto klawisz.|A key was pressed.`,
  );
  const PDOC = {
    Content: ['Zawartość kontrolki (zwykle tekst).', 'The control content (usually text).'],
    Text: ['Tekst kontrolki.', 'The control text.'],
    Header: ['Nagłówek.', 'The header.'],
    IsChecked: ['Czy pole jest zaznaczone (true, false albo null).', 'Whether it is checked (true, false or null).'],
    Items: ['Kolekcja elementów listy.', 'The list items.'],
    SelectedIndex: ['Indeks zaznaczonego elementu (-1 = brak).', 'Index of the selected item (-1 = none).'],
    SelectedItem: ['Zaznaczony element albo null.', 'The selected item, or null.'],
    Value: ['Bieżąca wartość.', 'The current value.'],
    Minimum: ['Wartość minimalna.', 'The minimum value.'],
    Maximum: ['Wartość maksymalna.', 'The maximum value.'],
    Password: ['Wpisane hasło.', 'The entered password.'],
    IsReadOnly: ['Tylko do odczytu.', 'Read-only.'],
    Source: ['Źródło obrazu lub multimediów.', 'Image or media source.'],
    ItemsSource: ['Kolekcja danych do wyświetlenia (np. List<T>).', 'Data collection to show (for example List<T>).'],
    SelectedDate: ['Wybrana data albo null.', 'The selected date, or null.'],
    IsExpanded: ['Czy rozwinięty.', 'Whether it is expanded.'],
    Fill: ['Wypełnienie kształtu.', 'Shape fill.'],
    Stroke: ['Kolor obrysu.', 'Outline color.'],
    Children: ['Kontrolki wewnątrz panelu.', 'Child elements of the panel.'],
    IsIndeterminate: ['Animacja „trwa…” bez wartości.', 'Shows ongoing progress without a value.'],
    MaxLength: ['Maksymalna liczba znaków.', 'Maximum number of characters.'],
  };
  const ptypeToCs = (t, k) => {
    const pt = ptype(t, k);
    const fixed = {
      Content: 'object',
      Header: 'object',
      ToolTip: 'object',
      Tag: 'object',
      IsChecked: 'bool?',
      SelectedIndex: 'int',
      TabIndex: 'int',
      MaxLength: 'int',
      Rows: 'int',
      FirstColumn: 'int',
      SelectedDate: 'DateTime?',
      DisplayDate: 'DateTime',
      Source: t === 'MediaElement' ? 'Uri' : 'ImageSource',
      Points: 'PointCollection',
      CornerRadius: 'CornerRadius',
      FontFamily: 'FontFamily',
      Cursor: 'Cursor',
      FontWeight: 'FontWeight',
      FontStyle: 'FontStyle',
      Columns: t === 'UniformGrid' ? 'int' : 'ObservableCollection<DataGridColumn>',
      VerticalScrollBarVisibility: 'ScrollBarVisibility',
      HorizontalScrollBarVisibility: 'ScrollBarVisibility',
      Interval: 'int',
      Delay: 'int',
      Band: 'int',
      BandIndex: 'int',
      PasswordChar: 'char',
      Target: 'UIElement',
      StrokeDashArray: 'DoubleCollection',
      TabStripPlacement: 'Dock',
      TextDecorations: 'TextDecorationCollection',
      HorizontalContentAlignment: 'HorizontalAlignment',
      VerticalContentAlignment: 'VerticalAlignment',
      FirstDayOfWeek: 'DayOfWeek',
      SelectedDateFormat: 'DatePickerFormat',
      EditingMode: 'InkCanvasEditingMode',
      LoadedBehavior: 'MediaState',
      GridLinesVisibility: 'DataGridGridLinesVisibility',
      SelectionMode:
        t === 'DataGrid' ? 'DataGridSelectionMode' : t === 'Calendar' ? 'CalendarSelectionMode' : 'SelectionMode',
      ExpandDirection: 'ExpandDirection',
      TickPlacement: 'TickPlacement',
      CharacterCasing: 'CharacterCasing',
      ClickMode: 'ClickMode',
      StretchDirection: 'StretchDirection',
      MaxLength: 'int',
      Volume: 'double',
    };
    if (fixed[k]) return fixed[k];
    if (Array.isArray(pt)) return k;
    if (pt === 'bool') return 'bool';
    if (pt === 'brush') return 'Brush';
    if (pt === 'thick' || pt === 'margin') return 'Thickness';
    if (pt === 'items') return 'ItemCollection';
    if (pt === 'text') return 'string';
    if (pt === 'date') return 'DateTime?';
    return 'double';
  };
  const EVDOC = {
    Click: ['Kliknięcie.', 'Occurs when clicked.'],
    TextChanged: ['Zmienił się tekst.', 'The text changed.'],
    SelectionChanged: ['Zmieniło się zaznaczenie.', 'The selection changed.'],
    Checked: ['Zaznaczono.', 'Checked.'],
    Unchecked: ['Odznaczono.', 'Unchecked.'],
    ValueChanged: ['Zmieniła się wartość.', 'The value changed.'],
    Loaded: ['Element został załadowany.', 'The element has loaded.'],
    KeyDown: ['Naciśnięto klawisz.', 'A key was pressed.'],
    MouseDown: ['Wciśnięto przycisk myszy.', 'A mouse button was pressed.'],
    MouseEnter: ['Mysz weszła nad element.', 'The mouse entered.'],
    MouseLeave: ['Mysz opuściła element.', 'The mouse left.'],
    MouseMove: ['Mysz porusza się nad elementem.', 'The mouse moves over the element.'],
  };
  Object.keys(TY).forEach(t => {
    const TT = TY[t];
    const base = TT.k === 'ctl' ? 'Control' : 'FrameworkElement';
    const c = (T[t] = Object.assign(T[t] || {}, {
      name: t,
      base,
      m: Object.assign({}, (T[t] || {}).m),
      st: Object.assign({}, (T[t] || {}).st),
      isControl: true,
    }));
    propKeys({ id: 'x', t }).forEach(k => {
      if (
        k.includes('.') ||
        (k === 'Columns' && t === 'DataGrid') ||
        (k === 'Items' && !TT.it) ||
        (k === 'Text' && t === 'RichTextBox')
      )
        return;
      if (!T[base].m[k] && !T.FrameworkElement.m[k])
        c.m[k] = {
          kind: 'p',
          name: k,
          type: ptypeToCs(t, k),
          sigs: [{ params: '', type: ptypeToCs(t, k), doc: PDOC[k] || ['', ''] }],
          doc: PDOC[k] || ['', ''],
        };
    });
    if (TT.it || ['ComboBox', 'ListBox', 'ListView', 'DataGrid', 'TabControl', 'TreeView'].includes(t))
      ['Items', 'ItemsSource', 'SelectedItem', 'SelectedIndex', 'SelectedValue', 'DisplayMemberPath'].forEach(k => {
        const ty = {
          Items: 'ItemCollection',
          ItemsSource: 'IEnumerable',
          SelectedItem: 'object',
          SelectedIndex: 'int',
          SelectedValue: 'object',
          DisplayMemberPath: 'string',
        }[k];
        if (t === 'TreeView' && k === 'SelectedIndex') return;
        c.m[k] = {
          kind: 'p',
          name: k,
          type: ty,
          sigs: [{ params: '', type: ty, doc: PDOC[k] || ['', ''] }],
          doc: PDOC[k] || ['', ''],
        };
      });
    if (TT.cont && !TT.single && t !== 'TabControl')
      c.m.Children = {
        kind: 'p',
        name: 'Children',
        type: 'UIElementCollection',
        sigs: [{ params: '', type: 'UIElementCollection', doc: PDOC.Children }],
        doc: PDOC.Children,
      };
    if (TT.single)
      c.m.Child = {
        kind: 'p',
        name: TT.k === 'ctl' ? 'Content' : 'Child',
        type: 'UIElement',
        sigs: [{ params: '', type: 'UIElement', doc: ['', ''] }],
        doc: ['', ''],
      };
    eventKeys({ id: 'x', t }).forEach(ev => {
      c.m[ev] = {
        kind: 'e',
        name: ev,
        type: EA[ev] || 'RoutedEventArgs',
        sigs: [{ params: '', type: EA[ev] || 'RoutedEventArgs', doc: EVDOC[ev] || ['', ''] }],
        doc: EVDOC[ev] || ['', ''],
      };
    });
  });
  def(
    'TextBox',
    null,
    `
m|Clear||void|Czyści tekst.|Clears the text.
m|SelectAll||void|Zaznacza cały tekst.|Selects all text.
m|AppendText|string textData|void|Dopisuje tekst na końcu.|Appends text.
m|ScrollToEnd||void|Przewija na koniec.|Scrolls to the end.
p|SelectedText||string|Zaznaczony fragment.|The selected text.
p|CaretIndex||int|Pozycja kursora.|Caret position.
p|LineCount||int|Liczba wierszy.|Number of lines.`,
  );
  def('PasswordBox', null, `m|Clear||void|Czyści hasło.|Clears the password.`);
  def(
    'RichTextBox',
    null,
    `p|Document||FlowDocument|Dokument z treścią (akapity).|The content document (paragraphs).
m|AppendText|string textData|void|Dopisuje tekst na końcu.|Appends text.
m|SelectAll||void|Zaznacza całość.|Selects all content.
p|Selection||TextSelection|Zaznaczony fragment.|The current selection.`,
  );
  def(
    'ListBox',
    null,
    `m|ScrollIntoView|object item|void|Przewija do elementu.|Scrolls to the item.
m|UnselectAll||void|Odznacza wszystko.|Clears the selection.
p|SelectedItems||IList|Zaznaczone elementy (tryb Multiple).|Selected items (Multiple mode).`,
  );
  def('ListView', null, `m|ScrollIntoView|object item|void|Przewija do elementu.|Scrolls to the item.`);
  def(
    'DataGrid',
    null,
    `m|ScrollIntoView|object item|void|Przewija do wiersza.|Scrolls to the row.
p|SelectedItems||IList|Zaznaczone wiersze.|Selected rows.`,
  );
  def(
    'MediaElement',
    null,
    `m|Play||void|Odtwarza.|Plays.
m|Pause||void|Wstrzymuje.|Pauses.
m|Stop||void|Zatrzymuje.|Stops.
p|Position||TimeSpan|Pozycja odtwarzania.|Playback position.`,
  );
  def('InkCanvas', null, `p|Strokes||StrokeCollection|Narysowane pociągnięcia.|The drawn strokes.`);
  def(
    'StrokeCollection',
    'IEnumerable',
    `p|Count||int|Liczba pociągnięć.|Number of strokes.
m|Clear||void|Czyści rysunek.|Clears the drawing.`,
  );

  /* ---------- typy: parsowanie nazw generycznych ---------- */
  function ptype2(s) {
    s = String(s || '')
      .trim()
      .replace(/\?$/, '');
    if (!s) return null;
    let arr = 0;
    while (/\[\s*,?\s*\]$/.test(s)) {
      s = s.replace(/\[\s*,?\s*\]$/, '').trim();
      arr++;
    }
    let base = s,
      args = [];
    const i = s.indexOf('<');
    if (i > 0 && s.endsWith('>')) {
      base = s.slice(0, i).trim();
      args = CS.splitTop(s.slice(i + 1, -1), ',').map(x => x.trim());
    }
    base = base.replace(/^(System|System\.Collections\.Generic|System\.Windows\.Controls|System\.Windows)\./, '');
    const alias = {
      String: 'string',
      Int32: 'int',
      Int64: 'long',
      Double: 'double',
      Boolean: 'bool',
      Char: 'char',
      Object: 'object',
      Single: 'float',
      Decimal: 'decimal',
      IEnumerable: 'IEnumerable',
    };
    base = alias[base] || base;
    if (arr)
      return {
        base: 'Array',
        args: [arr > 1 ? s + '[]'.repeat(arr - 1) : args.length ? `${base}<${args.join(', ')}>` : base],
        display: s + '[]'.repeat(arr),
      };
    return { base, args, display: s };
  }
  const GEN = {
    List: ['T'],
    IEnumerable: ['T'],
    Array: ['T'],
    HashSet: ['T'],
    Queue: ['T'],
    Stack: ['T'],
    Dictionary: ['K', 'V'],
    KeyValuePair: ['K', 'V'],
    KeyCollection: ['K'],
    ValueCollection: ['V'],
    RoutedPropertyChangedEventArgs: ['T'],
  };
  function subst(type, recv) {
    if (!type || !recv) return type;
    const names = GEN[recv.base] || [];
    let out = type;
    names.forEach((n, i) => {
      const a = recv.args[i];
      if (a) out = out.replace(new RegExp('\\b' + n + '\\b', 'g'), a);
    });
    if (recv.base === 'Dictionary' && /^IEnumerable/.test(out)) {
    }
    return out;
  }
  function elemType(recv) {
    if (!recv) return null;
    if (recv.base === 'string') return 'char';
    if (recv.base === 'Array') return recv.args[0] || null;
    const disp = recv.args && recv.args.length ? `${recv.base}<${recv.args.join(', ')}>` : recv.base;
    for (const { t, p } of chainOf(disp)) if (t.enumerable) return subst(subst(t.enumerable, p), recv);
    return null;
  }

  /* ---------- pełne API .NET 10 / WPF z oficjalnych plików referencyjnych (dotnet/runtime, dotnet/wpf) ---------- */
  const API = { types: {}, names: [], ok: false };
  (function loadApi() {
    const el = typeof document !== 'undefined' && document.getElementById('apidb');
    if (!el) return;
    const lines = el.textContent.split('\n');
    let NS = [],
      cur = null;
    for (const ln of lines) {
      if (!ln) continue;
      if (ln[0] === '#') {
        NS = ln.slice(1).split('|');
        continue;
      }
      if (ln[0] === '@') {
        const f = ln.slice(1).split('|');
        if (f[1] === 'd') {
          API.types[f[0]] = { key: f[0], k: 'delegate', ns: NS[+f[2]], gen: f[3], ret: f[4], params: f[5] || '' };
          cur = null;
          continue;
        }
        cur = API.types[f[0]] = {
          key: f[0],
          k: { c: 'class', s: 'struct', i: 'interface', e: 'enum', r: 'record' }[f[1]] || f[1],
          ns: NS[+f[2]],
          gen: f[3],
          base: f[4] || null,
          ifs: f[5] ? f[5].split(';') : [],
          st: f[6] === 's',
          m: [],
        };
        continue;
      }
      if (cur) {
        const f = ln.split('|');
        cur.m.push({ k: f[0], n: f[1], t: f[2] || '', p: f[3] || '', fl: f[4] || '' });
      }
    }
    API.ok = true;
  })();
  const DICT_FAMILY = new Set([
    'Dictionary',
    'KeyValuePair',
    'KeyCollection',
    'ValueCollection',
    'SortedDictionary',
    'SortedList',
    'IDictionary',
    'IReadOnlyDictionary',
  ]);
  const API_RENAME = (name, s) => {
    if (!s) return s;
    if (DICT_FAMILY.has(name)) s = s.replace(/\bTKey\b/g, 'K').replace(/\bTValue\b/g, 'V');
    if (name === 'IEnumerable' || name === 'IOrderedEnumerable')
      s = s.replace(/\bTSource\b/g, 'T').replace(/\bTElement\b/g, 'T');
    return s;
  };
  const VALT =
    /^(int|long|short|byte|sbyte|uint|ulong|ushort|double|float|decimal|char|bool|nint|nuint|KeyValuePair<.*>)$/;
  const isValT = ty => VALT.test(ty) || (API.types[ty] && (API.types[ty].k === 'struct' || API.types[ty].k === 'enum'));
  const dropNullRef = s =>
    String(s || '').replace(/([\w.]+(?:<[^<>]*(?:<[^<>]*>[^<>]*)*>)?(?:\[\])*)\?(?=[\s,>)\[\]]|$)/g, (a, ty) =>
      isValT(ty) ? a : ty,
    );
  function evArgs(handler) {
    const d = API.types[handler] || API.types[handler.replace(/<.*>$/, '') + '`1'];
    if (!d || d.k !== 'delegate') return null;
    const ps = CS.splitTop(d.params, ',');
    if (ps.length < 2) return null;
    let t = ps[1].trim().replace(/\s+\w+$/, '');
    const g = /<(.+)>$/.exec(handler);
    if (g && d.gen) t = t.replace(new RegExp('\\b' + d.gen + '\\b', 'g'), g[1]);
    return t;
  }
  function mergeApi() {
    if (!API.ok) return;
    const order = Object.keys(API.types).sort((a, b) => (a.includes('`') ? 1 : 0) - (b.includes('`') ? 1 : 0)); // najpierw nie‑generyczne, generyczne nadpisują bazę
    for (const key of order) {
      const a = API.types[key];
      if (a.k === 'delegate') {
        API.names.push(key.replace(/`\d+$/, ''));
        continue;
      }
      const name = key.replace(/`\d+$/, '');
      if (name === 'List' && !key.includes('`')) continue; // System.Windows.Documents.List — koliduje z List<T>
      if (name === 'Enumerable') continue;
      API.names.push(name);
      const gen = a.gen ? a.gen.split(',') : [];
      const t = (T[name] = T[name] || {
        name,
        base: null,
        m: {},
        st: {},
        enumerable: null,
        isEnum: false,
        isStatic: false,
      });
      t.api = true;
      t.ns = a.ns;
      t.kind = a.k;
      if (a.k === 'enum') t.isEnum = true;
      if (a.st) t.isStatic = true;
      if (a.k === 'struct' || a.k === 'enum') t.valueType = true;
      if (gen.length && !GEN[name]) GEN[name] = gen.map(g => API_RENAME(name, g));
      const base = a.base ? API_RENAME(name, a.base) : null;
      if (base && !['ValueType', 'Enum', 'Attribute'].includes(base)) {
        t.base = base;
      } else if (!t.base && name !== 'object') t.base = a.k === 'interface' ? null : 'object';
      t.ifs = (t.ifs || []).concat(a.ifs.map(i => API_RENAME(name, i)));
      if (a.k === 'interface') t.iface = true;
      if (!t.enumerable) {
        const ie = t.ifs.map(i => /^IEnumerable<(.+)>$/.exec(i)).find(Boolean);
        if (ie) t.enumerable = ie[1];
      }
      const apiSigs = {};
      for (const m of a.m) {
        const mt = API_RENAME(name, dropNullRef(m.t)),
          mp = API_RENAME(name, dropNullRef(m.p));
        if (m.k === 'k') {
          (t.ctors = t.ctors || []).push({ params: mp, type: '', doc: ['', ''] });
          continue;
        }
        if (m.k === 'i') {
          t.indexer = { type: mt, params: mp, ro: m.fl.includes('r') };
          continue;
        }
        const isSt = m.fl.includes('s') || m.k === 'c';
        const tab = isSt ? t.st : t.m;
        let nm = m.n.replace(/<.*>$/, '');
        const kind = m.k === 'c' ? 'c' : m.k;
        if (kind === 'm') {
          const k2 = (isSt ? 's:' : 'i:') + nm;
          const sig = {
            params: mp,
            type: mt,
            doc: ['', ''],
            api: true,
            gen: /</.test(m.n),
            tparams: (/<(.*)>$/.exec(m.n) || [])[1] || '',
          };
          (apiSigs[k2] = apiSigs[k2] || { tab, nm, sigs: [] }).sigs.push(sig);
          continue;
        }
        const ex = tab[nm];
        let ty = kind === 'c' ? name : mt;
        if (kind === 'e') {
          const ea = evArgs(mt);
          if (ex && ex.kind === 'e') {
            ex.handler = mt;
            ex.api = true;
            continue;
          }
          ty = ea || 'EventArgs';
        }
        if (ex && ex.kind !== 'm') {
          ex.api = true;
          ex.ro = m.fl.includes('r');
          if (kind !== 'e' && !ex.color && !(ex.type || '').startsWith(ty + '<')) {
            ex.type = ty;
            ex.sigs = [{ params: '', type: ty, doc: ex.doc }];
          }
          continue;
        }
        if (ex) continue;
        tab[nm] = {
          kind,
          name: nm,
          type: ty,
          sigs: [{ params: '', type: ty, doc: ['', ''] }],
          doc: ['', ''],
          api: true,
          ro: m.fl.includes('r'),
          handler: kind === 'e' ? mt : undefined,
        };
      }
      for (const { tab, nm, sigs } of Object.values(apiSigs)) {
        const ex = tab[nm];
        if (ex && ex.kind === 'm') {
          // dokumentację z bazy opisów zachowujemy przy pasującym przeciążeniu
          sigs.forEach(s => {
            const c = ex.sigs.find(x => !x.api && pcount(x.params) === pcount(s.params));
            s.doc = c ? c.doc : ex.doc;
          });
          ex.sigs = sigs;
          ex.type = sigs[0].type;
          ex.api = true;
        } else if (!ex) tab[nm] = { kind: 'm', name: nm, type: sigs[0].type, sigs, doc: ['', ''], api: true };
      }
    }
    // LINQ: metody rozszerzające System.Linq.Enumerable → IEnumerable<T> / IOrderedEnumerable<T>
    const E = API.types.Enumerable;
    if (E) {
      const IE = T.IEnumerable,
        IO = (T.IOrderedEnumerable = T.IOrderedEnumerable || {
          name: 'IOrderedEnumerable',
          base: 'IEnumerable',
          m: {},
          st: {},
          enumerable: 'T',
          api: true,
        });
      IO.base = 'IEnumerable';
      IO.enumerable = 'T';
      GEN.IOrderedEnumerable = ['T'];
      T.Enumerable = T.Enumerable || { name: 'Enumerable', m: {}, st: {}, isStatic: true };
      T.Enumerable.api = true;
      T.Enumerable.base = 'object';
      const groups = new Map();
      for (const m of E.m) {
        if (m.k !== 'm') continue;
        const nm = m.n.replace(/<.*>$/, '');
        const ps = CS.splitTop(dropNullRef(m.p), ',').map(s => s.trim());
        if (!m.fl.includes('x')) {
          const k = 'S:' + nm;
          (groups.get(k) || groups.set(k, { tab: T.Enumerable.st, nm, sigs: [] }).get(k)).sigs.push({
            params: ps.join(', '),
            type: dropNullRef(m.t),
            doc: ['', ''],
            api: true,
          });
          continue;
        }
        const first = ps[0].replace(/^this\s+/, '').replace(/\s+\w+$/, '');
        let target = IE,
          recv = null,
          tsrc = 'TSource';
        let mm;
        if ((mm = /^IOrderedEnumerable<(\w+)>$/.exec(first))) {
          target = IO;
          tsrc = mm[1];
        } else if ((mm = /^IEnumerable<(.+)>$/.exec(first))) {
          if (/^T[A-Z]\w*$|^T$/.test(mm[1])) tsrc = mm[1];
          else {
            recv = mm[1];
            tsrc = null;
          }
        } else if (first === 'IEnumerable') {
          tsrc = null;
        } else continue; // IQueryable, ParallelQuery itp.
        const ren = s => (tsrc ? s.replace(new RegExp('\\b' + tsrc + '\\b', 'g'), 'T') : s);
        const sig = {
          params: ren(ps.slice(1).join(', ')),
          type: ren(dropNullRef(m.t)),
          doc: ['', ''],
          api: true,
          recv,
          gen: /</.test(m.n),
          tparams: ((/<(.*)>$/.exec(m.n) || [])[1] || '')
            .split(',')
            .filter(x => x !== tsrc)
            .join(','),
        };
        const k = (target === IO ? 'O:' : 'I:') + nm;
        (groups.get(k) || groups.set(k, { tab: target.m, nm, sigs: [] }).get(k)).sigs.push(sig);
      }
      for (const { tab, nm, sigs } of groups.values()) {
        const ex = tab[nm];
        if (ex) {
          sigs.forEach(s => {
            const c = ex.sigs.find(x => !x.api && pcount(x.params) === pcount(s.params));
            s.doc = c ? c.doc : ex.doc;
          });
          ex.sigs = sigs;
          ex.type = sigs[0].type;
          ex.api = true;
          ex.ext = true;
        } else tab[nm] = { kind: 'm', name: nm, type: sigs[0].type, sigs, doc: ['', ''], api: true, ext: true };
      }
    }
    // Brushes/Colors/FontWeights… to klasy ze statycznymi właściwościami — w podpowiedziach zachowują się jak wyliczenia
    ['Brushes', 'Colors', 'FontWeights', 'FontStyles', 'Cursors', 'SystemColors', 'Keyboard', 'Mouse'].forEach(n => {
      if (T[n]) T[n].isStatic = true;
    });
    API.names = [...new Set(API.names)].sort();
  }
  function pcount(p) {
    return p && p.trim() ? CS.splitTop(p, ',').length : 0;
  }
  mergeApi();

  /* ---------- typy użytkownika z plików projektu ---------- */
  let USER = {},
    userStamp = '';
  function refreshUser() {
    const files = csFiles();
    const stamp = files.map(f => f.src.length + ':' + f.src.slice(-40)).join('|');
    const cstamp = (() => {
      let x = '';
      walk(n => {
        if (n.name) x += n.name + ':' + n.t + ',';
      });
      return x;
    })();
    if (stamp + cstamp === userStamp) return;
    userStamp = stamp + cstamp;
    USER = {};
    MCACHE.clear();
    files.forEach(f => {
      try {
        CS.memberSigs(f.src).forEach(r => {
          USER[r.name] = r;
        });
      } catch (e) {}
    });
  }
  function typeInfo(name) {
    if (!name) return null;
    if (USER[name]) {
      const r = USER[name];
      const t = {
        name,
        base: r.base || (r.name === 'MainWindow' ? 'Window' : 'object'),
        m: {},
        st: {},
        user: true,
        isEnum: r.kind === 'enum',
      };
      r.members.forEach(m => {
        if (m.kind === 'ctor') return;
        const tab = m.isStatic || r.kind === 'enum' ? t.st : t.m;
        const sig = { params: m.params || '', type: m.type, doc: ['', ''] };
        if (tab[m.name] && m.kind === 'm') tab[m.name].sigs.push(sig);
        else
          tab[m.name] = {
            kind: m.kind === 'm' ? 'm' : m.kind === 'f' ? 'f' : m.kind === 'c' ? 'c' : 'p',
            name: m.name,
            type: m.type,
            sigs: [sig],
            doc: ['', ''],
            user: true,
            line: m.line,
          };
      });
      if (name === 'MainWindow' && !t.m.InitializeComponent)
        t.m.InitializeComponent = {
          kind: 'm',
          name: 'InitializeComponent',
          type: 'void',
          sigs: [
            {
              params: '',
              type: 'void',
              doc: [
                L(
                  'Wczytuje interfejs z MainWindow.xaml (kod generowany).',
                  'Loads the UI from MainWindow.xaml (generated code).',
                ),
                '',
              ],
            },
          ],
          doc: [
            L(
              'Wczytuje interfejs z MainWindow.xaml (kod generowany).',
              'Loads the UI from MainWindow.xaml (generated code).',
            ),
            '',
          ],
        };
      if (name === 'MainWindow')
        walk(n => {
          if (n.name)
            t.m[n.name] = {
              kind: 'f',
              name: n.name,
              type: n.t,
              sigs: [{ params: '', type: n.t, doc: ['', ''] }],
              doc: [L(`Kontrolka ${n.t} z MainWindow.xaml.`, `${n.t} control from MainWindow.xaml.`), ''],
              ctl: true,
            };
        });
      return t;
    }
    return T[name] || null;
  }
  function chainOf(type) {
    // [ {t, p} ] — typ, jego bazy (z podstawieniem argumentów generycznych) i interfejsy bazowe
    const p0 = ptype2(type);
    if (!p0) return [];
    const out = [];
    const q = [p0];
    const seenT = new Set();
    while (q.length && out.length < 24) {
      const p = q.shift();
      if (!p || seenT.has(p.base)) continue;
      seenT.add(p.base);
      const t = typeInfo(p.base);
      if (!t) continue;
      out.push({ t, p });
      const sub = x => subst(subst(x, p), p0);
      if (t.base) q.push(ptype2(sub(t.base)));
      if (t.iface && t.ifs) t.ifs.forEach(i => q.push(ptype2(sub(i))));
      if (!t.base && !t.iface && p.base !== 'object' && !t.isEnum) q.push(ptype2('object'));
    }
    return out;
  }
  const MCACHE = new Map();
  function membersOf(type, wantStatic) {
    const ck = (wantStatic ? 's|' : 'i|') + type + '|' + userStamp;
    let r = MCACHE.get(ck);
    if (r) return r;
    r = membersOf0(type, wantStatic);
    if (MCACHE.size > 3000) MCACHE.clear();
    MCACHE.set(ck, r);
    return r;
  }
  function membersOf0(type, wantStatic) {
    const p0 = ptype2(type);
    if (!p0) return [];
    const seen = new Map();
    const isSeq = p0.base === 'IEnumerable' || p0.base === 'IOrderedEnumerable';
    const el0 = isSeq ? p0.args[0] || 'object' : null;
    const put = (m, p, el) => {
      if (seen.has(m.name)) return;
      let sigs = m.sigs || [];
      if (el && sigs.some(s => s.recv)) {
        sigs = sigs.filter(s => !s.recv || s.recv === el);
        if (!sigs.length) return;
      }
      const sub = x => subst(subst(x, p), p0);
      seen.set(
        m.name,
        Object.assign({}, m, {
          type: sub(sigs.length ? sigs[0].type : m.type),
          sigs: sigs.map(s => Object.assign({}, s, { params: sub(s.params), type: sub(s.type) })),
        }),
      );
    };
    const chain = chainOf(type);
    chain.forEach(({ t, p }, i) => {
      if (wantStatic && i > 0 && !t.api) return;
      if (!isSeq && !wantStatic && (t === T.IEnumerable || t === T.IOrderedEnumerable)) return;
      Object.values((wantStatic ? t.st : t.m) || {}).forEach(m => put(m, p, el0));
    });
    if (!wantStatic && p0.base !== 'IEnumerable' && p0.base !== 'IOrderedEnumerable') {
      const el = elemType(p0);
      if (el) {
        const ep = { base: 'IEnumerable', args: [el] };
        Object.values(T.IEnumerable.m).forEach(m => {
          if (seen.has(m.name)) return;
          put(m, ep, el);
        });
      }
    }
    if (!wantStatic && !seen.size && p0.base !== 'object') Object.values(T.object.m).forEach(m => put(m, p0));
    return [...seen.values()];
  }
  function indexerOf(type) {
    for (const { t, p } of chainOf(type)) if (t.indexer) return subst(t.indexer.type, p);
    return null;
  }
  function member(type, name, wantStatic) {
    return membersOf(type, wantStatic).find(m => m.name === name) || null;
  }

  /* ---------- zmienne lokalne i ich typy ---------- */
  const TYPE_RE = '(?:[A-Za-z_][\\w.]*(?:<[^<>;(){}=]*(?:<[^<>;(){}=]*>)?[^<>;(){}=]*>)?(?:\\[\\s*\\])*\\??)';
  const NOT_TYPE = new Set([
    'return',
    'new',
    'else',
    'case',
    'goto',
    'throw',
    'await',
    'yield',
    'in',
    'is',
    'as',
    'out',
    'ref',
    'using',
    'namespace',
    'public',
    'private',
    'protected',
    'internal',
    'static',
    'readonly',
    'const',
    'class',
    'struct',
    'enum',
    'interface',
    'record',
    'override',
    'virtual',
    'async',
    'partial',
    'sealed',
    'abstract',
    'typeof',
    'nameof',
    'sizeof',
    'default',
    'checked',
    'unchecked',
    'lock',
    'this',
    'base',
    'void',
    'event',
    'delegate',
    'operator',
    'implicit',
    'explicit',
    'params',
    'foreach',
    'for',
    'while',
    'if',
    'switch',
    'catch',
  ]);
  function scanLocals(code, upto) {
    const src = code.slice(0, upto);
    const vars = new Map();
    const declRe = new RegExp(
      '(?:^|[\\s(,;{])(' + TYPE_RE + ')\\s+([A-Za-z_]\\w*)\\s*(?==[^=>]|;|,|\\)|\\bin\\b|:)',
      'g',
    );
    let m;
    const clean = src
      .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    while ((m = declRe.exec(clean))) {
      const ty = m[1];
      if (NOT_TYPE.has(ty) || /^\d/.test(ty)) continue;
      if (ty === 'var') {
        const rest = clean.slice(m.index + m[0].length);
        const em = /^\s*=\s*([^;]*)/.exec(rest);
        const fm = /^\s+in\s+([^)]*)\)/.exec(rest);
        if (em) vars.set(m[2], { expr: em[1] });
        else if (fm) vars.set(m[2], { each: fm[1] });
        else vars.set(m[2], { type: null });
      } else vars.set(m[2], { type: ty });
    }
    const outRe = /\bout\s+(var|[\w<>\[\],.?]+)\s+(\w+)/g;
    while ((m = outRe.exec(clean))) {
      if (m[1] !== 'var') vars.set(m[2], { type: m[1] });
      else {
        const pre = clean.slice(Math.max(0, m.index - 80), m.index);
        const pm = /\b(int|double|bool|decimal|long|float|DateTime)\.TryParse\s*\([^()]*$/.exec(pre);
        vars.set(m[2], { type: pm ? pm[1] : null });
      }
    }
    const feRe = /\bforeach\s*\(\s*(var|[\w<>\[\],.?]+)\s+(\w+)\s+in\s+([^)]*)\)/g;
    while ((m = feRe.exec(clean))) vars.set(m[2], m[1] === 'var' ? { each: m[3] } : { type: m[1] });
    const catchRe = /\bcatch\s*\(\s*([\w.]+)\s+(\w+)\s*\)/g;
    while ((m = catchRe.exec(clean))) vars.set(m[2], { type: m[1] });
    const lamRe = /([\w.\]\)]+)\.(\w+)\(\s*\(?\s*(\w+)\s*\)?\s*=>/g;
    while ((m = lamRe.exec(clean))) vars.set(m[3], { lambdaOn: m[1], method: m[2] });
    return vars;
  }
  let CTX = null;
  function buildCtx(cm) {
    refreshUser();
    const code = cm.getValue();
    const idx = cm.indexFromPos(cm.getCursor());
    const types = (() => {
      try {
        return CS.scanTypes(CS.tokenize(code).code);
      } catch (e) {
        return [];
      }
    })();
    const cls = types.filter(t => t.open >= 0 && t.open < idx && (t.close < 0 || t.close >= idx)).pop();
    const locals = scanLocals(code, idx);
    CTX = { code, idx, cls: cls ? cls.name : 'MainWindow', locals, cm };
    return CTX;
  }
  function localType(name, depth = 0) {
    if (!CTX || depth > 4) return null;
    const v = CTX.locals.get(name);
    if (!v) return null;
    if (v.type !== undefined && v.type !== null) return v.type;
    if (v.expr) return exprType(v.expr, depth + 1);
    if (v.each) {
      const t = exprType(v.each, depth + 1);
      return t ? elemType(ptype2(t)) : null;
    }
    if (v.lambdaOn) {
      const t = exprType(v.lambdaOn, depth + 1);
      return t ? elemType(ptype2(t)) || null : null;
    }
    return null;
  }
  /* typ wyrażenia: "txtA.Text.Length", "new Random()", "lista.Where(x => x > 1)" */
  function splitChain(e) {
    const segs = [];
    let i = 0,
      cur = '';
    while (i < e.length) {
      const c = e[i];
      if (c === '(' || c === '[') {
        const close = c === '(' ? ')' : ']';
        let d = 0,
          j = i;
        for (; j < e.length; j++) {
          if (e[j] === c) d++;
          else if (e[j] === close) {
            d--;
            if (!d) break;
          }
        }
        cur += e.slice(i, j + 1);
        i = j + 1;
        continue;
      }
      if (c === '<' && /\w$/.test(cur)) {
        let d = 0,
          j = i;
        for (; j < e.length; j++) {
          if (e[j] === '<') d++;
          else if (e[j] === '>') {
            d--;
            if (!d) break;
          }
        }
        if (j < e.length && /^[\w\s,<>\[\]?.]*$/.test(e.slice(i, j + 1))) {
          cur += e.slice(i, j + 1);
          i = j + 1;
          continue;
        }
      }
      if (c === '.' && !/^\d+$/.test(cur)) {
        segs.push(cur);
        cur = '';
        i++;
        continue;
      }
      if (c === '?' && e[i + 1] === '.') {
        i++;
        continue;
      }
      if (c === '!' && e[i + 1] === '.') {
        i++;
        continue;
      }
      cur += c;
      i++;
    }
    segs.push(cur);
    return segs.map(s => s.trim());
  }
  function exprType(expr, depth = 0) {
    expr = String(expr).trim();
    if (!expr || depth > 6) return null;
    if (/^\$?@?"/.test(expr)) return expr.includes('.') && /"\s*\./.test(expr) ? null : 'string';
    if (/^'.'$|^'\\.'$/.test(expr)) return 'char';
    if (/^-?\d+$/.test(expr)) return 'int';
    if (/^-?\d*\.\d+[dD]?$|^-?\d+[dD]$/.test(expr)) return 'double';
    if (/^-?[\d.]+[mM]$/.test(expr)) return 'decimal';
    if (/^(true|false)$/.test(expr)) return 'bool';
    let m;
    if ((m = /^new\s+([\w.]+(?:<[^()]*>)?)\s*(\[[^\]]*\])?\s*(\(|\{|$)/.exec(expr))) {
      const rest = expr.slice(m[0].length - (m[3] ? 1 : 0));
      const base = m[2] ? m[1] + '[]' : m[1];
      const after = rest
        .replace(/^\([^()]*(?:\([^()]*\)[^()]*)*\)/, '')
        .replace(/^\s*\{[\s\S]*\}/, '')
        .trim();
      if (after.startsWith('.')) return chainType(base, splitChain(after.slice(1)), depth);
      return base;
    }
    if ((m = /^\(\s*([\w.<>\[\]?]+)\s*\)\s*\w/.exec(expr)) && !/^\(\s*\w+\s*\)\s*=>/.test(expr)) return m[1];
    if (expr.startsWith('(')) {
      let d = 0,
        j = 0;
      for (; j < expr.length; j++) {
        if (expr[j] === '(') d++;
        else if (expr[j] === ')') {
          d--;
          if (!d) break;
        }
      }
      const inner = expr.slice(1, j);
      const rest = expr.slice(j + 1).trim();
      let t = (m = /\bas\s+([\w.<>\[\]]+)\s*$/.exec(inner)) ? m[1] : exprType(inner, depth + 1);
      if (!rest) return t;
      if (rest.startsWith('.')) return chainType(t, splitChain(rest.slice(1)), depth);
      return null;
    }
    // operatory na najwyższym poziomie
    const top = topOps(expr);
    if (top.cmp) return 'bool';
    if (top.parts.length > 1) {
      const ts = top.parts.map(p => exprType(p, depth + 1));
      if (ts.includes('string')) return 'string';
      if (ts.includes('double') || ts.includes('float') || ts.includes('decimal'))
        return ts.includes('decimal') ? 'decimal' : 'double';
      return ts[0];
    }
    if (top.ternary) return exprType(top.ternary, depth + 1);
    const segs = splitChain(expr);
    return chainType(null, segs, depth);
  }
  function topOps(e) {
    const parts = [];
    let d = 0,
      cur = '',
      cmp = false,
      ternary = null;
    for (let i = 0; i < e.length; i++) {
      const c = e[i];
      if ('([{'.includes(c)) d++;
      else if (')]}'.includes(c)) d--;
      if (d === 0 && c === '"') {
        const j = e.indexOf('"', i + 1);
        cur += e.slice(i, j + 1);
        i = j;
        continue;
      }
      if (d === 0) {
        if (
          /^(==|!=|<=|>=|&&|\|\|)/.test(e.slice(i, i + 2)) ||
          ((c === '<' || c === '>') &&
            e[i + 1] !== '=' &&
            !/\w$/.test(cur.trim()) === false &&
            /\s/.test(e[i - 1] || ''))
        ) {
          cmp = true;
        }
        if (c === '?' && e[i + 1] !== '.' && e[i + 1] !== '?') {
          const k = e.indexOf(':', i);
          if (k > 0) ternary = e.slice(i + 1, k);
          break;
        }
        if ('+-*/%'.includes(c) && i > 0 && !/[eE]/.test(e[i - 1]) && e[i + 1] !== '=') {
          parts.push(cur);
          cur = '';
          continue;
        }
      }
      cur += c;
    }
    parts.push(cur);
    return { parts: parts.map(p => p.trim()).filter(Boolean), cmp, ternary };
  }
  function staticTypeName(name) {
    const p = ptype2(name);
    if (!p) return null;
    if (USER[p.base]) return p.base;
    if (T[p.base] && (Object.keys(T[p.base].st || {}).length || T[p.base].isStatic || T[p.base].isEnum)) return p.base;
    return null;
  }
  function headType(seg, depth) {
    const nm = (/^(\w+)/.exec(seg) || [])[1];
    if (!nm) return { t: null };
    const call = seg.slice(nm.length).trim();
    if (nm === 'this') return { t: CTX ? CTX.cls : 'MainWindow' };
    if (nm === 'base') return { t: (typeInfo(CTX && CTX.cls) || {}).base || 'object' };
    const lt = localType(nm, depth);
    if (lt && !call.startsWith('(')) return { t: idx(lt, call) };
    // składowe bieżącej klasy (i kontrolki)
    const own = CTX ? member(CTX.cls, nm, false) || member(CTX.cls, nm, true) : null;
    if (own) return { t: idx(retOf(own, call), call.replace(/^\([^)]*\)/, '')) };
    if (!CTX || CTX.cls === 'MainWindow' || true) {
      let ctl = null;
      walk(n => {
        if (n.name === nm) {
          ctl = n.t;
          return false;
        }
      });
      if (ctl) return { t: idx(ctl, call) };
    }
    const st = staticTypeName(nm);
    if (st && !call) return { t: st, isStatic: true };
    if (/^(int|double|string|bool|char|decimal|long|float|object)$/.test(nm) && !call) return { t: nm, isStatic: true };
    return { t: null };
  }
  function retOf(m, call, owner) {
    if (!m) return null;
    if (m.kind === 'm' && call.startsWith('(')) {
      const inner = call === '()' ? '' : call.slice(1, -1);
      const argc = inner.trim() ? CS.splitTop(inner, ',').length : 0;
      const s =
        m.sigs.find(s => (s.params ? CS.splitTop(s.params, ',').length : 0) === argc) ||
        m.sigs.find(s => /=/.test(s.params || '') || /params /.test(s.params || '')) ||
        m.sigs[0];
      let t = s.type || m.type;
      const tps = (s.tparams || '').split(',').filter(Boolean).concat(['TResult', 'TKey', 'TOutput']);
      const tpRe = new RegExp('\\b(' + [...new Set(tps)].join('|') + ')\\b');
      if (tpRe.test(t)) {
        let bt = null;
        const lam = /^\(?\s*(\w+)\s*\)?\s*=>\s*([\s\S]+)$/.exec(inner.trim());
        if (lam && CTX && owner) {
          const el = elemType(ptype2(owner));
          const prev = CTX.locals.get(lam[1]);
          CTX.locals.set(lam[1], { type: el });
          try {
            bt = exprType(lam[2]);
          } catch (e) {}
          if (prev) CTX.locals.set(lam[1], prev);
          else CTX.locals.delete(lam[1]);
        }
        t = t.replace(new RegExp(tpRe.source, 'g'), bt || 'object');
      }
      return t;
    }
    return m.type;
  }
  function idx(t, call) {
    if (!t) return t;
    const mm = /^\[[^\]]*\]/.exec(call || '');
    if (mm) {
      const p = ptype2(t);
      if (p.base !== 'Array') {
        const ix = indexerOf(t);
        if (ix) return ix;
      }
      if (p.base === 'Dictionary') return p.args[1] || 'object';
      return elemType(p) || 'object';
    }
    return t;
  }
  function chainType(startType, segs, depth = 0, startStatic = false) {
    let t = startType,
      isStatic = startStatic;
    let i = 0;
    if (t == null) {
      const h = headType(segs[0], depth);
      t = h.t;
      isStatic = !!h.isStatic;
      i = 1;
      if (!t) return null;
    }
    for (; i < segs.length; i++) {
      const s = segs[i];
      const nm = (/^(\w+)/.exec(s) || [])[1];
      if (!nm) return null;
      const call = s
        .slice(nm.length)
        .trim()
        .replace(/^<[^()]*>/, '');
      const m = member(t, nm, isStatic) || (isStatic ? null : null);
      if (!m) return null;
      let rt = retOf(m, call, t);
      const after = call.replace(/^\((?:[^()]|\([^()]*\))*\)/, '');
      t = idx(rt, after);
      isStatic = false;
      if (m.kind === 'c' && T[t] && T[t].isEnum) isStatic = false;
    }
    return t;
  }
  function chainBefore(line) {
    // zwraca tekst wyrażenia przed ostatnią kropką: "abc.Def(x).Gh" -> "abc.Def(x)"
    let i = line.length - 1,
      d = 0;
    while (i >= 0) {
      const c = line[i];
      if (c === ')' || c === ']') d++;
      else if (c === '(' || c === '[') {
        if (!d) break;
        d--;
      } else if (!d && !/[\w.$@"?!>< ]/.test(c)) break;
      else if (!d && c === ' ') {
        const pre = line.slice(0, i).trimEnd();
        if (/\bnew$/.test(pre)) {
          i = pre.length - 4;
          continue;
        }
        break;
      } else if (!d && (c === '<' || c === '>') && !/\w/.test(line[i - 1] || '')) break;
      else if (!d && c === '"') {
        const j = line.lastIndexOf('"', i - 1);
        if (j < 0) break;
        i = j;
      }
      i--;
    }
    return line.slice(i + 1).trim();
  }

  /* ---------- lista podpowiedzi ---------- */
  const KEYWORDS = [
    'if',
    'else',
    'for',
    'foreach',
    'while',
    'do',
    'switch',
    'case',
    'default',
    'break',
    'continue',
    'return',
    'new',
    'var',
    'int',
    'double',
    'string',
    'bool',
    'char',
    'decimal',
    'long',
    'float',
    'byte',
    'object',
    'true',
    'false',
    'null',
    'private',
    'public',
    'protected',
    'internal',
    'static',
    'readonly',
    'const',
    'void',
    'class',
    'struct',
    'enum',
    'interface',
    'record',
    'try',
    'catch',
    'finally',
    'throw',
    'using',
    'namespace',
    'this',
    'base',
    'async',
    'await',
    'in',
    'out',
    'ref',
    'is',
    'as',
    'not',
    'and',
    'or',
    'typeof',
    'nameof',
    'override',
    'virtual',
    'abstract',
    'get',
    'set',
    'value',
    'event',
    'params',
    'yield',
    'when',
    'goto',
    'lock',
  ];
  const COMMON_TYPES = [
    'List<T>',
    'Dictionary<TKey, TValue>',
    'HashSet<T>',
    'Queue<T>',
    'Stack<T>',
    'DateTime',
    'TimeSpan',
    'Random',
    'DispatcherTimer',
    'Stopwatch',
    'Exception',
    'Math',
    'Convert',
    'MessageBox',
    'Brushes',
    'Colors',
    'Color',
    'SolidColorBrush',
    'Thickness',
    'Point',
    'Visibility',
    'Key',
    'Keyboard',
    'Mouse',
    'Canvas',
    'Task',
    'Console',
    'Debug',
    'Enumerable',
    'Environment',
    'Application',
    'MessageBoxButton',
    'MessageBoxImage',
    'MessageBoxResult',
    'FontWeights',
    'FontStyles',
    'HorizontalAlignment',
    'VerticalAlignment',
    'Orientation',
    'TextWrapping',
    'StringSplitOptions',
    'Cursors',
    'Thread',
    'Clipboard',
  ];
  const SNIPPETS = [
    ['if', 'if (${1:warunek})\n{\n\t$0\n}', ['Instrukcja warunkowa if.', 'if statement.']],
    ['else', 'else\n{\n\t$0\n}', ['Gałąź else.', 'else branch.']],
    ['for', 'for (int i = 0; i < ${1:10}; i++)\n{\n\t$0\n}', ['Pętla for z licznikiem.', 'for loop with a counter.']],
    [
      'foreach',
      'foreach (var ${1:item} in ${2:kolekcja})\n{\n\t$0\n}',
      ['Pętla po elementach kolekcji.', 'Loop over a collection.'],
    ],
    ['while', 'while (${1:warunek})\n{\n\t$0\n}', ['Pętla while.', 'while loop.']],
    ['do', 'do\n{\n\t$0\n} while (${1:warunek});', ['Pętla do…while.', 'do…while loop.']],
    [
      'switch',
      'switch (${1:wartosc})\n{\n\tcase ${2:1}:\n\t\t$0\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}',
      ['Instrukcja switch.', 'switch statement.'],
    ],
    [
      'try',
      'try\n{\n\t$0\n}\ncatch (Exception ex)\n{\n\tMessageBox.Show(ex.Message);\n}',
      ['Obsługa wyjątków try…catch.', 'try…catch block.'],
    ],
    [
      'prop',
      'public ${1:int} ${2:Wlasciwosc} { get; set; }',
      ['Właściwość automatyczna.', 'Auto-implemented property.'],
    ],
    ['ctor', 'public ${CLASS}()\n{\n\t$0\n}', ['Konstruktor klasy.', 'Class constructor.']],
    ['cw', 'Console.WriteLine($0);', ['Wypisuje tekst w oknie Dane wyjściowe.', 'Writes to the Output window.']],
    ['mbox', 'MessageBox.Show($0);', ['Okno z komunikatem.', 'Message box.']],
    [
      'mboxyn',
      'if (MessageBox.Show("${1:Czy na pewno?}", "${2:Pytanie}", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)\n{\n\t$0\n}',
      ['Pytanie Tak/Nie.', 'Yes/No question.'],
    ],
    [
      'timer',
      'DispatcherTimer ${1:timer} = new DispatcherTimer();\n${1:timer}.Interval = TimeSpan.FromMilliseconds(${2:500});\n${1:timer}.Tick += (s, e) =>\n{\n\t$0\n};\n${1:timer}.Start();',
      ['Zegar wywołujący kod co pewien czas.', 'A timer that runs code repeatedly.'],
    ],
    ['class', 'public class ${1:NowaKlasa}\n{\n\t$0\n}', ['Nowa klasa.', 'New class.']],
  ];
  const KIND_LABEL = () => ({
    m: L('metoda', 'method'),
    p: L('właściwość', 'property'),
    e: L('zdarzenie', 'event'),
    f: L('pole', 'field'),
    c: L('wartość', 'value'),
    t: L('typ', 'type'),
    k: L('słowo kluczowe', 'keyword'),
    s: L('fragment kodu', 'snippet'),
    v: L('zmienna lokalna', 'local variable'),
    x: L('kontrolka', 'control'),
  });
  const ICON = { m: 'M', p: 'P', e: 'E', f: 'F', c: 'C', t: 'T', k: 'K', s: 'S', v: 'V', x: 'W' };
  function rank(items, prefix) {
    if (!prefix) return items.slice().sort((a, b) => a.text.localeCompare(b.text));
    const p = prefix.toLowerCase();
    const caps = prefix.replace(/[a-z0-9_]/g, '');
    const scored = [];
    for (const it of items) {
      const n = it.text;
      const nl = n.toLowerCase();
      let s = -1;
      if (n.startsWith(prefix)) s = 0;
      else if (nl.startsWith(p)) s = 1;
      else if (caps.length > 1 && n.replace(/[a-z0-9_]/g, '').startsWith(caps)) s = 2;
      else if (p.length > 2 && nl.includes(p)) s = 3;
      if (s >= 0 && nl !== p) scored.push([s, it]);
      else if (s >= 0 && nl === p && it.k !== 'k') scored.push([s, it]);
    }
    return scored
      .sort((a, b) => a[0] - b[0] || a[1].text.length - b[1].text.length || a[1].text.localeCompare(b[1].text))
      .map(x => x[1]);
  }
  function typeDoc(n) {
    const t = T[n];
    if (!t) return '';
    const a = API.types[n] || API.types[n + '`' + (GEN[n] || []).length];
    const kind =
      {
        class: L('klasa', 'class'),
        struct: L('struktura', 'struct'),
        interface: L('interfejs', 'interface'),
        enum: L('wyliczenie', 'enum'),
        delegate: L('delegat', 'delegate'),
      }[(a && a.k) || t.kind] || '';
    return `${kind} ${(a && a.ns) || t.ns || ''}.${n}${GEN[n] ? '<' + GEN[n].join(', ') + '>' : ''}`.trim();
  }
  function fromMember(m, owner) {
    return {
      text: m.name,
      k: m.kind === 'c' ? 'c' : m.kind,
      type: m.type,
      sigs: m.sigs,
      doc: m.doc,
      owner,
      color: m.color,
      ctl: m.ctl,
    };
  }
  function csCompletions(cm) {
    const ctx = buildCtx(cm);
    const cur = cm.getCursor();
    const line = cm.getLine(cur.line);
    const before = line.slice(0, cur.ch);
    const wm = /[A-Za-z_]\w*$/.exec(before);
    const prefix = wm ? wm[0] : '';
    const start = cur.ch - prefix.length;
    const pre = before.slice(0, start);
    let items = [];
    if (/\.\s*$/.test(pre) && !/(^|[^\w.])\d+\.\s*$/.test(pre)) {
      const chain = chainBefore(pre.replace(/\.\s*$/, ''));
      if (!chain) return null;
      let t,
        isStatic = false;
      const segs = splitChain(chain);
      if (segs.length === 1) {
        const h = headType(segs[0], 0);
        t = h.t;
        isStatic = !!h.isStatic;
      } else t = exprType(chain);
      if (!t) return null;
      if (!isStatic && staticTypeName(t) === t && segs.length === 1 && !ctx.locals.get(segs[0]) && segs[0] === t)
        isStatic = true;
      items = membersOf(t, isStatic).map(m => fromMember(m, ptype2(t).display));
      if (isStatic && USER[t] && USER[t].kind === 'enum') items = items.filter(i => i.k === 'c');
    } else {
      if (/\bnew\s+$/.test(pre)) {
        refreshUser();
        items = [
          ...Object.keys(USER)
            .filter(n => USER[n].kind !== 'enum' && USER[n].kind !== 'interface')
            .map(n => ({
              text: n,
              k: 't',
              type: n,
              doc: [L('Typ z Twojego projektu.', 'A type from your project.'), ''],
            })),
          ...Object.keys(TY).map(n => ({ text: n, k: 't', type: n, doc: [L('Kontrolka WPF.', 'WPF control.'), ''] })),
          ...COMMON_TYPES.filter(
            n =>
              !/^(Math|Convert|MessageBox|Brushes|Colors|Keyboard|Mouse|Console|Debug|Enumerable|Environment|Application|Cursors|Clipboard|Thread|FontWeights|FontStyles)$/.test(
                n,
              ) && !(T[n] && T[n].isEnum),
          ).map(n => ({
            text: n.replace(/<.*>/, ''),
            k: 't',
            type: n,
            doc: ['', ''],
            generic: /</.test(n) ? n.slice(n.indexOf('<')) : '',
          })),
          ...API.names
            .filter(n => {
              const t = T[n];
              return (
                t &&
                t.api &&
                !t.isStatic &&
                !t.isEnum &&
                !t.iface &&
                (t.kind === 'class' || t.kind === 'struct') &&
                (t.ctors || []).length
              );
            })
            .map(n => ({
              text: n,
              k: 't',
              type: n,
              doc: [typeDoc(n), ''],
              generic: GEN[n] ? '<' + GEN[n].join(', ') + '>' : '',
            })),
        ];
        {
          const seenN = new Set();
          items = items.filter(i => !seenN.has(i.text) && seenN.add(i.text));
        }
      } else {
        if (
          /\b(int|double|string|bool|var|char|long|float|decimal|object|void|class|struct|enum|interface|namespace|byte|short|const|record)\s+$/.test(
            pre,
          )
        )
          return null;
        if (
          /(^|[\s(,;])[A-Z]\w*(<[^<>]*>)?(\[\])?\??\s+$/.test(pre) &&
          !/\b(return|new|else|case|throw|await|in|is|as|using|static)\s+$/.test(pre) &&
          !/^\s*$/.test(pre)
        ) {
          const tw = /([A-Z]\w*)(<[^<>]*>)?(\[\])?\??\s+$/.exec(pre)[1];
          if (typeInfo(tw) || TY[tw]) return null;
        }
        const seen = new Set();
        const add = it => {
          if (!seen.has(it.text)) {
            seen.add(it.text);
            items.push(it);
          }
        };
        ctx.locals.forEach((v, n) => add({ text: n, k: 'v', type: localType(n) || 'var', doc: ['', ''] }));
        membersOf(ctx.cls, false).forEach(m => add(fromMember(m, ctx.cls)));
        membersOf(ctx.cls, true).forEach(m => add(fromMember(m, ctx.cls)));
        Object.keys(USER).forEach(n =>
          add({ text: n, k: 't', type: n, doc: [L('Typ z Twojego projektu.', 'A type from your project.'), ''] }),
        );
        COMMON_TYPES.forEach(n => add({ text: n.replace(/<.*>/, ''), k: 't', type: n, doc: ['', ''] }));
        if (prefix) API.names.forEach(n => add({ text: n, k: 't', type: n, doc: [typeDoc(n), ''] }));
        SNIPPETS.forEach(([n, body, doc]) => items.push({ text: n, k: 's', body, doc, label: n }));
        KEYWORDS.forEach(n => add({ text: n, k: 'k', doc: ['', ''] }));
      }
    }
    if (!items.length) return null;
    const list = rank(items, prefix).slice(0, prefix ? 400 : 1200);
    if (!list.length) return null;
    return {
      list: list.map(it => toHint(it, prefix)),
      from: CodeMirror.Pos(cur.line, start),
      to: CodeMirror.Pos(cur.line, cur.ch),
    };
  }
  function toHint(it, prefix) {
    const h = {
      text: it.k === 'm' ? it.text : it.text,
      it,
      render: el => {
        el.classList.add('is-row');
        const name = esc(it.text);
        const pl =
          prefix && it.text.toLowerCase().startsWith(prefix.toLowerCase())
            ? `<b>${esc(it.text.slice(0, prefix.length))}</b>${esc(it.text.slice(prefix.length))}`
            : name;
        el.innerHTML = `<span class="ki k-${it.k}">${ICON[it.k] || '•'}</span>${it.color ? `<span class="kcol" style="background:${esc(String(it.color).toLowerCase())}"></span>` : ''}<span class="kn">${pl}${it.k === 's' ? ' <i>' + L('fragment', 'snippet') + '</i>' : ''}</span><span class="k">${esc(shortType(it))}</span>`;
      },
    };
    if (it.k === 's') h.hint = (cm, data, c) => insertSnippet(cm, data.from, data.to, it.body);
    if (it.generic)
      h.hint = (cm, data) => {
        cm.replaceRange(it.text + '<>', data.from, data.to);
        cm.setCursor({ line: data.from.line, ch: data.from.ch + it.text.length + 1 });
      };
    return h;
  }
  function shortType(it) {
    if (it.k === 'k' || it.k === 's') return '';
    if (it.k === 'm') {
      const n = it.sigs ? it.sigs.length : 1;
      return (it.type || '') + (n > 1 ? ` (+${n - 1})` : '');
    }
    return it.type || '';
  }
  function insertSnippet(cm, from, to, body) {
    const ind = (cm.getLine(from.line).match(/^\s*/) || [''])[0];
    let cls = CTX ? CTX.cls : 'MainWindow';
    let text = body.replace(/\$\{CLASS\}/g, cls).replace(/\t/g, '    ');
    const firstPh = /\$\{1:([^}]*)\}/.exec(text);
    text = text.replace(/\$\{\d+:([^}]*)\}/g, '$1');
    const lines = text.split('\n').map((l, i) => (i ? ind + l : l));
    text = lines.join('\n');
    const cursorMark = text.indexOf('$0');
    text = text.replace('$0', '');
    cm.replaceRange(text, from, to);
    const base = cm.indexFromPos(from);
    if (firstPh) {
      const ph = firstPh[1];
      const at = text.indexOf(ph);
      if (at >= 0) {
        cm.setSelection(cm.posFromIndex(base + at), cm.posFromIndex(base + at + ph.length));
        return;
      }
    }
    if (cursorMark >= 0) cm.setCursor(cm.posFromIndex(base + cursorMark));
  }

  /* ---------- panel opisu przy liście ---------- */
  let docEl = null;
  function docBox() {
    if (!docEl) {
      docEl = document.createElement('div');
      docEl.className = 'is-doc';
      docEl.hidden = true;
      document.body.appendChild(docEl);
    }
    return docEl;
  }
  function sigText(it, s, owner, active) {
    const params =
      s.params && s.params.trim()
        ? CS.splitTop(s.params, ',')
            .map(p => p.trim())
            .filter(Boolean)
        : [];
    const ps = params.map((p, i) => (i === active ? `<b class="ap">${esc(p)}</b>` : esc(p))).join(', ');
    const tp = it.ctor ? `<span class="st">new</span> ` : `<span class="st">${esc(s.type || 'void')}</span> `;
    if (it.k === 'm')
      return `${tp}${owner ? `<span class="so">${esc(owner)}.</span>` : ''}<span class="sn">${esc(it.text)}</span>(${ps})`;
    if (it.k === 'e')
      return `<span class="st">event</span> <span class="so">${esc(owner || '')}.</span><span class="sn">${esc(it.text)}</span> <span class="st">(${esc(it.type)})</span>`;
    return `${tp}${owner ? `<span class="so">${esc(owner)}.</span>` : ''}<span class="sn">${esc(it.text)}</span>`;
  }
  function showDoc(it, el) {
    const b = docBox();
    const KL = KIND_LABEL();
    if (it.k === 'k' && !it.doc[0]) {
      b.hidden = true;
      return;
    }
    let h = `<div class="dk">${esc(KL[it.k] || '')}</div>`;
    if (it.k === 's')
      h += `<pre class="ds">${esc(
        it.body
          .replace(/\$\{\d+:([^}]*)\}/g, '$1')
          .replace(/\$\{CLASS\}/g, CTX ? CTX.cls : 'MainWindow')
          .replace(/\$0/, '')
          .replace(/\t/g, '    '),
      )}</pre>`;
    else if (it.k === 't' || it.k === 'k')
      h += `<div class="sg"><span class="sn">${esc(it.type || it.text)}</span></div>`;
    else if (it.k === 'v')
      h += `<div class="sg"><span class="st">${esc(it.type || 'var')}</span> <span class="sn">${esc(it.text)}</span></div>`;
    else
      (it.sigs || [{ params: '', type: it.type, doc: it.doc }]).slice(0, 4).forEach(s => {
        h += `<div class="sg">${sigText(it, s, it.owner)}</div>`;
      });
    const d = it.doc && L(it.doc[0], it.doc[1] || it.doc[0]);
    if (d) h += `<p>${esc(d)}</p>`;
    if (it.k === 's')
      h += `<p class="hint">${L('Enter lub Tab wstawia fragment.', 'Press Enter or Tab to insert.')}</p>`;
    b.innerHTML = h;
    b.hidden = false;
    const list = el.parentNode.getBoundingClientRect();
    const w = Math.min(360, innerWidth - 20);
    let x = list.right + 6;
    if (x + w > innerWidth - 8) x = Math.max(8, list.left - w - 6);
    b.style.left = x + 'px';
    b.style.top = Math.max(8, Math.min(list.top, innerHeight - b.offsetHeight - 8)) + 'px';
    b.style.width = w + 'px';
  }
  function hideDoc() {
    if (docEl) docEl.hidden = true;
  }
  function attachHintEvents(data) {
    if (!data) return data;
    CodeMirror.on(data, 'select', (c, el) => {
      if (c.it) showDoc(c.it, el);
      else if (c.doc) {
        showDoc(c.doc, el);
      }
    });
    CodeMirror.on(data, 'close', hideDoc);
    return data;
  }

  /* ---------- pomoc w sygnaturze (parametry metody) ---------- */
  let sigEl = null,
    sigOn = false;
  function sigBox() {
    if (!sigEl) {
      sigEl = document.createElement('div');
      sigEl.className = 'is-sig';
      sigEl.hidden = true;
      document.body.appendChild(sigEl);
    }
    return sigEl;
  }
  function hideSig() {
    sigOn = false;
    if (sigEl) sigEl.hidden = true;
  }
  function callContext(cm) {
    const cur = cm.getCursor();
    const startLine = Math.max(0, cur.line - 6);
    const text = cm.getRange({ line: startLine, ch: 0 }, cur);
    let d = 0,
      commas = 0,
      inStr = false;
    for (let i = text.length - 1; i >= 0; i--) {
      const c = text[i];
      if (c === '"' && text[i - 1] !== '\\') {
        inStr = !inStr;
        continue;
      }
      if (inStr) continue;
      if (c === ')' || c === ']' || c === '}') d++;
      else if (c === '(' || c === '[' || c === '{') {
        if (d === 0) {
          if (c !== '(') return null;
          const callee = chainBefore(text.slice(0, i));
          return callee ? { callee, active: commas } : null;
        }
        d--;
      } else if (c === ',' && d === 0) commas++;
      else if (c === ';' && d === 0) return null;
    }
    return null;
  }
  function resolveCallee(callee) {
    let m;
    if ((m = /^new\s+([\w.]+)(<[^>]*>)?$/.exec(callee))) {
      const u = USER[m[1]];
      if (u) {
        const cs = u.members.filter(x => x.kind === 'ctor');
        return {
          it: {
            k: 'm',
            ctor: true,
            text: m[1],
            sigs: (cs.length ? cs : [{ params: '' }]).map(c => ({ params: c.params || '', type: '', doc: ['', ''] })),
          },
          owner: '',
        };
      }
      const tn = m[1].split('.').pop();
      const ti = T[tn];
      if (ti && ti.ctors && ti.ctors.length) {
        const g = m[2] ? ptype2(tn + m[2]) : null;
        return {
          it: {
            k: 'm',
            ctor: true,
            text: tn,
            sigs: ti.ctors
              .slice()
              .sort((a, b) => pcount(a.params) - pcount(b.params))
              .map(c => ({ params: g ? subst(c.params, g) : c.params, type: '', doc: ['', ''] })),
          },
          owner: '',
        };
      }
      return null;
    }
    const segs = splitChain(callee);
    const last = segs.pop();
    const nm = (/^(\w+)/.exec(last) || [])[1];
    if (!nm) return null;
    let owner = null,
      isStatic = false;
    if (!segs.length) {
      owner = CTX.cls;
      const mm = member(owner, nm, false) || member(owner, nm, true);
      return mm && mm.kind === 'm' ? { it: fromMember(mm, owner), owner } : null;
    }
    if (segs.length === 1) {
      const h = headType(segs[0], 0);
      owner = h.t;
      isStatic = !!h.isStatic;
    } else owner = exprType(segs.join('.'));
    if (!owner) return null;
    const mm = member(owner, nm, isStatic);
    return mm && mm.kind === 'm' ? { it: fromMember(mm, ptype2(owner).display), owner: ptype2(owner).display } : null;
  }
  function updateSig(cm, force) {
    if (!force && !sigOn) return;
    buildCtx(cm);
    const cc = callContext(cm);
    if (!cc) return hideSig();
    const r = resolveCallee(cc.callee);
    if (!r) return hideSig();
    const b = sigBox();
    const sigs = r.it.sigs || [];
    const ok = sigs.filter(s => pcount(s.params) > cc.active);
    const show = (ok.length ? ok : sigs).slice(0, 4);
    let h = show.map(s => `<div class="sg">${sigText(r.it, s, r.owner, cc.active)}</div>`).join('');
    const d0 = show[0] && show[0].doc;
    const d = d0 && L(d0[0], d0[1] || d0[0]);
    if (d) h += `<p>${esc(d)}</p>`;
    if (sigs.length > show.length)
      h += `<p class="hint">${L(`+${sigs.length - show.length} przeciążenia`, `+${sigs.length - show.length} overloads`)}</p>`;
    b.innerHTML = h;
    b.hidden = false;
    sigOn = true;
    const c = cm.cursorCoords(null, 'window');
    const w = Math.min(460, innerWidth - 16);
    b.style.width = 'auto';
    b.style.maxWidth = w + 'px';
    b.style.left = Math.max(8, Math.min(c.left - 20, innerWidth - w - 8)) + 'px';
    b.style.top = Math.max(8, c.top - b.offsetHeight - 6) + 'px';
  }

  /* ---------- podgląd po najechaniu myszą ---------- */
  let hoverT = null,
    hoverEl = null;
  function hoverInfo(cm, e) {
    clearTimeout(hoverT);
    if (hoverEl) hoverEl.hidden = true;
    if (cm.state.completionActive) return;
    hoverT = setTimeout(() => {
      const pos = cm.coordsChar({ left: e.clientX, top: e.clientY }, 'window');
      const tok = cm.getTokenAt(pos, true);
      if (!tok || !/^[A-Za-z_]\w*$/.test(tok.string) || /comment|string/.test(tok.type || '')) return;
      const line = cm.getLine(pos.line);
      const end = tok.end;
      const before = line.slice(0, tok.start);
      cm.setCursor ? null : null;
      const fakeCm = {
        getValue: () => cm.getValue(),
        indexFromPos: () => cm.indexFromPos({ line: pos.line, ch: end }),
        getCursor: () => ({ line: pos.line, ch: end }),
      };
      buildCtx(fakeCm);
      let it = null;
      if (/\.\s*$/.test(before)) {
        const chain = chainBefore(before.replace(/\.\s*$/, ''));
        const segs = splitChain(chain);
        let t,
          st = false;
        if (segs.length === 1) {
          const h = headType(segs[0], 0);
          t = h.t;
          st = !!h.isStatic;
        } else t = exprType(chain);
        const m = t && member(t, tok.string, st);
        if (m) it = fromMember(m, ptype2(t).display);
      } else {
        const lt = localType(tok.string);
        if (lt || CTX.locals.has(tok.string)) it = { k: 'v', text: tok.string, type: lt || 'var', doc: ['', ''] };
        else {
          const m = member(CTX.cls, tok.string, false) || member(CTX.cls, tok.string, true);
          if (m) it = fromMember(m, CTX.cls);
          else if (USER[tok.string] || T[tok.string])
            it = {
              k: 't',
              text: tok.string,
              type: (USER[tok.string] ? USER[tok.string].kind + ' ' : '') + tok.string,
              doc: ['', ''],
            };
        }
      }
      if (!it) return;
      if (!hoverEl) {
        hoverEl = document.createElement('div');
        hoverEl.className = 'is-doc is-hover';
        document.body.appendChild(hoverEl);
      }
      const KL = KIND_LABEL();
      let h =
        `<div class="dk">${esc(KL[it.k] || '')}</div>` +
        (it.k === 't'
          ? `<div class="sg"><span class="sn">${esc(it.type)}</span></div>`
          : it.k === 'v'
            ? `<div class="sg"><span class="st">${esc(it.type)}</span> <span class="sn">${esc(it.text)}</span></div>`
            : (it.sigs || [])
                .slice(0, 3)
                .map(s => `<div class="sg">${sigText(it, s, it.owner)}</div>`)
                .join(''));
      const d = it.doc && L(it.doc[0], it.doc[1] || it.doc[0]);
      if (d) h += `<p>${esc(d)}</p>`;
      hoverEl.innerHTML = h;
      hoverEl.hidden = false;
      hoverEl.style.width = 'auto';
      hoverEl.style.maxWidth = '420px';
      hoverEl.style.left = Math.min(e.clientX + 8, innerWidth - 430) + 'px';
      hoverEl.style.top = e.clientY + 18 + 'px';
    }, 450);
  }

  /* ---------- XAML ---------- */
  const XAML_EXTRA_ELEMS = [
    'RowDefinition',
    'ColumnDefinition',
    'TabItem',
    'ComboBoxItem',
    'ListBoxItem',
    'ListViewItem',
    'MenuItem',
    'TreeViewItem',
    'StatusBarItem',
    'DataGridTextColumn',
    'DataGridCheckBoxColumn',
    'Separator',
    'Style',
    'Setter',
    'Run',
    'LineBreak',
    'Hyperlink',
    'SolidColorBrush',
    'LinearGradientBrush',
    'GradientStop',
    'Path',
    'Polyline',
    'GridSplitter',
    'ToolTip',
    'ContextMenu',
  ];
  function xamlContext(cm) {
    const cur = cm.getCursor();
    const text = cm.getRange({ line: 0, ch: 0 }, cur);
    const lt = text.lastIndexOf('<'),
      gt = text.lastIndexOf('>');
    if (lt <= gt) return { mode: 'text' };
    const tag = text.slice(lt);
    if (/^<!--/.test(tag)) return { mode: 'text' };
    let m;
    if ((m = /^<(\/?)([\w.:]*)$/.exec(tag)))
      return { mode: 'elem', close: !!m[1], prefix: m[2], before: text.slice(0, lt) };
    const nm = (/^<([\w.:]+)/.exec(tag) || [])[1];
    if (!nm) return { mode: 'text' };
    const q = (tag.match(/"/g) || []).length;
    if (q % 2 === 1) {
      const am = /([\w.:]+)\s*=\s*"([^"]*)$/.exec(tag);
      if (am) return { mode: 'value', elem: nm, attr: am[1], prefix: am[2] };
      return { mode: 'text' };
    }
    if ((m = /\s([\w.:]*)$/.exec(tag))) {
      const used = new Set([...tag.matchAll(/([\w.:]+)\s*=/g)].map(x => x[1]));
      return { mode: 'attr', elem: nm, prefix: m[1], used };
    }
    return { mode: 'text' };
  }
  function openElements(before) {
    const st = [];
    const re = /<(\/?)([\w.:]+)[^<>]*?(\/?)>/g;
    let m;
    while ((m = re.exec(before))) {
      if (m[1]) st.pop();
      else if (!m[3]) st.push(m[2]);
    }
    return st;
  }
  function xamlCompletions(cm) {
    const c = xamlContext(cm);
    const cur = cm.getCursor();
    const mk = (text, k, type, doc, extra) =>
      Object.assign({ text, k, type: type || '', doc: doc || ['', ''] }, extra || {});
    let items = [],
      prefix = '';
    if (c.mode === 'elem') {
      prefix = c.prefix;
      if (c.close) {
        const st = openElements(c.before);
        const last = st[st.length - 1];
        if (last) items.push(mk(last, 't', L('zamknięcie', 'closing tag'), ['', ''], { insert: last + '>' }));
      } else {
        const st = openElements(c.before);
        const parent = st[st.length - 1];
        Object.keys(TY).forEach(t =>
          items.push(
            mk(t, 'x', L('kontrolka', 'control'), [
              L('Kontrolka WPF z przybornika.', 'WPF control from the Toolbox.'),
              '',
            ]),
          ),
        );
        XAML_EXTRA_ELEMS.forEach(t => items.push(mk(t, 't', 'WPF')));
        if (parent && !parent.includes('.'))
          [
            'Resources',
            parent === 'Grid' ? 'RowDefinitions' : null,
            parent === 'Grid' ? 'ColumnDefinitions' : null,
            parent === 'DataGrid' ? 'Columns' : null,
            'ToolTip',
            'ContextMenu',
            'Background',
          ]
            .filter(Boolean)
            .forEach(p => items.push(mk(parent + '.' + p, 'p', L('element właściwości', 'property element'))));
      }
    } else if (c.mode === 'attr') {
      prefix = c.prefix;
      const t = c.elem;
      const keys =
        t === 'Window'
          ? [...WIN.pr, 'Width', 'Height']
          : TY[t]
            ? propKeys({ id: 'x', t }).filter(
                k => k !== 'Items' && !(t === 'DataGrid' && k === 'Columns') && !(t === 'RichTextBox' && k === 'Text'),
              )
            : [];
      const evs = t === 'Window' ? WIN.ev : TY[t] ? eventKeys({ id: 'x', t }) : [];
      if (!TY[t] && t !== 'Window') {
        (attrsFor(t) || []).forEach(k => items.push(mk(k, 'p')));
      }
      items.push(
        mk('x:Name', 'p', 'string', [L('Nazwa kontrolki używana w kodzie C#.', 'Control name used in C# code.'), '']),
      );
      keys.forEach(k => {
        const pt = ptype(t, k);
        items.push(
          mk(
            k,
            'p',
            Array.isArray(pt)
              ? k
              : pt === 'brush'
                ? 'Brush'
                : pt === 'bool'
                  ? 'bool'
                  : pt === 'text'
                    ? 'string'
                    : pt === 'thick' || pt === 'margin'
                      ? 'Thickness'
                      : 'double',
          ),
        );
      });
      evs.forEach(ev => items.push(mk(ev, 'e', EA[ev] || 'RoutedEventArgs')));
      if (T[t] && T[t].api) {
        const have = new Set(items.map(i => i.text));
        membersOf(t, false).forEach(m => {
          if (have.has(m.name)) return;
          if (
            m.kind === 'p' &&
            !m.ro &&
            !/^(Resources|Triggers|Template|Style|InputBindings|CommandBindings)$/.test(m.name)
          )
            items.push(mk(m.name, 'p', m.type, m.doc));
          else if (m.kind === 'e') items.push(mk(m.name, 'e', m.type, m.doc));
        });
      }
      [
        'Grid.Row',
        'Grid.Column',
        'Grid.RowSpan',
        'Grid.ColumnSpan',
        'Canvas.Left',
        'Canvas.Top',
        'DockPanel.Dock',
        'Panel.ZIndex',
        'Style',
        'DataContext',
      ].forEach(k => items.push(mk(k, 'p', L('dołączona', 'attached'))));
      items = items.filter(i => !c.used.has(i.text));
      items.forEach(i => {
        i.insert = i.text + '=""';
        i.caretBack = 1;
        i.retrigger = true;
      });
    } else if (c.mode === 'value') {
      prefix = c.prefix;
      const t = c.elem,
        a = c.attr;
      const pt = TY[t] || t === 'Window' ? ptype(t === 'Window' ? 'Window' : t, a) : null;
      const isEv = ALL_EVENTS.has(a);
      if (isEv) {
        refreshUser();
        const mw = USER.MainWindow;
        const nameM = /x:Name="(\w+)"/.exec(cm.getLine(cur.line));
        const own = (nameM && nameM[1]) || t;
        items.push(
          mk(`${own}_${a}`, 'm', L('nowa metoda', 'new handler'), [
            L('Utworzy metodę w MainWindow.xaml.cs.', 'Creates a method in MainWindow.xaml.cs.'),
            '',
          ]),
        );
        (mw ? mw.members.filter(m => m.kind === 'm' && /sender/.test(m.params || '')) : []).forEach(m =>
          items.push(mk(m.name, 'm', 'void', [L('Istniejąca metoda obsługi.', 'Existing handler.'), ''])),
        );
      } else if (Array.isArray(pt))
        items = (
          a === 'FirstDayOfWeek' ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] : pt
        ).map(v => mk(v, 'c', a));
      else if (pt === 'bool') items = ['True', 'False'].map(v => mk(v, 'c', 'bool'));
      else if (pt === 'brush') items = NAMED.map(v => mk(v, 'c', 'Brush', ['', ''], { color: v }));
      else if (a === 'Grid.Row' || a === 'Grid.Column') items = ['0', '1', '2', '3'].map(v => mk(v, 'c', 'int'));
      else if (a === 'DockPanel.Dock') items = ['Left', 'Top', 'Right', 'Bottom'].map(v => mk(v, 'c', 'Dock'));
      else if (/^(Width|Height)$/.test(a)) items = [mk('Auto', 'c', 'double')];
      else if (pt === 'source') items = Object.keys(P.assets).map(v => mk(v, 'c', L('zasób', 'resource')));
      items.forEach(i => {
        i.insertValue = true;
      });
    } else return null;
    const list = rank(items, prefix).slice(0, prefix ? 400 : 1200);
    if (!list.length) return null;
    return {
      list: list.map(it => {
        const h = toHint(it, prefix);
        h.hint = (cm2, data) => {
          const to = data.to;
          let txt = it.insert || it.text;
          if (it.insertValue) {
            const ln = cm2.getLine(to.line);
            const q = ln.indexOf('"', to.ch);
            const endTo = q >= 0 ? { line: to.line, ch: q } : to;
            cm2.replaceRange(txt, data.from, endTo);
            cm2.setCursor({ line: data.from.line, ch: data.from.ch + txt.length + (q >= 0 ? 1 : 0) });
            const at = xamlContextAttr(cm2, data.from);
            if (ALL_EVENTS.has(at) && it.k === 'm') ensureHandler(it.text, at);
            return;
          }
          cm2.replaceRange(txt, data.from, to);
          if (it.caretBack) cm2.setCursor({ line: data.from.line, ch: data.from.ch + txt.length - it.caretBack });
          if (it.retrigger) setTimeout(() => show(cm2, 'xaml'), 0);
        };
        return h;
      }),
      from: CodeMirror.Pos(cur.line, cur.ch - prefix.length),
      to: cur,
    };
  }
  function xamlContextAttr(cm, pos) {
    const ln = cm.getLine(pos.line).slice(0, pos.ch);
    const m = /([\w.:]+)\s*=\s*"$/.exec(ln);
    return m ? m[1] : '';
  }
  function applyXamlFromEditor() {
    /* odświeżenie modelu następuje przez zdarzenie zmiany edytora */
  }

  /* ---------- wyzwalanie ---------- */
  function show(cm, kind) {
    if (!cm.showHint) return;
    const fn = kind === 'xaml' ? xamlCompletions : csCompletions;
    cm.showHint({
      hint: c => attachHintEvents(fn(c)),
      completeSingle: false,
      closeCharacters: kind === 'xaml' ? /[\s>"=]/ : /[\s()\[\]{};:>,=+\-*\/&|!?<]/,
      alignWithWord: true,
      container: document.body,
    });
  }
  function attachCs(cm) {
    cm.on('inputRead', (c, ch) => {
      let t = ch.text.join('');
      if (t === '()' || t === '[]') t = t[0];
      if (t.length !== 1) return;
      const cur = c.getCursor();
      const tok = c.getTokenAt(cur);
      const inStrCom = /comment|string/.test(tok.type || '');
      if (t === '(' || t === ',') {
        if (!inStrCom) updateSig(c, true);
        return;
      }
      if (t === ')') {
        setTimeout(() => updateSig(c, false), 0);
        return;
      }
      if (inStrCom) return;
      if (t === '.') {
        const before = c.getLine(cur.line).slice(0, cur.ch);
        if (/(^|[^\w.])\d+\.$/.test(before)) return;
        show(c, 'cs');
        return;
      }
      if (/[A-Za-z_]/.test(t) && !c.state.completionActive) {
        const before = c.getLine(cur.line).slice(0, cur.ch);
        if (/(^|[^\w.])[A-Za-z_]$/.test(before) || /\.[A-Za-z_]$/.test(before)) show(c, 'cs');
      }
    });
    cm.on('keyHandled', (c, name) => {
      if (name === "'('" || name === "'['") setTimeout(() => updateSig(c, true), 0);
    });
    cm.on('cursorActivity', c => {
      if (sigOn) updateSig(c, false);
    });
    cm.on('blur', () => {
      hideSig();
    });
    cm.on('keydown', (c, e) => {
      if (e.key === 'Escape') hideSig();
    });
    cm.getWrapperElement().addEventListener('mousemove', e => hoverInfo(cm, e));
    cm.getWrapperElement().addEventListener('mouseleave', () => {
      clearTimeout(hoverT);
      if (hoverEl) hoverEl.hidden = true;
    });
    cm.on('scroll', () => {
      hideSig();
      hideDoc();
      if (hoverEl) hoverEl.hidden = true;
    });
  }
  function attachXaml(cm) {
    cm.on('inputRead', (c, ch) => {
      const t = ch.text.join('');
      if (t.length !== 1) return;
      if (c.state.completionActive) return;
      if (t === '<' || t === ' ' || t === '"' || t === '/' || /[A-Za-z]/.test(t)) {
        const ctx = xamlContext(c);
        if (ctx.mode === 'text') return;
        if (t === ' ' && ctx.mode !== 'attr') return;
        if (/[A-Za-z]/.test(t) && ctx.prefix && ctx.prefix.length > 1) return;
        if (t === '/' && !(ctx.mode === 'elem' && ctx.close)) return;
        show(c, 'xaml');
      }
    });
  }
  T.FrameworkElement.base = 'UIElement';
  def(
    'UIElement',
    'Visual',
    `
m|Focus||bool|Ustawia fokus klawiatury.|Sets keyboard focus.
p|IsVisible||bool|Czy element jest widoczny.|Whether the element is visible.`,
  );
  def('Visual', 'DependencyObject', ``);
  def('DependencyObject', 'object', ``);
  Object.keys(TY).forEach(t => {
    if (TY[t].k === 'pnl' && T[t]) T[t].base = 'Panel';
  });
  def(
    'Panel',
    'FrameworkElement',
    `p|Children||UIElementCollection|Kontrolki wewnątrz panelu.|The child elements.
p|Background||Brush|Tło panelu.|Panel background.`,
  );
  T.Window.base = 'ContentControl';
  def('ContentControl', 'Control', `p|Content||object|Zawartość.|The content.`);
  [
    'Button',
    'Label',
    'CheckBox',
    'RadioButton',
    'ToggleButton',
    'RepeatButton',
    'ScrollViewer',
    'GroupBox',
    'Expander',
  ].forEach(t => {
    if (T[t]) T[t].base = 'ContentControl';
  });
  return {
    API,
    GEN,
    chainOf,
    indexerOf,
    elemType,
    attachCs,
    attachXaml,
    show,
    updateSig,
    hideSig,
    membersOf,
    exprType,
    buildCtx,
    csCompletions,
    xamlCompletions,
    typeInfo,
    T,
    refreshUser,
    USER: () => USER,
    ptype2,
  };
})();
