import botConfigs from "../bot/botConfig.js";
import axios from "axios";

class Store {
  apiEnvironment = [];
  botEnvironment = [];
  accounts = [];
  bots = []; // per account: bot-data objects [][]
  historicalPrice = true; // data comes from historical-data files
  botConfigOverride = null;

  constructor() {
    // this.setUp();
    this.apiEnvironment = this.readApiEnvironment();
    this.botEnvironment = this.readBotEnvironment();
  }

  setUp(historicalPrice, botConfigOverride) {
    this.historicalPrice = historicalPrice;
    this.botConfigOverride = botConfigOverride;
    this.accounts = this.setUpAccounts();
    this.bots = this.setUpBots();
    this.linkBotsWithAccounts();
    this.writeToDatabase();
  }

  get isHistoricalPrice() {
    return this.historicalPrice;
  }

  get accountsAsString() {
    return JSON.stringify(this.accounts, 0, 2);
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

  async writeToDatabase() {
    const databaseUrl = process.env.DATABASE_URL;
    const databasePort = process.env.DATABASE_PORT;
    const appId = process.env.APP_ID;
    const requestUrl = `${databaseUrl}:${databasePort}/accounts/${appId}`;

    try {
      const response = await axios.post(
        requestUrl,
        this.accountsWithoutConfig,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("myresponse:", response);
      // console.log('2', JSON.stringify(response.data));
    } catch (e) {
      console.log(e);
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
