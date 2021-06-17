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

  async buy(hand, lastPrice) {
    // const response = await this.binance.marketBuy(this.pair, hand.quote);
    // hand.quote = 0; // hopefully there are no leftovers, but check on it in response
    // hand.bought = true;

    this.buyFake(hand, lastPrice);
  }

  async sell(hand, lastPrice) {
    // const response = await this.binance.marketSell(this.pair, hand.base);
    // hand.base = 0; // hopefully there are no leftovers, but check on it
    // hand.bought = false;

    this.sellFake(hand, lastPrice);
  }

  buyFake(hand, lastPrice) {
    hand.base = this.deductExchangeFeeFake(hand.quote / lastPrice);
    hand.quote = 0;
    hand.bought = true;
  }

  sellFake(hand, lastPrice) {
    hand.quote = this.deductExchangeFeeFake(hand.base * lastPrice);
    hand.base = 0;
    hand.bought = false;
  }

  deductExchangeFeeFake(value) {
    return value - value * this.exchangeFee;
  }
}
