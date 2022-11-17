/*
 * delete this app's database file
 */

import { AxiosResponse } from 'axios'
import readlineImported, { Interface } from 'readline'
import startDBServer from 'trading-bot-database'
import { setDotEnv, validateAndGetEnvVariables } from '../../config/env.js'
import DatabaseDriver from '../database-driver/database-driver.js'
import store from '../store/store.js'
import Messages from '../types/messages.js'

type VariablesType = typeof variables[number]

setDotEnv()

const variables: string[] = [
  'HOST_NAME',
  'DATABASE_PORT',
  'DATABASE_DIRECTORY',
  'DATABASE_BACKUP_DIRECTORY',
]

const requiredEnvVariables: { [key: VariablesType]: string } =
  validateAndGetEnvVariables(variables)

void (async function () {
  const readline: Interface = readlineImported.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  readline.question(
    Messages.DELETE_EXISTING_DATABASE,
    async (answer: string) => {
      readline.close()

      if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log(Messages.DATABASE_DELETION_CANCELLED)
        return
      }

      await startDBServer(
        parseInt(requiredEnvVariables.DATABASE_PORT),
        requiredEnvVariables.HOST_NAME,
        requiredEnvVariables.DATABASE_DIRECTORY,
        requiredEnvVariables.DATABASE_BACKUP_DIRECTORY
      )

      try {
        const response: AxiosResponse | string = await new DatabaseDriver(
          store.readAppEnvironment()
        ).delete()

        if (typeof response === 'string') {
          console.error(response)
        } else if (response?.status === 200) {
          console.log(response.data)
        } else {
          console.error(response.data)
        }
      } catch (error: any) {
        console.error(error.data)
      }

      process.exit()
    }
  )
})()
