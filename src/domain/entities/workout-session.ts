import { ExerciseSet } from './exercise-set';

export interface WorkoutSession {
    id: string;
    name: string;          // Ej. "Torso A - Enfoque Pecho"
    date: number;          // Timestamp epoch (ej. Date.now())
    notes?: string;        // Observaciones opcionales del atleta
    sets?: ExerciseSet[];  // Lista de series ejecutadas en la sesión
}
