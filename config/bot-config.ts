/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfigStatic } from '../source/types'

const botConfigs: BotConfigStatic[] = [
  {
    symbol: 'BTC-USDT',
    from: '19500',
    to: '21500',
    baseFrom: '0',
    baseTo: '0',
    quoteFrom: '19500',
    quoteTo: '21500',
    quoteStartAmount: '10',
    baseStartAmount: '0',
    handSpanPercent: 0.4,
  },
]

export default botConfigs
