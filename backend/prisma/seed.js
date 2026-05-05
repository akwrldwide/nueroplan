const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs'); // Added bcrypt import

async function main() {
    console.log('Start seeding...');

    // User seed logic added here
    const user = await prisma.user.upsert({
        where: { email: 'demo@nueroplan.com' },
        update: {},
        create: {
            email: 'demo@nueroplan.com',
            name: 'Demo Student',
            password_hash: await bcrypt.hash('password123', 10),
            onboarding_stage: 'COMPLETE',
            academicProfile: {
                create: {
                    program: 'Computer Science',
                    level: 100,
                    curriculum_type: 'BMAS',
                    current_cgpa: 0,
                    academic_goal: 'Pass All'
                }
            }
        }
    });
    console.log(`Created/Updated user: ${user.email}`);

    const courses = [
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

    for (const c of courses) {
        const program = await prisma.program.upsert({
            where: { name: c.program },
            update: {},
            create: { name: c.program }
        });

        const courseData = {
           program_id: program.id,
           code: c.course_code,
           title: c.course_title,
           units: c.units,
           difficulty: c.default_difficulty,
           level: c.level,
           semester: c.semester,
        };

        const existing = await prisma.course.findFirst({
            where: { code: c.course_code }
        });

        let courseRecord;
        if (existing) {
            courseRecord = await prisma.course.update({
                where: { id: existing.id },
                data: courseData
            });
            console.log(`Updated course: ${c.course_code}`);
        } else {
            courseRecord = await prisma.course.create({
                data: courseData
            });
            console.log(`Created course: ${c.course_code}`);
        }

        // Clean out existing topics and recreate default ones
        await prisma.courseTopic.deleteMany({
            where: { course_id: courseRecord.id }
        });

        const defaultTopics = [
            `Module 1: Intro to ${c.course_code}`,
            `Module 2: Core ${c.course_code} Concepts`,
            `Module 3: Advanced ${c.course_code} Features`
        ];
        
        for (const t of defaultTopics) {
           await prisma.courseTopic.create({
               data: {
                  course_id: courseRecord.id,
                  topic_name: t,
                  default_weight: 1.0
               }
           });
        }
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
