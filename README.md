# trading-bot

This repository contains the source code and documentation powering the trading-bot.

## Getting started

### Prerequisites

1. Node: any 16.x version starting with v16.2.0 or greater
1. A clone of [trading bot](https://github.com/coding24seven/trading-bot) on your local machine

#### for trading
1. A clone of [trading bot-database](https://github.com/coding24seven/trading-bot-database) running on your local machine

#### for historical-price analysis and winning bot-config generation
1. csv file(s) containing historical trading data

### Installation

1. `cd trading-bot` to go into the project root
1. `npm i` to install the website's npm dependencies

### Configuration

1. `cp .env.default .env`, and configure .env
1. to trade live or against historical data, configure the trading bots in botConfig.ts 
1. to generate winning bot-configs based on historical data, configure bot-config generator in Comparator.ts

### Running locally

1. `npm start` to make the bot trade on the exchange
1. `npm run continue`to make the bot trade on the exchange, using the existing database
1. `npm run new` to make the bot trade on the exchange, replacing the existing database
1. `npm run delete` to delete the database
1. `npm run historical` to analyse the performance of specific bot configuations in botConfig.ts against the historical data in the provided files
1. `npm run generate` to obtain the winning bot configurations generated through Comparator.ts
1. `npm run log` to log out the store's state populated with bot configurations from botConfig.ts
1. `npm run collect` to display and save to file live exchange prices as they come

#### Command line arguments

`lrr` enables the 'let runners run' mode, which prevents trades from executing the moment the threshold is reached, and waits to take advantage of further price action if the price keeps moving in a favourable direction

### Kucoin exchange

1. Market orders are always considered takers and incur taker fees
