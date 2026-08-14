import { FinishWorkoutSessionUseCase } from '../finish-workout-session';
import { IWorkoutRepository } from '@domain/workout-repository';
import { WorkoutSession } from '@domain/entities/workout-session';
import { ExerciseSet } from '@domain/entities/exercise-set';

class MockWorkoutRepo implements IWorkoutRepository {
  public sessions: WorkoutSession[] = [
    { id: 's1', name: 'Pull Day', date: Date.now() - 3600000, notes: 'Heavy back' }
  ];
  public sets: ExerciseSet[] = [
    { id: '1', sessionId: 's1', exerciseId: 'deadlift', setOrder: 1, weightKg: 140, reps: 5, rpe: 8, isWarmup: false, estimated1RM: 163.3 },
    { id: '2', sessionId: 's1', exerciseId: 'deadlift', setOrder: 2, weightKg: 150, reps: 5, rpe: 9, isWarmup: false, estimated1RM: 175.0 },
    { id: '3', sessionId: 's1', exerciseId: 'barbell-row', setOrder: 1, weightKg: 80, reps: 8, rpe: 8.5, isWarmup: false, estimated1RM: 106.7 }
  ];

  async createSession(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
    throw new Error('Not implemented');
  }

  async getSessionById(id: string): Promise<WorkoutSession | null> {
    return this.sessions.find((s) => s.id === id) || null;
  }

  async addSetToSession(set: Omit<ExerciseSet, 'id' | 'estimated1RM'>): Promise<ExerciseSet> {
    throw new Error('Not implemented');
  }

  async getSetsForSession(sessionId: string): Promise<ExerciseSet[]> {
    return this.sets.filter((s) => s.sessionId === sessionId);
  }

  async getLastSetsForExercise(exerciseId: string, limit?: number): Promise<ExerciseSet[]> {
    return [];
  }

  async getAllSessions(): Promise<WorkoutSession[]> {
    return this.sessions;
  }
}

describe('FinishWorkoutSessionUseCase', () => {
  let repo: MockWorkoutRepo;
  let useCase: FinishWorkoutSessionUseCase;

  beforeEach(() => {
    repo = new MockWorkoutRepo();
    useCase = new FinishWorkoutSessionUseCase(repo);
  });

  it('should compute total tonnage, duration and exercise peak PRs correctly', async () => {
    const result = await useCase.execute({ sessionId: 's1' });

    expect(result.sessionId).toBe('s1');
    expect(result.name).toBe('Pull Day');
    expect(result.durationMinutes).toBeGreaterThanOrEqual(59);
    expect(result.totalTonnageKg).toBe(140 * 5 + 150 * 5 + 80 * 8); // 700 + 750 + 640 = 2090
    expect(result.totalWorkingSets).toBe(3);
    expect(result.exerciseSummaries.length).toBe(2);

    const deadliftSummary = result.exerciseSummaries.find((e) => e.exerciseId === 'deadlift');
    expect(deadliftSummary?.maxWeightKg).toBe(150);
    expect(deadliftSummary?.peak1RM).toBe(175.0);
  });

  it('should throw error for non-existent session', async () => {
    await expect(useCase.execute({ sessionId: 'invalid_id' })).rejects.toThrow(
      'Workout session with ID "invalid_id" not found.'
    );
  });
});
