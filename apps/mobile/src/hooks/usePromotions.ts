import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Promo {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  originalPrice: number;
  promoPrice: number;
  savings: number;
  usesLeft: number | null;
  validUntil: string;
  branch: { id: string; name: string };
  presentation: {
    id: string;
    name: string;
    unitsPerSale: number;
    product: { id: string; name: string };
  };
}

/** Promociones vigentes — de todas las sucursales o de una específica. Cache 5 min. */
export function usePromotions(branchId?: string) {
  return useQuery<Promo[]>({
    queryKey: ['promos-active', branchId ?? 'all'],
    queryFn: async () => {
      const url = branchId ? `/promotions/branch/${branchId}` : '/promotions/active';
      const { data } = await api.get(url);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
