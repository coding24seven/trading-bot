import { randomUUID } from 'crypto'

export type StoreSetupParameters = {
  continueWithExistingDatabase?: boolean
  isHistoricalPrice?: boolean
  createsStoreAndExits?: boolean
  botConfigFromGenerator?: BotConfig | null
}

export type AppEnvironment = {
  appId: string
  databaseUrl: string
  databasePort: string
  requestUrl: string
}

export type AccountData = {
  config?: AccountConfig
  bots?: BotData[]
}

export type AccountDataStripped = {
  bots?: BotData[]
}

export type AccountConfig = {
  apiKey: string
  secretKey: string
  passphrase: string
  environment: string
  exchangeFee?: number
}

export type BotConfigIndexesPerAccount = {
  botConfigIndexesPerAccount: number[]
}

export type BotData = {
  config: BotConfig
  vars: BotVariables
}

export type BotConfig = {
  symbol: string
  from: number
  to: number
  quoteFrom: number
  quoteTo: number
  baseFrom: number
  baseTo: number
  handCount: number | null
  handSpanPercent: number
  quoteStartAmount: number
  quoteStartAmountPerHand: number | null
  baseStartAmount: number
  baseStartAmountPerHand: number | null
  exchangeFee: number
  baseMinimumTradeSize: number | null
  quoteMinimumTradeSize: number | null
  baseIncrement: string | null
  quoteIncrement: string | null
  id: number | null
  itsAccountId: number | null
}

export type BotDataWithResults = {
  hands: BotHand[]
  tradeHistory?: TradeHistoryItem[]
  config: BotConfig
  results: BotResults | undefined
}

export type BotVariables = {
  hands: BotHand[]
  results?: BotResults
}

export type BotResults = {
  quoteTotal: number
  baseTotal: number
  baseAtLastPriceToQuoteTotal: number
  pairTotal: number
  quoteTotalIncludingBaseSoldAsPlanned: number
  buyCountTotal: number
  sellCountTotal: number
  lastPrice: number
  lowestPriceRecorded: number
  highestPriceRecorded: number
}

export type BotHand = {
  id: number
  buyBelow: number
  sellAbove: number
  quote: number
  base: number
  buyCount: number
  sellCount: number
  tradeIsPending: boolean
}

export type TradeHistoryItem = {
  id: number
  buyBelow: number
  sellAbove: number
  buyCount: number
  sellCount: number
  lastPrice: number
  type: string
}

export type PairTradeSizes = {
  base: number
  quote: number
}

export type PriceStreamCallbackParameters = {
  symbol: string
  lastPrice: number
}

export type KucoinNodeApiTickerMessage = {
  type: string
  topic: string
  subject: string
  data: KucoinNodeApiTickerMessageData
}

export type KucoinNodeApiTickerMessageData = {
  bestAsk: string
  bestAskSize: string
  bestBid: string
  bestBidSize: string
  price: string
  sequence: string
  size: string
  time: number
}

export type KucoinSymbolsResponse = {
  code: string
  data: KucoinSymbolData[]
}

export type KucoinSymbolData = {
  symbol: string
  name: string
  baseCurrency: string
  quoteCurrency: string
  feeCurrency: string
  market: string
  baseMinSize: string
  quoteMinSize: string
  baseMaxSize: string
  quoteMaxSize: string
  baseIncrement: string
  quoteIncrement: string
  priceIncrement: string
  priceLimitRate: string
  isMarginEnabled: boolean
  enableTrading: boolean
}

export type KucoinOrderPlacedResponse = {
  code: string
  data: {
    orderId: string
  }
}

export type KucoinGetOrderByIdResponse = {
  code: string
  data: {
    id: string // i.e. '42y1597669a7793041273690'
    symbol: string // i.e. 'BTC-USDT'
    opType: string // i.e. 'DEAL'
    type: string // i.e. 'market'
    side: string // i.e. 'buy'
    price: string // i.e. '0'
    size: string // i.e. '0'
    funds: string // i.e. '0.01'
    dealFunds: string // i.e. '0.43958624'
    dealSize: string // i.e. '0.0000442'
    fee: string // i.e. '0.00007739994'
    feeCurrency: string // i.e. 'USDT'
    stp: string // i.e. ''
    stop: string // i.e. ''
    stopTriggered: boolean // i.e. false
    stopPrice: string // i.e. '0'
    timeInForce: string // i.e. 'GTC'
    postOnly: boolean // i.e. false
    hidden: boolean // i.e. false
    iceberg: boolean // i.e. false
    visibleSize: string // i.e. '0'
    cancelAfter: number // i.e. 0
    channel: string // i.e. 'API'
    clientOid: string // i.e. '88a71979-dk30-446e-a0f0-8b5191acafce'
    remark: null
    tags: null
    isActive: boolean // i.e. false
    cancelExist: boolean // i.e. false
    createdAt: number // i.e. 1248530058955
    tradeType: string // i.e. 'TRADE'
  }
}

export type KucoinGetFilledOrderByIdResponse = {
  code: string
  data: {
    currentPage: number // i.e. 1
    pageSize: number // i.e. 50,
    totalNum: number // i.e. 1,
    totalPage: number // i.e. 1,
    items: [KucoinGetFilledOrderByIdItem]
  }
}

export type KucoinGetFilledOrderByIdItem = {
  symbol: string // i.e. 'BTC-USDT'
  tradeId: string // i.e. '29y1592667a7790046273390'
  orderId: string // i.e. '29y1594666a7799041273290'
  counterOrderId: string // i.e. '29y1594566a7790001273693'
  side: string // i.e. 'buy'
  liquidity: string // i.e. 'taker'
  forceTaker: boolean // i.e. true
  price: string // i.e. '34347.7'
  size: string // i.e. '0.0000004'
  funds: string // i.e. '0.00834654'
  fee: string // i.e. '0.00000734914'
  feeRate: string // i.e. '0.001'
  feeCurrency: string // i.e. 'USDT'
  stop: string // i.e. ''
  tradeType: string // i.e. 'TRADE'
  type: string // i.e. 'market'
  createdAt: number // i.e. 1240526092060
}

export type KucoinErrorResponse = {
  code: string
  msg: string
}

export type KucoinMarketOrderParameters = {
  clientOid: string
  side: string
  symbol: string
  type: string
  size?: string
  funds?: string
}
