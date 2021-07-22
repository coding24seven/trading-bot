import botConfigs from "../bot/botConfig.js";
import axios, { AxiosResponse } from "axios";
import readlineImported, { Interface } from "readline";
import {
  AppEnvironment,
  AccountData,
  AccountConfig,
  BotConfigIndexesPerAccount,
  BotConfig,
  BotResults,
  BotData,
  BotHand,
  StoreSetupParameters,
  AccountDataStripped,
} from "../types";
import Messages from "../messages/index.js";

class Store {
  appEnvironment: AppEnvironment | null = null;
  apiEnvironment: AccountConfig[] = [];
  botConfigIndexesForAllAccounts: BotConfigIndexesPerAccount[] = [];
  accounts: AccountData[] = [];
  bots: BotData[][] = [];
  isHistoricalPrice: boolean = false;
  botConfigFromGenerator: BotConfig | null = null;

  constructor() {
    this.appEnvironment = this.readAppEnvironment();
    this.apiEnvironment = this.readApiEnvironment();
    this.botConfigIndexesForAllAccounts = this.readBotConfigIndexesForAllAccounts();
  }

  setUp({
    continueWithExistingDatabase = true,
    isHistoricalPrice = false,
    createsStoreAndExits = false,
    botConfigFromGenerator = null,
  }: StoreSetupParameters): Promise<void> {
    this.isHistoricalPrice = isHistoricalPrice;
    this.botConfigFromGenerator = botConfigFromGenerator;

    if (isHistoricalPrice || createsStoreAndExits) {
      this.createAccountsWithBots();
      return Promise.resolve();
    }

    return new Promise(async (resolve, reject) => {
      if (!continueWithExistingDatabase) {
        const readline: Interface = readlineImported.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question(Messages.OVERWRITE_EXISTING_DATABASE, (answer) => {
          readline.close();

          if (answer === "y" || answer === "yes") {
            this.createAccountsWithBots();
            this.writeDatabase()
              .then(() => {
                resolve();
                console.log(
                  Messages.DATABASE_OVERRIDDEN_WITH_NEWLY_CREATED_STORE
                );
              })
              .catch(reject);
          } else {
            reject(Messages.DATABASE_NOT_OVERRIDDEN_START_AGAIN);
          }
        });
      } else {
        const databaseContent: AccountData[] | null = await this.readDatabase();

        if (databaseContent) {
          console.log(Messages.DATABASE_EXISTS);
          // console.log(JSON.stringify(databaseContent, null, 2));

          databaseContent.forEach((account: AccountData, i: number) => {
            const bots: BotData[] | undefined = databaseContent[i].bots;

            if (bots) {
              this.bots[i] = bots;
            }
          });

          this.createAccountsWithBots({ skipBotSetup: true });
        } else {
          this.createAccountsWithBots();
          await this.writeDatabase();
          console.log(Messages.DATABASE_HAD_NOT_EXISTED_BUT_WAS_CREATED);
        }
        resolve();
      }
    });
  }

  createAccountsWithBots(options: { skipBotSetup: boolean } | null = null) {
    this.accounts = this.setUpAccounts();

    if (!options?.skipBotSetup) {
      this.bots = this.setUpBots();
    }

    this.linkBotsWithAccounts();
  }

  get accountsAsString(): string {
    return JSON.stringify(this.accounts, null, 2);
  }

  readAppEnvironment(): AppEnvironment {
    const appId: string | undefined = process.env.APP_ID;
    const databaseUrl: string | undefined = process.env.DATABASE_URL;
    const databasePort: string | undefined = process.env.DATABASE_PORT;
    let requestUrl: string;

    if (appId && databaseUrl && databasePort) {
      requestUrl = `${databaseUrl}:${databasePort}/accounts/${appId}`;
    } else {
      throw new Error(Messages.DATA_MISSING_IN_APP_ENVIRONMENT);
    }

    return {
      appId,
      databaseUrl,
      databasePort,
      requestUrl,
    };
  }

  readApiEnvironment(): AccountConfig[] {
    const { env }: NodeJS.Process = process;
    const arr: AccountConfig[] = [];
    let i: number = 0;

    while (env[`API_${i}_EXISTS`]) {
      const apiKey: string | undefined = env[`API_${i}_KEY`];
      const secretKey: string | undefined = env[`API_${i}_SECRET_KEY`];
      const exchangeFee: string | undefined = env[`API_${i}_EXCHANGE_FEE`];

      if (apiKey && secretKey && exchangeFee) {
        arr.push({
          apiKey,
          secretKey,
          exchangeFee: parseFloat(exchangeFee),
        });
      }

      i++;
    }

    return arr;
  }

  readBotConfigIndexesForAllAccounts(): BotConfigIndexesPerAccount[] {
    const { env }: NodeJS.Process = process;
    const arr: BotConfigIndexesPerAccount[] = [];
    let i: number = 0;

    while (env[`API_${i}_EXISTS`]) {
      const value: string | undefined = env[`API_${i}_BOT_CONFIG_INDEXES`];

      if (value) {
        arr.push({
          botConfigIndexesPerAccount: value
            .split(",")
            .map((item: string) => parseInt(item)), // e.g. '1,3' -> [ 1, 3 ]
        });
      } else {
        throw new Error(Messages.BOT_CONFIG_INDEXES_MISSING);
      }

      i++;
    }

    return arr;
  }

  linkBotsWithAccounts() {
    this.accounts.forEach((account: AccountData, i: number) => {
      account.bots = this.bots[i];
    });
  }

  setUpAccounts(): AccountData[] {
    const arr: AccountData[] = [];

    for (
      let accountIndex: number = 0;
      accountIndex < this.apiEnvironment.length;
      accountIndex++
    ) {
      arr.push({
        config: this.apiEnvironment[accountIndex],
      });
    }

    return arr;
  }

  setUpBots(): BotData[][] {
    const arr: BotData[][] = [];

    for (
      let accountIndex: number = 0;
      accountIndex < this.apiEnvironment.length;
      accountIndex++
    ) {
      const arrayOfBotsPerAccount: BotData[] = [];
      const selectedBotConfigs: BotConfig[] = this.botConfigFromGenerator
        ? [this.botConfigFromGenerator]
        : this.botConfigIndexesForAllAccounts[
            accountIndex
          ].botConfigIndexesPerAccount.map(
            (index: number) => botConfigs[index]
          ); // e.g. [ 1, 3 ] -> [{key:val}, {key:val}]

      selectedBotConfigs.forEach((config: BotConfig, botIndex: number) => {
        const extendedConfig: BotConfig = {
          ...config,
          id: botIndex,
          itsAccountId: accountIndex,
        };

        const hands: BotHand[] = this.buildHands(extendedConfig);
        extendedConfig.handCount = hands.length;
        this.topUpHandsWithQuote(hands, extendedConfig);
        this.topUpHandsWithBase(hands, extendedConfig);

        const botData: BotData = {
          config: extendedConfig,
          vars: {
            hands,
          },
        };

        this.throwErrorIfBotConfigInvalid(botData.config);
        arrayOfBotsPerAccount.push(botData);
      });

      arr.push(arrayOfBotsPerAccount);
    }

    return arr;
  }

  topUpHandsWithQuote(hands: BotHand[], botConfig: BotConfig) {
    const handsToTopUpWithQuoteCount: number = hands.filter((hand: BotHand) =>
      handQualifiesForTopUp(hand)
    ).length;

    botConfig.quoteStartAmountPerHand =
      botConfig.quoteStartAmount / handsToTopUpWithQuoteCount;

    hands.forEach((hand: BotHand) => {
      if (
        handQualifiesForTopUp(hand) &&
        botConfig.quoteStartAmountPerHand !== null
      ) {
        hand.quote = botConfig.quoteStartAmountPerHand;
      }
    });

    function handQualifiesForTopUp(hand) {
      return (
        hand.buyBelow >= botConfig.quoteFrom &&
        hand.buyBelow <= botConfig.quoteTo
      );
    }
  }

  topUpHandsWithBase(hands: BotHand[], botConfig: BotConfig) {
    const handsToTopUpWithBaseCount: number = hands.filter((hand: BotHand) =>
      handQualifiesForTopUp(hand)
    ).length;

    botConfig.baseStartAmountPerHand =
      botConfig.baseStartAmount / handsToTopUpWithBaseCount;

    hands.forEach((hand: BotHand) => {
      if (
        handQualifiesForTopUp(hand) &&
        botConfig.baseStartAmountPerHand !== null
      ) {
        hand.base = botConfig.baseStartAmountPerHand;
      }
    });

    function handQualifiesForTopUp(hand: BotHand): boolean {
      return (
        hand.buyBelow >= botConfig.baseFrom && hand.buyBelow <= botConfig.baseTo
      );
    }
  }

  throwErrorIfBotConfigInvalid(config: BotConfig) {
    if (!this.isHandCountValid(config)) {
      throw new Error(`${Messages.HAND_COUNT_INVALID}. it must be >= 2`);
    }

    if (!this.isProfitGreaterThanExchangeFee(config)) {
      throw new Error(
        `hand span ${config.handSpan} is ${Messages.HAND_SPAN_TOO_NARROW}`
      );
    }
  }

  isHandCountValid({ handCount }): boolean {
    return handCount >= 2;
  }

  isProfitGreaterThanExchangeFee({ itsAccountId, handSpan }): boolean {
    const exchangeFee: number | null = this.getExchangeFee(itsAccountId);

    if (exchangeFee === null) {
      throw new Error(Messages.EXCHANGE_FEE_MUST_NOT_BE_NULL);
    }

    const buyAndSellExchangeFee: number = 2 * exchangeFee;

    return buyAndSellExchangeFee < handSpan;
  }

  buildHands(config: BotConfig): BotHand[] {
    const { from, to, handSpan }: BotConfig = config;
    const hands: BotHand[] = [];
    let buyBelow: number = from;
    let id: number = 0;

    while (buyBelow < to) {
      const sellAbove: number = buyBelow + buyBelow * handSpan;

      hands.push({
        id,
        buyBelow,
        stopBuy: buyBelow,
        sellAbove,
        stopSell: sellAbove,
        quote: 0,
        base: 0,
        buyCount: 0,
        sellCount: 0,
        readyToBuy: false,
        readyToSell: false,
      });

      buyBelow = sellAbove;
      id++;
    }

    return hands;
  }

  getExchangeFee(accountId): number | null {
    return this.accounts[accountId].config?.exchangeFee || null;
  }

  setResults(
    accountId: number | null,
    botId: number | null,
    results: BotResults | undefined
  ) {
    if (accountId === null || botId === null || !results) {
      return;
    }

    this.accounts[accountId].bots![botId].vars.results = results;

    if (!this.isHistoricalPrice) {
      this.writeDatabase();
    }
  }

  getResults(accountId, botId): BotResults | undefined {
    return this.accounts[accountId].bots![botId].vars.results;
  }

  getAccountConfig(accountId): AccountConfig {
    return this.accounts[accountId].config!;
  }

  async readDatabase(): Promise<AccountData[] | null> {
    try {
      const data = (await axios.get(this.appEnvironment!.requestUrl)).data;
      console.log("data", data);
      return data;
    } catch (e) {
      // console.log(e.response.data); // error object from the database server
      return null;
    }
  }

  async writeDatabase(): Promise<AxiosResponse | any> {
    try {
      return await axios.post(
        this.appEnvironment!.requestUrl,
        this.accountsWithoutConfig,
        {
          headers: {
            "Content-Type": "application/json",
            password: process.env.DATABASE_PASSWORD,
          },
        }
      );
    } catch (e) {
      console.log(e.response.data); // error object from the database server
      // NOTIFY ABOUT WRITE TO DATABASE PROBLEM
    }
  }

  /*
   * removes api credentials (before saving to database)
   */
  get accountsWithoutConfig(): AccountDataStripped[] {
    const strippedAccounts: AccountData[] = JSON.parse(
      JSON.stringify(this.accounts)
    );

    strippedAccounts.forEach((account: AccountData) => {
      delete account.config;
    });

    return strippedAccounts;
  }
}

const store: Store = new Store();
export default store;
