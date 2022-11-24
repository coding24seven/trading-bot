import Big from 'big.js'
import eventBus, { EventBusEvents } from '../events/event-bus.js'
import { BotConfigStatic, BotData } from '../types'

export default class Comparator {
  private static botConfigsWithResults: BotData[] = []
  public static botConfigs: BotConfigStatic[] = []

  public static run(symbol: string) {
    Comparator.botConfigs = Comparator.generateBotConfigs(symbol)
  }

  public static addEventListeners() {
    eventBus.on(
      EventBusEvents.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
      Comparator.addBotDataWithResult
    )
  }

  private static addBotDataWithResult(data: BotData) {
    Comparator.botConfigsWithResults.push(data)
  }

  private static generateBotConfigs(symbol: string): BotConfigStatic[] {
    const handSpanPercentMin: number = 1
    const handSpanPercentStep: number = 1
    const handSpanPercentMax: number = 5
    const arr: BotConfigStatic[] = []

    for (
      let handSpanPercent: number = handSpanPercentMin;
      handSpanPercent <= handSpanPercentMax;
      handSpanPercent = Big(handSpanPercent)
        .plus(handSpanPercentStep)
        .toNumber()
    ) {
      arr.push({
        symbol,
        from: '18000',
        to: '21000',
        baseFrom: '0',
        baseTo: '0',
        quoteFrom: '18000',
        quoteTo: '21000',
        handSpanPercent,
        quoteStartAmount: '100',
        baseStartAmount: '0',
        triggerBelowPrice: '60000',
      })
    }

    return arr
  }

  public static sortConfigsByProfit(): BotData[] {
    return Comparator.botConfigsWithResults.sort(
      (previousItem: BotData, currentItem: BotData) =>
        Big(previousItem.results!.pairTotalAsQuoteWhenAllSold)
          .minus(currentItem.results!.pairTotalAsQuoteWhenAllSold)
          .toNumber()
      // previousItem.results.sellCountTotal - currentItem.results.sellCountTotal
      // previousItem.config.handCount - currentItem.config.handCount
    )
  }
}
