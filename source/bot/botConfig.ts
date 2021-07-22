/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfig } from "../types";

const botConfigs: BotConfig[] = [
  {
    pair: "BTCUSDT",
    from: 1000,
    to: 100000,
    quoteFrom: 30000,
    quoteTo: 40000,
    baseFrom: 30000,
    baseTo: 40000,
    handCount: null,
    handSpan: 0.015,
    quoteStartAmount: 100,
    quoteStartAmountPerHand: null,
    baseStartAmount: 0,
    baseStartAmountPerHand: null,
    exchangeFee: 0.001,
    id: null,
    itsAccountId: null,
  },
];

export default botConfigs;
