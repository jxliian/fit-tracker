import { IWorkoutRepository } from '@domain/workout-repository';
import { IExerciseRepository } from '@domain/exercise-repository';
import {
  calculateProgressionRecommendation,
  ProgressionRecommendation
} from '../domain/calculators';

export interface GetProgressionRecommendationDTO {
  exerciseId: string;
  targetRepRange?: { min: number; max: number };
}

export class GetProgressionRecommendationUseCase {
  constructor(
    private readonly workoutRepo: IWorkoutRepository,
    private readonly exerciseRepo: IExerciseRepository
  ) {}

  async execute(dto: GetProgressionRecommendationDTO): Promise<ProgressionRecommendation> {
    const exercise = await this.exerciseRepo.getById(dto.exerciseId);
    if (!exercise) {
      throw new Error(`Exercise with ID "${dto.exerciseId}" not found.`);
    }

    const previousSets = await this.workoutRepo.getLastSetsForExercise(dto.exerciseId, 10);
    const repRange = dto.targetRepRange || { min: 6, max: 10 };

    return calculateProgressionRecommendation(previousSets, repRange, exercise.type);
  }
}
