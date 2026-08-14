import { RegisterSetUseCase } from '../register-set';
import { IWorkoutRepository } from '@domain/workout-repository';
import { WorkoutSession } from '@domain/entities/workout-session';
import { ExerciseSet } from '@domain/entities/exercise-set';

class InMemoryWorkoutRepository implements IWorkoutRepository {
  public sessions: WorkoutSession[] = [];
  public sets: ExerciseSet[] = [];

  async createSession(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
    const newSession: WorkoutSession = { ...session, id: `session_${this.sessions.length + 1}` };
    this.sessions.push(newSession);
    return newSession;
  }

  async getSessionById(id: string): Promise<WorkoutSession | null> {
    return this.sessions.find((s) => s.id === id) || null;
  }

  async addSetToSession(setData: Omit<ExerciseSet, 'id' | 'estimated1RM'>): Promise<ExerciseSet> {
    const newSet: ExerciseSet = {
      ...setData,
      id: `set_${this.sets.length + 1}`,
      estimated1RM: setData.weightKg * (1 + setData.reps / 30) // simplificado para el test
    };
    this.sets.push(newSet);
    return newSet;
  }

  async getSetsForSession(sessionId: string): Promise<ExerciseSet[]> {
    return this.sets.filter((s) => s.sessionId === sessionId);
  }

  async getLastSetsForExercise(exerciseId: string, limit = 10): Promise<ExerciseSet[]> {
    return this.sets.filter((s) => s.exerciseId === exerciseId).slice(-limit);
  }
}

describe('RegisterSetUseCase', () => {
  let repository: InMemoryWorkoutRepository;
  let useCase: RegisterSetUseCase;

  beforeEach(async () => {
    repository = new InMemoryWorkoutRepository();
    useCase = new RegisterSetUseCase(repository);

    // Crear sesión de entrenamiento de prueba
    await repository.createSession({
      name: 'Push Workout',
      date: Date.now(),
      notes: 'Hypertrophy day'
    });
  });

  it('should successfully register a working set and compute session volume', async () => {
    const result = await useCase.execute({
      sessionId: 'session_1',
      exerciseId: 'bench-press',
      weightKg: 100,
      reps: 10,
      rpe: 9,
      isWarmup: false
    });

    expect(result.registeredSet.id).toBe('set_1');
    expect(result.registeredSet.weightKg).toBe(100);
    expect(result.registeredSet.reps).toBe(10);
    expect(result.sessionEffectiveVolume).toBe(1000); // 100 * 10 * 1.0 (alpha for RPE 9)
  });

  it('should throw error when registering set for non-existent session', async () => {
    await expect(
      useCase.execute({
        sessionId: 'invalid_session',
        exerciseId: 'bench-press',
        weightKg: 100,
        reps: 10,
        rpe: 8
      })
    ).rejects.toThrow('Workout session with ID "invalid_session" not found.');
  });

  it('should throw error when weight <= 0 or reps <= 0', async () => {
    await expect(
      useCase.execute({
        sessionId: 'session_1',
        exerciseId: 'bench-press',
        weightKg: 0,
        reps: 10,
        rpe: 8
      })
    ).rejects.toThrow('Weight must be greater than 0 kg.');

    await expect(
      useCase.execute({
        sessionId: 'session_1',
        exerciseId: 'bench-press',
        weightKg: 100,
        reps: 0,
        rpe: 8
      })
    ).rejects.toThrow('Repetitions must be greater than 0.');
  });

  it('should throw error when RPE is out of valid range [6.0, 10.0]', async () => {
    await expect(
      useCase.execute({
        sessionId: 'session_1',
        exerciseId: 'bench-press',
        weightKg: 100,
        reps: 10,
        rpe: 5.0
      })
    ).rejects.toThrow('RPE must be between 6.0 and 10.0.');
  });
});
