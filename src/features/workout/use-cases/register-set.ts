import { ExerciseSet } from '@domain/entities/exercise-set';
import { IWorkoutRepository } from '@domain/workout-repository';
import { calculateEffectiveVolume } from '@features/progression/domain/calculators';

export interface RegisterSetDTO {
  sessionId: string;
  exerciseId: string;
  weightKg: number;
  reps: number;
  rpe: number;
  isWarmup?: boolean;
  setOrder?: number;
}

export interface RegisterSetResult {
  registeredSet: ExerciseSet;
  sessionEffectiveVolume: number;
}

export class RegisterSetUseCase {
  constructor(private readonly workoutRepo: IWorkoutRepository) {}

  async execute(dto: RegisterSetDTO): Promise<RegisterSetResult> {
    // 1. Validaciones del dominio
    if (dto.weightKg <= 0) {
      throw new Error('Weight must be greater than 0 kg.');
    }

    if (dto.reps <= 0) {
      throw new Error('Repetitions must be greater than 0.');
    }

    if (dto.rpe < 6.0 || dto.rpe > 10.0) {
      throw new Error('RPE must be between 6.0 and 10.0.');
    }

    // 2. Verificar existencia de la sesión
    const session = await this.workoutRepo.getSessionById(dto.sessionId);
    if (!session) {
      throw new Error(`Workout session with ID "${dto.sessionId}" not found.`);
    }

    // 3. Determinar el orden de la serie si no viene especificado
    let order = dto.setOrder;
    if (order === undefined) {
      const existingSets = await this.workoutRepo.getSetsForSession(dto.sessionId);
      order = existingSets.length + 1;
    }

    // 4. Registrar la serie a través del repositorio
    const registeredSet = await this.workoutRepo.addSetToSession({
      sessionId: dto.sessionId,
      exerciseId: dto.exerciseId,
      setOrder: order,
      weightKg: dto.weightKg,
      reps: dto.reps,
      rpe: dto.rpe,
      isWarmup: dto.isWarmup ?? false
    });

    // 5. Recalcular el volumen efectivo acumulado de la sesión
    const allSessionSets = await this.workoutRepo.getSetsForSession(dto.sessionId);
    const sessionEffectiveVolume = calculateEffectiveVolume(allSessionSets);

    return {
      registeredSet,
      sessionEffectiveVolume
    };
  }
}
