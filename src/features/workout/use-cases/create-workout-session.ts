import { WorkoutSession } from '@domain/entities/workout-session';
import { IWorkoutRepository } from '@domain/workout-repository';

export interface CreateWorkoutSessionDTO {
  name: string;
  notes?: string;
}

export class CreateWorkoutSessionUseCase {
  constructor(private readonly workoutRepo: IWorkoutRepository) {}

  async execute(dto: CreateWorkoutSessionDTO): Promise<WorkoutSession> {
    const trimmedName = dto.name ? dto.name.trim() : '';

    if (!trimmedName) {
      throw new Error('Workout session name cannot be empty.');
    }

    return this.workoutRepo.createSession({
      name: trimmedName,
      date: Date.now(),
      notes: dto.notes ? dto.notes.trim() : undefined
    });
  }
}
