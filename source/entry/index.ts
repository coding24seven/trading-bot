import 'dotenv/config'
import startDBServer from 'trading-bot-database'
import { setDotEnv, validateEnvVariables } from '../../config/env.js'
import Runner from '../runner/runner.js'
import startAppServer from '../server/server.js'
import store from '../store/store.js'

const commandLineArguments: string[] = process.argv
const continueWithExistingDatabase: boolean = !commandLineArguments.includes(
  'starts:with:new:store'
)

const {
  APP_PORT,
  HOST_NAME,
  DATABASE_PORT,
  DATABASE_DIRECTORY,
  DATABASE_BACKUP_DIRECTORY,
}: NodeJS.ProcessEnv = setDotEnv()

const variables = [
  'APP_PORT',
  'HOST_NAME',
  'DATABASE_PORT',
  'DATABASE_DIRECTORY',
  'DATABASE_BACKUP_DIRECTORY',
]

validateEnvVariables(variables)

void (async function () {
  try {
    await startDBServer(
      parseInt(DATABASE_PORT!),
      HOST_NAME!,
      DATABASE_DIRECTORY!,
      DATABASE_BACKUP_DIRECTORY!
    )

    await store.setUp({ continueWithExistingDatabase })
    Runner.runBots()
    Runner.runPriceReader()
    await startAppServer(parseInt(APP_PORT!), HOST_NAME!)
  } catch (error) {
    console.error(error)
    process.exit()
  }
})()
