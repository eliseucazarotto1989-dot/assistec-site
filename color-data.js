(function () {
    window.CavalettiFabrics = {
        materials: [
            { id: 'vinil', name: 'Vinil' },
            { id: 'poliester', name: 'Poliéster' },
            { id: 'couro-sintetico', name: 'Couro Sintético' },
            { id: 'tela', name: 'Tela (Mesh)' }
        ],

        colors: [
            { id: 'preto', name: 'Preto', hex: '#1a1a1a', materials: ['vinil', 'poliester', 'couro-sintetico', 'tela'] },
            { id: 'cinza-escuro', name: 'Cinza Escuro', hex: '#4a4a4a', materials: ['vinil', 'poliester', 'tela'] },
            { id: 'cinza-claro', name: 'Cinza Claro', hex: '#9e9e9e', materials: ['vinil', 'poliester'] },
            { id: 'branco', name: 'Branco', hex: '#f5f5f5', materials: ['vinil', 'poliester'] },
            { id: 'azul-marinho', name: 'Azul Marinho', hex: '#1a237e', materials: ['vinil', 'poliester', 'tela'] },
            { id: 'azul-royal', name: 'Azul Royal', hex: '#1565c0', materials: ['poliester', 'tela'] },
            { id: 'verde', name: 'Verde', hex: '#2e7d32', materials: ['vinil', 'poliester'] },
            { id: 'verde-oliva', name: 'Verde Oliva', hex: '#6d7c3a', materials: ['vinil'] },
            { id: 'vermelho', name: 'Vermelho', hex: '#c62828', materials: ['vinil', 'poliester', 'tela'] },
            { id: 'bordo', name: 'Bordô', hex: '#6a1b3d', materials: ['vinil', 'poliester'] },
            { id: 'terracota', name: 'Terracota', hex: '#bf5b3f', materials: ['vinil'] },
            { id: 'marrom', name: 'Marrom', hex: '#5d4037', materials: ['vinil', 'couro-sintetico', 'tela'] },
            { id: 'caramelo', name: 'Caramelo', hex: '#bf8040', materials: ['vinil', 'couro-sintetico'] },
            { id: 'bege', name: 'Bege', hex: '#d7ccc8', materials: ['vinil', 'poliester', 'couro-sintetico'] },
            { id: 'laranja', name: 'Laranja', hex: '#e65100', materials: ['poliester'] },
            { id: 'amarelo', name: 'Amarelo', hex: '#f9a825', materials: ['poliester'] },
            { id: 'azul-claro', name: 'Azul Claro', hex: '#42a5f5', materials: ['poliester'] }
        ],

        // Quais categorias suportam revestimento
        categoryMaterials: {
            'Cadeiras Presidente': ['vinil', 'poliester', 'couro-sintetico', 'tela'],
            'Cadeiras Executiva': ['vinil', 'poliester', 'couro-sintetico', 'tela'],
            'Cadeiras Diretor': ['vinil', 'poliester', 'couro-sintetico', 'tela'],
            'Cadeiras Operacional': ['vinil', 'poliester', 'tela'],
            'Cadeiras Giratória': ['vinil', 'poliester', 'tela'],
            'Cadeiras de Aproximação': ['vinil', 'poliester'],
            'Cadeiras Fixas': ['vinil', 'poliester'],
            'Cadeiras Plásticas': [],
            'Poltronas': ['vinil', 'poliester', 'couro-sintetico'],
            'Poltronas de Espera': ['vinil', 'poliester', 'couro-sintetico'],
            'Poltronas Auditório': ['vinil', 'poliester'],
            'Sofás e Lounges': ['vinil', 'poliester', 'couro-sintetico'],
            'Banquetas e Mochos': ['vinil', 'poliester'],
            'Longarinas': ['vinil', 'poliester'],
            'Mesas': [],
            'Complementos': [],
            'Gamer Way': ['vinil', 'poliester']
        },

        getMaterialsForCategory(category) {
            const mats = this.categoryMaterials[category];
            if (mats !== undefined) return mats;
            return ['vinil', 'poliester'];
        },

        getColorsForMaterial(materialId) {
            if (!materialId) return this.colors;
            return this.colors.filter(c => c.materials.includes(materialId));
        },

        hasFabrics(category) {
            const mats = this.getMaterialsForCategory(category);
            return mats.length > 0;
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
        WHATSAPP: '5537981003',

        getAll() {
            try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
            catch { return []; }
        },

        add(item) {
            const list = this.getAll();
            // Não duplicar mesmo produto+material+cor
            const exists = list.find(i => i.id === item.id && i.material === item.material && i.color === item.color);
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
                if (item.code) lines.push(`   Código: ${item.code}`);
                if (item.material) lines.push(`   Revestimento: ${item.material}`);
                if (item.color) lines.push(`   Cor: ${item.color}`);
                lines.push('');
            });
            lines.push('Gostaria de receber um orçamento para estes produtos.');

            const encoded = encodeURIComponent(lines.join('\n'));
            window.open(`https://wa.me/${this.WHATSAPP}?text=${encoded}`, '_blank');
        }
    };
})();
