import axios, { AxiosResponse } from 'axios'
import { AccountDataStripped, AppData, AppEnvironmentFull } from '../types'
import Messages from '../types/messages.js'

export default class DatabaseDriver {
  constructor(private appEnvironment: AppEnvironmentFull) {}

  public async read(): Promise<AxiosResponse | string> {
    try {
      return await axios.get(this.appEnvironment.databasePath)
    } catch (error) {
      return this.getErrorType(error)
    }
  }

  public async write(
    data: AccountDataStripped[]
  ): Promise<AxiosResponse | string> {
    const payload: AppData = {
      appId: this.appEnvironment.appId,
      firstAppStart: this.appEnvironment.firstAppStart,
      lastAppStart: this.appEnvironment.lastAppStart,
      locale: this.appEnvironment.locale,
      timeZone: this.appEnvironment.timeZone,
      accounts: data,
    }

    try {
      return await axios.post(this.appEnvironment.databasePath, payload, {
        headers: {
          'Content-Type': 'application/json',
          password: process.env.DATABASE_PASSWORD,
        },
      })
    } catch (error) {
      return this.getErrorType(error)
    }
  }

  public async delete(): Promise<AxiosResponse | string> {
    try {
      return await axios.delete(this.appEnvironment.databasePath, {
        headers: {
          password: process.env.DATABASE_PASSWORD,
        },
      })
    } catch (error) {
      return this.getErrorType(error)
    }
  }

  private getErrorType(error: any): AxiosResponse | string {
    if (error.response) {
      return error.response
    } else if (error.request) {
      return `${Messages.DATABASE_SERVER_HAS_NOT_RESPONDED}\n${error.request}`
    } else {
      return `${Messages.DATABASE_REQUEST_GENERIC_PROBLEM}\n${error}`
    }
  }
}
