import { IWorkoutRepository } from '@domain/workout-repository';
import { calculateEffectiveVolume } from '@features/progression/domain/calculators';

export interface FinishWorkoutSessionDTO {
  sessionId: string;
}

export interface ExerciseSummary {
  exerciseId: string;
  totalSets: number;
  maxWeightKg: number;
  peak1RM: number;
}

export interface FinishWorkoutSessionResult {
  sessionId: string;
  name: string;
  durationMinutes: number;
  totalTonnageKg: number;
  totalEffectiveVolume: number;
  totalWorkingSets: number;
  exerciseSummaries: ExerciseSummary[];
}

export class FinishWorkoutSessionUseCase {
  constructor(private readonly workoutRepo: IWorkoutRepository) {}

  async execute(dto: FinishWorkoutSessionDTO): Promise<FinishWorkoutSessionResult> {
    const session = await this.workoutRepo.getSessionById(dto.sessionId);
    if (!session) {
      throw new Error(`Workout session with ID "${dto.sessionId}" not found.`);
    }

    const sets = await this.workoutRepo.getSetsForSession(dto.sessionId);
    const workingSets = sets.filter((s) => !s.isWarmup);

    // Calcular tonelafe total (peso x repeticiones)
    const totalTonnageKg = workingSets.reduce((acc, s) => acc + s.weightKg * s.reps, 0);

    // Volumen efectivo acumulado
    const totalEffectiveVolume = calculateEffectiveVolume(sets);

    // Duración en minutos desde la creación de la sesión
    const durationMinutes = Math.max(1, Math.round((Date.now() - session.date) / 60000));

    // Agrupar métricas por ejercicio
    const exerciseMap = new Map<string, ExerciseSummary>();

    for (const set of workingSets) {
      const existing = exerciseMap.get(set.exerciseId) || {
        exerciseId: set.exerciseId,
        totalSets: 0,
        maxWeightKg: 0,
        peak1RM: 0
      };

      existing.totalSets += 1;
      existing.maxWeightKg = Math.max(existing.maxWeightKg, set.weightKg);
      existing.peak1RM = Math.max(existing.peak1RM, set.estimated1RM);

      exerciseMap.set(set.exerciseId, existing);
    }

    return {
      sessionId: session.id,
      name: session.name,
      durationMinutes,
      totalTonnageKg: Math.round(totalTonnageKg * 10) / 10,
      totalEffectiveVolume,
      totalWorkingSets: workingSets.length,
      exerciseSummaries: Array.from(exerciseMap.values())
    };
  }
}
