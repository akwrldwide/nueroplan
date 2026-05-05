const fs = require('fs');
const pdf = require('pdf-parse');

const pdfPath = 'C:\\\\Users\\\\runsa\\\\OneDrive\\\\Documents\\\\my_fyp\\\\docs\\\\Studyplan_morning.pdf';

fs.readFile(pdfPath, (err, data) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    pdf(data).then(function(data) {
        console.log(data.text);
    }).catch(function(error){
        console.error(error);
    });
});
