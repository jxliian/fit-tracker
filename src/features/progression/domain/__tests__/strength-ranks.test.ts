import { calculateStrengthRank } from '../strength-ranks';

describe('Strength Ranks Engine', () => {
  it('should return WOOD rank when ratio is very low', () => {
    // 40kg 1RM / 80kg male = 0.5x BW
    const rank = calculateStrengthRank(40, 80, 'male', 'compound');
    expect(rank.tier).toBe('WOOD');
    expect(rank.label).toBe('Madera');
    expect(rank.emoji).toBe('');
    expect(rank.weightNeededForNextTierKg).toBeGreaterThan(0);
  });

  it('should return SILVER rank for 1.33x BW male bench press', () => {
    // 100kg 1RM / 75kg male = 1.33x BW
    const rank = calculateStrengthRank(100, 75, 'male', 'compound');
    expect(rank.tier).toBe('SILVER');
    expect(rank.label).toBe('Plata');
    expect(rank.emoji).toBe('');
  });

  it('should return DIAMOND rank for 2.1x BW male squat', () => {
    // 170kg 1RM / 80kg male = 2.125x BW
    const rank = calculateStrengthRank(170, 80, 'male', 'compound');
    expect(rank.tier).toBe('DIAMOND');
    expect(rank.label).toBe('Diamante');
    expect(rank.emoji).toBe('');
  });

  it('should scale female thresholds appropriately', () => {
    // 70kg 1RM / 60kg female = 1.16x BW raw -> normalized = 1.69 -> GOLD
    const rank = calculateStrengthRank(70, 60, 'female', 'compound');
    expect(rank.tier).toBe('GOLD');
    expect(rank.label).toBe('Oro');
    expect(rank.emoji).toBe('');
  });
});
