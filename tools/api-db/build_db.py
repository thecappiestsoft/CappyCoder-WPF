import json, re, sys
sys.path.insert(0,'.')
from parse_ref import parse
WPF_NS = {'System.Windows','System.Windows.Controls','System.Windows.Controls.Primitives','System.Windows.Shapes','System.Windows.Input','System.Windows.Media','System.Windows.Media.Imaging','System.Windows.Media.Animation','System.Windows.Media.Effects','System.Windows.Documents','System.Windows.Threading','System.Windows.Data','System.Windows.Ink','System.Windows.Markup'}
SYS_TYPES = set('Object String Int32 Int64 Int16 Byte SByte UInt16 UInt32 UInt64 Double Single Decimal Char Boolean Math MathF Convert DateTime DateTimeOffset TimeSpan DateOnly TimeOnly DayOfWeek Random Array Enum Exception EventArgs EventHandler Guid Environment StringComparison StringSplitOptions MidpointRounding Uri UriKind Nullable IDisposable IFormatProvider ICloneable IComparable IEquatable IFormattable BitConverter Console ConsoleColor ConsoleKey Action Func Predicate Comparison Type Attribute ValueType Delegate MulticastDelegate GC'.split())
EXC_RE = re.compile(r'Exception$')
GEN_NS = {'System.Collections.Generic','System.Collections','System.Collections.ObjectModel','System.Collections.Specialized','System.Linq'}
OTHER = {'System.Text':{'StringBuilder'},'System.Threading.Tasks':{'Task'},'System.Diagnostics':{'Stopwatch','Debug','Trace','Process'},'System.Globalization':{'CultureInfo','NumberStyles'},'System.IO':{'File','Directory','StreamReader','StreamWriter','TextReader','TextWriter','FileInfo','DirectoryInfo','FileMode','SearchOption'},'System.ComponentModel':{'CancelEventArgs','CancelEventHandler','INotifyPropertyChanged','PropertyChangedEventArgs','PropertyChangedEventHandler'},'System.Text.RegularExpressions':{'Regex','Match','MatchCollection','Group','RegexOptions'},'System.Threading':{'Thread','CancellationToken'}}
SKIP_COLL = {'PriorityQueue','SortedSet','LinkedListNode','ReferenceEqualityComparer','CollectionExtensions','OrderedDictionary','BitArray','Comparer','EqualityComparer','StructuralComparisons'}
def flt(ns, name):
    if ns in WPF_NS: return True
    if ns=='System': return name in SYS_TYPES or EXC_RE.search(name) is not None
    if ns in GEN_NS: return name not in SKIP_COLL
    if ns in OTHER: return name in OTHER[ns]
    return False
DB={}
for f in ['WindowsBase.cs','PresentationCore.cs','PresentationFramework.cs','System.Runtime.cs','System.Collections.cs','System.Linq.cs','System.Console.cs','System.ObjectModel.cs','System.ComponentModel.Primitives.cs','System.ComponentModel.cs','System.Text.RegularExpressions.cs']:
    t=parse(f, flt)
    for k,v in t.items():
        if k in DB:
            if DB[k]['k']==v['k'] and DB[k].get('ns')!=v.get('ns'): continue
            DB[k]['m'] += v['m']
            if not DB[k].get('base') and v.get('base'): DB[k]['base']=v['base']
        else: DB[k]=v
BAD=re.compile(r'\*|Span<|Memory<|\bnint\b|\bnuint\b|Utf8|IntPtr|ReadOnlySequence|Vector|Int128|Half\b|ISpanFormattable|ICustomMarshaler|TypedReference|ArgIterator|RuntimeMethodHandle')
for k,v in DB.items():
    v['m']=[m for m in v['m'] if not BAD.search(m[2]+'|'+m[3]+'|'+m[1])]
    v['ifs']=[i for i in v.get('ifs',[]) if not BAD.search(i)]
# odchudzenie: pomiń pola *Property i *Event (DependencyProperty/RoutedEvent) — VS je pokazuje, ale zostawiamy tylko w typach z przybornika
n=sum(len(v['m']) for v in DB.values())
print('types',len(DB),'members',n)
for k in ['TextBox','Button','Window','FrameworkElement','UIElement','string','int','Math','List`1','List','Dictionary`2','IEnumerable`1','Enumerable','MessageBox','Brushes','Key','DispatcherTimer','RoutedEventHandler','Visibility','Thickness','Color','ItemCollection','CheckBox','ToggleButton']:
    v=DB.get(k); print(k, None if not v else (v['k'], v.get('base'), len(v['m']), v.get('gen')))

