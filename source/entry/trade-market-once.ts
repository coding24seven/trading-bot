import { setDotEnv } from '../../config/env.js'
import Trader from '../trader/trader.js'

setDotEnv()

Trader.tradeMarketOnceStandalone('BTC-USDT', true, '0.3', 0)
