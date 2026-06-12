import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Package, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  price: number;
  cost: number | null;
  stock: number;
  unit: string;
  category: string | null;
}

const stockSchema = z.object({
  quantity: z.coerce.number().min(1, 'Mínimo 1'),
  notes: z.string().optional(),
});
type StockForm = z.infer<typeof stockSchema>;

export function InventarioPage({ branchId }: { branchId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Product | null>(null);
  const form = useForm<StockForm>({ resolver: zodResolver(stockSchema), defaultValues: { quantity: 1 } });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', branchId],
    queryFn: async () => { const { data } = await api.get(`/inventory/branch/${branchId}`); return data; },
  });

  const addStock = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: StockForm }) =>
      api.post(`/inventory/products/${id}/stock`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', branchId] });
      setSelected(null);
      form.reset({ quantity: 1 });
      toast({ title: 'Stock actualizado' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  const lowStock = products.filter((p) => p.stock <= 3);
  const totalValue = products.reduce((acc, p) => acc + Number(p.price) * p.stock, 0);

  function stockColor(stock: number) {
    if (stock === 0) return 'text-red-600 bg-red-50 border-red-200';
    if (stock <= 3) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-brand-deep bg-brand-green/10 border-brand-green/20';
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 max-w-2xl">
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Productos</p>
          <p className="text-2xl font-black mt-1 tabular-nums">{products.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bajo stock</p>
          <p className={`text-2xl font-black mt-1 tabular-nums ${lowStock.length > 0 ? 'text-amber-600' : ''}`}>{lowStock.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-border p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valor inventario</p>
          <p className="text-2xl font-black text-brand-green mt-1 tabular-nums">Bs {totalValue.toFixed(0)}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Stock bajo</p>
              <p className="text-xs text-amber-700">{lowStock.map((p) => p.name).join(', ')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : products.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-slate-400">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Sin productos. El dueño debe agregarlos desde su panel.</p>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {p.category && <p className="text-[10px] text-slate-400 uppercase tracking-wide">{p.category}</p>}
                    <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                    <p className="text-sm text-slate-500">Bs {Number(p.price).toFixed(2)} / {p.unit}</p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full border font-semibold flex-shrink-0 ${stockColor(p.stock)}`}>
                    {p.stock} {p.unit}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-3 text-xs"
                  onClick={() => { setSelected(p); form.reset({ quantity: 1 }); }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Agregar stock
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add stock dialog */}
      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Agregar stock — {selected?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((dto) => selected && addStock.mutate({ id: selected.id, dto }))} className="space-y-3">
            <div>
              <Label>Cantidad a agregar ({selected?.unit})</Label>
              <Input type="number" min={1} {...form.register('quantity')} />
              {form.formState.errors.quantity && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.quantity.message}</p>
              )}
              {selected && (
                <p className="text-xs text-slate-500 mt-1">Stock actual: {selected.stock} {selected.unit}</p>
              )}
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input placeholder="Ej: Compra de proveedor, pedido #123" {...form.register('notes')} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setSelected(null)}>Cancelar</Button>
              <Button type="submit" disabled={addStock.isPending}>
                {addStock.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <TrendingUp className="h-4 w-4 mr-2" />Agregar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
