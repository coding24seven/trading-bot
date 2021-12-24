/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfig } from "../types";

const botConfigs: BotConfig[] = [
  {
    pair: "BTC-USDT",
    from: 29000,
    to: 36000,
    quoteFrom: 29000,
    quoteTo: 36000,
    baseFrom: 29000,
    baseTo: 36000,
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
