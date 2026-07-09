import { useEffect } from 'react';
import { Stack } from 'expo-router';
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../components/ToastProvider';
import C from '../constants/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <KeyboardProvider>
      <AuthProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
        </ToastProvider>
      </AuthProvider>
    </KeyboardProvider>
  );
}
