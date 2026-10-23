"""
Busca no site oficial da Cavaletti (www.cavaletti.com.br) as configurações de cada linha
— código, descrição, medidas e foto original — e baixa as fotos para dentro do site.

Uso (dentro da pasta do site):
    python ferramentas/baixar_fotos_cavaletti.py

Gera:
    ferramentas/cavaletti/configuracoes.json   lista oficial por linha
    img/cavaletti/<linha>/<arquivo>.jpg         fotos originais (e, nas linhas de COMPONENTES,
                                                as ilustrações oficiais dos acessórios)
Depois rode ferramentas/gerar_catalogo.py (ele usa estas fotos) e ferramentas/conferir_site.py.
Pode rodar de novo quando a Cavaletti atualizar o site: só baixa o que ainda não tem.
"""
import html, json, os, re, sys, time, urllib.request

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://www.cavaletti.com.br'
DEST = os.path.join(SITE, 'ferramentas', 'cavaletti')
IMG = os.path.join(SITE, 'img', 'cavaletti')
UA = {'User-Agent': 'Mozilla/5.0 (Assistec - revenda autorizada Cavaletti)'}


def get(url, json_=False):
    req = urllib.request.Request(url, headers=dict(UA, **({'X-Requested-With': 'XMLHttpRequest'} if json_ else {})))
    with urllib.request.urlopen(req, timeout=60) as r:
        dados = r.read()
    return json.loads(dados) if json_ else dados


# Linhas cujos acessórios só têm ilustração oficial (componentes da página da linha), sem foto
# de configuração. Liberado pelo usuário em 23/10/2026 só para a Float.
COMPONENTES = {'float'}


def componentes(slug):
    """Ilustrações oficiais dos componentes da página da linha (legenda começa com o nº do modelo)."""
    pag = get(f'{BASE}/produtos/{slug}').decode('utf-8', 'replace')
    itens = []
    for cap, img in re.findall(r'data-caption="([^"]*)"\s+href="[^"]*/storage/(produto-componente/[^"]+)"', pag):
        m = re.match(r'(\d{2})\.?(\d{3})\s+(.*)', html.unescape(cap).strip())
        if m and img not in [i['imagem'] for i in itens]:
            itens.append({'id': 'componente-' + os.path.basename(img).rsplit('.', 1)[0], 'codigo': f'{m[1]}.{m[2]}',
                          'descricao': m[3], 'observacao': 'Ilustração oficial Cavaletti', 'imagem': img})
    return itens


def main():
    os.makedirs(DEST, exist_ok=True)
    home = get(BASE + '/').decode('utf-8', 'replace')
    linhas = sorted(set(re.findall(r'href="https://www\.cavaletti\.com\.br/produtos/([a-z0-9-]+)"', home)))
    print(len(linhas), 'linhas no site da Cavaletti')
    tudo, baixadas, erros = {}, 0, []
    for slug in linhas:
        itens, off = [], 0
        while True:
            d = get(f'{BASE}/produtos/{slug}/load-more?offset={off}', json_=True)
            itens += d['items']
            off += len(d['items'])
            if not d.get('hasMore') or not d['items']:
                break
            time.sleep(0.3)
        if slug in COMPONENTES:
            itens += componentes(slug)
        for it in itens:
            if not it.get('imagem'):
                continue
            arq = os.path.join(IMG, slug, os.path.basename(it['imagem']))
            it['arquivo'] = os.path.relpath(arq, SITE).replace('\\', '/')
            if os.path.exists(arq):
                continue
            os.makedirs(os.path.dirname(arq), exist_ok=True)
            try:
                dados = get(f"{BASE}/storage/{it['imagem']}")
                with open(arq, 'wb') as o:
                    o.write(dados)
                baixadas += 1
                time.sleep(0.2)
            except Exception as e:
                erros.append(f"{slug} {it['codigo']}: {e}")
                it.pop('arquivo')
        tudo[slug] = itens
        print(f'  {slug}: {len(itens)} configurações')
    with open(os.path.join(DEST, 'configuracoes.json'), 'w', encoding='utf-8') as o:
        json.dump({'origem': BASE, 'baixadoEm': time.strftime('%Y-%m-%d %H:%M'), 'linhas': tudo}, o, ensure_ascii=False, indent=1)
    print(f'{sum(len(v) for v in tudo.values())} configurações; {baixadas} fotos novas baixadas.')
    for e in erros:
        print('ERRO:', e)


if __name__ == '__main__':
    main()
