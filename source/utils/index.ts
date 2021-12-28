export function countDecimals(value: number): number {
  if (Math.floor(value) === value) return 0;

  return String(value).split(".")[1]?.length || 0;
}

/*
 * example: if value is 0.123456789 and increment is 0.000001 (6 decimal places), return 0.123456
 */
export function getValueWithValidDecimalPlaces(
  value: number,
  increment: number
): number {
  const validDecimalPlaces: number = countDecimals(increment);
  const targetStringLength: number = 1 + validDecimalPlaces;
  const factorAsString: string = "1".padEnd(targetStringLength, "0");
  const factor: number = parseFloat(factorAsString);

  const valueWithValidDecimalPlaces: number =
    Math.floor(value * factor) / factor;

  return valueWithValidDecimalPlaces;
}
