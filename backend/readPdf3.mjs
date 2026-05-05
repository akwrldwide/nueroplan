import fs from 'fs';
import PDFParse from 'pdf-parse/node';

async function read() {
    const dataBuffer = fs.readFileSync('C:\\\\Users\\\\runsa\\\\OneDrive\\\\Documents\\\\my_fyp\\\\docs\\\\Studyplan_morning.pdf');
    try {
        const data = await PDFParse(dataBuffer);
        console.log(data.text);
    } catch(e) {
        console.error(e);
    }
}
read();
