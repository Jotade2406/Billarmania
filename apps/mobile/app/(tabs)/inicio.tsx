import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, RefreshControl, Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth.store';
import { useBranches } from '../../src/hooks/useBranches';
import { usePromotions } from '../../src/hooks/usePromotions';
import { AdCarousel } from '../../src/components/AdCarousel';
import { PromoCard } from '../../src/components/PromoCard';
import { C, greeting } from '../../src/theme';

export default function InicioScreen() {
  const { user } = useAuthStore();
  const { data, isLoading, refetch, isRefetching } = useBranches();
  const { data: promos = [] } = usePromotions();
  const [search, setSearch] = useState('');

  const chains = (data?.chains ?? []).filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
      >
        {/* Header con saludo */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarLetter}>{firstName[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <View>
              <Text style={s.greetSmall}>{greeting()},</Text>
              <Text style={s.greetName}>{firstName}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.bellBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={19} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* Búsqueda */}
        <View style={s.searchWrap}>
          <Ionicons name="search" size={17} color={C.faint} />
          <TextInput
            style={s.searchInput}
            placeholder="Buscar billar..."
            placeholderTextColor={C.faint}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Carrusel de anuncios */}
        <AdCarousel />

        {/* Locales de billar */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Locales de Billar</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/explorar')}>
            <Text style={s.sectionLink}>Ver todos</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ gap: 12 }}>
            {[0, 1].map((i) => <View key={i} style={s.skeletonCard} />)}
          </View>
        ) : chains.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="location-outline" size={32} color={C.faint} />
            <Text style={s.emptyText}>No se encontraron locales de billar</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {chains.map((chain) => (
              <TouchableOpacity
                key={chain.id}
                style={s.chainCard}
                onPress={() => router.push(`/(tabs)/explorar?chainId=${chain.id}`)}
                activeOpacity={0.8}
              >
                <View style={s.chainAvatar}>
                  <Text style={s.chainAvatarText}>{chain.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={s.chainBody}>
                  <Text style={s.chainName}>{chain.name}</Text>
                  <Text style={s.chainMeta}>
                    {chain.branchesCount} sucursal{chain.branchesCount !== 1 ? 'es' : ''}
                    {chain.openCount > 0 ? ` · ${chain.openCount} abierta${chain.openCount !== 1 ? 's' : ''}` : ''}
                  </Text>
                </View>
                <View style={s.chainRight}>
                  <View style={[s.openPill, chain.isOpen ? s.openPillOn : s.openPillOff]}>
                    <Text style={[s.openPillText, { color: chain.isOpen ? C.mint : C.faint }]}>
                      {chain.isOpen ? 'Abierto' : 'Cerrado'}
                    </Text>
                  </View>
                  <View style={s.freeRow}>
                    <Text style={s.freeNum}>{chain.freeTables}</Text>
                    <Text style={s.freeLabel}>libres</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Promociones reales */}
        {promos.length > 0 && (
          <>
            <View style={[s.sectionHead, { marginTop: 26 }]}>
              <Text style={s.sectionTitle}>Promociones</Text>
              <Text style={s.sectionHint}>Deslizar →</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {promos.map((promo) => (
                <PromoCard key={promo.id} promo={promo} />
              ))}
            </ScrollView>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 18, paddingBottom: 32 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, borderColor: C.accent },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.accent },
  avatarLetter: { color: C.mint, fontWeight: '900', fontSize: 17 },
  greetSmall: { fontSize: 12, color: C.muted },
  greetName: { fontSize: 19, fontWeight: '900', color: C.cream, letterSpacing: -0.4 },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },

  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, height: 48, marginBottom: 24 },
  searchInput: { flex: 1, fontSize: 14, color: C.cream },

  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1.2 },
  sectionLink: { fontSize: 12, color: C.accent, fontWeight: '700' },
  sectionHint: { fontSize: 11, color: C.accent },

  skeletonCard: { height: 84, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  empty: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  emptyText: { fontSize: 13, color: C.faint },

  chainCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.cardAlt, borderRadius: 18, padding: 15, borderWidth: 1, borderColor: C.border },
  chainAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  chainAvatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  chainBody: { flex: 1, gap: 2 },
  chainName: { fontSize: 15, fontWeight: '800', color: C.cream, letterSpacing: -0.2 },
  chainMeta: { fontSize: 12, color: C.muted },
  chainRight: { alignItems: 'flex-end', gap: 6 },
  openPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  openPillOn: { backgroundColor: C.accentDim },
  openPillOff: { backgroundColor: '#222' },
  openPillText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  freeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  freeNum: { fontSize: 19, fontWeight: '900', color: C.accent, letterSpacing: -0.5 },
  freeLabel: { fontSize: 10, color: C.muted },

});
