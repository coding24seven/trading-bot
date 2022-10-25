/*
 * deletes this app's database file
 */

import { AxiosResponse } from 'axios'
import { setDotEnv } from '../../config/env.js'
import store from '../store/store.js'

setDotEnv()

void (async function () {
  try {
    const response: AxiosResponse | undefined | void =
      await store.deleteDatabase()

    if (response?.status === 200) {
      console.log(response.data)
    }
  } catch (error: any) {
    console.log(error.data)
  }
})()
