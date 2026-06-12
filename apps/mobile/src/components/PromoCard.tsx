import { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageViewerModal } from './ImageViewerModal';
import { C } from '../theme';
import type { Promo } from '../hooks/usePromotions';

/** Card de promoción: precio tachado, precio promo, ahorro y urgencia. Tocar = imagen completa. */
export function PromoCard({ promo, width = 270 }: { promo: Promo; width?: number }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const fewLeft = promo.usesLeft != null && promo.usesLeft <= 5;
  const until = new Date(promo.validUntil);

  const priceLine = `${promo.presentation.product.name}${promo.presentation.unitsPerSale > 1 ? ` (${promo.presentation.name})` : ''} — Bs ${Number(promo.promoPrice).toFixed(0)} en vez de Bs ${Number(promo.originalPrice).toFixed(0)} · ${promo.branch?.name ?? ''}`;

  return (
    <>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setViewerOpen(true)} style={[s.card, { width }]}>
        {promo.imageUrl ? (
          <Image source={{ uri: promo.imageUrl }} style={s.image} resizeMode="cover" />
        ) : (
          <View style={s.imagePlaceholder}>
            <Ionicons name="pricetag" size={26} color={C.accent} />
          </View>
        )}

        <View style={s.body}>
          <Text style={s.branch} numberOfLines={1}>{promo.branch?.name}</Text>
          <Text style={s.title} numberOfLines={1}>{promo.title}</Text>
          <Text style={s.product} numberOfLines={1}>
            {promo.presentation.product.name}
            {promo.presentation.unitsPerSale > 1 && ` · ${promo.presentation.name}`}
          </Text>

          <View style={s.priceRow}>
            <Text style={s.original}>Bs {Number(promo.originalPrice).toFixed(0)}</Text>
            <Text style={s.promo}>Bs {Number(promo.promoPrice).toFixed(0)}</Text>
            <View style={s.saveBadge}>
              <Text style={s.saveText}>Ahorras Bs {promo.savings.toFixed(0)}</Text>
            </View>
          </View>

          <View style={s.footer}>
            <Text style={s.until}>
              Hasta el {until.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })}
            </Text>
            {fewLeft && (
              <View style={s.fewBadge}>
                <Text style={s.fewText}>¡Solo quedan {promo.usesLeft}!</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <ImageViewerModal
        visible={viewerOpen}
        uri={promo.imageUrl}
        title={promo.title}
        description={promo.description ?? priceLine}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  image: { width: '100%', height: 110 },
  imagePlaceholder: { width: '100%', height: 72, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 13, gap: 2 },
  branch: { fontSize: 9, fontWeight: '800', color: C.accent, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { fontSize: 14, fontWeight: '900', color: C.cream, letterSpacing: -0.2 },
  product: { fontSize: 11, color: C.muted },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 7 },
  original: { fontSize: 12, color: C.faint, textDecorationLine: 'line-through' },
  promo: { fontSize: 19, fontWeight: '900', color: C.mint, letterSpacing: -0.5 },
  saveBadge: { backgroundColor: '#f4a26120', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  saveText: { fontSize: 9, fontWeight: '800', color: C.amber },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, borderTopWidth: 1, borderTopColor: '#ffffff0c', paddingTop: 7 },
  until: { fontSize: 10, color: C.faint },
  fewBadge: { backgroundColor: '#e24b4a22', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 },
  fewText: { fontSize: 9, fontWeight: '800', color: C.red },
});
