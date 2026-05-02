/* ============================================================
   SCRIPT.JS — Amanda Balestra Psicóloga
   
   Módulos:
   1. Configurações (edite aqui os links do Calendly)
   2. Inicialização dos ícones Lucide
   3. Header: sombra ao rolar + link ativo
   4. Menu mobile (hamburguer)
   5. Modal de agendamento (Calendly)
   6. Formulário de contato (EmailJS)
   7. Animações de entrada (Intersection Observer)
   8. Máscara de telefone
   ============================================================ */


/* ============================================================
   1. CONFIGURAÇÕES
   ⚠️  EDITE ESTAS VARIÁVEIS para personalizar o site:
   ============================================================ */
const CONFIG = {
  // --- CALENDLY ---
  // Cole aqui a URL do seu Calendly (ex: https://calendly.com/seu-usuario/30min)
    CALENDLY_URL: 'https://calendly.com/psicologa-amandabalestra/consulta-amanda-balestra?locale=pt',

  // --- WHATSAPP ---
  WHATSAPP_NUMBER: '5512988945587',
  WHATSAPP_MESSAGE: 'Olá, gostaria de agendar uma consulta.',

  // --- EMAILJS (opcional) ---
  // Se quiser usar EmailJS, preencha as variáveis abaixo.
  // Caso contrário, o formulário usará o cliente de e-mail padrão do usuário.
  EMAILJS_PUBLIC_KEY:  'SUA_PUBLIC_KEY_AQUI',
  EMAILJS_SERVICE_ID:  'SUA_SERVICE_ID_AQUI',
  EMAILJS_TEMPLATE_ID: 'SEU_TEMPLATE_ID_AQUI',
};


/* ============================================================
   2. INICIALIZAÇÃO DOS ÍCONES LUCIDE
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  initHeader();
  initMobileMenu();
  initFadeInObserver();
  initPhoneMask();
  initEmailJS();
  initModalListeners();
});


/* ============================================================
   3. HEADER: SOMBRA AO ROLAR + LINK DE NAV ATIVO
   ============================================================ */
function initHeader() {
  const header = document.getElementById('header');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10);
    atualizarLinkAtivo();
  });

  function atualizarLinkAtivo() {
    const secoes = ['inicio', 'sobre', 'abordagem', 'servicos', 'contato'];
    let secaoAtual = '';

    secoes.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.3) {
        secaoAtual = id;
      }
    });

    navLinks.forEach(link => {
      const href = link.getAttribute('href')?.replace('#', '');
      link.classList.toggle('active', href === secaoAtual);
    });
  }
}


/* ============================================================
   4. MENU MOBILE (hamburguer)
   ============================================================ */
function initMobileMenu() {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');

  btn.addEventListener('click', () => {
    const aberto = btn.classList.toggle('open');
    menu.classList.toggle('open', aberto);
    btn.setAttribute('aria-expanded', aberto);
  });
}

function fecharMenu() {
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('mobileMenu').classList.remove('open');
}


/* ============================================================
   5. MODAL DE AGENDAMENTO (Calendly) — CORRIGIDO
   ============================================================ */

// Listeners do modal (fechar ao clicar fora ou pressionar Escape)
function initModalListeners() {
  document.getElementById('modalAgendamento').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) fecharAgendamento();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharAgendamento();
  });
}

function abrirAgendamento() {
  const overlay = document.getElementById('modalAgendamento');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  carregarCalendario();
}

function fecharAgendamento() {
  const overlay = document.getElementById('modalAgendamento');
  overlay.classList.remove('open');
  document.body.style.overflow = '';

  // Reseta o container para permitir recarregar ao abrir novamente
  document.getElementById('calendarContainer').innerHTML = `
    <div class="modal__loading">
      <i data-lucide="loader-circle" class="spin"></i>
      <p>Carregando agenda...</p>
    </div>`;

  // Recria os ícones Lucide no loading que acabou de ser inserido
  lucide.createIcons();

  calendarioCarregado = false;
}

let calendarioCarregado = false;

/* Ajusta a altura do iframe do Calendly dinamicamente.
   Estratégia dupla: postMessage (quando disponível) + polling do scrollHeight. */
function initCalendlyResizer() {
  // 1) postMessage — Calendly envia altura em alguns eventos
  window.addEventListener('message', (e) => {
    if (e.origin !== 'https://calendly.com') return;
    const data = e.data;
    if (data && data.event && data.event.indexOf('calendly') === 0) {
      const height = data.payload && data.payload.height;
      if (height && height > 400) {
        aplicarAlturaCalendly(height);
      }
    }
  });

  // 2) Polling — lê o scrollHeight real do iframe a cada 500ms por 10s
  // Cobre os casos em que o Calendly não envia payload.height
  let tentativas = 0;
  const poll = setInterval(() => {
    tentativas++;
    if (tentativas > 20) { clearInterval(poll); return; }

    const widget = document.getElementById('calendly-widget');
    if (!widget) return;
    const iframe = widget.querySelector('iframe');
    if (!iframe) return;

    try {
      // scrollHeight só funciona se same-origin, mas tenta mesmo assim
      const h = iframe.contentWindow?.document?.body?.scrollHeight;
      if (h && h > 400) { aplicarAlturaCalendly(h); clearInterval(poll); }
    } catch(_) {
      // cross-origin: ignora, postMessage vai cuidar
    }
  }, 500);
}

function aplicarAlturaCalendly(height) {
  const widget = document.getElementById('calendly-widget');
  if (!widget) return;
  const iframe = widget.querySelector('iframe');
  if (iframe) iframe.style.height = height + 'px';
  widget.style.height = height + 'px';
  const container = document.getElementById('calendarContainer');
  if (container) container.style.minHeight = height + 'px';
}

function carregarCalendario() {
  if (calendarioCarregado) return;
  calendarioCarregado = true;

  const container = document.getElementById('calendarContainer');
  const url = CONFIG.CALENDLY_URL;

  if (!url || url.includes('SEU_LINK_AQUI')) {
    container.innerHTML = `
      <div style="padding: 2rem; text-align: center; color: #7a6e68;">
        <p style="font-size: 1.1rem; margin-bottom: 1rem;">
          📅 Configure a URL do Calendly no arquivo <strong>script.js</strong> → <code>CONFIG.CALENDLY_URL</code>
        </p>
      </div>`;
    return;
  }

  // Injeta o elemento alvo do widget
  container.innerHTML = `<div id="calendly-widget"></div>`;

  function initWidget() {
    Calendly.initInlineWidget({
      url: url,
      parentElement: document.getElementById('calendly-widget'),
      prefill: {},
      utm: {}
    });
    // Inicia o listener de resize após criar o widget
    initCalendlyResizer();
  }

  // Se o objeto Calendly já está disponível na página, inicializa direto
  if (window.Calendly) {
    initWidget();
    return;
  }

  // Verifica se o script já foi inserido mas ainda está carregando
  const existingScript = document.querySelector('script[src*="calendly.com/assets/external/widget.js"]');
  if (existingScript) {
    existingScript.addEventListener('load', initWidget);
    return;
  }

  // Carrega o script do Calendly dinamicamente e inicializa ao terminar
  const script = document.createElement('script');
  script.src = 'https://assets.calendly.com/assets/external/widget.js';
  script.async = true;
  script.onload = initWidget;
  document.body.appendChild(script);
}


/* ============================================================
   6. FORMULÁRIO DE CONTATO (EmailJS)
   ============================================================ */
function initEmailJS() {
  if (
    typeof emailjs !== 'undefined' &&
    CONFIG.EMAILJS_PUBLIC_KEY &&
    !CONFIG.EMAILJS_PUBLIC_KEY.includes('SUA_')
  ) {
    emailjs.init(CONFIG.EMAILJS_PUBLIC_KEY);
  }
}

async function enviarMensagem() {
  const nome     = document.getElementById('nome').value.trim();
  const email    = document.getElementById('email').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const mensagem = document.getElementById('mensagem').value.trim();
  const feedback = document.getElementById('formFeedback');

  if (!nome || !email || !mensagem) {
    mostrarFeedback(feedback, 'error', '⚠️ Por favor, preencha Nome, E-mail e Mensagem.');
    return;
  }

  if (!validarEmail(email)) {
    mostrarFeedback(feedback, 'error', '⚠️ Por favor, insira um e-mail válido.');
    return;
  }

  const btn = document.querySelector('#contatoForm .btn--primary');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  // Fallback: abre cliente de e-mail caso EmailJS não esteja configurado
  if (
    typeof emailjs === 'undefined' ||
    !CONFIG.EMAILJS_PUBLIC_KEY ||
    CONFIG.EMAILJS_PUBLIC_KEY.includes('SUA_')
  ) {
    const assunto = encodeURIComponent(`Contato do site — ${nome}`);
    const corpo   = encodeURIComponent(
      `Nome: ${nome}\nE-mail: ${email}\nTelefone: ${telefone}\n\nMensagem:\n${mensagem}`
    );
    window.location.href = `mailto:psicologa.amandabalestra@gmail.com?subject=${assunto}&body=${corpo}`;

    mostrarFeedback(
      feedback, 'success',
      '✅ Abrindo seu aplicativo de e-mail... Se não abriu, envie diretamente para psicologa.amandabalestra@gmail.com'
    );
    btn.disabled = false;
    btn.textContent = 'Enviar Mensagem';
    return;
  }

  try {
    await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ID, {
      from_name:  nome,
      from_email: email,
      phone:      telefone,
      message:    mensagem,
    });

    mostrarFeedback(feedback, 'success', '✅ Mensagem enviada com sucesso! Em breve entrarei em contato.');

    document.getElementById('nome').value      = '';
    document.getElementById('email').value     = '';
    document.getElementById('telefone').value  = '';
    document.getElementById('mensagem').value  = '';

  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    mostrarFeedback(feedback, 'error', '❌ Erro ao enviar. Tente pelo WhatsApp ou envie e-mail diretamente.');
  }

  btn.disabled = false;
  btn.textContent = 'Enviar Mensagem';
}

function mostrarFeedback(el, tipo, texto) {
  el.className = `form-feedback ${tipo}`;
  el.textContent = texto;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


/* ============================================================
   7. ANIMAÇÕES DE ENTRADA (Intersection Observer)
   ============================================================ */
function initFadeInObserver() {
  const alvosDiretos = document.querySelectorAll(
    '.section-icon, .section-title, .section-subtitle, ' +
    '.hero__title, .hero__subtitle, .hero__desc, .hero__card, ' +
    '.sobre__photo-wrap, .sobre__info, ' +
    '.abordagem__grid .card, .abordagem__quote, ' +
    '.service-card, .sinais, ' +
    '.contato__info, .contato__form-wrap, ' +
    '.footer__brand, .footer__nav, .footer__contact'
  );

  alvosDiretos.forEach(el => el.classList.add('fade-in'));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  alvosDiretos.forEach(el => observer.observe(el));
}


/* ============================================================
   8. MÁSCARA DE TELEFONE
   ============================================================ */
function initPhoneMask() {
  const input = document.getElementById('telefone');
  if (!input) return;

  input.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);

    if (v.length <= 2)       v = v.replace(/^(\d{0,2})/, '($1');
    else if (v.length <= 6)  v = v.replace(/^(\d{2})(\d{0,4})/, '($1) $2');
    else if (v.length <= 10) v = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    else                     v = v.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');

    e.target.value = v;
  });
}