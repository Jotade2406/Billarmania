import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  StatusBar, ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { api } from '../../src/lib/api';
import { Logo } from '../../src/components/Logo';
import { C } from '../../src/theme';

export default function LoginScreen() {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'pass' | null>(null);

  async function handleLogin() {
    if (!email || !password) { Alert.alert('Campos incompletos', 'Completa el email y la contraseña'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.user.role !== 'CLIENTE') {
        Alert.alert('Acceso denegado', 'Esta app es solo para clientes. Usa el panel web si eres staff.');
        return;
      }
      await login(data.access_token, data.user);
      router.replace('/(tabs)/inicio');
    } catch (e: any) {
      Alert.alert('Error al ingresar', e?.response?.data?.message ?? 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={s.glowTop} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <View style={s.brand}>
          <Logo size={84} />
          <Text style={s.brandName}>Billarmania</Text>
          <Text style={s.brandTag}>"TU MESA TE ESPERA"</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Iniciar sesión</Text>

          <View style={[s.field, focused === 'email' && s.fieldFocused]}>
            <View style={s.fieldIcon}>
              <Ionicons name="mail-outline" size={17} color={focused === 'email' ? C.accent : C.faint} />
            </View>
            <TextInput
              style={s.input}
              placeholder="Correo electrónico"
              placeholderTextColor={C.faint}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={[s.field, focused === 'pass' && s.fieldFocused]}>
            <View style={s.fieldIcon}>
              <Ionicons name="lock-closed-outline" size={17} color={focused === 'pass' ? C.accent : C.faint} />
            </View>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Contraseña"
              placeholderTextColor={C.faint}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused('pass')}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
              <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={17} color={C.faint} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.btn} onPress={handleLogin} disabled={loading} activeOpacity={0.88}>
            {loading
              ? <ActivityIndicator color={C.bg} />
              : (
                <View style={s.btnInner}>
                  <Text style={s.btnText}>Ingresar</Text>
                  <Ionicons name="arrow-forward" size={18} color={C.bg} />
                </View>
              )}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>¿No tienes cuenta? </Text>
          <Link href="/(auth)/register" style={s.link}>Crear cuenta gratis</Link>
        </View>

        <Text style={s.legal}>Solo para clientes · Panel web para staff</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glowTop: { position: 'absolute', top: -140, alignSelf: 'center', width: 360, height: 360, borderRadius: 180, backgroundColor: C.primary, opacity: 0.15 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 },

  brand: { alignItems: 'center', gap: 4, marginBottom: 34 },
  brandName: { fontSize: 30, fontWeight: '900', color: C.cream, letterSpacing: -0.8, marginTop: 14 },
  brandTag: { fontSize: 10, fontWeight: '700', color: C.accent, letterSpacing: 2.5, fontStyle: 'italic' },

  card: { backgroundColor: C.card, borderRadius: 22, padding: 22, gap: 13, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 15, fontWeight: '800', color: C.muted, marginBottom: 2 },

  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.input, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingRight: 14, height: 54 },
  fieldFocused: { borderColor: C.borderAccent },
  fieldIcon: { width: 48, alignItems: 'center' },
  input: { flex: 1, fontSize: 15, color: C.cream },
  eyeBtn: { padding: 6 },

  btn: { backgroundColor: C.accent, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: C.bg, fontWeight: '900', fontSize: 16, letterSpacing: 0.2 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 26 },
  footerText: { color: C.faint, fontSize: 14 },
  link: { color: C.accent, fontWeight: '700', fontSize: 14 },
  legal: { textAlign: 'center', color: '#333', fontSize: 11, marginTop: 18 },
});
