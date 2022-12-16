import Messages from '../source/types/messages'
import {
  countDecimals,
  isNumeric,
  trimDecimalsToFixed,
  assertNumericString,
  valuesAreWithinTolerance,
  zeroIndexPositiveInteger,
} from '../source/utils'

const errorMessage = 'some error message'

const validNumbersToTrim: [value: string | number, decimals: number, expected: string | number][] = [
  ['1.123456789', 6, '1.123456'],
  ['1.123456', 9, '1.123456'],
  ['1', 6, '1'],
  ['67', 3, '67'],
  ['3224.123456789', 5, '3224.12345'],
  [123.123456789, 7, 123.1234567],
  [1.12345, 8, 1.12345],
  [1, 98, 1],
  [45, 2, 45],
]
const invalidNumbersToTrim: [value: string, decimals: number][] = [
  ['hello', 3],
  ['5e', 75],
  ['Tu', 0],
]

const potentialNumerics: [value: string | number, expected: boolean][] = [
  [0, true],
  [-0, true],
  [22, true],
  [-22, true],
  [45.35354, true],
  ['98', true],
  ['4872.239732332', true],
  ['-4872.239732332', true],
  ['1e', false],
  ['1p', false],
  ['what', false],
]

const stringNumerics: [value: string, errorMessage: string][] = [
  ['-0', errorMessage],
  ['0', errorMessage],
  ['98', errorMessage],
  ['4872.239732332', errorMessage],
  ['-4872.239732332', errorMessage],
  ['-92472382374872.239732', errorMessage],
]

const invalidStringNumerics: [value: string | number | undefined, errorMessage: string][] = [
  [undefined, errorMessage],
  [0, errorMessage],
  [-0, errorMessage],
  [22, errorMessage],
  [-22, errorMessage],
  [45.35354, errorMessage],
  ['1e', errorMessage],
  ['1p', errorMessage],
  ['what', errorMessage],
]

const numbersWithDecimalsToCount: [value: string, expected: number][] = [
  ['765.1234567', 7],
  ['29283765.98', 2],
  ['29283765.123456789012345678', 18],
  ['38479', 0],
  ['1', 0],
  ['0', 0],
]

const positiveIntegersToZeroIndex: [value: number, expected: number][] = [
  [2, 1],
  [1, 0],
  [292898, 292897],
]
const invalidPositiveIntegersToZeroIndex: [value: number | string][] = [
  [0],
  [-21],
  [-21],
  [92857.5],
  ['292898'],
]

const valuesToBeWithinTolerancePercent: [minValue: string | number, maxValue: string | number, tolerancePercent: number, expected: boolean][] = [
  [1, 2.1, 100, false],
  [1, 2.1, 110, true],
  [7037.9242, 7829.4753123, 11.25, true],
  [7037.9242, 7829.4753123, 11.2, false],
  ['1', '2.1', 100, false],
  ['1', '2.1', 110, true],
  ['2.1', '1', 110, true],
]

describe('utils', () => {
  test.each(validNumbersToTrim)(
    `%p trimmed to %i decimals is %p`,
    (value: string | number, decimalsToRetain: number, expected: string | number) => {
      expect(trimDecimalsToFixed(value, decimalsToRetain)).toBe(expected)
    }
  )

  test.each(invalidNumbersToTrim)(
    `invalid number %p attempted trimming to %i decimals throws: ${Messages.IS_NOT_A_NUMBER}`,
    (value: string, decimalsToRetain: number) => {
      expect(() => {
        expect(trimDecimalsToFixed(value, decimalsToRetain))
      }).toThrow(Messages.IS_NOT_A_NUMBER)
    }
  )

  test.each(potentialNumerics)(
    `%p is numeric: %s`,
    (value: string | number, expected: boolean) => {
      expect(isNumeric(value)).toBe(expected)
    }
  )

  test.each(stringNumerics)(
    `string numeric %p does not throw: '%s'`,
    (value: string, errorMessage: string) => {
      expect(() => {
        assertNumericString(value, errorMessage)
      }).not.toThrow(errorMessage)
    }
  )

  test.each(invalidStringNumerics)(
    `invalid string numeric %p throws: '%s'`,
    (value: string | number | undefined, errorMessage: string) => {
      expect(() => {
        assertNumericString(value, errorMessage)
      }).toThrow(errorMessage)
    }
  )

  test.each(numbersWithDecimalsToCount)(
    `%p has %d decimals`,
    (value: string, decimalsExpected: number) => {
      expect(countDecimals(value)).toBe(decimalsExpected)
    }
  )

  test.each(positiveIntegersToZeroIndex)(
    `positive integer %i zero indexed is %i`,
    (input: number, expected: number) => {
      expect(zeroIndexPositiveInteger(input)).toBe(expected)
    }
  )

  test.each(invalidPositiveIntegersToZeroIndex)(
    `invalid positive integer %p zero indexed throws: ${Messages.IS_NOT_POSITIVE_INTEGER}`,
    (input: number | string) => {
      expect(() => {
        zeroIndexPositiveInteger(input as number)
      }).toThrow(Messages.IS_NOT_POSITIVE_INTEGER)
    }
  )

  test.each(valuesToBeWithinTolerancePercent)(
    `percentage increase between %p and %p (order unimportant) is within %d%: %s`,
    (
      minValue: number | string,
      maxValue: number | string,
      tolerancePercent: number,
      expected: boolean
    ) => {
      expect(
        valuesAreWithinTolerance([minValue, maxValue], tolerancePercent)
      ).toBe(expected)
    }
  )
})
