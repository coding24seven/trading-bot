import Big from 'big.js'
import { AccountEnvironmentType } from './account-environment-type'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type EnvironmentTypes = 'development' | 'production' | 'test'

export interface CommandLineArguments {
  _: string[]
  column: number
  c: number
  test?: boolean
  t?: boolean
  'new-store': boolean
  n: boolean
  'overwrite-database-without-prompt': boolean
  odwp: boolean
}

export type BuyOrSell = 'buy' | 'sell'

export interface CurrencyFields {
  symbol: string
  minSize: string
  maxSize: string
  increment: string
  decimals: number
}

export interface StoreSetupParameters {
  isHistoricalPrice?: boolean
  createsStoreAndExits?: boolean
  botConfigFromGenerator?: BotConfigStatic
}

export type AppEnvironmentFull = AppEnvironment & AppUrl & DatabaseUrl

export interface AppEnvironment {
  appId: string
  firstAppStart?: string
  lastAppStart: string
  locale: string
  timeZone: string
}

export interface AppUrl {
  hostName: string
}

export interface DatabaseUrl {
  databasePort: string
  databasePath: string
}

export interface AppData extends AppEnvironment {
  accounts: AccountDataStripped[]
}

export interface AccountData {
  config: AccountConfig
  bots: BotData[]
}

export interface AccountDataStripped {
  bots: BotData[]
}

export interface AccountConfig {
  apiKey: string
  secretKey: string
  passphrase: string
  environment: AccountEnvironmentType.sandbox | AccountEnvironmentType.live
  botConfigPath: string
  botConfigIndexes: number[]
}

export interface KucoinAccountConfig {
  apiKey: string
  secretKey: string
  passphrase: string
  environment: AccountEnvironmentType.sandbox | AccountEnvironmentType.live
}

export interface BotData {
  configStatic: BotConfigStatic
  configDynamic: BotConfigDynamic
  hands: BotHand[]
  results?: BotResults
  lastModified?: string
}

export type BotConfigStatic = Readonly<{
  symbol: string
  from: string
  to: string
  quoteFrom: string
  quoteTo: string
  baseFrom: string
  baseTo: string
  handSpanPercent: number
  quoteStartAmount: string
  baseStartAmount: string
  triggerBelowPrice: string
}>

export interface BotConfigDynamic {
  readonly handCount: number
  readonly quoteStartAmountPerHand: string
  readonly baseStartAmountPerHand: string
  readonly tradeFee: string
  readonly minFunds: string
  readonly id: number
  readonly itsAccountId: number
  readonly quoteCurrency: CurrencyFields
  readonly baseCurrency: CurrencyFields
  triggered: boolean
}

export type BotConfigFull = BotConfigStatic & BotConfigDynamic

export interface BotResults {
  quoteTotal: string
  baseTotal: string
  baseConvertedToQuoteAtLastPrice: string
  pairTotalAsQuoteAtLastPrice: string
  profitPercentAtLastPrice: string
  pairTotalAsQuoteWhenAllSold: string
  profitPercentWhenAllSold: string
  buyCountTotal: number
  sellCountTotal: number
  lastPrice: string
  lowestPriceRecorded: string
  highestPriceRecorded: string
}

export interface BotHand {
  id: number
  buyBelow: string
  sellAbove: string
  quote: string
  base: string
  buyCount: number
  sellCount: number
  tradeIsPending: boolean
}

export interface TradeHistoryItem extends BotHand {
  lastPrice: string
  type: BuyOrSell
  baseSpent?: string
  quoteReceived?: string
  quoteSpent?: string
  baseReceived?: string
}

export interface PairTradeSizes {
  base: number
  quote: number
}

export interface PriceStreamCallbackParameters {
  symbol: string
  lastPrice: string
}

export interface KucoinApiTickerMessage {
  type: string
  topic: string
  subject: string
  data: KucoinApiTickerMessageData
}

export interface KucoinApiTickerMessageData {
  bestAsk: string
  bestAskSize: string
  bestBid: string
  bestBidSize: string
  price: string
  sequence: string
  size: string
  time: number
}

export interface KucoinGetAllTickersResponse {
  code: string
  data: KucoinGetAllTickersData
}

export interface KucoinGetAllTickersData {
  time: string
  ticker: KucoinTicker[]
}

export interface KucoinTicker {
  symbol: string
  symbolName: string
  buy: string
  sell: string
  changeRate: string
  changePrice: string
  high: string
  low: string
  vol: string
  volValue: string
  last: string
  averagePrice: string
  takerFeeRate: string
  makerFeeRate: string
  takerCoefficient: string
  makerCoefficient: string
}

export interface KucoinSymbolsResponse {
  code: string
  data: KucoinSymbolData[]
}

export interface KucoinSymbolData {
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
  minFunds: string
  isMarginEnabled: boolean
  enableTrading: boolean
}

export interface KucoinOrderPlacedResponse {
  code: string
  data: {
    orderId: string
  }
}

export interface KucoinGetOrderByIdResponse {
  code: string
  data: KucoinGetOrderByIdData
}

export interface KucoinGetOrderByIdData {
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

export interface KucoinGetFilledOrderByIdResponse {
  code: string
  data: {
    currentPage: number // i.e. 1
    pageSize: number // i.e. 50,
    totalNum: number // i.e. 1,
    totalPage: number // i.e. 1,
    items: [KucoinGetFilledOrderByIdItem]
  }
}

export interface KucoinGetFilledOrderByIdItem {
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

export interface KucoinErrorResponse {
  code: string
  msg: string
}

export interface KucoinMarketOrderParameters {
  clientOid: string
  side: string
  symbol: string
  type: string
  size?: string
  funds?: string
}

export interface BuyOrderTally {
  quoteSpent: Big
  baseReceived: Big
}

export interface SellOrderTally {
  baseSpent: Big
  quoteReceived: Big
}
