import Big from 'big.js'
import { CurrencyFields, KucoinSymbolData } from '../types'
import {
  countDecimals,
  safeJsonParse,
  trimDecimalsToFixed,
} from '../utils/index.js'

export default class Currency {
  public symbol: string
  public minSize: string
  public maxSize: string
  public increment: string
  public decimals: number

  constructor({
    symbol,
    minSize,
    maxSize,
    increment,
    decimals,
  }: CurrencyFields) {
    this.symbol = symbol
    this.minSize = minSize
    this.maxSize = maxSize
    this.increment = increment
    this.decimals = decimals
  }

  public static fromSymbolData(symbolData: KucoinSymbolData) {
    const baseCurrency = Currency.baseCurrencyFromSymbolData(symbolData)
    const quoteCurrency = Currency.quoteCurrencyFromSymbolData(symbolData)

    return [baseCurrency, quoteCurrency]
  }

  private static baseCurrencyFromSymbolData(symbolData: KucoinSymbolData) {
    const {
      baseCurrency,
      baseMinSize,
      baseMaxSize,
      baseIncrement,
    }: KucoinSymbolData = symbolData
    return new Currency({
      symbol: baseCurrency,
      minSize: baseMinSize,
      maxSize: baseMaxSize,
      increment: baseIncrement,
      decimals: countDecimals(baseIncrement),
    })
  }

  private static quoteCurrencyFromSymbolData(symbolData: KucoinSymbolData) {
    const {
      quoteCurrency,
      quoteMinSize,
      quoteMaxSize,
      quoteIncrement,
    }: KucoinSymbolData = symbolData
    return new Currency({
      symbol: quoteCurrency,
      minSize: quoteMinSize,
      maxSize: quoteMaxSize,
      increment: quoteIncrement,
      decimals: countDecimals(quoteIncrement),
    })
  }

  public normalize(value: string | Big): string | undefined {
    if (
      (typeof value !== 'string' && !(value instanceof Big)) ||
      typeof value === 'number'
    ) {
      return
    }

    let valueAsString: string = value instanceof Big ? value.toFixed() : value

    const normalized: string | number | void = trimDecimalsToFixed(
      valueAsString,
      this.decimals
    )

    if (typeof normalized !== 'string') {
      return
    }

    return normalized
  }

  public serialize(): CurrencyFields {
    return safeJsonParse(JSON.stringify(this))
  }
}
