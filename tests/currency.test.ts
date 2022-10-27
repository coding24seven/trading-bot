import Big from 'big.js'
import Currency from '../source/currency/currency'
import {
  CurrencyConstructorParameters,
  KucoinSymbolData,
} from '../source/types'
import { countDecimals } from '../source/utils'

const expectedCurrency: CurrencyConstructorParameters = {
  symbol: 'USDT',
  minSize: '0.1',
  maxSize: '99999999',
  increment: '0.000001',
  decimals: 6,
}
const currency: Currency = new Currency(expectedCurrency)

const symbolData: KucoinSymbolData = {
  symbol: 'BTC-USDT',
  name: 'BTC-USDT',
  baseCurrency: 'BTC',
  quoteCurrency: 'USDT',
  feeCurrency: 'USDT',
  market: 'USDS',
  baseMinSize: '0.00001',
  quoteMinSize: '0.01',
  baseMaxSize: '10000000000',
  quoteMaxSize: '99999999',
  baseIncrement: '0.00000001',
  quoteIncrement: '0.000001',
  priceIncrement: '0.1',
  priceLimitRate: '0.1',
  minFunds: '0.1',
  isMarginEnabled: true,
  enableTrading: true,
}
const [baseCurrency, quoteCurrency]: Currency[] =
  Currency.fromSymbolData(symbolData)

const validStringedQuoteToNormalize: (string | Big)[][] = [
  [Big(1.123456789), '1.123456'],
  ['1.123456789', '1.123456'],
  ['1.123456', '1.123456'],
  ['1', '1'],
  ['67', '67'],
  ['3224.123456789', '3224.123456'],
]
const invalidNonStringedQuoteToNormalize: (string | number)[][] = [
  [4],
  [123.123456789],
  [1.12345],
]

describe('currency', () => {
  test.each(Object.keys(expectedCurrency))(
    `constructor(): property '%s' is assigned`,
    (key: string) => {
      expect(currency[key]).toBe(expectedCurrency[key])
    }
  )

  test(`fromSymbolData(): base currency symbol: '${baseCurrency.symbol}'`, () => {
    expect(baseCurrency.symbol).toBe(symbolData.baseCurrency)
  })

  test(`fromSymbolData(): quote currency symbol: '${quoteCurrency.symbol}'`, () => {
    expect(quoteCurrency.symbol).toBe(symbolData.quoteCurrency)
  })

  test(`fromSymbolData(): base min size: '${baseCurrency.minSize}'`, () => {
    expect(baseCurrency.minSize).toBe(symbolData.baseMinSize)
  })

  test(`fromSymbolData(): quote min size: '${quoteCurrency.minSize}'`, () => {
    expect(quoteCurrency.minSize).toBe(symbolData.quoteMinSize)
  })

  test(`fromSymbolData(): base max size: '${baseCurrency.maxSize}'`, () => {
    expect(baseCurrency.maxSize).toBe(symbolData.baseMaxSize)
  })

  test(`fromSymbolData(): quote max size: '${quoteCurrency.maxSize}'`, () => {
    expect(quoteCurrency.maxSize).toBe(symbolData.quoteMaxSize)
  })

  test(`fromSymbolData(): base increment: '${baseCurrency.increment}'`, () => {
    expect(baseCurrency.increment).toBe(symbolData.baseIncrement)
  })

  test(`fromSymbolData(): quote increment: '${quoteCurrency.increment}'`, () => {
    expect(quoteCurrency.increment).toBe(symbolData.quoteIncrement)
  })

  test(`fromSymbolData(): base decimals: '${baseCurrency.decimals}'`, () => {
    expect(baseCurrency.decimals).toBe(countDecimals(symbolData.baseIncrement))
  })

  test(`fromSymbolData(): quote decimals: '${quoteCurrency.decimals}'`, () => {
    expect(quoteCurrency.decimals).toBe(
      countDecimals(symbolData.quoteIncrement)
    )
  })

  test.each(validStringedQuoteToNormalize)(
    `normalize(): stringed %p normalized is %p`,
    (value: string, expected: string | Big) => {
      expect(quoteCurrency.normalize(value)).toBe(expected)
    }
  )

  test.each(invalidNonStringedQuoteToNormalize)(
    `normalize(): non-stringed %p normalized is 'undefined'`,
    (value: string) => {
      expect(quoteCurrency.normalize(value)).toBe(undefined)
    }
  )
})
