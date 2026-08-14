export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  exerciseOrder: number;
  targetSets: number;
  targetRepMin: number;
  targetRepMax: number;
  restTimerSeconds: number;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  isPredefined: boolean;
  exercises?: RoutineExercise[];
}
