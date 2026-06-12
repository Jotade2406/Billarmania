import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Logo } from '../src/components/Logo';
import { C } from '../src/theme';

const SLIDES = [
  {
    icon: 'grid' as const,
    title: 'Ve mesas disponibles en tiempo real',
    text: 'Revisa el estado de todas las mesas del local al instante y encuentra tu espacio ideal sin sorpresas.',
  },
  {
    icon: 'calendar' as const,
    title: 'Reserva con anticipación',
    text: 'Asegura tu partida en la mesa que prefieras, en el horario que mejor te convenga, pagando por QR.',
  },
  {
    icon: 'time' as const,
    title: 'Llega y juega sin esperas',
    text: 'Tu tiempo es valioso. Con tu reserva confirmada, solo preocúpate de dar el primer golpe espectacular.',
  },
];

async function finish() {
  await SecureStore.setItemAsync('onboarding_done', 'true');
  router.replace('/(auth)/login');
}

export default function OnboardingScreen() {
  const [slide, setSlide] = useState(0);
  const current = SLIDES[slide];

  function next() {
    if (slide < SLIDES.length - 1) setSlide(slide + 1);
    else finish();
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Glow ambiental */}
      <View style={s.glowTop} />
      <View style={s.glowBottom} />

      <View style={s.content}>
        {/* Marca */}
        <View style={s.brand}>
          <Logo size={92} />
          <Text style={s.brandName}>Billarmania</Text>
          <Text style={s.brandTag}>"TU MESA TE ESPERA"</Text>
        </View>

        {/* Slide card */}
        <View style={s.slideCard}>
          <View style={s.slideIconRing}>
            <Ionicons name={current.icon} size={30} color={C.mint} />
          </View>
          <Text style={s.slideTitle}>{current.title}</Text>
          <Text style={s.slideText}>{current.text}</Text>

          {/* Indicadores */}
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <View key={i} style={[s.dot, i === slide && s.dotActive]} />
            ))}
          </View>
        </View>

        {/* Acciones */}
        <View style={s.actions}>
          <TouchableOpacity style={s.btn} onPress={next} activeOpacity={0.88}>
            <Text style={s.btnText}>{slide === SLIDES.length - 1 ? 'Empezar' : 'Siguiente'}</Text>
            <Ionicons name="arrow-forward" size={18} color={C.bg} />
          </TouchableOpacity>
          {slide < SLIDES.length - 1 && (
            <TouchableOpacity onPress={finish} style={s.skipBtn}>
              <Text style={s.skipText}>Saltar intro</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  glowTop: { position: 'absolute', top: -150, left: -120, width: 320, height: 320, borderRadius: 160, backgroundColor: C.primary, opacity: 0.14 },
  glowBottom: { position: 'absolute', bottom: -150, right: -120, width: 320, height: 320, borderRadius: 160, backgroundColor: C.accent, opacity: 0.1 },
  content: { flex: 1, paddingHorizontal: 26, paddingVertical: 36, justifyContent: 'space-between' },

  brand: { alignItems: 'center', marginTop: 24, gap: 4 },
  brandName: { fontSize: 30, fontWeight: '900', color: C.cream, letterSpacing: -0.8, marginTop: 14 },
  brandTag: { fontSize: 11, fontWeight: '700', color: C.accent, letterSpacing: 2.5, fontStyle: 'italic' },

  slideCard: { backgroundColor: C.card, borderRadius: 22, padding: 26, alignItems: 'center', borderWidth: 1, borderColor: C.border, gap: 10 },
  slideIconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderAccent, marginBottom: 6 },
  slideTitle: { fontSize: 19, fontWeight: '800', color: C.cream, textAlign: 'center', letterSpacing: -0.4, lineHeight: 26 },
  slideText: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 21, maxWidth: 270 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 14 },
  dot: { width: 22, height: 5, borderRadius: 3, backgroundColor: '#333' },
  dotActive: { backgroundColor: C.accent },

  actions: { gap: 8 },
  btn: { backgroundColor: C.accent, borderRadius: 14, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: C.accent, shadowOpacity: 0.3, shadowRadius: 14, elevation: 6 },
  btnText: { color: C.bg, fontWeight: '900', fontSize: 16, letterSpacing: 0.2 },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { color: C.faint, fontSize: 13, fontWeight: '600' },
});
