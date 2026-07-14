"use client";

import { useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Refrigerator, Receipt as ReceiptIcon, CheckCircle2, Plus, X, Sparkles } from "lucide-react";
import { scanFridge, scanReceipt } from "@/lib/actions/scanner";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { useFakeProgress } from "@/lib/hooks/use-fake-progress";

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
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState<string | null>(null);
  const [recipeIdeas, setRecipeIdeas] = useState<string[]>([]);
  const { progress, setProgress } = useFakeProgress(loading, Math.max(12, photos.length * 6));

  function handleAddFiles(files: FileList) {
    const added = Array.from(files).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...added]);
    setResultText(null);
  }

  function handleRemovePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleLaunch() {
    if (photos.length === 0) return;
    setLoading(true);
    setResultText(null);
    let success = false;
    try {
      const formData = new FormData();
      photos.forEach((p) => formData.append("images", p.file));
      const result = await scanFridge(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setProgress(100);
      setResultText(`${result.itemCount} produit(s) détecté(s) et ajouté(s) à ton stock.`);
      setRecipeIdeas(result.recipeIdeas ?? []);
      photos.forEach((p) => URL.revokeObjectURL(p.url));
      setPhotos([]);
      success = true;
    } catch {
      toast.error("L'analyse a échoué. Réessaie.");
    } finally {
      if (success) setTimeout(() => setLoading(false), 400);
      else setLoading(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardContent className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">
          Prends autant de photos que tu veux (frigo, congélateur, placards...), puis lance l&apos;analyse : l&apos;IA
          détecte les aliments sur toutes les photos et les ajoute automatiquement à ton stock.
        </p>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.url} className="group relative">
                <img src={p.url} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-md object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(i)}
                  disabled={loading}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleAddFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={loading} className="w-full">
          <Plus className="h-4 w-4" /> {photos.length > 0 ? "Ajouter une autre photo" : "Prendre / choisir une photo"}
        </Button>
        <Button onClick={handleLaunch} disabled={loading || photos.length === 0} className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading
            ? "Analyse en cours..."
            : `Lancer l'analyse${photos.length > 0 ? ` (${photos.length} photo${photos.length > 1 ? "s" : ""})` : ""}`}
        </Button>
        {loading && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-center text-xs text-muted-foreground">
              {progress < 100 ? `Analyse des photos... (${Math.round(progress)}%)` : "Terminé !"}
            </p>
          </div>
        )}
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
  const { progress, setProgress } = useFakeProgress(loading, 12);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setResultText(null);
    let success = false;
    try {
      const formData = new FormData();
      formData.set("image", file);
      const result = await scanReceipt(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setProgress(100);
      setResultText(
        `Ticket analysé : ${formatCurrency(result.total ?? 0)} ajoutés au budget, ${result.itemCount} produit(s) ajoutés au stock.`
      );
      success = true;
    } catch {
      toast.error("L'analyse a échoué. Réessaie.");
    } finally {
      if (success) setTimeout(() => setLoading(false), 400);
      else setLoading(false);
    }
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
        {loading && (
          <div className="space-y-1">
            <Progress value={progress} />
            <p className="text-center text-xs text-muted-foreground">
              {progress < 100 ? `Analyse du ticket... (${Math.round(progress)}%)` : "Terminé !"}
            </p>
          </div>
        )}
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
