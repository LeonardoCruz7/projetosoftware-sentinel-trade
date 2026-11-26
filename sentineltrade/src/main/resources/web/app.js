(() => {
  'use strict';

  const state = {
    token: sessionStorage.getItem('st_token') || null,
    tokenPendente: null,
    usuario: null,
    autoRefresh: true,
    lado: 'COMPRA',
    cotacoes: [],
    carteira: null,
    ordens: [],
    notificacoes: [],
    status: null,
    mfaInterval: null,
    refreshInterval: null,
    mfaRestante: 0,
    adminTab: 'admin-operacao',
  };

  const $ = (id) => document.getElementById(id);

  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.className = v;
      else if (k === 'title') node.title = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, String(v));
    }
    for (const c of children) {
      if (c === null || c === undefined) continue;
      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    }
    return node;
  }

  function brl(val) {
    const n = Number(val);
    if (!Number.isFinite(n)) return 'n/d';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function fmtDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('pt-BR', { hour12: false });
  }

  function gerarChave() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'st-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function toast(msg, tipo = 'ok') {
    const box = $('toast-container');
    const item = el('div', { class: `toast ${tipo}` }, msg);
    box.appendChild(item);
    setTimeout(() => item.remove(), 4500);
  }

  async function api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = opts.token !== undefined ? opts.token : state.token;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.erro || `Erro HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      if (res.status === 401 && !opts.ignoreAuthReset && state.token) {
        sairLocal(true);
      }
      throw err;
    }
    return data;
  }

  // ------------------------------------------------------------------ Status Bar

  async function atualizarStatus() {
    try {
      const s = await api('/api/status', { token: null, ignoreAuthReset: true });
      state.status = s;
      const pillMercado = $('pill-mercado');
      pillMercado.className = `status-pill ${s.mercadoAberto ? 'ok' : 'warn'}`;
      $('txt-mercado').textContent = `Mercado: ${s.mercadoAberto ? 'ABERTO' : 'FECHADO'} (${s.horarioMercado})`;

      const pillCot = $('pill-cotacoes');
      pillCot.className = `status-pill ${s.cotacoesDisponiveis ? 'ok' : 'bad'}`;
      $('txt-cotacoes').textContent = `Cotações: ${s.cotacoesDisponiveis ? 'Online' : 'Indisponível'}`;

      const pillCb = $('pill-cb');
      const cbOk = s.circuitBreaker === 'FECHADO' && s.corretoraDisponivel;
      pillCb.className = `status-pill ${cbOk ? 'ok' : s.circuitBreaker === 'MEIO_ABERTO' ? 'warn' : 'bad'}`;
      $('txt-cb').textContent = `Corretora CB: ${s.circuitBreaker}${s.corretoraDisponivel ? '' : ' (OFF)'}`;

      atualizarBannerMercado();
      atualizarStatusSimulacao();
    } catch (_) {
      // ignora falha transitória de polling
    }
  }

  function atualizarBannerMercado() {
    const banner = $('inv-market-banner');
    if (!state.status || !state.usuario || state.usuario.papel !== 'INVESTIDOR') {
      banner.classList.add('hidden');
      return;
    }
    if (!state.status.mercadoAberto) {
      banner.textContent = `Mercado fechado no momento (horário configurado: ${state.status.horarioMercado}, ${state.status.zona}). Ordens enviadas agora serão auditadas e rejeitadas com código MERCADO_FECHADO, a menos que o Administrador ative "mercado.forcar_aberto".`;
      banner.classList.remove('hidden');
    } else if (!state.status.cotacoesDisponiveis) {
      banner.textContent = 'Provedor externo de cotações indisponível (degradação controlada). Cotações em cache ficam marcadas como DESATUALIZADA e novas ordens são bloqueadas por segurança.';
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  }

  // ------------------------------------------------------------------ Autenticação & MFA

  function mostrarErroAuth(msg) {
    const a = $('auth-alert');
    if (!msg) {
      a.classList.add('hidden');
      a.textContent = '';
    } else {
      a.textContent = msg;
      a.classList.remove('hidden');
    }
  }

  async function carregarContasDemo() {
    try {
      const d = await api('/api/demo/contas', { token: null });
      if (!d.ativo || !d.contas.length) {
        $('demo-panel').classList.add('hidden');
        return;
      }
      const list = $('demo-accounts-list');
      list.replaceChildren();
      for (const c of d.contas) {
        const btn = el('button', {
          type: 'button',
          class: 'btn btn-outline btn-sm',
          onClick: () => {
            voltarParaLogin();
            $('login-email').value = c.email;
            $('login-senha').value = c.senha;
            toast(`Credenciais de ${c.nome} preenchidas. Clique em Continuar para MFA.`, 'ok');
          },
        }, 'Preencher');
        list.appendChild(el('div', { class: 'demo-item' },
          el('div', { class: 'demo-item-info' },
            el('strong', {}, c.nome),
            el('span', { class: 'muted mono' }, c.email),
            el('span', { class: 'badge badge-info' }, c.papel),
          ),
          btn,
        ));
      }
      $('demo-panel').classList.remove('hidden');
    } catch (_) {
      $('demo-panel').classList.add('hidden');
    }
  }

  function voltarParaLogin() {
    state.tokenPendente = null;
    pararTimerMfa();
    mostrarErroAuth(null);
    $('form-mfa').classList.add('hidden');
    $('form-login').classList.remove('hidden');
    $('step-pill-1').className = 'step-pill active';
    $('step-pill-2').className = 'step-pill';
    $('auth-title').textContent = 'Acesso à Plataforma';
    $('auth-subtitle').textContent = 'Autenticação em dois fatores obrigatória (PBKDF2 + TOTP RFC 6238).';
  }

  function entrarPassoMfa(email, mfaDemo) {
    mostrarErroAuth(null);
    $('form-login').classList.add('hidden');
    $('form-mfa').classList.remove('hidden');
    $('step-pill-1').className = 'step-pill done';
    $('step-pill-2').className = 'step-pill active';
    $('auth-title').textContent = 'Verificação em Dois Fatores (MFA)';
    $('auth-subtitle').textContent = 'Digite os 6 dígitos gerados pelo autenticador TOTP.';
    $('mfa-email-label').textContent = email;

    const boxes = Array.from(document.querySelectorAll('#otp-grid .otp-box'));
    boxes.forEach((b) => { b.value = ''; });
    if (boxes[0]) boxes[0].focus();

    if (mfaDemo) {
      atualizarMfaSim(mfaDemo);
      $('mfa-sim-box').classList.remove('hidden');
      iniciarTimerMfa();
    } else {
      $('mfa-sim-box').classList.add('hidden');
    }
  }

  function atualizarMfaSim(info) {
    $('mfa-sim-code').textContent = info.codigoAtual;
    state.mfaRestante = info.janelaRestanteSeg;
    renderTimerMfa();
  }

  function renderTimerMfa() {
    $('mfa-timer-label').textContent = `${state.mfaRestante}s`;
    const pct = Math.max(0, Math.min(100, (state.mfaRestante / 30) * 100));
    $('mfa-timer-bar').style.width = `${pct}%`;
  }

  function iniciarTimerMfa() {
    pararTimerMfa();
    state.mfaInterval = setInterval(async () => {
      if (!state.tokenPendente) { pararTimerMfa(); return; }
      state.mfaRestante -= 1;
      if (state.mfaRestante <= 0) {
        try {
          const info = await api('/api/auth/mfa-demo', { token: state.tokenPendente, ignoreAuthReset: true });
          atualizarMfaSim(info);
        } catch (_) {
          pararTimerMfa();
        }
      } else {
        renderTimerMfa();
      }
    }, 1000);
  }

  function pararTimerMfa() {
    if (state.mfaInterval) { clearInterval(state.mfaInterval); state.mfaInterval = null; }
  }

  function configurarOtpInputs() {
    const boxes = Array.from(document.querySelectorAll('#otp-grid .otp-box'));
    boxes.forEach((box, idx) => {
      box.addEventListener('input', () => {
        const clean = box.value.replace(/\D/g, '');
        box.value = clean.slice(-1);
        if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !box.value && idx > 0) boxes[idx - 1].focus();
      });
      box.addEventListener('paste', (e) => {
        e.preventDefault();
        const txt = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        txt.split('').forEach((ch, i) => { if (boxes[i]) boxes[i].value = ch; });
        const focusIdx = Math.min(txt.length, boxes.length - 1);
        if (boxes[focusIdx]) boxes[focusIdx].focus();
      });
    });
  }

  function obterCodigoOtp() {
    return Array.from(document.querySelectorAll('#otp-grid .otp-box')).map((b) => b.value).join('');
  }

  async function onSubmitLogin(e) {
    e.preventDefault();
    mostrarErroAuth(null);
    const btn = $('btn-login-submit');
    btn.disabled = true;
    try {
      const email = $('login-email').value.trim();
      const senha = $('login-senha').value;
      const resp = await api('/api/auth/login', {
        method: 'POST',
        token: null,
        body: { email, senha },
      });
      state.tokenPendente = resp.tokenPendente;
      entrarPassoMfa(email, resp.mfaDemo || null);
    } catch (err) {
      mostrarErroAuth(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function onSubmitMfa(e) {
    e.preventDefault();
    mostrarErroAuth(null);
    const codigo = obterCodigoOtp();
    const btn = $('btn-mfa-submit');
    btn.disabled = true;
    try {
      const resp = await api('/api/auth/mfa', {
        method: 'POST',
        token: null,
        body: { tokenPendente: state.tokenPendente, codigo },
      });
      state.tokenPendente = null;
      pararTimerMfa();
      state.token = resp.token;
      state.usuario = resp.usuario;
      sessionStorage.setItem('st_token', resp.token);
      $('login-senha').value = '';
      toast(`Bem-vindo(a), ${resp.usuario.nome}!`, 'ok');
      await abrirDashboard();
    } catch (err) {
      mostrarErroAuth(err.message);
    } finally {
      btn.disabled = false;
    }
  }

  async function sair() {
    try {
      if (state.token) await api('/api/auth/logout', { method: 'POST', ignoreAuthReset: true });
    } catch (_) { /* ok */ }
    sairLocal(false);
  }

  function sairLocal(expirada) {
    state.token = null;
    state.usuario = null;
    sessionStorage.removeItem('st_token');
    pararAutoRefresh();
    $('user-controls').classList.add('hidden');
    $('view-investidor').classList.add('hidden');
    $('view-admin').classList.add('hidden');
    $('view-risco').classList.add('hidden');
    $('view-auth').classList.remove('hidden');
    voltarParaLogin();
    if (expirada) toast('Sessão expirada. Faça login novamente.', 'warn');
  }

  // ------------------------------------------------------------------ Navegação pós-login

  async function abrirDashboard() {
    $('view-auth').classList.add('hidden');
    $('user-controls').classList.remove('hidden');
    $('header-user-name').textContent = state.usuario.nome;
    $('header-user-role').textContent = state.usuario.papel;
    $('view-investidor').classList.add('hidden');
    $('view-admin').classList.add('hidden');
    $('view-risco').classList.add('hidden');
    $('btn-notif-bell').classList.add('hidden');

    await atualizarStatus();

    if (state.usuario.papel === 'INVESTIDOR') {
      $('view-investidor').classList.remove('hidden');
      $('btn-notif-bell').classList.remove('hidden');
      $('ord-chave').value = gerarChave();
      await carregarInvestidor();
      iniciarAutoRefresh();
    } else if (state.usuario.papel === 'ADMINISTRADOR') {
      $('view-admin').classList.remove('hidden');
      await carregarAdmin();
      iniciarAutoRefresh();
    } else if (state.usuario.papel === 'ANALISTA_RISCO') {
      $('view-risco').classList.remove('hidden');
      await carregarRisco();
      iniciarAutoRefresh();
    }
  }

  function iniciarAutoRefresh() {
    pararAutoRefresh();
    state.refreshInterval = setInterval(async () => {
      await atualizarStatus();
      if (!state.autoRefresh || !state.usuario) return;
      try {
        if (state.usuario.papel === 'INVESTIDOR') await carregarInvestidor();
        else if (state.usuario.papel === 'ADMINISTRADOR') await carregarAdminAtual();
        else if (state.usuario.papel === 'ANALISTA_RISCO') await carregarRisco();
      } catch (_) { /* tratado em api() */ }
    }, 4000);
  }

  function pararAutoRefresh() {
    if (state.refreshInterval) { clearInterval(state.refreshInterval); state.refreshInterval = null; }
  }

  // ------------------------------------------------------------------ Investidor

  async function carregarInvestidor() {
    const [cotResp, cartResp, ordResp, notifResp] = await Promise.all([
      api('/api/cotacoes'),
      api('/api/carteira'),
      api('/api/ordens'),
      api('/api/notificacoes'),
    ]);
    state.cotacoes = cotResp.cotacoes || [];
    state.carteira = cartResp;
    state.ordens = ordResp.ordens || [];
    state.notificacoes = notifResp.notificacoes || [];

    renderCotacoes();
    renderCarteira();
    renderOrdens();
    renderNotificacoes();
    popularSelectAtivos();
    atualizarPreviewBoleta();
  }

  function renderCotacoes() {
    const tb = $('tb-cotacoes');
    tb.replaceChildren();
    for (const c of state.cotacoes) {
      const varNum = Number(c.variacaoPercentual);
      const varCls = varNum > 0 ? 'text-buy' : varNum < 0 ? 'text-sell' : '';
      const varStr = `${varNum > 0 ? '+' : ''}${varNum.toFixed(2)}%`;
      const btn = el('button', {
        type: 'button',
        class: 'btn btn-outline btn-sm',
        onClick: () => selecionarAtivoNaBoleta(c.ticker, 'COMPRA', c.preco),
      }, 'Negociar');
      tb.appendChild(el('tr', {},
        el('td', {}, el('strong', { class: 'mono' }, c.ticker), el('div', { class: 'muted' }, c.nome || '')),
        el('td', {}, el('span', { class: 'badge badge-neutral' }, c.tipo || '-')),
        el('td', {}, el('span', { class: `badge ${c.status === 'ATIVO' ? 'badge-buy' : 'badge-sell'}` }, c.status || 'ATIVO')),
        el('td', { class: 'num mono' }, brl(c.preco)),
        el('td', { class: 'num mono muted' }, brl(c.fechamentoAnterior)),
        el('td', { class: `num mono ${varCls}` }, varStr),
        el('td', {}, c.desatualizada
          ? el('span', { class: 'badge badge-warn' }, 'DESATUALIZADA')
          : el('span', { class: 'badge badge-buy' }, 'EM TEMPO REAL')),
        el('td', { class: 'num' }, btn),
      ));
    }
  }

  function renderCarteira() {
    const c = state.carteira;
    if (!c) return;
    $('kpi-disponivel').textContent = brl(c.saldo.disponivel);
    $('kpi-bloqueado').textContent = brl(c.saldo.bloqueado);
    $('kpi-ativos').textContent = brl(c.valorAtivos);
    $('kpi-ativos-qtd').textContent = `${c.itens.length} ativo(s) em carteira`;
    $('kpi-patrimonio').textContent = brl(c.patrimonioEstimado);
    if (c.limiteRisco) {
      $('kpi-limites').textContent = `Máx/ordem ${brl(c.limiteRisco.valorMaximoPorOrdem)} · Diário ${brl(c.limiteRisco.limiteDiario)} · Conf. > ${brl(c.limiteRisco.valorConfirmacao)}`;
    }

    const tb = $('tb-carteira');
    tb.replaceChildren();
    if (!c.itens.length) {
      tb.appendChild(el('tr', {}, el('td', { colspan: '9', class: 'muted' }, 'Você ainda não possui ativos em carteira.')));
      return;
    }
    for (const i of c.itens) {
      const res = Number(i.resultadoEstimado);
      const resCls = res > 0 ? 'text-buy' : res < 0 ? 'text-sell' : '';
      const btn = el('button', {
        type: 'button',
        class: 'btn btn-danger btn-sm',
        onClick: () => selecionarAtivoNaBoleta(i.ticker, 'VENDA', i.cotacaoAtual || i.precoMedio, i.quantidadeDisponivel),
      }, 'Vender');
      tb.appendChild(el('tr', {},
        el('td', { class: 'mono' }, el('strong', {}, i.ticker)),
        el('td', { class: 'num mono' }, i.quantidade),
        el('td', { class: 'num mono' }, i.quantidadeDisponivel),
        el('td', { class: 'num mono text-amber' }, i.quantidadeBloqueada),
        el('td', { class: 'num mono' }, brl(i.precoMedio)),
        el('td', { class: 'num mono' }, i.cotacaoAtual ? brl(i.cotacaoAtual) : 'n/d'),
        el('td', { class: 'num mono' }, brl(i.valorEstimado)),
        el('td', { class: `num mono ${resCls}` }, brl(i.resultadoEstimado)),
        el('td', { class: 'num' }, btn),
      ));
    }
  }

  function popularSelectAtivos() {
    const sel = $('ord-ticker');
    const atual = sel.value;
    sel.replaceChildren();
    for (const c of state.cotacoes) {
      sel.appendChild(el('option', { value: c.ticker }, `${c.ticker} — ${c.nome || ''}`));
    }
    if (atual && state.cotacoes.some((c) => c.ticker === atual)) sel.value = atual;
    else if (state.cotacoes.length && !$('ord-preco').value) {
      $('ord-preco').value = Number(state.cotacoes[0].preco).toFixed(2);
    }
  }

  function selecionarAtivoNaBoleta(ticker, lado, preco, qtdSugerida) {
    setLado(lado);
    $('ord-ticker').value = ticker;
    if (preco) $('ord-preco').value = Number(preco).toFixed(2);
    if (qtdSugerida && qtdSugerida > 0) $('ord-qtd').value = qtdSugerida;
    $('ord-chave').value = gerarChave();
    atualizarPreviewBoleta();
    $('form-ordem').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function setLado(lado) {
    state.lado = lado;
    const isBuy = lado === 'COMPRA';
    $('btn-lado-compra').className = `side-btn ${isBuy ? 'active-buy' : ''}`;
    $('btn-lado-venda').className = `side-btn ${!isBuy ? 'active-sell' : ''}`;
    const btn = $('btn-enviar-ordem');
    btn.className = `btn btn-lg ${isBuy ? 'btn-buy' : 'btn-sell'}`;
    btn.textContent = `Enviar Ordem de ${lado}`;
  }

  function atualizarPreviewBoleta() {
    const ticker = $('ord-ticker').value;
    const cot = state.cotacoes.find((c) => c.ticker === ticker);
    $('ord-cotacao-ref').textContent = cot ? brl(cot.preco) : '-';

    const q = Number($('ord-qtd').value);
    const p = Number(String($('ord-preco').value).replace(',', '.'));
    const total = Number.isFinite(q) && Number.isFinite(p) && q > 0 && p > 0 ? q * p : 0;
    $('ord-total-preview').textContent = brl(total);

    const confLimite = state.carteira?.limiteRisco ? Number(state.carteira.limiteRisco.valorConfirmacao) : Infinity;
    const hint = $('ord-high-value-hint');
    if (total > confLimite) hint.classList.remove('hidden');
    else hint.classList.add('hidden');
  }

  function mostrarAlertaBoleta(msg, tipo = 'error') {
    const a = $('boleta-alert');
    if (!msg) { a.classList.add('hidden'); return; }
    a.className = `alert ${tipo === 'ok' ? 'alert-ok' : tipo === 'warn' ? 'alert-warn' : 'alert-error'}`;
    a.textContent = msg;
  }

  async function enviarOrdem(confirmada) {
    const payload = {
      lado: state.lado,
      ticker: $('ord-ticker').value,
      quantidade: $('ord-qtd').value,
      preco: $('ord-preco').value,
      chaveIdempotencia: $('ord-chave').value.trim(),
      confirmada,
    };
    const btn = $('btn-enviar-ordem');
    btn.disabled = true;
    mostrarAlertaBoleta(null);
    try {
      const resp = await api('/api/ordens', { method: 'POST', body: payload });
      const o = resp.ordem;
      if (resp.duplicada) {
        toast(`Reenvio idempotente reconhecido: ordem ${o.ticker} (${o.status}) preservada sem duplicação.`, 'warn');
        mostrarAlertaBoleta(`Reenvio reconhecido pela chave de idempotência. Ordem existente: ${o.status}.`, 'warn');
      } else if (o.status === 'REJEITADA') {
        toast(`Ordem rejeitada: ${o.motivoRejeicao || o.motivoRejeicaoCodigo}`, 'err');
        mostrarAlertaBoleta(`Ordem criada e rejeitada: ${o.motivoRejeicao || o.motivoRejeicaoCodigo}`, 'error');
        $('ord-chave').value = gerarChave();
      } else {
        toast(`Ordem ${o.lado} ${o.ticker} (${o.quantidade} @ ${brl(o.precoLimite)}) registrada: ${o.status}`, 'ok');
        mostrarAlertaBoleta(`Ordem registrada com status ${o.status}.`, 'ok');
        $('ord-chave').value = gerarChave();
      }
      await carregarInvestidor();
    } catch (err) {
      if (err.status === 409 && err.data && err.data.confirmacaoNecessaria) {
        abrirModalConfirmacaoAltoValor(err.message, payload);
      } else {
        mostrarAlertaBoleta(err.message, 'error');
        toast(err.message, 'err');
      }
    } finally {
      btn.disabled = false;
    }
  }

  function abrirModalConfirmacaoAltoValor(mensagem, payload) {
    $('modal-title').textContent = 'Confirmação Adicional de Alto Valor';
    const body = $('modal-body');
    body.replaceChildren(
      el('div', { class: 'alert alert-warn' }, mensagem),
      el('div', { class: 'boleta-summary' },
        el('div', { class: 'summary-line' }, el('span', {}, 'Operação'), el('strong', {}, `${payload.lado} ${payload.ticker}`)),
        el('div', { class: 'summary-line' }, el('span', {}, 'Quantidade'), el('strong', { class: 'mono' }, payload.quantidade)),
        el('div', { class: 'summary-line' }, el('span', {}, 'Preço Limite'), el('strong', { class: 'mono' }, brl(String(payload.preco).replace(',', '.')))),
        el('div', { class: 'summary-line muted' }, el('span', {}, 'Chave de Idempotência'), el('span', { class: 'mono' }, payload.chaveIdempotencia)),
      ),
    );
    const actions = $('modal-actions');
    actions.replaceChildren(
      el('button', { type: 'button', class: 'btn btn-ghost', onClick: fecharModal }, 'Cancelar'),
      el('button', {
        type: 'button',
        class: 'btn btn-primary',
        onClick: async () => { fecharModal(); await enviarOrdem(true); },
      }, 'Confirmar e Transmitir Ordem'),
    );
    $('modal-backdrop').classList.remove('hidden');
  }

  function badgeStatusOrdem(status) {
    const map = {
      EXECUTADA: 'badge-buy',
      PARCIALMENTE_EXECUTADA: 'badge-info',
      VALIDADA: 'badge-info',
      ENVIADA: 'badge-info',
      CRIADA: 'badge-neutral',
      CANCELADA: 'badge-warn',
      REJEITADA: 'badge-sell',
    };
    return el('span', { class: `badge ${map[status] || 'badge-neutral'}` }, status);
  }

  function renderOrdens() {
    const filtro = $('filtro-status-ordem').value;
    const tb = $('tb-ordens');
    tb.replaceChildren();
    const lista = filtro ? state.ordens.filter((o) => o.status === filtro) : state.ordens;
    if (!lista.length) {
      tb.appendChild(el('tr', {}, el('td', { colspan: '9', class: 'muted' }, 'Nenhuma ordem encontrada.')));
      return;
    }
    for (const o of lista) {
      const acoes = el('div', { class: 'row-actions' },
        el('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: () => verDetalhesOrdem(o.id) }, 'Detalhes'),
      );
      if (!o.statusTerminal) {
        acoes.appendChild(el('button', {
          type: 'button',
          class: 'btn btn-danger btn-sm',
          onClick: () => cancelarOrdem(o.id),
        }, 'Cancelar'));
      }
      tb.appendChild(el('tr', {},
        el('td', { class: 'mono muted' }, fmtDate(o.criadaEm)),
        el('td', {}, el('span', { class: `badge ${o.lado === 'COMPRA' ? 'badge-buy' : 'badge-sell'}` }, o.lado)),
        el('td', { class: 'mono' }, el('strong', {}, o.ticker)),
        el('td', { class: 'num mono' }, o.quantidade),
        el('td', { class: 'num mono' }, brl(o.precoLimite)),
        el('td', { class: 'num mono' }, `${o.quantidadeExecutada}/${o.quantidade}`),
        el('td', {}, badgeStatusOrdem(o.status)),
        el('td', { class: 'muted' }, o.motivoRejeicao ? o.motivoRejeicao : (o.valorExecutado > 0 ? `Exec: ${brl(o.valorExecutado)}` : '-')),
        el('td', {}, acoes),
      ));
    }
  }

  async function verDetalhesOrdem(id) {
    try {
      const d = await api(`/api/ordens/${encodeURIComponent(id)}`);
      const o = d.ordem;
      $('modal-title').textContent = `Ordem ${o.lado} ${o.ticker}`;
      const body = $('modal-body');
      body.replaceChildren(
        el('div', { class: 'boleta-summary' },
          el('div', { class: 'summary-line' }, el('span', {}, 'ID'), el('span', { class: 'mono' }, o.id)),
          el('div', { class: 'summary-line' }, el('span', {}, 'Status'), badgeStatusOrdem(o.status)),
          el('div', { class: 'summary-line' }, el('span', {}, 'Quantidade'), el('span', { class: 'mono' }, `${o.quantidadeExecutada}/${o.quantidade}`)),
          el('div', { class: 'summary-line' }, el('span', {}, 'Preço Limite'), el('span', { class: 'mono' }, brl(o.precoLimite))),
          el('div', { class: 'summary-line' }, el('span', {}, 'Valor Executado'), el('span', { class: 'mono' }, brl(o.valorExecutado))),
          el('div', { class: 'summary-line' }, el('span', {}, 'Idempotência'), el('span', { class: 'mono' }, o.chaveIdempotencia)),
          o.motivoRejeicao ? el('div', { class: 'alert alert-error' }, o.motivoRejeicao) : null,
        ),
        el('strong', {}, `Execuções na Bolsa (${d.execucoes.length})`),
      );
      if (!d.execucoes.length) {
        body.appendChild(el('div', { class: 'muted' }, 'Nenhuma execução registrada até o momento.'));
      } else {
        const list = el('div', { class: 'stack' });
        for (const ex of d.execucoes) {
          list.appendChild(el('div', { class: 'demo-item' },
            el('span', { class: 'mono' }, `${ex.idExecucao}: ${ex.quantidade} @ ${brl(ex.preco)}`),
            el('span', { class: 'muted mono' }, fmtDate(ex.executadaEm)),
          ));
        }
        body.appendChild(list);
      }
      $('modal-actions').replaceChildren(
        el('button', { type: 'button', class: 'btn btn-primary', onClick: fecharModal }, 'Fechar'),
      );
      $('modal-backdrop').classList.remove('hidden');
    } catch (err) {
      toast(err.message, 'err');
    }
  }

  async function cancelarOrdem(id) {
    try {
      const r = await api(`/api/ordens/${encodeURIComponent(id)}/cancelar`, { method: 'POST', body: {} });
      toast(`Ordem ${r.ordem.ticker} cancelada.`, 'ok');
      await carregarInvestidor();
    } catch (err) {
      toast(err.message, 'err');
    }
  }

  function renderNotificacoes() {
    $('notif-count').textContent = state.notificacoes.length;
    const list = $('lista-notificacoes');
    list.replaceChildren();
    if (!state.notificacoes.length) {
      list.appendChild(el('div', { class: 'muted' }, 'Sem notificações até o momento.'));
      return;
    }
    for (const n of state.notificacoes) {
      const cls = n.tipo === 'EXECUCAO' ? 'badge-buy' : n.tipo === 'REJEICAO' ? 'badge-sell' : 'badge-warn';
      list.appendChild(el('div', { class: 'notif-item' },
        el('div', { class: 'notif-item-top' },
          el('span', { class: `badge ${cls}` }, n.tipo),
          el('span', { class: 'muted mono' }, fmtDate(n.criadaEm)),
        ),
        el('div', {}, n.mensagem),
      ));
    }
  }

  function fecharModal() { $('modal-backdrop').classList.add('hidden'); }

  // ------------------------------------------------------------------ Risco (Analista & Admin)

  async function carregarRisco() {
    const [invResp, rejResp] = await Promise.all([
      api('/api/risco/investidores'),
      api('/api/risco/rejeitadas'),
    ]);
    const investidores = invResp.investidores || [];
    const tb = $('tb-risco-limites');
    tb.replaceChildren();
    const sel = $('risco-inv-select');
    const prevSel = sel.value;
    sel.replaceChildren();

    state.investidoresRisco = investidores;
    for (const u of investidores) {
      sel.appendChild(el('option', { value: u.id }, `${u.nome} (${u.email})`));
      const l = u.limiteRisco;
      const btn = el('button', {
        type: 'button',
        class: 'btn btn-outline btn-sm',
        onClick: () => preencherFormLimite(u.id, l),
      }, 'Editar');
      tb.appendChild(el('tr', {},
        el('td', {}, el('strong', {}, u.nome), el('div', { class: 'muted mono' }, u.email)),
        el('td', { class: 'num mono' }, l ? brl(l.valorMaximoPorOrdem) : '-'),
        el('td', { class: 'num mono' }, l ? brl(l.limiteDiario) : '-'),
        el('td', { class: 'num mono' }, l ? brl(l.valorConfirmacao) : '-'),
        el('td', {}, btn),
      ));
    }
    if (prevSel && investidores.some((u) => u.id === prevSel)) sel.value = prevSel;
    else if (investidores.length && !$('risco-max-ordem').value) {
      preencherFormLimite(investidores[0].id, investidores[0].limiteRisco);
    }

    const tbRej = $('tb-risco-rejeitadas');
    tbRej.replaceChildren();
    const rej = rejResp.ordens || [];
    if (!rej.length) {
      tbRej.appendChild(el('tr', {}, el('td', { colspan: '5', class: 'muted' }, 'Nenhuma ordem rejeitada.')));
    } else {
      for (const o of rej) {
        tbRej.appendChild(el('tr', {},
          el('td', { class: 'mono muted' }, fmtDate(o.criadaEm)),
          el('td', { class: 'mono' }, el('strong', {}, o.ticker)),
          el('td', {}, el('span', { class: `badge ${o.lado === 'COMPRA' ? 'badge-buy' : 'badge-sell'}` }, o.lado)),
          el('td', { class: 'num mono' }, brl(o.valorTotal)),
          el('td', { class: 'text-sell' }, o.motivoRejeicao || o.motivoRejeicaoCodigo || '-'),
        ));
      }
    }
  }

  function preencherFormLimite(id, l) {
    $('risco-inv-select').value = id;
    if (l) {
      $('risco-max-ordem').value = Number(l.valorMaximoPorOrdem).toFixed(2);
      $('risco-diario').value = Number(l.limiteDiario).toFixed(2);
      $('risco-confirmacao').value = Number(l.valorConfirmacao).toFixed(2);
    }
  }

  // ------------------------------------------------------------------ Administrador

  async function carregarAdmin() {
    // Reaproveita painel de risco dentro da aba admin-risco quando logado como ADMIN
    const riscoRoot = $('risco-root');
    const tabRisco = $('tab-admin-risco');
    if (riscoRoot && tabRisco && riscoRoot.parentElement !== tabRisco) {
      tabRisco.appendChild(riscoRoot);
    }
    await carregarAdminAtual();
  }

  async function carregarAdminAtual() {
    switch (state.adminTab) {
      case 'admin-operacao': return carregarAdminInvestidores();
      case 'admin-ativos': return carregarAdminAtivosEParams();
      case 'admin-auditoria': return carregarAdminAuditoria();
      case 'admin-risco': return carregarRisco();
      case 'admin-simulacao': return carregarAdminSimulacao();
      default: return carregarAdminInvestidores();
    }
  }

  async function carregarAdminInvestidores() {
    const r = await api('/api/risco/investidores');
    const invs = r.investidores || [];
    const tb = $('tb-admin-investidores');
    tb.replaceChildren();
    const sel = $('adm-dep-inv');
    const prev = sel.value;
    sel.replaceChildren();
    for (const u of invs) {
      sel.appendChild(el('option', { value: u.id }, `${u.nome} (${u.email})`));
      tb.appendChild(el('tr', {},
        el('td', {}, el('strong', {}, u.nome)),
        el('td', { class: 'mono muted' }, u.email),
        el('td', { class: 'mono muted' }, String(u.id).slice(0, 8) + '…'),
        el('td', { class: 'num mono' }, brl(u.saldoDisponivel)),
        el('td', { class: 'num mono text-amber' }, brl(u.saldoBloqueado)),
        el('td', {}, u.bloqueado
          ? el('span', { class: 'badge badge-sell' }, 'BLOQUEADO')
          : el('span', { class: 'badge badge-buy' }, 'ATIVO')),
      ));
    }
    if (prev && invs.some((u) => u.id === prev)) sel.value = prev;
  }

  async function carregarAdminAtivosEParams() {
    const [atResp, parResp] = await Promise.all([api('/api/ativos'), api('/api/admin/parametros')]);
    const tbA = $('tb-admin-ativos');
    tbA.replaceChildren();
    for (const a of atResp.ativos || []) {
      const proximo = a.status === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
      const btn = el('button', {
        type: 'button',
        class: `btn btn-sm ${a.status === 'ATIVO' ? 'btn-danger' : 'btn-buy'}`,
        onClick: async () => {
          try {
            await api(`/api/admin/ativos/${encodeURIComponent(a.ticker)}/status`, { method: 'PUT', body: { status: proximo } });
            toast(`Status de ${a.ticker} alterado para ${proximo}.`, 'ok');
            await carregarAdminAtivosEParams();
          } catch (err) { toast(err.message, 'err'); }
        },
      }, a.status === 'ATIVO' ? 'Suspender' : 'Ativar');
      tbA.appendChild(el('tr', {},
        el('td', { class: 'mono' }, el('strong', {}, a.ticker)),
        el('td', {}, a.nome),
        el('td', {}, a.tipo),
        el('td', {}, el('span', { class: `badge ${a.status === 'ATIVO' ? 'badge-buy' : 'badge-sell'}` }, a.status)),
        el('td', {}, btn),
      ));
    }

    const tbP = $('tb-admin-parametros');
    tbP.replaceChildren();
    for (const [k, v] of Object.entries(parResp.parametros || {})) {
      const inp = el('input', { type: 'text', value: v, class: 'mono input-sm' });
      const btn = el('button', {
        type: 'button',
        class: 'btn btn-outline btn-sm',
        onClick: async () => {
          try {
            await api('/api/admin/parametros', { method: 'PUT', body: { chave: k, valor: inp.value } });
            toast(`Parâmetro ${k} atualizado.`, 'ok');
            await atualizarStatus();
            await carregarAdminAtivosEParams();
          } catch (err) { toast(err.message, 'err'); }
        },
      }, 'Salvar');
      tbP.appendChild(el('tr', {},
        el('td', { class: 'mono' }, k),
        el('td', { class: 'mono muted' }, v),
        el('td', {}, inp),
        el('td', {}, btn),
      ));
    }
  }

  async function carregarAdminAuditoria() {
    const r = await api('/api/admin/auditoria?aposSeq=0&limite=200');
    const tb = $('tb-auditoria');
    tb.replaceChildren();
    const eventos = [...(r.eventos || [])].reverse();
    for (const e of eventos) {
      tb.appendChild(el('tr', {},
        el('td', { class: 'mono' }, e.seq),
        el('td', { class: 'mono muted' }, fmtDate(e.instante)),
        el('td', {}, el('span', { class: 'badge badge-info' }, e.tipo)),
        el('td', { class: 'mono' }, `${e.entidade}:${String(e.entidadeId).slice(0, 8)}`),
        el('td', {}, e.detalhes),
        el('td', { class: 'mono muted', title: e.hashAnterior }, String(e.hashAnterior).slice(0, 12) + '…'),
        el('td', { class: 'mono', title: e.hash }, String(e.hash).slice(0, 12) + '…'),
      ));
    }
  }

  async function carregarAdminSimulacao() {
    const cotResp = await api('/api/cotacoes');
    const tb = $('tb-admin-cotacoes');
    tb.replaceChildren();
    for (const c of cotResp.cotacoes || []) {
      const varNum = Number(c.variacaoPercentual);
      tb.appendChild(el('tr', {},
        el('td', { class: 'mono' }, el('strong', {}, c.ticker)),
        el('td', { class: 'num mono' }, brl(c.preco)),
        el('td', { class: `num mono ${varNum >= 0 ? 'text-buy' : 'text-sell'}` }, `${varNum.toFixed(2)}%`),
        el('td', {}, c.desatualizada ? el('span', { class: 'badge badge-warn' }, 'DESATUALIZADA') : el('span', { class: 'badge badge-buy' }, 'OK')),
      ));
    }
    atualizarStatusSimulacao();
  }

  function atualizarStatusSimulacao() {
    if (!state.status) return;
    const cor = state.status.corretoraDisponivel;
    const cot = state.status.cotacoesDisponiveis;
    $('sim-corretora-status').textContent = `Status: ${cor ? 'Operacional' : 'SIMULANDO INDISPONIBILIDADE'} · Circuit Breaker: ${state.status.circuitBreaker}`;
    $('btn-sim-corretora').textContent = cor ? 'Simular Indisponibilidade' : 'Restaurar Corretora';
    $('sim-cotacoes-status').textContent = `Status: ${cot ? 'Operacional' : 'SIMULANDO INDISPONIBILIDADE'}`;
    $('btn-sim-cotacoes').textContent = cot ? 'Simular Indisponibilidade' : 'Restaurar Cotações';
  }

  // ------------------------------------------------------------------ Listeners & Bootstrap

  function registrarEventos() {
    $('form-login').addEventListener('submit', onSubmitLogin);
    $('form-mfa').addEventListener('submit', onSubmitMfa);
    $('btn-mfa-voltar').addEventListener('click', voltarParaLogin);
    $('btn-logout').addEventListener('click', sair);
    $('btn-modal-close').addEventListener('click', fecharModal);
    $('modal-backdrop').addEventListener('click', (e) => { if (e.target === $('modal-backdrop')) fecharModal(); });

    $('btn-toggle-pwd').addEventListener('click', () => {
      const inp = $('login-senha');
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      $('btn-toggle-pwd').textContent = show ? 'Ocultar' : 'Mostrar';
    });

    $('btn-fill-mfa').addEventListener('click', () => {
      const code = $('mfa-sim-code').textContent.trim();
      const boxes = Array.from(document.querySelectorAll('#otp-grid .otp-box'));
      code.split('').forEach((ch, i) => { if (boxes[i]) boxes[i].value = ch; });
    });

    configurarOtpInputs();

    // Boleta
    $('btn-lado-compra').addEventListener('click', () => setLado('COMPRA'));
    $('btn-lado-venda').addEventListener('click', () => setLado('VENDA'));
    $('ord-ticker').addEventListener('change', () => {
      const cot = state.cotacoes.find((c) => c.ticker === $('ord-ticker').value);
      if (cot) $('ord-preco').value = Number(cot.preco).toFixed(2);
      atualizarPreviewBoleta();
    });
    $('ord-qtd').addEventListener('input', atualizarPreviewBoleta);
    $('ord-preco').addEventListener('input', atualizarPreviewBoleta);
    $('btn-usar-cotacao').addEventListener('click', () => {
      const cot = state.cotacoes.find((c) => c.ticker === $('ord-ticker').value);
      if (cot) { $('ord-preco').value = Number(cot.preco).toFixed(2); atualizarPreviewBoleta(); }
    });
    $('btn-nova-chave').addEventListener('click', () => { $('ord-chave').value = gerarChave(); });
    $('form-ordem').addEventListener('submit', (e) => { e.preventDefault(); enviarOrdem(false); });
    $('filtro-status-ordem').addEventListener('change', renderOrdens);

    $('btn-refresh-inv').addEventListener('click', () => carregarInvestidor().catch((err) => toast(err.message, 'err')));
    $('btn-toggle-autorefresh').addEventListener('click', () => {
      state.autoRefresh = !state.autoRefresh;
      $('btn-toggle-autorefresh').textContent = state.autoRefresh ? 'Pausar auto' : 'Retomar auto';
    });
    $('btn-notif-bell').addEventListener('click', () => $('card-notificacoes').scrollIntoView({ behavior: 'smooth' }));

    // Admin tabs
    document.querySelectorAll('#admin-tabs .tab').forEach((btn) => {
      btn.addEventListener('click', async () => {
        state.adminTab = btn.dataset.tab;
        document.querySelectorAll('#admin-tabs .tab').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('#view-admin .tab-panel').forEach((p) => p.classList.toggle('hidden', p.id !== `tab-${state.adminTab}`));
        try { await carregarAdminAtual(); } catch (err) { toast(err.message, 'err'); }
      });
    });

    $('form-admin-investidor').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/admin/investidores', {
          method: 'POST',
          body: { nome: $('adm-inv-nome').value, email: $('adm-inv-email').value, senha: $('adm-inv-senha').value },
        });
        toast('Investidor cadastrado com sucesso.', 'ok');
        e.target.reset();
        await carregarAdminInvestidores();
      } catch (err) { toast(err.message, 'err'); }
    });

    $('form-admin-deposito').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/admin/depositos', {
          method: 'POST',
          body: { investidorId: $('adm-dep-inv').value, valor: $('adm-dep-valor').value },
        });
        toast('Depósito simulado creditado.', 'ok');
        $('adm-dep-valor').value = '';
        await carregarAdminInvestidores();
      } catch (err) { toast(err.message, 'err'); }
    });

    $('form-admin-ativo').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/admin/ativos', {
          method: 'POST',
          body: { ticker: $('adm-at-ticker').value, nome: $('adm-at-nome').value, tipo: $('adm-at-tipo').value },
        });
        toast('Ativo cadastrado.', 'ok');
        e.target.reset();
        await carregarAdminAtivosEParams();
      } catch (err) { toast(err.message, 'err'); }
    });

    $('btn-toggle-mercado').addEventListener('click', async () => {
      try {
        const atual = Boolean(state.status?.mercadoForcarAberto);
        await api('/api/admin/parametros', {
          method: 'PUT',
          body: { chave: 'mercado.forcar_aberto', valor: atual ? 'false' : 'true' },
        });
        toast(`mercado.forcar_aberto = ${!atual}`, 'ok');
        await atualizarStatus();
        await carregarAdminAtivosEParams();
      } catch (err) { toast(err.message, 'err'); }
    });

    $('btn-verificar-integridade').addEventListener('click', async () => {
      try {
        const v = await api('/api/admin/auditoria/integridade');
        const box = $('auditoria-integridade-box');
        box.className = `alert ${v.integra ? 'alert-ok' : 'alert-error'}`;
        box.textContent = v.integra
          ? `✔ Integridade verificada: ${v.motivo}`
          : `✘ Falha na cadeia no seq #${v.seqProblema}: ${v.motivo}`;
      } catch (err) { toast(err.message, 'err'); }
    });
    $('btn-refresh-auditoria').addEventListener('click', () => carregarAdminAuditoria().catch((err) => toast(err.message, 'err')));

    // Simulação
    $('btn-sim-corretora').addEventListener('click', async () => {
      try {
        const atual = Boolean(state.status?.corretoraDisponivel);
        await api('/api/admin/simulacao', { method: 'POST', body: { acao: 'corretora_indisponivel', valor: atual } });
        await atualizarStatus();
      } catch (err) { toast(err.message, 'err'); }
    });
    $('btn-sim-cotacoes').addEventListener('click', async () => {
      try {
        const atual = Boolean(state.status?.cotacoesDisponiveis);
        await api('/api/admin/simulacao', { method: 'POST', body: { acao: 'cotacoes_indisponiveis', valor: atual } });
        await atualizarStatus();
      } catch (err) { toast(err.message, 'err'); }
    });
    $('btn-sim-lote').addEventListener('click', async () => {
      try {
        const lote = Number($('sim-lote-input').value || 0);
        await api('/api/admin/simulacao', { method: 'POST', body: { acao: 'lote_maximo', valor: lote } });
        toast(lote > 0 ? `Lote máximo por execução ajustado para ${lote}.` : 'Lote máximo restaurado (ilimitado).', 'ok');
      } catch (err) { toast(err.message, 'err'); }
    });
    $('btn-sim-ciclo').addEventListener('click', async () => {
      try {
        await api('/api/admin/simulacao', { method: 'POST', body: { acao: 'processar_fila' } });
        toast('Ciclo do processador/outbox executado.', 'ok');
        await atualizarStatus();
      } catch (err) { toast(err.message, 'err'); }
    });
    $('btn-sim-variar').addEventListener('click', async () => {
      try {
        await api('/api/admin/simulacao', { method: 'POST', body: { acao: 'variar_cotacoes' } });
        await carregarAdminSimulacao();
      } catch (err) { toast(err.message, 'err'); }
    });

    // Risco
    $('risco-inv-select').addEventListener('change', () => {
      const inv = (state.investidoresRisco || []).find((u) => u.id === $('risco-inv-select').value);
      if (inv) preencherFormLimite(inv.id, inv.limiteRisco);
    });
    $('btn-refresh-risco').addEventListener('click', () => carregarRisco().catch((err) => toast(err.message, 'err')));
    $('form-risco-limite').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const id = $('risco-inv-select').value;
        await api(`/api/risco/limites/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: {
            valorMaximoPorOrdem: $('risco-max-ordem').value,
            limiteDiario: $('risco-diario').value,
            valorConfirmacao: $('risco-confirmacao').value,
          },
        });
        toast('Limites de risco atualizados.', 'ok');
        await carregarRisco();
      } catch (err) { toast(err.message, 'err'); }
    });
  }

  async function init() {
    registrarEventos();
    await atualizarStatus();
    await carregarContasDemo();

    if (state.token) {
      try {
        state.usuario = await api('/api/auth/me', { ignoreAuthReset: true });
        await abrirDashboard();
      } catch (_) {
        sairLocal(false);
      }
    }
    setInterval(atualizarStatus, 8000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
