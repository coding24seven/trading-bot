import fs from "fs";

export default class CsvFileReader {
  static getAsString(filePath) {
    const file = fs.readFileSync(filePath);
    return file.toString();
  }

  static getRowsHoldingStrings(filePath) {
    return CsvFileReader.getAsString(filePath).split(/\r?\n/);
  }

  static getRowsPopulatedWithNumbers(filePath) {
    return CsvFileReader.getRowsHoldingStrings(filePath).map((rowAsString) =>
      rowAsString.split(",").map((value) => parseFloat(value))
    );
  }
}
