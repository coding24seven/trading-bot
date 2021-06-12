import botConfigs from "../bot/botConfig.js";
import axios from "axios";

class Store {
  appEnvironment = {};
  apiEnvironment = [];
  botEnvironment = [];
  accounts = [];
  bots = []; // per account: bot-data objects [][]
  isHistoricalPrice = true; // data comes from historical-data files
  botConfigOverride = null;

  constructor() {
    this.appEnvironment = this.readAppEnvironment();
    this.apiEnvironment = this.readApiEnvironment();
    this.botEnvironment = this.readBotEnvironment();
  }

  setUp(isHistoricalPrice, botConfigOverride) {
    this.isHistoricalPrice = isHistoricalPrice;
    this.botConfigOverride = botConfigOverride;

    if (isHistoricalPrice) {
      this.createAccountsWithBots();
      return;
    }

    return new Promise(async (resolve) => {
      const databaseContent = await this.readDatabase();

      if (databaseContent) {
        console.log("db present");
        // console.log(JSON.stringify(databaseContent, null, 2));
        this.accounts = databaseContent;
      } else {
        this.createAccountsWithBots();
        await this.writeDatabase();
        console.log("db NOT present");
      }

      resolve();
    });
  }

  createAccountsWithBots() {
    this.accounts = this.setUpAccounts();
    this.bots = this.setUpBots();
    this.linkBotsWithAccounts();
  }

  get isHistoricalPrice() {
    return this.isHistoricalPrice;
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
      const arrayPerAccount = [];
      const selectedBotConfigs = this.botConfigOverride
        ? [this.botConfigOverride]
        : this.botEnvironment[accountIndex].botConfigIndexes.map(
            (index) => botConfigs[index]
          ); // e.g. [ 1, 3 ] -> [{key:val}, {key:val}]

      selectedBotConfigs.forEach((config, botIndex) => {
        const { from, to, bracketSpan, quoteStartAmount } = config;
        const bracketCount = Math.floor((to - from) / bracketSpan);
        const computedConfig = {
          ...config,
          bracketCount,
          quoteStartAmountPerBracket: quoteStartAmount / bracketCount,
          id: botIndex,
          itsAccountId: accountIndex,
        };

        arrayPerAccount.push({
          config: computedConfig,
          vars: {
            brackets: this.createBrackets(computedConfig),
          },
        });
      });

      arr.push(arrayPerAccount);
    }

    return arr;
  }

  createBrackets(config) {
    const { from, bracketSpan, orderPlacementZone } = config;
    const arr = [];
    let newFrom = from;

    for (let i = 0; i < config.bracketCount; i++) {
      arr.push({
        id: i,
        buyFrom: newFrom,
        buyTo: newFrom + orderPlacementZone,
        sellFrom: newFrom + bracketSpan - orderPlacementZone,
        sellTo: newFrom + bracketSpan - 1,
        bought: false,
        quote: config.quoteStartAmountPerBracket,
        base: 0,
        buyCount: 0,
        sellCount: 0,
      });

      newFrom += bracketSpan;
    }
    // console.log(arr)
    return arr;
  }

  getExchangeFee(accountId) {
    return this.accounts[accountId].config.exchangeFee;
  }

  setResults(accountId, botId, results) {
    this.accounts[accountId].bots[botId].vars.results = results;
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
      await axios.post(
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
