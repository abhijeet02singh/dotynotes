import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import {
  initializeNotificationsAsync,
  addNotificationResponseListener,
} from './src/services/notificationService';
import { getSettingAsync, setSettingAsync } from './src/services/notesDb';

function MainApp() {
  const { isDark, theme } = useTheme();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function checkFirstLaunch() {
      try {
        const completed = await getSettingAsync('has_completed_onboarding', '0');
        if (isMounted) {
          setHasCompletedOnboarding(completed === '1');
        }
      } catch (_) {
        if (isMounted) {
          setHasCompletedOnboarding(true);
        }
      }
    }
    checkFirstLaunch();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCompleteOnboarding = useCallback(async () => {
    try {
      await setSettingAsync('has_completed_onboarding', '1');
    } catch (_) {}
    setHasCompletedOnboarding(true);
  }, []);

  return (
    <>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={theme.colors.background}
        translucent={false}
      />
      {hasCompletedOnboarding === null ? (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
      ) : !hasCompletedOnboarding ? (
        <OnboardingScreen onComplete={handleCompleteOnboarding} />
      ) : (
        <HomeScreen />
      )}
    </>
  );
}

export default function App() {
  useEffect(() => {
    initializeNotificationsAsync();

    // Listen for notification interactions (e.g., user taps notification in status bar)
    const responseSub = addNotificationResponseListener((response) => {
      const noteId = response?.notification?.request?.content?.data?.noteId;
      console.log('[DotyNotes] User responded to notification for noteId:', noteId);
    });

    return () => {
      if (responseSub && typeof responseSub.remove === 'function') {
        responseSub.remove();
      }
    };
  }, []);

  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
