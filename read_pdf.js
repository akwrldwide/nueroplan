const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('c:\\Users\\runsa\\Documents\\my_fyp\\docs\\system_revamp_v1.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
});
