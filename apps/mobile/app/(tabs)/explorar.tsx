import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBranches } from '../../src/hooks/useBranches';
import { C } from '../../src/theme';

export default function ExplorarScreen() {
  const { chainId } = useLocalSearchParams<{ chainId?: string }>();
  const { data, isLoading, refetch, isRefetching } = useBranches();
  const [search, setSearch] = useState('');
  const [filterChain, setFilterChain] = useState<string | null>(chainId ?? null);

  useEffect(() => {
    if (chainId) setFilterChain(chainId);
  }, [chainId]);

  const activeChain = data?.chains.find((c) => c.id === filterChain);

  const branches = (data?.branches ?? []).filter((b) => {
    if (filterChain && b.chain.id !== filterChain) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return b.name.toLowerCase().includes(q) || (b.address ?? '').toLowerCase().includes(q) || b.chain.name.toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{activeChain ? activeChain.name : 'Explorar'}</Text>
          <Text style={s.subtitle}>
            {activeChain ? `Sucursales de ${activeChain.name}` : 'Todas las sucursales disponibles'}
          </Text>
        </View>
        {activeChain && (
          <TouchableOpacity style={s.clearBtn} onPress={() => setFilterChain(null)} activeOpacity={0.7}>
            <Text style={s.clearBtnText}>Ver todas</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
      >
        {/* Búsqueda */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={17} color={C.faint} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar sucursal..."
            placeholderTextColor={C.faint}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {isLoading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2].map((i) => <View key={i} style={s.skeletonCard} />)}
          </View>
        ) : branches.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="location-outline" size={36} color={C.faint} />
            <Text style={s.emptyTitle}>Sin resultados</Text>
            <Text style={s.emptyText}>No encontramos sucursales con ese criterio</Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {branches.map((b) => {
              const isFull = b.freeTables === 0;
              const closed = b.isOpen === false;
              return (
                <View key={b.id} style={s.card}>
                  {/* Top: nombre + estado */}
                  <View style={s.cardTop}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={s.cardName}>{b.name}</Text>
                      {b.address && (
                        <View style={s.metaRow}>
                          <Ionicons name="location" size={12} color={C.accent} />
                          <Text style={s.metaText} numberOfLines={1}>{b.address}</Text>
                        </View>
                      )}
                      {(b.openTime && b.closeTime) && (
                        <View style={s.metaRow}>
                          <Ionicons name="time-outline" size={12} color={C.faint} />
                          <Text style={s.metaFaint}>{b.openTime} – {b.closeTime}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      s.statusPill,
                      closed ? s.statusClosed : isFull ? s.statusFull : s.statusOpen,
                    ]}>
                      <Text style={[
                        s.statusText,
                        { color: closed ? C.faint : isFull ? C.amber : C.mint },
                      ]}>
                        {closed ? 'Cerrado' : isFull ? 'Lleno' : 'Abierto'}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom: disponibilidad + CTA */}
                  <View style={s.cardBottom}>
                    <View>
                      <Text style={s.availLabel}>Disponibilidad</Text>
                      {isFull ? (
                        <Text style={s.fullText}>Todas las mesas ocupadas</Text>
                      ) : (
                        <View style={s.availRow}>
                          <Text style={s.availNum}>{b.freeTables}</Text>
                          <Text style={s.availUnit}>mesa{b.freeTables !== 1 ? 's' : ''} libre{b.freeTables !== 1 ? 's' : ''}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[s.cta, (closed || isFull) && s.ctaSecondary]}
                      onPress={() => router.push(`/sucursal/${b.id}`)}
                      activeOpacity={0.85}
                    >
                      <Text style={[s.ctaText, (closed || isFull) && s.ctaTextSecondary]}>
                        {isFull ? 'Ver espera' : 'Ver mesas'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 4, gap: 10 },
  title: { fontSize: 22, fontWeight: '900', color: C.cream, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  clearBtn: { backgroundColor: C.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: C.border },
  clearBtnText: { fontSize: 11, fontWeight: '700', color: C.cream },

  scroll: { padding: 18, paddingBottom: 32 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, height: 48, marginBottom: 18 },
  searchInput: { flex: 1, fontSize: 14, color: C.cream },

  skeletonCard: { height: 140, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: C.muted },
  emptyText: { fontSize: 12, color: C.faint },

  card: { backgroundColor: C.card, borderRadius: 18, padding: 16, gap: 14, borderWidth: 1, borderColor: C.border },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardName: { fontSize: 16, fontWeight: '800', color: C.cream, letterSpacing: -0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 11, color: C.muted, flex: 1 },
  metaFaint: { fontSize: 11, color: C.faint },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusOpen: { backgroundColor: C.accentDim },
  statusFull: { backgroundColor: C.amberBg },
  statusClosed: { backgroundColor: '#222' },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

  cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 },
  availLabel: { fontSize: 10, color: C.faint, marginBottom: 2 },
  availRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  availNum: { fontSize: 24, fontWeight: '900', color: C.accent, letterSpacing: -1 },
  availUnit: { fontSize: 12, color: C.mint, fontWeight: '600' },
  fullText: { fontSize: 12, color: C.red, fontWeight: '600', marginTop: 4 },

  cta: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  ctaSecondary: { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
  ctaText: { color: C.bg, fontWeight: '800', fontSize: 13 },
  ctaTextSecondary: { color: C.muted },
});
