import Big from 'big.js'

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
