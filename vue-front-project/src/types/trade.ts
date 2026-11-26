export type AssetType = 'STOCK' | 'ETF' | 'FII'

export interface Asset {
  symbol: string
  name: string
  type: AssetType
  price: number
  previousClose: number
  changePercent: number
  changeAmount: number
  high: number
  low: number
  volume: number
  history: number[] // Últimos preços para gráfico sparkline
}

export interface PortfolioPosition {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  totalValue: number
  pnlAmount: number
  pnlPercent: number
}

export interface InvestorAccount {
  accountNumber: string
  investorName: string
  riskProfile: 'Conservador' | 'Moderado' | 'Arrojado'
  cashBalance: number // Saldo disponível em R$
  blockedBalance: number // Saldo retido em ordens abertas
  dailyRiskLimit: number // Limite financeiro diário de risco (RF-01 / RF-05)
  usedRiskLimit: number // Total de risco consumido no dia
}

export type OrderSide = 'BUY' | 'SELL'
export type OrderType = 'MARKET' | 'LIMIT'

export type OrderStatus =
  | 'PENDING_VALIDATION'
  | 'VALIDATING_RISK'
  | 'TRANSMITTED'
  | 'EXECUTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED'

export interface Order {
  id: string
  idempotencyKey: string // Prevenção contra duplicidade (RNF-02)
  symbol: string
  side: OrderSide
  type: OrderType
  quantity: number
  price: number
  totalValue: number
  status: OrderStatus
  statusReason?: string
  createdAt: string
  updatedAt: string
}

export type MarketStatus = 'OPEN' | 'CLOSED' | 'CIRCUIT_BREAKER' | 'AUCTION'

export interface AuditLog {
  id: string
  timestamp: string
  action:
    | 'USER_LOGIN'
    | 'ORDER_CREATED'
    | 'RISK_VALIDATION_PASSED'
    | 'RISK_VALIDATION_REJECTED'
    | 'ORDER_TRANSMITTED_EXCHANGE'
    | 'ORDER_EXECUTED'
    | 'ORDER_CANCELLED'
    | 'CIRCUIT_BREAKER_TRIGGERED'
    | 'MARKET_STATUS_CHANGED'
  entityId: string
  user: string
  details: string
  previousHash: string
  hash: string // Hash imutável simulado (RF-08)
}

export interface TradeNotification {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: string
  read: boolean
}

export interface OrderBookEntry {
  price: number
  quantity: number
  total: number
}
