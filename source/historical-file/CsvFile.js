import fs from "fs";

export default class CsvFile {
  static getAsString(fileName) {
    const inputPath = new URL(fileName, import.meta.url);
    const file = fs.readFileSync(inputPath);
    return file.toString();
  }

  static getRowsHoldingStrings(fileName) {
    return CsvFile.getAsString(fileName).split(/\r?\n/);
  }

  static getRowsPopulatedWithNumbers(fileName) {
    return CsvFile.getRowsHoldingStrings(fileName).map((rowAsString) =>
      rowAsString.split(",").map((value) => parseFloat(value))
    );
  }
}
