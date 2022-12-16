import 'dotenv/config'
import startDBServer from 'trading-bot-database'
import { setDotEnv, validateAndGetEnvVariables } from '../../config/env.js'
import Runner from '../runner/runner.js'
import startAppServer from '../server/server.js'
import store from '../store/store.js'

setDotEnv()

const variables = [
  'APP_PORT',
  'HOST_NAME',
  'DATABASE_PORT',
  'DATABASE_DIRECTORY',
  'DATABASE_BACKUP_DIRECTORY',
] as const

const requiredEnvVariables = validateAndGetEnvVariables(variables)

void (async function () {
  try {
    await startDBServer(
      parseInt(requiredEnvVariables.DATABASE_PORT),
      requiredEnvVariables.HOST_NAME,
      requiredEnvVariables.DATABASE_DIRECTORY,
      requiredEnvVariables.DATABASE_BACKUP_DIRECTORY
    )

    await store.setUp()
    Runner.runBots()
    Runner.runPriceReader()
    await startAppServer(
      parseInt(requiredEnvVariables.APP_PORT),
      requiredEnvVariables.HOST_NAME
    )
  } catch (error) {
    console.error(error)
    process.exit()
  }
})()
