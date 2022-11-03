import 'dotenv/config'
import startDBServer from 'trading-bot-database'
import { setDotEnv } from '../../config/env.js'
import Runner from '../runner/runner.js'
import startAppServer from '../server/server.js'
import store from '../store/store.js'
import Messages from '../types/messages.js'

const commandLineArguments: string[] = process.argv
const continueWithExistingDatabase: boolean = !commandLineArguments.includes(
  'starts:with:new:store'
)

const { APP_PORT, HOST_NAME }: NodeJS.ProcessEnv = setDotEnv()

if (!APP_PORT) {
  throw new Error(Messages.APP_PORT_MISSING)
}

if (!HOST_NAME) {
  throw new Error(Messages.HOST_NAME_MISSING)
}

void (async function () {
  try {
    await startDBServer()

    await store.setUp({ continueWithExistingDatabase })
    Runner.runBots()
    Runner.runPriceReader()
    await startAppServer(parseInt(APP_PORT), HOST_NAME)
  } catch (error) {
    console.error(error)
    process.exit()
  }
})()
