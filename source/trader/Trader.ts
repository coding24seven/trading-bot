import store from "../store/Store.js";
import {
  AccountConfig,
  KucoinErrorResponse,
  KucoinGetFilledOrderByIdItem,
  KucoinOrderPlacedResponse,
} from "../types";
import { Exchange } from "../exchange/Exchange.js";
import ExchangeCodes from "../types/exchangeCodes.js";

export default class Trader {
  symbol: string;
  exchangeFee: number;
  accountConfig: AccountConfig;

  constructor(accountId: number, symbol: string, exchangeFee: number) {
    this.symbol = symbol;
    this.accountConfig = store.getAccountConfig(accountId);
    this.exchangeFee = exchangeFee;
  }

  async trade(isBuy: boolean, amountToSpend: number): Promise<number | null> {
    const response:
      | KucoinOrderPlacedResponse
      | KucoinErrorResponse = await Exchange.tradeMarket(this.accountConfig, {
      symbol: this.symbol,
      amount: amountToSpend,
      isBuy,
    });

    if (
      response.code === ExchangeCodes.responseSuccess &&
      (response as KucoinOrderPlacedResponse).data.orderId
    ) {
      const filledOrderItem: KucoinGetFilledOrderByIdItem | null = await Exchange.getFilledOrderById(
        this.accountConfig,
        (response as KucoinOrderPlacedResponse).data.orderId,
        5000,
        60000
      );

      if (!filledOrderItem) {
        return null;
      }

      if (isBuy) {
        const baseReceived: number = parseFloat(filledOrderItem.size);

        return baseReceived;
      } else {
        const quoteReceived: number = parseFloat(filledOrderItem.funds);

        return quoteReceived;
      }
    } else {
      return null;
    }
  }

  tradeFake(isBuy: boolean, amountToSpend: number, lastPrice: number): number {
    if (isBuy) {
      const baseReceived: number = this.deductExchangeFeeFake(
        amountToSpend / lastPrice
      );

      return baseReceived;
    } else {
      const quoteReceived: number = this.deductExchangeFeeFake(
        amountToSpend * lastPrice
      );

      return quoteReceived;
    }
  }

  deductExchangeFeeFake(value): number {
    return value - value * this.exchangeFee;
  }
}
