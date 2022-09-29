import eventBus from '../events/event-bus.js'
import { BotConfigStatic, BotDataWithResults } from '../types'

export default class Comparator {
  static botConfigsWithResults: BotDataWithResults[] = []
  static botConfigs: BotConfigStatic[] = []
  static from: number = 20000
  static to: number = 100000

  static run(symbol: string) {
    Comparator.botConfigs = Comparator.generateBotConfigs(symbol)
  }

  static addEventListeners() {
    eventBus.on(
      eventBus.events!.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      Comparator.addBotDataWithResult
    )
  }

  static addBotDataWithResult(data: BotDataWithResults) {
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
        baseFrom: 30000,
        baseTo: 40000,
        quoteFrom: 30000,
        quoteTo: 40000,
        handSpanPercent,
        quoteStartAmount: 100,
        baseStartAmount: 0,
      })
    }

    return arr
  }

  static sortConfigsByProfit(): BotDataWithResults[] {
    return Comparator.botConfigsWithResults.sort(
      (previousItem: BotDataWithResults, currentItem: BotDataWithResults) =>
        previousItem.results!.quoteTotalIncludingBaseSoldAsPlanned -
        currentItem.results!.quoteTotalIncludingBaseSoldAsPlanned
      // previousItem.results.sellCountTotal - currentItem.results.sellCountTotal
      // previousItem.config.handCount - currentItem.config.handCount
    )
  }
}
