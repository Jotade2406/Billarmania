import { useQuery } from '@tanstack/react-query';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, StatusBar, RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/lib/api';
import { usePromotions } from '../../src/hooks/usePromotions';
import { PromoCard } from '../../src/components/PromoCard';
import { C } from '../../src/theme';

interface Table {
  id: string;
  label: string;
  status: 'LIBRE' | 'OCUPADA' | 'RESERVADA' | 'FUERA_DE_SERVICIO';
  hourlyRate: number | null;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  unit: string;
  agotado: boolean;
  presentations: {
    id: string;
    name: string;
    description: string | null;
    unitsPerSale: number;
    price: number;
    available: boolean;
  }[];
}

export default function SucursalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: branch } = useQuery({
    queryKey: ['branch', id],
    queryFn: async () => { const { data } = await api.get(`/branches/${id}`); return data; },
  });

  const { data: tables = [], isLoading, refetch, isRefetching } = useQuery<Table[]>({
    queryKey: ['tables', id],
    queryFn: async () => { const { data } = await api.get(`/branches/${id}/tables`); return data; },
    refetchInterval: 15000,
  });

  const { data: menu = [] } = useQuery<MenuItem[]>({
    queryKey: ['menu', id],
    queryFn: async () => { const { data } = await api.get(`/inventory/branch/${id}/menu`); return data; },
    enabled: !!id,
  });

  const { data: promos = [] } = usePromotions(id);

  const libres = tables.filter(t => t.status === 'LIBRE').length;

  // Menú agrupado por categoría
  const menuByCategory = menu.reduce((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={20} color={C.accent} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerEyebrow}>MAPA DE MESAS</Text>
          <Text style={s.headerTitle} numberOfLines={1}>{branch?.name ?? 'Sucursal'}</Text>
        </View>
        {(branch?.openTime && branch?.closeTime) && (
          <View style={s.hoursBadge}>
            <Ionicons name="time-outline" size={11} color={C.muted} />
            <Text style={s.hoursText}>{branch.openTime}–{branch.closeTime}</Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.accent} />}
      >
        {/* Indicador en vivo + leyenda */}
        <View style={s.liveBar}>
          <View style={s.liveLeft}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>Estado en Tiempo Real</Text>
          </View>
          <View style={s.legend}>
            <Text style={[s.legendItem, { color: C.accent }]}>● Libre</Text>
            <Text style={[s.legendItem, { color: C.red }]}>● Ocupada</Text>
            <Text style={[s.legendItem, { color: C.amber }]}>● Res.</Text>
          </View>
        </View>

        <Text style={s.intro}>Selecciona una mesa libre para iniciar tu reserva.</Text>

        {/* Grid 3 columnas */}
        {isLoading ? (
          <View style={s.grid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <View key={i} style={[s.tableCard, s.skeleton]} />
            ))}
          </View>
        ) : (
          <View style={s.grid}>
            {tables.map((table) => {
              const isLibre = table.status === 'LIBRE';
              const isOcupada = table.status === 'OCUPADA';
              const isReservada = table.status === 'RESERVADA';
              const isFuera = table.status === 'FUERA_DE_SERVICIO';
              return (
                <TouchableOpacity
                  key={table.id}
                  style={[
                    s.tableCard,
                    isLibre && s.tableLibre,
                    isOcupada && s.tableOcupada,
                    isReservada && s.tableReservada,
                    isFuera && s.tableFuera,
                  ]}
                  onPress={() => isLibre && router.push(`/reserva/${id}?tableId=${table.id}`)}
                  disabled={!isLibre}
                  activeOpacity={0.75}
                >
                  <View style={s.tableIconWrap}>
                    <Ionicons
                      name="ellipse"
                      size={8}
                      color={isLibre ? C.accent : isOcupada ? C.red : isReservada ? C.amber : C.faint}
                    />
                  </View>
                  <Text style={[s.tableName, isOcupada && { color: C.muted }, isFuera && { color: C.faint }]}>
                    {table.label}
                  </Text>

                  <View style={s.tableFooter}>
                    {isLibre && (
                      <>
                        <Text style={[s.tableStatus, { color: C.accent }]}>LIBRE</Text>
                        {table.hourlyRate != null && (
                          <Text style={s.tablePrice}>{Number(table.hourlyRate).toFixed(0)} Bs/h</Text>
                        )}
                      </>
                    )}
                    {isOcupada && <Text style={[s.tableStatus, { color: C.red }]}>JUGANDO</Text>}
                    {isReservada && <Text style={[s.tableStatus, { color: C.amber }]}>RESERVADA</Text>}
                    {isFuera && <Text style={[s.tableStatus, { color: C.faint }]}>FUERA</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Todo lleno */}
        {!isLoading && libres === 0 && tables.length > 0 && (
          <View style={s.fullAlert}>
            <Ionicons name="alert-circle" size={28} color={C.red} />
            <Text style={s.fullTitle}>Todas las mesas están ocupadas</Text>
            <Text style={s.fullText}>
              Por el momento no hay mesas disponibles en esta sucursal. Revisa otras sucursales o ponte en cola en caja.
            </Text>
          </View>
        )}

        {!isLoading && tables.length === 0 && (
          <View style={s.fullAlert}>
            <Ionicons name="grid-outline" size={28} color={C.faint} />
            <Text style={s.fullTitle}>Sin mesas registradas</Text>
            <Text style={s.fullText}>Esta sucursal aún no configuró sus mesas.</Text>
          </View>
        )}

        {/* Promociones de esta sucursal */}
        {promos.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 26 }]}>Promociones del local</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
              {promos.map((promo) => (
                <PromoCard key={promo.id} promo={promo} width={250} />
              ))}
            </ScrollView>
          </>
        )}

        {/* Menú de productos */}
        {menu.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: 26 }]}>Menú · pide en tu mesa</Text>
            {Object.entries(menuByCategory).map(([category, items]) => (
              <View key={category} style={s.menuCategory}>
                <Text style={s.menuCategoryTitle}>{category}</Text>
                <View style={s.menuCard}>
                  {items.map((item, idx) => (
                    <View key={item.id} style={[s.menuItem, idx > 0 && s.menuItemBorder, item.agotado && { opacity: 0.45 }]}>
                      <View style={s.menuItemHead}>
                        <Text style={s.menuItemName}>{item.name}</Text>
                        {item.agotado && (
                          <View style={s.agotadoBadge}>
                            <Text style={s.agotadoText}>AGOTADO</Text>
                          </View>
                        )}
                      </View>
                      {item.description && <Text style={s.menuItemDesc}>{item.description}</Text>}
                      <View style={s.presRow}>
                        {item.presentations.map((pres) => (
                          <View key={pres.id} style={[s.presChip, !pres.available && s.presChipOff]}>
                            <Text style={[s.presName, !pres.available && { color: C.faint }]}>
                              {pres.name}
                            </Text>
                            <Text style={[s.presPrice, !pres.available && { color: C.faint, textDecorationLine: 'line-through' }]}>
                              Bs {Number(pres.price).toFixed(0)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#222', gap: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerEyebrow: { fontSize: 9, fontWeight: '800', color: C.accent, letterSpacing: 1.5 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: C.cream, letterSpacing: -0.3, marginTop: 1 },
  hoursBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.card, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: C.border },
  hoursText: { fontSize: 10, color: C.muted, fontWeight: '700' },

  scroll: { padding: 16, paddingBottom: 32 },

  liveBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: C.border, marginBottom: 14 },
  liveLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  liveText: { fontSize: 11, fontWeight: '700', color: C.muted },
  legend: { flexDirection: 'row', gap: 8 },
  legendItem: { fontSize: 9, fontWeight: '700' },

  intro: { fontSize: 12, color: C.muted, marginBottom: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  tableCard: { width: '31.4%', borderRadius: 14, padding: 11, gap: 4, borderWidth: 1, alignItems: 'center' },
  skeleton: { backgroundColor: C.card, borderColor: C.border, height: 96 },
  tableLibre: { backgroundColor: C.cardAlt, borderColor: C.borderAccent },
  tableOcupada: { backgroundColor: '#151515', borderColor: '#222', opacity: 0.6 },
  tableReservada: { backgroundColor: C.card, borderColor: '#f4a26130' },
  tableFuera: { backgroundColor: '#151515', borderColor: '#1d1d1d', opacity: 0.45 },
  tableIconWrap: { marginBottom: 1 },
  tableName: { fontSize: 13, fontWeight: '900', color: C.cream, letterSpacing: -0.2 },
  tableFooter: { alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ffffff0d', paddingTop: 6, marginTop: 3, alignSelf: 'stretch', gap: 1 },
  tableStatus: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8 },
  tablePrice: { fontSize: 11, fontWeight: '800', color: C.cream },

  fullAlert: { backgroundColor: C.redBg + '66', borderWidth: 1, borderColor: '#f8717125', borderRadius: 18, padding: 20, alignItems: 'center', gap: 6, marginTop: 18 },
  fullTitle: { fontSize: 14, fontWeight: '800', color: C.cream },
  fullText: { fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 17 },

  sectionTitle: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  // Menú
  menuCategory: { marginTop: 14 },
  menuCategoryTitle: { fontSize: 12, fontWeight: '800', color: C.mint, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  menuCard: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  menuItem: { padding: 14, gap: 4 },
  menuItemBorder: { borderTopWidth: 1, borderTopColor: '#ffffff0c' },
  menuItemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  menuItemName: { fontSize: 14, fontWeight: '800', color: C.cream, flex: 1 },
  menuItemDesc: { fontSize: 11, color: C.faint },
  agotadoBadge: { backgroundColor: '#2a2a2a', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  agotadoText: { fontSize: 8, fontWeight: '800', color: C.faint, letterSpacing: 0.8 },
  presRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 5 },
  presChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accentDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: C.borderAccent },
  presChipOff: { backgroundColor: '#1d1d1d', borderColor: C.border },
  presName: { fontSize: 11, fontWeight: '700', color: C.mint },
  presPrice: { fontSize: 12, fontWeight: '900', color: C.cream },
});
