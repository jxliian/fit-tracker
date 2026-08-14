import { GetProgressionRecommendationUseCase } from '../get-progression-recommendation';
import { IWorkoutRepository } from '@domain/workout-repository';
import { IExerciseRepository } from '@domain/exercise-repository';
import { Exercise } from '@domain/entities/exercise';
import { ExerciseSet } from '@domain/entities/exercise-set';
import { WorkoutSession } from '@domain/entities/workout-session';

class InMemoryExerciseRepo implements IExerciseRepository {
  private exercises: Exercise[] = [
    {
      id: 'bench-press',
      name: 'Barbell Bench Press',
      category: 'chest',
      type: 'compound',
      equipment: 'barbell',
      gifUrl: undefined,
      instructions: []
    },
    {
      id: 'bicep-curl',
      name: 'Dumbbell Bicep Curl',
      category: 'biceps',
      type: 'isolation',
      equipment: 'dumbbell',
      gifUrl: undefined,
      instructions: []
    }
  ];

  async getAll(): Promise<Exercise[]> {
    return this.exercises;
  }

  async getById(id: string): Promise<Exercise | null> {
    return this.exercises.find((e) => e.id === id) || null;
  }

  async getByCategory(category: string): Promise<Exercise[]> {
    return this.exercises.filter((e) => e.category === category);
  }
}

class InMemoryWorkoutRepo implements IWorkoutRepository {
  public sets: ExerciseSet[] = [];

  async createSession(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
    return { ...session, id: 's1' };
  }

  async getSessionById(id: string): Promise<WorkoutSession | null> {
    return null;
  }

  async addSetToSession(set: Omit<ExerciseSet, 'id' | 'estimated1RM'>): Promise<ExerciseSet> {
    const newSet: ExerciseSet = { ...set, id: 'set_1', estimated1RM: 100 };
    this.sets.push(newSet);
    return newSet;
  }

  async getSetsForSession(sessionId: string): Promise<ExerciseSet[]> {
    return this.sets;
  }

  async getLastSetsForExercise(exerciseId: string, limit = 10): Promise<ExerciseSet[]> {
    return this.sets.filter((s) => s.exerciseId === exerciseId).slice(-limit);
  }

  async getAllSessions(): Promise<WorkoutSession[]> {
    return [];
  }
}

describe('GetProgressionRecommendationUseCase', () => {
  let exerciseRepo: InMemoryExerciseRepo;
  let workoutRepo: InMemoryWorkoutRepo;
  let useCase: GetProgressionRecommendationUseCase;

  beforeEach(() => {
    exerciseRepo = new InMemoryExerciseRepo();
    workoutRepo = new InMemoryWorkoutRepo();
    useCase = new GetProgressionRecommendationUseCase(workoutRepo, exerciseRepo);
  });

  it('should recommend MAINTAIN with 0 weight when no previous sets exist', async () => {
    const rec = await useCase.execute({ exerciseId: 'bench-press' });

    expect(rec.action).toBe('MAINTAIN');
    expect(rec.recommendedWeightKg).toBe(0);
    expect(rec.recommendedReps).toBe(6);
  });

  it('should recommend INCREMENT +2.5kg for compound exercise when target reps reached', async () => {
    workoutRepo.sets.push({
      id: 'set1',
      sessionId: 's1',
      exerciseId: 'bench-press',
      setOrder: 1,
      weightKg: 80,
      reps: 10,
      rpe: 8,
      isWarmup: false,
      estimated1RM: 106.7
    });

    const rec = await useCase.execute({
      exerciseId: 'bench-press',
      targetRepRange: { min: 6, max: 10 }
    });

    expect(rec.action).toBe('INCREMENT');
    expect(rec.recommendedWeightKg).toBe(82.5); // 80 + 2.5kg
    expect(rec.recommendedReps).toBe(6);
  });

  it('should recommend INCREMENT +1.25kg for isolation exercise when target reps reached', async () => {
    workoutRepo.sets.push({
      id: 'set2',
      sessionId: 's1',
      exerciseId: 'bicep-curl',
      setOrder: 1,
      weightKg: 14,
      reps: 12,
      rpe: 8,
      isWarmup: false,
      estimated1RM: 19.6
    });

    const rec = await useCase.execute({
      exerciseId: 'bicep-curl',
      targetRepRange: { min: 8, max: 12 }
    });

    expect(rec.action).toBe('INCREMENT');
    expect(rec.recommendedWeightKg).toBe(15.25); // 14 + 1.25kg
  });

  it('should throw error if exercise does not exist in catalog', async () => {
    await expect(useCase.execute({ exerciseId: 'unknown-id' })).rejects.toThrow(
      'Exercise with ID "unknown-id" not found.'
    );
  });
});
