(function () {
    // Revestimentos e cores vêm do catálogo oficial (catalog-data.json, gerado do Montador de Pedidos).
    // Cada página chama CavalettiFabrics.setData(data.revestimentos) depois de carregar o catálogo.
    const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    window.CavalettiFabrics = {
        materials: [],
        colors: [],

        setData(rev) {
            this.materials = [];
            this.colors = [];
            Object.entries(rev || {}).forEach(([nome, cores]) => {
                const mid = slug(nome);
                this.materials.push({ id: mid, name: nome });
                cores.forEach(c => this.colors.push({
                    id: mid + '-' + slug(c.codigo || c.nome),
                    name: c.nome + (c.codigo ? ' (' + c.codigo + ')' : ''),
                    hex: c.hex, materials: [mid]
                }));
            });
        },

        // revestimento do assento/estofado; sem ele, a tela ou a lâmina do encosto
        getMaterialsForProduct(p) {
            if (!p || typeof p !== 'object') return [];
            const lista = (p.revestimentos && p.revestimentos.length) ? p.revestimentos : (p.telas || []);
            return lista.map(slug);
        },

        // tela ou lâmina do encosto, quando o produto também tem revestimento de assento
        getEncostoForProduct(p) {
            return (p && p.revestimentos && p.revestimentos.length ? (p.telas || []) : []).map(slug);
        },

        getColorsForMaterial(materialId) {
            if (!materialId) return [];
            return this.colors.filter(c => c.materials.includes(materialId));
        },

        hasFabrics(p) {
            return this.getMaterialsForProduct(p).length > 0;
        }
    };

    // === Sistema de Favoritos ===
    window.Favorites = {
        KEY: 'assistec_favorites',

        getAll() {
            try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
            catch { return []; }
        },

        toggle(productId) {
            const favs = this.getAll();
            const idx = favs.indexOf(productId);
            if (idx === -1) favs.push(productId);
            else favs.splice(idx, 1);
            localStorage.setItem(this.KEY, JSON.stringify(favs));
            this.updateBadges();
            return idx === -1; // true = added
        },

        isFavorite(productId) {
            return this.getAll().includes(productId);
        },

        count() {
            return this.getAll().length;
        },

        updateBadges() {
            document.querySelectorAll('.gp-fav-count').forEach(el => {
                const c = this.count();
                el.textContent = c;
                el.style.display = c > 0 ? 'flex' : 'none';
            });
        }
    };

    // === Lista de Orçamento Multi-Produto ===
    window.QuoteList = {
        KEY: 'assistec_quote_list',
        WHATSAPP: '555537981003',

        getAll() {
            try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
            catch { return []; }
        },

        add(item) {
            const list = this.getAll();
            // Não duplicar mesmo produto+material+cor
            const chave = i => [i.id, i.config, i.estrutura, i.material, i.color, i.encosto, i.encostoCor].join('|');
            const exists = list.find(i => chave(i) === chave(item));
            if (!exists) {
                list.push(item);
                localStorage.setItem(this.KEY, JSON.stringify(list));
            }
            this.updateBadges();
            return !exists;
        },

        remove(index) {
            const list = this.getAll();
            list.splice(index, 1);
            localStorage.setItem(this.KEY, JSON.stringify(list));
            this.updateBadges();
        },

        clear() {
            localStorage.removeItem(this.KEY);
            this.updateBadges();
        },

        count() {
            return this.getAll().length;
        },

        updateBadges() {
            document.querySelectorAll('.gp-quote-count').forEach(el => {
                const c = this.count();
                el.textContent = c;
                el.style.display = c > 0 ? 'flex' : 'none';
            });
        },

        sendWhatsApp() {
            const items = this.getAll();
            if (items.length === 0) return;

            const lines = ['*Solicitação de Orçamento - Assistec*', '', `*${items.length} produto(s):*`, ''];
            items.forEach((item, i) => {
                lines.push(`*${i + 1}. ${item.name}*`);
                lines.push(`   Linha: ${item.line}`);
                if (item.config) lines.push(`   Configuração: ${item.config}`);
                if (item.code) lines.push(`   Código: ${item.code}`);
                if (item.estrutura) lines.push(`   Estrutura: ${item.estrutura}`);
                if (item.material) lines.push(`   Revestimento: ${item.material}`);
                if (item.color) lines.push(`   Cor: ${item.color}`);
                if (item.encosto) lines.push(`   Encosto: ${item.encosto}${item.encostoCor ? ' - ' + item.encostoCor : ''}`);
                lines.push('');
            });
            lines.push('Gostaria de receber um orçamento para estes produtos.');

            const encoded = encodeURIComponent(lines.join('\n'));
            window.open(`https://wa.me/${this.WHATSAPP}?text=${encoded}`, '_blank');
        }
    };
})();
