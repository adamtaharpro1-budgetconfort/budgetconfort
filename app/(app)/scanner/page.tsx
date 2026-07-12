"use client";

import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Refrigerator, Receipt as ReceiptIcon, CheckCircle2 } from "lucide-react";
import { scanFridge, scanReceipt } from "@/lib/actions/scanner";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

export default function ScannerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Scanner IA</h1>
      <Tabs defaultValue="fridge">
        <TabsList>
          <TabsTrigger value="fridge"><Refrigerator className="mr-1 h-4 w-4" /> Frigo</TabsTrigger>
          <TabsTrigger value="receipt"><ReceiptIcon className="mr-1 h-4 w-4" /> Ticket de caisse</TabsTrigger>
        </TabsList>
        <TabsContent value="fridge">
          <FridgeScanner />
        </TabsContent>
        <TabsContent value="receipt">
          <ReceiptScanner />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FridgeScanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<string[]>([]);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setResultText(null);
    const formData = new FormData();
    formData.set("image", file);
    const result = await scanFridge(formData);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setResultText(`${result.itemCount} produit(s) détecté(s) et ajouté(s) à ton stock.`);
    setRecipeIdeas(result.recipeIdeas ?? []);
  }

  return (
    <Card className="mt-4">
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Prends une photo de ton frigo, congélateur ou placard. L&apos;IA détecte les aliments et les ajoute
          automatiquement à ton stock.
        </p>
        {preview && <img src={preview} alt="Aperçu" className="max-h-64 w-full rounded-md object-cover" />}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {loading ? "Analyse en cours..." : "Prendre / choisir une photo"}
        </Button>
        {resultText && (
          <div className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" /> {resultText}
            </p>
            {recipeIdeas.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {recipeIdeas.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReceiptScanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setResultText(null);
    const formData = new FormData();
    formData.set("image", file);
    const result = await scanReceipt(formData);
    setLoading(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setResultText(
      `Ticket analysé : ${formatCurrency(result.total ?? 0)} ajoutés au budget, ${result.itemCount} produit(s) ajoutés au stock.`
    );
  }

  return (
    <Card className="mt-4">
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Photographie ton ticket de caisse. L&apos;IA extrait le montant, les produits, et met à jour ton
          budget et ton stock automatiquement.
        </p>
        {preview && <img src={preview} alt="Aperçu" className="max-h-64 w-full rounded-md object-cover" />}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button onClick={() => inputRef.current?.click()} disabled={loading} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {loading ? "Analyse en cours..." : "Prendre / choisir une photo"}
        </Button>
        {resultText && (
          <div className="rounded-md bg-accent p-3 text-sm text-accent-foreground">
            <p className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4" /> {resultText}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
