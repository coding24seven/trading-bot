import 'dotenv/config'
import startDBServer from 'trading-bot-database'
import { setDotEnv } from '../../config/env.js'
import Runner from '../runner/runner.js'
import store from '../store/store.js'

setDotEnv()

const commandLineArguments: string[] = process.argv

const continueWithExistingDatabase: boolean = !commandLineArguments.includes(
  'starts:with:new:store'
)

void (async function () {
  try {
    await startDBServer()

    await store.setUp({ continueWithExistingDatabase })
    Runner.runBots()
    Runner.runPriceReader()
  } catch (e) {
    console.log(e)
    process.exit()
  }
})()
