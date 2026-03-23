const xlsx = require('xlsx');
const workbook = xlsx.readFile('codedata.xlsx');
console.log('Sheet names:', workbook.SheetNames);
for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 }).slice(0, 10);
  console.log(`\n--- Sheet: ${(sheetName)} ---`);
  console.log(JSON.stringify(data, null, 2));
}
