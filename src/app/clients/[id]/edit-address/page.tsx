'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { formatCEP, normalizeCEP } from '@/lib/format';

type AddressType = 'COBRANCA' | 'RESIDENCIAL' | 'OUTRO';

type AddressFromApi = {
  id: string;
  clientId: string;
  type: AddressType;
  zip?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
};

type ClientWithAddresses = {
  id: string;
  addresses?: AddressFromApi[];
};

export default function EditAddressPage(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();

  const clientId = (params?.id as string) ?? '';
  const addressId = search.get('addressId');
  const next = search.get('next') || `/clients/${clientId}`;

  const isEdit = Boolean(addressId);

  const [loading, setLoading] = React.useState<boolean>(!!addressId);
  const [saving, setSaving] = React.useState<boolean>(false);

  const [type, setType] = React.useState<AddressType>('COBRANCA');
  const [zip, setZip] = React.useState<string>('');
  const [street, setStreet] = React.useState<string>('');
  const [number, setNumber] = React.useState<string>('');
  const [complement, setComplement] = React.useState<string>('');
  const [district, setDistrict] = React.useState<string>('');
  const [city, setCity] = React.useState<string>('');
  const [state, setState] = React.useState<string>('');
  const [country, setCountry] = React.useState<string>('BR');

  React.useEffect(() => {
    let mounted = true;
    async function loadAddress(): Promise<void> {
      if (!clientId || !addressId) return;
      setLoading(true);
      try {
        const client = await apiFetch<ClientWithAddresses>(`/clients/${encodeURIComponent(clientId)}`, {
          query: { includeRels: true },
        });
        const found = client.addresses?.find((a) => a.id === addressId);
        if (!found) {
          toast.error('Endereço não encontrado.');
          router.replace(next);
          return;
        }
        if (!mounted) return;

        setType(found.type || 'COBRANCA');
        setZip(found.zip || '');
        setStreet(found.street || '');
        setNumber(found.number || '');
        setComplement(found.complement || '');
        setDistrict(found.district || '');
        setCity(found.city || '');
        setState(found.state || '');
        setCountry(found.country || 'BR');
      } catch (e) {
        toast.error(errorMessage(e) || 'Falha ao carregar endereço.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadAddress();
    return () => {
      mounted = false;
    };
  }, [clientId, addressId, router, next]);

  function validate(): string | null {
    const zipNorm = normalizeCEP(zip);
    if (zipNorm && zipNorm.length !== 8) return 'CEP deve ter 8 dígitos.';
    if (!street.trim()) return 'Logradouro é obrigatório.';
    if (!number.trim()) return 'Número é obrigatório.';
    if (!city.trim()) return 'Cidade é obrigatória.';
    if (!state.trim()) return 'UF é obrigatória.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    const payload = {
      type,
      zip: normalizeCEP(zip),
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim() || undefined,
      district: district.trim() || undefined,
      city: city.trim(),
      state: state.trim().toUpperCase().slice(0, 2),
      country: (country || 'BR').trim(),
    };
    try {
      if (isEdit) {
        if (!addressId) return;
        await apiFetch<void>(
          `/clients/${encodeURIComponent(clientId)}/addresses/${encodeURIComponent(addressId)}`,
          { method: 'PATCH', body: payload },
        );
        toast.success('Endereço atualizado com sucesso.');
      } else {
        await apiFetch<void>(`/clients/${encodeURIComponent(clientId)}/addresses`, {
          method: 'POST',
          body: payload,
        });
        toast.success('Endereço criado com sucesso.');
      }
      router.replace(next);
      setTimeout(() => router.refresh(), 50);
    } catch (e) {
      toast.error(errorMessage(e) || 'Falha ao salvar endereço.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!isEdit || !addressId) return;
    const ok = typeof window !== 'undefined'
      && window.confirm('Excluir este endereço? Essa ação não pode ser desfeita.');
    if (!ok) return;

    setSaving(true);
    try {
      await apiFetch<void>(
        `/clients/${encodeURIComponent(clientId)}/addresses/${encodeURIComponent(addressId)}`,
        { method: 'DELETE' },
      );
      toast.success('Endereço excluído.');
      router.replace(next);
      setTimeout(() => router.refresh(), 50);
    } catch (e) {
      toast.error(errorMessage(e) || 'Falha ao excluir endereço.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="mb-3 h-6 w-48" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{isEdit ? 'Editar endereço' : 'Novo endereço'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as AddressType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COBRANCA">Cobrança</SelectItem>
                    <SelectItem value="RESIDENCIAL">Residencial</SelectItem>
                    <SelectItem value="OUTRO">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip">CEP</Label>
                <Input
                  id="zip"
                  inputMode="numeric"
                  placeholder="00000-000"
                  value={formatCEP(zip)}
                  onChange={(e) => setZip(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <div className="grid gap-2 md:col-span-3">
                <Label htmlFor="street">Logradouro</Label>
                <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} disabled={saving} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="number">Número</Label>
                <Input id="number" value={number} onChange={(e) => setNumber(e.target.value)} disabled={saving} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="complement">Complemento</Label>
                <Input id="complement" value={complement} onChange={(e) => setComplement(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="district">Bairro</Label>
                <Input id="district" value={district} onChange={(e) => setDistrict(e.target.value)} disabled={saving} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} disabled={saving} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">UF</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  disabled={saving}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button type="submit" disabled={saving} aria-busy={saving}>
                {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar endereço'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.replace(next)} disabled={saving}>
                Cancelar
              </Button>
              {isEdit && (
                <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={saving}>
                  Excluir
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
