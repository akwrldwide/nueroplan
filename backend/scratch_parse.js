const fs = require('fs');

const text = fs.readFileSync('../../docs/courses.txt', 'utf8');
const lines = text.split('\n').map(l => l.trim()).filter(l => l);

let currentProgram = '';
let currentLevel = 0;
let currentSemester = 0;

const courses = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === 'SOFTWARE ENGINEERING') {
        currentProgram = 'Software Engineering';
        continue;
    }
    if (line === 'MECHANICAL ENGINEERING') {
        currentProgram = 'Mechanical Engineering';
        continue;
    }
    
    if (line.includes('LEVEL —')) {
        const match = line.match(/(\d00) LEVEL — (\d)(ST|ND|RD|TH) SEMESTER/);
        if (match) {
            currentLevel = parseInt(match[1], 10);
            currentSemester = parseInt(match[2], 10);
        }
        continue;
    }

    if (line === 'Course Code' || line === 'Course Title' || line === 'Units' || line === 'Difficulty' || line === '________________' || line.startsWith('Suggested High-Risk') || line.startsWith('*') || line.startsWith('Difficulty Scale:')) {
        continue;
    }

    // Since format is:
    // Course Code
    // Course Title
    // Units
    // Difficulty
    // The data comes in groups of 4 if there are no blank lines
    // Wait, the file actually looks like:
    // GST111
    // Communication in English I
    // 2
    // 2

    // Check if the current line looks like a course code
    if (/^[A-Z]{3}\d{3}$/.test(line)) {
        const course_code = line;
        const course_title = lines[i+1];
        const units = parseInt(lines[i+2], 10);
        const default_difficulty = parseInt(lines[i+3], 10);
        
        if (currentProgram && currentLevel && currentSemester) {
            courses.push({
                program: currentProgram,
                level: currentLevel,
                semester: currentSemester,
                course_code,
                course_title,
                units,
                default_difficulty
            });
        }
        i += 3; // skip the next 3 lines since we consumed them
    }
}

fs.writeFileSync('parsed_courses.json', JSON.stringify(courses, null, 2));
console.log('Done, generated ' + courses.length + ' courses');
