import { db } from '@database/client';
import { WorkoutSession } from '@domain/entities/workout-session';
import { ExerciseSet } from '@domain/entities/exercise-set';
import { IWorkoutRepository } from '@domain/workout-repository';
import { calculate1RM } from '@features/progression/domain/calculators';

export class SqliteWorkoutRepository implements IWorkoutRepository {
  async createSession(sessionData: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
    const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const dateTimestamp = sessionData.date;

    await db.runAsync(
      `INSERT INTO workout_sessions (id, name, date, notes) VALUES (?, ?, ?, ?);`,
      [id, sessionData.name, dateTimestamp, sessionData.notes || null]
    );

    return {
      id,
      name: sessionData.name,
      date: sessionData.date,
      notes: sessionData.notes
    };
  }

  async getSessionById(id: string): Promise<WorkoutSession | null> {
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM workout_sessions WHERE id = ?;`,
      [id]
    );

    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      date: row.date,
      notes: row.notes || undefined
    };
  }

  async addSetToSession(setData: Omit<ExerciseSet, 'id' | 'estimated1RM'>): Promise<ExerciseSet> {
    const id = `set_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const estimated1RM = calculate1RM(setData.weightKg, setData.reps, setData.rpe);
    const isWarmupInt = setData.isWarmup ? 1 : 0;

    await db.runAsync(
      `INSERT INTO exercise_sets (id, session_id, exercise_id, set_order, weight_kg, reps, rpe, is_warmup, estimated_1rm)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        setData.sessionId,
        setData.exerciseId,
        setData.setOrder,
        setData.weightKg,
        setData.reps,
        setData.rpe,
        isWarmupInt,
        estimated1RM
      ]
    );

    return {
      id,
      sessionId: setData.sessionId,
      exerciseId: setData.exerciseId,
      setOrder: setData.setOrder,
      weightKg: setData.weightKg,
      reps: setData.reps,
      rpe: setData.rpe,
      isWarmup: setData.isWarmup,
      estimated1RM
    };
  }

  async getSetsForSession(sessionId: string): Promise<ExerciseSet[]> {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM exercise_sets WHERE session_id = ? ORDER BY set_order ASC;`,
      [sessionId]
    );

    return rows.map(this.mapRowToSet);
  }

  async getLastSetsForExercise(exerciseId: string, limit = 10): Promise<ExerciseSet[]> {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM exercise_sets WHERE exercise_id = ? ORDER BY id DESC LIMIT ?;`,
      [exerciseId, limit]
    );

    return rows.map(this.mapRowToSet);
  }

  private mapRowToSet(row: any): ExerciseSet {
    return {
      id: row.id,
      sessionId: row.session_id,
      exerciseId: row.exercise_id,
      setOrder: row.set_order,
      weightKg: row.weight_kg,
      reps: row.reps,
      rpe: row.rpe,
      isWarmup: row.is_warmup === 1,
      estimated1RM: row.estimated_1rm
    };
  }
}
