import fs from 'fs'
import path from 'path'
import Messages from '../types/messages.js'

export default class CsvFileReader {
  static filePathIsValid(filePath: string): boolean {
    const validFilePath = /^.+\.csv$/
    return validFilePath.test(filePath)
  }

  static validateColumnNumber(columnNumber: number) {
    if (!Number.isInteger(columnNumber) || columnNumber < 1) {
      throw new Error(`${Messages.COLUMN_NUMBER_INVALID}: ${columnNumber}`)
    }
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

  static getFilePathsFromFilePathsOrFromDirectoryPath(
    paths: string[]
  ): string[] | never {
    const filePaths: string[] = paths.every((path: string) =>
      CsvFileReader.filePathIsValid(path)
    )
      ? paths
      : CsvFileReader.getFilePathsFromDirectory(paths[0])

    if (filePaths.length < 1) {
      throw new Error(Messages.FILE_PATHS_MISSING)
    }

    return filePaths
  }

  static getAsString(filePath: string): string {
    const file: Buffer = fs.readFileSync(filePath)
    return file.toString()
  }

  static getRowsHoldingStrings(filePath: string): string[] {
    return CsvFileReader.getAsString(filePath).split(/\r?\n/)
  }

  static getRowsPopulatedWithNumbers(filePath: string): number[][] {
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
