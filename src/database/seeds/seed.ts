import { db } from '../client';
import exercisesData from './data/exercises.json';

export async function seedExercises(): Promise<void> {
    // 1. Verificar si ya existen ejercicios cargados
    const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM exercises;'
    );

    if (result && result.count > 0) {
        console.log('Database already seeded with exercises.');
        return;
    }

    console.log('Seeding initial exercise catalog into SQLite...');

    // 2. Insertar cada ejercicio del dataset JSON en SQLite dentro de una transacción para máximo rendimiento
    await db.withTransactionAsync(async () => {
        for (const item of exercisesData as any[]) {
            const instructionsString = typeof item.instructions === 'object' 
                ? JSON.stringify(item.instructions) 
                : item.instructions || null;

            await db.runAsync(
                `INSERT INTO exercises (id, name, category, type, equipment, gif_url, instructions)
                 VALUES (?, ?, ?, ?, ?, ?, ?);`,
                [
                    item.id || item.name.toLowerCase().replace(/\s+/g, '-'),
                    item.name,
                    item.category || item.target || 'full_body',
                    item.type || 'compound',
                    item.equipment || 'bodyweight',
                    item.gif_url || null,
                    instructionsString
                ]
            );
        }
    });

    console.log('Exercise catalog seeded successfully!');

    // 3. Sembrar rutinas populares predefinidas
    await seedPredefinedRoutines();
}

async function seedPredefinedRoutines(): Promise<void> {
    const routineCount = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM routines;'
    );

    if (routineCount && routineCount.count > 0) {
        return;
    }

    console.log('Seeding predefined workout routines...');

    await db.withTransactionAsync(async () => {
        // Rutina 1: Push Day
        await db.runAsync(
            `INSERT INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_push', 'Push Day (Empuje)', 'Enfoque hipertrofia en Pecho, Hombros y Tríceps']
        );

        // Rutina 2: Pull Day
        await db.runAsync(
            `INSERT INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_pull', 'Pull Day (Tirón)', 'Enfoque hipertrofia en Espalda, Deltoides Posterior y Bíceps']
        );

        // Rutina 3: Leg Day
        await db.runAsync(
            `INSERT INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_legs', 'Leg Day (Pierna)', 'Enfoque hipertrofia en Cuádriceps, Isquios y Gemelos']
        );
    });

    console.log('Predefined workout routines seeded successfully!');
}

