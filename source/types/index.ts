export type StoreSetupParameters = {
  continueWithExistingDatabase?: boolean;
  isHistoricalPrice?: boolean;
  createsStoreAndExits?: boolean;
  botConfigFromGenerator?: BotConfig | null;
};

export type AppEnvironment = {
  appId: string;
  databaseUrl: string;
  databasePort: string;
  requestUrl: string;
};

export type AccountData = {
  config?: AccountConfig;
  bots?: BotData[];
};

export type AccountDataStripped = {
  bots?: BotData[];
};

export type AccountConfig = {
  apiKey: string;
  secretKey: string;
  exchangeFee: number;
};

export type BotConfigIndexesPerAccount = {
  botConfigIndexesPerAccount: number[];
};

export type BotData = {
  config: BotConfig;
  vars: BotVariables;
};

export type BotConfig = {
  pair: string;
  from: number;
  to: number;
  quoteFrom: number;
  quoteTo: number;
  baseFrom: number;
  baseTo: number;
  handCount: number | null;
  handSpan: number;
  quoteStartAmount: number;
  quoteStartAmountPerHand: number | null;
  baseStartAmount: number;
  baseStartAmountPerHand: number | null;
  exchangeFee: number;
  id: number | null;
  itsAccountId: number | null;
};

export type BotDataWithResults = {
  hands: BotHand[];
  tradeHistory?: TradeHistoryItem[];
  config: BotConfig;
  results: BotResults | undefined;
};

export type BotVariables = {
  hands: BotHand[];
  results?: BotResults;
};

export type BotResults = {
  quoteTotal: number;
  baseTotal: number;
  baseAtLastPriceToQuoteTotal: number;
  pairTotal: number;
  quoteTotalIncludingBaseSoldAsPlanned: number;
  buyCountTotal: number;
  sellCountTotal: number;
  buyResetCount: number;
  sellResetCount: number;
  lastPrice: number;
  lowestPriceRecorded: number;
  highestPriceRecorded: number;
};

export type BotHand = {
  id: number;
  buyBelow: number;
  stopBuy: number;
  sellAbove: number;
  stopSell: number;
  quote: number;
  base: number;
  buyCount: number;
  sellCount: number;
  readyToBuy: boolean;
  readyToSell: boolean;
};

export type TradeHistoryItem = {
  id: number;
  buyBelow: number;
  sellAbove: number;
  buyCount: number;
  sellCount: number;
  lastPrice: number;
  type: string;
};

export type Pairs = {
  [key: string]: Pair; // example key: BTCUSDT
};

export type Pair = {
  close: number;
};
