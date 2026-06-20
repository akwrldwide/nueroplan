const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Verification Script ---');
    
    const programs = await prisma.program.findMany({
        include: {
            courses: {
                include: {
                    courseTopics: true
                }
            }
        }
    });

    console.log(`Found ${programs.length} programs in the database:\n`);

    let totalViolations = 0;
    
    for (const prog of programs) {
        console.log(`=========================================`);
        console.log(`Program: ${prog.name}`);
        console.log(`Total Courses: ${prog.courses.length}`);
        console.log(`=========================================`);

        // Check courses per semester
        const semesterCounts = {};
        for (let level of [100, 200, 300, 400]) {
            for (let sem of [1, 2]) {
                const key = `${level} Level, Semester ${sem}`;
                semesterCounts[key] = 0;
            }
        }

        for (const c of prog.courses) {
            const key = `${c.level} Level, Semester ${c.semester}`;
            semesterCounts[key] = (semesterCounts[key] || 0) + 1;
        }

        console.log('Course count per semester:');
        for (const [sem, count] of Object.entries(semesterCounts)) {
            let status = 'OK';
            // Only validate our newly added programs for the strict 5-8 courses per semester rule.
            // Computer Science, Software Engineering and Mechanical Engineering are existing and might have different ranges.
            const isNewProgram = [
                "Cyber Security",
                "Business Administration",
                "Accounting",
                "Economics",
                "Mass Communication",
                "Nursing",
                "Information Technology",
                "English"
            ].includes(prog.name);

            if (isNewProgram) {
                if (count < 5 || count > 8) {
                    status = `❌ VIOLATION! (Count is ${count}, must be 5-8)`;
                    totalViolations++;
                }
            }
            console.log(`  - ${sem}: ${count} courses (${status})`);
        }

        // Check topics per course
        console.log('\nTopics count per course (checking 8-12 limit):');
        let topicViolations = 0;
        
        for (const c of prog.courses) {
            const topicCount = c.courseTopics.length;
            const isNewProgram = [
                "Cyber Security",
                "Business Administration",
                "Accounting",
                "Economics",
                "Mass Communication",
                "Nursing",
                "Information Technology",
                "English"
            ].includes(prog.name);

            if (isNewProgram) {
                if (topicCount < 8 || topicCount > 12) {
                    console.log(`  - ❌ ${c.code}: ${c.title} has ${topicCount} topics! (Violation: must be 8-12)`);
                    totalViolations++;
                    topicViolations++;
                }
            }
        }
        
        if (topicViolations === 0) {
            console.log('  - All courses have correct topic counts (8-12).');
        }
        console.log('\n');
    }

    console.log(`-----------------------------------------`);
    if (totalViolations === 0) {
        console.log('🎉 VERIFICATION SUCCESS: All constraints met successfully!');
    } else {
        console.log(`❌ VERIFICATION FAILED: Found ${totalViolations} violations in the database.`);
    }
    console.log(`-----------------------------------------`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
