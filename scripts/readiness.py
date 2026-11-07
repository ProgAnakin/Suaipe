"""Validate and render the 317-control register; never infer approval from code presence."""
import argparse
import collections
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--render', action='store_true')
parser.add_argument('--real-data', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
data = json.loads((root / 'docs/readiness/controls.json').read_text())
controls = data['controls']
allowed = {'verificado_localmente', 'parcial', 'pendente_externo', 'nao_aplicavel_ao_escopo'}
assert len(controls) == 317 and len({r['id'] for r in controls}) == 317
for row in controls:
    assert row['status'] in allowed and row['requirement'] and row['remaining_action'] and row['owner']
    assert row['source_document'] == 3 and row['source_line'] > 0 and row['evidence']
    for target in row['evidence']:
        assert (root / target).is_file(), f"Missing evidence for {row['id']}: {target}"
counts = dict(collections.Counter(r['status'] for r in controls))
assert counts == data['statuses']
if args.render:
    lines = ['# Matriz dos 317 controles', '',
             '07/11/2026. Portfólio sintético atual; operação futura com dados reais permanece **NO-GO**.', '',
             '311 IDs originais foram preservados; COOKIE-01 a COOKIE-06 identificam os seis checkboxes sem código. '
             'Os outros dois arquivos enviados têm o mapeamento por seção no [registro estruturado](controls.json), que inclui hashes das três fontes, evidências por item, responsável e próxima ação.', '',
             'Verificado localmente comprova somente um artefato/teste local; parcial combina implementação com validação restante; '
             'pendente externo exige painel, pessoa, fornecedor ou avaliação própria; não aplicável é restrito ao escopo atual. '
             'Nenhum estado significa certificação de segurança ou conformidade. As alegações estatísticas/legais dos textos não foram tomadas como fatos verificados.', '',
             '| Estado | Controles |', '|---|---|']
    lines += [f'| {key} | {value} |' for key, value in counts.items()]
    lines += ['', 'Contexto: [escopo/riscos](scope-and-risks.md), [privacidade](privacy-operations.md), '
              '[incidentes/recuperação](incident-and-recovery.md), [dependências](dependency-review.md).', '']
    group = None
    for row in controls:
        prefix = row['id'].rsplit('-', 1)[0]
        if prefix != group:
            lines += [f'## {prefix}', '', '| ID | Requisito original | Estado | Próxima ação / limite |', '|---|---|---|---|']
            group = prefix
        cells = [row['id'], row['requirement'], row['status'], row['remaining_action']]
        lines.append('| ' + ' | '.join(x.replace('|', '\\|').replace('\n', ' ') for x in cells) + ' |')
    (root / 'docs/readiness/README.md').write_text('\n'.join(lines) + '\n')
print(json.dumps({'controls': len(controls), 'statuses': counts, 'real_customer_data': data['decision']['real_customer_data']}))
if args.real_data:
    raise SystemExit('Real-data release blocked: hosted validation, owner/legal review, recovery and alerts are not confirmed.')
