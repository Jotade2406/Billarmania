import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Package, Pencil, Trash2, Loader2, TrendingUp, AlertTriangle, Boxes, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/hooks/use-toast';

interface Presentation {
  id: string;
  name: string;
  description: string | null;
  unitsPerSale: number;
  price: number;
  isActive: boolean;
  available: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  cost: number | null;
  stock: number;
  unit: string;
  minStockAlert: number;
  stockLevel: 'normal' | 'bajo' | 'critico';
  isActive: boolean;
  presentations: Presentation[];
}

const productSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
  cost: z.coerce.number().min(0).optional(),
  stock: z.coerce.number().min(0).default(0),
  unit: z.string().default('unidad'),
});
type ProductForm = z.infer<typeof productSchema>;

const stockSchema = z.object({ quantity: z.coerce.number().min(1), notes: z.string().optional() });
type StockForm = z.infer<typeof stockSchema>;

const presSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  description: z.string().optional(),
  unitsPerSale: z.coerce.number().int().min(1, 'Mínimo 1'),
  price: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
});
type PresForm = z.infer<typeof presSchema>;

export function DuenoInventarioPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const qc = useQueryClient();
  const branchId = user?.staffBranchId;

  const [productDialog, setProductDialog] = useState<'create' | Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [stockTarget, setStockTarget] = useState<Product | null>(null);
  // null = cerrado; { product } = crear; { product, pres } = editar
  const [presDialog, setPresDialog] = useState<{ product: Product; pres?: Presentation } | null>(null);

  const productForm = useForm<ProductForm>({ resolver: zodResolver(productSchema) });
  const stockForm = useForm<StockForm>({ resolver: zodResolver(stockSchema), defaultValues: { quantity: 1 } });
  const presForm = useForm<PresForm>({ resolver: zodResolver(presSchema) });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products', branchId],
    queryFn: async () => { const { data } = await api.get(`/inventory/branch/${branchId}`); return data; },
    enabled: !!branchId,
  });

  const createProduct = useMutation({
    mutationFn: (dto: ProductForm) => api.post(`/inventory/branch/${branchId}`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products', branchId] }); setProductDialog(null); toast({ title: 'Producto creado' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<ProductForm> }) => api.put(`/inventory/products/${id}`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products', branchId] }); setProductDialog(null); toast({ title: 'Producto actualizado' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.delete(`/inventory/products/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products', branchId] }); setDeleteTarget(null); toast({ title: 'Producto eliminado' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  const addStock = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: StockForm }) => api.post(`/inventory/products/${id}/stock`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products', branchId] }); setStockTarget(null); stockForm.reset({ quantity: 1 }); toast({ title: 'Stock actualizado' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  const savePres = useMutation({
    mutationFn: ({ productId, presId, dto }: { productId: string; presId?: string; dto: PresForm }) =>
      presId
        ? api.put(`/inventory/products/${productId}/presentations/${presId}`, dto)
        : api.post(`/inventory/products/${productId}/presentations`, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', branchId] });
      setPresDialog(null);
      toast({ title: 'Presentación guardada' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  const removePres = useMutation({
    mutationFn: ({ productId, presId }: { productId: string; presId: string }) =>
      api.delete(`/inventory/products/${productId}/presentations/${presId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products', branchId] }); toast({ title: 'Presentación desactivada' }); },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error', variant: 'destructive' }),
  });

  function openCreate() {
    productForm.reset({ name: '', category: '', description: '', price: 0, cost: 0, stock: 0, unit: 'unidad' });
    setProductDialog('create');
  }

  function openEdit(p: Product) {
    productForm.reset({ name: p.name, category: p.category ?? '', description: p.description ?? '', price: Number(p.price), cost: Number(p.cost ?? 0), stock: p.stock, unit: p.unit });
    setProductDialog(p);
  }

  function stockColor(level: Product['stockLevel']) {
    if (level === 'critico') return 'text-red-600 bg-red-50 border-red-200';
    if (level === 'bajo') return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-brand-deep bg-brand-green/5 border-brand-green/25';
  }

  const lowStock = products.filter((p) => p.stockLevel !== 'normal');
  const totalValue = products.reduce((acc, p) => acc + Number(p.price) * p.stock, 0);

  function openPresCreate(product: Product) {
    presForm.reset({ name: '', description: '', unitsPerSale: 1, price: Number(product.price) });
    setPresDialog({ product });
  }

  function openPresEdit(product: Product, pres: Presentation) {
    presForm.reset({
      name: pres.name,
      description: pres.description ?? '',
      unitsPerSale: pres.unitsPerSale,
      price: Number(pres.price),
    });
    setPresDialog({ product, pres });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500">Gestiona los productos disponibles en tu sucursal</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Nuevo producto</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-slate-500">Productos</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-slate-500">Bajo stock</p>
          <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-amber-600' : ''}`}>{lowStock.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-xs text-slate-500">Valor</p>
          <p className="text-2xl font-bold text-brand-green">Bs {totalValue.toFixed(0)}</p>
        </CardContent></Card>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800"><strong>Bajo stock:</strong> {lowStock.map((p) => p.name).join(', ')}</p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
      ) : products.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-slate-400">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Sin productos. Crea el primero.</p>
        </CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map((p) => (
            <Card key={p.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                {p.category && <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">{p.category}</p>}
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900 leading-tight">{p.name}</p>
                  <div className={`text-xs px-2 py-1 rounded-full border font-semibold flex-shrink-0 ${stockColor(p.stockLevel)}`}>
                    {p.stock} {p.unit}{p.stock !== 1 ? (p.unit.endsWith('s') ? '' : 's') : ''}
                  </div>
                </div>
                {p.description && <p className="text-xs text-slate-500 mt-1">{p.description}</p>}

                {/* Presentaciones / paquetes */}
                <div className="mt-3 rounded-xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                  {p.presentations.map((pres) => (
                    <div key={pres.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50/50 group">
                      <Boxes className={`h-3.5 w-3.5 flex-shrink-0 ${pres.available ? 'text-brand-green' : 'text-slate-300'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {pres.name}
                          {pres.unitsPerSale > 1 && (
                            <span className="text-slate-400 font-normal"> · descuenta {pres.unitsPerSale}</span>
                          )}
                        </p>
                        {!pres.available && <p className="text-[10px] text-amber-600 font-semibold">Sin stock suficiente</p>}
                      </div>
                      <span className="text-xs font-bold text-brand-deep tabular-nums">Bs {Number(pres.price).toFixed(2)}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 text-slate-400 hover:text-slate-700" onClick={() => openPresEdit(p, pres)}>
                          <Pencil className="h-3 w-3" />
                        </button>
                        {p.presentations.length > 1 && (
                          <button
                            className="p-1 text-slate-400 hover:text-red-500"
                            onClick={() => removePres.mutate({ productId: p.id, presId: pres.id })}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => openPresCreate(p)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-brand-green hover:bg-brand-green/5 transition-colors"
                  >
                    <Plus className="h-3 w-3" />Agregar paquete
                  </button>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => { setStockTarget(p); stockForm.reset({ quantity: 1 }); }}>
                    <TrendingUp className="h-3 w-3 mr-1" />Reponer stock
                  </Button>
                  <Button size="sm" variant="outline" className="px-2" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="px-2 text-red-500 hover:bg-red-50 hover:border-red-300" onClick={() => setDeleteTarget(p)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit product dialog */}
      <Dialog open={!!productDialog} onOpenChange={(v) => { if (!v) setProductDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{productDialog === 'create' ? 'Nuevo producto' : 'Editar producto'}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={productForm.handleSubmit((dto) => {
              if (productDialog === 'create') createProduct.mutate(dto);
              else if (productDialog !== null && typeof productDialog === 'object') updateProduct.mutate({ id: productDialog.id, dto });
            })}
            className="space-y-3"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nombre *</Label>
                <Input {...productForm.register('name')} />
                {productForm.formState.errors.name && <p className="text-xs text-destructive">{productForm.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label>Categoría</Label>
                <Input placeholder="Ej: Bebidas" {...productForm.register('category')} />
              </div>
              <div>
                <Label>Unidad</Label>
                <Input placeholder="unidad, botella..." {...productForm.register('unit')} />
              </div>
              <div>
                <Label>Precio venta (Bs) *</Label>
                <Input type="number" step="0.01" {...productForm.register('price')} />
                {productForm.formState.errors.price && <p className="text-xs text-destructive">{productForm.formState.errors.price.message}</p>}
              </div>
              <div>
                <Label>Costo (Bs)</Label>
                <Input type="number" step="0.01" {...productForm.register('cost')} />
              </div>
              {productDialog === 'create' && (
                <div className="col-span-2">
                  <Label>Stock inicial</Label>
                  <Input type="number" min={0} {...productForm.register('stock')} />
                </div>
              )}
              <div className="col-span-2">
                <Label>Descripción</Label>
                <Input placeholder="Opcional..." {...productForm.register('description')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProductDialog(null)}>Cancelar</Button>
              <Button type="submit" disabled={createProduct.isPending || updateProduct.isPending}>
                {(createProduct.isPending || updateProduct.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {productDialog === 'create' ? 'Crear' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add stock dialog */}
      <Dialog open={!!stockTarget} onOpenChange={(v) => { if (!v) setStockTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Agregar stock — {stockTarget?.name}</DialogTitle></DialogHeader>
          <form onSubmit={stockForm.handleSubmit((dto) => stockTarget && addStock.mutate({ id: stockTarget.id, dto }))} className="space-y-3">
            <div>
              <Label>Cantidad ({stockTarget?.unit})</Label>
              <Input type="number" min={1} {...stockForm.register('quantity')} />
              {stockForm.formState.errors.quantity && <p className="text-xs text-destructive">{stockForm.formState.errors.quantity.message}</p>}
              {stockTarget && <p className="text-xs text-slate-500 mt-1">Stock actual: {stockTarget.stock}</p>}
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input placeholder="Ej: Compra de proveedor" {...stockForm.register('notes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStockTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={addStock.isPending}>
                {addStock.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Agregar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Presentation dialog */}
      <Dialog open={!!presDialog} onOpenChange={(v) => { if (!v) setPresDialog(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-brand-green" />
              {presDialog?.pres ? 'Editar paquete' : 'Nuevo paquete'} — {presDialog?.product.name}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={presForm.handleSubmit((dto) =>
              presDialog && savePres.mutate({ productId: presDialog.product.id, presId: presDialog.pres?.id, dto }),
            )}
            className="space-y-3"
          >
            <div>
              <Label>Nombre del paquete *</Label>
              <Input placeholder="Ej: Media docena, Cajetilla" {...presForm.register('name')} />
              {presForm.formState.errors.name && <p className="text-xs text-destructive">{presForm.formState.errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Unidades que descuenta *</Label>
                <Input type="number" min={1} {...presForm.register('unitsPerSale')} />
                {presForm.formState.errors.unitsPerSale && <p className="text-xs text-destructive">{presForm.formState.errors.unitsPerSale.message}</p>}
              </div>
              <div>
                <Label>Precio (Bs) *</Label>
                <Input type="number" step="0.01" {...presForm.register('price')} />
                {presForm.formState.errors.price && <p className="text-xs text-destructive">{presForm.formState.errors.price.message}</p>}
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input placeholder="Ej: 6 cervezas" {...presForm.register('description')} />
            </div>
            {/* Comparativa en vivo vs precio unitario */}
            {presDialog && Number(presForm.watch('unitsPerSale')) > 1 && Number(presForm.watch('price')) > 0 && (
              <div className="bg-brand-green/5 border border-brand-green/20 rounded-xl p-3 text-xs text-brand-deep">
                Equivale a <strong>Bs {(Number(presForm.watch('price')) / Number(presForm.watch('unitsPerSale'))).toFixed(2)}</strong> por {presDialog.product.unit}
                {' '}(suelto: Bs {Number(presDialog.product.price).toFixed(2)})
                {Number(presForm.watch('price')) / Number(presForm.watch('unitsPerSale')) < Number(presDialog.product.price) && (
                  <strong> — el cliente ahorra Bs {((Number(presDialog.product.price) - Number(presForm.watch('price')) / Number(presForm.watch('unitsPerSale'))) * Number(presForm.watch('unitsPerSale'))).toFixed(2)}</strong>
                )}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPresDialog(null)}>Cancelar</Button>
              <Button type="submit" disabled={savePres.isPending}>
                {savePres.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar producto</DialogTitle></DialogHeader>
          <p className="text-sm">¿Eliminar <strong>{deleteTarget?.name}</strong>? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteProduct.isPending} onClick={() => deleteTarget && deleteProduct.mutate(deleteTarget.id)}>
              {deleteProduct.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
