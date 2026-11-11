import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold } from '@expo-google-fonts/be-vietnam-pro';
import { LoginScreen } from './src/screens/LoginScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { session } from './src/session';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({ BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold });
  const [token, setToken] = useState(() => session.load());

  const login = useCallback((next: string) => { session.save(next); setToken(next); }, []);
  const logout = useCallback(() => { session.save(''); setToken(''); }, []);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}><ActivityIndicator color={colors.purple} /></View>;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {token ? <ProductsScreen token={token} onLogout={logout} /> : <LoginScreen onLogin={login} />}
    </SafeAreaProvider>
  );
}
