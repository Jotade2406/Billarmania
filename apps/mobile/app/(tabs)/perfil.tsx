import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, StatusBar, Image, ActivityIndicator, Switch, Modal, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../src/store/auth.store';
import { api } from '../../src/lib/api';
import { C } from '../../src/theme';

export default function PerfilScreen() {
  const { user, logout, login, token } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [showTerms, setShowTerms] = useState(false);

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  }

  async function handleChangeAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Se necesita permiso para acceder a tus fotos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setUploading(true);
    try {
      const avatarUrl = `data:image/jpeg;base64,${result.assets[0].base64}`;
      const { data } = await api.put('/auth/profile', { avatarUrl });
      if (user && token) {
        await login(token, { ...user, avatarUrl: data.avatarUrl });
      }
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la foto');
    } finally {
      setUploading(false);
    }
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.headerTitle}>Billarmania</Text>

        {/* Avatar */}
        <View style={s.hero}>
          <TouchableOpacity onPress={handleChangeAvatar} style={s.avatarWrap} activeOpacity={0.8}>
            <View style={s.avatarRing}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={s.avatarImg} />
              ) : (
                <View style={s.avatarPlaceholder}>
                  <Text style={s.avatarLetter}>{initial}</Text>
                </View>
              )}
            </View>
            <View style={s.avatarBadge}>
              {uploading
                ? <ActivityIndicator size="small" color={C.bg} />
                : <Text style={s.avatarBadgeText}>8</Text>
              }
            </View>
          </TouchableOpacity>
          <Text style={s.name}>{user?.name}</Text>
          <View style={s.memberPill}>
            <Text style={s.memberPillText}>MIEMBRO BILLARMANIA</Text>
          </View>
          <Text style={s.email}>{user?.email}</Text>
        </View>

        {/* Menú */}
        <View style={s.menu}>
          <TouchableOpacity style={s.menuItem} onPress={() => router.push('/(tabs)/mis-reservas')} activeOpacity={0.7}>
            <View style={s.menuIcon}>
              <Ionicons name="calendar" size={16} color={C.accent} />
            </View>
            <Text style={s.menuLabel}>Historial y mis reservas</Text>
            <Ionicons name="chevron-forward" size={15} color={C.faint} />
          </TouchableOpacity>

          <View style={s.divider} />

          <View style={s.menuItem}>
            <View style={s.menuIcon}>
              <Ionicons name="notifications" size={16} color={C.accent} />
            </View>
            <Text style={s.menuLabel}>Notificaciones</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#333', true: C.primary }}
              thumbColor={notifications ? C.accent : '#666'}
            />
          </View>

          <View style={s.divider} />

          <TouchableOpacity style={s.menuItem} onPress={() => setShowTerms(true)} activeOpacity={0.7}>
            <View style={s.menuIcon}>
              <Ionicons name="document-text" size={16} color={C.accent} />
            </View>
            <Text style={s.menuLabel}>Términos y política de reembolso</Text>
            <Text style={s.menuRead}>Leer</Text>
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={17} color={C.red} />
          <Text style={s.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>

        <Text style={s.version}>Billarmania v1.0 · Hecho en Bolivia 🇧🇴</Text>
      </ScrollView>

      {/* Modal de términos */}
      <Modal visible={showTerms} transparent animationType="fade" onRequestClose={() => setShowTerms(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Política de Reservas</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)} style={s.modalClose}>
                <Ionicons name="close" size={18} color={C.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={s.modalText}>
                <Text style={s.modalBold}>1. Consumo mínimo:</Text> toda reserva requiere un consumo mínimo de <Text style={s.modalAccent}>2 horas</Text>, pagadas por adelantado mediante QR.
                {'\n\n'}
                <Text style={s.modalBold}>2. Tolerancia de llegada:</Text> cuentas con una tolerancia limitada (definida por cada local, usualmente 5 minutos) a partir de tu hora indicada de llegada. Pasado ese tiempo la mesa se libera.
                {'\n\n'}
                <Text style={s.modalBold}>3. Cancelación:</Text> puedes cancelar tu reserva mientras esté pendiente, en revisión o confirmada. El reembolso del anticipo se coordina directamente con el local según su política.
                {'\n\n'}
                <Text style={s.modalBold}>4. Verificación:</Text> tu comprobante de pago es revisado por el cajero del local. Si es rechazado, la mesa se libera y deberás coordinar la devolución con el local.
                {'\n\n'}
                <Text style={s.modalBold}>5. Extensión de tiempo:</Text> si deseas jugar más de 2 horas, coordina la extensión y el pago adicional directamente en caja.
                {'\n\n'}
                <Text style={s.modalBold}>6. Jurisdicción:</Text> servicio disponible para sucursales en Bolivia. Tarifas en Bolivianos (Bs).
              </Text>
            </ScrollView>
            <TouchableOpacity style={s.modalBtn} onPress={() => setShowTerms(false)} activeOpacity={0.85}>
              <Text style={s.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 32 },
  headerTitle: { fontSize: 17, fontWeight: '900', color: C.mint, textAlign: 'center', letterSpacing: -0.3, marginTop: 4 },

  hero: { alignItems: 'center', paddingVertical: 26, gap: 5 },
  avatarWrap: { position: 'relative', marginBottom: 10 },
  avatarRing: { width: 92, height: 92, borderRadius: 46, borderWidth: 2, borderColor: C.accent, padding: 3 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 42 },
  avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 42, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: C.mint, fontSize: 34, fontWeight: '900' },
  avatarBadge: { position: 'absolute', bottom: 2, right: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  avatarBadgeText: { color: C.bg, fontSize: 11, fontWeight: '900' },
  name: { fontSize: 20, fontWeight: '900', color: C.cream, letterSpacing: -0.4 },
  memberPill: { backgroundColor: '#1D9E7518', borderWidth: 1, borderColor: C.borderAccent, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 3 },
  memberPillText: { fontSize: 9, fontWeight: '800', color: C.mint, letterSpacing: 1.5 },
  email: { fontSize: 12, color: C.faint, marginTop: 2 },

  menu: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginTop: 6 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 15 },
  menuIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 13, color: C.cream, fontWeight: '700' },
  menuRead: { fontSize: 12, color: C.accent, fontWeight: '800' },
  divider: { height: 1, backgroundColor: C.border, marginHorizontal: 16 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#f8717135' },
  logoutText: { color: C.red, fontWeight: '800', fontSize: 13 },
  version: { textAlign: 'center', color: '#333', fontSize: 11, marginTop: 22 },

  modalBackdrop: { flex: 1, backgroundColor: '#000000cc', alignItems: 'center', justifyContent: 'center', padding: 22 },
  modalCard: { backgroundColor: C.card, borderRadius: 24, padding: 20, width: '100%', borderWidth: 1, borderColor: C.border, gap: 14 },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 12 },
  modalTitle: { fontSize: 15, fontWeight: '900', color: C.mint, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalClose: { width: 30, height: 30, borderRadius: 9, backgroundColor: C.cardAlt, alignItems: 'center', justifyContent: 'center' },
  modalText: { fontSize: 12, color: C.muted, lineHeight: 19 },
  modalBold: { fontWeight: '800', color: C.cream },
  modalAccent: { fontWeight: '800', color: C.mint },
  modalBtn: { backgroundColor: C.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  modalBtnText: { color: C.bg, fontWeight: '900', fontSize: 13 },
});
