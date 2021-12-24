import { Exchange } from "./source/exchange/Exchange.js";

const pair: string = process.env.PAIR!;

trade();

async function trade() {
  console.log(await Exchange.getMinimumTradeSize(pair, false));

  // console.log(
  //   await Exchange.buy({
  //     symbol: pair,
  //     funds: "0.01",
  //   })
  // );
}
