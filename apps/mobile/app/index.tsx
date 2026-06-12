import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../src/store/auth.store';
import { C } from '../src/theme';

export default function Index() {
  const { isAuthenticated } = useAuthStore();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync('onboarding_done').then((v) => setOnboarded(v === 'true'));
  }, []);

  if (onboarded === null) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  if (isAuthenticated) return <Redirect href="/(tabs)/inicio" />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(auth)/login" />;
}
