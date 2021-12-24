/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfig } from "../types";

const botConfigs: BotConfig[] = [
  {
    pair: "BTC-USDT",
    from: 29000,
    to: 42000,
    quoteFrom: 29000,
    quoteTo: 42000,
    baseFrom: 0,
    baseTo: 0,
    handCount: null,
    handSpan: 0.05,
    quoteStartAmount: 100,
    quoteStartAmountPerHand: null,
    baseStartAmount: 0,
    baseStartAmountPerHand: null,
    exchangeFee: 0.001,
    baseMinimumTradeSizeAllowed: null,
    quoteMinimumTradeSizeAllowed: null,
    id: null,
    itsAccountId: null,
  },
];

export default botConfigs;
