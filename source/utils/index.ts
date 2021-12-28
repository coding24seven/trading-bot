export function countDecimals(numberAsString: string): number {
  return numberAsString.split(".")[1]?.length || 0;
}

/*
 * example: if value is 0.123456789 and increment is 0.000001 (6 decimal places), return 0.123456
 */
export function getValueWithValidDecimalPlaces(
  value: number,
  increment: string
): number {
  const validDecimalPlaces: number = countDecimals(increment);
  const targetStringLength: number = 1 + validDecimalPlaces;
  const factorAsString: string = "1".padEnd(targetStringLength, "0");
  const factor: number = parseFloat(factorAsString);

  const valueWithValidDecimalPlaces: number =
    Math.floor(value * factor) / factor;

  return valueWithValidDecimalPlaces;
}
