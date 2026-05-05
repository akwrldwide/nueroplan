function calculateTopicPriority(topic, userCourse, profile, riskFactor, unitWeight, isExamCluster = false) {
    const difficulty = topic.course.difficulty || 3;
    const mastery_level = topic.mastery_level || 0; // 0 to 1
    
    // Topic Priority = w1(Difficulty) + w2(Exam Proximity) + w3(Lack of Mastery) + w4(Risk) + w5(Unit Weight)
    let examProximityScore = 0;
    if (userCourse && userCourse.exam_date) {
        const today = new Date();
        const examDate = new Date(userCourse.exam_date);
        const daysToExam = Math.max(0, (examDate - today) / (1000 * 60 * 60 * 24));

        const lambda = 0.1;
        examProximityScore = Math.exp(-lambda * daysToExam);

        // Exam Cluster Multiplier 
        if (isExamCluster && daysToExam >= 0 && daysToExam <= 7) {
            examProximityScore = Math.min(examProximityScore * 1.5, 3.0); 
        }
    }

    const normDiff = difficulty / 5; // normalize to 1
    const masteryInverse = 1 - mastery_level;

    const w1 = 0.20; // Difficulty
    const w2 = 0.30; // Exam Proximity
    const w3 = 0.15; // Lack of Mastery
    const w4 = 0.20; // Risk Factor
    const w5 = 0.15; // Unit Weight

    const wDiff = normDiff * w1;
    const wExam = examProximityScore * w2;
    const wMastery = masteryInverse * w3;
    const wRisk = (riskFactor || 0) * w4;
    const wUnit = (unitWeight || 0) * w5;

    return wDiff + wExam + wMastery + wRisk + wUnit;
}

module.exports = { calculateTopicPriority };
