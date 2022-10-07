import 'dotenv/config'
import { setDotEnv } from '../../config/env.js'
import Runner from '../runner/runner.js'
import store from '../store/store.js'

setDotEnv()

const commandLineArguments: string[] = process.argv

const continueWithExistingDatabase: boolean = !commandLineArguments.includes(
  'starts:with:new:store'
)

begin()

async function begin() {
  try {
    await store.setUp({ continueWithExistingDatabase })
    Runner.runBots()
    Runner.runPriceReader()
  } catch (e) {
    console.log(e)
  }
}
