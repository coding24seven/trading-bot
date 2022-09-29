import 'dotenv/config'
import fs from 'fs'
import Comparator from '../comparator/comparator.js'
import eventBus from '../events/event-bus.js'
import Runner from '../runner/runner.js'
import store from '../store/store.js'
import { BotConfigStatic, BotData } from '../types'

const commandLineArguments: string[] = process.argv
const filePath: string = commandLineArguments[2]
const priceColumnIndexAsString: string = commandLineArguments[3]
const priceColumnIndex: number = parseInt(priceColumnIndexAsString) || 0
const isHistoricalPrice: boolean = true

if (filePath) {
  begin()
}

async function begin() {
  Comparator.run('BTC-USDT')

  console.log('bot count:', Comparator.botConfigs.length)

  Comparator.botConfigs.forEach((botConfig: BotConfigStatic, i: number) => {
    Comparator.addEventListeners()

    store.setUp({ isHistoricalPrice, botConfigFromGenerator: botConfig })

    Runner.runBots()
    Runner.runPriceReader(isHistoricalPrice, filePath, priceColumnIndex)

    eventBus.removeAllListeners()

    console.log('count', i + 1)
  })

  const sortedResults: BotData[] = Comparator.sortConfigsByProfit()

  fs.promises.writeFile(
    'logs/bots-sorted.json',
    JSON.stringify(sortedResults, null, 2)
  )

  const mostProfitableConfigsToShowCount: number = 6

  console.log(
    JSON.stringify(
      sortedResults.slice(-mostProfitableConfigsToShowCount),
      null,
      2
    )
  )
}
