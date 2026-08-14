import {
  calculate1RM,
  calculateEffectiveVolume,
  calculateProgressionRecommendation
} from '../calculators';
import { ExerciseSet } from '@domain/entities/exercise-set';

describe('Progression Engine Calculators', () => {
  describe('calculate1RM', () => {
    it('should return correct 1RM for 100kg x 10 reps @ RPE 10', () => {
      // Epley: 100 * (1 + 10/30) = 133.33
      // Brzycki: 100 * (36 / (37 - 10)) = 133.33
      // Average: 133.3 kg
      const result = calculate1RM(100, 10, 10);
      expect(result).toBeCloseTo(133.3, 1);
    });

    it('should return exact weight when 1 rep @ RPE 10', () => {
      const result = calculate1RM(120, 1, 10);
      expect(result).toBe(120);
    });

    it('should handle RIR correctly (100kg x 8 reps @ RPE 8 -> RIR 2)', () => {
      // rMax = 8 + 2 = 10 reps
      const result = calculate1RM(100, 8, 8);
      expect(result).toBeCloseTo(133.3, 1);
    });

    it('should return 0 when weight or reps are <= 0', () => {
      expect(calculate1RM(0, 10, 10)).toBe(0);
      expect(calculate1RM(100, 0, 10)).toBe(0);
    });
  });

  describe('calculateEffectiveVolume', () => {
    it('should ignore warmup sets and sum effective volume', () => {
      const sets: ExerciseSet[] = [
        {
          id: '1',
          sessionId: 's1',
          exerciseId: 'e1',
          setOrder: 1,
          weightKg: 60,
          reps: 10,
          rpe: 6,
          isWarmup: true,
          estimated1RM: 80
        },
        {
          id: '2',
          sessionId: 's1',
          exerciseId: 'e1',
          setOrder: 2,
          weightKg: 100,
          reps: 8,
          rpe: 9,
          isWarmup: false,
          estimated1RM: 130
        }
      ];

      // Set 2 volume = 100 * 8 * 1.0 = 800
      const volume = calculateEffectiveVolume(sets);
      expect(volume).toBe(800);
    });
  });

  describe('calculateProgressionRecommendation', () => {
    it('should suggest INCREMENT when target reps reached with RIR >= 1.0', () => {
      const sets: ExerciseSet[] = [
        {
          id: '1',
          sessionId: 's1',
          exerciseId: 'e1',
          setOrder: 1,
          weightKg: 100,
          reps: 10,
          rpe: 8.5,
          isWarmup: false,
          estimated1RM: 135
        }
      ];

      const rec = calculateProgressionRecommendation(sets, { min: 6, max: 10 }, 'compound');
      expect(rec.action).toBe('INCREMENT');
      expect(rec.recommendedWeightKg).toBe(102.5); // +2.5kg for compound
    });

    it('should suggest DELOAD when min reps failed and RIR < 0.5', () => {
      const sets: ExerciseSet[] = [
        {
          id: '1',
          sessionId: 's1',
          exerciseId: 'e1',
          setOrder: 1,
          weightKg: 100,
          reps: 4,
          rpe: 10,
          isWarmup: false,
          estimated1RM: 110
        }
      ];

      const rec = calculateProgressionRecommendation(sets, { min: 6, max: 10 }, 'compound');
      expect(rec.action).toBe('DELOAD');
      expect(rec.recommendedWeightKg).toBe(95); // 100 * 0.95 = 95kg
    });

    it('should suggest MAINTAIN when reps are within range but RIR < 1.0', () => {
      const sets: ExerciseSet[] = [
        {
          id: '1',
          sessionId: 's1',
          exerciseId: 'e1',
          setOrder: 1,
          weightKg: 100,
          reps: 8,
          rpe: 9.5,
          isWarmup: false,
          estimated1RM: 125
        }
      ];

      const rec = calculateProgressionRecommendation(sets, { min: 6, max: 10 }, 'compound');
      expect(rec.action).toBe('MAINTAIN');
      expect(rec.recommendedWeightKg).toBe(100);
      expect(rec.recommendedReps).toBe(9);
    });
  });
});
