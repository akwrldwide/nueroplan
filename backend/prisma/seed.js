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
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 1,
                "course_code": "CSC101",
                "course_title": "Introduction to Computer Science",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 1,
                "course_code": "MTH101",
                "course_title": "Calculus I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 1,
                "course_code": "PHY101",
                "course_title": "General Physics I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 1,
                "course_code": "PHY107",
                "course_title": "Physics Practical I",
                "units": 1,
                "default_difficulty": 3
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 1,
                "course_code": "GST101",
                "course_title": "Use of English",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 1,
                "course_code": "GST103",
                "course_title": "Communication in English",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 1,
                "course_code": "MTH103",
                "course_title": "Elementary Algebra",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 2,
                "course_code": "CSC102",
                "course_title": "Introduction to Programming",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 2,
                "course_code": "MTH102",
                "course_title": "Calculus II",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 2,
                "course_code": "PHY102",
                "course_title": "General Physics II",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 2,
                "course_code": "PHY108",
                "course_title": "Physics Practical II",
                "units": 1,
                "default_difficulty": 3
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 2,
                "course_code": "GST102",
                "course_title": "Nigerian Peoples & Culture",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Computer Science",
                "level": 100,
                "semester": 2,
                "course_code": "STA101",
                "course_title": "Introduction to Statistics",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 1,
                "course_code": "CSC201",
                "course_title": "Data Structures",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 1,
                "course_code": "CSC203",
                "course_title": "Discrete Mathematics",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 1,
                "course_code": "CSC205",
                "course_title": "Computer Architecture",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 1,
                "course_code": "MTH201",
                "course_title": "Linear Algebra",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 1,
                "course_code": "STA201",
                "course_title": "Probability Theory",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 2,
                "course_code": "CSC202",
                "course_title": "Algorithms",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 2,
                "course_code": "CSC204",
                "course_title": "Operating Systems",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 2,
                "course_code": "CSC206",
                "course_title": "Database Systems",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 2,
                "course_code": "CSC208",
                "course_title": "Software Engineering I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 200,
                "semester": 2,
                "course_code": "GST202",
                "course_title": "Philosophy & Logic",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 1,
                "course_code": "CSC301",
                "course_title": "Artificial Intelligence",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 1,
                "course_code": "CSC303",
                "course_title": "Computer Networks",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 1,
                "course_code": "CSC305",
                "course_title": "Compiler Construction",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 1,
                "course_code": "CSC307",
                "course_title": "Human Computer Interaction",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 1,
                "course_code": "CSC309",
                "course_title": "Research Methods",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 2,
                "course_code": "CSC302",
                "course_title": "Machine Learning",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 2,
                "course_code": "CSC304",
                "course_title": "Cyber Security",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 2,
                "course_code": "CSC306",
                "course_title": "Distributed Systems",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Computer Science",
                "level": 300,
                "semester": 2,
                "course_code": "CSC308",
                "course_title": "Software Engineering II",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 400,
                "semester": 1,
                "course_code": "CSC401",
                "course_title": "Project I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 400,
                "semester": 2,
                "course_code": "CSC402",
                "course_title": "Project II",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Computer Science",
                "level": 400,
                "semester": 1,
                "course_code": "CSC403",
                "course_title": "Cloud Computing",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 400,
                "semester": 1,
                "course_code": "CSC404",
                "course_title": "Data Mining",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Computer Science",
                "level": 400,
                "semester": 1,
                "course_code": "CSC405",
                "course_title": "Entrepreneurship",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "GST111",
                "course_title": "Communication in English I",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "GST121",
                "course_title": "Use of Library",
                "units": 2,
                "default_difficulty": 1
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "MTH111",
                "course_title": "Elementary Mathematics I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "PHY111",
                "course_title": "General Physics I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "PHY117",
                "course_title": "General Physics Practical I",
                "units": 1,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "CHM111",
                "course_title": "General Chemistry I",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "CHM117",
                "course_title": "General Chemistry Practical I",
                "units": 1,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "CSC101",
                "course_title": "Introduction to Computing",
                "units": 3,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "CSC103",
                "course_title": "Problem Solving Techniques",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "EGR101",
                "course_title": "Introduction to Engineering",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "GST112",
                "course_title": "Communication in English II",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "MTH122",
                "course_title": "Elementary Mathematics II",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "PHY122",
                "course_title": "General Physics II",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "PHY128",
                "course_title": "General Physics Practical II",
                "units": 1,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "CSC102",
                "course_title": "Introduction to Programming",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "CSC104",
                "course_title": "Digital Logic Design",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "STA122",
                "course_title": "Introductory Statistics",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "EEE122",
                "course_title": "Basic Electrical Engineering",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "GST124",
                "course_title": "Nigerian Peoples and Culture",
                "units": 2,
                "default_difficulty": 1
        },
        {
                "program": "Software Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "GNS102",
                "course_title": "Citizenship Education",
                "units": 2,
                "default_difficulty": 1
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "SWE201",
                "course_title": "Introduction to Software Engineering",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "CSC201",
                "course_title": "Data Structures and Algorithms",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "CSC203",
                "course_title": "Computer Organization and Architecture",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "CSC205",
                "course_title": "Discrete Structures",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "MTH201",
                "course_title": "Linear Algebra",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "MTH203",
                "course_title": "Differential Equations",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "GST211",
                "course_title": "Philosophy and Logic",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "EEE211",
                "course_title": "Circuit Theory",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "SWE202",
                "course_title": "Requirements Engineering",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "CSC202",
                "course_title": "Object-Oriented Programming",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "CSC204",
                "course_title": "Database Systems",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "CSC206",
                "course_title": "Operating Systems I",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "CSC208",
                "course_title": "Numerical Computation",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "STA202",
                "course_title": "Probability and Statistics",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "EEE222",
                "course_title": "Electronics I",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "GST222",
                "course_title": "Peace and Conflict Resolution",
                "units": 2,
                "default_difficulty": 1
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "SWE301",
                "course_title": "Software Design and Architecture",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "SWE303",
                "course_title": "Human Computer Interaction",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "CSC301",
                "course_title": "Operating Systems II",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "CSC303",
                "course_title": "Data Communication and Networks",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "CSC305",
                "course_title": "Compiler Construction",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "CSC307",
                "course_title": "Web Application Development",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "MTH301",
                "course_title": "Mathematical Methods",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "GST301",
                "course_title": "Entrepreneurship Studies I",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "SWE302",
                "course_title": "Software Project Management",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "SWE304",
                "course_title": "Software Testing and Quality Assurance",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "CSC302",
                "course_title": "Artificial Intelligence",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "CSC304",
                "course_title": "Computer Graphics",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "CSC306",
                "course_title": "Systems Analysis and Design",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "CSC308",
                "course_title": "Mobile Application Development",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "GST302",
                "course_title": "Entrepreneurship Studies II",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "SWE401",
                "course_title": "Enterprise Software Systems",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "SWE403",
                "course_title": "Cloud Computing",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "SWE405",
                "course_title": "Software Maintenance and Evolution",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "CSC401",
                "course_title": "Machine Learning Fundamentals",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "CSC403",
                "course_title": "Information Security",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "CSC405",
                "course_title": "Distributed Systems",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "CSC407",
                "course_title": "Research Methods",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "SWE402",
                "course_title": "Agile Software Development",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "SWE404",
                "course_title": "DevOps Engineering",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "SWE406",
                "course_title": "Software Metrics and Measurement",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "CSC402",
                "course_title": "Data Mining",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "CSC404",
                "course_title": "Cybersecurity",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "CSC406",
                "course_title": "Parallel Computing",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "SWE498",
                "course_title": "Final Year Project I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "SWE501",
                "course_title": "Advanced Software Engineering",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "SWE503",
                "course_title": "Intelligent Systems Engineering",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "SWE505",
                "course_title": "Enterprise Architecture",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "CSC501",
                "course_title": "Advanced Algorithms",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "CSC503",
                "course_title": "Big Data Systems",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "SWE507",
                "course_title": "Software Entrepreneurship",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "SWE502",
                "course_title": "Software Engineering Seminar",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "SWE504",
                "course_title": "Emerging Technologies",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "SWE506",
                "course_title": "Professional Ethics in Computing",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "SWE599",
                "course_title": "Final Year Project II",
                "units": 6,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "CSC502",
                "course_title": "Advanced Database Systems",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Software Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "CSC504",
                "course_title": "Information Systems Management",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "GST111",
                "course_title": "Communication in English I",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "MTH111",
                "course_title": "Elementary Mathematics I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "PHY111",
                "course_title": "General Physics I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "PHY117",
                "course_title": "General Physics Practical I",
                "units": 1,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "CHM111",
                "course_title": "General Chemistry I",
                "units": 3,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "CHM117",
                "course_title": "General Chemistry Practical I",
                "units": 1,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "EGR101",
                "course_title": "Introduction to Engineering",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "MEE101",
                "course_title": "Engineering Drawing I",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 1,
                "course_code": "GST121",
                "course_title": "Use of Library",
                "units": 2,
                "default_difficulty": 1
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "GST112",
                "course_title": "Communication in English II",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "MTH122",
                "course_title": "Elementary Mathematics II",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "PHY122",
                "course_title": "General Physics II",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "PHY128",
                "course_title": "General Physics Practical II",
                "units": 1,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "EEE122",
                "course_title": "Basic Electrical Engineering",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "MEE102",
                "course_title": "Workshop Practice",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "STA122",
                "course_title": "Introductory Statistics",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 100,
                "semester": 2,
                "course_code": "GST124",
                "course_title": "Nigerian Peoples and Culture",
                "units": 2,
                "default_difficulty": 1
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "MEE201",
                "course_title": "Engineering Mechanics I",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "MEE203",
                "course_title": "Thermodynamics I",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "MEE205",
                "course_title": "Engineering Materials",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "MEE207",
                "course_title": "Fluid Mechanics I",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "MTH201",
                "course_title": "Linear Algebra",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "MTH203",
                "course_title": "Differential Equations",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 1,
                "course_code": "GST211",
                "course_title": "Philosophy and Logic",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "MEE202",
                "course_title": "Engineering Mechanics II",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "MEE204",
                "course_title": "Thermodynamics II",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "MEE206",
                "course_title": "Strength of Materials",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "MEE208",
                "course_title": "Fluid Mechanics II",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "MEE210",
                "course_title": "Engineering Drawing II",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "STA202",
                "course_title": "Probability and Statistics",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 200,
                "semester": 2,
                "course_code": "GST222",
                "course_title": "Peace and Conflict Resolution",
                "units": 2,
                "default_difficulty": 1
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "MEE301",
                "course_title": "Heat Transfer",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "MEE303",
                "course_title": "Machine Design I",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "MEE305",
                "course_title": "Manufacturing Processes I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "MEE307",
                "course_title": "Mechanics of Machines",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "MEE309",
                "course_title": "Engineering Measurements",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 1,
                "course_code": "GST301",
                "course_title": "Entrepreneurship Studies I",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "MEE302",
                "course_title": "Internal Combustion Engines",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "MEE304",
                "course_title": "Machine Design II",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "MEE306",
                "course_title": "Manufacturing Processes II",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "MEE308",
                "course_title": "Control Engineering",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "MEE310",
                "course_title": "Mechanical Vibrations",
                "units": 2,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 300,
                "semester": 2,
                "course_code": "GST302",
                "course_title": "Entrepreneurship Studies II",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "MEE401",
                "course_title": "Applied Thermodynamics",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "MEE403",
                "course_title": "Power Plant Engineering",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "MEE405",
                "course_title": "Industrial Engineering",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "MEE407",
                "course_title": "Refrigeration and Air Conditioning",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "MEE409",
                "course_title": "Automobile Engineering",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 1,
                "course_code": "MEE411",
                "course_title": "Research Methods",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "MEE402",
                "course_title": "Renewable Energy Systems",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "MEE404",
                "course_title": "Finite Element Analysis",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "MEE406",
                "course_title": "Robotics and Automation",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "MEE408",
                "course_title": "Turbomachinery",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "MEE410",
                "course_title": "Maintenance Engineering",
                "units": 2,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 400,
                "semester": 2,
                "course_code": "MEE498",
                "course_title": "Final Year Project I",
                "units": 3,
                "default_difficulty": 4
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "MEE501",
                "course_title": "Advanced Manufacturing Systems",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "MEE503",
                "course_title": "Computational Fluid Dynamics",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "MEE505",
                "course_title": "Advanced Machine Design",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "MEE507",
                "course_title": "Engineering Management",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 1,
                "course_code": "MEE509",
                "course_title": "Energy Systems Engineering",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "MEE502",
                "course_title": "Professional Ethics in Engineering",
                "units": 2,
                "default_difficulty": 2
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "MEE504",
                "course_title": "Advanced Control Systems",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "MEE506",
                "course_title": "Mechatronics Systems",
                "units": 3,
                "default_difficulty": 5
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "MEE508",
                "course_title": "Engineering Economics",
                "units": 2,
                "default_difficulty": 3
        },
        {
                "program": "Mechanical Engineering",
                "level": 500,
                "semester": 2,
                "course_code": "MEE599",
                "course_title": "Final Year Project II",
                "units": 6,
                "default_difficulty": 5
        }
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
