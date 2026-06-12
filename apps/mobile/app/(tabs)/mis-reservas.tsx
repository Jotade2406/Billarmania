import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, RefreshControl, StatusBar, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { C } from '../../src/theme';

interface Reservation {
  id: string;
  reservedFor: string;
  status: string;
  depositAmount: number;
  table: { label: string };
  branch?: { id: string; name: string; address?: string };
  payment?: { status: string };
}

const STATUS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDIENTE_PAGO: { label: 'Pago pendiente', color: C.amber, bg: C.amberBg, icon: 'wallet-outline' },
  EN_REVISION:    { label: 'En revisión',    color: C.blue,  bg: C.blueBg,  icon: 'hourglass-outline' },
  CONFIRMADA:     { label: 'Confirmada',     color: C.mint,  bg: C.accentDim, icon: 'checkmark-circle' },
  ACTIVA:         { label: 'En juego',       color: C.mint,  bg: C.accentDim, icon: 'play-circle' },
  CANCELADA:      { label: 'Cancelada',      color: C.faint, bg: '#1d1d1d', icon: 'close-circle' },
  COMPLETADA:     { label: 'Completada',     color: C.accent, bg: '#1d1d1d', icon: 'checkmark-done-circle' },
};

const ACTIVE_STATES = ['PENDIENTE_PAGO', 'EN_REVISION', 'CONFIRMADA', 'ACTIVA'];
const CANCELABLE = new Set(['PENDIENTE_PAGO', 'EN_REVISION', 'CONFIRMADA']);

type Item =
  | { kind: 'header'; id: string; title: string }
  | { kind: 'res'; id: string; res: Reservation }
  | { kind: 'empty-active'; id: string };

export default function MisReservasScreen() {
  const qc = useQueryClient();
  const [canceling, setCanceling] = useState<string | null>(null);

  const { data: reservations = [], isLoading, refetch, isRefetching } = useQuery<Reservation[]>({
    queryKey: ['my-reservations'],
    queryFn: async () => { const { data } = await api.get('/me/reservations'); return data; },
    refetchInterval: 30000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/reservations/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-reservations'] }); setCanceling(null); },
    onError: (e: any) => {
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo cancelar');
      setCanceling(null);
    },
  });

  function confirmCancel(id: string, tableLabel: string) {
    Alert.alert(
      'Cancelar reserva',
      `¿Seguro que deseas cancelar la reserva de ${tableLabel}? Esta acción no se puede deshacer.`,
      [
        { text: 'No, mantener', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => { setCanceling(id); cancelMutation.mutate(id); } },
      ],
    );
  }

  const active = reservations.filter(r => ACTIVE_STATES.includes(r.status));
  const past = reservations.filter(r => !ACTIVE_STATES.includes(r.status));

  const items: Item[] = [
    { kind: 'header', id: 'h-active', title: 'Activas' },
    ...(active.length === 0
      ? [{ kind: 'empty-active', id: 'ea' } as Item]
      : active.map(r => ({ kind: 'res', id: r.id, res: r } as Item))),
    ...(past.length > 0
      ? [
          { kind: 'header', id: 'h-past', title: 'Historial de Partidos' } as Item,
          ...past.map(r => ({ kind: 'res', id: r.id, res: r } as Item)),
        ]
      : []),
  ];

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
  }
  function fmtTime(d: string) {
    return new Date(d).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <View>
          <Text style={s.title}>Mis Reservas</Text>
          <Text style={s.subtitle}>Sigue tus partidas activas e historial de juego</Text>
        </View>
        <TouchableOpacity onPress={() => refetch()} style={s.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="refresh" size={17} color={C.accent} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={C.accent} /></View>
      ) : reservations.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Ionicons name="calendar-outline" size={32} color={C.accent} />
          </View>
          <Text style={s.emptyTitle}>Sin reservas aún</Text>
          <Text style={s.emptyText}>Explora los locales y aparta tu mesa favorita</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={() => router.push('/(tabs)/explorar')} activeOpacity={0.85}>
            <Ionicons name="compass" size={16} color={C.bg} />
            <Text style={s.emptyBtnText}>Explorar billares</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
          renderItem={({ item }) => {
            if (item.kind === 'header') {
              return <Text style={s.sectionTitle}>{item.title}</Text>;
            }
            if (item.kind === 'empty-active') {
              return (
                <View style={s.noActiveCard}>
                  <Ionicons name="information-circle-outline" size={22} color={C.faint} />
                  <Text style={s.noActiveText}>No tienes ninguna reserva activa programada.</Text>
                </View>
              );
            }

            const r = item.res;
            const info = STATUS[r.status] ?? { label: r.status, color: C.faint, bg: '#1d1d1d', icon: 'ellipse' };
            const isPending = r.status === 'PENDIENTE_PAGO';
            const canCancel = CANCELABLE.has(r.status);
            const isPast = !ACTIVE_STATES.includes(r.status);
            const isCanceling = canceling === r.id;

            if (isPast) {
              return (
                <View style={s.pastCard}>
                  <View style={[s.pastIcon, { backgroundColor: info.bg }]}>
                    <Ionicons name={info.icon} size={15} color={info.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pastTable}>{r.table?.label}</Text>
                    <Text style={s.pastMeta}>{r.branch?.name} · {fmtDate(r.reservedFor)} {fmtTime(r.reservedFor)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.pastAmount, r.status === 'CANCELADA' && s.pastAmountVoid]}>Bs {r.depositAmount}</Text>
                    <Text style={[s.pastStatus, { color: info.color }]}>{info.label}</Text>
                  </View>
                </View>
              );
            }

            return (
              <View style={s.activeCard}>
                {/* Status pill */}
                <View style={s.activeTop}>
                  <View style={[s.statusPill, { backgroundColor: info.bg }]}>
                    <Ionicons name={info.icon} size={12} color={info.color} />
                    <Text style={[s.statusText, { color: info.color }]}>{info.label}</Text>
                  </View>
                  <Text style={s.activeRate}>Bs {r.depositAmount} <Text style={s.activeRateSub}>· 2h</Text></Text>
                </View>

                <Text style={s.activeTable}>{r.table?.label}</Text>
                <Text style={s.activeBranch}>{r.branch?.name}{r.branch?.address ? ` · ${r.branch.address}` : ''}</Text>

                <View style={s.activeFooter}>
                  <View style={s.timeBox}>
                    <Ionicons name="time-outline" size={14} color={C.mint} />
                    <Text style={s.timeBoxText}>{fmtDate(r.reservedFor)} · {fmtTime(r.reservedFor)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {isPending && r.branch?.id && (
                      <TouchableOpacity
                        style={s.payBtn}
                        onPress={() => router.push(`/pago/${r.id}?branchId=${r.branch!.id}`)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="qr-code" size={13} color={C.bg} />
                        <Text style={s.payBtnText}>Pagar</Text>
                      </TouchableOpacity>
                    )}
                    {canCancel && (
                      <TouchableOpacity
                        style={s.cancelBtn}
                        onPress={() => confirmCancel(r.id, r.table?.label)}
                        disabled={isCanceling}
                        activeOpacity={0.8}
                      >
                        {isCanceling
                          ? <ActivityIndicator size="small" color={C.red} />
                          : <Text style={s.cancelBtnText}>Cancelar</Text>
                        }
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '900', color: C.cream, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  refreshBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderAccent },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderAccent },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: C.cream },
  emptyText: { fontSize: 12, color: C.faint, textAlign: 'center' },
  emptyBtn: { backgroundColor: C.accent, borderRadius: 13, paddingVertical: 12, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  emptyBtnText: { color: C.bg, fontWeight: '800', fontSize: 13 },

  list: { padding: 18, paddingBottom: 32, gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.mint, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 8, marginBottom: 2 },

  noActiveCard: { backgroundColor: C.card, borderRadius: 16, padding: 20, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border },
  noActiveText: { fontSize: 12, color: C.muted, textAlign: 'center' },

  activeCard: { backgroundColor: C.cardAlt, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: C.accent, padding: 16, gap: 4, borderWidth: 1, borderColor: C.border },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  activeRate: { fontSize: 14, fontWeight: '900', color: C.cream },
  activeRateSub: { fontSize: 10, color: C.faint, fontWeight: '600' },
  activeTable: { fontSize: 17, fontWeight: '800', color: C.cream, letterSpacing: -0.3 },
  activeBranch: { fontSize: 11, color: C.muted },
  activeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#26262666', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: C.border },
  timeBoxText: { fontSize: 11, fontWeight: '700', color: C.cream },
  payBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8 },
  payBtnText: { color: C.bg, fontWeight: '800', fontSize: 12 },
  cancelBtn: { backgroundColor: C.redBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#f8717118', minWidth: 70, alignItems: 'center' },
  cancelBtnText: { color: '#fca5a5', fontWeight: '700', fontSize: 11 },

  pastCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: C.border },
  pastIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pastTable: { fontSize: 13, fontWeight: '800', color: C.cream },
  pastMeta: { fontSize: 10, color: C.faint, marginTop: 1 },
  pastAmount: { fontSize: 12, fontWeight: '800', color: C.cream },
  pastAmountVoid: { textDecorationLine: 'line-through', color: C.faint },
  pastStatus: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
});
