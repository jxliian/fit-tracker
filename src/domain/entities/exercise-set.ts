export interface ExerciseSet {
    id: string;
    sessionId: string;
    exerciseId: string;
    setOrder: number;      // 1, 2, 3...
    weightKg: number;      // Peso en kg (ej. 80.0)
    reps: number;          // Repeticiones completadas (ej. 8)
    rpe: number;           // Percepción de esfuerzo de 6.0 a 10.0
    isWarmup: boolean;     // true si es aproximación/calentamiento, false si es efectiva
    estimated1RM: number;  // 1RM calculado para esta serie
    restSeconds?: number;  // Tiempo de descanso registrado (en segundos)
}

