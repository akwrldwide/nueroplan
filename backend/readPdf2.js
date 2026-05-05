const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'C:\\Users\\runsa\\OneDrive\\Documents\\my_fyp\\docs\\studyplan_generator_new2_april8.pdf';

let dataBuffer = fs.readFileSync(pdfPath);

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(function(error){
    console.log(error);
});
