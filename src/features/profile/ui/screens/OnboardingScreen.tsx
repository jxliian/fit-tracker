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
  StatusBar,
  Image
} from 'react-native';
import { colors } from '@core/theme/colors';
import { Sex, ExperienceLevel } from '@domain/entities/user-profile';

const AVATAR_OPTIONS = [
  { key: 'lion', label: 'León', image: require('../../../../../assets/avatars/lion.png') },
  { key: 'bear', label: 'Oso', image: require('../../../../../assets/avatars/bear.png') },
  { key: 'panther', label: 'Pantera', image: require('../../../../../assets/avatars/panther.png') },
  { key: 'eagle', label: 'Águila', image: require('../../../../../assets/avatars/eagle.png') }
];

export interface OnboardingScreenProps {
  onComplete: (profile: {
    name: string;
    age: number;
    sex: Sex;
    heightCm: number;
    bodyWeightKg: number;
    experienceLevel: ExperienceLevel;
    avatarKey?: string | null;
  }) => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('24');
  const [sex, setSex] = useState<Sex>('male');
  const [heightCm, setHeightCm] = useState('175');
  const [bodyWeightKg, setBodyWeightKg] = useState('75');
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('intermediate');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
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

    // Si no ha elegido avatar explícitamente (o iniciales), se asigna uno aleatorio
    let finalAvatarKey = selectedAvatar;
    if (finalAvatarKey === undefined || finalAvatarKey === null) {
      const keys = ['lion', 'bear', 'panther', 'eagle'];
      finalAvatarKey = keys[Math.floor(Math.random() * keys.length)];
    }

    onComplete({
      name: name.trim(),
      age: parsedAge,
      sex,
      heightCm: parsedHeight,
      bodyWeightKg: parsedWeight,
      experienceLevel,
      avatarKey: finalAvatarKey === 'initials' ? null : finalAvatarKey
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
            Personaliza tus datos y elige tu Avatar Memoji de animal gym para comenzar.
          </Text>
        </View>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        {/* Selector de Avatar Memoji */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Elige tu Avatar de Animal Memoji (Requerido)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarScroll}>
            {AVATAR_OPTIONS.map((av) => (
              <TouchableOpacity
                key={av.key}
                style={[
                  styles.avatarCard,
                  selectedAvatar === av.key && styles.avatarCardSelected
                ]}
                onPress={() => setSelectedAvatar(av.key)}
                activeOpacity={0.8}
              >
                <Image source={av.image} style={styles.avatarImg} />
                <Text style={[styles.avatarLabel, selectedAvatar === av.key && styles.avatarLabelSelected]}>
                  {av.label}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Opción Iniciales */}
            <TouchableOpacity
              style={[
                styles.avatarCard,
                selectedAvatar === 'initials' && styles.avatarCardSelected
              ]}
              onPress={() => setSelectedAvatar('initials')}
              activeOpacity={0.8}
            >
              <View style={styles.initialsPlaceholder}>
                <Text style={styles.initialsText}>{name.trim() ? name.trim().substring(0, 2).toUpperCase() : 'AA'}</Text>
              </View>
              <Text style={[styles.avatarLabel, selectedAvatar === 'initials' && styles.avatarLabelSelected]}>
                Iniciales
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

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
  header: { alignItems: 'center', marginBottom: 20 },
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
  formGroup: { marginBottom: 18 },
  label: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  
  // Avatares Scroll & Cards
  avatarScroll: { paddingVertical: 4, paddingRight: 10 },
  avatarCard: {
    width: 78,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    marginRight: 10
  },
  avatarCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '20'
  },
  avatarImg: { width: 56, height: 56, borderRadius: 28, marginBottom: 4 },
  avatarLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
  avatarLabelSelected: { color: colors.primary, fontWeight: '700' },
  initialsPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4
  },
  initialsText: { color: colors.textPrimary, fontWeight: '800', fontSize: 18 },

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
