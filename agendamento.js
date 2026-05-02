/* ============================================================
   AGENDAMENTO.JS — Sistema próprio (substitui Calendly)
   
   SETUP:
   1. Cole a URL do Google Apps Script em CONFIG.BACKEND_URL
   2. Inclua este arquivo no index.html ANTES de script.js:
      <script src="agendamento.js"></script>
   3. Adicione o CSS do modal ao style.css (ver agendamento.css)
   ============================================================ */

const CONFIG_AG = {
  BACKEND_URL: 'https://script.google.com/macros/s/AKfycby1cdhnsIaA8zBTxt2YuVVbFbCuhd4oCbEFh5eWOmHbru0vZwgWPE9Df4RTjFAQaEUEqQ/exec',
  WHATSAPP_NUMBER: '5512988945587',
};

/* ============================================================
   ESTADO
   ============================================================ */
let _ag = {
  horarios: {},          // { 'YYYY-MM-DD': ['16:00', ...] }
  mesSelecionado: null,  // Date (primeiro dia do mês visível)
  dataSelecionada: null, // 'YYYY-MM-DD'
  horaSelecionada: null, // '16:00'
  etapa: 1,              // 1=calendário, 2=formulário, 3=sucesso
  carregando: false,
};

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
];
const DIAS_S = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const DIAS_FULL = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];

/* ============================================================
   ABRIR / FECHAR MODAL
   ============================================================ */
function abrirAgendamento() {
  const overlay = document.getElementById('modalAgendamento');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Reinicia estado
  const hoje = new Date();
  _ag.mesSelecionado = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  _ag.dataSelecionada = null;
  _ag.horaSelecionada = null;
  _ag.etapa = 1;

  renderizarModal();
  carregarHorarios();
}

function fecharAgendamento() {
  document.getElementById('modalAgendamento').classList.remove('open');
  document.body.style.overflow = '';
}

/* ============================================================
   CARREGAR HORÁRIOS DO BACKEND
   ============================================================ */
async function carregarHorarios() {
  try {
    const res = await fetch(`${CONFIG_AG.BACKEND_URL}?acao=horarios`);
    const data = await res.json();
    if (data.ok) {
      _ag.horarios = data.horarios;
      renderizarCalendario();
    }
  } catch(e) {
    document.getElementById('ag-calendario').innerHTML =
      '<p style="color:#c0392b;text-align:center;padding:1rem">Erro ao carregar agenda. Tente pelo WhatsApp.</p>';
  }
}

/* ============================================================
   RENDERIZAR MODAL INTEIRO
   ============================================================ */
function renderizarModal() {
  const body = document.getElementById('ag-body');
  if (!body) return;

  if (_ag.etapa === 3) {
    body.innerHTML = renderSucesso();
    return;
  }

  body.innerHTML = `
    <!-- Etapas -->
    <div class="ag-steps">
      <div class="ag-step ${_ag.etapa >= 1 ? 'ag-step--active' : ''}">
        <span>1</span> Escolher horário
      </div>
      <div class="ag-step-sep"></div>
      <div class="ag-step ${_ag.etapa >= 2 ? 'ag-step--active' : ''}">
        <span>2</span> Seus dados
      </div>
    </div>

    ${_ag.etapa === 1 ? renderEtapa1() : renderEtapa2()}
  `;

  if (_ag.etapa === 1) renderizarCalendario();
}

/* ============================================================
   ETAPA 1: CALENDÁRIO + HORÁRIOS
   ============================================================ */
function renderEtapa1() {
  return `
    <div class="ag-et1">
      <!-- Calendário -->
      <div class="ag-cal-wrap">
        <div class="ag-cal-nav">
          <button onclick="mesAnterior()" class="ag-nav-btn">‹</button>
          <span class="ag-mes-label" id="ag-mes-label">—</span>
          <button onclick="proximoMes()" class="ag-nav-btn">›</button>
        </div>
        <div id="ag-calendario" class="ag-calendario">
          <div class="ag-loading"><div class="ag-spin"></div></div>
        </div>
      </div>

      <!-- Horários disponíveis -->
      <div class="ag-horas-wrap">
        <p class="ag-horas-titulo" id="ag-horas-titulo">
          ${_ag.dataSelecionada ? formatarDataExibicao(_ag.dataSelecionada) : 'Selecione uma data'}
        </p>
        <div id="ag-horas" class="ag-horas">
          ${_ag.dataSelecionada ? renderHoras() : '<p class="ag-horas-hint">← Escolha um dia no calendário</p>'}
        </div>
        <button
          class="ag-btn-avancar"
          id="ag-btn-avancar"
          onclick="avancarEtapa2()"
          ${(!_ag.dataSelecionada || !_ag.horaSelecionada) ? 'disabled' : ''}
        >
          Continuar →
        </button>
      </div>
    </div>
  `;
}

function renderizarCalendario() {
  const el = document.getElementById('ag-calendario');
  const label = document.getElementById('ag-mes-label');
  if (!el) return;

  const mes = _ag.mesSelecionado;
  label && (label.textContent = `${MESES[mes.getMonth()]} ${mes.getFullYear()}`);

  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const primeiroDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay();
  const diasNoMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();

  let html = `
    <div class="ag-cal-grid">
      ${DIAS_S.map(d => `<div class="ag-cal-head">${d}</div>`).join('')}
      ${Array(primeiroDia).fill('<div></div>').join('')}
  `;

  for (let d = 1; d <= diasNoMes; d++) {
    const data = new Date(mes.getFullYear(), mes.getMonth(), d);
    const dataStr = formatarDataISO(data);
    const passado = data < hoje;
    const temHorario = _ag.horarios[dataStr] && _ag.horarios[dataStr].length > 0;
    const selecionado = _ag.dataSelecionada === dataStr;

    let cls = 'ag-cal-day';
    if (passado || !temHorario) cls += ' ag-cal-day--off';
    else cls += ' ag-cal-day--on';
    if (selecionado) cls += ' ag-cal-day--sel';

    const click = (!passado && temHorario)
      ? `onclick="selecionarData('${dataStr}')"`
      : '';

    html += `<div class="${cls}" ${click}>${d}</div>`;
  }

  html += '</div>';
  el.innerHTML = html;
}

function renderHoras() {
  const horas = _ag.horarios[_ag.dataSelecionada] || [];
  if (horas.length === 0) return '<p class="ag-horas-hint">Nenhum horário disponível.</p>';

  return horas.map(h => `
    <button
      class="ag-hora-btn ${_ag.horaSelecionada === h ? 'ag-hora-btn--sel' : ''}"
      onclick="selecionarHora('${h}')"
    >${h}</button>
  `).join('');
}

function selecionarData(dataStr) {
  _ag.dataSelecionada = dataStr;
  _ag.horaSelecionada = null;
  // Atualiza título e horas sem re-renderizar tudo
  const titulo = document.getElementById('ag-horas-titulo');
  if (titulo) titulo.textContent = formatarDataExibicao(dataStr);
  const horasEl = document.getElementById('ag-horas');
  if (horasEl) horasEl.innerHTML = renderHoras();
  renderizarCalendario();
  atualizarBotaoAvancar();
}

function selecionarHora(hora) {
  _ag.horaSelecionada = hora;
  const horasEl = document.getElementById('ag-horas');
  if (horasEl) horasEl.innerHTML = renderHoras();
  atualizarBotaoAvancar();
}

function atualizarBotaoAvancar() {
  const btn = document.getElementById('ag-btn-avancar');
  if (btn) btn.disabled = !(_ag.dataSelecionada && _ag.horaSelecionada);
}

function mesAnterior() {
  const m = _ag.mesSelecionado;
  _ag.mesSelecionado = new Date(m.getFullYear(), m.getMonth() - 1, 1);
  renderizarCalendario();
  document.getElementById('ag-mes-label').textContent =
    `${MESES[_ag.mesSelecionado.getMonth()]} ${_ag.mesSelecionado.getFullYear()}`;
}

function proximoMes() {
  const m = _ag.mesSelecionado;
  _ag.mesSelecionado = new Date(m.getFullYear(), m.getMonth() + 1, 1);
  renderizarCalendario();
  document.getElementById('ag-mes-label').textContent =
    `${MESES[_ag.mesSelecionado.getMonth()]} ${_ag.mesSelecionado.getFullYear()}`;
}

/* ============================================================
   ETAPA 2: FORMULÁRIO
   ============================================================ */
function avancarEtapa2() {
  if (!_ag.dataSelecionada || !_ag.horaSelecionada) return;
  _ag.etapa = 2;
  renderizarModal();
}

function voltarEtapa1() {
  _ag.etapa = 1;
  renderizarModal();
  carregarHorarios();
}

function renderEtapa2() {
  const dataExib = formatarDataExibicao(_ag.dataSelecionada);
  return `
    <div class="ag-resumo">
      <div class="ag-resumo-box">
        <span class="ag-resumo-label">Horário selecionado</span>
        <strong>${dataExib} às ${_ag.horaSelecionada}</strong>
      </div>
      <button class="ag-btn-voltar" onclick="voltarEtapa1()">← Alterar</button>
    </div>

    <div class="ag-form">
      <div class="ag-form-group">
        <label>Nome completo *</label>
        <input type="text" id="ag-nome" placeholder="Seu nome" autocomplete="name" />
      </div>
      <div class="ag-form-group">
        <label>E-mail *</label>
        <input type="email" id="ag-email" placeholder="seu@email.com" autocomplete="email" />
      </div>
      <div class="ag-form-group">
        <label>Telefone / WhatsApp</label>
        <input type="tel" id="ag-tel" placeholder="(12) 98894-5587" autocomplete="tel" />
      </div>
      <div class="ag-form-group">
        <label>Modalidade</label>
        <select id="ag-modalidade">
          <option value="Online">Online (videochamada)</option>
          <option value="Presencial">Presencial</option>
        </select>
      </div>
      <div class="ag-form-group">
        <label>Observações (opcional)</label>
        <textarea id="ag-obs" rows="3" placeholder="Algo que queira compartilhar antes da consulta..."></textarea>
      </div>

      <div id="ag-erro" class="ag-erro" style="display:none"></div>

      <button class="ag-btn-enviar" id="ag-btn-enviar" onclick="enviarAgendamento()">
        Enviar solicitação
      </button>
      <p class="ag-aviso">
        ⏳ Após o envio, a Amanda confirmará o horário e você receberá um e-mail.
      </p>
    </div>
  `;
}

async function enviarAgendamento() {
  const nome      = document.getElementById('ag-nome')?.value.trim();
  const email     = document.getElementById('ag-email')?.value.trim();
  const telefone  = document.getElementById('ag-tel')?.value.trim();
  const modalidade= document.getElementById('ag-modalidade')?.value;
  const obs       = document.getElementById('ag-obs')?.value.trim();
  const erroEl    = document.getElementById('ag-erro');
  const btn       = document.getElementById('ag-btn-enviar');

  // Validação
  if (!nome || !email) {
    erroEl.textContent = '⚠️ Preencha seu nome e e-mail.';
    erroEl.style.display = 'block';
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    erroEl.textContent = '⚠️ E-mail inválido.';
    erroEl.style.display = 'block';
    return;
  }

  erroEl.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const res = await fetch(CONFIG_AG.BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'agendar',
        nome, email,
        telefone:    telefone || '',
        data:        _ag.dataSelecionada,
        horario:     _ag.horaSelecionada,
        modalidade:  modalidade || 'Online',
        observacoes: obs || '',
      }),
    });

    const data = await res.json();

    if (data.ok) {
      _ag.etapa = 3;
      renderizarModal();
    } else {
      erroEl.textContent = '❌ ' + (data.erro || 'Erro ao enviar. Tente novamente.');
      erroEl.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Enviar solicitação';
    }
  } catch(e) {
    erroEl.textContent = '❌ Erro de conexão. Tente pelo WhatsApp.';
    erroEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Enviar solicitação';
  }
}

/* ============================================================
   ETAPA 3: SUCESSO
   ============================================================ */
function renderSucesso() {
  const dataExib = formatarDataExibicao(_ag.dataSelecionada);
  return `
    <div class="ag-sucesso">
      <div class="ag-sucesso-icon">🌿</div>
      <h3>Solicitação enviada!</h3>
      <p>Sua solicitação para <strong>${dataExib} às ${_ag.horaSelecionada}</strong> foi recebida.</p>
      <p class="ag-sucesso-sub">
        Em breve a Amanda confirmará o horário e você receberá um e-mail.<br/>
        Fique de olho na caixa de entrada (e no spam 😉).
      </p>
      <button class="ag-btn-fechar" onclick="fecharAgendamento()">Fechar</button>
      <a class="ag-wpp-link"
         href="https://wa.me/${CONFIG_AG.WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Acabei de enviar uma solicitação de consulta pelo site.')}"
         target="_blank" rel="noopener">
        Avisar pelo WhatsApp também →
      </a>
    </div>
  `;
}

/* ============================================================
   HELPERS
   ============================================================ */
function formatarDataISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatarDataExibicao(dataStr) {
  if (!dataStr) return '';
  const [a, m, d] = dataStr.split('-');
  const date = new Date(parseInt(a), parseInt(m)-1, parseInt(d));
  return `${DIAS_FULL[date.getDay()]}, ${d}/${m}/${a}`;
}

/* ============================================================
   EVENT LISTENERS GLOBAIS
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modalAgendamento');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) fecharAgendamento();
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') fecharAgendamento();
  });
});
