import { db } from '../client';
import exercisesData from './data/exercises.json';

export async function seedExercises(): Promise<void> {
    try {
        // 1. Ensure full exercise catalog exists (over 1,300 exercises)
        const result = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM exercises;'
        );

        if (!result || result.count < 1000) {
            console.log('Seeding full exercise catalog into SQLite in fast batches...');
            const items = exercisesData as any[];
            const CHUNK_SIZE = 50;

            await db.withTransactionAsync(async () => {
                for (let i = 0; i < items.length; i += CHUNK_SIZE) {
                    const chunk = items.slice(i, i + CHUNK_SIZE);
                    const placeholders: string[] = [];
                    const values: any[] = [];

                    chunk.forEach((item) => {
                        const exId = item.id || item.name.toLowerCase().replace(/\s+/g, '-');
                        const instructionsString = typeof item.instructions === 'object' 
                            ? JSON.stringify(item.instructions) 
                            : item.instructions || null;

                        placeholders.push('(?, ?, ?, ?, ?, ?, ?)');
                        values.push(
                            exId,
                            item.name,
                            item.category || item.target || 'full_body',
                            item.type || 'compound',
                            item.equipment || 'bodyweight',
                            item.gif_url || null,
                            instructionsString
                        );
                    });

                    const sql = `INSERT OR IGNORE INTO exercises (id, name, category, type, equipment, gif_url, instructions) VALUES ${placeholders.join(', ')};`;
                    await db.runAsync(sql, values);
                }
            });
            console.log('Exercise catalog seeded successfully!');
        }

        // 2. Seed basic predefined routines (Push, Pull, Legs)
        await seedPredefinedRoutines();

        // 3. Clean up user test data (history, test profile, custom test routines)
        await cleanUserTestData();
    } catch (err) {
        console.warn('Error in seedExercises:', err);
    }
}

async function seedPredefinedRoutines(): Promise<void> {
    try {
        console.log('Seeding basic predefined workout routines...');

        // Insert basic routines
        await db.runAsync(
            `INSERT OR IGNORE INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_push', 'Push Day (Empuje)', 'Pecho, Hombros y Tríceps']
        );
        await db.runAsync(
            `INSERT OR IGNORE INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_pull', 'Pull Day (Tirón)', 'Espalda, Deltoides Posterior y Bíceps']
        );
        await db.runAsync(
            `INSERT OR IGNORE INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_legs', 'Leg Day (Pierna)', 'Cuádriceps, Isquios y Gemelos']
        );

        // Required exercises for basic routines
        const basicExercises = [
            { id: 'bench-press', name: 'Press Banca Tradicional', category: 'chest', type: 'compound', equipment: 'barbell' },
            { id: 'incline-bench-press', name: 'Press Inclinado 45°', category: 'chest', type: 'compound', equipment: 'dumbbell' },
            { id: 'overhead-press', name: 'Press Hombro / Militar', category: 'shoulders', type: 'compound', equipment: 'barbell' },
            { id: 'lateral-raise', name: 'Elevaciones Laterales', category: 'shoulders', type: 'isolation', equipment: 'dumbbell' },
            { id: 'triceps-pushdown', name: 'Tríceps Cuerda / V', category: 'triceps', type: 'isolation', equipment: 'cable' },
            { id: 'pull-up', name: 'Dominadas Lastradas', category: 'back', type: 'compound', equipment: 'bodyweight' },
            { id: 'barbell-row', name: 'Remo Barra Tradicional', category: 'back', type: 'compound', equipment: 'barbell' },
            { id: 'pullover', name: 'Pullover Polea Alta Cuerda', category: 'back', type: 'isolation', equipment: 'cable' },
            { id: 'biceps-curl', name: 'Bíceps Barra / Mancuerna', category: 'biceps', type: 'isolation', equipment: 'barbell' },
            { id: 'hammer-curl', name: 'Bíceps Martillo', category: 'biceps', type: 'isolation', equipment: 'dumbbell' },
            { id: 'barbell-squat', name: 'Sentadilla Libre', category: 'quadriceps', type: 'compound', equipment: 'barbell' },
            { id: 'hip-thrust', name: 'Hip Thrust Barra', category: 'glutes', type: 'compound', equipment: 'barbell' },
            { id: 'leg-extension', name: 'Cuádriceps Extensión', category: 'quadriceps', type: 'isolation', equipment: 'machine' },
            { id: 'calf-raise', name: 'Gemelo Prensa / Elevar', category: 'calves', type: 'isolation', equipment: 'machine' },
            { id: 'cable-crunch', name: 'Abs Crunch Polea', category: 'waist', type: 'isolation', equipment: 'cable' }
        ];

        for (const ex of basicExercises) {
            await db.runAsync(
                'INSERT OR REPLACE INTO exercises (id, name, category, type, equipment) VALUES (?, ?, ?, ?, ?);',
                [ex.id, ex.name, ex.category, ex.type, ex.equipment]
            );
        }

        // Push exercises
        const pushItems = [
            { exerciseId: 'bench-press', order: 1, targetSets: 4, repMin: 6, repMax: 8 },
            { exerciseId: 'incline-bench-press', order: 2, targetSets: 3, repMin: 8, repMax: 12 },
            { exerciseId: 'overhead-press', order: 3, targetSets: 3, repMin: 6, repMax: 10 },
            { exerciseId: 'lateral-raise', order: 4, targetSets: 4, repMin: 12, repMax: 15 },
            { exerciseId: 'triceps-pushdown', order: 5, targetSets: 3, repMin: 10, repMax: 12 }
        ];
        for (const item of pushItems) {
            await db.runAsync(
                `INSERT OR REPLACE INTO routine_exercises (id, routine_id, exercise_id, exercise_order, target_sets, target_rep_min, target_rep_max, rest_timer_seconds)
                 VALUES (?, 'routine_push', ?, ?, ?, ?, ?, 120);`,
                [`re_push_${item.exerciseId}`, item.exerciseId, item.order, item.targetSets, item.repMin, item.repMax]
            );
        }

        // Pull exercises
        const pullItems = [
            { exerciseId: 'pull-up', order: 1, targetSets: 4, repMin: 6, repMax: 10 },
            { exerciseId: 'barbell-row', order: 2, targetSets: 4, repMin: 6, repMax: 8 },
            { exerciseId: 'pullover', order: 3, targetSets: 3, repMin: 10, repMax: 12 },
            { exerciseId: 'biceps-curl', order: 4, targetSets: 3, repMin: 8, repMax: 12 },
            { exerciseId: 'hammer-curl', order: 5, targetSets: 3, repMin: 8, repMax: 12 }
        ];
        for (const item of pullItems) {
            await db.runAsync(
                `INSERT OR REPLACE INTO routine_exercises (id, routine_id, exercise_id, exercise_order, target_sets, target_rep_min, target_rep_max, rest_timer_seconds)
                 VALUES (?, 'routine_pull', ?, ?, ?, ?, ?, 120);`,
                [`re_pull_${item.exerciseId}`, item.exerciseId, item.order, item.targetSets, item.repMin, item.repMax]
            );
        }

        // Legs exercises
        const legItems = [
            { exerciseId: 'barbell-squat', order: 1, targetSets: 4, repMin: 6, repMax: 8 },
            { exerciseId: 'hip-thrust', order: 2, targetSets: 4, repMin: 8, repMax: 10 },
            { exerciseId: 'leg-extension', order: 3, targetSets: 3, repMin: 10, repMax: 15 },
            { exerciseId: 'calf-raise', order: 4, targetSets: 4, repMin: 12, repMax: 15 },
            { exerciseId: 'cable-crunch', order: 5, targetSets: 3, repMin: 12, repMax: 20 }
        ];
        for (const item of legItems) {
            await db.runAsync(
                `INSERT OR REPLACE INTO routine_exercises (id, routine_id, exercise_id, exercise_order, target_sets, target_rep_min, target_rep_max, rest_timer_seconds)
                 VALUES (?, 'routine_legs', ?, ?, ?, ?, ?, 120);`,
                [`re_legs_${item.exerciseId}`, item.exerciseId, item.order, item.targetSets, item.repMin, item.repMax]
            );
        }

        console.log('Basic predefined workout routines seeded successfully!');
    } catch (err) {
        console.warn('Error seeding predefined routines:', err);
    }
}

export async function cleanUserTestData(): Promise<void> {
    try {
        console.log('Cleaning up test user data and custom test routines...');
        await db.runAsync('DELETE FROM user_profile;');
        await db.runAsync('DELETE FROM workout_sessions;');
        await db.runAsync('DELETE FROM exercise_sets;');
        await db.runAsync('DELETE FROM routines WHERE is_predefined = 0;');
        await db.runAsync("DELETE FROM routine_exercises WHERE routine_id NOT IN ('routine_push', 'routine_pull', 'routine_legs');");
        console.log('User test data cleaned up successfully!');
    } catch (err) {
        console.warn('Error cleaning user test data:', err);
    }
}
