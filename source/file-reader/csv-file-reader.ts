import fs from 'fs'

export default class CsvFileReader {
  static getAsString(filePath): string {
    const file: Buffer = fs.readFileSync(filePath)
    return file.toString()
  }

  static getRowsHoldingStrings(filePath): string[] {
    return CsvFileReader.getAsString(filePath).split(/\r?\n/)
  }

  static getRowsPopulatedWithNumbers(filePath): number[][] {
    return CsvFileReader.getRowsHoldingStrings(filePath)
      .map((rowAsString: string) =>
        rowAsString.split(',').map((value: string) => parseFloat(value))
      )
      .filter(
        (rowWithNumber: number[]) =>
          !isNaN(rowWithNumber[0]) && typeof rowWithNumber[0] === 'number'
      )
  }
}
