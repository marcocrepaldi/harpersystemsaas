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

import { ServicePicker } from "@/components/clients/ServicePicker";

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

/* ----------------------------------------------------------------------------
 * Tipos
 * ---------------------------------------------------------------------------- */

export type PersonType = "PF" | "PJ";
export type ClientStatus = "lead" | "prospect" | "active" | "inactive";

export type ClientPayload = {
  personType: PersonType;
  status: ClientStatus;
  tags?: string[];
  name: string;
  document: string;
  email?: string;
  phone?: string;
  notes?: string;
  serviceSlugs?: string[];
  
  pf?: {
    rg?: string;
    birthDate?: string; // ISO (yyyy-mm-dd)
    maritalStatus?: string;
    profession?: string;
    isPEP?: boolean;
  };

  pj?: {
    corporateName?: string;
    tradeName?: string;
    cnpj?: string;
    stateRegistration?: string;
    municipalRegistration?: string;
    cnae?: string;
    foundationDate?: string; // ISO
    legalRepresentative?: {
      name?: string;
      cpf?: string;
      email?: string;
      phone?: string;
    };
  };

  primaryContact?: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };

  address?: {
    zip?: string;
    street?: string;
    number?: string;
    complement?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };

  preferences?: { preferredChannel?: "email" | "phone" | "whatsapp" };
  marketingOptIn?: boolean;
  privacyConsent?: { accepted: boolean; at: string };
};

// payload enviado ao backend com serviços também
type ClientPayloadWithServices = ClientPayload & { serviceSlugs?: string[] };

type Props = {
  mode: "create" | "edit";
  id?: string;
  initialValues?: Partial<ClientPayload> & { serviceSlugs?: string[] };
  title?: string;
  onSuccessRedirect?: string;
  submitting?: boolean;
  onSubmit?: (values: ClientPayloadWithServices) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onCancel?: () => void;
};

/* ----------------------------------------------------------------------------
 * Utils
 * ---------------------------------------------------------------------------- */

const isNonEmpty = (v?: unknown) => !(v === undefined || v === null || v === "");
const undef = <T,>(v: T | null | undefined): T | undefined => (v == null ? undefined : v);

// remove chaves cujo valor é `undefined`
function omitUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out as Partial<T>;
}

// remove objetos vazios (sem chaves) recursivamente
function pruneEmptyDeep<T>(obj: T): T {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const entries = Object.entries(obj as Record<string, any>).map(([k, v]) => [k, pruneEmptyDeep(v)]);
    const cleaned = entries.reduce((acc, [k, v]) => {
      const keep =
        v !== undefined &&
        !(typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === 0);
      if (keep) (acc as any)[k] = v;
      return acc;
    }, {} as Record<string, any>);
    return cleaned as T;
  }
  return obj;
}

// comparação rasa + aninhada simples para gerar diff (suficiente para este form)
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a && typeof a === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b ?? {});
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEqual(a[k], b?.[k]));
  }
  return false;
}

function deepDiff(next: any, prev: any): any {
  if (deepEqual(next, prev)) return undefined;
  if (!prev || typeof next !== "object" || Array.isArray(next)) return next;

  const out: Record<string, any> = {};
  const keys = new Set([...Object.keys(next || {}), ...Object.keys(prev || {})]);
  keys.forEach((k) => {
    const d = deepDiff(next?.[k], prev?.[k]);
    if (d !== undefined) out[k] = d;
  });
  return Object.keys(out).length ? out : undefined;
}

/* ----------------------------------------------------------------------------
 * Componente
 * ---------------------------------------------------------------------------- */

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
  const [personType, setPersonType] = React.useState<PersonType>(initialValues?.personType ?? "PF");
  const [status, setStatus] = React.useState<ClientStatus>(initialValues?.status ?? "lead");
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
  const [uf, setUf] = React.useState(initialValues?.address?.state ?? "");
  const [country, setCountry] = React.useState(initialValues?.address?.country ?? "BR");

  // Preferências
  const [preferredChannel, setPreferredChannel] = React.useState<"email" | "phone" | "whatsapp" | "">(
    (initialValues?.preferences?.preferredChannel as "email" | "phone" | "whatsapp" | undefined) ?? ""
  );
  const [marketingOptIn, setMarketingOptIn] = React.useState<boolean>(Boolean(initialValues?.marketingOptIn));
  const [privacyConsent, setPrivacyConsent] = React.useState<boolean>(Boolean(initialValues?.privacyConsent?.accepted));

  // Serviços (multi-select)
  const [serviceSlugs, setServiceSlugs] = React.useState<string[]>(initialValues?.serviceSlugs ?? []);

  const isPF = personType === "PF";

  /* ------------------------------------------------------------------------
   * Validação
   * ------------------------------------------------------------------------ */
  const validateRequired = React.useCallback((): string | null => {
    if (!name.trim() && isPF) return "Nome é obrigatório.";
    if (!isPF && !pjCorporate.trim() && !name.trim())
      return "Razão social (ou nome) é obrigatória para PJ.";

    if (isPF) {
      const cpf = normalizeCPF(docNumber);
      if (onlyDigits(cpf).length !== 11 || !validateCPF(cpf)) return "CPF inválido.";
    } else {
      const cnpj = normalizeCNPJ(pjCNPJ || docNumber);
      if (onlyDigits(cnpj).length !== 14 || !validateCNPJ(cnpj)) return "CNPJ inválido.";
      if (!pcName.trim()) return "Contato principal (nome) é obrigatório para PJ.";
      if (!isEmail(pcEmail) && !normalizePhone(pcPhone))
        return "Informe e-mail ou telefone do contato principal.";
    }

    if (!isValidCEP(zip)) return "CEP inválido (8 dígitos).";
    if (!street.trim()) return "Logradouro é obrigatório.";
    if (!number.trim()) return "Número é obrigatório.";
    if (!city.trim()) return "Cidade é obrigatória.";
    if (!uf.trim()) return "UF é obrigatória.";
    return null;
  }, [name, isPF, pjCorporate, docNumber, pjCNPJ, pcName, pcEmail, pcPhone, zip, street, number, city, uf]);

  /* ------------------------------------------------------------------------
   * Builders de payload
   * ------------------------------------------------------------------------ */

  // FULL payload (para criação) — usa `undefined` para campos vazios
  const buildFullPayload = React.useCallback((): ClientPayload => {
    const docNormalized = isPF ? normalizeCPF(docNumber) : normalizeCNPJ(pjCNPJ || docNumber);

    const pf = isPF
      ? omitUndefined({
          rg: (pfRG || "").trim() || undefined,
          birthDate: pfBirth || undefined,
          maritalStatus: (pfMarital || "").trim() || undefined,
          profession: (pfProfession || "").trim() || undefined,
          isPEP: pfPEP,
        })
      : undefined;

    const pj = !isPF
      ? pruneEmptyDeep(
          omitUndefined({
            corporateName: pjCorporate?.trim() || undefined,
            tradeName: pjTrade?.trim() || undefined,
            cnpj: normalizeCNPJ(pjCNPJ || docNumber),
            stateRegistration: pjIE?.trim() || undefined,
            municipalRegistration: pjIM?.trim() || undefined,
            cnae: pjCNAE?.trim() || undefined,
            foundationDate: pjFoundation || undefined,
            legalRepresentative: omitUndefined({
              name: pjRepName?.trim() || undefined,
              cpf: normalizeCPF(pjRepCPF || "") || undefined,
              email: pjRepEmail?.trim() || undefined,
              phone: normalizePhone(pjRepPhone || "") || undefined,
            }),
          })
        )
      : undefined;

    const primaryContact = pruneEmptyDeep(
      omitUndefined({
        name: pcName?.trim() || undefined,
        role: pcRole?.trim() || undefined,
        email: pcEmail?.trim() || undefined,
        phone: normalizePhone(pcPhone || "") || undefined,
        notes: pcNotes?.trim() || undefined,
      })
    );

    const address = omitUndefined({
      zip: normalizeCEP(zip),
      street: street?.trim() || undefined,
      number: number?.trim() || undefined,
      complement: complement?.trim() || undefined,
      district: district?.trim() || undefined,
      city: city?.trim() || undefined,
      state: uf?.trim() || undefined,
      country: country?.trim() || "BR",
    });

    const preferences = omitUndefined({
      preferredChannel: (preferredChannel || undefined) as "email" | "phone" | "whatsapp" | undefined,
    });

    const privacy = privacyConsent ? { accepted: true, at: new Date().toISOString() } : undefined;

    return pruneEmptyDeep(
      omitUndefined({
        personType,
        status,
        name: isPF ? name.trim() : pjCorporate.trim() || name.trim(),
        document: docNormalized,
        email: email?.trim() || undefined,
        phone: normalizePhone(phone) || undefined,
        pf,
        pj,
        primaryContact,
        address,
        preferences,
        marketingOptIn,
        privacyConsent: privacy,
      })
    ) as ClientPayload;
  }, [
    isPF,
    personType,
    status,
    name,
    pjCorporate,
    docNumber,
    email,
    phone,
    pfRG,
    pfBirth,
    pfMarital,
    pfProfession,
    pfPEP,
    pjCNPJ,
    pjIE,
    pjIM,
    pjCNAE,
    pjFoundation,
    pjRepName,
    pjRepCPF,
    pjRepEmail,
    pjRepPhone,
    pjTrade,
    pcName,
    pcRole,
    pcEmail,
    pcPhone,
    pcNotes,
    zip,
    street,
    number,
    complement,
    district,
    city,
    uf,
    country,
    preferredChannel,
    marketingOptIn,
    privacyConsent,
  ]);

  // PATCH diff: só o que mudou vs initialValues
  const buildPatchDiff = React.useCallback(
    (full: ClientPayloadWithServices): ClientPayloadWithServices => {
      const initial: ClientPayloadWithServices = pruneEmptyDeep(
        omitUndefined({
          ...initialValues,
          // normalizações para a comparação
          email: undef(initialValues?.email),
          phone: undef(initialValues?.phone),
          serviceSlugs: initialValues?.serviceSlugs ?? undefined,
          preferences: initialValues?.preferences
            ? omitUndefined({ preferredChannel: initialValues.preferences.preferredChannel })
            : undefined,
        })
      ) as ClientPayloadWithServices;

      const next: ClientPayloadWithServices = pruneEmptyDeep(
        omitUndefined({ ...full })
      ) as ClientPayloadWithServices;

      // diff recursivo
      const diff = deepDiff(next, initial) as ClientPayloadWithServices | undefined;

      // se serviceSlugs vieram mas não mudaram, remova
      if (diff?.serviceSlugs && initial.serviceSlugs && deepEqual(diff.serviceSlugs, initial.serviceSlugs)) {
        delete (diff as any).serviceSlugs;
      }

      // se não houve diferença, retorne objeto vazio (deixa o backend decidir)
      return (diff ?? {}) as ClientPayloadWithServices;
    },
    [initialValues]
  );

  /* ------------------------------------------------------------------------
   * Submits
   * ------------------------------------------------------------------------ */

  async function submitCreate(full: ClientPayloadWithServices) {
    const created = await apiFetch<unknown>("/clients", { method: "POST", body: full });
    return created ?? null;
  }

  async function submitUpdate(full: ClientPayloadWithServices) {
    if (!id) throw new Error("ID do cliente ausente para edição.");
    // envia só o diff
    const diff = buildPatchDiff(full);
    const updated = await apiFetch<unknown>(`/clients/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: diff,
    });
    return updated ?? null;
  }

  /* ------------------------------------------------------------------------
   * Handler principal
   * ------------------------------------------------------------------------ */

  async function handleSubmitInternal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const err = validateRequired();
    if (err) {
      toast.error(err);
      return;
    }

    const full = buildFullPayload();
    const fullWithServices: ClientPayloadWithServices = { ...full, serviceSlugs };

    if (onSubmit) {
      await onSubmit(fullWithServices);
      return;
    }

    setBusy(true);
    try {
      const result = mode === "create" ? await submitCreate(fullWithServices) : await submitUpdate(fullWithServices);
      const displayName = (result as { name?: string } | null)?.name || full.name;

      toast.success(
        mode === "create"
          ? `Cliente "${displayName}" criado com sucesso!`
          : `Cliente "${displayName}" atualizado com sucesso!`
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

  /* ------------------------------------------------------------------------
   * UI
   * ------------------------------------------------------------------------ */

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>{title ?? (mode === "create" ? "Cadastro de Cliente" : "Editar Cliente")}</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmitInternal} className="grid gap-8" noValidate>
          <fieldset className="grid gap-6" disabled={disabled} aria-busy={disabled}>
            {/* Tipo & Status */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            </section>

            {/* Identificação */}
            {personType === "PF" ? (
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="name">Nome completo *</Label>
                  <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    inputMode="numeric"
                    value={formatCPF(docNumber)}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rg">RG</Label>
                  <Input id="rg" value={pfRG} onChange={(e) => setPfRG(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="birth">Nascimento</Label>
                  <Input id="birth" type="date" value={pfBirth ?? ""} onChange={(e) => setPfBirth(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="marital">Estado civil</Label>
                  <Input id="marital" value={pfMarital ?? ""} onChange={(e) => setPfMarital(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profession">Profissão</Label>
                  <Input id="profession" value={pfProfession ?? ""} onChange={(e) => setPfProfession(e.target.value)} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch id="pep" checked={pfPEP} onCheckedChange={setPfPEP} />
                  <Label htmlFor="pep">PEP (Pessoa Exposta Politicamente)</Label>
                </div>
              </section>
            ) : (
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="corporate">Razão social *</Label>
                  <Input id="corporate" value={pjCorporate} onChange={(e) => setPjCorporate(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="trade">Nome fantasia</Label>
                  <Input id="trade" value={pjTrade} onChange={(e) => setPjTrade(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    inputMode="numeric"
                    value={formatCNPJ(pjCNPJ || docNumber)}
                    onChange={(e) => setPjCNPJ(e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ie">Inscrição Estadual</Label>
                  <Input id="ie" value={pjIE ?? ""} onChange={(e) => setPjIE(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="im">Inscrição Municipal</Label>
                  <Input id="im" value={pjIM ?? ""} onChange={(e) => setPjIM(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cnae">CNAE</Label>
                  <Input id="cnae" value={pjCNAE ?? ""} onChange={(e) => setPjCNAE(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="foundation">Data de fundação</Label>
                  <Input id="foundation" type="date" value={pjFoundation ?? ""} onChange={(e) => setPjFoundation(e.target.value)} />
                </div>

                {/* Representante legal */}
                <div className="grid grid-cols-1 gap-4 md:col-span-3 md:grid-cols-4">
                  <div className="grid gap-2 md:col-span-2">
                    <Label htmlFor="repName">Representante legal (nome)</Label>
                    <Input id="repName" value={pjRepName} onChange={(e) => setPjRepName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repCPF">CPF</Label>
                    <Input id="repCPF" inputMode="numeric" value={formatCPF(pjRepCPF || "")} onChange={(e) => setPjRepCPF(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repEmail">E-mail</Label>
                    <Input id="repEmail" type="email" value={pjRepEmail || ""} onChange={(e) => setPjRepEmail(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repPhone">Telefone</Label>
                    <Input id="repPhone" value={formatPhoneBR(pjRepPhone || "")} onChange={(e) => setPjRepPhone(e.target.value)} />
                  </div>
                </div>
              </section>
            )}

            {/* Contatos gerais do cliente */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="email">E-mail do cliente</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone do cliente</Label>
                <Input id="phone" value={formatPhoneBR(phone)} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </section>

            {/* Contato principal / Responsável */}
            <section className="grid gap-2">
              <Label>Contato principal / Responsável</Label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <Input placeholder="Nome" value={pcName} onChange={(e) => setPcName(e.target.value)} />
                <Input placeholder="Cargo/Setor" value={pcRole || ""} onChange={(e) => setPcRole(e.target.value)} />
                <Input placeholder="E-mail" type="email" value={pcEmail || ""} onChange={(e) => setPcEmail(e.target.value)} />
                <Input placeholder="Telefone" value={formatPhoneBR(pcPhone || "")} onChange={(e) => setPcPhone(e.target.value)} />
              </div>
              <Textarea placeholder="Observações" value={pcNotes || ""} onChange={(e) => setPcNotes(e.target.value)} />
            </section>

            {/* Endereço */}
            <section className="grid gap-2">
              <Label>Endereço</Label>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <Input className="md:col-span-2" placeholder="CEP" value={formatCEP(zip)} onChange={(e) => setZip(e.target.value)} inputMode="numeric" />
                <Input className="md:col-span-3" placeholder="Logradouro" value={street} onChange={(e) => setStreet(e.target.value)} />
                <Input placeholder="Número" value={number} onChange={(e) => setNumber(e.target.value)} />
                <Input className="md:col-span-2" placeholder="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} />
                <Input className="md:col-span-2" placeholder="Bairro" value={district} onChange={(e) => setDistrict(e.target.value)} />
                <Input className="md:col-span-2" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
                <Input placeholder="UF" value={uf} onChange={(e) => setUf(e.target.value.toUpperCase().slice(0, 2))} />
                <Input placeholder="País" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </section>

            {/* Serviços contratados */}
            <section className="grid gap-2">
              <ServicePicker
                value={serviceSlugs}
                onChange={setServiceSlugs}
                principalSlugs={["HEALTH", "DENTAL", "LIFE", "AUTO", "HOME", "TRAVEL"]}
                title="Serviços contratados"
              />
            </section>

            {/* Preferências & LGPD */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                <Switch id="mkt" checked={marketingOptIn} onCheckedChange={setMarketingOptIn} />
                <Label htmlFor="mkt">Aceita comunicações de marketing</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="privacy" checked={privacyConsent} onCheckedChange={setPrivacyConsent} />
                <Label htmlFor="privacy">Confirma ciência/consentimento de privacidade</Label>
              </div>
            </section>
          </fieldset>

          {/* Ações */}
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
