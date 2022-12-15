import { spawn } from 'child_process'
import minimist from 'minimist'
import { setDotEnv } from '../../config/env.js'
import eventBus, { EventBusEvents } from '../events/event-bus.js'
import CsvFileReader from '../file-reader/csv-file-reader.js'
import Runner from '../runner/runner.js'
import store from '../store/store.js'
import { BotData, CommandLineArguments } from '../types/index.js'
import Messages from '../types/messages.js'
import { zeroIndexPositiveInteger } from '../utils/index.js'

const isHistoricalPrice: boolean = true
const commandLineArguments = minimist<CommandLineArguments>(process.argv.slice(2))
const {
  _: filePathsOrDirectoryPath,
  column,
  c,
  test,
  t,
} = commandLineArguments

const isUnitTest: boolean | undefined = test || t
const env: NodeJS.ProcessEnv = setDotEnv(isUnitTest ? 'test' : undefined)

if (
  filePathsOrDirectoryPath === undefined ||
  filePathsOrDirectoryPath.length < 1
) {
  throw new Error(
    Messages.COMMAND_LINE_FILE_PATHS_OR_DIRECTORY_PATH_ARGUMENT_MISSING
  )
}

if (column === undefined && c === undefined) {
  console.log(Messages.COLUMN_NUMBER_SET_TO_DEFAULT)
}

const filePaths: string[] =
  CsvFileReader.getFilePathsFromFilePathsOrFromDirectoryPath(
    filePathsOrDirectoryPath
  )

const defaultColumnNumber: number = 1
const columnNumber: number = column || c || defaultColumnNumber
CsvFileReader.validateColumnNumber(columnNumber)

void (async function () {
  await store.setUp({ isHistoricalPrice })

  const startUnitTests = (data: BotData) => {
    env.BOT_DATA = JSON.stringify(data)
    spawn('npm', ['run', 'jest'], {
      shell: true,
      stdio: 'inherit',
    })
  }
  eventBus.on(
    EventBusEvents.BOT_DONE_PROCESSING_HISTORICAL_PRICES,
    isUnitTest ? startUnitTests : console.log
  )

  Runner.runBots()

  Runner.runPriceReader(filePaths, zeroIndexPositiveInteger(columnNumber))
})()
