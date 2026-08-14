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
      rest_seconds INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      sex TEXT NOT NULL,
      height_cm REAL NOT NULL,
      body_weight_kg REAL NOT NULL,
      experience_level TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'es',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_predefined INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS routine_exercises (
      id TEXT PRIMARY KEY NOT NULL,
      routine_id TEXT NOT NULL,
      exercise_id TEXT NOT NULL,
      exercise_order INTEGER NOT NULL,
      target_sets INTEGER NOT NULL,
      target_rep_min INTEGER NOT NULL,
      target_rep_max INTEGER NOT NULL,
      rest_timer_seconds INTEGER NOT NULL DEFAULT 120,
      FOREIGN KEY (routine_id) REFERENCES routines (id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE CASCADE
    );
  `);

    try {
      await db.execAsync(`ALTER TABLE user_profile ADD COLUMN language TEXT NOT NULL DEFAULT 'es';`);
      try {
      await db.execAsync(`ALTER TABLE exercise_sets ADD COLUMN rest_seconds INTEGER NOT NULL DEFAULT 0;`);
    } catch (e) {
      // La columna ya existe
    }
  } catch (e) {
      // Column already exists
    }
}