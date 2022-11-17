/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfigStatic } from '../source/types'

const botConfigs: BotConfigStatic[] = [
  {
    symbol: 'BTC-USDT',
    from: '1000',
    to: '100000',
    baseFrom: '0',
    baseTo: '0',
    quoteFrom: '10000',
    quoteTo: '16500',
    quoteStartAmount: '10',
    baseStartAmount: '0',
    handSpanPercent: 3,
    triggerBelowPrice: '3000'
  },
]

export default botConfigs
