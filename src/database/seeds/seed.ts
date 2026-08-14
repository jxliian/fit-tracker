import { db } from '../client';

// Ajusta la ruta si tu archivo JSON tiene otro nombre
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

    // 2. Insertar cada ejercicio del dataset JSON en SQLite
    for (const item of exercisesData) {
        await db.runAsync(
            `INSERT INTO exercises (id, name, category, type, equipment, gif_url, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
            [
                item.id || item.name.toLowerCase().replace(/\s+/g, '-'),
                item.name,
                item.category || item.targetMuscle || 'full_body',
                item.type || 'compound',
                item.equipment || 'bodyweight',
                item.gifUrl || null,
                Array.isArray(item.instructions) ? JSON.stringify(item.instructions) : item.instructions || null
            ]
        );
    }

    console.log('Exercise catalog seeded successfully!');
}
