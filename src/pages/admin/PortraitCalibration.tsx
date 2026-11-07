import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Photo from "@/components/ui/Photo";
import FaceGuide from "@/components/ui/FaceGuide";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePhotoFraming, PHOTO_FRAMING_QUERY } from "@/hooks/usePhotoFraming";
import { PHOTO_FRAMING_KEY, SCALE_MAX, SCALE_MIN, type FramingAdjust, type PhotoFramingSetting } from "@/lib/photoFraming";

interface Row { id: string; first_name: string; last_name: string; photo_url: string | null }
const REFERENCE = "MBIGOU";
const NEUTRAL: FramingAdjust = { scale: 1, x: 50, y: 40, light: 1, contrast: 1 };

const save = async (value: PhotoFramingSetting) => {
  const { data, error } = await supabase.functions.invoke("admin-settings", { body: { key: PHOTO_FRAMING_KEY, value } });
  if (error || data?.error) throw new Error(data?.error || "Enregistrement impossible");
};

const PortraitCalibration = () => {
  const qc = useQueryClient();
  const { data: setting } = usePhotoFraming();
  const { data: rows = [] } = useQuery({
    queryKey: ["calibration-memorials"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("memorials")
        .select("id, first_name, last_name, photo_url")
        .is("deleted_at", null).not("photo_url", "is", null).order("last_name").limit(500);
      if (error) throw error;
      return data as Row[];
    },
  });
  const reference = rows.find((r) => r.last_name === REFERENCE);
  const [selectedId, setSelectedId] = useState<string>("");
  const selected = rows.find((r) => r.id === selectedId) ?? rows.find((r) => r.last_name !== REFERENCE);
  const [preview, setPreview] = useState<"brut" | "biometrique">("biometrique");
  const [guide, setGuide] = useState(true);
  const [adj, setAdj] = useState<FramingAdjust>(NEUTRAL);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selected?.photo_url) setAdj(setting?.overrides[selected.photo_url] ?? NEUTRAL);
  }, [selected?.photo_url, setting]);

  const label = (r: Row) => `${r.first_name} ${r.last_name}`;
  const calibratedCount = useMemo(() => Object.keys(setting?.overrides ?? {}).length, [setting]);

  const persist = async (next: PhotoFramingSetting, msg: string) => {
    setBusy(true);
    try { await save(next); await qc.invalidateQueries({ queryKey: PHOTO_FRAMING_QUERY }); toast.success(msg); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const current: PhotoFramingSetting = setting ?? { mode: "brut", overrides: {} };

  const frameFor = (r?: Row) => preview === "brut" || !r ? null : r.id === selected?.id ? (isAdjusted(adj) ? adj : null) : null;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-foreground">Étalonnage des portraits</h1>
        <p className="text-sm text-muted-foreground">
          Harmonisez la taille des visages et l'éclairage sur le portrait étalon. Le fichier d'origine n'est jamais modifié.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-4 rounded-md border border-border p-4">
        <div className="flex-1 min-w-[220px]">
          <p className="text-sm font-medium text-foreground">Rendu publié sur Floorence</p>
          <p className="text-xs text-muted-foreground">
            {current.mode === "biometrique" ? "Biométrique (visages harmonisés)" : "Brut (photos entières)"} · {calibratedCount} portrait(s) réglé(s)
          </p>
        </div>
        <Button variant={current.mode === "brut" ? "default" : "outline"} disabled={busy}
          onClick={() => persist({ ...current, mode: "brut" }, "Rendu brut publié")}>Publier « Brut »</Button>
        <Button variant={current.mode === "biometrique" ? "default" : "outline"} disabled={busy}
          onClick={() => persist({ ...current, mode: "biometrique" }, "Rendu biométrique publié")}>Publier « Biométrique »</Button>
      </section>

      <section className="flex flex-wrap items-end gap-6">
        <div className="space-y-2 min-w-[260px]">
          <Label>Portrait à comparer</Label>
          <Select value={selected?.id} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Choisir un défunt" /></SelectTrigger>
            <SelectContent>
              {rows.filter((r) => r.last_name !== REFERENCE).map((r) => (
                <SelectItem key={r.id} value={r.id}>{label(r)}{r.photo_url && current.overrides[r.photo_url] ? " · réglé" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="pv" checked={preview === "biometrique"} onCheckedChange={(v) => setPreview(v ? "biometrique" : "brut")} />
          <Label htmlFor="pv">Aperçu {preview === "biometrique" ? "biométrique" : "brut"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="gd" checked={guide} onCheckedChange={setGuide} />
          <Label htmlFor="gd">Repère du visage</Label>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
        {[{ r: reference, title: "Étalon" }, { r: selected, title: "Comparé" }].map(({ r, title }) => (
          <figure key={title} className="space-y-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-md">
              <Photo src={r?.photo_url} alt={r ? `Portrait de ${label(r)}` : "Portrait"} fallbackName={r && label(r)}
                tone="memorial" variant="portrait" targetWidth={600} framing={frameFor(r)} />
              {guide && <FaceGuide />}
            </div>
            <figcaption className="text-sm text-muted-foreground">{title} · {r ? label(r) : "—"}</figcaption>
          </figure>
        ))}
      </section>

      {selected?.photo_url && (
        <section className="space-y-5 max-w-3xl rounded-md border border-border p-4">
          {([
            ["Agrandissement", "scale", SCALE_MIN, SCALE_MAX, 0.01, `${adj.scale.toFixed(2)}×`],
            ["Position horizontale du visage", "x", 0, 100, 1, `${adj.x} %`],
            ["Position verticale du visage", "y", 0, 100, 1, `${adj.y} %`],
            ["Luminosité", "light", LIGHT_MIN, LIGHT_MAX, 0.01, `${Math.round(((adj.light ?? 1) - 1) * 100)} %`],
            ["Contraste", "contrast", LIGHT_MIN, LIGHT_MAX, 0.01, `${Math.round(((adj.contrast ?? 1) - 1) * 100)} %`],
          ] as const).map(([lab, k, min, max, step, shown]) => (
            <div key={k} className="space-y-2">
              <div className="flex justify-between text-sm"><Label>{lab}</Label><span className="text-muted-foreground">{shown}</span></div>
              <Slider min={min} max={max} step={step} value={[adj[k] ?? 1]}
                onValueChange={([v]) => { setPreview("biometrique"); setAdj((a) => ({ ...a, [k]: v })); }} />
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => {
              const overrides = { ...current.overrides };
              if (isAdjusted(adj)) overrides[selected.photo_url!] = adj; else delete overrides[selected.photo_url!];
              persist({ ...current, overrides }, `Réglage enregistré pour ${label(selected)}`);
            }}>Enregistrer ce réglage</Button>
            <Button variant="outline" disabled={busy} onClick={() => setAdj(NEUTRAL)}>Revenir à la photo entière</Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Le réglage n'est visible du public que si le rendu « Biométrique » est publié.
          </p>
        </section>
      )}
    </div>
  );
};

export default PortraitCalibration;
