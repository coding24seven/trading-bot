import Bot from "../bot/Bot.js";

export default class Account {
  bots = [];

  constructor(data) {
    this.bots = [];

    data.bots.forEach((botData) => {
      this.bots.push(new Bot(botData));
    });
  }
}
