import Big from 'big.js'
import Messages from '../types/messages.js'

export function getTime() {
  let date: Date = new Date()

  let hours: string =
    date.getHours() < 10 ? '0' + date.getHours() : date.getHours().toString()
  let minutes: string =
    date.getMinutes() < 10
      ? '0' + date.getMinutes()
      : date.getMinutes().toString()
  let seconds: string =
    date.getSeconds() < 10
      ? '0' + date.getSeconds()
      : date.getSeconds().toString()

  return hours + ':' + minutes + ':' + seconds
}

export function isNumeric<T>(value: T): boolean {
  return (
    (typeof value === 'number' ||
      (typeof value === 'string' && value.trim() !== '')) &&
    !isNaN(value as number)
  )
}

export function countDecimals(numberAsString: string): number {
  return numberAsString.split('.')[1]?.length || 0
}

export function trimDecimalsToFixed<T extends string | number>(
  value: T,
  decimalsToRetain: number
): string | number | void {
  if (!isNumeric(value)) {
    throw new Error(Messages.IS_NOT_A_NUMBER)
  } else if (Number.isInteger(+value)) {
    return value
  } else if (typeof value === 'string') {
    const decimalPoint = '.'
    const [whole, decimal]: string[] = value.split(decimalPoint)
    const decimalPartTrimmed: string = decimal.slice(0, decimalsToRetain)
    const trimmedValue: string = [whole, decimalPartTrimmed].join(decimalPoint)

    return trimmedValue
  } else if (typeof value === 'number') {
    const targetStringLength: number = 1 + decimalsToRetain
    const factorAsString: string = '1'.padEnd(targetStringLength, '0')
    const factor: number = parseInt(factorAsString)
    const trimmedValue: Big = Big(
      Math.floor(Big(value).mul(factor).toNumber())
    ).div(factor)

    return trimmedValue.toNumber()
  }
}

export function zeroIndexInteger(value: number): number {
  return value - 1
}

export function valuesAreWithinTolerance(
  values: (string | number)[],
  tolerancePercent: number
): boolean {
  values = values.map((value: string | number) => +value)

  const minValue: number = Math.min(...(values as number[]))
  const maxValue: number = Math.max(...(values as number[]))
  const toleranceDecimal: Big = Big(tolerancePercent).div(100)
  const increase: Big = Big(minValue).mul(toleranceDecimal)
  const toleranceCeiling: Big = increase.plus(minValue)

  return toleranceCeiling.gte(maxValue)
}

/* unit test only: simulate buy and sell operations by adding difference between buy and sell prices to quote */
export function getQuoteAfterBuySellDifference(
  prices: number[][],
  tradeFee: number | Big,
  quote: number | Big
): string {
  tradeFee = Big(tradeFee)
  quote = Big(quote)
  prices = Array.from(prices)
  const [[buyPrice, sellPrice]] = prices
  const buySellDifference: Big = Big(sellPrice).minus(buyPrice)
  const increaseFactor: Big = buySellDifference.div(buyPrice)
  const quoteIncrease: Big = quote.mul(increaseFactor)
  const quoteBeforeFees: Big = quote.plus(quoteIncrease)
  const buyFee: Big = quote.mul(tradeFee)
  const sellFee: Big = quoteBeforeFees.mul(tradeFee)
  const buySellFees: Big = buyFee.plus(sellFee)
  const quoteAfterFees: Big = quoteBeforeFees.minus(buySellFees)
  prices.shift()

  return prices.length === 0
    ? quoteAfterFees.toFixed()
    : getQuoteAfterBuySellDifference(prices, tradeFee, quoteAfterFees)
}
