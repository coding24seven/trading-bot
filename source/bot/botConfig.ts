/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfig } from "../types";

const botConfigs: BotConfig[] = [
  {
    pair: "BTCUSDT",
    from: 30000,
    to: 40000,
    quoteFrom: 30000,
    quoteTo: 40000,
    baseFrom: 30000,
    baseTo: 37800,
    handCount: null,
    handSpan: 0.003,
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
