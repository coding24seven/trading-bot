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
