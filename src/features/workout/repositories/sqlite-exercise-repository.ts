import { db } from '@database/client';
import { Exercise } from '@domain/entities/exercise';
import { IExerciseRepository } from '@domain/exercise-repository';

export class SqliteExerciseRepository implements IExerciseRepository {
    async getAll(): Promise<Exercise[]> {
        const rows = await db.getAllAsync<any>('SELECT * FROM exercises ORDER BY name ASC;');
        return rows.map(this.mapRowToExercise);
    }

    async getById(id: string): Promise<Exercise | null> {
        const row = await db.getFirstAsync<any>('SELECT * FROM exercises WHERE id = ?;', [id]);
        if (!row) return null;
        return this.mapRowToExercise(row);
    }

    async getByCategory(category: string): Promise<Exercise[]> {
        const rows = await db.getAllAsync<any>(
            'SELECT * FROM exercises WHERE category = ? ORDER BY name ASC;',
            [category]
        );
        return rows.map(this.mapRowToExercise);
    }

    // Mapper helper para parsear los JSONs almacenados como texto
    private mapRowToExercise(row: any): Exercise {
        return {
            id: row.id,
            name: row.name,
            category: row.category,
            type: row.type,
            equipment: row.equipment,
            gifUrl: row.gif_url,
            instructions: row.instructions ? JSON.parse(row.instructions) : []
        };
    }
}
