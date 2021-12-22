import "dotenv/config";
import kucoin from "kucoin-node-api";
import { AccountConfig, KucoinSymbol, KucoinSymbolsResponse } from "../types";

class Exchange {
  static successfulResponseCode: string = "200000";
  static market: string = process.env.MARKET!;
  static pair: string = process.env.PAIR!;
  static config: AccountConfig = {
    apiKey: process.env.API_0_KEY!,
    secretKey: process.env.API_0_SECRET_KEY!,
    passphrase: process.env.API_0_PASSPHRASE!,
    environment: "live",
  };

  static async getSymbols() {
    try {
      const response: KucoinSymbolsResponse = await kucoin.getSymbols(
        Exchange.market
      );
      const obj = response.data.find(
        (item: KucoinSymbol) => item.symbol === Exchange.pair
      );
      console.log(obj);
    } catch (e) {
      console.log("my error", e);
    }
  }
}
