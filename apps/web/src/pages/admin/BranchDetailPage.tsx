import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, QrCode, CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Table {
  id: string;
  label: string;
  status: string;
  hourlyRate: number | null;
}

interface PaymentMethod {
  id: string;
  type: string;
  displayName: string;
  accountInfo: string | null;
  qrImageUrl: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  LIBRE: 'Libre',
  OCUPADA: 'Ocupada',
  RESERVADA: 'Reservada',
  FUERA_DE_SERVICIO: 'Fuera de servicio',
};

const STATUS_COLORS: Record<string, string> = {
  LIBRE: 'bg-brand-green/10 text-brand-deep',
  OCUPADA: 'bg-red-100 text-red-800',
  RESERVADA: 'bg-amber-100 text-amber-800',
  FUERA_DE_SERVICIO: 'bg-slate-100 text-slate-600',
};

const tableSchema = z.object({
  label: z.string().min(1, 'Requerido'),
  hourlyRate: z.coerce.number().min(0).optional(),
});

const pmSchema = z.object({
  type: z.enum(['QR_BANCARIO', 'TIGO_MONEY', 'BILLETERA', 'OTRO']),
  displayName: z.string().min(2, 'Mínimo 2 caracteres'),
  accountInfo: z.string().optional(),
  qrImageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

type TableForm = z.infer<typeof tableSchema>;
type PmForm = z.infer<typeof pmSchema>;

export function BranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tableDialog, setTableDialog] = useState(false);
  const [editTable, setEditTable] = useState<Table | null>(null);
  const [pmDialog, setPmDialog] = useState(false);

  const { data: branch } = useQuery<{ name: string; address: string | null }>({
    queryKey: ['branch', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/branches/${branchId}`);
      return data;
    },
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery<Table[]>({
    queryKey: ['tables', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/branches/${branchId}/tables`);
      return data;
    },
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods', branchId],
    queryFn: async () => {
      const { data } = await api.get(`/branches/${branchId}/payment-methods`);
      return data;
    },
  });

  const tableForm = useForm<TableForm>({ resolver: zodResolver(tableSchema) });
  const pmForm = useForm<PmForm>({ resolver: zodResolver(pmSchema), defaultValues: { type: 'QR_BANCARIO' } });

  const createTable = useMutation({
    mutationFn: (dto: TableForm) => api.post(`/tables/branch/${branchId}`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', branchId] }); setTableDialog(false); toast({ title: 'Mesa creada' }); },
    onError: () => toast({ title: 'Error al crear mesa', variant: 'destructive' }),
  });

  const updateTable = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: TableForm }) => api.put(`/tables/${id}`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', branchId] }); setEditTable(null); toast({ title: 'Mesa actualizada' }); },
    onError: () => toast({ title: 'Error al actualizar', variant: 'destructive' }),
  });

  const deleteTable = useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tables', branchId] }); toast({ title: 'Mesa eliminada' }); },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  const createPm = useMutation({
    mutationFn: (dto: PmForm) => api.post(`/branches/${branchId}/payment-methods`, { ...dto, qrImageUrl: dto.qrImageUrl || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-methods', branchId] }); setPmDialog(false); toast({ title: 'Método de pago agregado' }); },
    onError: () => toast({ title: 'Error al agregar', variant: 'destructive' }),
  });

  const deletePm = useMutation({
    mutationFn: (pmId: string) => api.delete(`/branches/${branchId}/payment-methods/${pmId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-methods', branchId] }); toast({ title: 'Método eliminado' }); },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/admin/branches">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Sucursales
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{branch?.name ?? '...'}</h1>
          {branch?.address && <p className="text-sm text-slate-500">{branch.address}</p>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tables section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Mesas ({tables.length})</h2>
            <Button size="sm" variant="outline" onClick={() => { tableForm.reset(); setTableDialog(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Mesa
            </Button>
          </div>

          {tablesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
          ) : (
            <div className="space-y-2">
              {tables.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{t.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>
                          {STATUS_LABELS[t.status]}
                        </span>
                      </div>
                      {t.hourlyRate != null && (
                        <p className="text-xs text-slate-500 mt-0.5">Bs {t.hourlyRate}/hora</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => { tableForm.reset({ label: t.label, hourlyRate: t.hourlyRate ?? undefined }); setEditTable(t); }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                        onClick={() => deleteTable.mutate(t.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {tables.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Sin mesas registradas</p>
              )}
            </div>
          )}
        </div>

        {/* Payment methods */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Métodos de pago</h2>
            <Button size="sm" variant="outline" onClick={() => { pmForm.reset({ type: 'QR_BANCARIO' }); setPmDialog(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Método
            </Button>
          </div>

          <div className="space-y-2">
            {paymentMethods.map((pm) => (
              <Card key={pm.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  {pm.type === 'QR_BANCARIO' ? (
                    <QrCode className="h-8 w-8 text-slate-400 flex-shrink-0" />
                  ) : (
                    <CreditCard className="h-8 w-8 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{pm.displayName}</p>
                    {pm.accountInfo && <p className="text-xs text-slate-500 truncate">{pm.accountInfo}</p>}
                    <Badge variant="secondary" className="text-xs mt-1">{pm.type}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 flex-shrink-0"
                    onClick={() => deletePm.mutate(pm.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {paymentMethods.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-6">Sin métodos configurados</p>
            )}
          </div>
        </div>
      </div>

      {/* Dialog tabla */}
      <Dialog open={tableDialog || !!editTable} onOpenChange={(v) => { if (!v) { setTableDialog(false); setEditTable(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTable ? 'Editar mesa' : 'Nueva mesa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={tableForm.handleSubmit((dto) => editTable ? updateTable.mutate({ id: editTable.id, dto }) : createTable.mutate(dto))} className="space-y-3">
            <div>
              <Label>Nombre / Número</Label>
              <Input placeholder="Ej: Mesa 1" {...tableForm.register('label')} />
              {tableForm.formState.errors.label && <p className="text-xs text-destructive mt-1">{tableForm.formState.errors.label.message}</p>}
            </div>
            <div>
              <Label>Tarifa por hora (Bs)</Label>
              <Input type="number" min={0} placeholder="15" {...tableForm.register('hourlyRate')} />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setTableDialog(false); setEditTable(null); }}>Cancelar</Button>
              <Button type="submit" disabled={createTable.isPending || updateTable.isPending}>
                {(createTable.isPending || updateTable.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog método de pago */}
      <Dialog open={pmDialog} onOpenChange={setPmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo método de pago</DialogTitle>
          </DialogHeader>
          <form onSubmit={pmForm.handleSubmit((dto) => createPm.mutate(dto))} className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select
                value={pmForm.watch('type')}
                onValueChange={(v) => pmForm.setValue('type', v as PmForm['type'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="QR_BANCARIO">QR Bancario</SelectItem>
                  <SelectItem value="TIGO_MONEY">Tigo Money</SelectItem>
                  <SelectItem value="BILLETERA">Billetera móvil</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nombre a mostrar</Label>
              <Input placeholder="Ej: QR Banco BNB" {...pmForm.register('displayName')} />
              {pmForm.formState.errors.displayName && <p className="text-xs text-destructive mt-1">{pmForm.formState.errors.displayName.message}</p>}
            </div>
            <div>
              <Label>Info de cuenta / titular</Label>
              <Input placeholder="Ej: Springfield Billiards S.R.L." {...pmForm.register('accountInfo')} />
            </div>
            <div>
              <Label>URL del QR (imagen)</Label>
              <Input placeholder="https://..." {...pmForm.register('qrImageUrl')} />
              {pmForm.formState.errors.qrImageUrl && <p className="text-xs text-destructive mt-1">{pmForm.formState.errors.qrImageUrl.message}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setPmDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={createPm.isPending}>
                {createPm.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Agregar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
