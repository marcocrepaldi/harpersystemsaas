"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import { apiFetch } from "@/lib/api";
import {
  formatCPF,
  normalizeCPF,
  validateCPF,
  formatCNPJ,
  normalizeCNPJ,
  validateCNPJ,
  formatCEP,
  normalizeCEP,
  isValidCEP,
  formatPhoneBR,
  normalizePhone,
  isEmail,
  onlyDigits,
} from "@/lib/format";

export type PersonType = "PF" | "PJ";
export type ClientStatus = "lead" | "prospect" | "active" | "inactive";

export type ClientPayload = {
  personType: PersonType;
  status: ClientStatus;
  tags?: string[];

  // comum
  name: string;
  document: string; // PF: CPF normalizado | PJ: CNPJ normalizado
  email?: string | null;
  phone?: string | null;

  // PF extras
  pf?: {
    rg?: string | null;
    birthDate?: string | null; // ISO yyyy-mm-dd
    maritalStatus?: string | null;
    profession?: string | null;
    isPEP?: boolean | null;
  };

  // PJ extras
  pj?: {
    corporateName?: string | null;
    tradeName?: string | null;
    cnpj?: string | null;
    stateRegistration?: string | null;
    municipalRegistration?: string | null;
    cnae?: string | null;
    foundationDate?: string | null; // ISO
    legalRepresentative?:
      | {
          name?: string | null;
          cpf?: string | null;
          email?: string | null;
          phone?: string | null;
        }
      | null;
  };

  // Contato principal
  primaryContact?: {
    name?: string | null;
    role?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  };

  // Endereço
  address?: {
    zip?: string | null;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    district?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null; // default BR
  };

  // Preferências/LGPD
  preferences?: {
    preferredChannel?: "email" | "phone" | "whatsapp" | null;
  } | null;
  marketingOptIn?: boolean | null;
  privacyConsent?: { accepted: boolean; at: string } | null;
};

type Props = {
  mode: "create" | "edit";
  id?: string;
  initialValues?: Partial<ClientPayload>;
  title?: string;
  onSuccessRedirect?: string;

  /** Integração opcional com páginas externas */
  submitting?: boolean;
  onSubmit?: (values: ClientPayload) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onCancel?: () => void;
};

export default function ClientForm({
  mode,
  id,
  initialValues,
  title,
  onSuccessRedirect = "/clients",
  submitting = false,
  onSubmit,
  onDelete,
  onCancel,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  // ---- estado principal ----
  const [personType, setPersonType] = React.useState<PersonType>(
    initialValues?.personType ?? "PF",
  );
  const [status, setStatus] = React.useState<ClientStatus>(
    initialValues?.status ?? "lead",
  );
  const [name, setName] = React.useState(initialValues?.name ?? "");

  // Renomeado para evitar conflito com o global `document` do DOM
  const [docNumber, setDocNumber] = React.useState(initialValues?.document ?? "");

  const [email, setEmail] = React.useState(initialValues?.email ?? "");
  const [phone, setPhone] = React.useState(initialValues?.phone ?? "");

  // PF
  const [pfRG, setPfRG] = React.useState(initialValues?.pf?.rg ?? "");
  const [pfBirth, setPfBirth] = React.useState(initialValues?.pf?.birthDate ?? "");
  const [pfMarital, setPfMarital] = React.useState(initialValues?.pf?.maritalStatus ?? "");
  const [pfProfession, setPfProfession] = React.useState(initialValues?.pf?.profession ?? "");
  const [pfPEP, setPfPEP] = React.useState(Boolean(initialValues?.pf?.isPEP));

  // PJ
  const [pjCorporate, setPjCorporate] = React.useState(initialValues?.pj?.corporateName ?? "");
  const [pjTrade, setPjTrade] = React.useState(initialValues?.pj?.tradeName ?? "");
  const [pjCNPJ, setPjCNPJ] = React.useState(initialValues?.pj?.cnpj ?? "");
  const [pjIE, setPjIE] = React.useState(initialValues?.pj?.stateRegistration ?? "");
  const [pjIM, setPjIM] = React.useState(initialValues?.pj?.municipalRegistration ?? "");
  const [pjCNAE, setPjCNAE] = React.useState(initialValues?.pj?.cnae ?? "");
  const [pjFoundation, setPjFoundation] = React.useState(initialValues?.pj?.foundationDate ?? "");
  const [pjRepName, setPjRepName] = React.useState(initialValues?.pj?.legalRepresentative?.name ?? "");
  const [pjRepCPF, setPjRepCPF] = React.useState(initialValues?.pj?.legalRepresentative?.cpf ?? "");
  const [pjRepEmail, setPjRepEmail] = React.useState(initialValues?.pj?.legalRepresentative?.email ?? "");
  const [pjRepPhone, setPjRepPhone] = React.useState(initialValues?.pj?.legalRepresentative?.phone ?? "");

  // Contato principal
  const [pcName, setPcName] = React.useState(initialValues?.primaryContact?.name ?? "");
  const [pcRole, setPcRole] = React.useState(initialValues?.primaryContact?.role ?? "");
  const [pcEmail, setPcEmail] = React.useState(initialValues?.primaryContact?.email ?? "");
  const [pcPhone, setPcPhone] = React.useState(initialValues?.primaryContact?.phone ?? "");
  const [pcNotes, setPcNotes] = React.useState(initialValues?.primaryContact?.notes ?? "");

  // Endereço
  const [zip, setZip] = React.useState(initialValues?.address?.zip ?? "");
  const [street, setStreet] = React.useState(initialValues?.address?.street ?? "");
  const [number, setNumber] = React.useState(initialValues?.address?.number ?? "");
  const [complement, setComplement] = React.useState(initialValues?.address?.complement ?? "");
  const [district, setDistrict] = React.useState(initialValues?.address?.district ?? "");
  const [city, setCity] = React.useState(initialValues?.address?.city ?? "");
  const [state, setState] = React.useState(initialValues?.address?.state ?? "");
  const [country, setCountry] = React.useState(initialValues?.address?.country ?? "BR");

  // Preferências
  const [preferredChannel, setPreferredChannel] = React.useState<"email" | "phone" | "whatsapp" | "">(
    (initialValues?.preferences?.preferredChannel as "email" | "phone" | "whatsapp" | null) ?? "",
  );
  const [marketingOptIn, setMarketingOptIn] = React.useState<boolean>(
    Boolean(initialValues?.marketingOptIn),
  );
  const [privacyConsent, setPrivacyConsent] = React.useState<boolean>(
    Boolean(initialValues?.privacyConsent?.accepted),
  );

  const isPF = personType === "PF";

  const validateRequired = React.useCallback((): string | null => {
    if (!name.trim() && isPF) return "Nome é obrigatório.";
    if (!isPF && !pjCorporate.trim() && !name.trim()) {
      return "Razão social (ou nome) é obrigatória para PJ.";
    }

    if (isPF) {
      const cpf = normalizeCPF(docNumber);
      if (onlyDigits(cpf).length !== 11 || !validateCPF(cpf)) return "CPF inválido.";
    } else {
      const cnpj = normalizeCNPJ(pjCNPJ || docNumber);
      if (onlyDigits(cnpj).length !== 14 || !validateCNPJ(cnpj)) return "CNPJ inválido.";
      if (!pcName.trim()) return "Contato principal (nome) é obrigatório para PJ.";
      if (!isEmail(pcEmail) && !normalizePhone(pcPhone)) {
        return "Informe e-mail ou telefone do contato principal.";
      }
    }

    // endereço básico:
    if (!isValidCEP(zip)) return "CEP inválido (8 dígitos).";
    if (!street.trim()) return "Logradouro é obrigatório.";
    if (!number.trim()) return "Número é obrigatório.";
    if (!city.trim()) return "Cidade é obrigatória.";
    if (!state.trim()) return "UF é obrigatória.";
    return null;
  }, [city, docNumber, isPF, number, pcEmail, pcName, pcPhone, pjCNPJ, pjCorporate, state, street, zip]);

  const buildFullPayload = React.useCallback((): ClientPayload => {
    const docNormalized = isPF ? normalizeCPF(docNumber) : normalizeCNPJ(pjCNPJ || docNumber);

    const payload: ClientPayload = {
      personType,
      status,
      name: isPF ? name.trim() : pjCorporate.trim() || name.trim(),
      document: docNormalized,
      email: email?.trim() || null,
      phone: normalizePhone(phone) || null,
      pf: isPF
        ? {
            rg: (pfRG || "").trim() || null,
            birthDate: pfBirth || null,
            maritalStatus: (pfMarital || "").trim() || null,
            profession: (pfProfession || "").trim() || null,
            isPEP: pfPEP,
          }
        : undefined,
      pj: !isPF
        ? {
            corporateName: pjCorporate?.trim() || null,
            tradeName: pjTrade?.trim() || null,
            cnpj: normalizeCNPJ(pjCNPJ || docNumber),
            stateRegistration: pjIE?.trim() || null,
            municipalRegistration: pjIM?.trim() || null,
            cnae: pjCNAE?.trim() || null,
            foundationDate: pjFoundation || null,
            legalRepresentative: {
              name: pjRepName?.trim() || null,
              cpf: normalizeCPF(pjRepCPF || ""),
              email: pjRepEmail?.trim() || null,
              phone: normalizePhone(pjRepPhone || ""),
            },
          }
        : undefined,
      primaryContact: {
        name: pcName?.trim() || null,
        role: pcRole?.trim() || null,
        email: pcEmail?.trim() || null,
        phone: normalizePhone(pcPhone || ""),
        notes: pcNotes?.trim() || null,
      },
      address: {
        zip: normalizeCEP(zip),
        street: street?.trim() || null,
        number: number?.trim() || null,
        complement: complement?.trim() || null,
        district: district?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        country: country?.trim() || "BR",
      },
      preferences: { preferredChannel: preferredChannel ? preferredChannel : null },
      marketingOptIn,
      privacyConsent: privacyConsent ? { accepted: true, at: new Date().toISOString() } : null,
    };
    return payload;
  }, [
    city,
    complement,
    country,
    docNumber,
    email,
    isPF,
    marketingOptIn,
    name,
    number,
    pcEmail,
    pcName,
    pcNotes,
    pcPhone,
    personType,
    pfBirth,
    pfMarital,
    pfPEP,
    pfProfession,
    pfRG,
    phone,
    pjCNAE,
    pjCNPJ,
    pjCorporate,
    pjFoundation,
    pjIE,
    pjIM,
    pjRepCPF,
    pjRepEmail,
    pjRepName,
    pjRepPhone,
    pjTrade,
    preferredChannel,
    state,
    status,
    street,
    zip,
  ]);

  /** Fallback mínimo caso o backend rejeite campos extras. */
  function buildMinimalForCurrentApi(full: ClientPayload) {
    return {
      personType: full.personType,
      status: full.status,
      name: full.name,
      document: full.document,
      email: full.email ?? undefined,
      phone: full.phone ?? undefined,
    };
  }

  async function submitCreate(full: ClientPayload) {
    try {
      const created = await apiFetch<unknown>("/clients", {
        method: "POST",
        body: full,
      });
      return created ?? null;
    } catch {
      const created = await apiFetch<unknown>("/clients", {
        method: "POST",
        body: buildMinimalForCurrentApi(full),
      });
      toast.info("Alguns campos avançados serão salvos quando o backend suportar metadados.");
      return created ?? null;
    }
  }

  async function submitUpdate(full: ClientPayload) {
    if (!id) throw new Error("ID do cliente ausente para edição.");
    try {
      const updated = await apiFetch<unknown>(`/clients/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: full,
      });
      return updated ?? null;
    } catch {
      const updated = await apiFetch<unknown>(`/clients/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: buildMinimalForCurrentApi(full),
      });
      toast.info("Alguns campos avançados serão salvos quando o backend suportar metadados.");
      return updated ?? null;
    }
  }

  async function handleSubmitInternal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const err = validateRequired();
    if (err) {
      toast.error(err);
      return;
    }

    const full = buildFullPayload();

    // Se o chamador quiser controlar o submit:
    if (onSubmit) {
      await onSubmit(full);
      return;
    }

    setBusy(true);
    try {
      const result = mode === "create" ? await submitCreate(full) : await submitUpdate(full);
      const displayName = (result as { name?: string } | null)?.name || full.name;

      toast.success(
        mode === "create"
          ? `Cliente "${displayName}" criado com sucesso!`
          : `Cliente "${displayName}" atualizado com sucesso!`,
      );

      setTimeout(() => {
        router.replace(onSuccessRedirect);
        setTimeout(() => router.refresh(), 50);
      }, 250);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Falha ao salvar cliente", { description: msg });
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || submitting;

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>{title ?? (mode === "create" ? "Cadastro de Cliente" : "Editar Cliente")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitInternal} className="grid gap-6" noValidate>
          {/* Tipo & Status */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="personType">Tipo de pessoa</Label>
              <Select value={personType} onValueChange={(v: PersonType) => setPersonType(v)}>
                <SelectTrigger id="personType">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">PF (Pessoa Física)</SelectItem>
                  <SelectItem value="PJ">PJ (Pessoa Jurídica)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v: ClientStatus) => setStatus(v)}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Identificação */}
          {personType === "PF" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  inputMode="numeric"
                  value={formatCPF(docNumber)}
                  onChange={(e) => setDocNumber(e.target.value)}
                  disabled={disabled}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rg">RG</Label>
                <Input id="rg" value={pfRG} onChange={(e) => setPfRG(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birth">Nascimento</Label>
                <Input id="birth" type="date" value={pfBirth ?? ""} onChange={(e) => setPfBirth(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="marital">Estado civil</Label>
                <Input id="marital" value={pfMarital ?? ""} onChange={(e) => setPfMarital(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="profession">Profissão</Label>
                <Input id="profession" value={pfProfession ?? ""} onChange={(e) => setPfProfession(e.target.value)} disabled={disabled} />
              </div>
              <div className="flex items-center gap-3">
                <Switch id="pep" checked={pfPEP} onCheckedChange={setPfPEP} disabled={disabled} />
                <Label htmlFor="pep">PEP (Pessoa Exposta Politicamente)</Label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="corporate">Razão social *</Label>
                <Input id="corporate" value={pjCorporate} onChange={(e) => setPjCorporate(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="trade">Nome fantasia</Label>
                <Input id="trade" value={pjTrade} onChange={(e) => setPjTrade(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  inputMode="numeric"
                  value={formatCNPJ(pjCNPJ || docNumber)}
                  onChange={(e) => setPjCNPJ(e.target.value)}
                  disabled={disabled}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input id="ie" value={pjIE ?? ""} onChange={(e) => setPjIE(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="im">Inscrição Municipal</Label>
                <Input id="im" value={pjIM ?? ""} onChange={(e) => setPjIM(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cnae">CNAE</Label>
                <Input id="cnae" value={pjCNAE ?? ""} onChange={(e) => setPjCNAE(e.target.value)} disabled={disabled} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="foundation">Data de fundação</Label>
                <Input
                  id="foundation"
                  type="date"
                  value={pjFoundation ?? ""}
                  onChange={(e) => setPjFoundation(e.target.value)}
                  disabled={disabled}
                />
              </div>

              {/* Representante legal */}
              <div className="grid grid-cols-1 gap-4 md:col-span-3 md:grid-cols-4">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="repName">Representante legal (nome)</Label>
                  <Input id="repName" value={pjRepName} onChange={(e) => setPjRepName(e.target.value)} disabled={disabled} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repCPF">CPF</Label>
                  <Input
                    id="repCPF"
                    inputMode="numeric"
                    value={formatCPF(pjRepCPF || "")}
                    onChange={(e) => setPjRepCPF(e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repEmail">E-mail</Label>
                  <Input
                    id="repEmail"
                    type="email"
                    value={pjRepEmail || ""}
                    onChange={(e) => setPjRepEmail(e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="repPhone">Telefone</Label>
                  <Input
                    id="repPhone"
                    value={formatPhoneBR(pjRepPhone || "")}
                    onChange={(e) => setPjRepPhone(e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Contatos gerais do cliente */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="email">E-mail do cliente</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone do cliente</Label>
              <Input
                id="phone"
                value={formatPhoneBR(phone)}
                onChange={(e) => setPhone(e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Contato principal / Responsável pelo contrato */}
          <div className="grid gap-2">
            <Label>Contato principal / Responsável</Label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Input placeholder="Nome" value={pcName} onChange={(e) => setPcName(e.target.value)} disabled={disabled} />
              <Input placeholder="Cargo/Setor" value={pcRole || ""} onChange={(e) => setPcRole(e.target.value)} disabled={disabled} />
              <Input placeholder="E-mail" type="email" value={pcEmail || ""} onChange={(e) => setPcEmail(e.target.value)} disabled={disabled} />
              <Input
                placeholder="Telefone"
                value={formatPhoneBR(pcPhone || "")}
                onChange={(e) => setPcPhone(e.target.value)}
                disabled={disabled}
              />
            </div>
            <Textarea
              placeholder="Observações"
              value={pcNotes || ""}
              onChange={(e) => setPcNotes(e.target.value)}
              disabled={disabled}
            />
          </div>

          {/* Endereço */}
          <div className="grid gap-2">
            <Label>Endereço</Label>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
              <Input
                className="md:col-span-2"
                placeholder="CEP"
                value={formatCEP(zip)}
                onChange={(e) => setZip(e.target.value)}
                inputMode="numeric"
                disabled={disabled}
              />
              <Input
                className="md:col-span-3"
                placeholder="Logradouro"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                disabled={disabled}
              />
              <Input placeholder="Número" value={number} onChange={(e) => setNumber(e.target.value)} disabled={disabled} />
              <Input
                className="md:col-span-2"
                placeholder="Complemento"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
                disabled={disabled}
              />
              <Input
                className="md:col-span-2"
                placeholder="Bairro"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                disabled={disabled}
              />
              <Input className="md:col-span-2" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} disabled={disabled} />
              <Input
                placeholder="UF"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                disabled={disabled}
              />
              <Input placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} disabled={disabled} />
            </div>
          </div>

          {/* Preferências & LGPD */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="preferredChannel">Canal preferencial</Label>
              <Select
                value={preferredChannel}
                onValueChange={(v: "email" | "phone" | "whatsapp") => setPreferredChannel(v)}
              >
                <SelectTrigger id="preferredChannel">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="mkt" checked={marketingOptIn} onCheckedChange={setMarketingOptIn} disabled={disabled} />
              <Label htmlFor="mkt">Aceita comunicações de marketing</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="privacy" checked={privacyConsent} onCheckedChange={setPrivacyConsent} disabled={disabled} />
              <Label htmlFor="privacy">Confirma ciência/consentimento de privacidade</Label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" aria-busy={disabled} disabled={disabled}>
              {disabled ? "Salvando..." : "Salvar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => (onCancel ? onCancel() : router.back())}
              disabled={disabled}
            >
              Cancelar
            </Button>
            {mode === "edit" && (
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (onDelete) return void onDelete();
                  if (!id) return;
                  const ok = window.confirm("Excluir este cliente? Essa ação não pode ser desfeita.");
                  if (!ok) return;
                  setBusy(true);
                  try {
                    await apiFetch<void>(`/clients/${encodeURIComponent(id)}`, { method: "DELETE" });
                    toast.success("Cliente excluído.");
                    router.replace(onSuccessRedirect);
                    setTimeout(() => router.refresh(), 50);
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Tente novamente.";
                    toast.error("Erro ao excluir cliente.", { description: msg });
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={disabled}
              >
                Excluir
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
