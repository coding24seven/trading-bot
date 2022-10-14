/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfigStatic } from '../types'

const botConfigs: BotConfigStatic[] = [
  {
    symbol: 'BTC-USDT',
    from: 20000,
    to: 30000,
    baseFrom: 0,
    baseTo: 0,
    quoteFrom: 20000,
    quoteTo: 30000,
    quoteStartAmount: '70',
    baseStartAmount: '0',
    handSpanPercent: 15,
  },
]

export default botConfigs
