import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { api } from '../../src/lib/api';
import { Logo } from '../../src/components/Logo';
import { C } from '../../src/theme';

type Field = 'name' | 'email' | 'phone' | 'pass';

export default function RegisterScreen() {
  const { login } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<Field | null>(null);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Campos incompletos', 'Nombre, email y contraseña son obligatorios');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Contraseña muy corta', 'Debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, phone, password, role: 'CLIENTE' });
      await login(data.access_token, data.user);
      router.replace('/(tabs)/inicio');
    } catch (e: any) {
      Alert.alert('Error al registrar', e?.response?.data?.message ?? 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  }

  const fields: { key: Field; icon: any; placeholder: string; value: string; set: (v: string) => void; keyboard?: any; optional?: boolean }[] = [
    { key: 'name',  icon: 'person-outline', placeholder: 'Nombre completo',     value: name,  set: setName },
    { key: 'email', icon: 'mail-outline',   placeholder: 'Correo electrónico',  value: email, set: setEmail, keyboard: 'email-address' },
    { key: 'phone', icon: 'call-outline',   placeholder: 'Teléfono (opcional)', value: phone, set: setPhone, keyboard: 'phone-pad', optional: true },
  ];

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <TouchableOpacity style={s.back} onPress={() => router.back()} activeOpacity={0.7}>
          <View style={s.backIcon}>
            <Ionicons name="chevron-back" size={18} color={C.accent} />
          </View>
          <Text style={s.backText}>Volver al login</Text>
        </TouchableOpacity>

        <View style={s.brand}>
          <Logo size={68} />
          <Text style={s.title}>Crear cuenta</Text>
          <Text style={s.subtitle}>Únete y reserva tu mesa favorita</Text>
        </View>

        <View style={s.card}>
          {fields.map(({ key, icon, placeholder, value, set, keyboard, optional }) => (
            <View key={key} style={[s.field, focused === key && s.fieldFocused]}>
              <View style={s.fieldIcon}>
                <Ionicons name={icon} size={17} color={focused === key ? C.accent : C.faint} />
              </View>
              <TextInput
                style={s.input}
                placeholder={placeholder}
                placeholderTextColor={C.faint}
                keyboardType={keyboard ?? 'default'}
                autoCapitalize={key === 'email' ? 'none' : 'words'}
                autoCorrect={false}
                value={value}
                onChangeText={set}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
              />
              {optional && <Text style={s.optTag}>opcional</Text>}
            </View>
          ))}

          <View style={[s.field, focused === 'pass' && s.fieldFocused]}>
            <View style={s.fieldIcon}>
              <Ionicons name="lock-closed-outline" size={17} color={focused === 'pass' ? C.accent : C.faint} />
            </View>
            <TextInput
              style={[s.input, { flex: 1 }]}
              placeholder="Contraseña (mín. 6 caracteres)"
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

          <TouchableOpacity style={s.btn} onPress={handleRegister} disabled={loading} activeOpacity={0.88}>
            {loading
              ? <ActivityIndicator color={C.bg} />
              : (
                <View style={s.btnInner}>
                  <Text style={s.btnText}>Crear cuenta</Text>
                  <Ionicons name="arrow-forward" size={18} color={C.bg} />
                </View>
              )}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>¿Ya tienes cuenta? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 50, paddingBottom: 40 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  backIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  backText: { color: C.faint, fontSize: 13, fontWeight: '600' },

  brand: { alignItems: 'center', gap: 5, marginBottom: 26 },
  title: { fontSize: 26, fontWeight: '900', color: C.cream, letterSpacing: -0.6, marginTop: 12 },
  subtitle: { fontSize: 13, color: C.muted },

  card: { backgroundColor: C.card, borderRadius: 22, padding: 20, gap: 12, borderWidth: 1, borderColor: C.border },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.input, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, paddingRight: 14, height: 54 },
  fieldFocused: { borderColor: C.borderAccent },
  fieldIcon: { width: 46, alignItems: 'center' },
  input: { flex: 1, fontSize: 15, color: C.cream },
  optTag: { fontSize: 10, color: C.faint, fontWeight: '700', borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  eyeBtn: { padding: 6 },

  btn: { backgroundColor: C.accent, borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 4, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnText: { color: C.bg, fontWeight: '900', fontSize: 16, letterSpacing: 0.2 },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 22 },
  footerText: { color: C.faint, fontSize: 14 },
  link: { color: C.accent, fontWeight: '700', fontSize: 14 },
});
