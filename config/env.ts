import dotenv from 'dotenv'
import { EnvironmentTypes } from '../source/types'
import Messages from '../source/types/messages.js'

export function setDotEnv(
  environment: EnvironmentTypes = 'development'
): NodeJS.ProcessEnv {
  const configDirectory: string = 'config'

  const paths: { [key in EnvironmentTypes]: string } = {
    development: `${configDirectory}/.env`,
    production: `${configDirectory}/.env`,
    test: `${configDirectory}/.env.test`,
  }

  dotenv.config({ path: paths[environment] })

  return process.env
}

export function validateEnvVariables(variables: string[]) {
  variables.forEach((variable: string) => {
    if (!process.env[variable]) {
      throw new Error(`${variable} ${Messages.MISSING}`)
    }
  })
}
