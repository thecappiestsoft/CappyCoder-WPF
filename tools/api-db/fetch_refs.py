"""Pobiera oficjalne pliki referencyjne API (.NET 10 / WPF) z GitHuba do tools/api-db/refs/.

Pliki *ref/*.cs to publiczne API zestawów — ten sam opis typów, z którego korzysta kompilator.
"""
import os, urllib.request

WPF = 'https://raw.githubusercontent.com/dotnet/wpf/main/src/Microsoft.DotNet.Wpf/src/{0}/ref/{0}.cs'
RT = 'https://raw.githubusercontent.com/dotnet/runtime/main/src/libraries/{0}/ref/{0}.cs'
FILES = [WPF.format(n) for n in ['PresentationFramework', 'PresentationCore', 'WindowsBase']] + [
    RT.format(n) for n in ['System.Runtime', 'System.Collections', 'System.Linq', 'System.Console', 'System.ObjectModel',
                           'System.ComponentModel.Primitives', 'System.ComponentModel', 'System.Text.RegularExpressions']]

dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'refs')
os.makedirs(dst, exist_ok=True)
for url in FILES:
    name = url.rsplit('/', 1)[1]
    with urllib.request.urlopen(url, timeout=60) as r:
        data = r.read()
    open(os.path.join(dst, name), 'wb').write(data)
    print(f'{name:45} {len(data)//1024:6} KB')
