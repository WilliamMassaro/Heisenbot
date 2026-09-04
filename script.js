// Configuração base que será preenchida automaticamente pelo keys.json
let AZURE_CONFIG = {
  apiKey: "",
  endpoint: "",
  deployment: "",
  apiVersion: "2024-06-01"
};

// Histórico retido em memória para a IA não perder o contexto da conversa
let historicoAtivo = [];

// Base de Dados Simulada de Histórico
let historicoConversas = [
  { id: 1, titulo: "Fórmula da Pureza (Química)", data: "24/08/2026" },
  { id: 2, titulo: "Script em Python para Automação", data: "22/08/2026" }
];

// Função para carregar as chaves do arquivo keys.json
async function carregarConfiguracoes() {
  try {
    const response = await fetch('./keys.json');
    if (!response.ok) throw new Error('Não foi possível ler o arquivo keys.json');
    
    const keys = await response.json();
    AZURE_CONFIG.apiKey = keys.AZURE_OPENAI_KEY || "";
    AZURE_CONFIG.endpoint = keys.AZURE_OPENAI_ENDPOINT || "";
    AZURE_CONFIG.deployment = keys.AZURE_OPENAI_DEPLOYMENT || "";
    AZURE_CONFIG.apiVersion = keys.AZURE_OPENAI_API_VERSION || "2024-06-01";

    console.log("✅ Configurações do Azure carregadas com sucesso a partir do keys.json!");
  } catch (error) {
    console.warn("⚠️ Não foi possível carregar keys.json automaticamente. Certifique-se de que o arquivo está na raiz ou insira os dados no menu de configurações.", error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Carrega as credenciais ao iniciar
  await carregarConfiguracoes();

  // Elementos principais da Interface
  const chatWrapper = document.getElementById('chat-wrapper');
  const welcomeScreen = document.getElementById('welcome-screen');
  const chatMessages = document.getElementById('chat-messages');
  const bottomInputBar = document.getElementById('bottom-input-bar');

  // Formulários e Inputs
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatFormBottom = document.getElementById('chat-form-bottom');
  const userInputBottom = document.getElementById('user-input-bottom');

  // Botões da Sidebar e Topo
  const btnNovaIdeia = document.getElementById('btn-nova-ideia');
  const btnHistorico = document.getElementById('btn-historico');
  const btnConfiguracoes = document.getElementById('btn-configuracoes');
  const btnClear = document.getElementById('btn-clear');
  const btnUpgrade = document.querySelector('.btn-upgrade');

  // Modais
  const modalConfig = document.getElementById('modal-configuracoes');
  const btnCloseConfig = document.getElementById('btn-close-config');
  const btnSaveConfig = document.getElementById('btn-save-config');
  const inputApiKey = document.getElementById('input-apikey');

  const modalUpgrade = document.getElementById('modal-upgrade');
  const btnCloseUpgrade = document.getElementById('btn-close-upgrade');
  const formCheckout = document.getElementById('form-checkout');

  // --- FUNÇÕES UTILITÁRIAS E NAVEGAÇÃO ---

  function limparTelasDinamicas() {
    const paineis = document.querySelectorAll('.historico-panel');
    paineis.forEach(panel => panel.remove());
  }

  function setItemAtivo(elementoBotao) {
    document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
    if (elementoBotao && elementoBotao.closest('li')) {
      elementoBotao.closest('li').classList.add('active');
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function abrirNovaIdeia() {
    limparTelasDinamicas();
    historicoAtivo = [];
    if (chatMessages) {
      chatMessages.innerHTML = '';
      chatMessages.style.display = 'none';
    }
    if (bottomInputBar) bottomInputBar.style.display = 'none';
    if (welcomeScreen) welcomeScreen.style.display = 'flex';
  }

  function abrirHistorico() {
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (chatMessages) chatMessages.style.display = 'none';
    if (bottomInputBar) bottomInputBar.style.display = 'none';
    limparTelasDinamicas();

    const painel = document.createElement('div');
    painel.className = 'historico-panel';
    painel.style.cssText = "width: 100%; max-width: 800px; margin: 0 auto; color: #fff;";

    let htmlConteudo = `
      <h3 style="font-family: var(--font-mono); color: var(--cyan-accent); margin-bottom: 20px; font-size: 1.4rem;">
        👮 REGISTRO DE OPERAÇÕES (HISTÓRICO)
      </h3>
      <div style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
    `;

    if (historicoConversas.length === 0) {
      htmlConteudo += `<p style="color: var(--text-secondary); font-family: var(--font-mono); text-align: center;">Nenhum registro encontrado no sistema.</p>`;
    } else {
      historicoConversas.forEach(chat => {
        htmlConteudo += `
          <div class="historico-item" style="background: rgba(18, 22, 25, 0.85); border: 1px solid rgba(0, 216, 255, 0.2); border-radius: 8px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
            <div>
              <strong style="color: #fff; font-family: var(--font-mono); display: block;">${chat.titulo}</strong>
              <small style="color: var(--text-secondary); font-size: 0.75rem;">${chat.data}</small>
            </div>
            <span style="color: var(--cyan-accent); font-family: var(--font-mono); font-size: 0.8rem;">ACESSAR ➔</span>
          </div>
        `;
      });
    }

    htmlConteudo += `</div>`;
    painel.innerHTML = htmlConteudo;
    if (chatWrapper) chatWrapper.appendChild(painel);
  }

  // --- REQUISIÇÃO À API DO AZURE OPENAI ---

  async function enviarMensagem(texto) {
    if (!texto) return;

    if (!AZURE_CONFIG.apiKey || !AZURE_CONFIG.endpoint || !AZURE_CONFIG.deployment) {
      alert("Configure a Chave API, Endpoint e Deployment no keys.json ou no menu de Configurações antes de continuar.");
      if (modalConfig) modalConfig.classList.add('active');
      return;
    }

    limparTelasDinamicas();

    if (welcomeScreen && welcomeScreen.style.display !== 'none') {
      welcomeScreen.style.display = 'none';
      if (chatMessages) chatMessages.style.display = 'flex';
      if (bottomInputBar) bottomInputBar.style.display = 'flex';

      historicoConversas.unshift({
        id: Date.now(),
        titulo: texto,
        data: new Date().toLocaleDateString('pt-BR')
      });
    }

    // Exibe a mensagem do usuário
    const userMsg = document.createElement('div');
    userMsg.className = 'message-bubble user-message';
    userMsg.innerHTML = `
      <div class="message-sender">VOCÊ</div>
      <div class="message-text">${escapeHtml(texto)}</div>
    `;
    if (chatMessages) chatMessages.appendChild(userMsg);

    historicoAtivo.push({ role: "user", content: texto });

    // Mensagem temporária do bot
    const botMsg = document.createElement('div');
    botMsg.className = 'message-bubble bot-message';
    botMsg.innerHTML = `
      <div class="message-sender">HEISENBOT</div>
      <div class="message-text">🧪 <em>Analisando fórmula no laboratório...</em></div>
    `;
    if (chatMessages) chatMessages.appendChild(botMsg);
    if (chatWrapper) chatWrapper.scrollTop = chatWrapper.scrollHeight;

    const payloadMessages = [
      {
        role: "system",
        content: "Você é o Heisenbot, uma IA inspirada no universo de Breaking Bad e química. Responda de forma direta, com tom misterioso, inteligente e científico."
      },
      ...historicoAtivo
    ];

    // Construção dinâmica da URL do Azure OpenAI
    const endpointLimpo = AZURE_CONFIG.endpoint.replace(/\/$/, "");
    const urlFormatada = `${endpointLimpo}/openai/deployments/${AZURE_CONFIG.deployment}/chat/completions?api-version=${AZURE_CONFIG.apiVersion}`;

    try {
      const response = await fetch(urlFormatada, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_CONFIG.apiKey
        },
        body: JSON.stringify({
          messages: payloadMessages,
          temperature: 0.7
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `Erro HTTP ${response.status}`);
      }

      const respostaTexto = data.choices?.[0]?.message?.content || "Nenhuma resposta retornada.";
      
      historicoAtivo.push({ role: "assistant", content: respostaTexto });
      botMsg.querySelector('.message-text').innerHTML = respostaTexto.replace(/\n/g, '<br>');

    } catch (error) {
      console.error("Erro na requisição:", error);
      historicoAtivo.pop();
      botMsg.querySelector('.message-text').innerHTML = `⚠️ <strong>[ERRO DE CONEXÃO]</strong> ${error.message}`;
    }

    if (chatWrapper) chatWrapper.scrollTop = chatWrapper.scrollHeight;
  }

  // --- INTERAÇÕES DA INTERFACE ---

  if (chatForm) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const texto = userInput ? userInput.value.trim() : '';
      if (userInput) userInput.value = '';
      enviarMensagem(texto);
    });
  }

  if (chatFormBottom) {
    chatFormBottom.addEventListener('submit', (e) => {
      e.preventDefault();
      const texto = userInputBottom ? userInputBottom.value.trim() : '';
      if (userInputBottom) userInputBottom.value = '';
      enviarMensagem(texto);
    });
  }

  if (btnClear) btnClear.addEventListener('click', () => abrirNovaIdeia());

  if (btnNovaIdeia) {
    btnNovaIdeia.addEventListener('click', (e) => { 
      setItemAtivo(e.currentTarget); 
      abrirNovaIdeia(); 
    });
  }

  if (btnHistorico) {
    btnHistorico.addEventListener('click', (e) => { 
      setItemAtivo(e.currentTarget); 
      abrirHistorico(); 
    });
  }

  if (btnConfiguracoes) {
    btnConfiguracoes.addEventListener('click', (e) => { 
      setItemAtivo(e.currentTarget); 
      if (modalConfig) modalConfig.classList.add('active'); 
    });
  }

  if (btnCloseConfig) btnCloseConfig.addEventListener('click', () => modalConfig?.classList.remove('active'));

  if (modalConfig) {
    modalConfig.addEventListener('click', (e) => { 
      if (e.target === modalConfig) modalConfig.classList.remove('active'); 
    });
  }

  if (btnSaveConfig) {
    btnSaveConfig.addEventListener('click', () => {
      if (inputApiKey && inputApiKey.value.trim() !== "") {
        AZURE_CONFIG.apiKey = inputApiKey.value.trim();
      }
      alert('Configurações salvas!');
      modalConfig?.classList.remove('active');
    });
  }

  if (btnUpgrade) btnUpgrade.addEventListener('click', () => modalUpgrade?.classList.add('active'));

  if (btnCloseUpgrade) btnCloseUpgrade.addEventListener('click', () => modalUpgrade?.classList.remove('active'));

  if (modalUpgrade) {
    modalUpgrade.addEventListener('click', (e) => { 
      if (e.target === modalUpgrade) modalUpgrade.classList.remove('active'); 
    });
  }

  if (formCheckout) {
    formCheckout.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('🏆 Parabéns! Você agora é um Cozinheiro Profissional!');
      modalUpgrade?.classList.remove('active');
    });
  }
});