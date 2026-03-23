const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('standards/photo/photo9.pdf');

pdf(dataBuffer).then(function(data) {
    console.log("PDF TEXT EXTRACTED (first 3000 chars):");
    console.log(data.text.substring(0, 3000));
}).catch(err => console.error(err));
