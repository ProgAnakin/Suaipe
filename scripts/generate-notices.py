"""Generate third-party acknowledgements from the installed, locked dependency tree."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
modules = (root / 'node_modules').resolve()
packages = json.loads((root / 'package-lock.json').read_text())['packages']
sections = ['THIRD-PARTY NOTICES\nGenerated from installed dependencies; includes build tooling.\n'
            'Each component retains its own license. This is not a rights review of product images, videos or trademarks.\n']
count = 0
for relative in sorted(packages):
    directory = root / relative
    manifest = directory / 'package.json'
    if not relative or not manifest.is_file() or not manifest.resolve().is_relative_to(modules):
        continue
    package = json.loads(manifest.read_text())
    sections.append(f"\n{'=' * 70}\n{package.get('name')} {package.get('version')}\nDeclared license: {package.get('license', 'See package terms')}\n")
    notices = [p for p in directory.iterdir() if p.is_file() and p.name.upper().split('.')[0] in {'LICENSE','LICENCE','COPYING','NOTICE'} and p.resolve().is_relative_to(modules)]
    if not notices:
        sections.append('No license text shipped at the package root; see the package registry and upstream terms.\n')
    for notice in sorted(notices):
        sections.append(f'\n--- {notice.name} ---\n' + notice.read_text(errors='replace') + '\n')
    count += 1
text = '\n'.join(line.rstrip() for line in '\n'.join(sections).splitlines()).rstrip() + '\n'
(root / 'public/third-party-notices.txt').write_text(text)
print(f'Generated notices for {count} installed dependency entries.')
