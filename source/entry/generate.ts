import fs from 'fs'
import { setDotEnv } from '../../config/env.js'
import Comparator from '../comparator/comparator.js'
import eventBus from '../events/event-bus.js'
import Runner from '../runner/runner.js'
import store from '../store/store.js'
import { BotData } from '../types'

setDotEnv()

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

  for (const [i, botConfigStatic] of Comparator.botConfigs.entries()) {
    Comparator.addEventListeners()

    await store.setUp({
      isHistoricalPrice,
      botConfigFromGenerator: botConfigStatic,
    })

    Runner.runBots()

    Runner.runPriceReader([filePath], priceColumnIndex)

    eventBus.removeAllListeners()

    console.log('count', i + 1)
  }

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
