/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfig } from "../types";

const botConfigs: BotConfig[] = [
  {
    pair: "BTCUSDT",
    from: 20000,
    to: 100000,
    quoteFrom: 40000,
    quoteTo: 60000,
    baseFrom: 0,
    baseTo: 0,
    handCount: null,
    handSpan: 0.156,
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
