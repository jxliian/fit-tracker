import { Exercise, MuscleGroup, ExerciseType } from '@domain/entities/exercise';
import { IExerciseRepository } from '@domain/exercise-repository';

export interface SearchExercisesDTO {
  query?: string;
  category?: MuscleGroup;
  equipment?: string;
  type?: ExerciseType;
}

export class SearchExercisesUseCase {
  constructor(private readonly exerciseRepo: IExerciseRepository) {}

  async execute(dto: SearchExercisesDTO): Promise<Exercise[]> {
    let results: Exercise[];

    // Si viene categoría, filtramos primero por la categoría de la BD
    if (dto.category) {
      results = await this.exerciseRepo.getByCategory(dto.category);
    } else {
      results = await this.exerciseRepo.getAll();
    }

    // Filtrar por substring en el nombre si hay query
    if (dto.query && dto.query.trim() !== '') {
      const q = dto.query.toLowerCase().trim();
      results = results.filter((e) => e.name.toLowerCase().includes(q));
    }

    // Filtrar por equipamiento
    if (dto.equipment && dto.equipment.trim() !== '') {
      const eq = dto.equipment.toLowerCase().trim();
      results = results.filter((e) => e.equipment.toLowerCase() === eq);
    }

    // Filtrar por tipo de ejercicio (compound / isolation)
    if (dto.type) {
      results = results.filter((e) => e.type === dto.type);
    }

    return results;
  }
}
