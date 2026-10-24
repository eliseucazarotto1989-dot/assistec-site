/* Assistec — Showroom Cavaletti.
   Lê catalog-data.json (gerado do Montador de Pedidos por ferramentas/gerar_catalogo.py). Nunca mostra preços.
   Cada página diz qual tela é em <body data-pagina="inicio|catalogo|produto|projeto|texto">. */
(() => {
    const WHATS = '555537981003';
    // Banco de dados do site (Supabase). A chave é a pública: o visitante só consegue ENVIAR pedidos,
    // quem lê é a equipe, no Montador (regras em ferramentas/pedidos_site.sql).
    const SB_URL = 'https://lhnlwlelabgdgdhozhpe.supabase.co';
    const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobmx3bGVsYWJnZGdkaG96aHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTc1NDUsImV4cCI6MjA4ODkzMzU0NX0.K0IWRdkpFyY_zbIzoBNSgJK8wPUO_DqEUam7U35lDC0';
    const CHAVE = 'assistecProjeto';
    const pagina = document.body.dataset.pagina;
    const app = document.getElementById('app');
    let D = null, P = [], porId = {}, linhas = [];

    // Fotos reais de clientes para a seção "Projetos na região" da página inicial.
    // A seção só aparece quando houver fotos aqui. Ex.: { src: 'img/clientes/escritorio.jpg', legenda: 'Escritório X — Rodeio Bonito' }
    const FOTOS_CLIENTES = [];

    // ---------- utilidades ----------
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const slug = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const titulo = p => p.name.replace(/\s+-\s+Linha\s+.*$/i, '').replace(/\s+Linha\s+[\wÀ-ú /]+$/i, '').trim();
    const seta = '<span class="seta" aria-hidden="true"></span>';
    const plural = (n, s, pl) => `${n.toLocaleString('pt-BR')} ${n === 1 ? s : pl}`;
    const semFoto = p => `<div class="sem-foto"><div><b>${esc(p.line)}</b><span>Imagem em breve</span></div></div>`;
    const imgOu = p => p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : semFoto(p);
    const urlProduto = id => 'produto.html?id=' + encodeURIComponent(id);
    const urlLinha = (sl, cat) => 'catalogo.html?linha=' + sl + (cat ? '&cat=' + cat : '');
    const urlAmbiente = (id, cat) => 'catalogo.html?ambiente=' + id + (cat ? '&cat=' + cat : '');
    const param = k => new URLSearchParams(location.search).get(k) || '';

    // Ambientes = agrupamento das categorias do catálogo
    const AMBIENTES = [
        { id: 'trabalho', nome: 'Estações de trabalho', desc: 'Giratórias para o dia inteiro, do operacional ao presidente.',
          cats: ['Cadeiras Giratória', 'Cadeiras Operacional', 'Cadeiras Executiva', 'Cadeiras Diretor', 'Cadeiras Presidente'], capa: 'artis-50101' },
        { id: 'reuniao', nome: 'Reunião e aproximação', desc: 'Cadeiras fixas, de aproximação e mesas.',
          cats: ['Cadeiras de Aproximação', 'Cadeiras Fixas', 'Mesas'], capa: 'match-46206' },
        { id: 'espera', nome: 'Recepção e espera', desc: 'Longarinas e poltronas para quem chega.',
          cats: ['Longarinas', 'Poltronas de Espera'], capa: 'raya-36306' },
        { id: 'lounge', nome: 'Lounge e colaborativo', desc: 'Sofás, poltronas e banquetas para conversar e criar.',
          cats: ['Sofás e Lounges', 'Poltronas', 'Banquetas e Mochos'], capa: 'boldy-31117' },
        { id: 'auditorio', nome: 'Auditório e treinamento', desc: 'Poltronas para plateias e salas de aula.',
          cats: ['Poltronas Auditório'], capa: '' },
    ];
    const DESTAQUES = ['yon-47301', 'artis-50101', 'bee-36704', 'solo-36101'];
    const COLECOES_HOME = ['Artis', 'Yon', 'Bee', 'Boldy', 'Float', 'Match', 'Pibou', 'Talk'];

    function capaAmbiente(a) {
        const itens = P.filter(p => a.cats.includes(p.category));
        const capa = porId[a.capa] && porId[a.capa].image ? porId[a.capa] : itens.find(p => p.image);
        return { ...a, itens, capa };
    }

    // ---------- projeto (fica guardado neste navegador) ----------
    const Projeto = {
        novo: () => ({ cliente: { nome: '', telefone: '' }, ambientes: [] }),
        ler() {
            try {
                const pr = JSON.parse(localStorage.getItem(CHAVE)) || this.novo();
                pr.cliente = { nome: pr.cliente?.nome || '', telefone: pr.cliente?.telefone || '' };   // só nome e telefone
                return pr;
            } catch { return this.novo(); }
        },
        salvar(pr) { try { localStorage.setItem(CHAVE, JSON.stringify(pr)); } catch { } atualizaConta(); },
        total: pr => pr.ambientes.reduce((t, a) => t + a.itens.reduce((s, i) => s + i.qtd, 0), 0),
        adicionar(nomeAmb, pid, qtd, conf) {
            const pr = this.ler();
            let amb = pr.ambientes.find(a => a.nome.toLowerCase() === nomeAmb.toLowerCase());
            if (!amb) { amb = { id: 'a' + Date.now().toString(36), nome: nomeAmb, itens: [] }; pr.ambientes.push(amb); }
            const chave = JSON.stringify(conf);
            const igual = amb.itens.find(i => i.pid === pid && JSON.stringify(i.conf) === chave);
            if (igual) igual.qtd += qtd; else amb.itens.push({ pid, qtd, conf });
            this.salvar(pr);
            return amb;
        },
    };

    function atualizaConta(pulsar) {
        const el = document.getElementById('conta');
        if (!el) return;
        el.textContent = Projeto.total(Projeto.ler());
        if (pulsar) { el.classList.remove('pulsa'); void el.offsetWidth; el.classList.add('pulsa'); }
    }

    let toastTimer;
    function aviso(p, amb, qtd) {
        const t = document.getElementById('toast');
        t.innerHTML = `${p.image ? `<img src="${esc(p.image)}" alt="">` : ''}
            <div><b>${qtd}× ${esc(titulo(p))}</b><small>adicionado em “${esc(amb.nome)}”</small></div>
            <a href="projeto.html">Ver pedido</a>`;
        t.classList.add('mostra');
        document.body.classList.add('tem-toast');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { t.classList.remove('mostra'); document.body.classList.remove('tem-toast'); }, 4200);
        atualizaConta(true);
    }

    // ---------- busca (modelo, código Cavaletti, nome, linha) ----------
    function buscar(q) {
        const toks = norm(q).split(/\s+/).filter(Boolean);
        if (!toks.length) return [];
        return P.filter(p => {
            const texto = norm([p.name, p.line, p.category, ...p.variacoes.map(v => v.descricao)].join(' '));
            const mod = (p.code || '').replace(/\D/g, '');
            return toks.every(t => {
                const dig = t.replace(/[.\-]/g, '');
                if (/^\d+$/.test(dig)) {
                    // número: começo do nº do modelo ou número inteiro na descrição (não pedaço de outro número);
                    // dentro do código Cavaletti só a partir de 8 dígitos, para "1001" não achar códigos que só contêm esses dígitos
                    return mod.startsWith(dig) || (dig.length >= 8 && p.variacoes.some(v => norm(v.codigo).includes(dig)))
                        || new RegExp('(^|\\D)' + dig + '(\\D|$)').test(texto.replace(/(\d)\.(\d{3})/g, '$1$2'));
                }
                if (/^[a-z]\d/.test(t)) return p.variacoes.some(v => norm(v.codigo).includes(t));
                return texto.includes(t);
            });
        }).sort((a, b) => (!!b.image - !!a.image));
    }

    // ---------- pedaços comuns ----------
    function grade(lista) {
        return `<div class="grade">${lista.map(p => `
            <a class="card" href="${urlProduto(p.id)}">
                <div class="card-foto">${imgOu(p)}<span class="add" aria-hidden="true">+ Pedido</span></div>
                <div class="card-txt"><small>${esc(p.line)}</small><h3>${esc(titulo(p))}</h3><span>Modelo ${esc(p.code || '—')} · ${plural(p.variacoes.length, 'configuração', 'configurações')}</span></div>
            </a>`).join('')}</div>`;
    }

    function filtrosDe(lista, ativo, base) {
        const cont = {};
        lista.forEach(p => { cont[p.category] = (cont[p.category] || 0) + 1; });
        const cats = Object.keys(cont).sort((a, b) => cont[b] - cont[a]);
        if (cats.length < 2) return '';
        return `<div class="filtros"><div class="wrap" style="display:flex;gap:10px;flex-wrap:wrap">
            <a class="chip${ativo ? '' : ' ativo'}" href="${base('')}">Todos <small>${lista.length}</small></a>
            ${cats.map(c => `<a class="chip${ativo === slug(c) ? ' ativo' : ''}" href="${base(slug(c))}">${esc(c)} <small>${cont[c]}</small></a>`).join('')}
        </div></div>`;
    }

    const cabecalho = (migalha, h1, sub, extra = '') => `
        <section class="cab-pagina"><div class="wrap">
            <nav class="migalha" aria-label="Você está em">${migalha}</nav>
            <h1 class="display">${h1}</h1>
            <div class="sub">${sub}</div>${extra}
        </div></section>`;

    const caixaBusca = (q = '') => `
        <form class="busca" id="busca" action="catalogo.html" role="search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="search" name="q" value="${esc(q)}" placeholder="Modelo, código Cavaletti ou nome — ex.: 47301" aria-label="Buscar no catálogo">
            <button class="btn btn-marinho" type="submit">Buscar</button>
        </form>`;

    // ---------- página inicial ----------
    function telaInicio() {
        const dest = DESTAQUES.map(id => porId[id]).filter(p => p && p.image);
        const ambs = AMBIENTES.map(capaAmbiente);
        const cols = COLECOES_HOME.map(n => linhas.find(l => l.nome === n)).filter(Boolean);
        const ex = ['yon-47301', 'match-46206', 'raya-36306'].map(id => porId[id]).filter(Boolean);

        app.innerHTML = `
        <section class="hero">
            <div class="wrap">
                <div class="surge">
                    <div class="selo-cavaletti">
                        <img src="img/cavaletti/marca/cavaletti-logo.png" alt="Cavaletti — Cadeiras Profissionais" width="62" height="58">
                        <div><b>Revenda autorizada Cavaletti</b><span>Rodeio Bonito/RS e região</span></div>
                    </div>
                    <h1 class="display">Ambientes que <em>trabalham</em> com você.</h1>
                    <p class="lead">Mais de ${Math.floor(P.length / 100) * 100} modelos de cadeiras, sofás e mesas Cavaletti. Monte o pedido de cada sala e receba o orçamento pelo WhatsApp — sem compromisso.</p>
                    <div class="hero-acoes">
                        <a href="catalogo.html" class="btn btn-marinho">Explorar coleções ${seta}</a>
                        <a href="catalogo.html?ver=ambientes" class="btn btn-contorno">Escolher por ambiente</a>
                    </div>
                </div>
                <div class="hero-palco surge" id="palco">
                    ${dest.map((p, i) => `<a href="${urlProduto(p.id)}" class="hero-slide${i ? '' : ' ativo'}" aria-label="${esc(p.name)}"${i ? ' tabindex="-1"' : ''}>
                        <img src="${esc(p.image)}" alt="${esc(p.name)}"${i ? ' loading="lazy"' : ''}></a>`).join('')}
                    <div class="hero-legenda">
                        <div><small id="heroLinha">Linha ${esc(dest[0]?.line || '')}</small><strong id="heroNome">${esc(dest[0] ? titulo(dest[0]) : '')}</strong></div>
                        <div class="hero-pontos">${dest.map((p, i) => `<button class="${i ? '' : 'ativo'}" data-i="${i}" aria-label="Destaque ${i + 1}"></button>`).join('')}</div>
                    </div>
                </div>
            </div>
        </section>

        ${placar()}

        <section class="secao" id="ambientes">
            <div class="wrap">
                <div class="secao-cab surge">
                    <div><span class="rotulo">Por ambiente</span><h2 class="display">Comece pelo espaço, não pelo catálogo.</h2></div>
                    <p>Escolha o ambiente e veja só o que faz sentido para ele. Depois é só montar o pedido sala por sala.</p>
                </div>
                <div class="ambientes">${ambs.map(cartaoAmbiente).join('')}</div>
            </div>
        </section>

        <section class="secao" style="padding-top:0">
            <div class="wrap">
                <div class="secao-cab surge">
                    <div><span class="rotulo">Coleções</span><h2 class="display">Linhas com personalidade.</h2></div>
                    <a href="catalogo.html" class="link-seta">Ver as ${linhas.length} linhas ${seta}</a>
                </div>
                <div class="colecoes">
                    ${cols.map((l, i) => `<a class="col surge" href="${urlLinha(l.slug)}">
                        ${i === 0 ? '<span class="fundo-foto"></span>' : ''}
                        ${l.capa ? `<img src="${esc(l.capa.image)}" alt="" loading="lazy">` : ''}
                        <div class="topo-col"><small>${plural(l.itens.length, 'modelo', 'modelos')}</small><span class="ir">${seta}</span></div>
                        <div class="rodape-col"><h3>${esc(l.nome)}</h3>${i === 0 ? `<p>${esc(l.cats.slice(0, 3).join(' · '))}</p>` : ''}</div>
                    </a>`).join('')}
                </div>
                <div style="margin-top:40px">${caixaBusca()}<p class="dica-busca">Recebeu um modelo da Cavaletti? Digite o número ou o código e encontre aqui.</p></div>
            </div>
        </section>

        <section class="secao fundo-marinho">
            <div class="wrap">
                <div class="secao-cab surge">
                    <div><span class="rotulo claro">Pedido por ambiente</span><h2 class="display">Monte cada ambiente.<br><em>Receba tudo em um só orçamento.</em></h2></div>
                    <p>Em vez de pedir item por item, você organiza o pedido por ambiente — do jeito que vai ser usado.</p>
                </div>
                <div class="passos surge">
                    <div class="passo"><div class="num">01</div><h3>Escolha e configure</h3><p>Estrutura, revestimento e cor de cada modelo, com o código oficial Cavaletti.</p></div>
                    <div class="passo"><div class="num">02</div><h3>Separe por ambiente</h3><p>“Recepção”, “Sala de reunião”, “Diretoria”… com a quantidade de cada um.</p></div>
                    <div class="passo"><div class="num">03</div><h3>Envie com um toque</h3><p>O pedido chega organizado no nosso WhatsApp, ou vira um PDF para você compartilhar.</p></div>
                </div>
                <div class="exemplo-projeto">
                    <div class="surge">
                        <p style="font-size:20px;color:rgba(255,255,255,.8);max-width:26em">Assim o seu pedido chega até nós: claro para você aprovar na empresa, completo para a gente orçar sem idas e vindas.</p>
                        <div class="hero-acoes"><a href="catalogo.html?ver=ambientes" class="btn btn-claro">Montar meu pedido ${seta}</a></div>
                    </div>
                    <div class="cartao surge" aria-label="Exemplo de pedido">
                        <span class="rotulo">Exemplo de pedido</span>
                        <div class="amb-nome" style="margin-top:16px">Sala de reunião</div>
                        ${ex[0] ? `<div class="linha-item"><img src="${esc(ex[0].image)}" alt=""><div><b>${esc(titulo(ex[0]))}</b><span>Estrutura Preta · Grid Cinza</span></div><span class="qtd">8×</span></div>` : ''}
                        ${ex[1] ? `<div class="linha-item"><img src="${esc(ex[1].image)}" alt=""><div><b>${esc(titulo(ex[1]))}</b><span>Concha plástica</span></div><span class="qtd">4×</span></div>` : ''}
                        <div class="amb-nome" style="margin-top:16px">Recepção</div>
                        ${ex[2] ? `<div class="linha-item"><img src="${esc(ex[2].image)}" alt=""><div><b>${esc(titulo(ex[2]))}</b><span>Base 4 pés</span></div><span class="qtd">2×</span></div>` : ''}
                    </div>
                </div>
            </div>
        </section>

        ${FOTOS_CLIENTES.length ? `<section class="secao">
            <div class="wrap">
                <div class="secao-cab surge">
                    <div><span class="rotulo">Projetos na região</span><h2 class="display">Quem já trabalha melhor.</h2></div>
                    <p>Escritórios, clínicas e escolas que a Assistec mobiliou.</p>
                </div>
                <div class="galeria-clientes">${FOTOS_CLIENTES.map(f => `<figure class="surge"><img src="${esc(f.src)}" alt="${esc(f.legenda)}" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--raio-g)"><figcaption class="legenda-foto">${esc(f.legenda)}</figcaption></figure>`).join('')}</div>
            </div>
        </section>` : ''}

        <section class="secao" id="informatica"${FOTOS_CLIENTES.length ? ' style="padding-top:0"' : ''}>
            <div class="wrap">
                <div class="info surge">
                    <div class="info-esq">
                        <span class="rotulo">Assistec Informática</span>
                        <h2 class="display">Também cuidamos dos seus computadores.</h2>
                        <p>Desde 2018 levando tecnologia e atendimento de perto para Rodeio Bonito e o Alto Uruguai gaúcho.</p>
                        <a class="btn btn-whats" href="https://wa.me/${WHATS}?text=${encodeURIComponent('Olá! Preciso de assistência em informática.')}" target="_blank" rel="noopener">Falar no WhatsApp</a>
                    </div>
                    <div class="info-dir">
                        ${[['Manutenção de computadores', 'Reparo preventivo e corretivo de desktops e notebooks', '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'],
                           ['Venda de equipamentos', 'Computadores, notebooks, impressoras e acessórios', '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'],
                           ['Automação comercial', 'PDV, impressoras fiscais e leitores de código', '<path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M7 12h10"/>'],
                           ['Suprimentos', 'Tintas, toners, cartuchos, cabos e periféricos', '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z"/>']]
                          .map(([t, d, ic]) => `<div class="servico"><span class="ic"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic}</svg></span><div><b>${t}</b><span>${d}</span></div></div>`).join('')}
                    </div>
                </div>
            </div>
        </section>`;
        iniciaHero(dest);
        if (location.hash) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 50);
    }

    // Letreiro tipo placa de estádio. Fatos tirados do site oficial da Cavaletti
    // (institucional: A Cavaletti, Nossa história, Certificações, Sustentabilidade — out/2026).
    function placar() {
        const frases = [
            `<b>${P.length}</b> modelos Cavaletti`,
            'Desde <b>1974</b> fazendo cadeiras',
            'Qualidade certificada <b>ISO 9001</b>',
            'Testadas em <b>laboratório próprio</b> de ensaios mecânicos',
            'Resistência e durabilidade: diretrizes da <b>ABNT NBR 13962</b>',
            'Ergonomia segundo a <b>NR 17</b>',
            'Pintura com <b>processo certificado</b>',
            'Madeira com certificação <b>FSC®</b> e <b>PEFC</b>',
            '<b>40%</b> da energia da fábrica é solar',
            'Fábrica de <b>108 mil m²</b> em Erechim/RS',
            'Uma das principais marcas da <b>América Latina</b>',
            '“Fazer bem feito, <b>sempre</b>.”',
        ];
        const grupo = '<img class="placar-logo" src="img/cavaletti/marca/cavaletti-logo-branco.png" alt="" width="54" height="50">' +
            frases.map(f => `<span class="placar-item">${f}</span><span class="seta" aria-hidden="true"></span>`).join('');
        const texto = frases.map(f => f.replace(/<[^>]+>/g, '')).join('. ');
        return `<section class="placar" aria-label="${esc(texto)}">
            <div class="placar-trilho" aria-hidden="true"><div class="placar-grupo">${grupo}</div><div class="placar-grupo">${grupo}</div></div>
        </section>`;
    }

    const cartaoAmbiente = a => `<a class="amb surge" href="${urlAmbiente(a.id)}">
        <div class="amb-foto">${a.capa ? `<img src="${esc(a.capa.image)}" alt="" loading="lazy">` : ''}</div>
        <div class="amb-txt"><h3>${esc(a.nome)}</h3><p>${esc(a.desc)}</p><span class="n">${plural(a.itens.length, 'modelo', 'modelos')} ${seta}</span></div></a>`;

    function iniciaHero(dest) {
        const palco = document.getElementById('palco');
        if (!palco || dest.length < 2) return;
        const slides = palco.querySelectorAll('.hero-slide'), pontos = palco.querySelectorAll('.hero-pontos button');
        let i = 0, timer;
        const vai = n => {
            i = (n + dest.length) % dest.length;
            slides.forEach((s, k) => { s.classList.toggle('ativo', k === i); s.tabIndex = k === i ? 0 : -1; });
            pontos.forEach((b, k) => b.classList.toggle('ativo', k === i));
            document.getElementById('heroNome').textContent = titulo(dest[i]);
            document.getElementById('heroLinha').textContent = 'Linha ' + dest[i].line;
        };
        const roda = () => { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => vai(i + 1), 5000); };
        pontos.forEach(b => b.addEventListener('click', () => { vai(+b.dataset.i); roda(); }));
        roda();
    }

    // ---------- catálogo: coleções, linha, ambiente, busca ----------
    function telaCatalogo() {
        const q = param('q'), sl = param('linha'), amb = param('ambiente'), cat = param('cat'), ver = param('ver');
        const inicio = '<a href="index.html">Início</a>/';
        if (q) {
            const res = buscar(q);
            document.title = `Busca: ${q} · Assistec`;
            app.innerHTML = cabecalho(`${inicio}<a href="catalogo.html">Coleções</a>/<span>Busca</span>`, 'Busca',
                `<span>${plural(res.length, 'modelo encontrado', 'modelos encontrados')} para “${esc(q)}”</span>`, caixaBusca(q)) +
                `<div class="wrap">${res.length ? grade(res) : `<p class="sem-resultado">Nada encontrado. Confira o número do modelo ou <a class="link-seta" href="https://wa.me/${WHATS}?text=${encodeURIComponent('Olá! Procuro o modelo Cavaletti ' + q)}" target="_blank" rel="noopener">pergunte pelo WhatsApp ${seta}</a></p>`}</div>`;
            return;
        }
        if (sl) {
            const l = linhas.find(x => x.slug === sl);
            if (!l) return naoAchou('Esta linha não está no catálogo.');
            const lista = cat ? l.itens.filter(p => slug(p.category) === cat) : l.itens;
            document.title = `Linha ${l.nome} · Cavaletti · Assistec`;
            app.innerHTML = cabecalho(`${inicio}<a href="catalogo.html">Coleções</a>/<span>${esc(l.nome)}</span>`, esc(l.nome),
                `<span>${plural(l.itens.length, 'modelo', 'modelos')}</span><span>${esc(l.cats.join(' · '))}</span>`) +
                filtrosDe(l.itens, cat, c => urlLinha(sl, c)) + `<div class="wrap">${grade(lista)}</div>`;
            return;
        }
        if (amb) {
            const a = AMBIENTES.find(x => x.id === amb);
            if (!a) return naoAchou('Este ambiente não existe.');
            const todos = capaAmbiente(a).itens.sort((x, y) => (!!y.image - !!x.image));
            const lista = cat ? todos.filter(p => slug(p.category) === cat) : todos;
            document.title = `${a.nome} · Cavaletti · Assistec`;
            app.innerHTML = cabecalho(`${inicio}<a href="catalogo.html?ver=ambientes">Ambientes</a>/<span>${esc(a.nome)}</span>`, esc(a.nome),
                `<span>${esc(a.desc)}</span><span>${plural(todos.length, 'modelo', 'modelos')}</span>`) +
                filtrosDe(todos, cat, c => urlAmbiente(amb, c)) + `<div class="wrap">${grade(lista)}</div>`;
            return;
        }
        if (ver === 'ambientes') {
            document.title = 'Ambientes · Cavaletti · Assistec';
            app.innerHTML = cabecalho(`${inicio}<span>Ambientes</span>`, 'Ambientes', '<span>Escolha o espaço que você vai montar.</span>') +
                `<div class="wrap" style="padding-top:40px;padding-bottom:96px"><div class="ambientes">${AMBIENTES.map(capaAmbiente).map(cartaoAmbiente).join('')}</div></div>`;
            return;
        }
        app.innerHTML = cabecalho(`${inicio}<span>Coleções</span>`, 'Coleções', `<span>${linhas.length} linhas Cavaletti · ${P.length} modelos</span>`, caixaBusca()) +
            `<div class="wrap"><div class="indice">${linhas.map(l => `
                <a href="${urlLinha(l.slug)}"><span class="mini">${l.capa ? `<img src="${esc(l.capa.image)}" alt="" loading="lazy">` : ''}</span>
                <div><h3>${esc(l.nome)}</h3><span>${plural(l.itens.length, 'modelo', 'modelos')} · ${esc(l.cats.slice(0, 2).join(', '))}</span></div>${seta}</a>`).join('')}
            </div></div>`;
        if (location.hash === '#busca') document.querySelector('#busca input')?.focus();
    }

    // ---------- produto e configurador ----------
    function telaProduto() {
        const p = porId[param('id')];
        if (!p) return naoAchou('Este modelo não está mais no catálogo.');
        const l = linhas.find(x => x.nome === p.line);
        const fotos = p.fotos || [];
        const temRev = !!(p.revestimentos && p.revestimentos.length);
        const revest = temRev ? p.revestimentos : (p.telas || []);
        const encostos = temRev ? (p.telas || []) : [];
        const st = { v: p.variacoes.length === 1 ? 0 : -1, estrutura: '', revest: revest.length === 1 ? revest[0] : '', cor: '', encosto: encostos.length === 1 ? encostos[0] : '', encostoCor: '' };
        const ambsProj = Projeto.ler().ambientes.map(a => a.nome);
        const sugest = AMBIENTES.find(a => a.cats.includes(p.category));
        const relacionados = (l ? l.itens : []).filter(x => x.id !== p.id).slice(0, 4);

        document.title = `${titulo(p)} · Linha ${p.line} · Cavaletti · Assistec`;
        document.querySelector('meta[name="description"]')?.setAttribute('content',
            `${titulo(p)} da linha ${p.line} (modelo ${p.code}) Cavaletti: configure estrutura, revestimento e cor e peça o orçamento à Assistec.`);

        app.innerHTML = `
        <div class="wrap">
            <nav class="migalha" style="padding-top:28px" aria-label="Você está em"><a href="index.html">Início</a>/<a href="catalogo.html">Coleções</a>/<a href="${l ? urlLinha(l.slug) : 'catalogo.html'}">${esc(p.line)}</a>/<span>Modelo ${esc(p.code || '')}</span></nav>
            <div class="produto">
                <div class="produto-galeria">
                    <div class="palco"><span class="selo">Garantia Cavaletti</span>${p.image ? `<img id="fotoPrincipal" src="${esc(p.image)}" alt="${esc(p.name)}">` : semFoto(p)}</div>
                    <p class="legenda-foto" id="legenda">${esc(fotos[0]?.legenda || '')}</p>
                    ${fotos.length > 1 ? `<div class="miniaturas">${fotos.map((f, i) => `<button class="${i ? '' : 'ativo'}" data-f="${i}" aria-label="Foto ${i + 1}"><img src="${esc(f.src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
                </div>
                <div class="produto-info">
                    <span class="rotulo">Linha ${esc(p.line)}</span>
                    <h1 class="display">${esc(titulo(p))}</h1>
                    <div class="meta"><span>Modelo <b>${esc(p.code || '—')}</b></span><span>${esc(p.category)}</span><span>${plural(p.variacoes.length, 'configuração', 'configurações')}</span></div>
                    <div class="original"><img src="img/cavaletti/marca/cavaletti-logo.png" alt="Cavaletti" width="38" height="35"><span><b>Produto original Cavaletti</b> com garantia de fábrica, vendido por revenda autorizada.</span></div>
                    <div id="conf"></div>
                    <div class="adicionar">
                        <label class="campo"><span>Para qual ambiente?</span>
                            <input id="ambNome" list="ambLista" placeholder="Ex.: Sala de reunião" value="${esc(ambsProj[ambsProj.length - 1] || (sugest ? sugest.nome : ''))}">
                            <datalist id="ambLista">${[...new Set([...ambsProj, 'Recepção', 'Sala de reunião', 'Diretoria', 'Escritório', 'Auditório', 'Copa'])].map(n => `<option value="${esc(n)}">`).join('')}</datalist>
                        </label>
                        <div class="adicionar-linha">
                            <button class="btn btn-marinho btn-bloco" id="btnAdd">Adicionar ao pedido ${seta}</button>
                            <div class="qtd-box"><button type="button" data-q="-1" aria-label="Menos">−</button><input id="qtd" type="number" min="1" value="1" aria-label="Quantidade"><button type="button" data-q="1" aria-label="Mais">+</button></div>
                        </div>
                        <p class="nota" id="falta"></p>
                        <a class="link-seta" id="perguntar" href="#" target="_blank" rel="noopener">Tirar dúvida sobre este modelo no WhatsApp ${seta}</a>
                    </div>
                </div>
            </div>
            ${relacionados.length ? `<div class="secao-cab" style="margin-bottom:0"><div><span class="rotulo">Mesma linha</span><h2 class="display" style="font-size:clamp(28px,3vw,40px)">Mais da ${esc(p.line)}</h2></div><a class="link-seta" href="${urlLinha(l.slug)}">Ver a linha ${seta}</a></div>${grade(relacionados)}` : '<div style="height:40px"></div>'}
        </div>`;

        app.querySelectorAll('.miniaturas button').forEach(b => b.addEventListener('click', () => {
            const f = fotos[+b.dataset.f], im = document.getElementById('fotoPrincipal');
            im.style.opacity = 0;
            setTimeout(() => { im.src = f.src; im.style.opacity = 1; }, 180);
            document.getElementById('legenda').textContent = f.legenda;
            app.querySelectorAll('.miniaturas button').forEach(x => x.classList.toggle('ativo', x === b));
        }));

        const cores = nome => (D.revestimentos[nome] || []);
        const nomeCor = c => c ? `${c.nome}${c.codigo ? ' (' + c.codigo + ')' : ''}` : '';
        const chaveCor = c => c.codigo + c.nome;
        const rotRev = n => String(n || '').replace(/^Lâmina do encosto .*/, 'Lâmina');
        const corDe = (rev, k) => { const c = cores(rev).find(c => chaveCor(c) === k); return c ? nomeCor(c) : ''; };
        const codCor = (rev, k) => { const c = cores(rev).find(c => chaveCor(c) === k); return c ? (c.codigo || c.nome) : ''; };

        function escolha() {
            const v = st.v >= 0 ? p.variacoes[st.v] : null;
            return {
                descricao: v ? v.descricao : '', codigo: v ? v.codigo : '', estrutura: st.estrutura,
                revest: rotRev(st.revest), cor: corDe(st.revest, st.cor), encosto: rotRev(st.encosto), encostoCor: corDe(st.encosto, st.encostoCor),
                // nomes e códigos exatos, para o pedido abrir montado no Montador
                revK: st.revest, corC: codCor(st.revest, st.cor), encK: st.encosto, encCorC: codCor(st.encosto, st.encostoCor),
            };
        }

        function desenha() {
            const v = st.v >= 0 ? p.variacoes[st.v] : null;
            const ests = v ? (v.estruturas || []) : (p.estruturas || []);
            if (ests.length === 1) st.estrutura = ests[0];
            if (st.estrutura && !ests.includes(st.estrutura)) st.estrutura = '';
            let n = 0;
            const passo = (tit, dir, corpo) => `<div class="passo-conf"><div class="tit"><i>${String(++n).padStart(2, '0')}</i><b>${tit}</b><span>${dir || ''}</span></div>${corpo}</div>`;
            const swatches = (rev, atual, attr) => `<div class="cores">${cores(rev).map(c => `<button class="cor${chaveCor(c) === atual ? ' ativo' : ''}" data-${attr}="${esc(chaveCor(c))}" style="background:${esc(c.hex)}" title="${esc(nomeCor(c))}" aria-label="${esc(nomeCor(c))}" aria-pressed="${chaveCor(c) === atual}"></button>`).join('')}</div>`;
            let h = passo('Configuração', p.variacoes.length > 1 ? plural(p.variacoes.length, 'opção', 'opções') : '',
                `<select class="sel" id="selVar" aria-label="Configuração"><option value="-1">Escolha a configuração</option>${p.variacoes.map((x, i) => `<option value="${i}"${i === st.v ? ' selected' : ''}>${esc(x.descricao)}</option>`).join('')}</select>
                 <p class="codigo">${v && v.codigo ? 'Código Cavaletti: <b>' + esc(v.codigo) + '</b>' : '&nbsp;'}</p>`);
            if (ests.length) h += passo('Estrutura', esc(st.estrutura), `<div class="opcoes">${ests.map(e => `<button class="chip${e === st.estrutura ? ' ativo' : ''}" data-est="${esc(e)}" aria-pressed="${e === st.estrutura}">${esc(e)}</button>`).join('')}</div>`);
            if (revest.length) {
                h += passo(temRev ? 'Revestimento' : 'Encosto', esc(rotRev(st.revest)),
                    `<div class="opcoes">${revest.map(r => `<button class="chip${r === st.revest ? ' ativo' : ''}" data-rev="${esc(r)}" aria-pressed="${r === st.revest}">${esc(rotRev(r))}</button>`).join('')}</div>`);
                if (st.revest) h += passo('Cor', esc(corDe(st.revest, st.cor)) || 'Escolha uma cor', swatches(st.revest, st.cor, 'cor'));
            }
            if (encostos.length) {
                h += passo('Encosto', esc(rotRev(st.encosto)), `<div class="opcoes">${encostos.map(r => `<button class="chip${r === st.encosto ? ' ativo' : ''}" data-enc="${esc(r)}" aria-pressed="${r === st.encosto}">${esc(rotRev(r))}</button>`).join('')}</div>`);
                if (st.encosto) h += passo('Cor do encosto', esc(corDe(st.encosto, st.encostoCor)) || 'Escolha uma cor', swatches(st.encosto, st.encostoCor, 'ecor'));
            }
            document.getElementById('conf').innerHTML = h;
            const falta = [];
            if (st.v < 0) falta.push('configuração');
            if (ests.length && !st.estrutura) falta.push('estrutura');
            if (revest.length && (!st.revest || !st.cor)) falta.push(temRev ? 'revestimento e cor' : 'encosto e cor');
            if (encostos.length && (!st.encosto || !st.encostoCor)) falta.push('encosto e cor');
            document.getElementById('falta').textContent = falta.length ? 'Falta escolher: ' + falta.join(', ') + '. Se preferir, adicione assim mesmo e a gente ajuda a definir.' : 'Tudo escolhido.';
            const e = escolha();
            const msg = [`Olá! Tenho uma dúvida sobre o modelo ${p.code} — ${titulo(p)} (Linha ${p.line}).`, e.descricao && `Configuração: ${e.descricao}${e.codigo ? ' (cód. ' + e.codigo + ')' : ''}`, resumoConf(e)].filter(Boolean).join('\n');
            document.getElementById('perguntar').href = `https://wa.me/${WHATS}?text=${encodeURIComponent(msg + '\n' + location.href)}`;
        }

        const conf = document.getElementById('conf');
        conf.addEventListener('change', e => { if (e.target.id === 'selVar') { st.v = +e.target.value; desenha(); } });
        conf.addEventListener('click', e => {
            const b = e.target.closest('button'); if (!b) return;
            if (b.dataset.est) st.estrutura = b.dataset.est;
            if (b.dataset.rev) { if (st.revest !== b.dataset.rev) st.cor = ''; st.revest = b.dataset.rev; }
            if (b.dataset.cor) st.cor = b.dataset.cor;
            if (b.dataset.enc) { if (st.encosto !== b.dataset.enc) st.encostoCor = ''; st.encosto = b.dataset.enc; }
            if (b.dataset.ecor) st.encostoCor = b.dataset.ecor;
            desenha();
        });
        app.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
            const q = document.getElementById('qtd'); q.value = Math.max(1, (+q.value || 1) + +b.dataset.q);
        }));
        document.getElementById('btnAdd').addEventListener('click', () => {
            const nomeAmb = document.getElementById('ambNome').value.trim() || 'Geral';
            const qtd = Math.max(1, +document.getElementById('qtd').value || 1);
            aviso(p, Projeto.adicionar(nomeAmb, p.id, qtd, escolha()), qtd);
        });
        desenha();
    }

    // ---------- projeto ----------
    function resumoConf(c) {
        return [c.estrutura && 'Estrutura ' + c.estrutura, c.revest && (c.revest + (c.cor ? ' ' + c.cor : '')), c.encosto && ('Encosto ' + c.encosto + (c.encostoCor ? ' ' + c.encostoCor : ''))].filter(Boolean).join(' · ');
    }

    function telaProjeto() {
        const pr = Projeto.ler();
        const total = Projeto.total(pr);
        const ambs = pr.ambientes.filter(a => a.itens.length);
        if (!total) {
            app.innerHTML = `<div class="wrap vazio">
                <img class="simb" src="img/marca/assistec-simbolo-azul.svg" alt="">
                <h1 class="display" style="font-size:clamp(30px,4vw,48px);margin-bottom:12px">Seu pedido está vazio.</h1>
                <p>Escolha os modelos, configure e separe por ambiente. Depois é só enviar.</p>
                <a href="catalogo.html?ver=ambientes" class="btn btn-marinho">Começar pelos ambientes ${seta}</a></div>`;
            return;
        }
        const hoje = new Date().toLocaleDateString('pt-BR');
        app.innerHTML = `
        <section class="cab-pagina"><div class="wrap">
            <img class="so-impressao" src="img/marca/assistec-horizontal-cor.svg" alt="Assistec Informática" style="height:48px;margin-bottom:12px">
            <nav class="migalha"><a href="index.html">Início</a>/<span>Monte seu pedido</span></nav>
            <h1 class="display">Monte seu pedido</h1>
            <div class="sub"><span>${plural(ambs.length, 'ambiente', 'ambientes')} · ${plural(total, 'peça', 'peças')}</span><span class="so-impressao">Gerado em ${hoje} · assistecrb.net · (55) 3798-1003</span></div>
        </div></section>
        <div class="wrap"><div class="projeto">
            <div>${ambs.map(a => `
                <div class="amb-bloco">
                    <div class="amb-bloco-cab"><input value="${esc(a.nome)}" data-renomear="${a.id}" aria-label="Nome do ambiente"><small>${plural(a.itens.reduce((s, i) => s + i.qtd, 0), 'peça', 'peças')}</small></div>
                    ${a.itens.map((it, k) => { const p = porId[it.pid]; if (!p) return ''; return `
                    <div class="item-proj">
                        <a class="mini" href="${urlProduto(p.id)}">${p.image ? `<img src="${esc(p.image)}" alt="">` : ''}</a>
                        <div><h4>${esc(titulo(p))}</h4>
                            <div class="esc">Modelo ${esc(p.code)} · Linha ${esc(p.line)}${it.conf.codigo ? ' · Cód. ' + esc(it.conf.codigo) : ''}</div>
                            <div class="esc">${esc(resumoConf(it.conf) || 'Configuração a definir com a Assistec')}</div></div>
                        <div class="acoes">
                            <div class="qtd-box"><button data-mais="${a.id}|${k}|-1" aria-label="Menos">−</button><input value="${it.qtd}" data-qtd="${a.id}|${k}" aria-label="Quantidade" inputmode="numeric"><button data-mais="${a.id}|${k}|1" aria-label="Mais">+</button></div>
                            <button class="remover" data-rem="${a.id}|${k}">Remover</button>
                        </div>
                    </div>`; }).join('')}
                </div>`).join('')}
                <a href="catalogo.html?ver=ambientes" class="link-seta nao-imprime">Adicionar mais itens ${seta}</a>
            </div>
            <aside class="resumo">
                <h2 style="font-size:22px;font-weight:600">Enviar para orçamento</h2>
                <div class="tot"><span>Ambientes</span><b>${ambs.length}</b></div>
                <div class="tot"><span>Peças</span><b>${total}</b></div>
                <label class="campo"><span>Seu nome</span><input data-cli="nome" value="${esc(pr.cliente.nome)}" autocomplete="name" maxlength="80" required></label>
                <label class="campo"><span>Telefone / WhatsApp</span><input data-cli="telefone" value="${esc(pr.cliente.telefone)}" autocomplete="tel" inputmode="tel" placeholder="(55) 99999-9999" maxlength="20" required></label>
                <p class="nota" id="faltaCli" role="alert"></p>
                <button class="btn btn-whats btn-bloco" id="enviar">Enviar pelo WhatsApp</button>
                <button class="btn btn-contorno btn-bloco" id="pdf">Baixar PDF do pedido</button>
                <button class="remover" id="limpar" style="justify-self:center">Limpar pedido</button>
                <p class="nota">A Cavaletti não permite preços no site: a Assistec responde com o orçamento completo.</p>
            </aside>
        </div></div>`;

        const altera = fn => { const pr = Projeto.ler(); fn(pr); pr.ambientes = pr.ambientes.filter(a => a.itens.length); Projeto.salvar(pr); telaProjeto(); };
        const pega = (pr, a, k) => pr.ambientes.find(x => x.id === a).itens[+k];
        app.querySelectorAll('[data-mais]').forEach(b => b.addEventListener('click', () => {
            const [a, k, d] = b.dataset.mais.split('|'); altera(pr => { const it = pega(pr, a, k); it.qtd = Math.max(1, it.qtd + +d); });
        }));
        app.querySelectorAll('[data-qtd]').forEach(i => i.addEventListener('change', () => {
            const [a, k] = i.dataset.qtd.split('|'); altera(pr => { pega(pr, a, k).qtd = Math.max(1, parseInt(i.value) || 1); });
        }));
        app.querySelectorAll('[data-rem]').forEach(b => b.addEventListener('click', () => {
            const [a, k] = b.dataset.rem.split('|'); altera(pr => { pr.ambientes.find(x => x.id === a).itens.splice(+k, 1); });
        }));
        app.querySelectorAll('[data-renomear]').forEach(i => i.addEventListener('change', () => {
            const pr = Projeto.ler(); pr.ambientes.find(x => x.id === i.dataset.renomear).nome = i.value.trim() || 'Ambiente'; Projeto.salvar(pr);
        }));
        app.querySelectorAll('[data-cli]').forEach(i => i.addEventListener('input', () => {
            const pr = Projeto.ler(); pr.cliente[i.dataset.cli] = i.value; Projeto.salvar(pr);
        }));
        document.getElementById('enviar').addEventListener('click', () => {
            const pr = Projeto.ler(), fone = soDigitos(pr.cliente.telefone), falta = document.getElementById('faltaCli');
            const nome = pr.cliente.nome.trim();
            if (nome.length < 2 || !fone) {
                falta.textContent = nome.length < 2 ? 'Escreva o seu nome para enviarmos o orçamento.' : 'Confira o telefone, com DDD. Ex.: (55) 99999-9999.';
                app.querySelector(`[data-cli="${nome.length < 2 ? 'nome' : 'telefone'}"]`).focus();
                return;
            }
            falta.textContent = '';
            const codigo = registraPedido(pr, nome, fone);
            window.open(`https://wa.me/${WHATS}?text=${encodeURIComponent(mensagem(Projeto.ler(), codigo))}`, '_blank', 'noopener');
        });
        document.getElementById('pdf').addEventListener('click', () => window.print());
        document.getElementById('limpar').addEventListener('click', () => {
            if (confirm('Apagar todos os itens do pedido?')) { Projeto.salvar(Projeto.novo()); telaProjeto(); }
        });
    }

    // telefone com DDD (10 ou 11 dígitos), sem o 55 do país; vazio se não parecer um telefone
    function soDigitos(t) {
        let d = String(t || '').replace(/\D/g, '').replace(/^0+/, '');
        if (/^55\d{10,11}$/.test(d)) d = d.slice(2);
        return /^\d{10,11}$/.test(d) ? d : '';
    }

    // Grava o pedido no banco de dados para a equipe abrir no Montador. O WhatsApp abre de qualquer jeito:
    // se a gravação falhar, a mensagem continua chegando. Toque duplo (mesmo pedido em até 2 minutos) não grava duas vezes;
    // depois disso o mesmo pedido é gravado de novo (pode ter sido apagado ou atendido no Montador).
    function registraPedido(pr, nome, fone) {
        const itens = [];
        pr.ambientes.filter(a => a.itens.length).forEach(a => a.itens.forEach(it => {
            const p = porId[it.pid]; if (!p) return;
            itens.push({ amb: a.nome, pid: p.id, modelo: p.code, linha: p.line, nome: titulo(p), qtd: it.qtd, ...it.conf });
        }));
        const assinatura = JSON.stringify([nome, fone, itens]);
        if (pr.enviado && pr.enviado.assinatura === assinatura && Date.now() - (pr.enviado.em || 0) < 120000) return pr.enviado.codigo;
        const sorteio = crypto.getRandomValues(new Uint32Array(2));
        const codigo = (sorteio[0].toString(36) + sorteio[1].toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7).padEnd(6, '0');
        pr.enviado = { codigo, assinatura, em: Date.now() }; Projeto.salvar(pr);
        try {
            fetch(SB_URL + '/rest/v1/pedidos_site', {
                method: 'POST', keepalive: true,
                headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                body: JSON.stringify({ codigo, nome: nome.slice(0, 80), telefone: fone, itens, pecas: Projeto.total(pr) }),
            }).catch(() => { });
        } catch { }
        return codigo;
    }

    function mensagem(pr, codigo) {
        const c = pr.cliente, l = ['*Pedido para orçamento — Assistec*' + (codigo ? ` (nº ${codigo})` : '')];
        if (c.nome || c.telefone) l.push([c.nome, c.telefone].filter(Boolean).join(' · '));
        pr.ambientes.filter(a => a.itens.length).forEach(a => {
            l.push('', `*${a.nome.toUpperCase()}*`);
            a.itens.forEach(it => {
                const p = porId[it.pid]; if (!p) return;
                l.push(`• ${it.qtd}× ${titulo(p)} — Modelo ${p.code} (Linha ${p.line})`);
                if (it.conf.descricao) l.push(`   ${it.conf.descricao}${it.conf.codigo ? ' — cód. ' + it.conf.codigo : ''}`);
                const r = resumoConf(it.conf); if (r) l.push('   ' + r);
            });
        });
        l.push('', `Total: ${Projeto.total(pr)} peças · enviado pelo site assistecrb.net`);
        return l.join('\n');
    }

    function naoAchou(msg) {
        app.innerHTML = `<div class="wrap vazio"><h1 class="display" style="font-size:clamp(30px,4vw,48px);margin-bottom:12px">Não encontramos.</h1><p>${esc(msg)}</p>${caixaBusca()}<div style="margin-top:24px"><a class="btn btn-marinho" href="catalogo.html">Ver coleções</a></div></div>`;
        const f = app.querySelector('.busca'); if (f) f.style.margin = '0 auto 0';
    }

    // ---------- animação de entrada ----------
    function observa() {
        const els = document.querySelectorAll('.surge:not(.visivel)');
        if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('visivel')); return; }
        const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
        els.forEach((e, i) => { e.style.transitionDelay = (i % 5) * 70 + 'ms'; io.observe(e); });
    }

    // ---------- topo, menu e aviso de armazenamento ----------
    document.getElementById('menuBtn')?.addEventListener('click', () => {
        const t = document.getElementById('topo'); t.classList.toggle('aberto');
        document.getElementById('menuBtn').setAttribute('aria-expanded', t.classList.contains('aberto'));
    });
    const cookies = document.getElementById('avisoCookies');
    try { if (cookies && !localStorage.getItem('cookie_consent')) cookies.classList.add('mostra'); } catch { }
    cookies?.querySelectorAll('[data-consent]').forEach(b => b.addEventListener('click', () => {
        try { localStorage.setItem('cookie_consent', b.dataset.consent); } catch { }
        cookies.classList.remove('mostra');
    }));
    atualizaConta();

    // ---------- dados ----------
    if (pagina === 'texto') return;
    fetch('catalog-data.json').then(r => r.json()).then(d => {
        D = d; P = d.products;
        P.forEach(p => { porId[p.id] = p; });
        const mapa = {};
        P.forEach(p => { (mapa[p.line] = mapa[p.line] || []).push(p); });
        linhas = Object.entries(mapa).map(([nome, itens]) => {
            itens.sort((a, b) => (!!b.image - !!a.image));
            const cont = {};
            itens.forEach(p => { cont[p.category] = (cont[p.category] || 0) + 1; });
            // capa da linha: de preferência uma cadeira/sofá, não mesa ou acessório
            const capa = itens.find(p => p.image && !['Mesas', 'Complementos'].includes(p.category)) || itens.find(p => p.image);
            return { nome, slug: slug(nome), itens, capa, cats: Object.keys(cont).sort((a, b) => cont[b] - cont[a]) };
        }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        ({ inicio: telaInicio, catalogo: telaCatalogo, produto: telaProduto, projeto: telaProjeto }[pagina] || telaInicio)();
        observa();
    }).catch(() => {
        app.innerHTML = `<div class="wrap vazio"><h1 class="display" style="font-size:36px">Não foi possível carregar o catálogo.</h1><p>Tente atualizar a página ou fale com a gente pelo <a class="link-seta" href="https://wa.me/${WHATS}">WhatsApp</a>.</p></div>`;
    });
})();
