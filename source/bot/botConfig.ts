/*
 * each bot is fed one configuration object chosen from the set below
 */
import { BotConfig } from "../types";

const botConfigs: BotConfig[] = [
  {
    symbol: "BTC-USDT",
    from: 29000,
    to: 36000,
    quoteFrom: 29000,
    quoteTo: 36000,
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
  // {
  //   symbol: "BTC-USDT",
  //   from: 49000,
  //   to: 52000,
  //   quoteFrom: 49000,
  //   quoteTo: 52000,
  //   baseFrom: 49000,
  //   baseTo: 52000,
  //   handCount: null,
  //   handSpan: 0.006,
  //   quoteStartAmount: 8,
  //   quoteStartAmountPerHand: null,
  //   baseStartAmount: 0,
  //   baseStartAmountPerHand: null,
  //   exchangeFee: 0.001,
  //   baseMinimumTradeSize: null,
  //   quoteMinimumTradeSize: null,
  //   baseIncrement: null,
  //   quoteIncrement: null,
  //   id: null,
  //   itsAccountId: null,
  // },
];

export default botConfigs;
