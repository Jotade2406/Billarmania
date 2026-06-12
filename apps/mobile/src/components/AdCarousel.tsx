import { useEffect, useRef, useState } from 'react';
import { View, FlatList, Image, Text, StyleSheet, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { useAds, registerAdView, type Ad } from '../hooks/useAds';
import { C } from '../theme';

const SCREEN_W = Dimensions.get('window').width;
const CARD_W = SCREEN_W - 36; // padding horizontal del scroll (18 × 2)

/** Carrusel de anuncios del home: auto-scroll, indicadores y registro de vistas. */
export function AdCarousel() {
  const { data: ads = [] } = useAds();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Ad>>(null);
  const viewed = useRef<Set<string>>(new Set());

  // Registrar vista del anuncio visible (una sola vez por sesión)
  useEffect(() => {
    const ad = ads[index];
    if (ad && !viewed.current.has(ad.id)) {
      viewed.current.add(ad.id);
      registerAdView(ad.id);
    }
  }, [index, ads]);

  // Auto-scroll cada 4.5s
  useEffect(() => {
    if (ads.length <= 1) return;
    const t = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % ads.length;
        listRef.current?.scrollToOffset({ offset: next * CARD_W, animated: true });
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [ads.length]);

  if (ads.length === 0) return null;

  return (
    <View style={s.wrap}>
      <FlatList
        ref={listRef}
        data={ads}
        keyExtractor={(a) => a.id}
        horizontal
        pagingEnabled
        snapToInterval={CARD_W}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / CARD_W);
          setIndex(Math.max(0, Math.min(i, ads.length - 1)));
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={item.linkUrl ? 0.85 : 1}
            onPress={() => item.linkUrl && Linking.openURL(item.linkUrl).catch(() => {})}
            style={{ width: CARD_W }}
          >
            <View style={s.card}>
              <Image source={{ uri: item.imageUrl }} style={s.image} resizeMode="cover" />
              {item.branch?.name && (
                <View style={s.branchTag}>
                  <Text style={s.branchTagText}>{item.branch.name}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
      {/* Indicadores */}
      {ads.length > 1 && (
        <View style={s.dots}>
          {ads.map((_, i) => (
            <View key={i} style={[s.dot, i === index && s.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 24 },
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  image: { width: '100%', aspectRatio: 16 / 9 },
  branchTag: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#000000aa', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  branchTagText: { color: C.mint, fontSize: 10, fontWeight: '800' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive: { width: 18, backgroundColor: C.accent },
});
