import { spawn } from 'child_process'
import 'dotenv/config'
import eventBus from '../events/event-bus.js'
import Runner from '../runner/runner.js'
import store from '../store/store.js'

const commandLineArguments: string[] = process.argv
const filePath: string = commandLineArguments[2]
const priceColumnIndexAsString: string = commandLineArguments[3]
const priceColumnIndex: number = parseInt(priceColumnIndexAsString) || 0
const isHistoricalPrice: boolean = true

const unitTestListener = (data) => {
  process.env.BOT_DATA = JSON.stringify(data)
  spawn('npm', ['run', 'jest'], {
    shell: true,
    stdio: 'inherit',
  })
}

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
