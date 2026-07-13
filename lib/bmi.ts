export interface BmiZone {
  key: string;
  label: string;
  min: number;
  max: number;
  colorVar: string; // CSS variable name, no var()
}

// Échelle affichée : 15 à 40 (au-delà, la position est simplement plafonnée).
export const BMI_SCALE_MIN = 15;
export const BMI_SCALE_MAX = 40;

export const BMI_ZONES: BmiZone[] = [
  { key: "insuffisance", label: "Insuffisance pondérale", min: 15, max: 18.5, colorVar: "--warning" },
  { key: "normal", label: "Poids normal", min: 18.5, max: 25, colorVar: "--success" },
  { key: "surpoids", label: "Surpoids", min: 25, max: 30, colorVar: "--warning" },
  { key: "obesite", label: "Obésité", min: 30, max: 40, colorVar: "--destructive" },
];

export function getBmiZone(bmi: number): BmiZone {
  if (bmi < 18.5) return BMI_ZONES[0];
  if (bmi < 25) return BMI_ZONES[1];
  if (bmi < 30) return BMI_ZONES[2];
  return BMI_ZONES[3];
}

export function bmiToPercent(bmi: number) {
  const clamped = Math.min(Math.max(bmi, BMI_SCALE_MIN), BMI_SCALE_MAX);
  return ((clamped - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100;
}
