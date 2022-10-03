import { spawn } from 'child_process'
import 'dotenv/config'
import minimist from 'minimist'
import eventBus from '../events/event-bus.js'
import CsvFileReader from '../file-reader/csv-file-reader.js'
import Runner from '../runner/runner.js'
import store from '../store/store.js'
import { BotHand, CommandLineArguments } from '../types/index.js'
import Messages from '../types/messages.js'

const isHistoricalPrice: boolean = true
const commandLineArguments = minimist(process.argv.slice(2))
const { file, f, column, c, test, t }: CommandLineArguments =
  commandLineArguments

const isUnitTest: boolean = test || t

if (file === undefined && f === undefined) {
  throw new Error(Messages.COMMAND_LINE_FILE_NAME_ARGUMENT_MISSING)
}

if (column === undefined && c === undefined) {
  throw new Error(Messages.COMMAND_LINE_COLUMN_NUMBER_ARGUMENT_MISSING)
}

const fileName: string = file || f
const columnNumber: number = column || c

if (
  CsvFileReader.fileNameIsValid(fileName) &&
  CsvFileReader.columnNumberIsValid(columnNumber)
) {
  begin()
} else {
  throw new Error(Messages.COMMAND_LINE_ARGUMENTS_INVALID)
}

async function begin() {
  await store.setUp({ isHistoricalPrice })

  const startUnitTests = (data: BotHand[]) => {
    process.env.BOT_DATA = JSON.stringify(data)
    spawn('npm', ['run', 'jest'], {
      shell: true,
      stdio: 'inherit',
    })
  }
  const listener = isUnitTest ? startUnitTests : console.log
  eventBus.on(eventBus.events!.BOT_DONE_PROCESSING_HISTORICAL_PRICES, listener)

  Runner.runBots()

  const columnNumberZeroIndexed = columnNumber - 1
  Runner.runPriceReader(isHistoricalPrice, fileName, columnNumberZeroIndexed)
}
