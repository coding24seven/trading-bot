import "dotenv/config";
import kucoin from "kucoin-node-api";
import { AccountConfig, KucoinSymbolsResponse } from "./source/types";

const market: string = process.env.MARKET!;
const pair: string = process.env.PAIR!;

const config: AccountConfig = {
  apiKey: process.env.API_0_KEY!,
  secretKey: process.env.API_0_SECRET_KEY!,
  passphrase: process.env.API_0_PASSPHRASE!,
  environment: "live",
};
kucoin.init(config);

trade();

async function trade() {
  try {
    const response: KucoinSymbolsResponse = await kucoin.getSymbols(market);



    const obj = response.data.find((item) => item.symbol === pair);
    console.log(obj);
  } catch (e) {
    console.log("my error", e);
  }
}
