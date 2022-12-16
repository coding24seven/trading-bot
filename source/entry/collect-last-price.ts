/*
 * gets last prices at real time and appends them to file
 */

import fs from 'fs'
import PriceReader from '../price-reader/price-reader.js'
import Messages from '../types/messages.js'

const commandLineArguments: string[] = process.argv
const symbol: string | undefined = commandLineArguments[2]
const outputFilePath: string | undefined = commandLineArguments[3]

collect()

function collect() {
  if (!symbol) {
    console.error(Messages.COMMAND_LINE_CURRENCY_SYMBOL_ARGUMENT_MISSING)

    return
  }

  if (!outputFilePath) {
    console.error(Messages.COMMAND_LINE_OUTPUT_FILE_ARGUMENT_MISSING)

    return
  }

  console.log(`${Messages.PRICE_FOR_SYMBOL_BEING_COLLECTED}: ${symbol}`)
  console.log(`${Messages.WRITING_TO_FILE}: ${outputFilePath}`)

  PriceReader.startOneSymbolLivePriceStream(
    symbol,
    async (lastPrice: string) => {
      try {
        await fs.promises.appendFile(
          outputFilePath,
          `${lastPrice.toString()}\n`
        )

        console.log(lastPrice)
      } catch (e) {
        console.log(e)
      }
    }
  )
}
