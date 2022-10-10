import dotenv from 'dotenv'
import { EnvironmentTypes } from '../source/types'

export function setDotEnv(environment: EnvironmentTypes = 'development') {
  const configDirectory: string = 'config'

  const paths: { [key in EnvironmentTypes]: string } = {
    development: `${configDirectory}/.env`,
    production: `${configDirectory}/.env`,
    test: `${configDirectory}/.env.test`,
  }

  dotenv.config({ path: paths[environment] })
}
