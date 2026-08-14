import * as SQLite from 'expo-sqlite';

// Abre la base de datos 'fittracker.db' (si no existe, la crea en el almacenamiento interno del dispositivo)
export const db = SQLite.openDatabaseSync('fittracker.db');
