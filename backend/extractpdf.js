const fs = require('fs');

async function extract() {
    try {
        const pdf = require('pdf-parse');
        let dataBuffer = fs.readFileSync('c:\\Users\\runsa\\OneDrive\\Documents\\my_fyp\\docs\\studyplan_generator_semester upadte.pdf');
        let data = await pdf(dataBuffer);
        fs.writeFileSync('c:\\Users\\runsa\\OneDrive\\Documents\\my_fyp\\docs\\studyplan_generator_output.txt', data.text);
        console.log('PDF Extracted');
    } catch (e) {
        console.log('Error:', e.message);
    }
}
extract();
