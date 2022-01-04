/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfig } from "../types";

const botConfigs: BotConfig[] = [
  {
    symbol: "BTC-USDT",
    from: 31000,
    to: 59000,
    quoteFrom: 31000,
    quoteTo: 59000,
    baseFrom: 0,
    baseTo: 0,
    handCount: null,
    handSpan: 0.02,
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
