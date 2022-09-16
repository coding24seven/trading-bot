import 'dotenv/config'
import eventBus from '../events/eventBus.js'
import Runner from '../runner/Runner.js'
import store from '../store/Store.js'

const commandLineArguments: string[] = process.argv
const filePath: string = commandLineArguments[2]
const priceColumnIndexAsString: string = commandLineArguments[3]
const priceColumnIndex: number = parseInt(priceColumnIndexAsString) || 0
const isHistoricalPrice: boolean = true

if (filePath) {
  begin()
}

async function begin() {
  await store.setUp({ isHistoricalPrice })

  eventBus.on(
    eventBus.events!.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
    console.log
  )

  Runner.runBots()
  Runner.runPriceReader(isHistoricalPrice, filePath, priceColumnIndex)
}
