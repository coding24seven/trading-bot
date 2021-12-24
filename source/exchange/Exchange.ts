import "dotenv/config";
import { randomUUID } from "crypto";
import kucoin from "kucoin-node-api";
import {
  AccountConfig,
  KucoinErrorResponse,
  KucoinMarketOrderParameters,
  KucoinOrderPlacedResponse,
  KucoinSymbolData,
  KucoinSymbolsResponse,
} from "../types";
import ExchangeCodes from "../types/exchangeCodes.js";

export class Exchange {
  static defaultEnvironment: string = "sandbox";
  static environment: string =
    process.env.EXCHANGE_API_ENVIRONMENT || Exchange.defaultEnvironment;
  static market: string = process.env.MARKET!;
  static defaultSymbol: string = "BTC-USDT";
  static publicConfig: AccountConfig = {
    apiKey: "",
    secretKey: "",
    passphrase: "",
    environment: Exchange.environment,
  };
  static privateConfig: AccountConfig = {
    apiKey: process.env.API_0_KEY!,
    secretKey: process.env.API_0_SECRET_KEY!,
    passphrase: process.env.API_0_PASSPHRASE!,
    environment: Exchange.environment,
  };

  static startWSTicker(
    symbol: string = Exchange.defaultSymbol,
    callback: (messageAsString: string) => void
  ) {
    kucoin.init(Exchange.publicConfig);
    kucoin.initSocket({ topic: "ticker", symbols: [symbol] }, callback);
  }

  static async getSymbolData(
    symbol: string = Exchange.defaultSymbol
  ): Promise<KucoinSymbolData | undefined> {
    kucoin.init(Exchange.publicConfig);

    try {
      const response: KucoinSymbolsResponse = await kucoin.getSymbols(
        Exchange.market
      );

      if (response.code !== ExchangeCodes.responseSuccess) {
        return;
      }

      return response.data.find(
        (item: KucoinSymbolData) => item.symbol === symbol
      );
    } catch (e) {
      console.log("my error", e);
    }
  }

  static async getMinimumTradeSize(
    symbol: string = Exchange.defaultSymbol
  ): Promise<{ base: string; quote: string } | null> {
    const symbolData:
      | KucoinSymbolData
      | undefined = await Exchange.getSymbolData(symbol);

    const base: string | undefined = symbolData?.baseMinSize;
    const quote: string | undefined = symbolData?.quoteMinSize;

    if (!base || !quote) {
      return null;
    }

    return {
      base,
      quote,
    };
  }

  static async buy({
    symbol,
    funds,
  }): Promise<KucoinOrderPlacedResponse | KucoinErrorResponse> {
    kucoin.init(Exchange.privateConfig);

    const parameters: KucoinMarketOrderParameters = {
      clientOid: randomUUID(),
      side: "buy",
      symbol: symbol || Exchange.defaultSymbol,
      type: "market",
      funds,
    };

    return await kucoin.placeOrder(parameters);
  }
}
