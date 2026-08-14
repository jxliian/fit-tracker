
// La interfaz IExerciseRepository define el contrato limpio de lo que la aplicación puede 
// hacer con los ejercicios, sin importar cómo se almacenen (desacoplado de la base de datos).

import { Exercise } from '@domain/entities/exercise';

export interface IExerciseRepository {
    getAll(): Promise<Exercise[]>;
    getById(id: string): Promise<Exercise | null>;
    getByCategory(category: string): Promise<Exercise[]>;
}
