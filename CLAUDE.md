# Site Assistec Informatica - Guia do Projeto

Site da empresa **Assistec Informatica** de Rodeio Bonito/RS.
Revenda autorizada Cavaletti + assistencia tecnica e venda de informatica.
URL: www.assistecrb.net

## Mapa dos Arquivos

### Paginas HTML
| Arquivo | O que e |
|---------|---------|
| `index.html` | Pagina inicial do site (home) - apresentacao da empresa, servicos, contato |
| `catalogo.html` | Catalogo de cadeiras Cavaletti - listagem de produtos com filtros |
| `produto.html` | Pagina de detalhes de um produto individual Cavaletti |
| `login.html` | Pagina de login/cadastro de usuarios |
| `admin.html` | Painel administrativo (gerenciamento de produtos) |
| `tecnico.html` | Painel tecnico interno (base de conhecimento para tecnicos) |
| `privacidade.html` | Politica de Privacidade (LGPD) |
| `termos.html` | Termos de Uso |

### Estilos
| Arquivo | O que e |
|---------|---------|
| `styles.css` | Toda a aparencia visual do site (cores, fontes, layout, responsividade) |

### JavaScript
| Arquivo | O que e |
|---------|---------|
| `auth.js` | Sistema de autenticacao (login, cadastro, sessao do usuario) |
| `orcamento.js` | Logica para solicitar orcamentos de produtos |
| `color-data.js` | Dados de cores disponiveis para cadeiras Cavaletti |

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

### Imagens
| Arquivo | O que e |
|---------|---------|
| `logo.svg` | Logo da Assistec (versao escura) |
| `logo-white.svg` | Logo da Assistec (versao branca para fundo escuro) |

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
