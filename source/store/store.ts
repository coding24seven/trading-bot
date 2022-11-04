import axios, { AxiosResponse } from 'axios'
import Big from 'big.js'
import path from 'path'
import readlineImported, { Interface } from 'readline'
import Currency from '../currency/currency.js'
import { Exchange } from '../exchange/exchange.js'
import {
  AccountConfig,
  AccountData,
  AccountDataStripped,
  AppData,
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
import { getDateTime, isNumeric } from '../utils/index.js'

class Store {
  allSymbolsData: KucoinSymbolData[] | undefined
  allTickers: KucoinTicker[] | undefined
  appEnvironment: AppEnvironment
  accountsEnvironment: AccountConfig[] = []
  accounts: AccountData[] = []
  botConfigsStaticPerAccount: BotConfigStatic[][] = [] // outer array length === number of accounts; outer array contains: one array of bot-config objects per account
  botsPerAccount: BotData[][] = []
  isHistoricalPrice: boolean = false
  botConfigFromGenerator: BotConfigStatic | undefined

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
    botConfigFromGenerator,
  }: StoreSetupParameters = {}): Promise<void> {
    this.isHistoricalPrice = isHistoricalPrice
    this.botConfigFromGenerator = botConfigFromGenerator
    this.appEnvironment = this.readAppEnvironment()
    this.accountsEnvironment = this.readAccountsEnvironment()
    this.allSymbolsData = await Exchange.getAllSymbolsData()
    this.allTickers = await Exchange.getAllTickers()

    if (!this.allSymbolsData) {
      throw new Error(Messages.EXCHANGE_SYMBOL_DATA_RESPONSE_FAILED)
    }

    for (const accountConfig of this.accountsEnvironment) {
      this.botConfigsStaticPerAccount.push(
        (await import(accountConfig.botConfigPath)).default
      )
    }

    if (isHistoricalPrice || createsStoreAndExits) {
      this.createAccountAndBotConfigs()
      return Promise.resolve()
    }

    return new Promise(async (resolve, reject) => {
      if (continueWithExistingDatabase) {
        const readResponse: AxiosResponse | string = await this.readDatabase()

        if (typeof readResponse === 'string') {
          throw new Error(readResponse)
        } else if (readResponse.status === 200) {
          console.log(Messages.CONTINUING_WITH_EXISTING_DATABASE)
          this.setUpFromExistingDatabase(readResponse.data.accounts)

          const writeResponse: AxiosResponse | string =
            await this.writeDatabase()

          if (typeof writeResponse === 'string') {
            throw new Error(writeResponse)
          } else if (writeResponse.status !== 200) {
            throw new Error(writeResponse.data)
          }
        } else if (readResponse.status === 404) {
          throw new Error(Messages.DATABASE_DOES_NOT_EXIST)
        }

        resolve()
      } else {
        /* do not continueWithExistingDatabase */
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
      }
    })
  }

  private async setUpAnew(): Promise<AxiosResponse | never> {
    this.createAccountAndBotConfigs()

    this.appEnvironment.firstAppStart = getDateTime(
      this.appEnvironment.locale,
      this.appEnvironment.timeZone
    )

    const writeResponse: AxiosResponse | string = await this.writeDatabase()

    if (typeof writeResponse === 'string') {
      throw new Error(writeResponse)
    } else if (writeResponse.status !== 200) {
      throw new Error(writeResponse.data)
    }

    return writeResponse
  }

  private setUpFromExistingDatabase(accounts: AccountDataStripped[]) {
    accounts.forEach((account: AccountDataStripped, accountIndex: number) => {
      if (account.bots) {
        this.botsPerAccount[accountIndex] = account.bots
      }
    })

    this.createAccountAndBotConfigs({ skipBotConfigSetup: true })
  }

  createAccountAndBotConfigs(
    options: { skipBotConfigSetup: boolean } | null = null
  ) {
    this.accounts = this.setUpAccountConfigs()

    if (!options?.skipBotConfigSetup) {
      this.botsPerAccount = this.setUpBotConfigs()
    }

    this.linkBotConfigsWithAccountConfigs()
  }

  readAppEnvironment(): AppEnvironment {
    const appId: string | undefined = process.env.APP_ID
    const locale: string | undefined = process.env.LOCALE
    const timeZone: string | undefined = process.env.TIMEZONE
    const hostName: string | undefined = process.env.HOST_NAME
    const databaseProtocol: string | undefined = process.env.DATABASE_PROTOCOL
    const databasePort: string | undefined = process.env.DATABASE_PORT
    let databasePath: string

    if (
      appId &&
      locale &&
      timeZone &&
      hostName &&
      databaseProtocol &&
      databasePort
    ) {
      databasePath = `${databaseProtocol}://${hostName}:${databasePort}/accounts/${appId}`
    } else {
      throw new Error(Messages.APP_ENVIRONMENT_CONFIG_DATA_INVALID)
    }

    const lastAppStart: string = getDateTime(locale, timeZone)

    return {
      appId,
      locale,
      timeZone,
      hostName,
      databasePort,
      databasePath,
      lastAppStart,
    }
  }

  readAccountsEnvironment(): AccountConfig[] {
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

      if (
        apiKey &&
        secretKey &&
        passphrase &&
        (environment === AccountEnvironmentType.sandbox ||
          environment === AccountEnvironmentType.live) &&
        botConfigPath &&
        botConfigIndexes
      ) {
        accounts.push({
          apiKey,
          secretKey,
          passphrase,
          environment,
          botConfigPath: path.resolve(botConfigPath),
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
      account.bots = this.botsPerAccount[accountIndex]
    })
  }

  setUpAccountConfigs(): AccountData[] {
    const arr: AccountData[] = []

    for (
      let accountIndex: number = 0;
      accountIndex < this.accountsEnvironment.length;
      accountIndex++
    ) {
      arr.push({
        config: this.accountsEnvironment[accountIndex],
        bots: [],
      })
    }

    return arr
  }

  setUpBotConfigs(): BotData[][] {
    const botsPerAccount: BotData[][] = []

    for (
      let accountIndex: number = 0;
      accountIndex < this.accountsEnvironment.length;
      accountIndex++
    ) {
      const botConfigs: BotData[] = []

      const selectedBotConfigs: BotConfigStatic[] = this.botConfigFromGenerator
        ? [this.botConfigFromGenerator]
        : this.accounts[accountIndex].config.botConfigIndexes.map(
            (botIndex: number) =>
              this.botConfigsStaticPerAccount[accountIndex][botIndex]
          )

      selectedBotConfigs.forEach(
        (configStatic: BotConfigStatic, botIndex: number) => {
          const symbolData: KucoinSymbolData | undefined =
            this.allSymbolsData!.find(
              (data: KucoinSymbolData) => data.symbol === configStatic.symbol
            )

          if (!symbolData) {
            throw new Error(Messages.SYMBOL_DATA_NOT_FOUND)
          }

          const ticker: KucoinTicker | undefined = this.allTickers!.find(
            (ticker: KucoinTicker) => ticker.symbol === configStatic.symbol
          )

          if (!ticker) {
            throw new Error(Messages.TICKER_NOT_FOUND)
          }

          const [baseCurrency, quoteCurrency]: Currency[] =
            Currency.fromSymbolData(symbolData)

          let hands: BotHand[] = this.buildHands(configStatic, quoteCurrency)

          const quoteStartAmountPerHand: string | undefined =
            quoteCurrency.normalize(
              this.calculateQuoteStartAmountPerHand(hands, configStatic)
            )

          if (
            typeof quoteStartAmountPerHand !== 'string' ||
            !isNumeric(quoteStartAmountPerHand)
          ) {
            throw new Error(
              `${Messages.QUOTE_START_AMOUNT_PER_HAND_INVALID}: ${quoteStartAmountPerHand}`
            )
          }

          const baseStartAmountPerHand: string | undefined =
            baseCurrency.normalize(
              this.calculateBaseStartAmountPerHand(hands, configStatic)
            )

          if (
            typeof baseStartAmountPerHand !== 'string' ||
            !isNumeric(baseStartAmountPerHand)
          ) {
            throw new Error(
              `${Messages.BASE_START_AMOUNT_PER_HAND_INVALID}: ${baseStartAmountPerHand}`
            )
          }

          const configDynamic: BotConfigDynamic = {
            id: botIndex,
            itsAccountId: accountIndex,
            minFunds: symbolData.minFunds,
            handCount: hands.length,
            quoteStartAmountPerHand,
            baseStartAmountPerHand,
            tradeFee: ticker.takerFeeRate,
            baseCurrency: baseCurrency.serialize(),
            quoteCurrency: quoteCurrency.serialize(),
          }

          hands = this.topUpHandsWithBase(hands, configStatic, configDynamic)
          hands = this.topUpHandsWithQuote(hands, configStatic, configDynamic)

          const botConfig: BotData = {
            configStatic: configStatic,
            configDynamic: configDynamic,
            hands,
          }

          this.throwErrorIfBotConfigInvalid({
            ...botConfig.configStatic,
            ...botConfig.configDynamic,
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
  ): string {
    const handsToTopUpWithQuoteCount: number = hands.filter((hand: BotHand) =>
      this.quoteHandQualifiesForTopUp(hand, configStatic)
    ).length

    return handsToTopUpWithQuoteCount > 0
      ? Big(configStatic.quoteStartAmount)
          .div(handsToTopUpWithQuoteCount)
          .toFixed()
      : '0'
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
      Big(hand.buyBelow).gte(botConfig.quoteFrom) &&
      Big(hand.buyBelow).lte(botConfig.quoteTo)
    )
  }

  calculateBaseStartAmountPerHand(
    hands: BotHand[],
    configStatic: BotConfigStatic
  ): string {
    const handsToTopUpWithBaseCount: number = hands.filter((hand: BotHand) =>
      this.baseHandQualifiesForTopUp(hand, configStatic)
    ).length

    return handsToTopUpWithBaseCount > 0
      ? Big(configStatic.baseStartAmount)
          .div(handsToTopUpWithBaseCount)
          .toFixed()
      : '0'
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
      Big(hand.buyBelow).gte(botConfig.baseFrom) &&
      Big(hand.buyBelow).lte(botConfig.baseTo)
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
    const minHandCount: number = 2

    return handCount >= minHandCount
  }

  isProfitGreaterThanTradeFee({
    handSpanPercent,
    tradeFee,
  }: BotConfigFull): boolean {
    if (!tradeFee || typeof tradeFee !== 'string' || !isNumeric(tradeFee)) {
      throw new Error(`${Messages.EXCHANGE_FEE_INVALID}: ${tradeFee}`)
    }

    const handSpanDecimal: Big = Big(handSpanPercent).div(100)
    const tradeCount: number = 2
    const buyAndSellFee: Big = Big(tradeFee).mul(tradeCount)

    return Big(buyAndSellFee).lt(handSpanDecimal)
  }

  buildHands(
    configStatic: BotConfigStatic,
    quoteCurrency: Currency
  ): BotHand[] {
    const { from, to, handSpanPercent }: BotConfigStatic = configStatic
    const hands: BotHand[] = []
    let buyBelow: string = from
    let id: number = 0
    const handSpanPercentDecimal: Big = Big(handSpanPercent).div(100)
    while (Big(buyBelow).lt(to)) {
      const increment: Big = Big(buyBelow).mul(handSpanPercentDecimal)
      const normalizedIncrement: string | undefined =
        quoteCurrency.normalize(increment)

      if (
        typeof normalizedIncrement !== 'string' ||
        !isNumeric(normalizedIncrement)
      ) {
        throw new Error(
          `${Messages.HAND_INCREMENT_INVALID}: ${normalizedIncrement}`
        )
      }

      const sellAbove: string = Big(buyBelow)
        .plus(normalizedIncrement)
        .toFixed()

      hands.push({
        id,
        buyBelow,
        sellAbove,
        quote: '0',
        base: '0',
        buyCount: 0,
        sellCount: 0,
        tradeIsPending: false,
      })

      buyBelow = sellAbove
      id++
    }

    return hands
  }

  async setResults(
    accountId: number | null,
    botId: number | null,
    results: BotResults | undefined
  ) {
    if (accountId === null || botId === null || !results) {
      return
    }

    this.accounts[accountId].bots[botId].results = results

    if (this.isHistoricalPrice) {
      return
    }

    this.accounts[accountId].bots[botId].lastModified = getDateTime(
      this.appEnvironment.locale,
      this.appEnvironment.timeZone
    )

    const writeResponse: AxiosResponse | string = await this.writeDatabase()

    if (typeof writeResponse === 'string') {
      console.error(writeResponse)
    } else if (writeResponse.status !== 200) {
      console.error(writeResponse.data)
    }
  }

  getResults(accountId: number, botId: number): BotResults | undefined {
    return this.accounts[accountId].bots[botId].results
  }

  getAccountConfig(accountId: number): AccountConfig {
    return this.accounts[accountId].config
  }

  async readDatabase(): Promise<AxiosResponse | string> {
    try {
      return await axios.get(this.appEnvironment.databasePath)
    } catch (error) {
      return this.getDatabaseErrorType(error)
    }
  }

  async writeDatabase(): Promise<AxiosResponse | string> {
    const data: AppData = {
      appId: this.appEnvironment.appId,
      firstAppStart: this.appEnvironment.firstAppStart,
      lastAppStart: this.appEnvironment.lastAppStart,
      locale: this.appEnvironment.locale,
      timeZone: this.appEnvironment.timeZone,
      accounts: this.accountsWithoutConfig,
    }

    try {
      return await axios.post(this.appEnvironment.databasePath, data, {
        headers: {
          'Content-Type': 'application/json',
          password: process.env.DATABASE_PASSWORD,
        },
      })
    } catch (error) {
      return this.getDatabaseErrorType(error)
    }
  }

  async deleteDatabase(): Promise<AxiosResponse | void> {
    return new Promise((resolve, reject) => {
      const readline: Interface = readlineImported.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      readline.question(
        Messages.DELETE_EXISTING_DATABASE,
        async (answer: string) => {
          readline.close()

          if (answer === 'y' || answer === 'yes') {
            try {
              this.appEnvironment = this.readAppEnvironment()
              const response: AxiosResponse = await axios.delete(
                this.appEnvironment.databasePath,
                {
                  headers: {
                    password: process.env.DATABASE_PASSWORD,
                  },
                }
              )

              resolve(response)
            } catch (error) {
              reject(this.getDatabaseErrorType(error))
            }
          } else {
            console.log(Messages.DATABASE_DELETION_CANCELLED)
            resolve()
          }
        }
      )
    })
  }

  getDatabaseErrorType(error: any): AxiosResponse | string {
    if (error.response) {
      return error.response
    } else if (error.request) {
      return `${Messages.DATABASE_SERVER_HAS_NOT_RESPONDED}\n${error.request}`
    } else {
      return `${Messages.DATABASE_REQUEST_GENERIC_PROBLEM}\n${error}`
    }
  }
}

const store: Store = new Store()
export default store
