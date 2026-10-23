"""
Confere se o site está coerente com o catálogo oficial (Montador de Pedidos Cavaletti).
Só lê os arquivos; não altera nada.

Uso (dentro da pasta do site):
    python ferramentas/conferir_site.py ["caminho do montador.html"]

Sai com código 1 se encontrar problema. Confere:
  1. o site foi gerado do montador atual (mesma assinatura do arquivo);
  2. todo produto/código do site existe no catálogo, na mesma linha;
  3. todo modelo publicável do catálogo está no site;
  4. revestimentos e cores do site são exatamente os do catálogo;
  5. nenhum preço, desconto ou custo aparece nos arquivos públicos do site.
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gerar_catalogo as G  # mesmas regras de leitura do gerador

SITE = G.SITE


def main():
    caminho = sys.argv[1] if len(sys.argv) > 1 else G.PADRAO
    D, md5 = G.ler_montador(caminho)
    site = json.load(open(os.path.join(SITE, 'catalog-data.json'), encoding='utf-8'))
    erros, avisos = [], []

    # 1) assinatura
    if site['meta'].get('montadorMd5') != md5:
        erros.append('O catálogo mudou depois da última geração do site: rode ferramentas/gerar_catalogo.py.')

    # 2) códigos e linhas
    F = D['fams']
    linha_do_codigo = {}
    for it in D['items']:
        if it[3] and not it[5] and not G.fora_do_site(it[4]):
            linha_do_codigo.setdefault(it[3], set()).add(F[it[0]]['nome'])
    descs = {G.limpa(it[4]) for it in D['items'] if not it[5]}
    for p in site['products']:
        for v in p.get('variacoes', []):
            if v['codigo'] and p['line'] not in linha_do_codigo.get(v['codigo'], ()):
                erros.append(f"{p['id']}: código {v['codigo']} não existe na linha {p['line']} do catálogo")
            if v['descricao'] not in descs:
                erros.append(f"{p['id']}: configuração não existe no catálogo: {v['descricao'][:80]}")

    # 3) cobertura: todo código de produto das linhas publicáveis está no site
    RULES = {f['id']: D['matrix'].get(f['id'], []) for f in F}
    visivel = {f['nome'] for f in F if RULES[f['id']] or f.get('plast') or f.get('corFixa')}
    no_site = {v['codigo'] for p in site['products'] for v in p.get('variacoes', []) if v['codigo']}
    faltam = sorted({c for c, ls in linha_do_codigo.items() if ls & visivel and c not in no_site})
    if faltam:
        erros.append(f'{len(faltam)} códigos do catálogo não estão no site: ' + ', '.join(faltam[:20]))

    # 4) revestimentos e cores
    for nome, cores in site['revestimentos'].items():
        if nome.startswith('Plástico '):
            ref = [D['plCores'][k] for k in D['plRows'].get(nome[9:], [])]
        elif nome == 'PP (plástico)':
            ref = D['pp']
        elif nome.startswith('Lâmina do encosto '):
            fid = next((f['id'] for f in F if f['nome'] == nome[18:]), None)
            ref = ((D.get('laminas') or {}).get(fid) or {}).get('cores', [])
        else:
            ref = D['cores'].get('CEC - Stilo' if nome == 'CEC-Stilo' else nome)
        if ref is None:
            erros.append(f'revestimento "{nome}" não existe no catálogo')
            continue
        if [(c['nome'], c['codigo'], c['hex']) for c in cores] != [(c[0], c[1] or '', c[2]) for c in ref]:
            erros.append(f'cores de "{nome}" diferentes do catálogo')
    for p in site['products']:
        fid = next(f['id'] for f in F if f['nome'] == p['line'])
        aceitos = {G.nome_tecido(D['rows'][r]) for r in RULES[fid]}
        for r in p['revestimentos'] + p['telas']:
            if r in site['revestimentos'] and not (r in aceitos or r.startswith(('Plástico ', 'PP', 'Lâmina'))):
                erros.append(f"{p['id']}: {r} não é aceito pela linha {p['line']} no catálogo")

    # 5) nenhum preço nos arquivos públicos
    publicos = ['catalog-data.json', 'product-images.json', 'index.html', 'catalogo.html', 'produto.html', 'color-data.js', 'orcamento.js']
    for arq in publicos:
        txt = open(os.path.join(SITE, arq), encoding='utf-8').read()
        if arq.endswith('.json'):
            if re.search(r'R\$|"(preco|price|valor|desconto|custo)"\s*:', txt, re.I):
                erros.append(f'{arq}: tem campo de preço ou "R$"')
        elif re.search(r'R\$\s*\d', txt):
            erros.append(f'{arq}: mostra valor em R$')
    precos = {e[3] for it in D['items'] for e in it[7]}
    numeros = set(float(x.replace('.', '').replace(',', '.')) for x in re.findall(r'\b\d{1,3}(?:\.\d{3})*,\d{2}\b', open(os.path.join(SITE, 'catalog-data.json'), encoding='utf-8').read()))
    if numeros & precos:
        erros.append('catalog-data.json tem valores no formato de preço: ' + ', '.join(map(str, sorted(numeros & precos)[:10])))

    # 6) fotos: só originais da Cavaletti, salvas no próprio site, do mesmo modelo
    galeria = json.load(open(os.path.join(SITE, 'product-images.json'), encoding='utf-8'))
    for p in site['products']:
        srcs = [p['image']] + galeria.get(p['id'], []) if p['image'] else galeria.get(p['id'], [])
        for src in srcs:
            if not src.startswith('img/cavaletti/'):
                erros.append(f"{p['id']}: foto fora das originais da Cavaletti: {src[:80]}")
            elif not os.path.exists(os.path.join(SITE, src)):
                erros.append(f"{p['id']}: arquivo de foto não encontrado: {src}")
        mod = p['code'].replace('.', '')
        for f in p.get('fotos', []):
            if mod and mod not in f['legenda'].replace('.', ''):
                erros.append(f"{p['id']}: foto de outro modelo ({f['legenda'][:60]})")
    sem_foto = [p['id'] for p in site['products'] if not p['image']]
    if sem_foto:
        avisos.append(f'{len(sem_foto)} produtos sem foto oficial no site da Cavaletti: ' + ', '.join(sem_foto[:15]) + (' …' if len(sem_foto) > 15 else ''))

    print(f"Site: {len(site['products'])} produtos, {len(no_site)} códigos Cavaletti, {len(site['revestimentos'])} revestimentos.")
    for a in avisos:
        print('AVISO:', a)
    if erros:
        print(f'\n{len(erros)} PROBLEMA(S):')
        for e in erros[:60]:
            print(' -', e)
        sys.exit(1)
    print('\nOK: o site está coerente com o catálogo e não mostra preços.')


if __name__ == '__main__':
    main()
