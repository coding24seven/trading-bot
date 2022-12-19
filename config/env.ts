import dotenv from 'dotenv'
import { EnvironmentTypes } from '../source/types'
import Messages from '../source/types/messages.js'

export function setDotEnv(
  environment: EnvironmentTypes = 'development'
): NodeJS.ProcessEnv {
  const configDirectory: string = 'config'

  const paths: Record<EnvironmentTypes, string> = {
    development: `${configDirectory}/.env`,
    production: `${configDirectory}/.env`,
    test: `${configDirectory}/.env.test`,
  }

  dotenv.config({ path: paths[environment] })

  return process.env
}

export function validateAndGetEnvVariables<T extends string>(variables: readonly T[]): Record<T, string> {

  let selectedEnvVariables = {} as Record<T, string>

  variables.forEach((variable: T) => {
    const value: string | undefined = process.env[variable]

    if (value && typeof value === 'string') {
      selectedEnvVariables[variable] = value
    } else {
      throw new Error(`${variable} ${Messages.MISSING}`)
    }
  })

  return selectedEnvVariables
}
