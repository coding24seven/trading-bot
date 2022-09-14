/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfig } from "../types";

const botConfigs: BotConfig[] = [
  {
    symbol: "BTC-USDT",
    from: 20000,
    to: 30000,
    quoteFrom: 20000,
    quoteTo: 30000,
    baseFrom: 0,
    baseTo: 0,
    handCount: null,
    handSpanPercent: 30,
    quoteStartAmount: 100,
    quoteStartAmountPerHand: null,
    baseStartAmount: 0,
    baseStartAmountPerHand: null,
    exchangeFee: 0.001,
    baseMinimumTradeSize: null,
    quoteMinimumTradeSize: null,
    baseIncrement: null,
    quoteIncrement: null,
    id: null,
    itsAccountId: null,
  },
];

export default botConfigs;
