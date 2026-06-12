import { Modal, View, Image, Text, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';

const { width: W, height: H } = Dimensions.get('window');

interface Props {
  visible: boolean;
  uri: string | null;
  title?: string;
  description?: string | null;
  linkUrl?: string | null;
  onClose: () => void;
}

/** Visor a pantalla completa para anuncios y promociones. */
export function ImageViewerModal({ visible, uri, title, description, linkUrl, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.backdrop}>
        {/* Cerrar */}
        <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color={C.cream} />
        </TouchableOpacity>

        {/* Imagen completa (tocar fuera también cierra) */}
        <TouchableOpacity style={s.imageArea} activeOpacity={1} onPress={onClose}>
          {uri && (
            <Image source={{ uri }} style={s.image} resizeMode="contain" />
          )}
        </TouchableOpacity>

        {/* Info */}
        {(title || description) && (
          <View style={s.info}>
            {title && <Text style={s.title}>{title}</Text>}
            {description ? <Text style={s.description}>{description}</Text> : null}
            {linkUrl && (
              <TouchableOpacity
                style={s.linkBtn}
                onPress={() => Linking.openURL(linkUrl).catch(() => {})}
                activeOpacity={0.85}
              >
                <Ionicons name="open-outline" size={15} color={C.bg} />
                <Text style={s.linkBtnText}>Ver más</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000f2', justifyContent: 'center' },
  closeBtn: { position: 'absolute', top: 52, right: 18, zIndex: 10, width: 40, height: 40, borderRadius: 13, backgroundColor: '#ffffff18', alignItems: 'center', justifyContent: 'center' },
  imageArea: { width: W, height: H * 0.62, justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  info: { paddingHorizontal: 24, paddingBottom: 36, gap: 6, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '900', color: C.cream, textAlign: 'center', letterSpacing: -0.3 },
  description: { fontSize: 13, color: C.muted, textAlign: 'center', lineHeight: 19 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10, marginTop: 8 },
  linkBtnText: { color: C.bg, fontWeight: '800', fontSize: 13 },
});
