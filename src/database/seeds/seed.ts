import { db } from '../client';
import exercisesData from './data/exercises.json';

export async function seedExercises(): Promise<void> {
    try {
        // 1. Verificar si el catálogo completo ya existe (más de 100 ejercicios)
        const result = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM exercises;'
        );

        if (!result || result.count < 100) {
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

        // 2. Sembrar rutinas populares y del usuario
        await seedPredefinedRoutines();
        await seedUserRoutinesAndHistory();
    } catch (err) {
        console.warn('Error in seedExercises:', err);
    }
}

async function seedPredefinedRoutines(): Promise<void> {
    try {
        const routineCount = await db.getFirstAsync<{ count: number }>(
            'SELECT COUNT(*) as count FROM routines;'
        );

        if (routineCount && routineCount.count > 0) {
            return;
        }

        console.log('Seeding predefined workout routines...');

        await db.runAsync(
            `INSERT OR IGNORE INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_push', 'Push Day (Empuje)', 'Enfoque hipertrofia en Pecho, Hombros y Tríceps']
        );
        await db.runAsync(
            `INSERT OR IGNORE INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_pull', 'Pull Day (Tirón)', 'Enfoque hipertrofia en Espalda, Deltoides Posterior y Bíceps']
        );
        await db.runAsync(
            `INSERT OR IGNORE INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 1);`,
            ['routine_legs', 'Leg Day (Pierna)', 'Enfoque hipertrofia en Cuádriceps, Isquios y Gemelos']
        );

        console.log('Predefined workout routines seeded successfully!');
    } catch (err) {
        console.warn('Error seeding predefined routines:', err);
    }
}

export async function seedUserRoutinesAndHistory(): Promise<void> {
    try {
        // 0. Asegurar catálogo de ejercicios utilizados en el histórico para cumplir claves foráneas (FK constraints)
        const requiredExercises = [
            { id: 'pull-up', name: 'Dominadas Lastradas', category: 'back', type: 'compound', equipment: 'bodyweight' },
            { id: 'deadlift', name: 'Rackpull / Peso Muerto', category: 'back', type: 'compound', equipment: 'barbell' },
            { id: 'barbell-row', name: 'Remo Barra Tradicional', category: 'back', type: 'compound', equipment: 'barbell' },
            { id: 'biceps-curl', name: 'Bíceps Barra / Mancuerna', category: 'biceps', type: 'isolation', equipment: 'barbell' },
            { id: 'hammer-curl', name: 'Bíceps Martillo', category: 'biceps', type: 'isolation', equipment: 'dumbbell' },
            { id: 'cable-crunch', name: 'Abs Crunch Polea', category: 'waist', type: 'isolation', equipment: 'cable' },
            { id: 'barbell-squat', name: 'Sentadilla Libre', category: 'quadriceps', type: 'compound', equipment: 'barbell' },
            { id: 'hip-thrust', name: 'Hip Thrust Barra', category: 'glutes', type: 'compound', equipment: 'barbell' },
            { id: 'abductor', name: 'Abductores Máquina', category: 'glutes', type: 'isolation', equipment: 'machine' },
            { id: 'calf-raise', name: 'Gemelo Prensa / Elevar', category: 'calves', type: 'isolation', equipment: 'machine' },
            { id: 'bench-press', name: 'Press Banca Tradicional', category: 'chest', type: 'compound', equipment: 'barbell' },
            { id: 'incline-bench-press', name: 'Press Inclinado 45°', category: 'chest', type: 'compound', equipment: 'dumbbell' },
            { id: 'chest-fly', name: 'Aperturas Pecho', category: 'chest', type: 'isolation', equipment: 'cable' },
            { id: 'triceps-extension', name: 'Tríceps Tras Nuca', category: 'triceps', type: 'isolation', equipment: 'dumbbell' },
            { id: 'triceps-pushdown', name: 'Tríceps Cuerda / V', category: 'triceps', type: 'isolation', equipment: 'cable' },
            { id: 'dips', name: 'Fondos Paralelas / Tríceps', category: 'triceps', type: 'compound', equipment: 'bodyweight' },
            { id: 'leg-extension', name: 'Cuádriceps Extensión', category: 'quadriceps', type: 'isolation', equipment: 'machine' },
            { id: 'overhead-press', name: 'Press Hombro / Militar', category: 'shoulders', type: 'compound', equipment: 'barbell' },
            { id: 'lateral-raise', name: 'Elevaciones Laterales', category: 'shoulders', type: 'isolation', equipment: 'dumbbell' },
            { id: 'pullover', name: 'Pullover Polea Alta Cuerda', category: 'back', type: 'isolation', equipment: 'cable' }
        ];

        for (const ex of requiredExercises) {
            await db.runAsync(
                'INSERT OR REPLACE INTO exercises (id, name, category, type, equipment) VALUES (?, ?, ?, ?, ?);',
                [ex.id, ex.name, ex.category, ex.type, ex.equipment]
            );
        }

        // 1. Insertar Rutinas del Usuario de 4 Días
        const userRoutines = [
            {
                id: 'routine_custom_d1',
                name: 'Lunes: Espalda + Bíceps',
                description: 'Dominadas lastradas, Rackpull, Remo barra, Bíceps martillo, Abs crunch polea',
                exercises: [
                    { exerciseId: 'pull-up', order: 1, targetSets: 3, repMin: 4, repMax: 6 },
                    { exerciseId: 'deadlift', order: 2, targetSets: 4, repMin: 3, repMax: 8 },
                    { exerciseId: 'barbell-row', order: 3, targetSets: 4, repMin: 5, repMax: 8 },
                    { exerciseId: 'biceps-curl', order: 4, targetSets: 3, repMin: 8, repMax: 12 },
                    { exerciseId: 'hammer-curl', order: 5, targetSets: 3, repMin: 8, repMax: 12 },
                    { exerciseId: 'cable-crunch', order: 6, targetSets: 3, repMin: 10, repMax: 20 }
                ]
            },
            {
                id: 'routine_custom_d2',
                name: 'Martes: Tren Inferior',
                description: 'Sentadilla libre, Hip Thrust pesado (210kg), Abductores, Gemelo, Abs',
                exercises: [
                    { exerciseId: 'abductor', order: 1, targetSets: 3, repMin: 12, repMax: 15 },
                    { exerciseId: 'barbell-squat', order: 2, targetSets: 4, repMin: 6, repMax: 8 },
                    { exerciseId: 'hip-thrust', order: 3, targetSets: 5, repMin: 4, repMax: 8 },
                    { exerciseId: 'calf-raise', order: 4, targetSets: 3, repMin: 8, repMax: 15 },
                    { exerciseId: 'cable-crunch', order: 5, targetSets: 3, repMin: 10, repMax: 20 }
                ]
            },
            {
                id: 'routine_custom_d3',
                name: 'Miércoles: Pecho + Tríceps',
                description: 'Press banca, Press inclinado 45°, Aperturas, Tríceps tras nuca, Fondos',
                exercises: [
                    { exerciseId: 'bench-press', order: 1, targetSets: 3, repMin: 3, repMax: 8 },
                    { exerciseId: 'incline-bench-press', order: 2, targetSets: 3, repMin: 6, repMax: 12 },
                    { exerciseId: 'chest-fly', order: 3, targetSets: 4, repMin: 6, repMax: 12 },
                    { exerciseId: 'triceps-extension', order: 4, targetSets: 4, repMin: 10, repMax: 15 },
                    { exerciseId: 'triceps-pushdown', order: 5, targetSets: 3, repMin: 8, repMax: 12 },
                    { exerciseId: 'dips', order: 6, targetSets: 3, repMin: 6, repMax: 10 }
                ]
            },
            {
                id: 'routine_custom_d4',
                name: 'Jueves: Armday + Accesorios Pierna',
                description: 'Sentadilla ligera, Cuádriceps curl, Bíceps martillo, Tríceps V, Hombros',
                exercises: [
                    { exerciseId: 'barbell-squat', order: 1, targetSets: 3, repMin: 5, repMax: 15 },
                    { exerciseId: 'leg-extension', order: 2, targetSets: 4, repMin: 8, repMax: 12 },
                    { exerciseId: 'biceps-curl', order: 3, targetSets: 4, repMin: 6, repMax: 12 },
                    { exerciseId: 'hammer-curl', order: 4, targetSets: 4, repMin: 6, repMax: 12 },
                    { exerciseId: 'triceps-pushdown', order: 5, targetSets: 4, repMin: 6, repMax: 12 },
                    { exerciseId: 'overhead-press', order: 6, targetSets: 3, repMin: 4, repMax: 8 },
                    { exerciseId: 'lateral-raise', order: 7, targetSets: 4, repMin: 10, repMax: 20 },
                    { exerciseId: 'pullover', order: 8, targetSets: 3, repMin: 10, repMax: 15 }
                ]
            }
        ];

        for (const r of userRoutines) {
            await db.runAsync(
                'INSERT OR REPLACE INTO routines (id, name, description, is_predefined) VALUES (?, ?, ?, 0);',
                [r.id, r.name, r.description]
            );

            for (const re of r.exercises) {
                const reId = `re_${r.id}_${re.exerciseId}`;
                await db.runAsync(
                    `INSERT OR REPLACE INTO routine_exercises (id, routine_id, exercise_id, exercise_order, target_sets, target_rep_min, target_rep_max, rest_timer_seconds)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 120);`,
                    [reId, r.id, re.exerciseId, re.order, re.targetSets, re.repMin, re.repMax]
                );
            }
        }

        console.log('Seeding 3 weeks of historical workouts for user progression...');

        const now = Date.now();
        const DAY_MS = 86400000;

        // Fechas de las últimas 3 semanas (4 días por semana)
        const w1_d1 = now - 21 * DAY_MS;
        const w1_d2 = now - 20 * DAY_MS;
        const w1_d3 = now - 19 * DAY_MS;
        const w1_d4 = now - 18 * DAY_MS;

        const w2_d1 = now - 14 * DAY_MS;
        const w2_d2 = now - 13 * DAY_MS;
        const w2_d3 = now - 12 * DAY_MS;
        const w2_d4 = now - 11 * DAY_MS;

        const w3_d1 = now - 7 * DAY_MS;
        const w3_d2 = now - 6 * DAY_MS;
        const w3_d3 = now - 5 * DAY_MS;
        const w3_d4 = now - 4 * DAY_MS;

        const historySessions = [
            // SEMANA 1
            {
                id: 'sess_w1_d1',
                name: 'Lunes: Espalda + Bíceps',
                date: w1_d1,
                notes: 'Dominadas 15-17.5kg + Rackpull 120kg + Remo 80kg',
                sets: [
                    { exerciseId: 'pull-up', setOrder: 1, weightKg: 15.0, reps: 5, rpe: 7.5 },
                    { exerciseId: 'pull-up', setOrder: 2, weightKg: 17.5, reps: 5, rpe: 8.0 },
                    { exerciseId: 'deadlift', setOrder: 1, weightKg: 60, reps: 6, rpe: 6 },
                    { exerciseId: 'deadlift', setOrder: 2, weightKg: 100, reps: 6, rpe: 8 },
                    { exerciseId: 'deadlift', setOrder: 3, weightKg: 120, reps: 3, rpe: 9 },
                    { exerciseId: 'barbell-row', setOrder: 1, weightKg: 50, reps: 10, rpe: 7 },
                    { exerciseId: 'barbell-row', setOrder: 2, weightKg: 70, reps: 6, rpe: 8 },
                    { exerciseId: 'barbell-row', setOrder: 3, weightKg: 80, reps: 6, rpe: 8.5 },
                    { exerciseId: 'biceps-curl', setOrder: 1, weightKg: 30, reps: 12, rpe: 8 },
                    { exerciseId: 'hammer-curl', setOrder: 1, weightKg: 24, reps: 8, rpe: 8.5 },
                    { exerciseId: 'cable-crunch', setOrder: 1, weightKg: 56.2, reps: 20, rpe: 8.0 }
                ]
            },
            {
                id: 'sess_w1_d2',
                name: 'Martes: Tren Inferior',
                date: w1_d2,
                notes: 'Sentadilla 100kg + Hip Thrust 180kg + Gemelos',
                sets: [
                    { exerciseId: 'barbell-squat', setOrder: 1, weightKg: 60, reps: 6, rpe: 6 },
                    { exerciseId: 'barbell-squat', setOrder: 2, weightKg: 90, reps: 6, rpe: 7.5 },
                    { exerciseId: 'barbell-squat', setOrder: 3, weightKg: 100, reps: 6, rpe: 8 },
                    { exerciseId: 'hip-thrust', setOrder: 1, weightKg: 100, reps: 8, rpe: 7 },
                    { exerciseId: 'hip-thrust', setOrder: 2, weightKg: 140, reps: 6, rpe: 8 },
                    { exerciseId: 'hip-thrust', setOrder: 3, weightKg: 180, reps: 6, rpe: 8.5 },
                    { exerciseId: 'abductor', setOrder: 1, weightKg: 45, reps: 15, rpe: 7 },
                    { exerciseId: 'calf-raise', setOrder: 1, weightKg: 73, reps: 15, rpe: 8 }
                ]
            },
            {
                id: 'sess_w1_d3',
                name: 'Miércoles: Pecho + Tríceps',
                date: w1_d3,
                notes: 'Press banca 52kg + Inclinado 30kg + Aperturas 79kg',
                sets: [
                    { exerciseId: 'bench-press', setOrder: 1, weightKg: 52, reps: 8, rpe: 8 },
                    { exerciseId: 'bench-press', setOrder: 2, weightKg: 52, reps: 8, rpe: 8.5 },
                    { exerciseId: 'incline-bench-press', setOrder: 1, weightKg: 27.5, reps: 6, rpe: 7.5 },
                    { exerciseId: 'incline-bench-press', setOrder: 2, weightKg: 30.0, reps: 7, rpe: 8.5 },
                    { exerciseId: 'chest-fly', setOrder: 1, weightKg: 66, reps: 15, rpe: 8 },
                    { exerciseId: 'triceps-extension', setOrder: 1, weightKg: 18, reps: 12, rpe: 8 },
                    { exerciseId: 'triceps-pushdown', setOrder: 1, weightKg: 35.0, reps: 8, rpe: 8.5 }
                ]
            },
            {
                id: 'sess_w1_d4',
                name: 'Jueves: Armday + Accesorios Pierna',
                date: w1_d4,
                notes: 'Sentadilla 52kg + Cuádriceps 85kg + Press Hombro 64kg',
                sets: [
                    { exerciseId: 'barbell-squat', setOrder: 1, weightKg: 52, reps: 15, rpe: 7 },
                    { exerciseId: 'leg-extension', setOrder: 1, weightKg: 77, reps: 8, rpe: 8 },
                    { exerciseId: 'leg-extension', setOrder: 2, weightKg: 85, reps: 8, rpe: 8.5 },
                    { exerciseId: 'hammer-curl', setOrder: 1, weightKg: 18, reps: 12, rpe: 8 },
                    { exerciseId: 'triceps-pushdown', setOrder: 1, weightKg: 27.0, reps: 15, rpe: 8.5 },
                    { exerciseId: 'overhead-press', setOrder: 1, weightKg: 64, reps: 6, rpe: 8.5 }
                ]
            },

            // SEMANA 2
            {
                id: 'sess_w2_d1',
                name: 'Lunes: Espalda + Bíceps',
                date: w2_d1,
                notes: 'Dominadas 18.5kg + Rackpull 120kg + Remo 80kg',
                sets: [
                    { exerciseId: 'pull-up', setOrder: 1, weightKg: 18.5, reps: 5, rpe: 8.0 },
                    { exerciseId: 'pull-up', setOrder: 2, weightKg: 18.5, reps: 5, rpe: 8.5 },
                    { exerciseId: 'deadlift', setOrder: 1, weightKg: 100, reps: 6, rpe: 8 },
                    { exerciseId: 'deadlift', setOrder: 2, weightKg: 120, reps: 3, rpe: 9 },
                    { exerciseId: 'barbell-row', setOrder: 1, weightKg: 70, reps: 6, rpe: 8 },
                    { exerciseId: 'barbell-row', setOrder: 2, weightKg: 80, reps: 6, rpe: 8.5 },
                    { exerciseId: 'biceps-curl', setOrder: 1, weightKg: 30, reps: 12, rpe: 8.5 },
                    { exerciseId: 'hammer-curl', setOrder: 1, weightKg: 24, reps: 8, rpe: 8.5 },
                    { exerciseId: 'cable-crunch', setOrder: 1, weightKg: 64.0, reps: 20, rpe: 8.5 }
                ]
            },
            {
                id: 'sess_w2_d2',
                name: 'Martes: Tren Inferior',
                date: w2_d2,
                notes: 'Sentadilla 110kg + Hip Thrust 200kg x 5',
                sets: [
                    { exerciseId: 'barbell-squat', setOrder: 1, weightKg: 100, reps: 6, rpe: 8 },
                    { exerciseId: 'barbell-squat', setOrder: 2, weightKg: 110, reps: 6, rpe: 8.5 },
                    { exerciseId: 'hip-thrust', setOrder: 1, weightKg: 140, reps: 6, rpe: 8 },
                    { exerciseId: 'hip-thrust', setOrder: 2, weightKg: 180, reps: 6, rpe: 8.5 },
                    { exerciseId: 'hip-thrust', setOrder: 3, weightKg: 200, reps: 5, rpe: 9.0 },
                    { exerciseId: 'calf-raise', setOrder: 1, weightKg: 107, reps: 8, rpe: 8.5 }
                ]
            },
            {
                id: 'sess_w2_d3',
                name: 'Miércoles: Pecho + Tríceps',
                date: w2_d3,
                notes: 'Press banca 52kg + Inclinado 32.5kg + Aperturas 86kg',
                sets: [
                    { exerciseId: 'bench-press', setOrder: 1, weightKg: 52, reps: 8, rpe: 8.5 },
                    { exerciseId: 'incline-bench-press', setOrder: 1, weightKg: 32.5, reps: 6, rpe: 8.5 },
                    { exerciseId: 'chest-fly', setOrder: 1, weightKg: 86, reps: 7, rpe: 8.5 },
                    { exerciseId: 'triceps-pushdown', setOrder: 1, weightKg: 37.5, reps: 8, rpe: 8.5 },
                    { exerciseId: 'dips', setOrder: 1, weightKg: 20, reps: 8, rpe: 8.5 }
                ]
            },
            {
                id: 'sess_w2_d4',
                name: 'Jueves: Armday + Accesorios Pierna',
                date: w2_d4,
                notes: 'Cuádriceps 85kg + Bíceps 20kg + Press Hombro 64kg',
                sets: [
                    { exerciseId: 'leg-extension', setOrder: 1, weightKg: 85, reps: 8, rpe: 8 },
                    { exerciseId: 'hammer-curl', setOrder: 1, weightKg: 20, reps: 12, rpe: 8 },
                    { exerciseId: 'triceps-pushdown', setOrder: 1, weightKg: 31.5, reps: 8, rpe: 8.5 },
                    { exerciseId: 'overhead-press', setOrder: 1, weightKg: 64, reps: 6, rpe: 8.5 }
                ]
            },

            // SEMANA 3 (RECIENTE - MÁXIMOS RÉCORDS DE FUERZA)
            {
                id: 'sess_w3_d1',
                name: 'Lunes: Espalda + Bíceps',
                date: w3_d1,
                notes: 'Dominadas 20kg + Rackpull 120kg + Remo 82.5kg (¡Récord!)',
                sets: [
                    { exerciseId: 'pull-up', setOrder: 1, weightKg: 20.0, reps: 5, rpe: 9.0 },
                    { exerciseId: 'deadlift', setOrder: 1, weightKg: 120, reps: 3, rpe: 9 },
                    { exerciseId: 'barbell-row', setOrder: 1, weightKg: 80, reps: 6, rpe: 8.5 },
                    { exerciseId: 'barbell-row', setOrder: 2, weightKg: 82.5, reps: 5, rpe: 9.0 },
                    { exerciseId: 'biceps-curl', setOrder: 1, weightKg: 30, reps: 12, rpe: 8.5 },
                    { exerciseId: 'hammer-curl', setOrder: 1, weightKg: 24, reps: 8, rpe: 9.0 },
                    { exerciseId: 'cable-crunch', setOrder: 1, weightKg: 73.0, reps: 10, rpe: 9.0 }
                ]
            },
            {
                id: 'sess_w3_d2',
                name: 'Martes: Tren Inferior',
                date: w3_d2,
                notes: 'Sentadilla 120kg + Hip Thrust 210kg x 4 (¡RÉCORD HISTÓRICO!)',
                sets: [
                    { exerciseId: 'barbell-squat', setOrder: 1, weightKg: 100, reps: 6, rpe: 8 },
                    { exerciseId: 'barbell-squat', setOrder: 2, weightKg: 120, reps: 6, rpe: 8.5 },
                    { exerciseId: 'hip-thrust', setOrder: 1, weightKg: 180, reps: 6, rpe: 8.5 },
                    { exerciseId: 'hip-thrust', setOrder: 2, weightKg: 200, reps: 5, rpe: 9.0 },
                    { exerciseId: 'hip-thrust', setOrder: 3, weightKg: 210, reps: 4, rpe: 9.5 },
                    { exerciseId: 'calf-raise', setOrder: 1, weightKg: 107, reps: 8, rpe: 9.0 }
                ]
            },
            {
                id: 'sess_w3_d3',
                name: 'Miércoles: Pecho + Tríceps',
                date: w3_d3,
                notes: 'Press inclinado 35kg x 4 + Aperturas 93kg x 12 + Tríceps 40kg',
                sets: [
                    { exerciseId: 'incline-bench-press', setOrder: 1, weightKg: 32.5, reps: 6, rpe: 8.5 },
                    { exerciseId: 'incline-bench-press', setOrder: 2, weightKg: 35.0, reps: 4, rpe: 9.5 },
                    { exerciseId: 'chest-fly', setOrder: 1, weightKg: 93, reps: 12, rpe: 9.0 },
                    { exerciseId: 'triceps-extension', setOrder: 1, weightKg: 18.0, reps: 12, rpe: 8.5 },
                    { exerciseId: 'triceps-pushdown', setOrder: 1, weightKg: 40.0, reps: 8, rpe: 9.0 },
                    { exerciseId: 'dips', setOrder: 1, weightKg: 40.0, reps: 8, rpe: 9.0 }
                ]
            },
            {
                id: 'sess_w3_d4',
                name: 'Jueves: Armday + Accesorios Pierna',
                date: w3_d4,
                notes: 'Cuádriceps 90kg + Press Hombro 64kg + Bíceps martillo 20kg',
                sets: [
                    { exerciseId: 'barbell-squat', setOrder: 1, weightKg: 52.0, reps: 15, rpe: 7.0 },
                    { exerciseId: 'leg-extension', setOrder: 1, weightKg: 90, reps: 8, rpe: 9.0 },
                    { exerciseId: 'biceps-curl', setOrder: 1, weightKg: 20.0, reps: 12, rpe: 8.5 },
                    { exerciseId: 'hammer-curl', setOrder: 1, weightKg: 20, reps: 10, rpe: 8.5 },
                    { exerciseId: 'triceps-pushdown', setOrder: 1, weightKg: 31.5, reps: 8, rpe: 9.0 },
                    { exerciseId: 'overhead-press', setOrder: 1, weightKg: 64, reps: 6, rpe: 9.0 },
                    { exerciseId: 'lateral-raise', setOrder: 1, weightKg: 14.0, reps: 15, rpe: 9.0 },
                    { exerciseId: 'pullover', setOrder: 1, weightKg: 18.0, reps: 15, rpe: 8.5 }
                ]
            }
        ];

        for (const sess of historySessions) {
            await db.runAsync(
                'INSERT OR REPLACE INTO workout_sessions (id, name, date, notes) VALUES (?, ?, ?, ?);',
                [sess.id, sess.name, sess.date, sess.notes]
            );

            for (const st of sess.sets) {
                const est1RM = Math.round(st.weightKg * (1 + st.reps / 30) * 10) / 10;
                const setId = `set_hist_${sess.id}_${st.exerciseId}_${st.setOrder}`;
                await db.runAsync(
                    `INSERT OR REPLACE INTO exercise_sets (id, session_id, exercise_id, set_order, weight_kg, reps, rpe, is_warmup, estimated_1rm)
                     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?);`,
                    [setId, sess.id, st.exerciseId, st.setOrder, st.weightKg, st.reps, st.rpe, est1RM]
                );
            }
        }

        console.log('Seeded 3 weeks of custom workouts and routine exercises successfully!');
    } catch (err) {
        console.warn('Error seeding user routines and history:', err);
    }
}
