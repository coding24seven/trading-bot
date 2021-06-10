import Binance from "node-binance-api";

export default class Configurator {
  static getNodeBinanceApiLibraryInstance({ apiKey, secretKey }) {
    return Binance().options({
      APIKEY: apiKey,
      APISECRET: secretKey,
    });
  }
}
