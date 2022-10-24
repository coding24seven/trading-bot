import Big from 'big.js'
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
import { countDecimals, getTime, trimDecimalsToFixed } from '../utils/index.js'

export default class Bot {
  data: BotData
  id: number | null = null
  itsAccountId: number | null = null
  hands: BotHand[] = []
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
    this.trader = new Trader(
      data.configDynamic.itsAccountId!,
      data.configStatic.symbol,
      data.configDynamic.tradeFee!,
      data.configDynamic.baseIncrement!,
      data.configDynamic.quoteIncrement!
    )
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
      let baseReceived: string | undefined

      if (!quoteToSpend) {
        return
      }

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
        this.isBaseCurrencyEnoughToTrade(hand.base) &&
        Big(lastPrice).gt(hand.sellAbove)
    )

    sellingHands.forEach(async (hand: BotHand) => {
      const baseToSpend: string | undefined = this.makeBaseValidForTrade(
        hand.base
      )
      let quoteReceived: string | undefined

      if (!baseToSpend) {
        return
      }

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

  isBaseCurrencyEnoughToTrade(base: string): boolean {
    if (!this.data.configDynamic.baseMinimumTradeSize) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET)
    }

    return Big(base).gte(this.data.configDynamic.baseMinimumTradeSize)
  }

  isQuoteCurrencyEnoughToTrade(quote: string): boolean {
    if (!this.data.configDynamic.quoteMinimumTradeSize) {
      throw new Error(Messages.MINIMUM_ALLOWED_TRADE_SIZES_NOT_SET)
    }

    return Big(quote).gte(this.data.configDynamic.quoteMinimumTradeSize)
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

    const baseAtLastPriceToQuoteTotal: string = Big(baseTotal)
      .mul(this.lastPrice)
      .toFixed()

    const pairTotal: string = Big(quoteTotal)
      .plus(baseAtLastPriceToQuoteTotal)
      .toFixed()

    const quoteTotalIncludingBaseSoldAsPlanned: string =
      this.getQuoteTotalIncludingBaseSoldAsPlanned()

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
      baseTotal,
      baseAtLastPriceToQuoteTotal,
      pairTotal,
      quoteTotalIncludingBaseSoldAsPlanned,
      buyCountTotal,
      sellCountTotal,
      lastPrice: this.lastPrice,
      lowestPriceRecorded: this.lowestPriceRecorded,
      highestPriceRecorded: this.highestPriceRecorded,
    }
  }

  getQuoteTotalIncludingBaseSoldAsPlanned(): string {
    const arr: BotHand[] = JSON.parse(JSON.stringify(this.hands))

    arr.forEach((hand: BotHand) => {
      if (Big(hand.base).gt(0)) {
        const valueToAdd = Big(hand.base).mul(hand.sellAbove)

        const quoteTotalIncludingBaseSoldAsPlanned = trimDecimalsToFixed(
          valueToAdd.plus(hand.quote).toFixed(),
          this.data.configDynamic.quoteDecimals!
        )

        if (typeof quoteTotalIncludingBaseSoldAsPlanned !== 'string') {
          console.log(
            `${Messages.BASE_MUST_BE_STRING}: ${quoteTotalIncludingBaseSoldAsPlanned}`
          )

          return
        }

        hand.quote = quoteTotalIncludingBaseSoldAsPlanned
        hand.base = '0'
      }
    })

    return arr
      .reduce(
        (accumulator: Big, item: BotHand) => Big(accumulator).plus(item.quote),
        Big(0)
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
    const { baseIncrement }: BotConfigDynamic = this.data.configDynamic

    if (!baseIncrement) {
      throw new Error(Messages.TRADE_SIZE_INCREMENT_NOT_SET)
    }

    const baseValidForTrade = trimDecimalsToFixed(
      base,
      countDecimals(baseIncrement)
    )

    if (typeof baseValidForTrade !== 'string') {
      console.log(`${Messages.BASE_MUST_BE_STRING}: ${baseValidForTrade}`)

      return
    }

    return baseValidForTrade
  }

  makeQuoteValidForTrade(quote: string): string | undefined {
    const { quoteIncrement }: BotConfigDynamic = this.data.configDynamic

    if (!quoteIncrement) {
      throw new Error(Messages.TRADE_SIZE_INCREMENT_NOT_SET)
    }

    const quoteValidForTrade = trimDecimalsToFixed(
      quote,
      countDecimals(quoteIncrement)
    )

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
