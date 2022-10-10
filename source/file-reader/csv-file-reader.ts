import fs from 'fs'
import path from 'path'

export default class CsvFileReader {
  static filePathIsValid(filePath: string): boolean {
    const validFilePath = /^.+\.csv$/
    return validFilePath.test(filePath)
  }

  static columnNumberIsValid(columnNumber: number): boolean {
    return Number.isInteger(columnNumber) && columnNumber > 0
  }

  static getFilePathsFromDirectory(directoryPath: string): string[] {
    const allFileAndDirectoryNames = fs.readdirSync(directoryPath)
    const csvFileNames = allFileAndDirectoryNames.filter((name: string) =>
      CsvFileReader.filePathIsValid(name)
    )
    const csvFilePaths = csvFileNames.map((fileName: string) =>
      path.join(directoryPath, fileName)
    )
    return csvFilePaths
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
