import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Asset,
  InvestorAccount,
  PortfolioPosition,
  Order,
  OrderSide,
  OrderType,
  MarketStatus,
  AuditLog,
  TradeNotification,
  OrderBookEntry,
} from '@/types/trade'

// Função utilitária para hash SHA-256 simulado em cadeia (blockchain-style para auditoria imutável)
async function generateAuditHash(content: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback simples se crypto.subtle não estiver disponível
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(64, 'a')
  }
}

export const useTradeStore = defineStore('trade', () => {
  // 1. ATIVOS NEGOCIÁVEIS (Ações, ETFs, FIIs)
  const assets = ref<Asset[]>([
    {
      symbol: 'PETR4',
      name: 'Petrobras PN',
      type: 'STOCK',
      price: 38.5,
      previousClose: 37.8,
      changePercent: 1.85,
      changeAmount: 0.7,
      high: 38.9,
      low: 37.6,
      volume: 8524000,
      history: [37.8, 38.1, 37.95, 38.3, 38.2, 38.45, 38.5],
    },
    {
      symbol: 'VALE3',
      name: 'Vale ON',
      type: 'STOCK',
      price: 61.8,
      previousClose: 62.4,
      changePercent: -0.96,
      changeAmount: -0.6,
      high: 62.9,
      low: 61.5,
      volume: 6410000,
      history: [62.4, 62.6, 62.1, 61.9, 62.0, 61.7, 61.8],
    },
    {
      symbol: 'ITUB4',
      name: 'Itaú Unibanco PN',
      type: 'STOCK',
      price: 34.6,
      previousClose: 34.1,
      changePercent: 1.47,
      changeAmount: 0.5,
      high: 34.8,
      low: 34.0,
      volume: 4890000,
      history: [34.1, 34.2, 34.35, 34.4, 34.5, 34.55, 34.6],
    },
    {
      symbol: 'WEGE3',
      name: 'WEG S.A. ON',
      type: 'STOCK',
      price: 43.15,
      previousClose: 42.8,
      changePercent: 0.82,
      changeAmount: 0.35,
      high: 43.5,
      low: 42.7,
      volume: 3120000,
      history: [42.8, 42.9, 43.0, 42.95, 43.1, 43.05, 43.15],
    },
    {
      symbol: 'IVVB11',
      name: 'iShares S&P 500 ETF',
      type: 'ETF',
      price: 312.2,
      previousClose: 309.5,
      changePercent: 0.87,
      changeAmount: 2.7,
      high: 313.5,
      low: 309.2,
      volume: 1250000,
      history: [309.5, 310.2, 311.0, 311.8, 311.5, 312.0, 312.2],
    },
    {
      symbol: 'BOVA11',
      name: 'iShares Ibovespa ETF',
      type: 'ETF',
      price: 126.4,
      previousClose: 125.1,
      changePercent: 1.04,
      changeAmount: 1.3,
      high: 127.0,
      low: 124.9,
      volume: 2450000,
      history: [125.1, 125.5, 125.8, 126.1, 126.0, 126.3, 126.4],
    },
    {
      symbol: 'HGLG11',
      name: 'CSHG Logística FII',
      type: 'FII',
      price: 163.2,
      previousClose: 162.8,
      changePercent: 0.25,
      changeAmount: 0.4,
      high: 163.5,
      low: 162.6,
      volume: 450000,
      history: [162.8, 162.9, 163.0, 163.1, 163.0, 163.15, 163.2],
    },
    {
      symbol: 'MXRF11',
      name: 'Maxi Renda FII',
      type: 'FII',
      price: 10.42,
      previousClose: 10.45,
      changePercent: -0.29,
      changeAmount: -0.03,
      high: 10.48,
      low: 10.4,
      volume: 5900000,
      history: [10.45, 10.44, 10.46, 10.43, 10.44, 10.42, 10.42],
    },
  ])

  // Ativo atualmente selecionado para operar
  const selectedSymbol = ref<string>('PETR4')
  const selectedAsset = computed(() => {
    return assets.value.find((a) => a.symbol === selectedSymbol.value) || assets.value[0]!
  })

  // 2. CONTA DO INVESTIDOR & LIMITES FINANCEIROS (RF-01 / RF-05)
  const account = ref<InvestorAccount>({
    accountNumber: 'ORION-84920-1',
    investorName: 'Leonardo Cruz (Orion VIP)',
    riskProfile: 'Moderado',
    cashBalance: 120000.0, // R$ 120.000,00 disponíveis
    blockedBalance: 0.0,
    dailyRiskLimit: 75000.0, // Limite financeiro diário de risco
    usedRiskLimit: 14500.0, // Já consumido hoje
  })

  // Limite de risco restante disponível
  const remainingRiskLimit = computed(() => {
    return Math.max(0, account.value.dailyRiskLimit - account.value.usedRiskLimit)
  })

  // 3. CARTEIRA DE CUSTÓDIA DO INVESTIDOR
  const positions = ref<PortfolioPosition[]>([
    {
      symbol: 'PETR4',
      quantity: 500,
      averagePrice: 36.4,
      currentPrice: 38.5,
      totalValue: 500 * 38.5,
      pnlAmount: (38.5 - 36.4) * 500,
      pnlPercent: ((38.5 - 36.4) / 36.4) * 100,
    },
    {
      symbol: 'VALE3',
      quantity: 250,
      averagePrice: 63.2,
      currentPrice: 61.8,
      totalValue: 250 * 61.8,
      pnlAmount: (61.8 - 63.2) * 250,
      pnlPercent: ((61.8 - 63.2) / 63.2) * 100,
    },
    {
      symbol: 'IVVB11',
      quantity: 40,
      averagePrice: 298.0,
      currentPrice: 312.2,
      totalValue: 40 * 312.2,
      pnlAmount: (312.2 - 298.0) * 40,
      pnlPercent: ((312.2 - 298.0) / 298.0) * 100,
    },
    {
      symbol: 'HGLG11',
      quantity: 80,
      averagePrice: 160.0,
      currentPrice: 163.2,
      totalValue: 80 * 163.2,
      pnlAmount: (163.2 - 160.0) * 80,
      pnlPercent: ((163.2 - 160.0) / 160.0) * 100,
    },
  ])

  // Patrimônio total alocado em ativos
  const totalInvested = computed(() => {
    return positions.value.reduce((acc, pos) => acc + pos.totalValue, 0)
  })

  // Patrimônio líquido consolidado (Saldo + Ativos)
  const totalEquity = computed(() => {
    return account.value.cashBalance + account.value.blockedBalance + totalInvested.value
  })

  // 4. SITUAÇÃO DO MERCADO (Mecanismo de Resiliência e Indisponibilidade - RNF-02)
  const marketStatus = ref<MarketStatus>('OPEN')
  const isMarketOpen = computed(() => marketStatus.value === 'OPEN')

  // 5. ORDENS & CICLO DE VIDA (RF-04 / RF-07)
  const orders = ref<Order[]>([])
  const processedIdempotencyKeys = new Set<string>()

  // 6. LOGS DE AUDITORIA IMUTÁVEIS (RF-08)
  const auditLogs = ref<AuditLog[]>([])
  let lastAuditHash = '0000000000000000000000000000000000000000000000000000000000000000'

  // 7. NOTIFICAÇÕES AO INVESTIDOR (RF-09)
  const notifications = ref<TradeNotification[]>([])
  const unreadNotificationsCount = computed(() => notifications.value.filter((n) => !n.read).length)

  function addNotification(
    type: TradeNotification['type'],
    title: string,
    message: string,
  ) {
    const item: TradeNotification = {
      id: 'notif_' + Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      timestamp: new Date().toLocaleTimeString(),
      read: false,
    }
    notifications.value.unshift(item)
    // Mantém no máximo 30 notificações
    if (notifications.value.length > 30) {
      notifications.value.pop()
    }
  }

  function markNotificationsAsRead() {
    notifications.value.forEach((n) => (n.read = true))
  }

  // REGISTRO DE AUDITORIA IMUTÁVEL (RF-08)
  async function recordAuditLog(
    action: AuditLog['action'],
    entityId: string,
    details: string,
  ) {
    const timestamp = new Date().toISOString()
    const content = `${lastAuditHash}|${timestamp}|${action}|${entityId}|${details}`
    const hash = await generateAuditHash(content)

    const log: AuditLog = {
      id: 'aud_' + Math.random().toString(36).substring(2, 9),
      timestamp,
      action,
      entityId,
      user: account.value.accountNumber,
      details,
      previousHash: lastAuditHash,
      hash,
    }

    lastAuditHash = hash
    auditLogs.value.unshift(log)
    // Mantém histórico ordenado
    if (auditLogs.value.length > 100) {
      auditLogs.value.pop()
    }
  }

  // ATUALIZAÇÃO DA CARTEIRA APÓS MUDANÇA DE PREÇOS
  function updatePortfolioValuations() {
    positions.value.forEach((pos) => {
      const asset = assets.value.find((a) => a.symbol === pos.symbol)
      if (asset) {
        pos.currentPrice = asset.price
        pos.totalValue = pos.quantity * asset.price
        pos.pnlAmount = (asset.price - pos.averagePrice) * pos.quantity
        pos.pnlPercent = ((asset.price - pos.averagePrice) / pos.averagePrice) * 100
      }
    })
  }

  // LIVRO DE OFERTAS SIMULADO (Book de ofertas do ativo selecionado)
  const orderBook = computed<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>(() => {
    const price = selectedAsset.value.price
    const bids: OrderBookEntry[] = [
      { price: Number((price - 0.02).toFixed(2)), quantity: 1200, total: 1200 },
      { price: Number((price - 0.05).toFixed(2)), quantity: 3400, total: 4600 },
      { price: Number((price - 0.09).toFixed(2)), quantity: 5100, total: 9700 },
      { price: Number((price - 0.15).toFixed(2)), quantity: 8200, total: 17900 },
    ]
    const asks: OrderBookEntry[] = [
      { price: Number((price + 0.02).toFixed(2)), quantity: 1500, total: 1500 },
      { price: Number((price + 0.06).toFixed(2)), quantity: 2800, total: 4300 },
      { price: Number((price + 0.11).toFixed(2)), quantity: 4900, total: 9200 },
      { price: Number((price + 0.18).toFixed(2)), quantity: 7600, total: 16800 },
    ]
    return { bids, asks }
  })

  // 8. SIMULAÇÃO DE FEED DE COTAÇÕES EM TEMPO QUASE REAL (RF-03)
  let feedInterval: ReturnType<typeof setInterval> | null = null

  function startMarketFeed() {
    if (feedInterval) return

    feedInterval = setInterval(() => {
      // Se mercado estiver fechado ou circuit breaker, cotações congeladas
      if (marketStatus.value === 'CLOSED' || marketStatus.value === 'CIRCUIT_BREAKER') {
        return
      }

      // Escolhe 1 a 3 ativos para oscilar aleatoriamente
      const count = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * assets.value.length)
        const asset = assets.value[randomIndex]
        if (!asset) continue

        // Variação de -0.5% a +0.5%
        const variation = (Math.random() - 0.49) * 0.01 * asset.price
        const newPrice = Number(Math.max(1.0, asset.price + variation).toFixed(2))

        asset.price = newPrice
        asset.changeAmount = Number((newPrice - asset.previousClose).toFixed(2))
        asset.changePercent = Number(((asset.changeAmount / asset.previousClose) * 100).toFixed(2))
        asset.high = Math.max(asset.high, newPrice)
        asset.low = Math.min(asset.low, newPrice)
        asset.volume += Math.floor(Math.random() * 2000)

        // Adiciona ao histórico do sparkline
        asset.history.push(newPrice)
        if (asset.history.length > 15) {
          asset.history.shift()
        }
      }

      // Atualiza valores da custódia
      updatePortfolioValuations()
    }, 2400)
  }

  function stopMarketFeed() {
    if (feedInterval) {
      clearInterval(feedInterval)
      feedInterval = null
    }
  }

  // 9. MOTOR DE RISCO: VALIDAÇÃO PRÉ-TRADE (RF-05)
  function validateOrderRisk(
    side: OrderSide,
    symbol: string,
    quantity: number,
    price: number,
    idempotencyKey: string,
  ): { valid: boolean; reason?: string } {
    // 1. Verificação de Mercado
    if (marketStatus.value !== 'OPEN') {
      return {
        valid: false,
        reason: `Mercado indisponível para negociação direta (Status: ${marketStatus.value}).`,
      }
    }

    // 2. Prevenção de duplicidade de ordem (RNF-02)
    if (processedIdempotencyKeys.has(idempotencyKey)) {
      return {
        valid: false,
        reason: 'Ordem duplicada detectada pelo token de idempotência.',
      }
    }

    const totalValue = quantity * price

    // 3. Validação de Limite de Risco Diário (RF-01 / RF-05)
    if (account.value.usedRiskLimit + totalValue > account.value.dailyRiskLimit) {
      const excess = account.value.usedRiskLimit + totalValue - account.value.dailyRiskLimit
      return {
        valid: false,
        reason: `Limite de risco diário excedido em R$ ${excess.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
      }
    }

    // 4. Validação de Saldo Disponível (Compra)
    if (side === 'BUY') {
      if (account.value.cashBalance < totalValue) {
        return {
          valid: false,
          reason: `Saldo insuficiente. Necessário: R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Disponível: R$ ${account.value.cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        }
      }
    }

    // 5. Validação de Posição em Carteira (Venda)
    if (side === 'SELL') {
      const position = positions.value.find((p) => p.symbol === symbol)
      const currentQty = position ? position.quantity : 0
      if (currentQty < quantity) {
        return {
          valid: false,
          reason: `Posição em custódia insuficiente para venda. Você possui ${currentQty} de ${symbol}, tentando vender ${quantity}.`,
        }
      }
    }

    return { valid: true }
  }

  // 10. SUBMISSÃO DE ORDEM E CICLO DE VIDA (RF-04 / RF-06 / RF-07)
  async function submitOrder(params: {
    symbol: string
    side: OrderSide
    type: OrderType
    quantity: number
    price: number
    idempotencyKey?: string
  }): Promise<{ success: boolean; orderId: string; message: string }> {
    const idempotencyKey =
      params.idempotencyKey || 'idemp_' + Math.random().toString(36).substring(2, 11)
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000)
    const totalValue = Number((params.quantity * params.price).toFixed(2))

    // Criação inicial da ordem (Estado: PENDING_VALIDATION)
    const newOrder: Order = {
      id: orderId,
      idempotencyKey,
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      quantity: params.quantity,
      price: params.price,
      totalValue,
      status: 'PENDING_VALIDATION',
      createdAt: new Date().toLocaleTimeString(),
      updatedAt: new Date().toLocaleTimeString(),
    }

    orders.value.unshift(newOrder)

    // Registra na trilha de auditoria
    await recordAuditLog(
      'ORDER_CREATED',
      orderId,
      `Ordem de ${params.side === 'BUY' ? 'COMPRA' : 'VENDA'} criada para ${params.quantity}x ${params.symbol} a R$ ${params.price.toFixed(2)}.`,
    )

    // Simula transição para VALIDATING_RISK
    newOrder.status = 'VALIDATING_RISK'
    newOrder.updatedAt = new Date().toLocaleTimeString()

    // Executa motor de risco
    const riskCheck = validateOrderRisk(
      params.side,
      params.symbol,
      params.quantity,
      params.price,
      idempotencyKey,
    )

    if (!riskCheck.valid) {
      newOrder.status = 'REJECTED'
      newOrder.statusReason = riskCheck.reason
      newOrder.updatedAt = new Date().toLocaleTimeString()

      await recordAuditLog(
        'RISK_VALIDATION_REJECTED',
        orderId,
        `Ordem rejeitada pelo motor de risco: ${riskCheck.reason}`,
      )

      addNotification(
        'error',
        `Ordem ${orderId} Rejeitada`,
        riskCheck.reason || 'Falha na validação de risco.',
      )

      return {
        success: false,
        orderId,
        message: riskCheck.reason || 'Ordem rejeitada por risco.',
      }
    }

    // Marca chave de idempotência como processada
    processedIdempotencyKeys.add(idempotencyKey)

    // Aprovação de risco
    await recordAuditLog(
      'RISK_VALIDATION_PASSED',
      orderId,
      `Ordem aprovada: saldo, custódia, limite de risco e mercado validados com sucesso.`,
    )

    // Bloqueio preventivo de saldo em caso de compra
    if (params.side === 'BUY') {
      account.value.cashBalance -= totalValue
      account.value.blockedBalance += totalValue
    }

    // Transmite à Bolsa/Corretora simulada (RF-06)
    newOrder.status = 'TRANSMITTED'
    newOrder.updatedAt = new Date().toLocaleTimeString()

    await recordAuditLog(
      'ORDER_TRANSMITTED_EXCHANGE',
      orderId,
      `Ordem roteada e transmitida ao motor de execução da Bolsa/Corretora simulada.`,
    )

    addNotification(
      'info',
      `Ordem ${orderId} Transmitida`,
      `Aguardando execução pela Bolsa para ${params.symbol}...`,
    )

    // Simula tempo de processamento e matching engine da Bolsa (1.8s)
    setTimeout(async () => {
      // Se foi cancelada durante a transmissão, aborta
      if (newOrder.status === 'CANCELLED') return

      // Se mercado entrou em circuit breaker durante o voo da ordem
      if (marketStatus.value === 'CIRCUIT_BREAKER') {
        newOrder.status = 'FAILED'
        newOrder.statusReason = 'Execução cancelada devido ao acionamento de Circuit Breaker.'
        if (params.side === 'BUY') {
          account.value.cashBalance += totalValue
          account.value.blockedBalance -= totalValue
        }
        await recordAuditLog(
          'CIRCUIT_BREAKER_TRIGGERED',
          orderId,
          `Execução abortada pela Bolsa devido a Circuit Breaker.`,
        )
        addNotification(
          'warning',
          `Ordem ${orderId} Não Executada`,
          'Mercado interrompido por Circuit Breaker.',
        )
        return
      }

      // Execução com sucesso na Bolsa simulada
      newOrder.status = 'EXECUTED'
      newOrder.updatedAt = new Date().toLocaleTimeString()

      // Atualiza limites e saldos da conta
      account.value.usedRiskLimit += totalValue

      if (params.side === 'BUY') {
        account.value.blockedBalance -= totalValue
        // Atualiza ou insere na carteira
        const existingPos = positions.value.find((p) => p.symbol === params.symbol)
        if (existingPos) {
          const newQty = existingPos.quantity + params.quantity
          const newAvgPrice =
            (existingPos.quantity * existingPos.averagePrice + totalValue) / newQty
          existingPos.quantity = newQty
          existingPos.averagePrice = Number(newAvgPrice.toFixed(2))
        } else {
          positions.value.push({
            symbol: params.symbol,
            quantity: params.quantity,
            averagePrice: params.price,
            currentPrice: params.price,
            totalValue,
            pnlAmount: 0,
            pnlPercent: 0,
          })
        }
      } else {
        // VENDA
        account.value.cashBalance += totalValue
        const existingPos = positions.value.find((p) => p.symbol === params.symbol)
        if (existingPos) {
          existingPos.quantity -= params.quantity
          if (existingPos.quantity <= 0) {
            positions.value = positions.value.filter((p) => p.symbol !== params.symbol)
          }
        }
      }

      updatePortfolioValuations()

      await recordAuditLog(
        'ORDER_EXECUTED',
        orderId,
        `Ordem totalmente executada na Bolsa a R$ ${params.price.toFixed(2)}. Custódia e saldo atualizados.`,
      )

      addNotification(
        'success',
        `Ordem ${orderId} Executada!`,
        `${params.side === 'BUY' ? 'Compra' : 'Venda'} de ${params.quantity}x ${params.symbol} executada com sucesso.`,
      )
    }, 1800)

    return {
      success: true,
      orderId,
      message: 'Ordem transmitida com sucesso para a Bolsa.',
    }
  }

  // 11. CANCELAMENTO DE ORDEM (RF-04)
  async function cancelOrder(orderId: string): Promise<boolean> {
    const order = orders.value.find((o) => o.id === orderId)
    if (!order) return false

    if (order.status !== 'TRANSMITTED' && order.status !== 'PENDING_VALIDATION') {
      addNotification('warning', 'Cancelamento Não Permitido', 'Apenas ordens abertas podem ser canceladas.')
      return false
    }

    order.status = 'CANCELLED'
    order.statusReason = 'Cancelamento solicitado pelo investidor.'
    order.updatedAt = new Date().toLocaleTimeString()

    // Estorno de saldo bloqueado se for compra
    if (order.side === 'BUY') {
      account.value.cashBalance += order.totalValue
      account.value.blockedBalance -= order.totalValue
    }

    await recordAuditLog(
      'ORDER_CANCELLED',
      orderId,
      `Ordem de ${order.symbol} cancelada pelo investidor. Saldo bloqueado liberado.`,
    )

    addNotification(
      'warning',
      `Ordem ${orderId} Cancelada`,
      `A ordem para ${order.symbol} foi cancelada com sucesso.`,
    )

    return true
  }

  // 12. CONTROLE DE RESILIÊNCIA E SIMULAÇÃO DE INDISPONIBILIDADE (RNF-02)
  async function toggleMarketStatus(status: MarketStatus) {
    marketStatus.value = status
    await recordAuditLog(
      'MARKET_STATUS_CHANGED',
      'MARKET_CTRL',
      `Situação do mercado alterada administrativamente para: ${status}.`,
    )

    if (status === 'CIRCUIT_BREAKER') {
      addNotification(
        'error',
        '🚨 CIRCUIT BREAKER ACIONADO',
        'Negociações interrompidas devido à volatilidade atípica.',
      )
    } else if (status === 'AUCTION') {
      addNotification(
        'warning',
        'Leilão em Andamento',
        'Mercado em leilão de abertura/fechamento.',
      )
    } else if (status === 'OPEN') {
      addNotification('success', 'Mercado Aberto', 'Negociações normais restabelecidas.')
    }
  }

  // Inicia com alguns logs de auditoria iniciais simulando o login do usuário
  recordAuditLog('USER_LOGIN', account.value.accountNumber, 'Sessão iniciada com autenticação MFA válida.')

  return {
    assets,
    selectedSymbol,
    selectedAsset,
    account,
    remainingRiskLimit,
    positions,
    totalInvested,
    totalEquity,
    marketStatus,
    isMarketOpen,
    orders,
    auditLogs,
    notifications,
    unreadNotificationsCount,
    orderBook,
    startMarketFeed,
    stopMarketFeed,
    validateOrderRisk,
    submitOrder,
    cancelOrder,
    toggleMarketStatus,
    addNotification,
    markNotificationsAsRead,
  }
})
