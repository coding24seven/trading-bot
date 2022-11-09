/*
 * delete this app's database file
 */

import { AxiosResponse } from 'axios'
import startDBServer from 'trading-bot-database'
import { setDotEnv, validateEnvVariables } from '../../config/env.js'
import store from '../store/store.js'

const {
  HOST_NAME,
  DATABASE_PORT,
  DATABASE_DIRECTORY,
  DATABASE_BACKUP_DIRECTORY,
}: NodeJS.ProcessEnv = setDotEnv()

const variables = [
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

    const response: AxiosResponse | undefined | void =
      await store.deleteDatabase()

    if (response?.status === 200) {
      console.log(response.data)
    }
  } catch (error: any) {
    console.error(error.data)
  }

  process.exit()
})()
