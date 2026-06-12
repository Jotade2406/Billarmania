import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { isOpenNow } from '../theme';

export interface BranchData {
  id: string;
  name: string;
  address: string | null;
  openTime: string | null;
  closeTime: string | null;
  chain: { id: string; name: string };
  totalTables: number;
  freeTables: number;
  isOpen: boolean | null;
}

export interface ChainData {
  id: string;
  name: string;
  branches: BranchData[];
  branchesCount: number;
  openCount: number;
  freeTables: number;
  isOpen: boolean;
}

/** Carga cadenas + sucursales con disponibilidad calculada (mesas libres, abierto/cerrado). */
export function useBranches() {
  return useQuery<{ branches: BranchData[]; chains: ChainData[] }>({
    queryKey: ['branches-availability'],
    queryFn: async () => {
      const { data: rawChains } = await api.get('/chains');
      const branches: BranchData[] = [];
      const chains: ChainData[] = [];

      for (const chain of rawChains) {
        const { data: bs } = await api.get(`/chains/${chain.id}/branches`);
        const chainBranches: BranchData[] = bs.map((b: any) => ({
          id: b.id,
          name: b.name,
          address: b.address,
          openTime: b.openTime,
          closeTime: b.closeTime,
          chain: b.chain ?? { id: chain.id, name: chain.name },
          totalTables: b._count?.tables ?? b.tables?.length ?? 0,
          freeTables: (b.tables ?? []).filter((t: any) => t.status === 'LIBRE').length,
          isOpen: isOpenNow(b.openTime, b.closeTime),
        }));
        branches.push(...chainBranches);
        chains.push({
          id: chain.id,
          name: chain.name,
          branches: chainBranches,
          branchesCount: chainBranches.length,
          openCount: chainBranches.filter((b) => b.isOpen !== false).length,
          freeTables: chainBranches.reduce((acc, b) => acc + b.freeTables, 0),
          isOpen: chainBranches.some((b) => b.isOpen !== false),
        });
      }
      return { branches, chains };
    },
    refetchInterval: 30000,
  });
}
