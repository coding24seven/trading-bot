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

1. `cd trading-bot` go into the project root
1. `npm i` install the npm dependencies

### Configuration

1. `cp .env.default .env`, and configure .env
1. to trade live or against historical data, configure trading bots in bot-config.ts
1. to run unit tests, configure trading bots in bot-config-test.ts
1. to generate winning bot-configs based on historical data, configure bot-config generator in comparator.ts

### Command line arguments

1. -- ((not used in package.json) enables npm run to pass argument flags (such as --column, --test) to script instead of to npm command)
1. \<csv file path(s)\> OR \<directory-with-csv-files path\>
1. --column, -c \<column number containing prices in csv file\>
1. --test, -t (run unit tests)

### Example command line instructions:

1. check bot configuration against historical-price files contained in 'tests' directory, where prices are featured in first column: `npm run historical tests -c 1`

### Running locally

1. `new-or-continue` create new database and make bot trade on exchange
1. `npm run delete` delete database
1. `npm run historical -- <historical-file path(s) or directory path> -c price-column` analyse performance of specific bot configuations in botConfig.ts against historical data in provided files. Example: `npm run historical -- historical-price-files/BTCUSDT-1m-2021-05.csv -c 3`
1. `npm run generate -- <historical-file path(s) or directory path> -c price-column` obtain winning bot configurations generated through Comparator.ts. Example: `npm run -- generate historical-price-files -c 2`
1. `npm run log` log out store's state populated with bot configurations from botConfig.ts
1. `npm run collect BTC-USDT output-file-path.csv` (or any other valid symbol in place of `BTC-USDT`) display live exchange prices for symbol while saving them to file
1. `npm test` run unit tests

### Kucoin exchange info

1. Market orders are always considered takers and incur taker fees
