const fs = require('fs');

const seedJsPath = 'prisma/seed.js';
const seedJsContent = fs.readFileSync(seedJsPath, 'utf8');

const parsedCourses = JSON.parse(fs.readFileSync('parsed_courses.json', 'utf8'));

// We want to keep the Computer Science courses from the existing seed.js
// We can extract them using regex or just manually reconstruct the array.
// But it's easier to just pull out the existing CS courses manually and combine.
const csCourses = [
        // 100 LEVEL - 1st Semester
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'CSC101', course_title: 'Introduction to Computer Science', units: 3, default_difficulty: 3 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'MTH101', course_title: 'Calculus I', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'PHY101', course_title: 'General Physics I', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'PHY107', course_title: 'Physics Practical I', units: 1, default_difficulty: 3 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'GST101', course_title: 'Use of English', units: 2, default_difficulty: 2 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'GST103', course_title: 'Communication in English', units: 2, default_difficulty: 2 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'MTH103', course_title: 'Elementary Algebra', units: 2, default_difficulty: 3 },

        // 100 LEVEL - 2nd Semester
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'CSC102', course_title: 'Introduction to Programming', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'MTH102', course_title: 'Calculus II', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'PHY102', course_title: 'General Physics II', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'PHY108', course_title: 'Physics Practical II', units: 1, default_difficulty: 3 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'GST102', course_title: 'Nigerian Peoples & Culture', units: 2, default_difficulty: 2 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'STA101', course_title: 'Introduction to Statistics', units: 3, default_difficulty: 3 },

        // 200 LEVEL - 1st Semester
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'CSC201', course_title: 'Data Structures', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'CSC203', course_title: 'Discrete Mathematics', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'CSC205', course_title: 'Computer Architecture', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'MTH201', course_title: 'Linear Algebra', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'STA201', course_title: 'Probability Theory', units: 3, default_difficulty: 4 },

        // 200 LEVEL - 2nd Semester
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'CSC202', course_title: 'Algorithms', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'CSC204', course_title: 'Operating Systems', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'CSC206', course_title: 'Database Systems', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'CSC208', course_title: 'Software Engineering I', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'GST202', course_title: 'Philosophy & Logic', units: 2, default_difficulty: 3 },

        // 300 LEVEL - 1st Semester
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC301', course_title: 'Artificial Intelligence', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC303', course_title: 'Computer Networks', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC305', course_title: 'Compiler Construction', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC307', course_title: 'Human Computer Interaction', units: 2, default_difficulty: 3 },
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC309', course_title: 'Research Methods', units: 2, default_difficulty: 3 },

        // 300 LEVEL - 2nd Semester
        { program: 'Computer Science', level: 300, semester: 2, course_code: 'CSC302', course_title: 'Machine Learning', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 300, semester: 2, course_code: 'CSC304', course_title: 'Cyber Security', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 300, semester: 2, course_code: 'CSC306', course_title: 'Distributed Systems', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 300, semester: 2, course_code: 'CSC308', course_title: 'Software Engineering II', units: 3, default_difficulty: 4 },

        // 400 LEVEL
        { program: 'Computer Science', level: 400, semester: 1, course_code: 'CSC401', course_title: 'Project I', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 400, semester: 2, course_code: 'CSC402', course_title: 'Project II', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 400, semester: 1, course_code: 'CSC403', course_title: 'Cloud Computing', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 400, semester: 1, course_code: 'CSC404', course_title: 'Data Mining', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 400, semester: 1, course_code: 'CSC405', course_title: 'Entrepreneurship', units: 2, default_difficulty: 2 },
];

const allCourses = [...csCourses, ...parsedCourses];

// find the `const courses = [` part and `];`
const startIdx = seedJsContent.indexOf('const courses = [');
const endIdx = seedJsContent.indexOf('];', startIdx);

if (startIdx !== -1 && endIdx !== -1) {
    const newContent = seedJsContent.substring(0, startIdx) + 
        'const courses = ' + JSON.stringify(allCourses, null, 8) + ';\n' +
        seedJsContent.substring(endIdx + 2);
    
    fs.writeFileSync(seedJsPath, newContent);
    console.log('Successfully updated seed.js');
} else {
    console.log('Could not find courses array in seed.js');
}
