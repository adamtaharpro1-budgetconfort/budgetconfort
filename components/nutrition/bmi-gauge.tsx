import { BMI_ZONES, BMI_SCALE_MIN, BMI_SCALE_MAX, bmiToPercent, getBmiZone } from "@/lib/bmi";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ZONE_BADGE_VARIANT: Record<string, BadgeProps["variant"]> = {
  maigreur: "info",
  normal: "success",
  surpoids: "warning",
  "obesite-moderee": "secondary",
  "obesite-severe": "destructive",
};

export function BmiGauge({ bmi }: { bmi: number }) {
  const zone = getBmiZone(bmi);
  const markerPercent = bmiToPercent(bmi);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold">{bmi.toFixed(1)}</p>
        <Badge variant={ZONE_BADGE_VARIANT[zone.key]}>{zone.label}</Badge>
      </div>

      <div className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full">
        <div className="flex h-full w-full">
          {BMI_ZONES.map((z) => (
            <div
              key={z.key}
              style={{
                width: `${((Math.min(z.max, BMI_SCALE_MAX) - z.min) / (BMI_SCALE_MAX - BMI_SCALE_MIN)) * 100}%`,
                backgroundColor: `var(${z.colorVar})`,
              }}
              className="h-full first:rounded-l-full last:rounded-r-full"
            />
          ))}
        </div>
        <div
          className="absolute top-1/2 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow"
          style={{ left: `${markerPercent}%` }}
          aria-hidden
        />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1 text-center">
        {BMI_ZONES.map((z) => (
          <div key={z.key} className={cn("text-[9px] font-medium leading-tight", zone.key === z.key && "font-bold")} style={{ color: `var(${z.colorVar})` }}>
            {z.label}
            <div className="text-[9px] font-normal text-muted-foreground">
              {z.max === BMI_SCALE_MAX ? `>${z.min}` : z.key === "maigreur" ? `<${z.max}` : `${z.min}-${z.max}`}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Repère indicatif (OMS) — ne remplace pas un avis médical.
      </p>
    </div>
  );
}
