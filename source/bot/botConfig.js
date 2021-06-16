/*
 * each bot is fed one object chosen from the set below
 */
export default [
  {
    from: 1,
    to: 10000,
    bracketSpan: 500,
    shrinkByPercent: 30,
    quoteStartAmount: 100,
    exchangeFee: 0.001,
    pair: "BTCUSDT",
  },
  {
    from: 10000,
    to: 20000,
    bracketSpan: 500,
    shrinkByPercent: 30,
    quoteStartAmount: 100,
    exchangeFee: 0.001,
    pair: "BTCUSDT",
  },
  {
    from: 20000,
    to: 30000,
    bracketSpan: 500,
    shrinkByPercent: 0,
    quoteStartAmount: 100,
    exchangeFee: 0.001,
    pair: "BTCUSDT",
  },
  {
    from: 30000,
    to: 40000,
    bracketSpan: 500,
    shrinkByPercent: 0,
    quoteStartAmount: 100,
    exchangeFee: 0.001,
    pair: "BTCUSDT",
  },
  {
    from: 40000,
    to: 50000,
    bracketSpan: 500,
    shrinkByPercent: 0,
    quoteStartAmount: 100,
    exchangeFee: 0.001,
    pair: "BTCUSDT",
  },
  {
    from: 50000,
    to: 60000,
    bracketSpan: 500,
    shrinkByPercent: 0,
    quoteStartAmount: 100,
    exchangeFee: 0.001,
    pair: "BTCUSDT",
  },
];
