// Helpers de Faixa Etária (configuráveis)

export type AgeBand = { min: number; max: number; label: string };

// Padrão ANS (ajuste se sua operadora usar outra grade)
export const DEFAULT_AGE_BANDS: AgeBand[] = [
  { min: 0,  max: 18, label: '0–18' },
  { min: 19, max: 23, label: '19–23' },
  { min: 24, max: 28, label: '24–28' },
  { min: 29, max: 33, label: '29–33' },
  { min: 34, max: 38, label: '34–38' },
  { min: 39, max: 43, label: '39–43' },
  { min: 44, max: 48, label: '44–48' },
  { min: 49, max: 53, label: '49–53' },
  { min: 54, max: 58, label: '54–58' },
  { min: 59, max: 200, label: '59+' }, // max alto = “sem próxima faixa”
];

export type AgeAlert = 'none' | 'moderate' | 'high';

export type AgeInfo = {
  age?: number;                               // idade atual
  nextBandChangeDate?: Date | null;           // data do aniversário em que muda de faixa
  monthsUntilBandChange?: number | null;      // meses até mudança
  alert: AgeAlert;                            // 'none' | 'moderate' | 'high'
  band?: AgeBand;                             // faixa atual
};

export function ageFromDob(dob: Date, ref = new Date()): number {
  let age = ref.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    ref.getMonth() > dob.getMonth() ||
    (ref.getMonth() === dob.getMonth() && ref.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

export function getBand(age: number, bands: AgeBand[]): AgeBand | undefined {
  return bands.find(b => age >= b.min && age <= b.max);
}

function dateAtAge(dob: Date, targetAge: number): Date {
  const d = new Date(dob);
  d.setFullYear(dob.getFullYear() + targetAge);
  return d; // setFullYear trata 29/02 para anos não bissextos
}

function monthsBetween(from: Date, to: Date): number {
  // negativo => já passou
  const y = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  let months = y * 12 + m;
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

/**
 * Calcula quando ocorrerá a próxima mudança de faixa etária (se existir)
 * e define o nível de alerta:
 *  - 'high' < 3 meses
 *  - 'moderate' < 6 meses
 *  - 'none' caso contrário ou sem próxima faixa
 */
export function computeAgeInfo(
  dobIso?: string | null,
  bands: AgeBand[] = DEFAULT_AGE_BANDS,
  ref = new Date()
): AgeInfo {
  if (!dobIso) return { alert: 'none', monthsUntilBandChange: null, nextBandChangeDate: null };
  const dob = new Date(dobIso);
  if (isNaN(dob.getTime())) return { alert: 'none', monthsUntilBandChange: null, nextBandChangeDate: null };

  const age = ageFromDob(dob, ref);
  const band = getBand(age, bands);
  if (!band) return { age, alert: 'none', monthsUntilBandChange: null, nextBandChangeDate: null };

  // Se não há próxima faixa (max muito alto), não há mudança
  if (!isFinite(band.max) || band.max >= 200) {
    return { age, band, alert: 'none', monthsUntilBandChange: null, nextBandChangeDate: null };
  }

  const targetAge = band.max + 1; // idade do 1º aniversário que cruza a próxima faixa
  const changeDate = dateAtAge(dob, targetAge);
  const months = monthsBetween(ref, changeDate);

  let alert: AgeAlert = 'none';
  if (months >= 0 && months < 3) alert = 'high';
  else if (months >= 0 && months < 6) alert = 'moderate';

  return {
    age,
    band,
    nextBandChangeDate: changeDate,
    monthsUntilBandChange: months,
    alert,
  };
}
