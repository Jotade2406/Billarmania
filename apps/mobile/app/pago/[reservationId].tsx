import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Image, Alert, StatusBar, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/lib/api';
import { C, fmtCountdown } from '../../src/theme';

const PM_LABELS: Record<string, string> = {
  QR_BANCARIO: 'QR Bancario',
  TIGO_MONEY: 'Tigo Money',
  BILLETERA: 'Billetera móvil',
  OTRO: 'Otro',
};

export default function PagoScreen() {
  const { reservationId, branchId, pm } = useLocalSearchParams<{ reservationId: string; branchId: string; pm?: string }>();
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const { data: reservation } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: async () => { const { data } = await api.get(`/reservations/${reservationId}`); return data; },
  });

  const { data: paymentMethods = [] } = useQuery<any[]>({
    queryKey: ['payment-methods', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}/payment-methods`); return data; },
    enabled: !!branchId,
  });

  // Countdown de verificación (10 min)
  useEffect(() => {
    if (done) return;
    const t = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [done]);

  const selectedPm = pm ? paymentMethods.find((p) => p.id === pm) : paymentMethods[0];

  async function pickImage(fromCamera: boolean) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permiso necesario', 'Habilita el acceso en ajustes'); return; }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
    }
  }

  const sendProof = useMutation({
    mutationFn: async () => {
      if (!imageBase64) throw new Error('Sin imagen');
      const { data } = await api.post(`/reservations/${reservationId}/proof`, {
        proofUrl: `data:image/jpeg;base64,${imageBase64}`,
      });
      return data;
    },
    onSuccess: () => setDone(true),
    onError: (e: any) => Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo enviar el comprobante'),
  });

  const amount = reservation?.depositAmount;
  const tableLabel = reservation?.table?.label ?? '...';
  const branchName = reservation?.branch?.name ?? '...';

  const reservedFor = reservation?.reservedFor ? new Date(reservation.reservedFor) : null;
  const horaStr = reservedFor?.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) ?? '--:--';
  const grace = reservation?.branch?.reservationGraceMinutes ?? 5;
  const deadline = reservedFor ? new Date(reservedFor.getTime() + grace * 60000) : null;
  const deadlineStr = deadline?.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' }) ?? '--:--';

  // ── Pantalla de éxito ──────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <ScrollView contentContainerStyle={s.successScroll} showsVerticalScrollIndicator={false}>
          <View style={s.successRing}>
            <View style={s.successCircle}>
              <Ionicons name="checkmark" size={36} color={C.mint} />
            </View>
          </View>

          <Text style={s.successTitle}>¡Comprobante enviado!</Text>
          <Text style={s.successSub}>El cajero verificará tu pago en los próximos minutos. Te avisaremos aquí mismo.</Text>

          {/* Ticket */}
          <View style={s.ticket}>
            <View style={s.ticketNotchL} />
            <View style={s.ticketNotchR} />
            <View style={s.ticketTop}>
              <View>
                <Text style={s.ticketLabel}>MESA</Text>
                <Text style={s.ticketBig}>{tableLabel.replace(/\D/g, '') || tableLabel}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.ticketLabel}>HORA</Text>
                <Text style={[s.ticketBig, { color: C.cream }]}>{horaStr}</Text>
              </View>
            </View>
            <View style={s.ticketBranch}>
              <Ionicons name="location" size={13} color={C.accent} />
              <Text style={s.ticketBranchText}>{branchName}</Text>
            </View>
          </View>

          {/* Deadline warning */}
          <View style={s.deadlineCard}>
            <Ionicons name="alarm" size={18} color={C.red} style={{ marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={s.deadlineTitle}>Llegada límite: {deadlineStr}</Text>
              <Text style={s.deadlineText}>
                Si no llegas antes de las {deadlineStr} (una vez confirmada) perderás tu anticipo y la mesa será liberada.
              </Text>
            </View>
          </View>

          <TouchableOpacity style={s.cta} onPress={() => router.replace('/(tabs)/mis-reservas')} activeOpacity={0.88}>
            <Text style={s.ctaText}>Ver mis reservas</Text>
            <Ionicons name="arrow-forward" size={17} color={C.bg} />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Pantalla de pago ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Pago</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Countdown */}
        <View style={s.countdownBar}>
          <View style={s.countdownLeft}>
            <Ionicons name="timer-outline" size={15} color={secondsLeft < 120 ? C.red : C.mint} />
            <Text style={s.countdownLabel}>Tiempo restante</Text>
          </View>
          <Text style={[s.countdownValue, secondsLeft < 120 && { color: C.red }]}>
            {fmtCountdown(secondsLeft)}
          </Text>
        </View>

        {/* Resumen */}
        <View style={s.summaryCard}>
          <Text style={s.summaryEyebrow}>Resumen de Reserva</Text>
          <View style={s.summaryRow}>
            <Text style={s.summaryTable}>{tableLabel}</Text>
            <Text style={s.summaryTime}>{horaStr}</Text>
          </View>
          <View style={s.summaryRow}>
            <View style={s.summaryBranchRow}>
              <Ionicons name="location" size={11} color={C.accent} />
              <Text style={s.summaryBranch}>{branchName}</Text>
            </View>
            <Text style={s.summaryDay}>
              {reservedFor?.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' }) ?? ''}
            </Text>
          </View>
        </View>

        {/* QR */}
        <View style={s.qrCard}>
          <Text style={s.qrPayTo}>Pagar a: {selectedPm?.displayName ?? branchName}</Text>
          <Text style={s.qrAmount}>Monto: Bs {amount ?? '...'}</Text>

          {selectedPm?.qrImageUrl ? (
            <View style={s.qrFrame}>
              <Image source={{ uri: selectedPm.qrImageUrl }} style={s.qrImage} resizeMode="contain" />
            </View>
          ) : (
            <View style={[s.qrFrame, s.qrMissing]}>
              <Ionicons name="qr-code-outline" size={48} color={C.faint} />
              <Text style={s.qrMissingText}>El local aún no subió su QR.{'\n'}Coordina el pago en caja.</Text>
            </View>
          )}

          <Text style={s.qrHint}>
            Escanea el código QR desde tu aplicación bancaria para realizar el pago.
          </Text>

          {selectedPm && (
            <View style={s.pmTag}>
              <Text style={s.pmTagText}>{PM_LABELS[selectedPm.type] ?? selectedPm.type}</Text>
              {selectedPm.accountInfo && <Text style={s.pmTagInfo}>{selectedPm.accountInfo}</Text>}
            </View>
          )}
        </View>

        {/* Adjuntar comprobante */}
        <TouchableOpacity
          style={[s.uploadZone, imageUri && s.uploadZoneFilled]}
          onPress={() => {
            Alert.alert('Adjuntar comprobante', 'Elige una opción', [
              { text: 'Galería', onPress: () => pickImage(false) },
              { text: 'Cámara', onPress: () => pickImage(true) },
              { text: 'Cancelar', style: 'cancel' },
            ]);
          }}
          activeOpacity={0.8}
        >
          {imageUri ? (
            <View style={s.uploadPreviewRow}>
              <Image source={{ uri: imageUri }} style={s.uploadThumb} />
              <View style={{ flex: 1 }}>
                <View style={s.uploadOkRow}>
                  <Ionicons name="checkmark-circle" size={15} color={C.mint} />
                  <Text style={s.uploadOkText}>Comprobante agregado</Text>
                </View>
                <Text style={s.uploadChangeText}>Toca para cambiar la imagen</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={s.uploadIcon}>
                <Ionicons name="camera" size={22} color={C.muted} />
              </View>
              <Text style={s.uploadTitle}>Adjuntar comprobante de pago</Text>
              <Text style={s.uploadSub}>Sube una captura de pantalla (JPG, PNG)</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Acciones */}
      <View style={s.footer}>
        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={s.cancelBtnText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.sendBtn, !imageBase64 && s.sendBtnDisabled]}
          onPress={() => sendProof.mutate()}
          disabled={!imageBase64 || sendProof.isPending}
          activeOpacity={0.88}
        >
          {sendProof.isPending
            ? <ActivityIndicator color={C.bg} />
            : <Text style={[s.sendBtnText, !imageBase64 && { color: C.faint }]}>Enviar comprobante</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#222' },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.cream },

  scroll: { padding: 18, paddingBottom: 110, gap: 14 },

  countdownBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.borderAccent },
  countdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  countdownLabel: { fontSize: 12, fontWeight: '700', color: C.mint },
  countdownValue: { fontSize: 18, fontWeight: '900', color: C.cream, letterSpacing: 1 },

  summaryCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, gap: 8 },
  summaryEyebrow: { fontSize: 11, fontWeight: '800', color: C.muted },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryTable: { fontSize: 16, fontWeight: '900', color: C.cream },
  summaryTime: { fontSize: 15, fontWeight: '800', color: C.cream },
  summaryBranchRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryBranch: { fontSize: 12, color: C.muted },
  summaryDay: { fontSize: 11, color: C.faint },

  qrCard: { backgroundColor: C.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, alignItems: 'center', gap: 6 },
  qrPayTo: { fontSize: 11, fontWeight: '700', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  qrAmount: { fontSize: 22, fontWeight: '900', color: C.accent, letterSpacing: -0.5 },
  qrFrame: { backgroundColor: '#fff', borderRadius: 18, padding: 12, marginVertical: 10, shadowColor: '#fff', shadowOpacity: 0.12, shadowRadius: 24, elevation: 4 },
  qrImage: { width: 210, height: 210 },
  qrMissing: { backgroundColor: C.cardAlt, width: 234, height: 234, alignItems: 'center', justifyContent: 'center', gap: 10 },
  qrMissingText: { fontSize: 11, color: C.faint, textAlign: 'center', lineHeight: 16 },
  qrHint: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 17, maxWidth: 240 },
  pmTag: { alignItems: 'center', marginTop: 6, gap: 1 },
  pmTagText: { fontSize: 10, fontWeight: '800', color: C.mint, textTransform: 'uppercase', letterSpacing: 0.8 },
  pmTagInfo: { fontSize: 10, color: C.faint },

  uploadZone: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#333', backgroundColor: C.cardAlt, borderRadius: 16, padding: 18, alignItems: 'center', gap: 5 },
  uploadZoneFilled: { borderColor: C.borderAccent, borderStyle: 'solid' },
  uploadIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  uploadTitle: { fontSize: 13, fontWeight: '800', color: C.cream },
  uploadSub: { fontSize: 11, color: C.faint },
  uploadPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  uploadThumb: { width: 56, height: 56, borderRadius: 12, borderWidth: 1, borderColor: C.accent },
  uploadOkRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  uploadOkText: { fontSize: 13, fontWeight: '800', color: C.mint },
  uploadChangeText: { fontSize: 11, color: C.faint, marginTop: 2 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: '#222', flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 0.6, backgroundColor: C.cardAlt, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.muted, fontWeight: '700', fontSize: 14 },
  sendBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 14, height: 52, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5 },
  sendBtnDisabled: { backgroundColor: C.cardAlt },
  sendBtnText: { color: C.bg, fontWeight: '900', fontSize: 14 },

  // Success
  successScroll: { flexGrow: 1, padding: 24, justifyContent: 'center', gap: 16 },
  successRing: { alignSelf: 'center', width: 96, height: 96, borderRadius: 48, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  successCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primary, borderWidth: 2, borderColor: C.accent, alignItems: 'center', justifyContent: 'center', shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 18, elevation: 8 },
  successTitle: { fontSize: 26, fontWeight: '900', color: C.cream, textAlign: 'center', letterSpacing: -0.6 },
  successSub: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 20, marginTop: -6 },

  ticket: { backgroundColor: C.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  ticketNotchL: { position: 'absolute', left: -12, top: '52%', width: 24, height: 24, borderRadius: 12, backgroundColor: C.bg },
  ticketNotchR: { position: 'absolute', right: -12, top: '52%', width: 24, height: 24, borderRadius: 12, backgroundColor: C.bg },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ffffff0d', paddingBottom: 14, marginBottom: 12 },
  ticketLabel: { fontSize: 9, fontWeight: '800', color: C.faint, letterSpacing: 1.2 },
  ticketBig: { fontSize: 28, fontWeight: '900', color: C.accent, letterSpacing: -1, marginTop: 2 },
  ticketBranch: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketBranchText: { fontSize: 13, color: C.muted, fontWeight: '600' },

  deadlineCard: { flexDirection: 'row', gap: 10, backgroundColor: C.redBg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#f8717120' },
  deadlineTitle: { fontSize: 12, fontWeight: '800', color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5 },
  deadlineText: { fontSize: 11, color: C.muted, lineHeight: 17, marginTop: 3 },

  cta: { backgroundColor: C.accent, borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  ctaText: { color: C.bg, fontWeight: '900', fontSize: 16 },
});
