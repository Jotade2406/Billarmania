import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, StatusBar, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../../src/lib/api';
import { C } from '../../src/theme';

interface Table {
  id: string;
  label: string;
  status: 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'FUERA_DE_SERVICIO';
  hourlyRate: number | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  displayName: string;
  accountInfo: string | null;
  qrImageUrl: string | null;
}

const PM_COLORS: Record<string, string> = {
  QR_BANCARIO: '#006e30',
  TIGO_MONEY: '#002f6c',
  BILLETERA: '#5A208B',
  OTRO: '#333',
};

const PM_SHORT: Record<string, string> = {
  QR_BANCARIO: 'QR',
  TIGO_MONEY: 'TIGO',
  BILLETERA: 'WALLET',
  OTRO: 'PAGO',
};

export default function ReservaScreen() {
  const { branchId, tableId: preselectedTableId } = useLocalSearchParams<{ branchId: string; tableId?: string }>();

  const [selectedTable, setSelectedTable] = useState<string>(preselectedTableId ?? '');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedPm, setSelectedPm] = useState<string>('');

  const { data: branch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}`); return data; },
  });

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ['tables', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}/tables`); return data; },
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}/payment-methods`); return data; },
  });

  const createReservation = useMutation({
    mutationFn: async () => {
      const combined = new Date(date);
      combined.setHours(time.getHours(), time.getMinutes(), 0, 0);
      const { data } = await api.post('/reservations', {
        tableId: selectedTable,
        branchId,
        reservedFor: combined.toISOString(),
      });
      return data;
    },
    onSuccess: (data) => {
      const pmParam = selectedPm ? `&pm=${selectedPm}` : '';
      router.replace(`/pago/${data.id}?branchId=${branchId}${pmParam}`);
    },
    onError: (e: any) => { Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo crear la reserva'); },
  });

  const freeTables = tables.filter(t => t.status === 'LIBRE');
  const selectedTableData = tables.find(t => t.id === selectedTable);
  const rate = selectedTableData?.hourlyRate ? Number(selectedTableData.hourlyRate) : null;
  const minAmount = rate ? rate * 2 : null;
  const canSubmit = !!selectedTable && (paymentMethods.length === 0 || !!selectedPm);

  const dateStr = date.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = time.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  function onDateChange(_: any, selected?: Date) {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) setDate(selected);
  }
  function onTimeChange(_: any, selected?: Date) {
    setShowTimePicker(Platform.OS === 'ios');
    if (selected) setTime(selected);
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={C.accent} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Detalles de Reserva</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Resumen de mesa */}
        <View style={s.summaryCard}>
          <View style={s.summaryGlow} />
          <View style={s.summaryTop}>
            <View>
              <Text style={s.summaryTitle}>
                {selectedTableData ? selectedTableData.label : 'Elige tu mesa'}
              </Text>
              <View style={s.summaryBranchRow}>
                <Ionicons name="location" size={11} color={C.accent} />
                <Text style={s.summaryBranch}>{branch?.name ?? '...'}</Text>
              </View>
            </View>
            {selectedTableData && (
              <View style={s.dispoPill}>
                <View style={s.dispoDot} />
                <Text style={s.dispoText}>Disponible</Text>
              </View>
            )}
          </View>

          {/* Selector de mesa (chips horizontales) */}
          {freeTables.length === 0 ? (
            <View style={s.noTables}>
              <Ionicons name="alert-circle-outline" size={18} color={C.red} />
              <Text style={s.noTablesText}>No hay mesas libres en este momento</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <View style={s.chipsRow}>
                {freeTables.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.chip, selectedTable === t.id && s.chipActive]}
                    onPress={() => setSelectedTable(t.id)}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.chipLabel, selectedTable === t.id && s.chipLabelActive]}>{t.label}</Text>
                    {t.hourlyRate != null && (
                      <Text style={[s.chipRate, selectedTable === t.id && { color: C.bg }]}>
                        {Number(t.hourlyRate).toFixed(0)} Bs/h
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Precios */}
          {rate !== null && (
            <View style={s.priceGrid}>
              <View style={s.priceCol}>
                <Text style={s.priceLabel}>PRECIO POR HORA</Text>
                <Text style={s.priceValue}>Bs {rate.toFixed(0)}</Text>
              </View>
              <View style={s.priceCol}>
                <Text style={[s.priceLabel, { color: C.accent }]}>PAGO MÍNIMO (2 H)</Text>
                <Text style={[s.priceValue, { color: C.accent }]}>Bs {minAmount!.toFixed(0)}</Text>
              </View>
            </View>
          )}

          <View style={s.policyNote}>
            <Ionicons name="checkmark-circle" size={14} color={C.mint} />
            <Text style={s.policyNoteText}>Consumo mínimo de 2 horas, pagado por adelantado vía QR</Text>
          </View>
        </View>

        {/* Fecha y hora */}
        <Text style={s.label}>
          <Ionicons name="calendar" size={12} color={C.accent} />  FECHA Y HORA DE LLEGADA
        </Text>
        <View style={s.dtRow}>
          <TouchableOpacity style={[s.dtBtn, { flex: 1.4 }]} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
            <Ionicons name="calendar-outline" size={15} color={C.accent} />
            <Text style={s.dtValue} numberOfLines={1}>{dateStr}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.dtBtn} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
            <Ionicons name="time-outline" size={15} color={C.accent} />
            <Text style={s.dtValue}>{timeStr}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>
          * Tu mesa quedará reservada desde la hora indicada. Tienes {branch?.reservationGraceMinutes ?? 5} minutos de tolerancia.
        </Text>

        {showDatePicker && (
          <DateTimePicker value={date} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDateChange} minimumDate={new Date()} themeVariant="dark" />
        )}
        {showTimePicker && (
          <DateTimePicker value={time} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} is24Hour themeVariant="dark" />
        )}

        {/* Método de pago */}
        <Text style={[s.label, { marginTop: 20 }]}>
          <Ionicons name="card" size={12} color={C.accent} />  MÉTODO DE PAGO (ANTICIPO)
        </Text>
        {paymentMethods.length === 0 ? (
          <View style={s.noPmCard}>
            <Ionicons name="information-circle-outline" size={16} color={C.amber} />
            <Text style={s.noPmText}>La sucursal aún no configuró métodos de pago. Podrás coordinar el pago directamente.</Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {paymentMethods.map(pm => {
              const active = selectedPm === pm.id;
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={[s.pmCard, active && s.pmCardActive]}
                  onPress={() => setSelectedPm(pm.id)}
                  activeOpacity={0.8}
                >
                  <View style={[s.pmLogo, { backgroundColor: PM_COLORS[pm.type] ?? '#333' }]}>
                    <Text style={s.pmLogoText}>{PM_SHORT[pm.type] ?? 'PAGO'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pmName}>{pm.displayName}</Text>
                    {pm.accountInfo && <Text style={s.pmInfo} numberOfLines={1}>{pm.accountInfo}</Text>}
                  </View>
                  <View style={[s.radio, active && s.radioActive]}>
                    {active && <View style={s.radioDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* CTA fijo */}
      <View style={s.footer}>
        <TouchableOpacity
          style={[s.cta, !canSubmit && s.ctaDisabled]}
          onPress={() => createReservation.mutate()}
          disabled={!canSubmit || createReservation.isPending}
          activeOpacity={0.88}
        >
          {createReservation.isPending
            ? <ActivityIndicator color={C.bg} />
            : <>
                <Ionicons name="qr-code" size={18} color={canSubmit ? C.bg : C.faint} />
                <Text style={[s.ctaText, !canSubmit && { color: C.faint }]}>Ver QR y pagar</Text>
              </>
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
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.mint, letterSpacing: -0.2 },

  scroll: { padding: 18, paddingBottom: 110 },

  summaryCard: { backgroundColor: C.card, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  summaryGlow: { position: 'absolute', top: -30, right: -30, width: 110, height: 110, borderRadius: 55, backgroundColor: C.accent, opacity: 0.07 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  summaryTitle: { fontSize: 20, fontWeight: '900', color: C.cream, letterSpacing: -0.5 },
  summaryBranchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  summaryBranch: { fontSize: 12, color: C.muted },
  dispoPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  dispoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  dispoText: { fontSize: 10, fontWeight: '800', color: C.mint },

  noTables: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, backgroundColor: C.redBg, borderRadius: 12, padding: 12 },
  noTablesText: { fontSize: 12, color: C.red, flex: 1 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  chip: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', backgroundColor: C.cardAlt, minWidth: 74 },
  chipActive: { borderColor: C.accent, backgroundColor: C.accent },
  chipLabel: { fontWeight: '800', color: C.cream, fontSize: 14 },
  chipLabelActive: { color: C.bg },
  chipRate: { fontSize: 10, color: C.accent, marginTop: 2, fontWeight: '700' },

  priceGrid: { flexDirection: 'row', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#ffffff0d' },
  priceCol: { flex: 1, gap: 3 },
  priceLabel: { fontSize: 9, fontWeight: '800', color: C.faint, letterSpacing: 0.8 },
  priceValue: { fontSize: 17, fontWeight: '900', color: C.cream },
  policyNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.accentDim, borderRadius: 11, padding: 10, marginTop: 14 },
  policyNoteText: { flex: 1, fontSize: 11, color: C.mint, lineHeight: 16 },

  label: { fontSize: 11, fontWeight: '800', color: C.muted, letterSpacing: 1, marginTop: 22, marginBottom: 10 },
  dtRow: { flexDirection: 'row', gap: 8 },
  dtBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: C.card, borderRadius: 13, borderWidth: 1, borderColor: C.border, paddingHorizontal: 13, paddingVertical: 14 },
  dtValue: { flex: 1, fontSize: 13, color: C.cream, fontWeight: '700' },
  hint: { fontSize: 10, color: C.faint, fontStyle: 'italic', marginTop: 8, lineHeight: 15 },

  noPmCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.amberBg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#f4a26125' },
  noPmText: { flex: 1, fontSize: 11, color: '#d4b483', lineHeight: 16 },
  pmCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.card, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: C.border },
  pmCardActive: { borderColor: C.accent, backgroundColor: '#08504115' },
  pmLogo: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pmLogoText: { color: '#fff', fontSize: 8, fontWeight: '900', letterSpacing: 0.3 },
  pmName: { fontSize: 13, fontWeight: '800', color: C.cream },
  pmInfo: { fontSize: 11, color: C.faint, marginTop: 1 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: C.accent },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: '#222' },
  cta: { backgroundColor: C.accent, borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  ctaDisabled: { backgroundColor: C.cardAlt },
  ctaText: { color: C.bg, fontWeight: '900', fontSize: 16 },
});
