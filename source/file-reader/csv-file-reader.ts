import fs from 'fs'

export default class CsvFileReader {
  static fileNameIsValid(fileName: string): boolean {
    const validFileName = /^.+\.csv$/
    return validFileName.test(fileName)
  }

  static columnNumberIsValid(columnNumber: number): boolean {
    return Number.isInteger(columnNumber) && columnNumber > 0
  }

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
