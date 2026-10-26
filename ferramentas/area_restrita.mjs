// Área restrita da equipe (assistecrb.net/equipe): publica o Montador de Pedidos TRANCADO com senha.
//
// O repositório do site é público, então o montador (que tem a tabela de custo) nunca vai aberto:
// o arquivo é compactado e criptografado (PBKDF2-SHA256 + AES-256-GCM) com a senha da equipe.
// No navegador, a pessoa digita a senha e o montador é aberto ali mesmo (WebCrypto).
//
// Uso normal (dois cliques no "PUBLICAR MONTADOR NA AREA RESTRITA.bat"):
//     node ferramentas/area_restrita.mjs
// Opções de teste (não publicam): --entrada <arquivo> --saida <arquivo> --senha-env <VARIAVEL>
import { createInterface } from 'node:readline';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { randomBytes, pbkdf2Sync, createCipheriv } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MONTADOR = resolve(SITE, '..', 'CAVALETTI CATALOGO NOVO', 'Montador de Pedidos Cavaletti.html');
// Conta do Supabase que lê os pedidos do site. Fica só neste PC (fora do repositório) e só entra
// na versão TRANCADA, para o montador da área restrita abrir os pedidos sem pedir outra senha.
const CONTA_ARQ = resolve(SITE, '..', 'CAVALETTI CATALOGO NOVO', 'conta-pedidos-site.json');
const ITERACOES = 1000000;   // deixa cada tentativa de adivinhar a senha bem lenta

const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const entrada = opt('--entrada') || MONTADOR;
const saida = opt('--saida') || join(SITE, 'equipe', 'index.html');
const teste = !!opt('--saida');

function perguntaOculta(texto) {
    return new Promise(res => {
        const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        rl._writeToOutput = s => { if (s.includes(texto)) process.stdout.write(s); else if (s === '\r\n' || s === '\n') process.stdout.write(s); else process.stdout.write('*'); };
        rl.question(texto, v => { rl.close(); process.stdout.write('\n'); res(v); });
    });
}

function perguntaVisivel(texto) {
    return new Promise(res => { const rl = createInterface({ input: process.stdin, output: process.stdout }); rl.question(texto, v => { rl.close(); res(v); }); });
}

function git(...a) { return execFileSync('git', ['-C', SITE, ...a], { encoding: 'utf8' }).trim(); }

async function main() {
    let senha = opt('--senha-env') ? process.env[opt('--senha-env')] : null;
    if (!senha) {
        console.log('\nÁREA RESTRITA DA EQUIPE — assistecrb.net/equipe');
        console.log('Escolha a senha da equipe: mínimo 8 caracteres, com letras E números (um símbolo deixa mais forte).\n');
        senha = await perguntaOculta('Senha: ');
        const conf = await perguntaOculta('Repita a senha: ');
        if (senha !== conf) throw new Error('As senhas não são iguais. Nada foi publicado.');
    }
    if (senha.length < 8) throw new Error('Senha curta demais (mínimo 8 caracteres). Nada foi publicado.');
    if (!/[a-zA-Zà-úÀ-Ú]/.test(senha) || !/\d/.test(senha)) throw new Error('A senha precisa ter letras e números. Nada foi publicado.');

    let html = readFileSync(entrada);
    {
        let conta = null;
        if (teste) {
            if (opt('--conta')) conta = JSON.parse(readFileSync(opt('--conta'), 'utf8'));   // só para testar
        } else if (existsSync(CONTA_ARQ)) {
            conta = JSON.parse(readFileSync(CONTA_ARQ, 'utf8'));
            console.log(`Conta dos pedidos do site: ${conta.email} (para trocar, apague o arquivo conta-pedidos-site.json).`);
        } else {
            console.log('\nConta dos pedidos do site (a de administrador no Supabase). Enter vazio para pular.');
            const email = (await perguntaVisivel('E-mail da conta: ')).trim();
            if (email) {
                const s = await perguntaOculta('Senha dessa conta: ');
                conta = { email, senha: s };
                writeFileSync(CONTA_ARQ, JSON.stringify(conta));
                console.log('Conta guardada neste PC.');
            }
        }
        if (conta) {
            const js = `<script>window.PEDIDOS_CONTA=${JSON.stringify(conta).replace(/</g, '\\u003c')};</script>`;
            const t = html.toString('utf8');
            const i = t.search(/<head[^>]*>/i);
            const fim = i < 0 ? 0 : i + t.slice(i).match(/<head[^>]*>/i)[0].length;
            html = Buffer.from(t.slice(0, fim) + js + t.slice(fim), 'utf8');
        }
    }
    const sal = randomBytes(16), iv = randomBytes(12);
    const chave = pbkdf2Sync(senha, sal, ITERACOES, 32, 'sha256');
    const c = createCipheriv('aes-256-gcm', chave, iv);
    const cifrado = Buffer.concat([c.update(gzipSync(html, { level: 9 })), c.final(), c.getAuthTag()]);
    const pagina = readFileSync(join(SITE, 'ferramentas', 'area_restrita.html'), 'utf8')
        .replace('__SAL__', sal.toString('base64'))
        .replace('__IV__', iv.toString('base64'))
        .replace('__ITER__', String(ITERACOES))
        .replace('__DADOS__', cifrado.toString('base64'))
        .replace('__GERADO__', new Date().toLocaleString('pt-BR'));
    if (pagina.includes(html.toString('utf8').slice(0, 200))) throw new Error('Falha de segurança: conteúdo aberto na saída.');
    mkdirSync(dirname(saida), { recursive: true });
    writeFileSync(saida, pagina);
    console.log(`Montador trancado: ${(cifrado.length / 1024).toFixed(0)} KB criptografados.`);
    if (teste) return;

    // publica só este arquivo, e só se o site local estiver igual ao que está no ar
    git('fetch', '-q', 'origin');
    const naoPublicado = git('rev-list', '--count', 'origin/main..HEAD');
    const atrasado = git('rev-list', '--count', 'HEAD..origin/main');
    if (naoPublicado !== '0' || atrasado !== '0') {
        throw new Error('O site no PC está diferente do que está no ar. O arquivo foi gerado, mas NÃO publicado: peça para publicar.');
    }
    git('add', 'equipe/index.html');
    if (!git('diff', '--cached', '--name-only')) { console.log('Nada mudou desde a última publicação.'); return; }
    git('commit', '-q', '-m', 'Área restrita: montador atualizado (criptografado)', '--', 'equipe/index.html');
    git('push', '-q', 'origin', 'HEAD:main');
    try { git('branch', '-f', 'main', 'HEAD'); } catch { /* main é o ramo atual */ }
    console.log('\nPublicado! Em 1 ou 2 minutos estará em https://assistecrb.net/equipe/');
}

main().catch(e => { console.error('\nERRO: ' + e.message); process.exitCode = 1; });
