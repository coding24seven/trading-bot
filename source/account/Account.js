import Bot from "../bot/Bot.js";
import store from "../store/Store.js";

export default class Account {
  // exchange = {};
  bots = [];

  constructor(data) {
    this.bots = [];

    data.bots.forEach((botData) => {
      this.bots.push(new Bot(botData));
    });

    // this.exchange = Configurator.getNodeBinanceApiLibraryInstance(config);
  }
}
