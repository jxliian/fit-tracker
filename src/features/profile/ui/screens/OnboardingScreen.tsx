import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { colors } from '@core/theme/colors';
import { Sex, ExperienceLevel } from '@domain/entities/user-profile';

export interface OnboardingScreenProps {
  onComplete: (profile: {
    name: string;
    age: number;
    sex: Sex;
    heightCm: number;
    bodyWeightKg: number;
    experienceLevel: ExperienceLevel;
  }) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('24');
  const [sex, setSex] = useState<Sex>('male');
  const [heightCm, setHeightCm] = useState('175');
  const [bodyWeightKg, setBodyWeightKg] = useState('75');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) {
      setErrorMessage('Por favor introduce tu nombre.');
      return;
    }

    const parsedAge = parseInt(age, 10);
    const parsedHeight = parseFloat(heightCm);
    const parsedWeight = parseFloat(bodyWeightKg);

    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) {
      setErrorMessage('Por favor introduce una edad válida.');
      return;
    }

    if (isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      setErrorMessage('Por favor introduce un peso corporal válido.');
      return;
    }

    onComplete({
      name: name.trim(),
      age: parsedAge,
      sex,
      heightCm: parsedHeight,
      bodyWeightKg: parsedWeight,
      experienceLevel
    });
  };

  const topInset = Platform.OS === 'android' ? (StatusBar.currentHeight || 36) + 16 : 24;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.header}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>FITTRACKER</Text>
          </View>
          <Text style={styles.title}>Configuración de Perfil</Text>
          <Text style={styles.subtitle}>
            Introduce tus datos biométricos para personalizar el motor de sobrecarga progresiva y rangos de fuerza.
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre o Apodo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. Alexander"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, styles.half]}>
            <Text style={styles.label}>Edad</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={age}
              onChangeText={setAge}
            />
          </View>

          <View style={[styles.formGroup, styles.half]}>
            <Text style={styles.label}>Peso Corporal (kg)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={bodyWeightKg}
              onChangeText={setBodyWeightKg}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Sexo biológico (Cálculo de Percentiles)</Text>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, sex === 'male' && styles.segmentActive]}
              onPress={() => setSex('male')}
            >
              <Text style={[styles.segmentText, sex === 'male' && styles.segmentTextActive]}>
                Masculino
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, sex === 'female' && styles.segmentActive]}
              onPress={() => setSex('female')}
            >
              <Text style={[styles.segmentText, sex === 'female' && styles.segmentTextActive]}>
                Femenino
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Nivel de experiencia</Text>
          <View style={styles.levelRow}>
            {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[styles.levelChip, experienceLevel === lvl && styles.levelChipActive]}
                onPress={() => setExperienceLevel(lvl)}
              >
                <Text
                  style={[
                    styles.levelChipText,
                    experienceLevel === lvl && styles.levelChipTextActive
                  ]}
                >
                  {lvl === 'beginner'
                    ? 'Principiante'
                    : lvl === 'intermediate'
                    ? 'Intermedio'
                    : 'Avanzado'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Comenzar Entrenamiento</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28 },
  brandBadge: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 12
  },
  brandBadgeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 1.5
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  errorText: { color: colors.danger, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  formGroup: { marginBottom: 20 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 15
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { width: '48%' },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border
  },
  segment: { flex: 1, paddingVertical: 11, borderRadius: 8, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '700' },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  levelChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3
  },
  levelChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '20' },
  levelChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  levelChipTextActive: { color: colors.primary, fontWeight: '700' },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 }
});
