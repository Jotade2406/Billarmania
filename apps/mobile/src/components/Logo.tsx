import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

/** Logo Billarmania: pin de ubicación con bola 8 dentro. */
export function Logo({ size = 64 }: { size?: number }) {
  const pin = size * 0.72;
  return (
    <View style={[s.box, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <View style={s.pinWrap}>
        <Ionicons name="location" size={pin} color={C.accent} />
        <View style={[s.ball, { width: pin * 0.38, height: pin * 0.38, borderRadius: pin * 0.19, top: pin * 0.16 }]}>
          <Text style={[s.eight, { fontSize: pin * 0.22 }]}>8</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  box: {
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.borderAccent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  pinWrap: { alignItems: 'center', justifyContent: 'center' },
  ball: {
    position: 'absolute',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eight: { color: '#121212', fontWeight: '900' },
});
