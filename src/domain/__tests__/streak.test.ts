import { calculateStreak } from '../streak';

describe('calculateStreak', () => {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  test('returns 0 for empty sessions', () => {
    const res = calculateStreak([]);
    expect(res.currentStreak).toBe(0);
    expect(res.bestStreak).toBe(0);
  });

  test('keeps streak active with up to 3 consecutive rest days', () => {
    // Entrenó hoy, hace 2 días (1 día descanso), hace 5 días (2 días descanso)
    const sessions = [
      todayMs,
      todayMs - 2 * ONE_DAY_MS,
      todayMs - 5 * ONE_DAY_MS
    ];

    const res = calculateStreak(sessions, 3);
    expect(res.currentStreak).toBe(3);
    expect(res.bestStreak).toBe(3);
  });

  test('breaks streak if there are more than 3 consecutive rest days (4+ days gap)', () => {
    // Entrenó hoy, y la sesión anterior fue hace 6 días (5 días de descanso)
    const sessions = [
      todayMs,
      todayMs - 6 * ONE_DAY_MS,
      todayMs - 7 * ONE_DAY_MS
    ];

    const res = calculateStreak(sessions, 3);
    expect(res.currentStreak).toBe(1);
    expect(res.bestStreak).toBe(2); // La racha de hace 6 y 7 días sumaba 2
  });
});
