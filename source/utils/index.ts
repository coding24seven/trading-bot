import Big from 'big.js'

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

export function countDecimals<T>(numberAsString: string): number {
  return numberAsString.split('.')[1]?.length || 0
}

export function trimDecimalsToFixed(
  value: number,
  decimalsToRetain: number
): number {
  const targetStringLength: number = 1 + decimalsToRetain
  const factorAsString: string = '1'.padEnd(targetStringLength, '0')
  const factor: number = parseInt(factorAsString)

  const returnValue: number = Big(Math.floor(Big(value).mul(factor).toNumber()))
    .div(factor)
    .toNumber()

  return returnValue
}

export function zeroIndexInteger(value: number): number {
  return value - 1
}

export function valuesAreWithinTolerance(
  values: number[],
  tolerancePercent: number
): boolean {
  const minValue: number = Math.min(...values)
  const maxValue: number = Math.max(...values)
  const toleranceDecimal: number = tolerancePercent / 100
  const increase: Big = Big(minValue).mul(toleranceDecimal)
  const toleranceCeiling: Big = increase.plus(minValue)

  return toleranceCeiling.toNumber() >= maxValue
}

/* unit test only: simulate buy and sell operations by adding difference between buy and sell prices to quote */
export function getQuoteAfterBuySellDifference(
  prices: number[][],
  tradeFee: number | Big,
  quote: number | Big
): number {
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
    ? quoteAfterFees.toNumber()
    : getQuoteAfterBuySellDifference(prices, tradeFee, quoteAfterFees)
}

const quoteDecimals = 6

// todo: remove commented out code
// export function getQuoteAfterBuySellDifference(
//   prices: number[][],
//   tradeFee: number | Big,
//   quote: number | Big
// ): number {
//   tradeFee = Big(tradeFee)
//   quote = Big(quote)
//   prices = Array.from(prices)
//   const [[buyPrice, sellPrice]] = prices
//   const buySellDifference: Big = Big(sellPrice).minus(buyPrice)
//   console.log('buySellDifference', buySellDifference.toNumber())

//   const increaseFactor = trimDecimalsToFixed(
//     buySellDifference.div(buyPrice).toNumber(),
//     quoteDecimals
//   )
//   console.log('increaseFactor', increaseFactor)

//   const quoteIncrease = trimDecimalsToFixed(
//     quote.mul(increaseFactor).toNumber(),
//     quoteDecimals
//   )
//   console.log('quoteIncrease', quoteIncrease)

//   const quoteBeforeFees = trimDecimalsToFixed(
//     quote.plus(quoteIncrease).toNumber(),
//     quoteDecimals
//   )
//   console.log('quoteBeforeFees', quoteBeforeFees)

//   const buyFee = trimDecimalsToFixed(
//     quote.mul(tradeFee).toNumber(),
//     quoteDecimals
//   )
//   console.log('buyFee', buyFee)

//   const sellFee = trimDecimalsToFixed(
//     Big(quoteBeforeFees).mul(tradeFee).toNumber(),
//     quoteDecimals
//   )
//   console.log('sellFee', sellFee)

//   const buySellFees = Big(buyFee).plus(sellFee)
//   console.log('buySellFees', buySellFees.toNumber())

//   const quoteAfterFees = Big(quoteBeforeFees).minus(buySellFees)
//   console.log('quoteAfterFees', quoteAfterFees.toNumber())

//   console.log('-----------------------------')

//   prices.shift()

//   return prices.length === 0
//     ? quoteAfterFees.toNumber()
//     : getQuoteAfterBuySellDifference(prices, tradeFee, quoteAfterFees)
// }
