export type Sex = 'male' | 'female';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  bodyWeightKg: number;
  experienceLevel: ExperienceLevel;
  language?: 'es' | 'en';
  avatarKey?: string | null;
  createdAt: number;
}
