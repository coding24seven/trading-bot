import Binance from "node-binance-api";
import store from "../store/Store.js";
import { AccountConfig, BotHand } from "../types";

export default class Trader {
  pair: string;
  exchangeFee: number;
  binance: Binance;

  constructor(accountId: number, pair: string, exchangeFee: number) {
    this.pair = pair;
    this.exchangeFee = exchangeFee;
    const { apiKey, secretKey }: AccountConfig = store.getAccountConfig(
      accountId
    );
    this.binance = new Binance().options({
      APIKEY: apiKey,
      APISECRET: secretKey,
    });
  }

  async buy(hand: BotHand, lastPrice: number) {
    // verify that current price on exchange is within range of 'lastPrice', in case of lost/resumed connection, to prevent an expensive buy
    // const response = await this.binance.marketBuy(this.pair, hand.quote);
    // hand.quote = 0; // hopefully there are no leftovers, but check on it in response
    // hand.bought = true;

    this.buyFake(hand, lastPrice);
  }

  async sell(hand: BotHand, lastPrice: number) {
    // const response = await this.binance.marketSell(this.pair, hand.base);
    // hand.base = 0; // hopefully there are no leftovers, but check on it
    // hand.bought = false;

    this.sellFake(hand, lastPrice);
  }

  buyFake(hand: BotHand, lastPrice: number) {
    hand.base = this.deductExchangeFeeFake(hand.quote / lastPrice);
    hand.quote = 0; // todo: do not zero
  }

  sellFake(hand: BotHand, lastPrice: number) {
    hand.quote = this.deductExchangeFeeFake(hand.base * lastPrice);
    hand.base = 0; // todo: do not zero
  }

  deductExchangeFeeFake(value) {
    return value - value * this.exchangeFee;
  }
}
