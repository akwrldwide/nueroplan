const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('Seeding new programs (optimized)...');
    
    const newProgramsDataPath = path.join(__dirname, 'new_programs.json');
    if (!fs.existsSync(newProgramsDataPath)) {
        console.error('Error: new_programs.json not found. Run generate_programs.js first.');
        process.exit(1);
    }
    
    const newCourses = JSON.parse(fs.readFileSync(newProgramsDataPath, 'utf8'));
    const newProgramNames = new Set(newCourses.map(c => c.program));

    // 1. Upsert the 8 programs first and build a map of program name -> id
    const programMap = {};
    for (const name of newProgramNames) {
        const program = await prisma.program.upsert({
            where: { name },
            update: {},
            create: { name }
        });
        programMap[name] = program.id;
        console.log(`Upserted Program: ${name} -> ${program.id}`);
    }

    // 2. Clean up existing courses and topics for these programs
    console.log('Cleaning up existing courses and topics for these programs...');
    const deletedCourses = await prisma.course.deleteMany({
        where: {
            program_id: { in: Object.values(programMap) }
        }
    });
    console.log(`Deleted ${deletedCourses.count} existing courses (cascade deleted their topics).`);

    // 3. Create all courses in bulk and return their IDs
    console.log(`Inserting ${newCourses.length} courses in bulk...`);
    const createdCourses = await prisma.course.createManyAndReturn({
        data: newCourses.map(c => ({
            program_id: programMap[c.program],
            code: c.course_code,
            title: c.course_title,
            units: c.units,
            difficulty: c.default_difficulty,
            level: c.level,
            semester: c.semester,
        }))
    });
    console.log(`Successfully inserted ${createdCourses.length} courses.`);

    // 4. Map course_code and program_id to the created course ID
    const courseMap = {};
    for (const cc of createdCourses) {
        courseMap[`${cc.program_id}_${cc.code}`] = cc.id;
    }

    // 5. Build bulk topics array and insert them all at once
    console.log('Preparing topics for bulk insertion...');
    const allTopicsData = [];
    for (const c of newCourses) {
        const progId = programMap[c.program];
        const courseId = courseMap[`${progId}_${c.course_code}`];
        if (!courseId) {
            console.error(`Error: Could not find course ID for ${c.course_code}`);
            continue;
        }
        for (const t of c.topics) {
            allTopicsData.push({
                course_id: courseId,
                topic_name: t,
                default_weight: 1.0
            });
        }
    }

    console.log(`Inserting ${allTopicsData.length} topics in bulk...`);
    const insertedTopics = await prisma.courseTopic.createMany({
        data: allTopicsData
    });
    console.log(`Successfully inserted ${insertedTopics.count} topics.`);

    // 6. Update parsed_courses.json
    const parsedCoursesPath = path.join(__dirname, 'parsed_courses.json');
    let existingParsedCourses = [];
    if (fs.existsSync(parsedCoursesPath)) {
        existingParsedCourses = JSON.parse(fs.readFileSync(parsedCoursesPath, 'utf8'));
    }
    
    // Filter out any courses belonging to the new programs from the parsed_courses.json to avoid duplicates
    existingParsedCourses = existingParsedCourses.filter(c => !newProgramNames.has(c.program));
    
    // Append the new courses
    const updatedParsedCourses = [...existingParsedCourses, ...newCourses];
    fs.writeFileSync(parsedCoursesPath, JSON.stringify(updatedParsedCourses, null, 2));
    console.log('Successfully updated parsed_courses.json');
    
    // 7. Run update_seed.js to regenerate seed.js
    console.log('Running update_seed.js to synchronize prisma/seed.js...');
    
    const seedJsPath = path.join(__dirname, 'prisma', 'seed.js');
    const seedJsContent = fs.readFileSync(seedJsPath, 'utf8');

    // CS courses
    const csCourses = [
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'CSC101', course_title: 'Introduction to Computer Science', units: 3, default_difficulty: 3 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'MTH101', course_title: 'Calculus I', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'PHY101', course_title: 'General Physics I', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'PHY107', course_title: 'Physics Practical I', units: 1, default_difficulty: 3 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'GST101', course_title: 'Use of English', units: 2, default_difficulty: 2 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'GST103', course_title: 'Communication in English', units: 2, default_difficulty: 2 },
        { program: 'Computer Science', level: 100, semester: 1, course_code: 'MTH103', course_title: 'Elementary Algebra', units: 2, default_difficulty: 3 },

        { program: 'Computer Science', level: 100, semester: 2, course_code: 'CSC102', course_title: 'Introduction to Programming', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'MTH102', course_title: 'Calculus II', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'PHY102', course_title: 'General Physics II', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'PHY108', course_title: 'Physics Practical II', units: 1, default_difficulty: 3 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'GST102', course_title: 'Nigerian Peoples & Culture', units: 2, default_difficulty: 2 },
        { program: 'Computer Science', level: 100, semester: 2, course_code: 'STA101', course_title: 'Introduction to Statistics', units: 3, default_difficulty: 3 },

        { program: 'Computer Science', level: 200, semester: 1, course_code: 'CSC201', course_title: 'Data Structures', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'CSC203', course_title: 'Discrete Mathematics', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'CSC205', course_title: 'Computer Architecture', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'MTH201', course_title: 'Linear Algebra', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 1, course_code: 'STA201', course_title: 'Probability Theory', units: 3, default_difficulty: 4 },

        { program: 'Computer Science', level: 200, semester: 2, course_code: 'CSC202', course_title: 'Algorithms', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'CSC204', course_title: 'Operating Systems', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'CSC206', course_title: 'Database Systems', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'CSC208', course_title: 'Software Engineering I', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 200, semester: 2, course_code: 'GST202', course_title: 'Philosophy & Logic', units: 2, default_difficulty: 3 },

        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC301', course_title: 'Artificial Intelligence', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC303', course_title: 'Computer Networks', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC305', course_title: 'Compiler Construction', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC307', course_title: 'Human Computer Interaction', units: 2, default_difficulty: 3 },
        { program: 'Computer Science', level: 300, semester: 1, course_code: 'CSC309', course_title: 'Research Methods', units: 2, default_difficulty: 3 },

        { program: 'Computer Science', level: 300, semester: 2, course_code: 'CSC302', course_title: 'Machine Learning', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 300, semester: 2, course_code: 'CSC304', course_title: 'Cyber Security', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 300, semester: 2, course_code: 'CSC306', course_title: 'Distributed Systems', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 300, semester: 2, course_code: 'CSC308', course_title: 'Software Engineering II', units: 3, default_difficulty: 4 },

        { program: 'Computer Science', level: 400, semester: 1, course_code: 'CSC401', course_title: 'Project I', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 400, semester: 2, course_code: 'CSC402', course_title: 'Project II', units: 3, default_difficulty: 5 },
        { program: 'Computer Science', level: 400, semester: 1, course_code: 'CSC403', course_title: 'Cloud Computing', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 400, semester: 1, course_code: 'CSC404', course_title: 'Data Mining', units: 3, default_difficulty: 4 },
        { program: 'Computer Science', level: 400, semester: 1, course_code: 'CSC405', course_title: 'Entrepreneurship', units: 2, default_difficulty: 2 },
    ];

    const allCourses = [...csCourses, ...updatedParsedCourses];
    const startIdx = seedJsContent.indexOf('const courses = [');
    const endIdx = seedJsContent.indexOf('];', startIdx);

    if (startIdx !== -1 && endIdx !== -1) {
        const newContent = seedJsContent.substring(0, startIdx) + 
            'const courses = ' + JSON.stringify(allCourses, null, 8) + ';\n' +
            seedJsContent.substring(endIdx + 2);
        
        fs.writeFileSync(seedJsPath, newContent);
        console.log('Successfully synchronized prisma/seed.js!');
    } else {
        console.log('Could not find courses array in seed.js to sync.');
    }
    
    console.log('All optimized seeding tasks completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
