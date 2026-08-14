/**
 * Utilidad de cálculo de racha (Streak)
 * Regla: La racha se rompe ÚNICAMENTE si hay más de 3 días de descanso consecutivos
 * entre entrenamientos (es decir, una brecha de 4 días o más sin entrenar).
 */

export interface StreakResult {
  currentStreak: number;
  bestStreak: number;
}

export function calculateStreak(
  sessionTimestamps: number[],
  maxRestDaysAllowed = 3
): StreakResult {
  if (!sessionTimestamps || sessionTimestamps.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  // Obtener fechas únicas a medianoche (timestamps de YYYY-MM-DD 00:00:00) ordenadas descendentemente
  const uniqueDateMs = Array.from(
    new Set(
      sessionTimestamps.map((ts) => {
        const d = new Date(ts);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })
    )
  ).sort((a, b) => b - a);

  if (uniqueDateMs.length === 0) {
    return { currentStreak: 0, bestStreak: 0 };
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const today = new Date();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  // Días de diferencia desde la última sesión realizada
  const daysSinceLastWorkout = Math.floor((todayMs - uniqueDateMs[0]) / ONE_DAY_MS);

  let currentStreak = 0;

  // Si no han pasado más de (maxRestDaysAllowed + 1) días desde el último entreno, la racha sigue activa
  if (daysSinceLastWorkout <= maxRestDaysAllowed + 1) {
    currentStreak = 1;
    for (let i = 0; i < uniqueDateMs.length - 1; i++) {
      const diffDays = Math.round((uniqueDateMs[i] - uniqueDateMs[i + 1]) / ONE_DAY_MS);
      if (diffDays <= maxRestDaysAllowed + 1) {
        currentStreak++;
      } else {
        break; // Rompe racha actual por exceso de descanso
      }
    }
  }

  // Calcular la mejor racha histórica
  let bestStreak = 1;
  let tempStreak = 1;

  for (let i = 0; i < uniqueDateMs.length - 1; i++) {
    const diffDays = Math.round((uniqueDateMs[i] - uniqueDateMs[i + 1]) / ONE_DAY_MS);
    if (diffDays <= maxRestDaysAllowed + 1) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak)
  };
}
