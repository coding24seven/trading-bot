import axios, { AxiosResponse } from 'axios'
import Big from 'big.js'
import readlineImported, { Interface } from 'readline'
import { Exchange } from '../exchange/Exchange.js'
import {
  AccountConfig,
  AccountData,
  AccountDataStripped,
  AppEnvironment,
  BotConfig,
  BotConfigIndexesPerAccount,
  BotData,
  BotHand,
  BotResults,
  KucoinSymbolData,
  KucoinTicker,
  StoreSetupParameters,
} from '../types'
import { AccountEnvironmentType } from '../types/account-environment-type.js'
import Messages from '../types/messages.js'
import { countDecimals, trimDecimalsToFixed } from '../utils/index.js'

class Store {
  allSymbolsData: KucoinSymbolData[] | undefined
  allTickers: KucoinTicker[] | undefined
  appEnvironment: AppEnvironment | null = null
  accountEnvironment: AccountConfig[] = []
  botConfigIndexesForAllAccounts: BotConfigIndexesPerAccount[] = []
  accounts: AccountData[] = []
  botConfigsInitialPerAccount: BotConfig[][] = [] // outer array length === number of accounts; outer array contains: one array of bot-config objects per account
  bots: BotData[][] = []
  isHistoricalPrice: boolean = false
  botConfigFromGenerator: BotConfig | null = null

  constructor() {
    this.appEnvironment = this.readAppEnvironment()
    this.accountEnvironment = this.readAccountEnvironment()
    this.botConfigIndexesForAllAccounts =
      this.readBotConfigIndexesForAllAccounts()
  }

  get accountsAsString(): string {
    return JSON.stringify(this.accounts, null, 2)
  }

  /*
   * removes api credentials (so the remainder can be stored in database)
   */
  get accountsWithoutConfig(): AccountDataStripped[] {
    const strippedAccounts: AccountData[] = JSON.parse(
      JSON.stringify(this.accounts)
    )

    strippedAccounts.forEach((account: AccountData) => {
      delete account.config
    })

    return strippedAccounts
  }

  async setUp({
    continueWithExistingDatabase = true,
    isHistoricalPrice = false,
    createsStoreAndExits = false,
    botConfigFromGenerator = null,
  }: StoreSetupParameters): Promise<void> {
    this.isHistoricalPrice = isHistoricalPrice
    this.botConfigFromGenerator = botConfigFromGenerator
    this.allSymbolsData = await Exchange.getAllSymbolsData()
    this.allTickers = await Exchange.getAllTickers()

    if (!this.allSymbolsData) {
      throw new Error(Messages.EXCHANGE_SYMBOL_DATA_RESPONSE_FAILED)
    }

    for (const apiConfig of this.accountEnvironment) {
      this.botConfigsInitialPerAccount.push(
        (await import(apiConfig.botConfigPath!)).default
      )
    }

    if (isHistoricalPrice || createsStoreAndExits) {
      this.createAccountsWithBots()
      return Promise.resolve()
    }

    return new Promise(async (resolve, reject) => {
      if (!continueWithExistingDatabase) {
        const readline: Interface = readlineImported.createInterface({
          input: process.stdin,
          output: process.stdout,
        })
        readline.question(
          Messages.OVERWRITE_EXISTING_DATABASE,
          async (answer: string) => {
            readline.close()

            if (answer === 'y' || answer === 'yes') {
              await this.setUpAnew()
              console.log(Messages.DATABASE_CREATED)
              resolve()
            } else {
              reject(Messages.DATABASE_OVERWRITE_PREVENTED_BY_CLIENT)
            }
          }
        )
      } else {
        /* continueWithExistingDatabase */
        const response: AxiosResponse | undefined = await this.readDatabase()

        if (response?.status === 200) {
          console.log(Messages.CONTINUING_WITH_EXISTING_DATABASE)
          this.setUpFromExistingDatabase(response.data)
        } else if (response?.status === 404) {
          console.log(Messages.DATABASE_DOES_NOT_EXIST)
          await this.setUpAnew()
          console.log(Messages.DATABASE_CREATED)
        } else if (!response) {
          throw new Error(Messages.DATABASE_READ_SERVER_CONNECTION_FAIL)
        }

        resolve()
      }
    })
  }

  private async setUpAnew(): Promise<AxiosResponse | never> {
    this.createAccountsWithBots()
    const response: AxiosResponse | undefined = await this.writeDatabase()

    if (!response) {
      throw new Error(Messages.DATABASE_WRITE_SERVER_CONNECTION_FAIL)
    } else if (response.status !== 200) {
      throw new Error(response.data)
    }

    return response
  }

  private setUpFromExistingDatabase(data: AccountDataStripped[]) {
    data.forEach((account: AccountDataStripped, accountIndex: number) => {
      const bots: BotData[] | undefined = data[accountIndex].bots

      if (bots) {
        this.bots[accountIndex] = bots
      }
    })

    this.createAccountsWithBots({ skipBotSetup: true })
  }

  createAccountsWithBots(options: { skipBotSetup: boolean } | null = null) {
    this.accounts = this.setUpAccounts()

    if (!options?.skipBotSetup) {
      this.bots = this.setUpBots()
    }

    this.linkBotsWithAccounts()
  }

  readAppEnvironment(): AppEnvironment {
    const appId: string | undefined = process.env.APP_ID
    const databaseUrl: string | undefined = process.env.DATABASE_URL
    const databasePort: string | undefined = process.env.DATABASE_PORT
    let requestUrl: string

    if (appId && databaseUrl && databasePort) {
      requestUrl = `${databaseUrl}:${databasePort}/accounts/${appId}`
    } else {
      throw new Error(Messages.APP_ENVIRONMENT_CONFIG_DATA_INVALID)
    }

    return {
      appId,
      databaseUrl,
      databasePort,
      requestUrl,
    }
  }

  readAccountEnvironment(): AccountConfig[] {
    const { env }: NodeJS.Process = process
    const accounts: AccountConfig[] = []
    let i: number = 0

    while (env[`ACCOUNT_${i}_EXISTS`]) {
      const apiKey: string | undefined = env[`ACCOUNT_${i}_API_KEY`]
      const secretKey: string | undefined = env[`ACCOUNT_${i}_API_SECRET_KEY`]
      const passphrase: string | undefined = env[`ACCOUNT_${i}_API_PASSPHRASE`]
      const environment: string | undefined =
        env[`ACCOUNT_${i}_API_EXCHANGE_ENVIRONMENT`]
      const botConfigPath: string | undefined =
        env[`ACCOUNT_${i}_BOT_CONFIG_PATH`]

      const accountEnvironmentIsValid =
        environment === AccountEnvironmentType.sandbox ||
        environment === AccountEnvironmentType.live

      if (
        apiKey &&
        secretKey &&
        passphrase &&
        accountEnvironmentIsValid &&
        botConfigPath
      ) {
        accounts.push({
          apiKey,
          secretKey,
          passphrase,
          environment,
          botConfigPath,
        })
      } else {
        throw new Error(Messages.ACCOUNT_ENVIRONMENT_CONFIG_DATA_INVALID)
      }

      i++
    }

    return accounts
  }

  readBotConfigIndexesForAllAccounts(): BotConfigIndexesPerAccount[] {
    const { env }: NodeJS.Process = process
    const arr: BotConfigIndexesPerAccount[] = []
    let i: number = 0

    while (env[`ACCOUNT_${i}_EXISTS`]) {
      const value: string | undefined = env[`ACCOUNT_${i}_BOT_CONFIG_INDEXES`]

      if (value) {
        arr.push({
          botConfigIndexesPerAccount: value
            .split(',')
            .map((item: string) => parseInt(item)), // e.g. '1,3' -> [ 1, 3 ]
        })
      } else {
        throw new Error(Messages.BOT_CONFIG_INDEXES_MISSING)
      }

      i++
    }

    return arr
  }

  linkBotsWithAccounts() {
    this.accounts.forEach((account: AccountData, accountIndex: number) => {
      account.bots = this.bots[accountIndex]
    })
  }

  setUpAccounts(): AccountData[] {
    const arr: AccountData[] = []

    for (
      let accountIndex: number = 0;
      accountIndex < this.accountEnvironment.length;
      accountIndex++
    ) {
      arr.push({
        config: this.accountEnvironment[accountIndex],
      })
    }

    return arr
  }

  setUpBots(): BotData[][] {
    const arr: BotData[][] = []

    for (
      let accountIndex: number = 0;
      accountIndex < this.accountEnvironment.length;
      accountIndex++
    ) {
      const arrayOfBotsPerAccount: BotData[] = []

      const selectedBotConfigs: BotConfig[] = this.botConfigFromGenerator
        ? [this.botConfigFromGenerator]
        : this.botConfigIndexesForAllAccounts[
            accountIndex
          ].botConfigIndexesPerAccount.map(
            (botIndex: number) =>
              this.botConfigsInitialPerAccount[accountIndex][botIndex]
          )

      selectedBotConfigs.forEach((config: BotConfig, botIndex: number) => {
        const symbolData = this.allSymbolsData!.find(
          (data: KucoinSymbolData) => data.symbol === config.symbol
        )

        const ticker = this.allTickers!.find(
          (ticker: KucoinTicker) => ticker.symbol === config.symbol
        )

        if (!symbolData) {
          throw new Error(Messages.SYMBOL_DATA_NOT_FOUND)
        }
        if (!ticker) {
          throw new Error(Messages.TICKER_NOT_FOUND)
        }

        const extendedConfig: BotConfig = {
          ...config,
          id: botIndex,
          itsAccountId: accountIndex,
          baseMinimumTradeSize: parseFloat(symbolData.baseMinSize),
          quoteMinimumTradeSize: parseFloat(symbolData.quoteMinSize),
          baseIncrement: symbolData.baseIncrement,
          quoteIncrement: symbolData.quoteIncrement,
          baseDecimals: countDecimals(symbolData.baseIncrement),
          quoteDecimals: countDecimals(symbolData.quoteIncrement),
          tradeFee: parseFloat(ticker.takerFeeRate),
        }

        const hands: BotHand[] = this.buildHands(extendedConfig)
        extendedConfig.handCount = hands.length
        this.topUpHandsWithQuote(hands, extendedConfig)
        this.topUpHandsWithBase(hands, extendedConfig)

        const botData: BotData = {
          config: extendedConfig,
          vars: {
            hands,
          },
        }

        this.throwErrorIfBotConfigInvalid(botData.config)
        arrayOfBotsPerAccount.push(botData)
      })

      arr.push(arrayOfBotsPerAccount)
    }

    return arr
  }

  topUpHandsWithQuote(hands: BotHand[], botConfig: BotConfig) {
    const handsToTopUpWithQuoteCount: number = hands.filter((hand: BotHand) =>
      handQualifiesForTopUp(hand)
    ).length

    botConfig.quoteStartAmountPerHand =
      handsToTopUpWithQuoteCount > 0
        ? trimDecimalsToFixed(
            Big(botConfig.quoteStartAmount)
              .div(handsToTopUpWithQuoteCount)
              .toNumber(),
            botConfig.quoteDecimals!
          )
        : 0

    hands.forEach((hand: BotHand) => {
      if (
        handQualifiesForTopUp(hand) &&
        botConfig.quoteStartAmountPerHand !== null
      ) {
        hand.quote = botConfig.quoteStartAmountPerHand
      }
    })

    function handQualifiesForTopUp(hand) {
      return (
        hand.buyBelow >= botConfig.quoteFrom &&
        hand.buyBelow <= botConfig.quoteTo
      )
    }
  }

  topUpHandsWithBase(hands: BotHand[], botConfig: BotConfig) {
    const handsToTopUpWithBaseCount: number = hands.filter((hand: BotHand) =>
      handQualifiesForTopUp(hand)
    ).length

    botConfig.baseStartAmountPerHand =
      handsToTopUpWithBaseCount > 0
        ? trimDecimalsToFixed(
            Big(botConfig.baseStartAmount)
              .div(handsToTopUpWithBaseCount)
              .toNumber(),
            botConfig.baseDecimals!
          )
        : 0

    hands.forEach((hand: BotHand) => {
      if (
        handQualifiesForTopUp(hand) &&
        botConfig.baseStartAmountPerHand !== null
      ) {
        hand.base = botConfig.baseStartAmountPerHand
      }
    })

    function handQualifiesForTopUp(hand: BotHand): boolean {
      return (
        hand.buyBelow >= botConfig.baseFrom && hand.buyBelow <= botConfig.baseTo
      )
    }
  }

  throwErrorIfBotConfigInvalid(config: BotConfig) {
    if (!this.isHandCountValid(config)) {
      throw new Error(`${Messages.HAND_COUNT_INVALID}. it must be >= 2`)
    }

    if (!this.isProfitGreaterThanTradeFee(config)) {
      throw new Error(
        `hand span ${config.handSpanPercent} is ${Messages.HAND_SPAN_TOO_NARROW}`
      )
    }
  }

  isHandCountValid({ handCount }): boolean {
    return handCount >= 2
  }

  isProfitGreaterThanTradeFee({ handSpanPercent, tradeFee }): boolean {
    if (tradeFee === null) {
      throw new Error(Messages.EXCHANGE_FEE_MUST_NOT_BE_NULL)
    }

    const handSpanDecimal: number = Big(handSpanPercent).div(100).toNumber()
    const buyAndSellFee: number = Big(tradeFee).mul(2).toNumber()

    return buyAndSellFee < handSpanDecimal
  }

  buildHands(config: BotConfig): BotHand[] {
    const { from, to, handSpanPercent }: BotConfig = config
    const hands: BotHand[] = []
    let buyBelow: number = from
    let id: number = 0
    const handSpanPercentDecimal = handSpanPercent / 100
    const increment: number = Big(to)
      .minus(from)
      .mul(handSpanPercentDecimal)
      .toNumber()

    while (buyBelow < to) {
      const sellAbove: number = Big(buyBelow).plus(increment).toNumber()

      hands.push({
        id,
        buyBelow,
        sellAbove,
        quote: 0,
        base: 0,
        buyCount: 0,
        sellCount: 0,
        tradeIsPending: false,
      })

      buyBelow = sellAbove
      id++
    }

    return hands
  }

  setResults(
    accountId: number | null,
    botId: number | null,
    results: BotResults | undefined
  ) {
    if (accountId === null || botId === null || !results) {
      return
    }

    this.accounts[accountId].bots![botId].vars.results = results

    if (!this.isHistoricalPrice) {
      this.writeDatabase()
    }
  }

  getResults(accountId, botId): BotResults | undefined {
    return this.accounts[accountId].bots![botId].vars.results
  }

  getAccountConfig(accountId): AccountConfig {
    return this.accounts[accountId].config!
  }

  async readDatabase(): Promise<AxiosResponse | undefined> {
    try {
      return await axios.get(this.appEnvironment!.requestUrl)
    } catch (error) {
      return this.handleDatabaseError(error)
    }
  }

  async writeDatabase(): Promise<AxiosResponse | undefined> {
    try {
      return await axios.post(
        this.appEnvironment!.requestUrl,
        this.accountsWithoutConfig,
        {
          headers: {
            'Content-Type': 'application/json',
            password: process.env.DATABASE_PASSWORD,
          },
        }
      )
    } catch (error) {
      return this.handleDatabaseError(error)
    }
  }

  async deleteDatabase(): Promise<AxiosResponse | undefined> {
    try {
      return await axios.delete(this.appEnvironment!.requestUrl, {
        headers: {
          password: process.env.DATABASE_PASSWORD,
        },
      })
    } catch (error) {
      return this.handleDatabaseError(error)
    }
  }

  handleDatabaseError(error): AxiosResponse | undefined {
    if (error.response) {
      return error.response
    } else if (error.request) {
      console.log(Messages.DATABASE_SERVER_HAS_NOT_RESPONDED)
    } else {
      throw new Error(Messages.DATABASE_REQUEST_GENERIC_PROBLEM)
    }
    // todo: NOTIFY (BY EMAIL?) ABOUT READ/WRITE TO DATABASE ERROR
  }
}

const store: Store = new Store()
export default store
