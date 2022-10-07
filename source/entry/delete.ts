/*
 * deletes this app's database file
 */

import { AxiosResponse } from 'axios'
import { setDotEnv } from '../../config/env.js'
import store from '../store/store.js'

setDotEnv()

begin()

async function begin() {
  const response: AxiosResponse | undefined = await store.deleteDatabase()

  if (response?.status === 200) {
    console.log(response.data)
  } else if (response?.status) {
    console.log(`status:`, response.status)
    console.log(response.data)
  }
}
