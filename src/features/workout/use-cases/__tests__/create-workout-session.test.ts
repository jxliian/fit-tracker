import { CreateWorkoutSessionUseCase } from '../create-workout-session';
import { IWorkoutRepository } from '@domain/workout-repository';
import { WorkoutSession } from '@domain/entities/workout-session';
import { ExerciseSet } from '@domain/entities/exercise-set';

class MockWorkoutRepo implements IWorkoutRepository {
  public sessions: WorkoutSession[] = [];

  async createSession(session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
    const created: WorkoutSession = { ...session, id: 'sess_1' };
    this.sessions.push(created);
    return created;
  }

  async getSessionById(id: string): Promise<WorkoutSession | null> {
    return null;
  }

  async addSetToSession(set: Omit<ExerciseSet, 'id' | 'estimated1RM'>): Promise<ExerciseSet> {
    throw new Error('Not implemented');
  }

  async getSetsForSession(sessionId: string): Promise<ExerciseSet[]> {
    return [];
  }

  async getLastSetsForExercise(exerciseId: string, limit?: number): Promise<ExerciseSet[]> {
    return [];
  }

  async getAllSessions(): Promise<WorkoutSession[]> {
    return this.sessions;
  }
}

describe('CreateWorkoutSessionUseCase', () => {
  let repo: MockWorkoutRepo;
  let useCase: CreateWorkoutSessionUseCase;

  beforeEach(() => {
    repo = new MockWorkoutRepo();
    useCase = new CreateWorkoutSessionUseCase(repo);
  });

  it('should successfully create a new session with valid title', async () => {
    const session = await useCase.execute({
      name: '  Leg Day  ',
      notes: 'Focus on quads'
    });

    expect(session.id).toBe('sess_1');
    expect(session.name).toBe('Leg Day');
    expect(session.notes).toBe('Focus on quads');
  });

  it('should throw error when session name is empty or only whitespace', async () => {
    await expect(useCase.execute({ name: '   ' })).rejects.toThrow(
      'Workout session name cannot be empty.'
    );
  });
});
