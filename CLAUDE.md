# Site Assistec Informatica - Guia do Projeto

Site da empresa **Assistec Informatica** de Rodeio Bonito/RS.
Revenda autorizada Cavaletti + assistencia tecnica e venda de informatica.
URL: www.assistecrb.net

## Mapa dos Arquivos

### Paginas HTML
| Arquivo | O que e |
|---------|---------|
| `index.html` | Pagina inicial (showroom): destaques, ambientes, colecoes, orcamento como projeto, informatica |
| `catalogo.html` | Colecoes e busca. `?linha=yon`, `?ambiente=trabalho`, `?ver=ambientes`, `?q=47301`, `&cat=` filtra categoria |
| `produto.html` | Modelo Cavaletti (`?id=`): fotos, configurador (configuracao, estrutura, revestimento, cor, encosto) e "Adicionar ao projeto" |
| `projeto.html` | Projeto de orcamento por ambiente (guardado no navegador): envia pelo WhatsApp ou gera PDF |
| `login.html` | Pagina de login/cadastro de usuarios |
| `admin.html` | Painel administrativo (gerenciamento de produtos) |
| `tecnico.html` | Painel tecnico interno (base de conhecimento para tecnicos) |
| `privacidade.html` | Politica de Privacidade (LGPD) |
| `termos.html` | Termos de Uso |

### Estilos
| Arquivo | O que e |
|---------|---------|
| `showroom.css` | Aparencia das paginas publicas (Identidade 2026: marinho #0A1F44, azul #0057D9, ciano #00B4F0, fonte Saira) |
| `styles.css` | Aparencia antiga, so para login.html, tecnico.html e admin.html (internas) |

### JavaScript
| Arquivo | O que e |
|---------|---------|
| `auth.js` | Sistema de autenticacao (login, cadastro, sessao do usuario) |
| `showroom.js` | Todas as telas publicas: le catalog-data.json, busca, configurador, projeto, mensagem do WhatsApp. Fotos de clientes: lista FOTOS_CLIENTES no topo |

### Dados
| Arquivo | O que e |
|---------|---------|
| `catalog-data.json` | Produtos por modelo, revestimentos e cores. GERADO do catalogo oficial (Montador de Pedidos): nao editar a mao |
| `product-images.json` | Galeria de fotos de cada produto. GERADO junto |
| `ferramentas/gerar_catalogo.py` | Gera os dois arquivos acima a partir do Montador (so le o montador; nunca leva precos) |
| `ferramentas/conferir_site.py` | Confere se o site esta coerente com o catalogo e sem precos |

### Catalogo fiel (regra)
O catalogo oficial e o Montador de Pedidos (pasta `CAVALETTI CATALOGO NOVO`). O site nunca e editado produto a produto:
quando o catalogo mudar, rode `python ferramentas/gerar_catalogo.py` e depois `python ferramentas/conferir_site.py`.
A Cavaletti nao permite precos no site: nenhum valor e publicado.

### Area restrita da equipe (assistecrb.net/equipe)
O Montador de Pedidos (tem a tabela de custo) fica em `equipe/index.html` **criptografado** com a senha da equipe
(PBKDF2-SHA256 1 milhao de iteracoes; senha minima 8 caracteres com letras e numeros + AES-256-GCM; abre no navegador com WebCrypto). Nunca commitar o montador aberto.
Para publicar/atualizar: dois cliques em `CAVALETTI CATALOGO NOVO/PUBLICAR MONTADOR NA AREA RESTRITA.bat`
(roda `ferramentas/area_restrita.mjs`, pede a senha, gera o arquivo e publica so ele; recusa se o site local estiver diferente do que esta no ar).
Trocar a senha = rodar de novo com a senha nova. Sem link no menu do site.

### Imagens
| Arquivo | O que e |
|---------|---------|
| `img/marca/` | Logos da Identidade 2026 (horizontal, vertical, simbolo; cor, azul, branco, preto) |
| `fonts/Saira-VF.ttf` | Fonte da marca (licenca OFL em fonts/OFL.txt) |

## Como Pedir Mudancas (exemplos)

Voce pode pedir alteracoes assim:

### Textos e conteudo
- "Muda o telefone do site para (55) 9999-9999"
- "Troca o texto do banner da pagina inicial para 'Bem-vindo a Assistec'"
- "Adiciona o endereco da loja no rodape"
- "Remove o aviso de site em construcao"

### Visual e cores
- "Muda a cor principal do site para azul"
- "Aumenta o tamanho do logo"
- "Muda a fonte do site"
- "Deixa o botao do WhatsApp maior"

### Produtos
- "Adiciona um novo produto no catalogo"
- "Remove um produto do catalogo"

### Estrutura
- "Adiciona uma nova pagina de servicos"
- "Coloca um mapa do Google na pagina de contato"
- "Adiciona depoimentos de clientes na pagina inicial"

## Informacoes da Empresa

- **Nome:** Assistec Informatica
- **Local:** Rodeio Bonito/RS
- **Telefone:** (55) 3798-1003
- **WhatsApp:** (55) 3798-1003
- **Instagram:** @assistecrb
- **Facebook:** /assistecinf
- **Especialidade:** Revenda Cavaletti + Assistencia tecnica em informatica
