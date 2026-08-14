import { SearchExercisesUseCase } from '../search-exercises';
import { IExerciseRepository } from '@domain/exercise-repository';
import { Exercise } from '@domain/entities/exercise';

class MockExerciseRepo implements IExerciseRepository {
  private exercises: Exercise[] = [
    { id: '1', name: 'Barbell Bench Press', category: 'chest', type: 'compound', equipment: 'barbell', instructions: [] },
    { id: '2', name: 'Incline Dumbbell Press', category: 'chest', type: 'compound', equipment: 'dumbbell', instructions: [] },
    { id: '3', name: 'Cable Flyes', category: 'chest', type: 'isolation', equipment: 'cable', instructions: [] },
    { id: '4', name: 'Lat Pulldown', category: 'back', type: 'compound', equipment: 'cable', instructions: [] }
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

describe('SearchExercisesUseCase', () => {
  let repo: MockExerciseRepo;
  let useCase: SearchExercisesUseCase;

  beforeEach(() => {
    repo = new MockExerciseRepo();
    useCase = new SearchExercisesUseCase(repo);
  });

  it('should return all exercises when no filters provided', async () => {
    const results = await useCase.execute({});
    expect(results.length).toBe(4);
  });

  it('should filter exercises by search query', async () => {
    const results = await useCase.execute({ query: 'press' });
    expect(results.length).toBe(2);
    expect(results.map((e) => e.id)).toEqual(['1', '2']);
  });

  it('should filter exercises by category and equipment', async () => {
    const results = await useCase.execute({ category: 'chest', equipment: 'cable' });
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Cable Flyes');
  });

  it('should filter exercises by type (isolation vs compound)', async () => {
    const results = await useCase.execute({ category: 'chest', type: 'isolation' });
    expect(results.length).toBe(1);
    expect(results[0].type).toBe('isolation');
  });
});
