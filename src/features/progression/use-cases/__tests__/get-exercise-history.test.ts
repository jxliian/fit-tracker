import { GetExerciseHistoryUseCase } from '../get-exercise-history';
import { IWorkoutRepository } from '@domain/workout-repository';
import { IExerciseRepository } from '@domain/exercise-repository';
import { Exercise } from '@domain/entities/exercise';
import { ExerciseSet } from '@domain/entities/exercise-set';
import { WorkoutSession } from '@domain/entities/workout-session';

class MockExerciseRepo implements IExerciseRepository {
  async getAll(): Promise<Exercise[]> { return []; }
  async getById(id: string): Promise<Exercise | null> {
    if (id === 'squat') {
      return { id: 'squat', name: 'Barbell Back Squat', category: 'quadriceps', type: 'compound', equipment: 'barbell', instructions: [] };
    }
    return null;
  }
  async getByCategory(category: string): Promise<Exercise[]> { return []; }
}

class MockWorkoutRepo implements IWorkoutRepository {
  public sets: ExerciseSet[] = [
    { id: '1', sessionId: 's1', exerciseId: 'squat', setOrder: 1, weightKg: 100, reps: 5, rpe: 7, isWarmup: true, estimated1RM: 116.7 },
    { id: '2', sessionId: 's1', exerciseId: 'squat', setOrder: 2, weightKg: 140, reps: 5, rpe: 8, isWarmup: false, estimated1RM: 163.3 },
    { id: '3', sessionId: 's2', exerciseId: 'squat', setOrder: 1, weightKg: 145, reps: 5, rpe: 9, isWarmup: false, estimated1RM: 169.1 }
  ];

  async createSession(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> { throw new Error('Not implemented'); }
  async getSessionById(id: string): Promise<WorkoutSession | null> { return null; }
  async addSetToSession(set: Omit<ExerciseSet, 'id' | 'estimated1RM'>): Promise<ExerciseSet> { throw new Error('Not implemented'); }
  async getSetsForSession(sessionId: string): Promise<ExerciseSet[]> { return []; }
  async getLastSetsForExercise(exerciseId: string, limit?: number): Promise<ExerciseSet[]> {
    return this.sets.filter((s) => s.exerciseId === exerciseId);
  }
  async getAllSessions(): Promise<WorkoutSession[]> { return []; }
}

describe('GetExerciseHistoryUseCase', () => {
  let exerciseRepo: MockExerciseRepo;
  let workoutRepo: MockWorkoutRepo;
  let useCase: GetExerciseHistoryUseCase;

  beforeEach(() => {
    exerciseRepo = new MockExerciseRepo();
    workoutRepo = new MockWorkoutRepo();
    useCase = new GetExerciseHistoryUseCase(workoutRepo, exerciseRepo);
  });

  it('should compute peak 1RM, max weight, and total working volume', async () => {
    const result = await useCase.execute({ exerciseId: 'squat' });

    expect(result.exercise.name).toBe('Barbell Back Squat');
    expect(result.totalSetsLogged).toBe(3);
    expect(result.maxWeightLiftedKg).toBe(145);
    expect(result.peak1RM).toBe(169.1);
    expect(result.totalVolumeLiftedKg).toBe(140 * 5 + 145 * 5); // 700 + 725 = 1425
  });

  it('should throw error if exercise does not exist', async () => {
    await expect(useCase.execute({ exerciseId: 'unknown' })).rejects.toThrow(
      'Exercise with ID "unknown" not found.'
    );
  });
});
