import { WorkoutSession } from '@domain/entities/workout-session';
import { ExerciseSet } from '@domain/entities/exercise-set';

export interface IWorkoutRepository {
  createSession(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession>;
  getSessionById(id: string): Promise<WorkoutSession | null>;
  addSetToSession(set: Omit<ExerciseSet, 'id' | 'estimated1RM'>): Promise<ExerciseSet>;
  getSetsForSession(sessionId: string): Promise<ExerciseSet[]>;
  getLastSetsForExercise(exerciseId: string, limit?: number): Promise<ExerciseSet[]>;
}
