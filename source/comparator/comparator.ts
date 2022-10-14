import Big from 'big.js'
import eventBus from '../events/event-bus.js'
import { BotConfigStatic, BotData } from '../types'

export default class Comparator {
  static botConfigsWithResults: BotData[] = []
  static botConfigs: BotConfigStatic[] = []
  static from: number = 37000
  static to: number = 57000

  static run(symbol: string) {
    Comparator.botConfigs = Comparator.generateBotConfigs(symbol)
  }

  static addEventListeners() {
    eventBus.on(
      eventBus.events!.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      Comparator.addBotDataWithResult
    )
  }

  static addBotDataWithResult(data: BotData) {
    Comparator.botConfigsWithResults.push(data)
  }

  static generateBotConfigs(symbol: string): BotConfigStatic[] {
    const handSpanPercentMin: number = 1
    const handSpanPercentStep: number = 1
    const handSpanPercentMax: number = 17
    const arr: BotConfigStatic[] = []

    for (
      let handSpanPercent: number = handSpanPercentMin;
      handSpanPercent <= handSpanPercentMax;
      handSpanPercent += handSpanPercentStep
    ) {
      arr.push({
        symbol,
        from: Comparator.from,
        to: Comparator.to,
        baseFrom: 37000,
        baseTo: 57000,
        quoteFrom: 37000,
        quoteTo: 57000,
        handSpanPercent,
        quoteStartAmount: '100',
        baseStartAmount: '0',
      })
    }

    return arr
  }

  static sortConfigsByProfit(): BotData[] {
    return Comparator.botConfigsWithResults.sort(
      (previousItem: BotData, currentItem: BotData) =>
        Big(previousItem.results!.quoteTotalIncludingBaseSoldAsPlanned)
          .minus(currentItem.results!.quoteTotalIncludingBaseSoldAsPlanned)
          .toNumber()
      // previousItem.results.sellCountTotal - currentItem.results.sellCountTotal
      // previousItem.config.handCount - currentItem.config.handCount
    )
  }
}
