// =============================================================
// auth.js - Módulo de Autenticação com Supabase
// Gerencia login, cadastro, sessão e controle de acesso
// =============================================================

(function () {
  // ----- Configuração do Supabase -----
  const SUPABASE_URL = 'https://lhnlwlelabgdgdhozhpe.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxobmx3bGVsYWJnZGdkaG96aHBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNTc1NDUsImV4cCI6MjA4ODkzMzU0NX0.K0IWRdkpFyY_zbIzoBNSgJK8wPUO_DqEUam7U35lDC0';

  // Inicializa o cliente Supabase usando o objeto global carregado via CDN
  if (!window.supabase || !window.supabase.createClient) {
    console.warn('Supabase SDK não carregado. Auth desabilitado.');
    window.Auth = {};
    return;
  }
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Expõe o cliente para uso por outros scripts (ex: cart.js)
  window.supabaseClient = supabase;

  // =============================================================
  // Funções de Autenticação
  // =============================================================

  /**
   * Cadastro de novo usuário
   * @param {string} email - E-mail do usuário
   * @param {string} password - Senha do usuário
   * @param {object} metadata - Dados adicionais: nome, empresa, cpf_cnpj, telefone
   * @returns {object} - Resultado do cadastro (data ou error)
   */
  async function signUp(email, password, metadata) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome: metadata.nome,
          empresa: metadata.empresa,
          cpf_cnpj: metadata.cpf_cnpj,
          telefone: metadata.telefone
        }
      }
    });

    if (error) {
      console.error('Erro ao cadastrar:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  }

  /**
   * Login do usuário com e-mail e senha
   * @param {string} email - E-mail do usuário
   * @param {string} password - Senha do usuário
   * @returns {object} - Resultado do login (data ou error)
   */
  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Erro ao fazer login:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  }

  /**
   * Logout do usuário e redirecionamento para a página inicial
   */
  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Erro ao fazer logout:', error.message);
    }

    // Redireciona para a página inicial após logout
    window.location.href = 'index.html';
  }

  /**
   * Obtém o usuário atualmente logado
   * @returns {object|null} - Objeto do usuário ou null se não estiver logado
   */
  async function getUser() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    return session.user;
  }

  // =============================================================
  // Funções de Perfil
  // =============================================================

  /**
   * Busca o perfil do usuário logado na tabela public.profiles
   * @returns {object|null} - Dados do perfil ou null
   */
  async function getProfile() {
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Erro ao buscar perfil:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Verifica se o usuário tem status "aprovado"
   * @returns {boolean} - true se aprovado, false caso contrário
   */
  async function isApproved() {
    const profile = await getProfile();
    return profile ? profile.status === 'aprovado' : false;
  }

  /**
   * Verifica se o usuário tem role "admin"
   * @returns {boolean} - true se admin, false caso contrário
   */
  async function isAdmin() {
    const profile = await getProfile();
    return profile ? profile.role === 'admin' : false;
  }

  // =============================================================
  // Funções Administrativas
  // =============================================================

  /**
   * Busca todos os perfis (uso administrativo)
   * Ordenados por data de criação (mais recente primeiro)
   * @returns {array|null} - Lista de perfis ou null em caso de erro
   */
  async function getAllProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar perfis:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Atualiza o status de um perfil (aprovado ou rejeitado)
   * @param {string} userId - ID do usuário a ser atualizado
   * @param {string} status - Novo status: 'aprovado' ou 'rejeitado'
   * @returns {object} - Resultado da atualização (data ou error)
   */
  async function updateProfileStatus(userId, status) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  }

  /**
   * Busca todos os pedidos com informações do perfil associado (uso administrativo)
   * @returns {array|null} - Lista de pedidos com perfil ou null em caso de erro
   */
  async function getAllOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*, profiles(*)');

    if (error) {
      console.error('Erro ao buscar pedidos:', error.message);
      return null;
    }

    return data;
  }

  // =============================================================
  // Controle de Estado de Autenticação
  // =============================================================

  /**
   * Registra um callback para mudanças no estado de autenticação
   * @param {function} callback - Função chamada quando o estado muda
   * @returns {object} - Subscription (pode ser usado para cancelar)
   */
  function onAuthChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return data;
  }

  // =============================================================
  // Proteção de Páginas
  // =============================================================

  /**
   * Exige autenticação - redireciona para login se não estiver logado
   * Chamar no topo de páginas protegidas
   */
  async function requireAuth() {
    const user = await getUser();

    if (!user) {
      window.location.href = 'login.html';
    }
  }

  /**
   * Exige que o usuário seja admin - redireciona para login se não for
   */
  async function requireAdmin() {
    const user = await getUser();

    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    const admin = await isAdmin();

    if (!admin) {
      window.location.href = 'login.html';
    }
  }

  /**
   * Exige que o usuário esteja aprovado
   * - Se não autenticado: redireciona para login
   * - Se autenticado mas não aprovado: exibe mensagem de aguardando aprovação
   */
  async function requireApproved() {
    const user = await getUser();

    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    const approved = await isApproved();

    if (!approved) {
      // Exibe mensagem informando que o cadastro está em análise
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;padding:20px;">
          <div>
            <h2>Aguardando Aprovação</h2>
            <p>Seu cadastro está em análise. Você será notificado quando for aprovado.</p>
            <button onclick="window.Auth.signOut()" style="margin-top:20px;padding:10px 20px;cursor:pointer;border:none;background:#333;color:#fff;border-radius:5px;">
              Sair
            </button>
          </div>
        </div>
      `;
    }
  }

  // =============================================================
  // Funções de Gerenciamento de Produtos
  // =============================================================

  async function getProductOverrides() {
    const { data, error } = await supabase
      .from('product_overrides')
      .select('*');
    if (error) { console.error('Erro overrides:', error.message); return []; }
    return data || [];
  }

  async function upsertProductOverride(productId, fields) {
    const user = await getUser();
    const { data, error } = await supabase
      .from('product_overrides')
      .upsert({
        product_id: productId,
        name: fields.name || null,
        image: fields.image || null,
        updated_at: new Date().toISOString(),
        updated_by: user ? user.id : null
      }, { onConflict: 'product_id' })
      .select()
      .single();
    if (error) { console.error('Erro ao salvar override:', error.message); return { data: null, error }; }
    return { data, error: null };
  }

  async function deleteProductOverride(productId) {
    const { error } = await supabase
      .from('product_overrides')
      .delete()
      .eq('product_id', productId);
    if (error) console.error('Erro ao deletar override:', error.message);
    return { error };
  }

  async function getProductImages(productId) {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order');
    if (error) { console.error('Erro product_images:', error.message); return []; }
    return data || [];
  }

  async function addProductImage(productId, imageUrl, sortOrder) {
    const { data, error } = await supabase
      .from('product_images')
      .insert({ product_id: productId, image_url: imageUrl, sort_order: sortOrder || 0 })
      .select()
      .single();
    if (error) { console.error('Erro ao adicionar imagem:', error.message); return { data: null, error }; }
    return { data, error: null };
  }

  async function removeProductImage(imageId) {
    const { error } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);
    if (error) console.error('Erro ao remover imagem:', error.message);
    return { error };
  }

  async function uploadProductImage(file, productId) {
    const ext = file.name.split('.').pop();
    const fileName = `${productId}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { contentType: file.type, upsert: false });
    if (error) { console.error('Erro ao fazer upload:', error.message); return null; }
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  }

  // =============================================================
  // Exposição Global - window.Auth
  // =============================================================

  window.Auth = {
    signUp,
    signIn,
    signOut,
    getUser,
    getProfile,
    isApproved,
    isAdmin,
    getAllProfiles,
    updateProfileStatus,
    getAllOrders,
    onAuthChange,
    requireAuth,
    requireAdmin,
    requireApproved,
    getProductOverrides,
    upsertProductOverride,
    deleteProductOverride,
    getProductImages,
    addProductImage,
    removeProductImage,
    uploadProductImage
  };
})();
