import Big from "big.js";
import type { MatcherFunction } from 'expect';
import Messages from "../../source/types/messages";

export const toBeWithinTolerance: MatcherFunction<[
  tolerancePercent: number
]> = function (
  values /* [number, number] | [string, string] */,
  tolerancePercent
) {
    if (!Array.isArray(values)) {
      throw new Error(Messages.IS_NOT_ARRAY)
    }

    const expectedValuesQuantity = 2

    if (values.length !== expectedValuesQuantity) {
      throw new Error(Messages.QUANTITY_INVALID)
    }

    const numericValues = values.map((value: string | number) => +value) as [number, number]

    const minValue: number = Math.min(...numericValues)
    const maxValue: number = Math.max(...numericValues)
    const toleranceDecimal: Big = Big(tolerancePercent).div(100)
    const increase: Big = Big(minValue).mul(toleranceDecimal)
    const toleranceCeiling: Big = increase.plus(minValue)

    const pass = toleranceCeiling.gte(maxValue)

    return {
      message: () =>
        `expected ${this.utils.printReceived(maxValue)}${pass ? ' not' : ''} to be within ${this.utils.printExpected(tolerancePercent)}% range of ${minValue}`,
      pass,
    };
  }

