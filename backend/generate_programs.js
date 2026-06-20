const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('Error: GEMINI_API_KEY not found in environment variables.');
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

const programsConfig = [
    { name: "Cyber Security", prefix: "CYB" },
    { name: "Business Administration", prefix: "BUS" },
    { name: "Accounting", prefix: "ACC" },
    { name: "Economics", prefix: "ECO" },
    { name: "Mass Communication", prefix: "MAC" },
    { name: "Nursing", prefix: "NSC" },
    { name: "Information Technology", prefix: "ITE" },
    { name: "English", prefix: "ENG" }
];

async function generateProgramCurriculum(program) {
    console.log(`Generating curriculum for ${program.name}...`);
    
    // Choose model. gemini-2.5-flash is fast and supports JSON output
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
You are an academic curriculum designer.
Generate a comprehensive list of courses and topics for the program: "${program.name}".

Requirements:
1. Generate courses for levels: 100, 200, 300, and 400.
2. For each level, generate courses for Semester 1 and Semester 2 (total 8 semesters).
3. Each semester MUST contain between 5 and 8 courses (choose a realistic number like 6 or 7 per semester).
4. Each course MUST have between 8 and 12 distinct, detailed, and realistic academic topics.
5. Return the result strictly as a JSON array of course objects, with the following properties:
   - "program" (string, must be exactly "${program.name}")
   - "level" (integer: 100, 200, 300, or 400)
   - "semester" (integer: 1 or 2)
   - "course_code" (string, unique code like "${program.prefix}101", "${program.prefix}102", etc. Format: prefix + level_digit + sequence_number. Ensure it is unique for each course)
   - "course_title" (string, realistic name of the course)
   - "units" (integer: between 1 and 4, typically 2 or 3)
   - "default_difficulty" (integer: between 1 and 5, where 1 is easiest and 5 is hardest)
   - "topics" (array of 8 to 12 strings, representing realistic, detailed topic titles covered in the course)

Return ONLY the raw JSON array fitting this format. Do not wrap in markdown or add explanations.
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const parsed = JSON.parse(text);
        
        // Validate basic criteria
        if (!Array.isArray(parsed)) {
            throw new Error("Response is not a JSON array");
        }
        
        console.log(`Successfully generated ${parsed.length} courses for ${program.name}.`);
        return parsed;
    } catch (error) {
        console.error(`Error generating ${program.name}:`, error);
        throw error;
    }
}

async function main() {
    let allGeneratedCourses = [];
    
    for (const prog of programsConfig) {
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
            try {
                const courses = await generateProgramCurriculum(prog);
                
                // Extra verification
                const semesterCounts = {};
                for (const c of courses) {
                    const key = `${c.level}_s${c.semester}`;
                    semesterCounts[key] = (semesterCounts[key] || 0) + 1;
                    if (!c.topics || c.topics.length < 8 || c.topics.length > 12) {
                        console.warn(`Warning: Course ${c.course_code} has ${c.topics ? c.topics.length : 0} topics, which is outside 8-12 limit.`);
                    }
                }
                
                console.log(`Semester breakdown for ${prog.name}:`, semesterCounts);
                
                allGeneratedCourses = allGeneratedCourses.concat(courses);
                success = true;
            } catch (err) {
                retries--;
                console.log(`Retrying generation for ${prog.name}. Retries left: ${retries}`);
                if (retries === 0) {
                    console.error(`Failed to generate ${prog.name} after 3 attempts.`);
                    process.exit(1);
                }
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        // Polite delay between programs
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const outputPath = path.join(__dirname, 'new_programs.json');
    fs.writeFileSync(outputPath, JSON.stringify(allGeneratedCourses, null, 2));
    console.log(`Finished generating all programs. Data written to: ${outputPath}`);
}

main();
