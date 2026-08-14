// src/domain/entities/exercise.ts

export type MuscleGroup =
    | 'chest'
    | 'back'
    | 'shoulders'
    | 'biceps'
    | 'triceps'
    | 'quadriceps'
    | 'hamstrings'
    | 'glutes'
    | 'calves'
    | 'abs'
    | 'full_body';

export type ExerciseType = 'compound' | 'isolation';

export interface Exercise {
    id: string;
    name: string;
    category: MuscleGroup;
    secondaryMuscles?: string[];
    equipment: string;         // 'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight'
    type: ExerciseType;
    gifUrl?: string;          // URL del GIF animado
    instructions?: string[];  // Pasos de ejecución
}
