import { ExerciseSet } from '@domain/entities/exercise-set';
import { ExerciseType } from '@domain/entities/exercise';

/**
 * Calcula el 1RM estimado de una serie según peso, repeticiones y RPE
 * utilizando el promedio no lineal de Epley y Brzycki con corrección RIR.
 */
export function calculate1RM(weightKg: number, reps: number, rpe: number): number {
    if (weightKg <= 0 || reps <= 0) return 0;

    // Si la serie es a 1 rep con RPE 10, el 1RM es exactamente la carga levantada
    if (reps === 1 && rpe === 10) return weightKg;

    // Repeticiones en Recámara (RIR)
    const rir = Math.max(0, 10.0 - rpe);
    const rMax = reps + rir;

    // Evitamos división por cero en Brzycki si rMax >= 37
    if (rMax >= 37) return weightKg * 2;

    // Fórmula de Epley
    const epley = weightKg * (1 + rMax / 30.0);

    // Fórmula de Brzycki
    const brzycki = weightKg * (36.0 / (37.0 - rMax));

    // Promedio ponderado y redondeo a 1 decimal
    const estimated1RM = (epley + brzycki) / 2.0;
    return Math.round(estimated1RM * 10) / 10;
}

export interface ProgressionRecommendation {
    recommendedWeightKg: number;
    recommendedReps: number;
    action: 'INCREMENT' | 'MAINTAIN' | 'DELOAD';
    reasoning: string;
}

/**
 * Calcula el Volumen Efectivo Ponderado por RPE de una lista de series.
 */
export function calculateEffectiveVolume(sets: ExerciseSet[]): number {
    const workingSets = sets.filter((s) => !s.isWarmup);

    const totalVolume = workingSets.reduce((acc, set) => {
        let alpha = 1.0;
        if (set.rpe < 7.0) alpha = 0.7;
        else if (set.rpe < 8.0) alpha = 0.85;

        return acc + set.weightKg * set.reps * alpha;
    }, 0);

    return Math.round(totalVolume * 10) / 10;
}

/**
 * Regla determinista de Sobrecarga Progresiva Automática para la siguiente sesión.
 */
export function calculateProgressionRecommendation(
    previousSets: ExerciseSet[],
    targetRange: { min: number; max: number },
    type: ExerciseType
): ProgressionRecommendation {
    const workingSets = previousSets.filter((s) => !s.isWarmup);

    if (workingSets.length === 0) {
        return {
            recommendedWeightKg: 0,
            recommendedReps: targetRange.min,
            action: 'MAINTAIN',
            reasoning: 'No previous working sets recorded.'
        };
    }

    const lastSet = workingSets[workingSets.length - 1];
    const currentWeight = lastSet.weightKg;

    // Calculamos el RIR promedio de las series efectivas
    const avgRIR = workingSets.reduce((acc, s) => acc + (10.0 - s.rpe), 0) / workingSets.length;
    const allReachedMaxReps = workingSets.every((s) => s.reps >= targetRange.max);
    const anyFailedMinReps = workingSets.some((s) => s.reps < targetRange.min);

    // Incremento estándar: 2.5 kg para ejercicios compuestos, 1.25 kg para aislamiento
    const incrementStep = type === 'compound' ? 2.5 : 1.25;

    if (allReachedMaxReps && avgRIR >= 1.0) {
        const newWeight = currentWeight + incrementStep;
        return {
            recommendedWeightKg: newWeight,
            recommendedReps: targetRange.min,
            action: 'INCREMENT',
            reasoning: `Target reps (${targetRange.max}) completed with solid RIR (${avgRIR.toFixed(1)}). Weight increased by +${incrementStep}kg.`
        };
    }

    if (anyFailedMinReps && avgRIR < 0.5) {
        const deloadWeight = Math.max(0, Math.round(currentWeight * 0.95 * 2) / 2);
        return {
            recommendedWeightKg: deloadWeight,
            recommendedReps: targetRange.min,
            action: 'DELOAD',
            reasoning: `High fatigue detected (Avg RIR ${avgRIR.toFixed(1)}). Weight deloaded by 5% to allow recovery.`
        };
    }

    return {
        recommendedWeightKg: currentWeight,
        recommendedReps: Math.min(targetRange.max, lastSet.reps + 1),
        action: 'MAINTAIN',
        reasoning: `Maintain weight at ${currentWeight}kg and aim for +1 rep in the next session.`
    };
}
