import Binance from "node-binance-api";
import store from "../store/Store.js";

export default class Trader {
  constructor(accountId, pair, exchangeFee) {
    this.pair = pair;
    this.exchangeFee = exchangeFee;
    const { apiKey, secretKey } = store.getAccountConfig(accountId);
    this.binance = new Binance().options({
      APIKEY: apiKey,
      APISECRET: secretKey,
    });
  }

  async buy(bracket, lastPrice) {
    // const response = await this.binance.marketBuy(this.pair, bracket.quote);
    // bracket.quote = 0; // hopefully there are no leftovers, but check on it in response
    // bracket.bought = true;

    this.buyFake(bracket, lastPrice);
  }

  async sell(bracket, lastPrice) {
    // const response = await this.binance.marketSell(this.pair, bracket.base);
    // bracket.base = 0; // hopefully there are no leftovers, but check on it
    // bracket.bought = false;

    this.sellFake(bracket, lastPrice);
  }

  buyFake(bracket, lastPrice) {
    bracket.base = this.deductExchangeFeeFake(bracket.quote / lastPrice);
    bracket.quote = 0;
    bracket.bought = true;
  }

  sellFake(bracket, lastPrice) {
    bracket.quote = this.deductExchangeFeeFake(bracket.base * lastPrice);
    bracket.base = 0;
    bracket.bought = false;
  }

  deductExchangeFeeFake(value) {
    return value - value * this.exchangeFee;
  }
}
