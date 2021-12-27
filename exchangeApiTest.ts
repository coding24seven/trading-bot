import "dotenv/config";
import { Exchange } from "./source/exchange/Exchange.js";
import {
  AccountConfig,
  KucoinErrorResponse,
  KucoinOrderPlacedResponse,
} from "./source/types";

const symbol: string = process.env.SYMBOL_GLOBAL!;

function readApiEnvironment(): AccountConfig[] {
  const { env }: NodeJS.Process = process;
  const arr: AccountConfig[] = [];
  let i: number = 0;

  while (env[`API_${i}_EXISTS`]) {
    const apiKey: string | undefined = env[`API_${i}_KEY`];
    const secretKey: string | undefined = env[`API_${i}_SECRET_KEY`];
    const exchangeFee: string | undefined = env[`API_${i}_EXCHANGE_FEE`];
    const passphrase: string | undefined = env[`API_${i}_PASSPHRASE`];
    const environment: string | undefined =
      env[`API_${i}_EXCHANGE_ENVIRONMENT`];

    if (apiKey && secretKey && exchangeFee && passphrase && environment) {
      arr.push({
        apiKey,
        secretKey,
        passphrase,
        environment,
        exchangeFee: parseFloat(exchangeFee),
      });
    }

    i++;
  }

  return arr;
}

const exchangeAccountConfig: AccountConfig = readApiEnvironment()[0];
console.log(exchangeAccountConfig);
trade();

async function trade() {
  // console.log(await Exchange.getSymbolData(symbol));

  Exchange.startWSAllTicker((messageAsString) => {
    const messageParsed = JSON.parse(messageAsString);

    if (messageParsed.subject === "BTC-USDT") {
      console.log(messageParsed.data.price);
      console.log("---------------------");
    }
  });

  // const response:
  //   | KucoinOrderPlacedResponse
  //   | KucoinErrorResponse = await Exchange.tradeMarket(exchangeAccountConfig, {
  //   symbol,
  //   amount: "0.01",
  //   isBuy: true,
  // });

  //@ts-ignore
  // console.log(response.data.orderId);

  // console.log(
  //   await Exchange.getFilledOrderById(
  //     exchangeAccountConfig,
  //     //@ts-ignore
  //     response.data.orderId,
  //     5000,
  //     60000
  //   )
  // );
}
