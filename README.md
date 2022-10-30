# trading-bot

This repository contains the source code and documentation powering the trading-bot.

## Purpose

1. Obtains trading results based on a custom configuration pitched against historical prices
1. Generates winning bot configurations based on historical prices
1. Trades live on an exchange (Kucoin)

## Getting started

### Prerequisites

1. Node: any 16.x version starting with v16.2.0 or greater
1. A clone of [trading bot](https://github.com/coding24seven/trading-bot) on your local machine

#### for trading

1. A clone of [trading bot-database](https://github.com/coding24seven/trading-bot-database) running on your local
   machine

#### for historical-price analysis and winning bot-config generation

1. csv file(s) containing historical trading data

### Installation

1. `cd trading-bot` to go into the project root
1. `npm i` to install the npm dependencies

### Configuration

1. `cp .env.default .env`, and configure .env
1. to trade live or against historical data, configure the trading bots in bot-config.ts
1. to run unit tests, configure the trading bots in bot-config-test.ts
1. to generate winning bot-configs based on historical data, configure bot-config generator in comparator.ts

### Command line arguments

1. -- ((not used in package.json) enables npm run to pass argument flags (such as -t) to script instead of to npm command)
1. \<csv file path(s)\> OR \<directory-with-csv-files path\>
1. --column, -c \<column number containing prices in csv file\>
1. --test, -t (run unit tests)

### Example command line instructions:

1. unit test historical price files contained in 'tests' directory, where prices are featured in first column: `npm run historical -- tests -c 1 -t`

### Running locally

1. `npm start` to make the bot trade on the exchange, using the existing database if it exists, or creating a new database if it does not exist
1. `npm run new` to make the bot trade on the exchange, replacing the existing database
1. `npm run delete` to delete the database
1. `npm run historical <historical-file path or paths> -c price-column` to analyse the performance of specific bot configuations in botConfig.ts against the historical data in the provided files. Example: `npm run historical historical-price-files/BTCUSDT-1m-2021-05.csv -c 3`
1. `npm run generate historical-file-path price-column-index` to obtain the winning bot configurations generated through Comparator.ts. Example: `npm run generate historical-price-files/BTCUSDT-1m-2021-05.csv 2`
1. `npm run log` to log out the store's state populated with bot configurations from botConfig.ts
1. `npm run collect BTC-USDT output-file-path.csv` (or any other valid symbol in place of `BTC-USDT`) to display live exchange prices for the symbol while saving them to file

### Kucoin exchange info

1. Market orders are always considered takers and incur taker fees
