import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Ad {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string | null;
  branch?: { id: string; name: string };
}

/** Anuncios vigentes de todas las sucursales (carrusel del home). Cache 5 min. */
export function useAds() {
  return useQuery<Ad[]>({
    queryKey: ['ads-active'],
    queryFn: async () => { const { data } = await api.get('/advertisements/active'); return data; },
    staleTime: 5 * 60 * 1000,
  });
}

/** Registra una vista del anuncio (fire-and-forget, no bloquea la UI). */
export function registerAdView(adId: string) {
  api.post(`/advertisements/${adId}/view`).catch(() => {});
}
