/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfigStatic } from '../types'

const botConfigs: BotConfigStatic[] = [
  {
    symbol: 'BTC-USDT',
    from: 18500,
    to: 20500,
    baseFrom: 0,
    baseTo: 0,
    quoteFrom: 18500,
    quoteTo: 20500,
    quoteStartAmount: 10,
    baseStartAmount: 0,
    handSpanPercent: 3,
  },
]

export default botConfigs
