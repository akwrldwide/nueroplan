/**
 * Calculate RiskFactor based on QuizAverage and ConsistencyScore.
 * Formula: RiskFactor = ((1 - QuizAverage) * 0.6) + ((1 - ConsistencyScore) * 0.4)
 * Default to moderate (0.5) if no data.
 */
function calculateRiskFactor(quizAverage, consistencyScore) {
    // if no data, return a moderate risk factor
    if (quizAverage === null && consistencyScore === null) {
        return 0.5;
    }

    const qA = quizAverage !== null ? quizAverage : 0.5; // default 50%
    const cS = consistencyScore !== null ? consistencyScore : 0.8; // default 80%

    const risk = ((1 - qA) * 0.6) + ((1 - cS) * 0.4);

    // Return risk bounded between 0 and 1
    return Math.min(Math.max(risk, 0), 1);
}

module.exports = { calculateRiskFactor };
