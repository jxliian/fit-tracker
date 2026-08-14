import { IWorkoutRepository } from '@domain/workout-repository';
import { IExerciseRepository } from '@domain/exercise-repository';
import { Exercise } from '@domain/entities/exercise';
import { ExerciseSet } from '@domain/entities/exercise-set';

export interface GetExerciseHistoryDTO {
  exerciseId: string;
  limit?: number;
}

export interface ExerciseHistoryResult {
  exercise: Exercise;
  totalSetsLogged: number;
  maxWeightLiftedKg: number;
  peak1RM: number;
  totalVolumeLiftedKg: number;
  sets: ExerciseSet[];
}

export class GetExerciseHistoryUseCase {
  constructor(
    private readonly workoutRepo: IWorkoutRepository,
    private readonly exerciseRepo: IExerciseRepository
  ) {}

  async execute(dto: GetExerciseHistoryDTO): Promise<ExerciseHistoryResult> {
    const exercise = await this.exerciseRepo.getById(dto.exerciseId);
    if (!exercise) {
      throw new Error(`Exercise with ID "${dto.exerciseId}" not found.`);
    }

    const sets = await this.workoutRepo.getLastSetsForExercise(dto.exerciseId, dto.limit || 50);

    let maxWeightLiftedKg = 0;
    let peak1RM = 0;
    let totalVolumeLiftedKg = 0;

    for (const set of sets) {
      if (!set.isWarmup) {
        maxWeightLiftedKg = Math.max(maxWeightLiftedKg, set.weightKg);
        peak1RM = Math.max(peak1RM, set.estimated1RM);
        totalVolumeLiftedKg += set.weightKg * set.reps;
      }
    }

    return {
      exercise,
      totalSetsLogged: sets.length,
      maxWeightLiftedKg,
      peak1RM,
      totalVolumeLiftedKg: Math.round(totalVolumeLiftedKg * 10) / 10,
      sets
    };
  }
}
