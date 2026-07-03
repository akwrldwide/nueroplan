const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to shuffle an array
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Helper to get random number in range [min, max] inclusive
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log("=== POPULATING RANDOM QUIZ SCORES FOR STUDENTS ACROSS PROGRAMS ===");

  try {
    // 1. Fetch all programs
    const programs = await prisma.program.findMany();
    console.log(`Found ${programs.length} programs in the database.`);

    // 2. Fetch all academic profiles
    const profiles = await prisma.academicProfile.findMany({
      include: {
        user: true,
      },
    });
    console.log(`Found ${profiles.length} academic profiles in the database.`);

    // 3. Group students by program
    const programStudents = {};
    for (const prog of programs) {
      programStudents[prog.name] = [];
    }

    for (const profile of profiles) {
      if (profile.user.role === 'STUDENT') {
        const progName = profile.program;
        if (!programStudents[progName]) {
          programStudents[progName] = [];
        }
        programStudents[progName].push(profile.user);
      }
    }

    let totalQuizzesInserted = 0;
    const insertedRecords = [];

    // 4. Iterate through each program and select random students
    for (const prog of programs) {
      const students = programStudents[prog.name] || [];
      if (students.length === 0) {
        console.log(`Program: "${prog.name}" has 0 students. Skipping.`);
        continue;
      }

      // Select ~40% of students at random, with a minimum of 3 (or all students if less than 3)
      const targetCount = Math.min(students.length, Math.max(3, Math.round(students.length * 0.4)));
      const shuffledStudents = shuffleArray(students);
      const selectedStudents = shuffledStudents.slice(0, targetCount);

      console.log(`\nProgram: "${prog.name}" (${students.length} students total). Selecting ${selectedStudents.length} students at random:`);
      for (const student of selectedStudents) {
        console.log(`  - ${student.name} (${student.email})`);
      }

      // 5. Populate quiz scores for each selected student
      for (const student of selectedStudents) {
        // Find their registered courses
        const userCourses = await prisma.userCourse.findMany({
          where: { user_id: student.id },
          include: { course: true }
        });

        if (userCourses.length === 0) {
          console.log(`    ⚠️ Student ${student.name} has no registered courses. Skipping.`);
          continue;
        }

        // Choose a random subset of courses (between 2 and 4, or all if fewer)
        const courseCountToQuiz = Math.min(userCourses.length, getRandomInt(2, 4));
        const selectedUserCourses = shuffleArray(userCourses).slice(0, courseCountToQuiz);

        for (const uc of selectedUserCourses) {
          const course = uc.course;
          
          // Get topics for this course
          const topics = await prisma.courseTopic.findMany({
            where: { course_id: course.id }
          });

          // Determine number of quizzes for this course (1 to 3)
          const quizCount = getRandomInt(1, 3);
          for (let q = 0; q < quizCount; q++) {
            // Select random topic or "Whole Course"
            let topicName = "Whole Course";
            if (topics.length > 0 && Math.random() > 0.3) {
              const randomTopicObj = topics[getRandomInt(0, topics.length - 1)];
              topicName = randomTopicObj.topic_name;
            }

            // Score: random percentage between 35 and 100
            const scorePercentage = getRandomInt(35, 100);
            
            // Difficulty: random between 1 and 5
            const difficulty = getRandomInt(1, 5);

            // Date: random within last 30 days
            const daysAgo = getRandomInt(0, 30);
            const takenAt = new Date();
            takenAt.setDate(takenAt.getDate() - daysAgo);

            // Insert quiz result
            const quizResult = await prisma.quizResult.create({
              data: {
                user_id: student.id,
                course_id: course.id,
                topic_name: topicName,
                difficulty: difficulty,
                score_percentage: scorePercentage,
                taken_at: takenAt
              }
            });

            totalQuizzesInserted++;
            insertedRecords.push({
              studentName: student.name,
              program: prog.name,
              courseCode: course.code,
              topicName,
              scorePercentage,
              difficulty
            });
          }
        }
        console.log(`    Successfully generated quiz scores for ${student.name}.`);
      }
    }

    console.log(`\n=== POPULATION COMPLETE ===`);
    console.log(`Total quiz results created: ${totalQuizzesInserted}`);
    
    // Print a sample of 10 inserted records for verification
    console.log("\nSample of inserted records:");
    const sampleSize = Math.min(insertedRecords.length, 10);
    const shuffledResults = shuffleArray(insertedRecords).slice(0, sampleSize);
    console.table(shuffledResults);

  } catch (err) {
    console.error("Error populating quiz scores:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
