import axios, { AxiosResponse } from 'axios'
import Big from 'big.js'
import readlineImported, { Interface } from 'readline'
import { Exchange } from '../exchange/exchange.js'
import {
  AccountConfig,
  AccountData,
  AccountDataStripped,
  AppEnvironment,
  BotConfigDynamic,
  BotConfigFull,
  BotConfigStatic,
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
  accounts: AccountData[] = []
  botConfigsInitialPerAccount: BotConfigStatic[][] = [] // outer array length === number of accounts; outer array contains: one array of bot-config objects per account
  bots: BotData[][] = []
  isHistoricalPrice: boolean = false
  botConfigFromGenerator: BotConfigStatic | null = null

  constructor() {
    this.appEnvironment = this.readAppEnvironment()
    this.accountEnvironment = this.readAccountEnvironment()
  }

  get accountsAsString(): string {
    return JSON.stringify(this.accounts, null, 2)
  }

  /*
   * removes api credentials (so the remainder can be stored in database)
   */
  get accountsWithoutConfig(): AccountDataStripped[] {
    return this.accounts.map(({ config, ...rest }: AccountData) => rest)
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
      this.createAccountAndBotConfigs()
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
    this.createAccountAndBotConfigs()
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

    this.createAccountAndBotConfigs({ skipBotSetup: true })
  }

  createAccountAndBotConfigs(options: { skipBotSetup: boolean } | null = null) {
    this.accounts = this.setUpAccountConfigs()

    if (!options?.skipBotSetup) {
      this.bots = this.setUpBotConfigs()
    }

    this.linkBotConfigsWithAccountConfigs()
  }

  readAppEnvironment(): AppEnvironment {
    const appId: string | undefined = process.env.APP_ID
    const databaseDomain: string | undefined = process.env.DATABASE_DOMAIN
    const databasePort: string | undefined = process.env.DATABASE_PORT
    let databasePath: string

    if (appId && databaseDomain && databasePort) {
      databasePath = `${databaseDomain}:${databasePort}/accounts/${appId}`
    } else {
      throw new Error(Messages.APP_ENVIRONMENT_CONFIG_DATA_INVALID)
    }

    return {
      appId,
      databaseDomain,
      databasePort,
      databasePath,
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
      const botConfigIndexesString: string | undefined =
        env[`ACCOUNT_${i}_BOT_CONFIG_INDEXES`] // e.g. '1,3'
      let botConfigIndexes: number[] | undefined // e.g. [ 1, 3 ]

      if (botConfigIndexesString) {
        botConfigIndexes = botConfigIndexesString
          .split(/[,\s]+/)
          .map((item: string) => parseInt(item))
      } else {
        throw new Error(Messages.BOT_CONFIG_INDEXES_MISSING)
      }

      const accountEnvironmentIsValid =
        environment === AccountEnvironmentType.sandbox ||
        environment === AccountEnvironmentType.live

      if (
        apiKey &&
        secretKey &&
        passphrase &&
        accountEnvironmentIsValid &&
        botConfigPath &&
        botConfigIndexes
      ) {
        accounts.push({
          apiKey,
          secretKey,
          passphrase,
          environment,
          botConfigPath,
          botConfigIndexes,
        })
      } else {
        throw new Error(Messages.ACCOUNT_ENVIRONMENT_CONFIG_DATA_INVALID)
      }

      i++
    }

    return accounts
  }

  linkBotConfigsWithAccountConfigs() {
    this.accounts.forEach((account: AccountData, accountIndex: number) => {
      account.bots = this.bots[accountIndex]
    })
  }

  setUpAccountConfigs(): AccountData[] {
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

  setUpBotConfigs(): BotData[][] {
    const botsPerAccount: BotData[][] = []

    for (
      let accountIndex: number = 0;
      accountIndex < this.accountEnvironment.length;
      accountIndex++
    ) {
      const botConfigs: BotData[] = []

      const selectedBotConfigs: BotConfigStatic[] = this.botConfigFromGenerator
        ? [this.botConfigFromGenerator]
        : this.accounts[accountIndex].config!.botConfigIndexes.map(
            (botIndex: number) =>
              this.botConfigsInitialPerAccount[accountIndex][botIndex]
          )

      selectedBotConfigs.forEach(
        (configStatic: BotConfigStatic, botIndex: number) => {
          const symbolData = this.allSymbolsData!.find(
            (data: KucoinSymbolData) => data.symbol === configStatic.symbol
          )

          const ticker = this.allTickers!.find(
            (ticker: KucoinTicker) => ticker.symbol === configStatic.symbol
          )

          if (!symbolData) {
            throw new Error(Messages.SYMBOL_DATA_NOT_FOUND)
          }
          if (!ticker) {
            throw new Error(Messages.TICKER_NOT_FOUND)
          }

          let hands: BotHand[] = this.buildHands(configStatic)

          const quoteDecimals = countDecimals(symbolData.quoteIncrement)
          const quoteStartAmountPerHand = trimDecimalsToFixed(
            this.calculateQuoteStartAmountPerHand(hands, configStatic),
            quoteDecimals
          )

          const baseDecimals = countDecimals(symbolData.baseIncrement)
          const baseStartAmountPerHand = trimDecimalsToFixed(
            this.calculateBaseStartAmountPerHand(hands, configStatic),
            baseDecimals
          )

          const configDynamic: BotConfigDynamic = {
            id: botIndex,
            itsAccountId: accountIndex,
            baseMinimumTradeSize: parseFloat(symbolData.baseMinSize),
            quoteMinimumTradeSize: parseFloat(symbolData.quoteMinSize),
            baseIncrement: symbolData.baseIncrement,
            quoteIncrement: symbolData.quoteIncrement,
            baseDecimals,
            quoteDecimals,
            handCount: hands.length,
            quoteStartAmountPerHand,
            baseStartAmountPerHand,
            tradeFee: parseFloat(ticker.takerFeeRate),
          }

          hands = this.topUpHandsWithBase(hands, configStatic, configDynamic)
          hands = this.topUpHandsWithQuote(hands, configStatic, configDynamic)

          const botConfig: BotData = {
            static: configStatic,
            dynamic: configDynamic,
            hands,
          }

          this.throwErrorIfBotConfigInvalid({
            ...botConfig.static,
            ...botConfig.dynamic,
          })
          botConfigs.push(botConfig)
        }
      )

      botsPerAccount.push(botConfigs)
    }

    return botsPerAccount
  }

  calculateQuoteStartAmountPerHand(
    hands: BotHand[],
    configStatic: BotConfigStatic
  ): number {
    const handsToTopUpWithQuoteCount: number = hands.filter((hand: BotHand) =>
      this.quoteHandQualifiesForTopUp(hand, configStatic)
    ).length

    return handsToTopUpWithQuoteCount > 0
      ? Big(configStatic.quoteStartAmount)
          .div(handsToTopUpWithQuoteCount)
          .toNumber()
      : 0
  }

  topUpHandsWithQuote(
    hands: BotHand[],
    configStatic: BotConfigStatic,
    configDynamic: BotConfigDynamic
  ): BotHand[] {
    const toppedUpHands = JSON.parse(JSON.stringify(hands))

    toppedUpHands.forEach((hand: BotHand) => {
      if (
        this.quoteHandQualifiesForTopUp(hand, configStatic) &&
        configDynamic.quoteStartAmountPerHand !== null
      ) {
        hand.quote = configDynamic.quoteStartAmountPerHand
      }
    })

    return toppedUpHands
  }

  quoteHandQualifiesForTopUp(
    hand: BotHand,
    botConfig: BotConfigStatic
  ): boolean {
    return (
      hand.buyBelow >= botConfig.quoteFrom && hand.buyBelow <= botConfig.quoteTo
    )
  }

  calculateBaseStartAmountPerHand(
    hands: BotHand[],
    configStatic: BotConfigStatic
  ): number {
    const handsToTopUpWithBaseCount: number = hands.filter((hand: BotHand) =>
      this.baseHandQualifiesForTopUp(hand, configStatic)
    ).length

    return handsToTopUpWithBaseCount > 0
      ? Big(configStatic.baseStartAmount)
          .div(handsToTopUpWithBaseCount)
          .toNumber()
      : 0
  }

  topUpHandsWithBase(
    hands: BotHand[],
    configStatic: BotConfigStatic,
    configDynamic: BotConfigDynamic
  ): BotHand[] {
    const toppedUpHands = JSON.parse(JSON.stringify(hands))

    toppedUpHands.forEach((hand: BotHand) => {
      if (
        this.baseHandQualifiesForTopUp(hand, configStatic) &&
        configDynamic.baseStartAmountPerHand !== null
      ) {
        hand.base = configDynamic.baseStartAmountPerHand
      }
    })

    return toppedUpHands
  }

  baseHandQualifiesForTopUp(
    hand: BotHand,
    botConfig: BotConfigStatic
  ): boolean {
    return (
      hand.buyBelow >= botConfig.baseFrom && hand.buyBelow <= botConfig.baseTo
    )
  }

  throwErrorIfBotConfigInvalid(config: BotConfigFull) {
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

  buildHands(configStatic: BotConfigStatic): BotHand[] {
    const { from, to, handSpanPercent }: BotConfigStatic = configStatic
    const hands: BotHand[] = []
    let buyBelow: number = from
    let id: number = 0
    const handSpanPercentDecimal: number = Big(handSpanPercent)
      .div(100)
      .toNumber()
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

    this.accounts[accountId].bots![botId].results = results

    if (!this.isHistoricalPrice) {
      this.writeDatabase()
    }
  }

  getResults(accountId, botId): BotResults | undefined {
    return this.accounts[accountId].bots![botId].results
  }

  getAccountConfig(accountId): AccountConfig {
    return this.accounts[accountId].config!
  }

  async readDatabase(): Promise<AxiosResponse | undefined> {
    try {
      return await axios.get(this.appEnvironment!.databasePath)
    } catch (error) {
      return this.handleDatabaseError(error)
    }
  }

  async writeDatabase(): Promise<AxiosResponse | undefined> {
    try {
      return await axios.post(
        this.appEnvironment!.databasePath,
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
      return await axios.delete(this.appEnvironment!.databasePath, {
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
