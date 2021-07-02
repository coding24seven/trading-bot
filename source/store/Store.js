import botConfigs from "../bot/botConfig.js";
import axios from "axios";
import readlineImported from "readline";

class Store {
  appEnvironment = {};
  apiEnvironment = [];
  botEnvironment = [];
  accounts = [];
  bots = []; // per account: bot-data objects [][]
  isHistoricalPrice = false;
  botConfigFromGenerator = null;

  constructor() {
    this.appEnvironment = this.readAppEnvironment();
    this.apiEnvironment = this.readApiEnvironment();
    this.botEnvironment = this.readBotEnvironment();
  }

  setUp({
    continueWithExistingDatabase = true,
    isHistoricalPrice = false,
    createsStoreAndExits = false,
    botConfigFromGenerator = null,
  }) {
    this.isHistoricalPrice = isHistoricalPrice;
    this.botConfigFromGenerator = botConfigFromGenerator;

    if (isHistoricalPrice || createsStoreAndExits) {
      this.createAccountsWithBots();
      return Promise.resolve();
    }

    return new Promise(async (resolve, reject) => {
      if (!continueWithExistingDatabase) {
        const readline = readlineImported.createInterface({
          input: process.stdin,
          output: process.stdout,
        });
        readline.question(`Overwrite existing database? (y/n)`, (answer) => {
          readline.close();

          if (answer === "y" || answer === "yes") {
            this.createAccountsWithBots();
            this.writeDatabase()
              .then(() => {
                resolve();
                console.log("database overridden with newly created store");
              })
              .catch(reject);
          } else {
            reject("database not overwritten. start again.");
          }
        });
      } else {
        const databaseContent = await this.readDatabase();

        if (databaseContent) {
          console.log("db present");
          // console.log(JSON.stringify(databaseContent, null, 2));
          this.accounts = databaseContent;
        } else {
          this.createAccountsWithBots();
          await this.writeDatabase();
          console.log("db NOT present but then created");
        }
        resolve();
      }
    });
  }

  createAccountsWithBots() {
    this.accounts = this.setUpAccounts();
    this.bots = this.setUpBots();
    this.linkBotsWithAccounts();
  }

  get accountsAsString() {
    return JSON.stringify(this.accounts, null, 2);
  }

  readAppEnvironment() {
    const appId = process.env.APP_ID;
    const databaseUrl = process.env.DATABASE_URL;
    const databasePort = process.env.DATABASE_PORT;
    const requestUrl = `${databaseUrl}:${databasePort}/accounts/${appId}`;

    return {
      appId,
      databaseUrl,
      databasePort,
      requestUrl,
    };
  }

  readApiEnvironment() {
    const { env } = process;
    const arr = [];
    let i = 0;

    while (env[`API_${i}_EXISTS`]) {
      arr.push({
        apiKey: env[`API_${i}_KEY`],
        secretKey: env[`API_${i}_SECRET_KEY`],
        exchangeFee: parseFloat(env[`API_${i}_EXCHANGE_FEE`]),
      });

      i++;
    }

    return arr;
  }

  readBotEnvironment() {
    const { env } = process;
    const arr = [];
    let i = 0;

    while (env[`API_${i}_EXISTS`]) {
      arr.push({
        botConfigIndexes: env[`API_${i}_BOT_CONFIG_INDEXES`]
          .split(",")
          .map((item) => parseInt(item)), // e.g. '1,3' -> [ 1, 3 ]
      });

      i++;
    }

    return arr;
  }

  linkBotsWithAccounts() {
    this.accounts.forEach((account, i) => {
      account.bots = this.bots[i];
    });
  }

  setUpAccounts() {
    const arr = [];

    for (
      let accountIndex = 0;
      accountIndex < this.apiEnvironment.length;
      accountIndex++
    ) {
      arr.push({
        config: this.apiEnvironment[accountIndex],
      });
    }

    return arr;
  }

  setUpBots() {
    const arr = [];

    for (
      let accountIndex = 0;
      accountIndex < this.apiEnvironment.length;
      accountIndex++
    ) {
      const arrayOfBotsPerAccount = [];
      const selectedBotConfigs = this.botConfigFromGenerator
        ? [this.botConfigFromGenerator]
        : this.botEnvironment[accountIndex].botConfigIndexes.map(
            (index) => botConfigs[index]
          ); // e.g. [ 1, 3 ] -> [{key:val}, {key:val}]

      selectedBotConfigs.forEach((config, botIndex) => {
        const {
          from,
          to,
          handSpan,
          shrinkByPercent,
          quoteStartAmount,
        } = config;
        const handSpanAfterShrinkage =
          handSpan - handSpan * (shrinkByPercent / 100);
        const computedConfig = {
          ...config,
          handSpanAfterShrinkage,
          id: botIndex,
          itsAccountId: accountIndex,
        };

        const hands = this.buildHands(computedConfig);
        computedConfig.handCount = hands.length;
        this.topUpHandsWithQuote(hands, computedConfig);
        this.topUpHandsWithBase(hands, computedConfig);

        const botData = {
          config: computedConfig,
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

  topUpHandsWithQuote(hands, botConfig) {
    const handsToTopUpWithQuoteCount = hands.filter((hand) =>
      handQualifiesForTopUp(hand)
    ).length;

    botConfig.quoteStartAmountPerHand =
      botConfig.quoteStartAmount / handsToTopUpWithQuoteCount;

    hands.forEach((hand) => {
      if (handQualifiesForTopUp(hand)) {
        hand.quote = botConfig.quoteStartAmountPerHand;
      }
    });

    function handQualifiesForTopUp(hand) {
      return (
        hand.buyBelow >= botConfig.quoteFrom &&
        hand.sellAbove <= botConfig.quoteTo
      );
    }
  }

  topUpHandsWithBase(hands, botConfig) {
    const handsToTopUpWithBaseCount = hands.filter((hand) =>
      handQualifiesForTopUp(hand)
    ).length;

    botConfig.baseStartAmountPerHand =
      botConfig.baseStartAmount / handsToTopUpWithBaseCount;

    hands.forEach((hand) => {
      if (handQualifiesForTopUp(hand)) {
        hand.base = botConfig.baseStartAmountPerHand;
      }
    });

    function handQualifiesForTopUp(hand) {
      return (
        hand.buyBelow >= botConfig.baseFrom &&
        hand.sellAbove <= botConfig.baseTo
      );
    }
  }

  throwErrorIfBotConfigInvalid(config) {
    if (!this.isHandCountValid(config)) {
      throw new Error("handCount must be >= 2");
    }

    if (!this.isProfitGreaterThanExchangeFee(config)) {
      throw new Error(
        `hand ${config.handSpanAfterShrinkage} is too narrow to offset exchange fee. increase handSpan or decrease shrinkByPercent.`
      );
    }
  }

  isHandCountValid({ handCount }) {
    return handCount >= 2;
  }

  isProfitGreaterThanExchangeFee({ itsAccountId, handSpan }) {
    const buyAndSellExchangeFee = 2 * this.getExchangeFee(itsAccountId);

    return buyAndSellExchangeFee < handSpan;
  }

  buildHands(config) {
    const buyAndSellExchangeFee = 2 * this.getExchangeFee(config.itsAccountId);
    const {
      from,
      to,
      handSpan,
      handSpanAfterShrinkage,
      shrinkByPercent,
    } = config;
    const hands = [];
    const halfShrinkSize = handSpan * (shrinkByPercent / 200);
    let newFrom = from;
    let id = 0;
    let sellAboveInNextIteration = 0;

    while (newFrom < to && sellAboveInNextIteration < to) {
      const buyBelow = newFrom + halfShrinkSize;
      const sellAbove = buyBelow + buyBelow * handSpan - halfShrinkSize;
      const profitInPercentPerBuySell =
        100 * (handSpanAfterShrinkage / buyBelow - buyAndSellExchangeFee);

      hands.push({
        id,
        buyBelow,
        stopBuy: buyBelow,
        sellAbove,
        stopSell: sellAbove,
        // bought: false,
        quote: null,
        base: null,
        profitInPercentPerBuySell,
        buyCount: 0,
        sellCount: 0,
        readyToBuy: false,
      });

      newFrom += buyBelow * handSpan;
      sellAboveInNextIteration =
        newFrom + halfShrinkSize + buyBelow * handSpan - halfShrinkSize;
      id++;
    }

    return hands;
  }

  getExchangeFee(accountId) {
    return this.accounts[accountId].config.exchangeFee;
  }

  setResults(accountId, botId, results) {
    this.accounts[accountId].bots[botId].vars.results = results;

    if (!this.isHistoricalPrice) {
      this.writeDatabase();
    }
  }

  getResults(accountId, botId) {
    return this.accounts[accountId].bots[botId].vars.results;
  }

  getAccountConfig(accountId) {
    return this.accounts[accountId].config;
  }

  async readDatabase() {
    try {
      return (await axios.get(this.appEnvironment.requestUrl)).data;
    } catch (e) {
      // console.log(e.response.data); // error object from the database server
      return null;
    }
  }

  async writeDatabase() {
    try {
      return await axios.post(
        this.appEnvironment.requestUrl,
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
   * removes api credentials before saving to database
   */
  get accountsWithoutConfig() {
    const strippedAccounts = JSON.parse(JSON.stringify(this.accounts));
    strippedAccounts.forEach((account) => {
      account.config = {};
    });

    return strippedAccounts;
  }
}

const store = new Store();
export default store;
