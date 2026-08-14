import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { initDatabase } from '@database/schema/init';
import { seedExercises } from '@database/seeds/seed';
import { db } from '@database/client';
import { colors } from '@core/theme/colors';
import { UserProfile, Sex, ExperienceLevel } from '@domain/entities/user-profile';
import { OnboardingScreen } from '@features/profile/ui/screens/OnboardingScreen';

export default function App() {
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'routines' | 'catalog' | 'profile'>('home');

  useEffect(() => {
    async function prepareApp() {
      try {
        // 1. Inicializar esquema de tablas SQLite
        await initDatabase();

        // 2. Sembrar catálogo de ejercicios y rutinas predefinidas
        await seedExercises();

        // 3. Comprobar si existe perfil de usuario
        const profile = await db.getFirstAsync<any>('SELECT * FROM user_profile LIMIT 1;');
        if (profile) {
          setUserProfile({
            id: profile.id,
            name: profile.name,
            age: profile.age,
            sex: profile.sex as Sex,
            heightCm: profile.height_cm,
            bodyWeightKg: profile.body_weight_kg,
            experienceLevel: profile.experience_level as ExperienceLevel,
            createdAt: profile.created_at
          });
        }
      } catch (error) {
        console.error('Error al inicializar la base de datos de FitTracker:', error);
      } finally {
        setIsInitializing(false);
      }
    }

    prepareApp();
  }, []);

  const handleCompleteOnboarding = async (data: {
    name: string;
    age: number;
    sex: Sex;
    heightCm: number;
    bodyWeightKg: number;
    experienceLevel: ExperienceLevel;
  }) => {
    const newProfile: UserProfile = {
      id: 'usr_' + Date.now(),
      ...data,
      createdAt: Date.now()
    };

    await db.runAsync(
      `INSERT INTO user_profile (id, name, age, sex, height_cm, body_weight_kg, experience_level, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        newProfile.id,
        newProfile.name,
        newProfile.age,
        newProfile.sex,
        newProfile.heightCm,
        newProfile.bodyWeightKg,
        newProfile.experienceLevel,
        newProfile.createdAt
      ]
    );

    setUserProfile(newProfile);
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando catálogo de ejercicios y base de datos local...</Text>
      </View>
    );
  }

  // Si no hay perfil, mostramos el Onboarding
  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <OnboardingScreen onComplete={handleCompleteOnboarding} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Cabecera Principal */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>¡Hola, {userProfile.name}! 👋</Text>
          <Text style={styles.subGreetingText}>¿Listo para superar tus marcas hoy?</Text>
        </View>
        <View style={styles.profileBadge}>
          <Text style={styles.profileBadgeText}>{userProfile.bodyWeightKg} kg</Text>
        </View>
      </View>

      {/* Contenido Principal de la Pantalla */}
      <View style={styles.mainContent}>
        {activeTab === 'home' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔥 Inicio Rápido de Entrenamiento</Text>
            <Text style={styles.cardSubtitle}>Comienza una sesión en blanco o selecciona una rutina.</Text>
            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>+ Empezar Entrenamiento Libre</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'routines' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 Rutinas Prediseñadas</Text>
            <Text style={styles.cardSubtitle}>Push / Pull / Legs integrados con sobrecarga automática.</Text>
          </View>
        )}

        {activeTab === 'catalog' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏋️‍♂️ Catálogo (+1.500 Ejercicios)</Text>
            <Text style={styles.cardSubtitle}>Busca ejercicios por grupo muscular y equipamiento.</Text>
          </View>
        )}

        {activeTab === 'profile' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>👤 Perfil de {userProfile.name}</Text>
            <Text style={styles.profileDetail}>Edad: {userProfile.age} años</Text>
            <Text style={styles.profileDetail}>Sexo: {userProfile.sex === 'male' ? 'Masculino' : 'Femenino'}</Text>
            <Text style={styles.profileDetail}>Peso Corporal: {userProfile.bodyWeightKg} kg</Text>
            <Text style={styles.profileDetail}>Nivel: {userProfile.experienceLevel}</Text>
          </View>
        )}
      </View>

      {/* Barra de Navegación Inferior */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
          <Text style={[styles.navIcon, activeTab === 'home' && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Inicio</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('routines')}>
          <Text style={[styles.navIcon, activeTab === 'routines' && styles.navIconActive]}>📋</Text>
          <Text style={[styles.navLabel, activeTab === 'routines' && styles.navLabelActive]}>Rutinas</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('catalog')}>
          <Text style={[styles.navIcon, activeTab === 'catalog' && styles.navIconActive]}>🏋️</Text>
          <Text style={[styles.navLabel, activeTab === 'catalog' && styles.navLabelActive]}>Ejercicios</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.navIcon, activeTab === 'profile' && styles.navIconActive]}>👤</Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>Perfil</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12
  },
  greetingText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800'
  },
  subGreetingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2
  },
  profileBadge: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20
  },
  profileBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13
  },
  mainContent: {
    flex: 1,
    padding: 20
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 20
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6
  },
  cardSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20
  },
  profileDetail: {
    color: colors.textPrimary,
    fontSize: 15,
    marginVertical: 4
  },
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'space-around'
  },
  navItem: {
    alignItems: 'center'
  },
  navIcon: {
    fontSize: 20,
    opacity: 0.6
  },
  navIconActive: {
    opacity: 1.0
  },
  navLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700'
  }
});
