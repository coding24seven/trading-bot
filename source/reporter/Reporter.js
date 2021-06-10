export default class Reporter {
  data = {};

  constructor(data) {
    this.data = data;
  }

  logConfig() {
    const { config } = this.data;
    console.log(
      "********************************************************************"
    );
    console.log("CONFIG:");
    console.log(
      `trading range: ${config.from.toLocaleString()} - ${config.to.toLocaleString()} USDT.`
    );
    console.log(
      `tradable area: ${(
        config.to - config.from
      ).toLocaleString()} USDT of the price.`
    );
    console.log(
      `tradable area is divided into ${
        config.bracketCount
      } price brackets. each bracket spans ${config.bracketSpan.toLocaleString()} USDT of the BTC price.`
    );
    console.log(
      `start amount: ${config.quoteStartAmount.toLocaleString()} USDT.`
    );
    console.log(
      `start amount per bracket: ${config.quoteStartAmountPerBracket.toLocaleString()} USDT.`
    );
    console.log(
      `order-placement range at the bottom and top of each bracket: ~ ${config.orderPlacementZone.toLocaleString()} USDT.`
    );
    console.log(`exchange fee: ${config.exchangeFee} of every trade's value.`);
  }

  logHistoricalDataResults(data) {
    console.log(
      "********************************************************************"
    );

    console.log("RESULTS:");
    console.log("USDT:", data.quoteTotal);
    console.log("BTC:", data.baseTotal);
    console.log(
      `BTC sold at ${data.currentPrice} USDT:`,
      data.baseAtLastPriceToQuoteTotal
    );
    console.log("total amount USDT:", data.pairTotal);
    console.log("buy count:", data.buyCountTotal);
    console.log("sell count:", data.sellCountTotal);
  }

  logError(data) {
    console.log(data);
  }
}
