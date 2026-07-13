export interface BmiZone {
  key: string;
  label: string;
  min: number;
  max: number;
  colorVar: string; // CSS variable name, no var()
}

// Échelle affichée : 15 à 45 (au-delà, la position est simplement plafonnée).
export const BMI_SCALE_MIN = 15;
export const BMI_SCALE_MAX = 45;

export const BMI_ZONES: BmiZone[] = [
  { key: "maigreur", label: "Maigreur", min: 15, max: 18.5, colorVar: "--info" },
  { key: "normal", label: "Normal", min: 18.5, max: 25, colorVar: "--success" },
  { key: "surpoids", label: "Surpoids", min: 25, max: 30, colorVar: "--warning" },
  { key: "obesite-moderee", label: "Obésité modérée", min: 30, max: 40, colorVar: "--secondary" },
  { key: "obesite-severe", label: "Obésité Sévère", min: 40, max: 45, colorVar: "--destructive" },
];

export function getBmiZone(bmi: number): BmiZone {
  if (bmi < 18.5) return BMI_ZONES[0];
  if (bmi < 25) return BMI_ZONES[1];
  if (bmi < 30) return BMI_ZONES[2];
  if (bmi < 40) return BMI_ZONES[3];
  return BMI_ZONES[4];
}

export function bmiToPercent(bmi: number) {
  const clamped = Math.min(Math.max(bmi, BMI_SCALE_MIN), BMI_SCALE_MAX);
  return ((clamped - BMI_SCALE_MIN) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100;
}
