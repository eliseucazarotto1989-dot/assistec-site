"""
Gera os dados do catálogo do site a partir do Montador de Pedidos Cavaletti.

O montador é a fonte oficial e só é LIDO aqui (nunca gravado). Saem dele, para o site:
linhas, modelos, descrições das configurações com código Cavaletti, estruturas,
revestimentos aceitos (regra de tecido), cores com código e fotos.
NENHUM preço, desconto ou custo vai para o site (regra da Cavaletti).

Uso (dentro da pasta do site):
    python ferramentas/gerar_catalogo.py ["caminho do montador.html"]

Gera:
    catalog-data.json     produtos por modelo + revestimentos e cores
    product-images.json   galeria de fotos de cada produto
    (fotos: só as originais da Cavaletti, baixadas antes por ferramentas/baixar_fotos_cavaletti.py)
Depois rode ferramentas/conferir_site.py para checar a coerência.
"""
import collections, datetime, hashlib, json, os, re, sys, unicodedata

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PADRAO = os.path.join(os.path.dirname(SITE), 'CAVALETTI CATALOGO NOVO', 'Montador de Pedidos Cavaletti.html')
ANTIGO = os.path.join(SITE, 'ferramentas', 'site-antigo')   # dados do site antigo: só para reaproveitar a categoria de cada modelo


def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', str(s or '')) if unicodedata.category(c) != 'Mn').lower()


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', norm(s)).strip('-')


def limpa(d):
    return re.sub(r'\s*,\s*', ', ', re.sub(r'\s+', ' ', str(d))).strip()


def ler_montador(caminho):
    with open(caminho, 'rb') as f:
        bruto = f.read()
    html = bruto.decode('utf-8')
    m = re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S)
    if not m:
        sys.exit('Não achei os dados dentro do montador: ' + caminho)
    return json.loads(m.group(1)), hashlib.md5(bruto).hexdigest()


# ---------- regras iguais às do montador ----------
def e_tela(n):
    return n.startswith('Tela ') or n == 'Tecido Aura'


def nome_tecido(n):
    return 'CEC-Stilo' if n == 'CEC - Stilo' else n


ABREV = [(r'\bPolt\b\.?\s*', 'Poltrona '), (r'\bCad\.\s*', 'Cadeira '), (r'\bGirat\.?(?![a-zà-ú])\s*', 'Giratória '),
         (r'\bPresid\.\s*', 'Presidente '), (r'\bSecret\.\s*', 'Secretária '), (r'\bAprox\.\s*', 'Aproximação '),
         (r'\bAudit\.\s*', 'Auditório '), (r'\bConj\.\s*', 'Conjunto '), (r'\bExec\.\s*', 'Executiva ')]


def expande(txt):
    for a, b in ABREV:
        txt = re.sub(a, b, txt)
    return re.sub(r'\s+', ' ', txt).strip().rstrip('.-, ')


def nome_modelo(desc):
    return expande(re.sub(r'\s*\([^)]*\)', '', re.split(r',(?![^()]*\))', desc)[0]))


def nome_comum(descs, mod):
    """Nome do modelo: o começo da primeira variação até o nº do modelo, mais as palavras
    seguintes que todas as variações têm em comum (ex.: 'Poltrona Giratória 16501 AC')."""
    primeiros = [re.sub(r'\s*\([^)]*\)', '', re.split(r',(?![^()]*\))', d)[0]).split() for d in descs]
    base = primeiros[0]
    if not mod:
        return nome_modelo(descs[0])
    k = next((i for i, t in enumerate(base) if t.replace('.', '').startswith(mod)), None)
    if k is None:
        return nome_modelo(descs[0])
    nome = base[:k + 1]
    for j in range(k + 1, len(base)):
        if base[j] in ('-', '–') or not all(len(p) > j and p[j] == base[j] for p in primeiros):
            break
        nome.append(base[j])
    return expande(' '.join(nome))


# nº do modelo (36.635 ou 36635); medidas como "1200mm", "1200 x 700" ou "x 1015" não contam
RE_MODELO = re.compile(r'(?<![\d,.])(?<!x )(?<!x)(\d{2}\.\d{3}|\d{4,5})(?![\d,]|\.\d|\s*mm|\s*x\s*\d)')


def modelo_de(desc):
    primeiro = re.split(r',(?![^()]*\))', desc)[0]
    m = RE_MODELO.search(primeiro) or RE_MODELO.search(desc)
    return m.group(1).replace('.', '') if m else None


def fmt_modelo(m):
    return f'{m[:-3]}.{m[-3:]}' if m and len(m) >= 4 else (m or '')


# Itens do catálogo que NÃO vão para o site: peças de reposição, acessórios e derivações de cor
# (continuam no montador para pedidos). Para publicar algum, é só tirar a palavra daqui.
# (vale só para o começo da descrição, que é o nome do item: "Cad. ... s/ Capa" continua no site)
FORA_DO_SITE = re.compile(r'^(capa\b|conjunto capa|carrinho|base aluminio|conjunto estofado|conjunto apoio de cabeca|'
                          r'eletrificacao|conector\b|conectividade|grade para organizacao|extensao do encosto|'
                          r'(pp|pol|vnl)\b.*derivacao)')


def fora_do_site(desc):
    return bool(FORA_DO_SITE.search(norm(desc).strip()))


CATEGORIA_POR_PALAVRA = [
    (r'audit', 'Poltronas Auditório'), (r'longarina|\d\s*lugares|lugares', 'Longarinas'),
    (r'sofa|puff|ottoman|lounge|modular|hub', 'Sofás e Lounges'), (r'banqueta|mocho|stool', 'Banquetas e Mochos'),
    (r'\bmesa|aparador|tampo', 'Mesas'), (r'presid', 'Cadeiras Presidente'), (r'diretor', 'Cadeiras Diretor'),
    (r'executiva', 'Cadeiras Executiva'), (r'secret|operacional', 'Cadeiras Operacional'),
    (r'espera', 'Poltronas de Espera'), (r'aprox', 'Cadeiras de Aproximação'), (r'girat', 'Cadeiras Giratória'),
    (r'fixa|cadeira', 'Cadeiras Fixas'), (r'poltrona', 'Poltronas')]
TIPO = {'Cadeiras Giratória': 'Giratória', 'Cadeiras Fixas': 'Fixa', 'Cadeiras de Aproximação': 'Aproximação',
        'Cadeiras Presidente': 'Presidente', 'Cadeiras Diretor': 'Diretor', 'Cadeiras Executiva': 'Executiva',
        'Cadeiras Operacional': 'Operacional', 'Poltronas': 'Poltrona', 'Poltronas Auditório': 'Auditório',
        'Poltronas de Espera': 'Espera', 'Banquetas e Mochos': 'Banqueta', 'Sofás e Lounges': 'Sofá',
        'Mesas': 'Mesa', 'Longarinas': 'Longarina', 'Complementos': 'Complemento'}


def categoria_por_texto(desc):
    d = norm(desc)
    for re_, cat in CATEGORIA_POR_PALAVRA:
        if re.search(re_, d):
            return cat
    return 'Complementos'


# Itens que a foto mostra e que precisam existir em alguma configuração do catálogo (se não forem "opcionais")
RECURSOS_DA_FOTO = [('pranch', ('pran',)), ('apoio de cabeca', ('apoio de cabeca', ' ac ', ' ac,'))]


def foto_do_catalogo(it, descs, mod):
    """A configuração da foto da Cavaletti existe no catálogo? Confere as letras depois do número do modelo
    (4.006 PUE, 47.301 AC, 40.202 SR, 36.075 3L...) e o que a foto mostra (prancheta, apoio de cabeça)."""
    ds = [' ' + norm(d) + ' ' for d in descs if mod and mod in norm(d).replace('.', '')]
    if not ds:
        return True
    toks = re.findall(r'[a-z]+|\d+l\b', norm(re.sub(r'\d{1,2}\.?\d{3}', '', it['codigo'])).replace('modelo', ''))

    def tem(t, d):
        w = set(re.findall(r'[a-z0-9]+', d))
        if t in w or t + 'i' in w:                       # Z da Cavaletti = ZI no catálogo (braço integrado)
            return True
        m = re.fullmatch(r'(\d)l', t)
        if m:
            return bool(re.search(m[1] + r'\s*l(ugar(es)?)?\b', d))
        return {'ac': 'apoio de cabeca', 'rod': 'rod', 'in': 'intern', 'ex': 'extern'}.get(t, '\0') in d
    if toks and not any(all(tem(t, d) for t in toks) for d in ds):
        return False
    texto = norm(' / '.join(x for x in (it.get('descricao'), it.get('observacao')) if x))
    for parte in re.split(r'[/·|]', texto):
        if re.search(r'opcion|opcao|opção', parte):
            continue
        for recurso, no_catalogo in RECURSOS_DA_FOTO:
            if recurso in parte and not any(k in d for d in ds for k in no_catalogo):
                return False
    return True


def main():
    caminho = sys.argv[1] if len(sys.argv) > 1 else PADRAO
    D, md5 = ler_montador(caminho)
    F, I, ROWS, SUBS = D['fams'], D['items'], D['rows'], D['subs']
    RULES = {f['id']: [ROWS[r] for r in D['matrix'].get(f['id'], [])] for f in F}
    visivel = lambda f: bool(RULES[f['id']]) or bool(f.get('plast')) or bool(f.get('corFixa'))

    # ---------- categoria de cada modelo (a mesma usada no site antigo; sem fotos) ----------
    cat_antiga = json.load(open(os.path.join(ANTIGO, 'categorias.json'), encoding='utf-8'))['categorias']

    # ---------- revestimentos e cores ----------
    revest = {}

    def usa(nome, cores):
        if nome not in revest:
            revest[nome] = [{'nome': c[0], 'codigo': c[1] or '', 'hex': c[2]} for c in cores]
        return nome

    cav = json.load(open(os.path.join(SITE, 'ferramentas', 'cavaletti', 'configuracoes.json'), encoding='utf-8'))['linhas']
    modelos_cavaletti = {x.replace('.', '') for its in cav.values() for it in its for x in re.findall(r'\d{1,2}\.?\d{3}', it['codigo'])}

    produtos = collections.OrderedDict()
    fora_lista = []
    for it in I:
        fi, sub, pg, cod, desc, comp, ph, precos = it
        f = F[fi]
        if comp or not visivel(f):
            continue
        desc = limpa(desc)
        if fora_do_site(desc):
            fora_lista.append(f"{f['nome']}: {desc[:70]}")
            continue
        mod = modelo_de(desc)
        if not mod and re.match(r'[MD]\d{5}', cod or '') and cod[1:6] in modelos_cavaletti:
            mod = cod[1:6]       # descrição sem o nº (ex.: puffs da Fun/Spin): o código Cavaletti começa por ele
        chave = (f['id'], mod or norm(nome_modelo(desc)))
        if chave not in produtos:
            produtos[chave] = {'f': f, 'mod': mod, 'nome': nome_modelo(desc), 'subs': [], 'var': collections.OrderedDict(),
                               'estr': [], 'rev': [], 'telas': [], 'texto': []}
        P = produtos[chave]
        if SUBS[sub] not in P['subs']:
            P['subs'].append(SUBS[sub])
        P['texto'].append(desc)
        v = P['var'].setdefault((desc, cod), {'descricao': desc, 'codigo': cod or '', 'estruturas': []})
        regra = RULES[f['id']]
        for e in precos:
            st, tipo, tecidos = e[0], e[1], e[2]
            if st and st not in v['estruturas']:
                v['estruturas'].append(st)
            if st and st not in P['estr']:
                P['estr'].append(st)
            nomes = []
            if tipo == 'FAB':
                nomes = [t for t in (tecidos or []) if t in regra]
            elif tipo == 'PP':
                nomes = ['PP']
            elif tipo in ('PLAST', 'EMB'):
                linha_pl = D['subPlast'].get(str(sub))
                if linha_pl:
                    nomes = ['Plástico ' + linha_pl]
            elif tipo == 'FIX' and f['id'] == 'Gamer':
                nomes = [t for t in regra if not e_tela(t)]
            for n in nomes:
                if n == 'PP':
                    nm = usa('PP (plástico)', D['pp'])
                elif n.startswith('Plástico '):
                    nm = usa(n, [D['plCores'][k] for k in D['plRows'][n[9:]]])
                else:
                    nm = usa(nome_tecido(n), D['cores'].get(n, []))
                if nm not in P['rev']:
                    P['rev'].append(nm)
        dn = norm(desc)
        # assento estofado em linha de plástico (ex.: Viva 35007 SE)
        if re.search(r'estofad', dn) and not re.search(r's/ ?estofad|sem estofad', dn) and any(e[1] in ('PLAST', 'EMB') for e in precos):
            for t in regra:
                if not e_tela(t):
                    nm = usa(nome_tecido(t), D['cores'].get(t, []))
                    if nm not in P['rev']:
                        P['rev'].append(nm)
        # encosto em tela
        if re.search(r'\btela\b', dn) and not re.search(r'tela (preta|cinza)|tecido\b', dn):
            telas = [t for t in regra if t.startswith('Tela ')]
            dicas = [('newnet', 'Tela NewNet'), ('flip', 'Tela Flip'), ('velo', 'Tela V2'), ('v2', 'Tela V2'), ('air', 'Tela Air'),
                     ('mimic', 'Tela Mimic'), ('c3', 'Tela C3'), ('c4', 'Tela C4')]
            ach = [n for h, n in dicas if re.search(r'tela\s+' + h, dn)]
            if ach:
                telas = [t for t in telas if t in ach]
            for t in telas:
                nm = usa(t, D['cores'].get(t, []))
                if nm not in P['telas']:
                    P['telas'].append(nm)
        # lâmina do encosto plástico (ex.: Artis 50101)
        lam = (D.get('laminas') or {}).get(f['id'])
        if lam and re.search(r'enc\.? plastico', dn):
            nm = usa('Lâmina do encosto ' + f['nome'], lam['cores'])
            if nm not in P['telas']:
                P['telas'].append(nm)

    # ---------- fotos: só as originais do site da Cavaletti (ferramentas/baixar_fotos_cavaletti.py) ----------
    cav_mod =collections.defaultdict(list)          # nº do modelo -> [(linha no site Cavaletti, configuração)]
    for cslug, its in cav.items():
        for it in its:
            for m in dict.fromkeys(x.replace('.', '') for x in re.findall(r'\d{1,2}\.?\d{3}', it['codigo'])):
                if it.get('arquivo'):
                    cav_mod[m].append((cslug, it))
    usados_cav = set()

    def slug_cavaletti(f):
        s = slug(f['nome'])
        return s if s in cav else {'gamer': 'way-gamer', 'prime': 'prime-e-master', 'master': 'prime-e-master'}.get(s, '')

    saida, galeria = [], {}
    ids = collections.Counter()
    for (fid, _), P in produtos.items():
        f = P['f']
        cs = slug_cavaletti(f)
        confs = cav_mod.get(P['mod'] or '', [])
        # a mesma numeração pode existir em outra linha da Cavaletti: prefere a da própria linha
        confs = [c for c in confs if c[0] == cs] or confs
        # só fotos de configurações que existem no catálogo (sem prancheta, apoio de cabeça etc. que ele não tem)
        descs = [v['descricao'] for v in P['var'].values()]
        confs = [c for c in confs if foto_do_catalogo(c[1], descs, P['mod'] or '')]
        fotos = []
        for cslug, it in confs:
            usados_cav.add((cslug, it['id']))
            leg = ' · '.join(x.strip() for x in (it['codigo'], it.get('descricao') or '', it.get('observacao') or '') if x and x.strip())
            if it['arquivo'] not in [x['src'] for x in fotos]:
                fotos.append({'src': it['arquivo'], 'legenda': leg})
        imagens = [x['src'] for x in fotos]
        cat = cat_antiga.get(P['mod'] or '') or categoria_por_texto(' '.join(P['texto'][:3]))
        base = f"{slug(f['nome'])}-{P['mod'] or slug(P['nome'])[:40]}"
        ids[base] += 1
        pid = base if ids[base] == 1 else f'{base}-{ids[base]}'
        variacoes = list(P['var'].values())
        nome = nome_comum([v['descricao'] for v in variacoes], P['mod'])
        if f['nome'].split()[0].lower() not in norm(nome):
            nome += ' - Linha ' + f['nome']
        prod = {
            'id': pid, 'code': fmt_modelo(P['mod']), 'name': nome, 'line': f['nome'],
            'lineSlug': cs or (confs[0][0] if confs else ''),
            'category': cat, 'type': TIPO.get(cat, ''), 'image': imagens[0] if imagens else '',
            'fotos': fotos,
            'estruturas': P['estr'], 'revestimentos': P['rev'], 'telas': P['telas'],
            'variacoes': variacoes,
        }
        saida.append(prod)
        galeria[pid] = imagens[1:]

    # ordem padrão do catálogo: modelos com foto oficial primeiro, depois por linha e modelo
    saida.sort(key=lambda p: (not p['image'], norm(p['line']), p['code'] or p['name']))
    cats = collections.Counter(p['category'] for p in saida)
    dados = {
        'meta': {
            'fonte': 'Montador de Pedidos Cavaletti (catálogo oficial ajustado)',
            'montadorMd5': md5,
            'geradoEm': datetime.datetime.now().isoformat(timespec='seconds'),
            'totalProducts': len(saida), 'totalLines': len({p['line'] for p in saida}),
            'categories': dict(cats.most_common()),
            'aviso': 'Gerado automaticamente. Não edite à mão: rode ferramentas/gerar_catalogo.py.'
        },
        'revestimentos': revest,
        'products': saida,
    }
    with open(os.path.join(SITE, 'catalog-data.json'), 'w', encoding='utf-8') as o:
        json.dump(dados, o, ensure_ascii=False, indent=1)
    with open(os.path.join(SITE, 'product-images.json'), 'w', encoding='utf-8') as o:
        json.dump(galeria, o, ensure_ascii=False)

    print(f'{len(fora_lista)} itens de peças/acessórios deixados fora do site (ver FORA_DO_SITE).')
    fora = sorted(f['nome'] for f in F if not visivel(f))
    print(f'{len(saida)} produtos (modelos) em {dados["meta"]["totalLines"]} linhas; {len(revest)} revestimentos com cores.')
    print(f'fotos originais da Cavaletti em {sum(1 for p in saida if p["image"])} produtos; sem foto: {sum(1 for p in saida if not p["image"])}.')
    sobra = sorted({(s, it['codigo'], (it.get('descricao') or '').strip()) for s, its in cav.items() for it in its if (s, it['id']) not in usados_cav})
    print(f'{len(sobra)} configurações do site da Cavaletti sem modelo no catálogo (não publicadas):')
    for s, c, d in sobra:
        print(f'   {s}: {c} {d}')
    print('linhas fora do montador (sem regra de tecido), não publicadas:', ', '.join(fora))


if __name__ == '__main__':
    main()
