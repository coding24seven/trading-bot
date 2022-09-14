import botConfigs from '../bot/botConfig.js'
import axios, { AxiosResponse } from 'axios'
import readlineImported, { Interface } from 'readline'
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
  StoreSetupParameters,
} from '../types'
import Messages from '../types/messages.js'

class Store {
  appEnvironment: AppEnvironment | null = null
  apiEnvironment: AccountConfig[] = []
  botConfigIndexesForAllAccounts: BotConfigIndexesPerAccount[] = []
  accounts: AccountData[] = []
  bots: BotData[][] = [] // outer array index reflects owning account index
  isHistoricalPrice: boolean = false
  botConfigFromGenerator: BotConfig | null = null

  constructor() {
    this.appEnvironment = this.readAppEnvironment()
    this.apiEnvironment = this.readApiEnvironment()
    this.botConfigIndexesForAllAccounts =
      this.readBotConfigIndexesForAllAccounts()
  }

  setUp({
    continueWithExistingDatabase = true,
    isHistoricalPrice = false,
    createsStoreAndExits = false,
    botConfigFromGenerator = null,
  }: StoreSetupParameters): Promise<void> {
    this.isHistoricalPrice = isHistoricalPrice
    this.botConfigFromGenerator = botConfigFromGenerator

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

  get accountsAsString(): string {
    return JSON.stringify(this.accounts, null, 2)
  }

  readAppEnvironment(): AppEnvironment {
    const appId: string | undefined = process.env.APP_ID
    const databaseUrl: string | undefined = process.env.DATABASE_URL
    const databasePort: string | undefined = process.env.DATABASE_PORT
    let requestUrl: string

    if (appId && databaseUrl && databasePort) {
      requestUrl = `${databaseUrl}:${databasePort}/accounts/${appId}`
    } else {
      throw new Error(Messages.DATA_MISSING_IN_APP_ENVIRONMENT)
    }

    return {
      appId,
      databaseUrl,
      databasePort,
      requestUrl,
    }
  }

  readApiEnvironment(): AccountConfig[] {
    const { env }: NodeJS.Process = process
    const arr: AccountConfig[] = []
    let i: number = 0

    while (env[`API_${i}_EXISTS`]) {
      const apiKey: string | undefined = env[`API_${i}_KEY`]
      const secretKey: string | undefined = env[`API_${i}_SECRET_KEY`]
      const exchangeFee: string | undefined = env[`API_${i}_EXCHANGE_FEE`]
      const passphrase: string | undefined = env[`API_${i}_PASSPHRASE`]
      const environment: string | undefined =
        env[`API_${i}_EXCHANGE_ENVIRONMENT`]

      if (apiKey && secretKey && exchangeFee && passphrase && environment) {
        arr.push({
          apiKey,
          secretKey,
          passphrase,
          environment,
          exchangeFee: parseFloat(exchangeFee),
        })
      }

      i++
    }

    return arr
  }

  readBotConfigIndexesForAllAccounts(): BotConfigIndexesPerAccount[] {
    const { env }: NodeJS.Process = process
    const arr: BotConfigIndexesPerAccount[] = []
    let i: number = 0

    while (env[`API_${i}_EXISTS`]) {
      const value: string | undefined = env[`API_${i}_BOT_CONFIG_INDEXES`]

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
      accountIndex < this.apiEnvironment.length;
      accountIndex++
    ) {
      arr.push({
        config: this.apiEnvironment[accountIndex],
      })
    }

    return arr
  }

  setUpBots(): BotData[][] {
    const arr: BotData[][] = []

    for (
      let accountIndex: number = 0;
      accountIndex < this.apiEnvironment.length;
      accountIndex++
    ) {
      const arrayOfBotsPerAccount: BotData[] = []
      const selectedBotConfigs: BotConfig[] = this.botConfigFromGenerator
        ? [this.botConfigFromGenerator]
        : this.botConfigIndexesForAllAccounts[
            accountIndex
          ].botConfigIndexesPerAccount.map((index: number) => botConfigs[index]) // e.g. [ 1, 3 ] -> [{key:val}, {key:val}]

      selectedBotConfigs.forEach((config: BotConfig, botIndex: number) => {
        const extendedConfig: BotConfig = {
          ...config,
          id: botIndex,
          itsAccountId: accountIndex,
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
      botConfig.quoteStartAmount / handsToTopUpWithQuoteCount

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
      botConfig.baseStartAmount / handsToTopUpWithBaseCount

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

    if (!this.isProfitGreaterThanExchangeFee(config)) {
      throw new Error(
        `hand span ${config.handSpanPercent} is ${Messages.HAND_SPAN_TOO_NARROW}`
      )
    }
  }

  isHandCountValid({ handCount }): boolean {
    return handCount >= 2
  }

  isProfitGreaterThanExchangeFee({ itsAccountId, handSpanPercent }): boolean {
    const exchangeFee: number | null = this.getExchangeFee(itsAccountId)

    if (exchangeFee === null) {
      throw new Error(Messages.EXCHANGE_FEE_MUST_NOT_BE_NULL)
    }

    const buyAndSellExchangeFee: number = 2 * exchangeFee

    return buyAndSellExchangeFee < handSpanPercent
  }

  buildHands(config: BotConfig): BotHand[] {
    const { from, to, handSpanPercent }: BotConfig = config
    const hands: BotHand[] = []
    let buyBelow: number = from
    let id: number = 0
    const increment: number = (to - from) * (handSpanPercent / 100)

    while (buyBelow < to) {
      const sellAbove: number = buyBelow + increment

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

  getExchangeFee(accountId): number | null {
    return this.accounts[accountId].config?.exchangeFee || null
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
}

const store: Store = new Store()
export default store
