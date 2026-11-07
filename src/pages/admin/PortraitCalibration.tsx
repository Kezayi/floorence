import { useEffect, useMemo, useRef, useState } from "react";
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
import { PHOTO_FRAMING_KEY, SCALE_MAX, SCALE_MIN, LIGHT_MIN, LIGHT_MAX, RETOUCH_LIMITS, isAdjusted, type FramingAdjust, type PhotoFramingSetting } from "@/lib/photoFraming";
import { Undo2, Redo2, RotateCcw, Save } from "lucide-react";

interface Row { id: string; first_name: string; last_name: string; photo_url: string | null; photos: string[] | null }
const REFERENCE = "MBIGOU";
const NEUTRAL: FramingAdjust = { scale: 1, x: 50, y: 40, light: 1, contrast: 1, exposure: 0, shadows: 0, highlights: 0, warmth: 0.18, saturation: 1, sharpness: 0, autoLight: true };

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
        .select("id, first_name, last_name, photo_url, photos")
        .is("deleted_at", null).order("last_name").limit(500);
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
  const [photoIndex, setPhotoIndex] = useState(0);
  const [color, setColor] = useState(false);
  const [history, setHistory] = useState<FramingAdjust[]>([]);
  const [future, setFuture] = useState<FramingAdjust[]>([]);
  const dragStart = useRef<FramingAdjust | null>(null);
  const photos = [...new Set([selected?.photo_url, ...(selected?.photos ?? [])].filter((p): p is string => !!p))];
  const photoUrl = photos[photoIndex] ?? photos[0];
  useEffect(() => { setPhotoIndex(0); }, [selected?.id]);

  useEffect(() => {
    setAdj({ ...NEUTRAL, ...(photoUrl ? setting?.overrides[photoUrl] ?? {} : {}) });
    setHistory([]); setFuture([]); dragStart.current = null;
  }, [photoUrl, setting]);
  const change = (next: FramingAdjust) => { setHistory((h) => [...h.slice(-39), adj]); setFuture([]); setAdj(next); };

  const label = (r: Row) => `${r.first_name} ${r.last_name}`;
  const calibratedCount = useMemo(() => Object.keys(setting?.overrides ?? {}).length, [setting]);

  const persist = async (next: PhotoFramingSetting, msg: string) => {
    setBusy(true);
    try { await save(next); await qc.invalidateQueries({ queryKey: PHOTO_FRAMING_QUERY }); toast.success(msg); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const current: PhotoFramingSetting = setting ?? { mode: "brut", overrides: {} };

  const frameFor = (r?: Row) => preview === "brut" || !r ? null : r.id === selected?.id ? adj : undefined;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="font-serif text-3xl text-foreground">Étalonnage des portraits</h1>
      </header>

      <section className="flex flex-wrap items-center gap-4 border-y border-border py-4">
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
          <Label>Défunt</Label>
          <Select value={selected?.id} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Choisir un défunt" /></SelectTrigger>
            <SelectContent>
              {rows.filter((r) => r.photo_url || r.photos?.length).map((r) => (
                <SelectItem key={r.id} value={r.id}>{label(r)}{r.photo_url && current.overrides[r.photo_url] ? " · réglé" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {photos.length > 1 && <div className="space-y-2"><Label>Photographie</Label>
          <Select value={String(photoIndex)} onValueChange={(v) => setPhotoIndex(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{photos.map((p, i) => <SelectItem key={p} value={String(i)}>Photo {i + 1}</SelectItem>)}</SelectContent>
          </Select>
        </div>}
        <div className="flex items-center gap-2">
          <Switch id="pv" checked={preview === "biometrique"} onCheckedChange={(v) => setPreview(v ? "biometrique" : "brut")} />
          <Label htmlFor="pv">Aperçu {preview === "biometrique" ? "biométrique" : "brut"}</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="gd" checked={guide} onCheckedChange={setGuide} />
          <Label htmlFor="gd">Repère du visage</Label>
        </div>
        <div className="flex items-center gap-2"><Switch id="portrait-color" checked={color} onCheckedChange={setColor} /><Label htmlFor="portrait-color">Couleur</Label></div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
        {[{ r: reference, title: "Étalon" }, { r: selected, title: "Comparé" }].map(({ r, title }) => (
          <figure key={title} className="space-y-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-md">
              <Photo src={title === "Comparé" ? photoUrl : r?.photo_url} alt={r ? `Portrait de ${label(r)}` : "Portrait"} fallbackName={r && label(r)}
                tone="memorial" variant="portrait" targetWidth={600} detail colorMode={color ? "color" : "rest"} framing={frameFor(r)} />
              {guide && <FaceGuide />}
            </div>
            <figcaption className="text-sm text-muted-foreground">{title} · {r ? label(r) : "—"}</figcaption>
          </figure>
        ))}
      </section>

      {selected && photoUrl && (
        <section className="space-y-5 max-w-3xl border-t border-border pt-4">
          <div className="flex items-center gap-2"><Switch id="auto-light" checked={adj.autoLight !== false} onCheckedChange={(v) => change({ ...adj, autoLight: v })} /><Label htmlFor="auto-light">Éclairage automatique</Label></div>
          {([
            ["Agrandissement", "scale", SCALE_MIN, SCALE_MAX, 0.01, `${adj.scale.toFixed(2)}×`],
            ["Position horizontale du visage", "x", 0, 100, 1, `${adj.x} %`],
            ["Position verticale du visage", "y", 0, 100, 1, `${adj.y} %`],
            ["Luminosité", "light", LIGHT_MIN, LIGHT_MAX, 0.01, `${Math.round(((adj.light ?? 1) - 1) * 100)} %`],
            ["Contraste", "contrast", LIGHT_MIN, LIGHT_MAX, 0.01, `${Math.round(((adj.contrast ?? 1) - 1) * 100)} %`],
            ["Exposition", "exposure", ...RETOUCH_LIMITS.exposure.slice(0, 2) as [number, number], 0.05, `${(adj.exposure ?? 0).toFixed(2)} EV`],
            ["Ombres", "shadows", -0.5, 0.5, 0.01, `${Math.round((adj.shadows ?? 0) * 100)} %`],
            ["Hautes lumières", "highlights", -0.5, 0.5, 0.01, `${Math.round((adj.highlights ?? 0) * 100)} %`],
            ["Chaleur du noir et blanc", "warmth", 0, 0.5, 0.01, `${Math.round((adj.warmth ?? 0.18) * 100)} %`],
            ["Saturation en couleur", "saturation", 0, 2, 0.01, `${Math.round((adj.saturation ?? 1) * 100)} %`],
            ["Netteté", "sharpness", 0, 1, 0.01, `${Math.round((adj.sharpness ?? 0) * 100)} %`],
          ] as const).map(([lab, k, min, max, step, shown]) => (
            <div key={k} className="space-y-2">
              <div className="flex justify-between gap-3 text-sm"><Label htmlFor={`retouch-${k}`}>{lab}</Label><span className="text-muted-foreground shrink-0">{shown}</span></div>
              <Slider id={`retouch-${k}`} aria-label={lab} min={min} max={max} step={step} value={[adj[k] ?? NEUTRAL[k] ?? 1]}
                onValueChange={([v]) => { if (v === undefined) return; dragStart.current ??= adj; setPreview("biometrique"); setAdj((a) => ({ ...a, [k]: v })); }}
                onValueCommit={() => { const start = dragStart.current; if (start) { setHistory((h) => [...h.slice(-39), start]); setFuture([]); dragStart.current = null; } }} />
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => {
              const overrides = { ...current.overrides };
              if (isAdjusted(adj)) overrides[photoUrl] = adj; else delete overrides[photoUrl];
              persist({ ...current, overrides }, `Réglage enregistré pour ${label(selected)}`);
            }}><Save className="w-4 h-4 mr-2" />Enregistrer ce réglage</Button>
            <Button size="icon" variant="outline" title="Annuler" aria-label="Annuler" disabled={!history.length} onClick={() => { const last = history.at(-1); if (!last) return; setFuture((f) => [...f, adj]); setAdj(last); setHistory((h) => h.slice(0, -1)); }}><Undo2 className="w-4 h-4" /></Button>
            <Button size="icon" variant="outline" title="Rétablir" aria-label="Rétablir" disabled={!future.length} onClick={() => { const next = future.at(-1); if (!next) return; setHistory((h) => [...h, adj]); setAdj(next); setFuture((f) => f.slice(0, -1)); }}><Redo2 className="w-4 h-4" /></Button>
            <Button variant="outline" disabled={busy} onClick={() => change(NEUTRAL)}><RotateCcw className="w-4 h-4 mr-2" />Réinitialiser les retouches</Button>
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
