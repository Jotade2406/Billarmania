import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Image, Alert, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';

export default function ComprobanteScreen() {
  const { reservationId } = useLocalSearchParams<{ reservationId: string }>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso necesario', 'Se necesita acceso a tus fotos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso necesario', 'Se necesita acceso a la cámara'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  const uploadProof = useMutation({
    mutationFn: async () => {
      if (!imageBase64) throw new Error('Sin imagen');
      const { data } = await api.post(`/reservations/${reservationId}/proof`, {
        proofUrl: `data:image/jpeg;base64,${imageBase64}`,
      });
      return data;
    },
    onSuccess: () => {
      Alert.alert(
        '¡Comprobante enviado!',
        'El cajero revisará tu pago en los próximos minutos.',
        [{ text: 'Ver mis reservas', onPress: () => router.replace('/(tabs)/mis-reservas') }],
      );
    },
    onError: (e: any) => {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo enviar el comprobante');
    },
  });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Subir comprobante</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.instruction}>
          Sube la foto o captura de pantalla de tu transferencia para confirmar la reserva.
        </Text>

        {imageUri ? (
          <View style={s.previewWrap}>
            <Image source={{ uri: imageUri }} style={s.preview} resizeMode="contain" />
            <TouchableOpacity style={s.changeBtn} onPress={() => { setImageUri(null); setImageBase64(null); }}>
              <Ionicons name="refresh-outline" size={14} color="#94a3b8" />
              <Text style={s.changeBtnText}>Cambiar imagen</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.pickersRow}>
            <TouchableOpacity style={s.pickerBtn} onPress={pickImage} activeOpacity={0.75}>
              <View style={s.pickerIcon}>
                <Ionicons name="images" size={26} color="#22c55e" />
              </View>
              <Text style={s.pickerTitle}>Galería</Text>
              <Text style={s.pickerSub}>Seleccionar foto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pickerBtn} onPress={takePhoto} activeOpacity={0.75}>
              <View style={s.pickerIcon}>
                <Ionicons name="camera" size={26} color="#22c55e" />
              </View>
              <Text style={s.pickerTitle}>Cámara</Text>
              <Text style={s.pickerSub}>Tomar foto</Text>
            </TouchableOpacity>
          </View>
        )}

        {imageUri && (
          <TouchableOpacity
            style={s.submitBtn}
            onPress={() => uploadProof.mutate()}
            disabled={uploadProof.isPending}
            activeOpacity={0.85}
          >
            {uploadProof.isPending
              ? <ActivityIndicator color="#0f172a" />
              : <>
                  <Ionicons name="send" size={18} color="#0f172a" />
                  <Text style={s.submitBtnText}>Enviar comprobante</Text>
                </>
            }
          </TouchableOpacity>
        )}

        <View style={s.tipCard}>
          <Ionicons name="bulb" size={15} color="#fbbf24" />
          <Text style={s.tipText}>
            Asegúrate de que el monto, fecha y destinatario sean visibles en la imagen.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1a2235' },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#f1f5f9' },
  scroll: { padding: 20, gap: 20 },
  instruction: { fontSize: 14, color: '#64748b', lineHeight: 22, textAlign: 'center' },
  previewWrap: { alignItems: 'center', gap: 14 },
  preview: { width: '100%', height: 300, borderRadius: 16, backgroundColor: '#111827' },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#111827', borderWidth: 1, borderColor: '#334155' },
  changeBtnText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },
  pickersRow: { flexDirection: 'row', gap: 14 },
  pickerBtn: { flex: 1, backgroundColor: '#111827', borderRadius: 18, paddingVertical: 28, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#334155' },
  pickerIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#052e16', alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontWeight: '800', color: '#f1f5f9', fontSize: 15 },
  pickerSub: { fontSize: 11, color: '#475569' },
  submitBtn: { backgroundColor: '#1D9E75', borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#1D9E75', shadowOpacity: 0.25, shadowRadius: 12, elevation: 4 },
  submitBtnText: { color: '#121212', fontWeight: '800', fontSize: 16 },
  tipCard: { backgroundColor: '#1a1400', borderRadius: 14, padding: 14, flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderColor: '#fbbf2425' },
  tipText: { flex: 1, fontSize: 12, color: '#a3856a', lineHeight: 18 },
});
