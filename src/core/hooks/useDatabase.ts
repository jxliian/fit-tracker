import { useState, useEffect } from 'react';
import { initDatabase } from '@database/schema/init';
import { seedExercises } from '@database/seeds/seed';

export interface UseDatabaseResult {
  isReady: boolean;
  error: Error | null;
}

export function useDatabase(): UseDatabaseResult {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function prepareDatabase() {
      try {
        // 1. Inicializar esquema de tablas SQL
        await initDatabase();

        // 2. Poblar catálogo de ejercicios desde JSON si es primera ejecución
        await seedExercises();

        setIsReady(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }

    prepareDatabase();
  }, []);

  return { isReady, error };
}
