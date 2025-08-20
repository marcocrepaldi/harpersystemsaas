// lib/format.ts
"use client";

export const onlyDigits = (v: string | null | undefined) =>
  (v || "").replace(/\D+/g, "");

export function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
}
export function normalizeCPF(v: string) {
  const d = onlyDigits(v);
  return d.length === 11 ? d : d; // retornamos como digitado (deixe a validação decidir)
}
export function validateCPF(v: string) {
  const s = onlyDigits(v);
  if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(s.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(s.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(s.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(s.charAt(10));
}

export function formatCNPJ(v: string) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{1,2})$/, "$1.$2.$3/$4-$5");
}
export function normalizeCNPJ(v: string) {
  const d = onlyDigits(v);
  return d.length === 14 ? d : d;
}
export function validateCNPJ(v: string) {
  const c = onlyDigits(v);
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
  const calc = (x: number) => {
    let n = 0;
    let pos = x - 7;
    for (let i = 0; i < x; i++) {
      n += parseInt(c.charAt(i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = n % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(12);
  const d2 = calc(13);
  return d1 === parseInt(c.charAt(12)) && d2 === parseInt(c.charAt(13));
}

export function formatCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d{1,3})$/, "$1-$2");
}
export function normalizeCEP(v: string) {
  return onlyDigits(v).slice(0, 8);
}
export function isValidCEP(v: string) {
  return normalizeCEP(v).length === 8;
}

export function formatPhoneBR(v: string) {
  const d = onlyDigits(v).slice(0, 13); // DDI+DDD+9+xxxx
  if (d.length <= 2) return `+${d}`;
  if (d.length <= 4) return `+${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 6) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
  if (d.length <= 10)
    return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 6)}${d.slice(6)}`;
  return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9, 13)}`;
}
export function normalizePhone(v: string) {
  return onlyDigits(v);
}

export function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || "").trim());
}
