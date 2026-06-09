export function calculateRiskFactor(quizAverage: number | null, consistencyScore: number | null): number {
    if (quizAverage === null && consistencyScore === null) {
        return 0.5;
    }

    const qA = quizAverage !== null ? quizAverage : 0.5; // default 50%
    const cS = consistencyScore !== null ? consistencyScore : 0.8; // default 80%

    const risk = ((1 - qA) * 0.6) + ((1 - cS) * 0.4);

    return Math.min(Math.max(risk, 0), 1);
}
