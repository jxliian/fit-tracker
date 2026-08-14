// Comprobar que la base de datos existe cuando se abre la aplicación por primera vez.
// Si no existe, crearla con las tablas correspondientes.


import { db } from '../client';

/**
 * Inicializa el esquema de la base de datos si no existe.
 * Crea las tablas necesarias para el funcionamiento de la aplicación:
 * - exercises
 * - workout_sessions
 * - exercise_sets
 */
export async function initDatabase(): Promise<void> {
    await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      type TEXT NOT NULL,
      equipment TEXT NOT NULL,
      gif_url TEXT,
      instructions TEXT
    );
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      date INTEGER NOT NULL,
      notes TEXT
    );
    CREATE TABLE IF NOT EXISTS exercise_sets (
      id TEXT PRIMARY KEY NOT NULL,
      session_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      set_order INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      reps INTEGER NOT NULL,
      rpe REAL NOT NULL,
      is_warmup INTEGER NOT NULL DEFAULT 0,
      estimated_1rm REAL NOT NULL,
      FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
    );
  `);
}