import fs from 'fs'
import minimist from 'minimist'
import { setDotEnv } from '../../config/env.js'
import Comparator from '../comparator/comparator.js'
import eventBus from '../events/event-bus.js'
import CsvFileReader from '../file-reader/csv-file-reader.js'
import Runner from '../runner/runner.js'
import store from '../store/store.js'
import { BotData, CommandLineArguments } from '../types'
import Messages from '../types/messages.js'
import { zeroIndexPositiveInteger } from '../utils/index.js'

setDotEnv()

const isHistoricalPrice: boolean = true
const commandLineArguments = minimist<CommandLineArguments>(process.argv.slice(2))
const {
  _: filePathsOrDirectoryPath,
  column,
  c,
} = commandLineArguments

if (
  filePathsOrDirectoryPath === undefined ||
  filePathsOrDirectoryPath.length < 1
) {
  throw new Error(
    Messages.COMMAND_LINE_FILE_PATHS_OR_DIRECTORY_PATH_ARGUMENT_MISSING
  )
}

if (column === undefined && c === undefined) {
  throw new Error(Messages.COMMAND_LINE_COLUMN_NUMBER_ARGUMENT_MISSING)
}

const filePaths: string[] =
  CsvFileReader.getFilePathsFromFilePathsOrFromDirectoryPath(
    filePathsOrDirectoryPath
  )

const columnNumber: number = column || c
CsvFileReader.validateColumnNumber(columnNumber)

void (async function () {
  Comparator.run('BTC-USDT')

  console.log('bot count:', Comparator.botConfigs.length)

  for (const [i, botConfigStatic] of Comparator.botConfigs.entries()) {
    Comparator.addEventListeners()

    await store.setUp({
      isHistoricalPrice,
      botConfigFromGenerator: botConfigStatic,
    })

    Runner.runBots()

    Runner.runPriceReader(filePaths, zeroIndexPositiveInteger(columnNumber))

    eventBus.removeAllListeners()

    console.log('count', i + 1)
  }

  const sortedResults: BotData[] = Comparator.sortConfigsByProfit()

  fs.promises.writeFile(
    'logs/bots-sorted.json',
    JSON.stringify(sortedResults, null, 2)
  )

  const mostProfitableConfigsToShowCount: number = 6

  console.log(
    JSON.stringify(
      sortedResults.slice(-mostProfitableConfigsToShowCount),
      null,
      2
    )
  )
})()
