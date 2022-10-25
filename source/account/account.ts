import Bot from '../bot/bot.js'
import { AccountData, BotData } from '../types'
import Messages from '../types/messages.js'

export default class Account {
  bots: Bot[] = []
  minBotCount: number = 1

  constructor(data: AccountData) {
    if (!data.bots || data.bots.length < this.minBotCount) {
      throw new Error(Messages.NO_BOT_DATA_AVAILABLE)
    }

    data.bots.forEach((botData: BotData) => {
      this.bots.push(new Bot(botData))
    })
  }
}
