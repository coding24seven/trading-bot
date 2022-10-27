import Big from 'big.js'
import Currency from '../currency/currency.js'
import eventBus from '../events/event-bus.js'
import store from '../store/store.js'
import Trader from '../trader/trader.js'
import {
  BotConfigDynamic,
  BotData,
  BotHand,
  BotResults,
  PriceStreamCallbackParameters,
  TradeHistoryItem,
} from '../types'
import Messages from '../types/messages.js'
import { getTime } from '../utils/index.js'

export default class Bot {
  data: BotData
  id: number | null = null
  itsAccountId: number | null = null
  hands: BotHand[] = []
  quoteCurrency: Currency
  baseCurrency: Currency
  trader: Trader
  symbol: string // i.e. 'BTC-USDT'
  lastPrice: string | null = null
  lowestPriceRecorded: string = '99999999999999999999'
  highestPriceRecorded: string = '0'
  count: number = 0
  tradeHistory: TradeHistoryItem[] = [] // not added to store atm
  dateMs: number = Date.now()
  processLastPriceIntervalDefaultMs: number = 1000
  processLastPriceIntervalMs: number = parseInt(
    process.env.LAST_PRICE_CALLBACK_INTERVAL_MS ||
      String(this.processLastPriceIntervalDefaultMs)
  )

  constructor(data: BotData) {
    this.data = data
    this.id = data.configDynamic.id
    this.itsAccountId = data.configDynamic.itsAccountId
    this.hands = data.hands
    this.symbol = data.configStatic.symbol
    this.baseCurrency = new Currency(data.configDynamic.baseCurrency)
    this.quoteCurrency = new Currency(data.configDynamic.quoteCurrency)
    this.trader = new Trader(data.configStatic, data.configDynamic)

    eventBus.on(eventBus.events!.LAST_PRICE, this.onLastPrice.bind(this))
    eventBus.on(
      eventBus.events!.HISTORICAL_PRICE_READER_FINISHED,
      this.onHistoricalPriceReaderFinished.bind(this)
    )
  }

  onHistoricalPriceReaderFinished() {
    store.setResults(this.itsAccountId, this.id, this.getResults())

    eventBus.emit(
      eventBus.events!.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      this.getBotDataWithResults()
    )
  }

  async onLastPrice({ symbol, lastPrice }: PriceStreamCallbackParameters) {
    if (!store.isHistoricalPrice) {
      const intervalNotCompleted: boolean =
        Date.now() < this.dateMs + this.processLastPriceIntervalMs

      if (intervalNotCompleted || this.symbol !== symbol) return

      console.log(getTime(), symbol, lastPrice)
      this.dateMs = Date.now()
    }

    this.lastPrice = lastPrice
    this.recordLowestAndHighestPrice(lastPrice)
    this.processLastPrice(lastPrice)
  }

  processLastPrice(lastPrice: string) {
    const buyingHands: BotHand[] = this.hands.filter(
      (hand: BotHand) =>
        !hand.tradeIsPending &&
        this.isQuoteCurrencyEnoughToTrade(hand.quote) &&
        Big(lastPrice).lt(hand.buyBelow)
    )

    buyingHands.forEach(async (hand: BotHand) => {
      const quoteToSpend: string | undefined = this.makeQuoteValidForTrade(
        hand.quote
      )

      if (!quoteToSpend) {
        return
      }

      let baseReceived: string | undefined

      if (store.isHistoricalPrice) {
        baseReceived = this.trader.tradeFake(true, quoteToSpend, lastPrice)
      } else {
        hand.tradeIsPending = true
        baseReceived = await this.trader.trade(true, quoteToSpend)
      }

      if (!baseReceived) {
        hand.tradeIsPending = false
        return
      }

      hand.quote = Big(hand.quote).minus(quoteToSpend).toFixed()
      hand.base = Big(hand.base).plus(baseReceived).toFixed()
      hand.buyCount++
      hand.tradeIsPending = false
      this.updateAfterTrade(hand, lastPrice, 'buy')
    })

    const sellingHands: BotHand[] = this.hands.filter(
      (hand: BotHand) =>
        !hand.tradeIsPending &&
        this.isBaseCurrencyEnoughToTrade(hand.base, lastPrice) &&
        Big(lastPrice).gt(hand.sellAbove)
    )

    sellingHands.forEach(async (hand: BotHand) => {
      const baseToSpend: string | undefined = this.makeBaseValidForTrade(
        hand.base
      )

      if (!baseToSpend) {
        return
      }

      let quoteReceived: string | undefined

      if (store.isHistoricalPrice) {
        quoteReceived = this.trader.tradeFake(false, baseToSpend, lastPrice)
      } else {
        hand.tradeIsPending = true
        quoteReceived = await this.trader.trade(false, baseToSpend)
      }

      if (!quoteReceived) {
        hand.tradeIsPending = false
        return
      }

      hand.base = Big(hand.base).minus(baseToSpend).toFixed()
      hand.quote = Big(hand.quote).plus(quoteReceived).toFixed()
      hand.sellCount++
      hand.tradeIsPending = false
      this.updateAfterTrade(hand, lastPrice, 'sell')
    })
  }

  isBaseCurrencyEnoughToTrade(base: string, lastPrice: string): boolean {
    if (!this.data.configDynamic.minFunds) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET)
    }

    const baseInQuote: Big = Big(base).mul(lastPrice)

    return Big(baseInQuote).gte(this.data.configDynamic.minFunds)
  }

  isQuoteCurrencyEnoughToTrade(quote: string): boolean {
    if (!this.data.configDynamic.minFunds) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET)
    }

    return Big(quote).gte(this.data.configDynamic.minFunds)
  }

  getBotDataWithResults(
    options: { tradeHistoryIncluded: boolean } | null = null
  ): BotData {
    let tradeHistoryIncluded: boolean = false

    if (options) {
      tradeHistoryIncluded = options.tradeHistoryIncluded
    }

    return {
      hands: this.hands,
      ...(tradeHistoryIncluded && { tradeHistory: this.tradeHistory }),
      configStatic: this.data.configStatic,
      configDynamic: this.data.configDynamic,
      results: store.getResults(this.itsAccountId, this.id),
    }
  }

  getResults(): BotResults | undefined {
    if (!this.lastPrice) {
      return
    }

    const baseTotal: string = this.hands
      .reduce(
        (accumulator: Big, { base }: BotHand) => Big(accumulator).plus(base),
        Big('0')
      )
      .toFixed()

    const quoteTotal: string = this.hands
      .reduce(
        (accumulator: Big, { quote }: BotHand) => Big(accumulator).plus(quote),
        Big('0')
      )
      .toFixed()

    const baseConvertedToQuoteAtLastPrice: string | undefined =
      this.quoteCurrency.normalize(Big(baseTotal).mul(this.lastPrice))

    if (typeof baseConvertedToQuoteAtLastPrice !== 'string') {
      console.error(
        `${baseConvertedToQuoteAtLastPrice} ${Messages.IS_NOT_STRING}`
      )
      return
    }

    const pairTotalAsQuote: string | undefined = this.quoteCurrency.normalize(
      Big(quoteTotal).plus(baseConvertedToQuoteAtLastPrice)
    )

    if (typeof pairTotalAsQuote !== 'string') {
      console.error(`${pairTotalAsQuote} ${Messages.IS_NOT_STRING}`)
      return
    }

    const pairTotalAsQuoteWhenAllSold: string =
      this.getPairTotalAsQuoteWhenAllSold()

    const buyCountTotal: number = this.hands
      .reduce(
        (accumulator: Big, { buyCount }: BotHand) =>
          Big(accumulator).plus(buyCount),
        Big(0)
      )
      .toNumber()

    const sellCountTotal: number = this.hands
      .reduce(
        (accumulator: Big, { sellCount }: BotHand) =>
          Big(accumulator).plus(sellCount),
        Big(0)
      )
      .toNumber()

    return {
      quoteTotal,
      baseConvertedToQuoteAtLastPrice,
      pairTotalAsQuote,
      baseTotal,
      pairTotalAsQuoteWhenAllSold,
      buyCountTotal,
      sellCountTotal,
      lowestPriceRecorded: this.lowestPriceRecorded,
      highestPriceRecorded: this.highestPriceRecorded,
      lastPrice: this.lastPrice,
    }
  }

  getPairTotalAsQuoteWhenAllSold(): string {
    const botHands: BotHand[] = JSON.parse(JSON.stringify(this.hands))

    botHands.forEach((hand: BotHand) => {
      if (Big(hand.base).gt(0)) {
        const valueToAdd = Big(hand.base).mul(hand.sellAbove)

        const pairTotalAsQuoteWhenAllSold: string | undefined =
          this.quoteCurrency.normalize(valueToAdd.plus(hand.quote))

        if (typeof pairTotalAsQuoteWhenAllSold !== 'string') {
          console.log(
            `${Messages.BASE_MUST_BE_STRING}: ${pairTotalAsQuoteWhenAllSold}`
          )

          return
        }

        hand.quote = pairTotalAsQuoteWhenAllSold
        hand.base = '0'
      }
    })

    return botHands
      .reduce(
        (accumulator: Big, item: BotHand) => Big(accumulator).plus(item.quote),
        Big('0')
      )
      .toFixed()
  }

  getTradeHistoryItem(
    hand: BotHand,
    lastPrice: string,
    type: string
  ): TradeHistoryItem {
    return {
      id: hand.id,
      buyBelow: hand.buyBelow,
      sellAbove: hand.sellAbove,
      buyCount: hand.buyCount,
      sellCount: hand.sellCount,
      lastPrice,
      type,
    }
  }

  makeBaseValidForTrade(base: string): string | undefined {
    const { increment }: Currency = this.baseCurrency

    if (!increment) {
      throw new Error(Messages.TRADE_SIZE_INCREMENT_NOT_SET)
    }

    const baseValidForTrade: string | undefined =
      this.baseCurrency.normalize(base)

    if (typeof baseValidForTrade !== 'string') {
      console.log(`${Messages.BASE_MUST_BE_STRING}: ${baseValidForTrade}`)

      return
    }

    return baseValidForTrade
  }

  makeQuoteValidForTrade(quote: string): string | undefined {
    const { increment }: Currency = this.quoteCurrency

    if (!increment) {
      throw new Error(Messages.TRADE_SIZE_INCREMENT_NOT_SET)
    }

    const quoteValidForTrade: string | undefined =
      this.quoteCurrency.normalize(quote)

    if (typeof quoteValidForTrade !== 'string') {
      console.log(`${Messages.QUOTE_MUST_BE_STRING}: ${quoteValidForTrade}`)

      return
    }

    return quoteValidForTrade
  }

  updateAfterTrade(hand: BotHand, lastPrice: string, type: string) {
    const tradeHistoryItem: TradeHistoryItem = this.getTradeHistoryItem(
      hand,
      lastPrice,
      type
    )
    this.tradeHistory.push(tradeHistoryItem)

    if (store.isHistoricalPrice) return

    console.log(tradeHistoryItem)
    this.storeCurrentResults()
  }

  storeCurrentResults() {
    store.setResults(this.itsAccountId, this.id, this.getResults())
  }

  recordLowestAndHighestPrice(lastPrice: string) {
    this.lowestPriceRecorded = Big(lastPrice).lt(this.lowestPriceRecorded)
      ? lastPrice
      : this.lowestPriceRecorded

    this.highestPriceRecorded = Big(lastPrice).gt(this.highestPriceRecorded)
      ? lastPrice
      : this.highestPriceRecorded
  }
}
