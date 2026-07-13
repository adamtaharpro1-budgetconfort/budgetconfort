import { BMI_ZONES, BMI_SCALE_MIN, BMI_SCALE_MAX, bmiToPercent, getBmiZone } from "@/lib/bmi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function BmiGauge({ bmi }: { bmi: number }) {
  const zone = getBmiZone(bmi);
  const markerPercent = bmiToPercent(bmi);
  const badgeVariant = zone.colorVar === "--success" ? "success" : zone.colorVar === "--destructive" ? "destructive" : "warning";

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-semibold">{bmi.toFixed(1)}</p>
        <Badge variant={badgeVariant}>{zone.label}</Badge>
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

      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        {BMI_ZONES.map((z, i) => (
          <span key={z.key} className={cn(i === 0 && "text-left", i === BMI_ZONES.length - 1 && "text-right")}>
            {z.max === BMI_SCALE_MAX ? `${z.min}+` : z.min}
          </span>
        ))}
      </div>
      <p className="mt-1 text-center text-[11px] text-muted-foreground">
        Repère indicatif (OMS) — ne remplace pas un avis médical.
      </p>
    </div>
  );
}
