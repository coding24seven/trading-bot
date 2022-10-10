import { setDotEnv } from '../../config/env.js'
import store from '../store/store.js'

setDotEnv()

begin()

async function begin() {
  await store.setUp({ createsStoreAndExits: true })

  console.log(store.accountsAsString)
}
