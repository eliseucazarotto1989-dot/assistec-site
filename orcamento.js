// =============================================================
// orcamento.js - Sistema de Orçamento via WhatsApp
// Substitui o antigo cart.js - sem carrinho, sem preços
// =============================================================

(function () {
    const WHATSAPP_NUMBER = '5537981003';

    /**
     * Solicita orçamento de um produto via WhatsApp
     * @param {object} product - Dados do produto { name, line, code, type }
     */
    function solicitarOrcamento(product) {
        const msg = [
            '*Solicitação de Orçamento - Assistec*',
            '',
            `*Produto:* ${product.name}`,
            `*Linha:* ${product.line}`,
            product.code ? `*Código:* ${product.code}` : '',
            product.type ? `*Tipo:* ${product.type}` : '',
            '',
            'Gostaria de receber um orçamento para este produto.'
        ].filter(Boolean).join('\n');

        const encoded = encodeURIComponent(msg);
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`, '_blank');
    }

    // Expor globalmente
    window.Orcamento = { solicitarOrcamento };
})();
