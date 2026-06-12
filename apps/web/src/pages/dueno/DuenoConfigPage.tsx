import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, Plus, Trash2, QrCode, CreditCard, Upload, X, Crop } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Branch {
  name: string;
  address: string | null;
  openTime: string | null;
  closeTime: string | null;
  depositAmount: number;
  reservationGraceMinutes: number;
  confirmationTimeoutMin: number;
}

interface PaymentMethod {
  id: string;
  type: string;
  displayName: string;
  accountInfo: string | null;
  qrImageUrl: string | null;
}

const branchSchema = z.object({
  name: z.string().min(2),
  address: z.string().optional(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
  depositAmount: z.coerce.number().min(0),
  reservationGraceMinutes: z.coerce.number().min(1),
  confirmationTimeoutMin: z.coerce.number().min(1),
});

const pmSchema = z.object({
  type: z.enum(['QR_BANCARIO', 'TIGO_MONEY', 'BILLETERA', 'OTRO']),
  displayName: z.string().min(2),
  accountInfo: z.string().optional(),
  qrImageUrl: z.string().optional(),
});

type BranchForm = z.infer<typeof branchSchema>;
type PmForm = z.infer<typeof pmSchema>;

const PM_ICONS: Record<string, typeof QrCode> = { QR_BANCARIO: QrCode, TIGO_MONEY: CreditCard, BILLETERA: CreditCard, OTRO: CreditCard };
const PM_LABELS: Record<string, string> = { QR_BANCARIO: 'QR Bancario', TIGO_MONEY: 'Tigo Money', BILLETERA: 'Billetera', OTRO: 'Otro' };

// ── Crop dialog ─────────────────────────────────────────────────────────────
function QrCropDialog({ open, src, onApply, onCancel }: {
  open: boolean; src: string; onApply: (dataUrl: string) => void; onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const scaleRef = useRef(1);
  const cropBox = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const [hasCrop, setHasCrop] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const { x, y, w, h } = cropBox.current;
    if (w > 4 && h > 4) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img,
        x / scaleRef.current, y / scaleRef.current,
        w / scaleRef.current, h / scaleRef.current,
        x, y, w, h,
      );
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.setLineDash([]);
    }
  }, []);

  useEffect(() => {
    if (!open || !src) return;
    cropBox.current = { x: 0, y: 0, w: 0, h: 0 };
    setHasCrop(false);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const MAX = 500;
      const scale = Math.min(MAX / img.width, MAX / img.height, 1);
      scaleRef.current = scale;
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      draw();
    };
    img.src = src;
  }, [open, src, draw]);

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = canvasRef.current!.width / rect.width;
    const sy = canvasRef.current!.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    const p = getPos(e);
    startPos.current = p;
    cropBox.current = { x: p.x, y: p.y, w: 0, h: 0 };
    dragging.current = true;
    setHasCrop(false);
    draw();
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragging.current) return;
    const p = getPos(e);
    cropBox.current = {
      x: Math.min(startPos.current.x, p.x),
      y: Math.min(startPos.current.y, p.y),
      w: Math.abs(p.x - startPos.current.x),
      h: Math.abs(p.y - startPos.current.y),
    };
    draw();
  }

  function onMouseUp() {
    if (!dragging.current) return;
    dragging.current = false;
    setHasCrop(cropBox.current.w > 10 && cropBox.current.h > 10);
  }

  function applyCrop() {
    const img = imgRef.current;
    if (!img) return;
    const { x, y, w, h } = cropBox.current;
    const s = scaleRef.current;
    const rawX = x / s, rawY = y / s, rawW = w / s, rawH = h / s;
    const MAX = 500;
    const outScale = Math.min(1, MAX / Math.max(rawW, rawH));
    const out = document.createElement('canvas');
    out.width = Math.round(rawW * outScale);
    out.height = Math.round(rawH * outScale);
    out.getContext('2d')!.drawImage(img, rawX, rawY, rawW, rawH, 0, 0, out.width, out.height);
    onApply(out.toDataURL('image/png', 1.0));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-4 w-4 text-brand-green" />
            Recortar imagen QR
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Arrastra con el mouse para seleccionar <strong>solo el código QR</strong>, sin glosa ni datos del banco.
        </p>
        <div className="rounded-xl overflow-auto border bg-slate-900 flex justify-center max-h-[420px]">
          <canvas
            ref={canvasRef}
            style={{ cursor: 'crosshair', maxWidth: '100%', display: 'block' }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" onClick={onCancel}>Cancelar</Button>
          <Button type="button" disabled={!hasCrop} onClick={applyCrop} className="bg-brand-green hover:bg-brand-deep text-white">
            <Crop className="h-4 w-4 mr-2" />Recortar y usar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// ────────────────────────────────────────────────────────────────────────────

export function DuenoConfigPage() {
  const { user } = useAuthStore();
  const branchId = user?.staffBranchId!;
  const qc = useQueryClient();
  const { toast } = useToast();
  const [pmDialog, setPmDialog] = useState(false);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Solo se permiten imágenes', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const original = ev.target?.result as string;
      // Load at full resolution for crop, then compress after crop
      setCropSrc(original);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleCropApply(croppedDataUrl: string) {
    // Compress the cropped result to max 500px
    const img = new Image();
    img.onload = () => {
      const MAX = 500;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/png', 0.95);
      setQrPreview(compressed);
      pmForm.setValue('qrImageUrl', compressed);
      setCropSrc(null);
    };
    img.src = croppedDataUrl;
  }

  function clearQr() {
    setQrPreview(null);
    pmForm.setValue('qrImageUrl', '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const { data: branch, isLoading } = useQuery<Branch>({
    queryKey: ['branch', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}`); return data; },
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({
    queryKey: ['payment-methods', branchId],
    queryFn: async () => { const { data } = await api.get(`/branches/${branchId}/payment-methods`); return data; },
  });

  const form = useForm<BranchForm>({ resolver: zodResolver(branchSchema) });
  const pmForm = useForm<PmForm>({ resolver: zodResolver(pmSchema), defaultValues: { type: 'QR_BANCARIO' } });

  useEffect(() => {
    if (branch) form.reset({
      name: branch.name,
      address: branch.address ?? '',
      openTime: branch.openTime ?? '',
      closeTime: branch.closeTime ?? '',
      depositAmount: branch.depositAmount,
      reservationGraceMinutes: branch.reservationGraceMinutes,
      confirmationTimeoutMin: branch.confirmationTimeoutMin,
    });
  }, [branch]);

  const updateBranch = useMutation({
    mutationFn: (dto: BranchForm) => api.put(`/branches/${branchId}`, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branch', branchId] }); toast({ title: 'Configuración guardada' }); },
    onError: () => toast({ title: 'Error al guardar', variant: 'destructive' }),
  });

  const createPm = useMutation({
    mutationFn: (dto: PmForm) => api.post(`/branches/${branchId}/payment-methods`, { ...dto, qrImageUrl: dto.qrImageUrl || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-methods', branchId] });
      setPmDialog(false);
      pmForm.reset({ type: 'QR_BANCARIO' });
      setQrPreview(null);
      toast({ title: 'Método de pago agregado' });
    },
    onError: (e: any) => toast({ title: e?.response?.data?.message ?? 'Error al agregar', variant: 'destructive' }),
  });

  const deletePm = useMutation({
    mutationFn: (pmId: string) => api.delete(`/branches/${branchId}/payment-methods/${pmId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-methods', branchId] }); toast({ title: 'Método eliminado' }); },
    onError: () => toast({ title: 'Error al eliminar', variant: 'destructive' }),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configuración</h1>
        <p className="text-sm text-slate-500 mt-1">Ajusta los datos de tu sucursal</p>
      </div>

      {/* Branch info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos de la sucursal</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit((dto) => updateBranch.mutate(dto))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nombre</Label>
                <Input {...form.register('name')} />
              </div>
              <div className="col-span-2">
                <Label>Dirección</Label>
                <Input placeholder="Av. Montes 123" {...form.register('address')} />
              </div>
              <div>
                <Label>Apertura</Label>
                <Input type="time" {...form.register('openTime')} />
              </div>
              <div>
                <Label>Cierre</Label>
                <Input type="time" {...form.register('closeTime')} />
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-slate-700 mb-3">Política de reservas</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Depósito (Bs)</Label>
                  <Input type="number" min={0} {...form.register('depositAmount')} />
                </div>
                <div>
                  <Label>Gracia llegada (min)</Label>
                  <Input type="number" min={1} {...form.register('reservationGraceMinutes')} />
                </div>
                <div>
                  <Label>Tiempo revisión (min)</Label>
                  <Input type="number" min={1} {...form.register('confirmationTimeoutMin')} />
                </div>
              </div>
            </div>
            <Button type="submit" disabled={updateBranch.isPending}>
              {updateBranch.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar cambios
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payment methods */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Métodos de pago</CardTitle>
          <Button size="sm" variant="outline" onClick={() => { pmForm.reset({ type: 'QR_BANCARIO' }); setQrPreview(null); setPmDialog(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />Agregar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sin métodos configurados. Agrega al menos uno (QR).</p>
          ) : (
            paymentMethods.map((pm) => {
              const Icon = PM_ICONS[pm.type] ?? CreditCard;
              return (
                <div key={pm.id} className="flex items-start gap-3 p-3 rounded-lg border bg-slate-50">
                  {pm.qrImageUrl ? (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg border bg-white overflow-hidden flex items-center justify-center p-1">
                      <img src={pm.qrImageUrl} alt="QR" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 bg-white flex items-center justify-center">
                      <Icon className="h-6 w-6 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{pm.displayName}</p>
                    {pm.accountInfo && <p className="text-xs text-slate-500 truncate">{pm.accountInfo}</p>}
                    <Badge variant="secondary" className="text-xs mt-1">{PM_LABELS[pm.type]}</Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 flex-shrink-0" onClick={() => deletePm.mutate(pm.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Crop dialog */}
      <QrCropDialog
        open={!!cropSrc}
        src={cropSrc ?? ''}
        onApply={handleCropApply}
        onCancel={() => setCropSrc(null)}
      />

      {/* Dialog método de pago */}
      <Dialog open={pmDialog} onOpenChange={(v) => { if (!v) { setPmDialog(false); setQrPreview(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo método de pago</DialogTitle></DialogHeader>
          <form onSubmit={pmForm.handleSubmit((dto) => createPm.mutate(dto))} className="space-y-3">
            <div>
              <Label>Tipo</Label>
              <Select value={pmForm.watch('type')} onValueChange={(v) => pmForm.setValue('type', v as PmForm['type'])}>
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
              <Label>Titular / Cuenta</Label>
              <Input placeholder="Springfield Billiards S.R.L." {...pmForm.register('accountInfo')} />
            </div>

            {/* QR upload + crop */}
            <div className="space-y-2">
              <Label>Imagen QR</Label>
              {qrPreview ? (
                <div className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50">
                  <div className="w-20 h-20 rounded-lg border bg-white overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                    <img src={qrPreview} alt="QR" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">QR listo</p>
                    <p className="text-xs text-slate-500 mt-0.5">Imagen recortada y lista para guardar</p>
                  </div>
                  <button type="button" onClick={clearQr} className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand-mint hover:bg-brand-green/5 transition-colors text-slate-400 hover:text-brand-green"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-medium">Subir foto del QR</span>
                  <span className="text-xs text-slate-400">Podrás recortar para dejar solo el QR</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setPmDialog(false); setQrPreview(null); }}>Cancelar</Button>
              <Button type="submit" disabled={createPm.isPending}>
                {createPm.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Agregar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
