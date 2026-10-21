import { useState, useEffect } from 'react';
import { useSystemSettings, useUpdateSetting } from '@/hooks/useSystemSettings';
import { useGestureQuota, GESTURE_QUOTA_KEY } from '@/hooks/useGestureQuota';
import { useMonetization, useUpdateMonetization, useUpdateRitualPrice } from '@/hooks/useMonetization';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { PROMO_REASON_LABELS, isObituaryPromoActive } from '@/lib/obituaryPromo';
import { Loader2, Save, ExternalLink, Info, Bell, CreditCard, Flame, Flower2 } from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'weekly_saturday', label: 'Hebdomadaire (samedi)', desc: 'Digest envoyé chaque samedi à 09h' },
  { value: 'monthly_window', label: 'Fenêtre mensuelle', desc: 'Digest envoyé pendant la période définie' },
  { value: 'immediate', label: 'Immédiat', desc: 'Notification envoyée dès qu\'un événement survient' },
  { value: 'none', label: 'Aucune notification', desc: 'Désactiver toutes les notifications par défaut' },
] as const;

const Settings = () => {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSetting = useUpdateSetting();
  const { data: monetization, isLoading: monetizationLoading } = useMonetization();
  const updateMonetization = useUpdateMonetization();
  const updateRitualPrice = useUpdateRitualPrice();
  const { data: activeQuota } = useGestureQuota();
  const [gestureQuota, setGestureQuota] = useState(1);
  useEffect(() => { if (activeQuota) setGestureQuota(activeQuota); }, [activeQuota]);

  // Contribution link
  const [contributionUrl, setContributionUrl] = useState('');
  const [contributionEnabled, setContributionEnabled] = useState(false);

  // Notification settings
  const [notifFrequency, setNotifFrequency] = useState<string>('weekly_saturday');
  const [notifStartDay, setNotifStartDay] = useState(25);
  const [notifEndDay, setNotifEndDay] = useState(5);

  // Monetization
  const [isMonetized, setIsMonetized] = useState(false);
  const [candlePrice, setCandlePrice] = useState(500);
  const [flowerPrice, setFlowerPrice] = useState(500);
  const [memorialPriceFuture, setMemorialPriceFuture] = useState(0);
  const [memorialPricePast, setMemorialPricePast] = useState(0);

  // PROMO-01 — free obituary publication campaign
  const [promoActive, setPromoActive] = useState(false);
  const [promoStart, setPromoStart] = useState('');
  const [promoDays, setPromoDays] = useState(30);
  const [promoReason, setPromoReason] = useState('campagne_inaugurale');

  useEffect(() => {
    if (settings) {
      setContributionUrl(settings.contribution_link_template.url);
      setContributionEnabled(settings.contribution_link_template.enabled);
      setNotifFrequency(settings.notification_frequency.frequency);
      setNotifStartDay(settings.notification_window.start_day);
      setNotifEndDay(settings.notification_window.end_day);
      setMemorialPriceFuture(settings.memorial_price_future.amount);
      setMemorialPricePast(settings.memorial_price_past.amount);
      const p = settings.obituary_free_campaign;
      setPromoActive(p.active);
      setPromoStart(p.starts_at ? p.starts_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
      if (p.starts_at && p.ends_at) setPromoDays(Math.max(1, Math.round((Date.parse(p.ends_at) - Date.parse(p.starts_at)) / 86400000)));
      if (p.reason) setPromoReason(p.reason);
    }
  }, [settings]);

  useEffect(() => {
    if (monetization) {
      setIsMonetized(monetization.isMonetized);
      setCandlePrice(monetization.prices['cierge'] ?? 500);
      setFlowerPrice(monetization.prices['fleur'] ?? 500);
    }
  }, [monetization]);

  const handleSaveContributionLink = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'contribution_link_template',
        value: { url: contributionUrl, enabled: contributionEnabled },
      });
      toast.success('Lien de contribution mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateSetting.mutateAsync({
        key: 'notification_frequency',
        value: { frequency: notifFrequency },
      });
      await updateSetting.mutateAsync({
        key: 'notification_window',
        value: { start_day: notifStartDay, end_day: notifEndDay },
      });
      toast.success('Paramètres de notification mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveMonetization = async () => {
    if (!Number.isInteger(gestureQuota) || gestureQuota < 1 || gestureQuota > 10) {
      toast.error('Maximum de gestes : entier entre 1 et 10');
      return;
    }
    if (candlePrice < 500 || flowerPrice < 500) {
      toast.error('Le prix minimum est de 500 FCFA');
      return;
    }
    try {
      if (memorialPriceFuture < 0 || memorialPricePast < 0) {
        toast.error('Le prix de création ne peut pas être négatif');
        return;
      }
      await updateMonetization.mutateAsync({ isMonetized });
      await updateRitualPrice.mutateAsync({ itemType: 'cierge', unitPrice: candlePrice });
      await updateRitualPrice.mutateAsync({ itemType: 'fleur', unitPrice: flowerPrice });
      if (gestureQuota !== activeQuota) await updateSetting.mutateAsync({ key: GESTURE_QUOTA_KEY, value: { max: gestureQuota } });
      await updateSetting.mutateAsync({ key: 'memorial_price_future', value: { amount: memorialPriceFuture, currency: 'XAF' } });
      await updateSetting.mutateAsync({ key: 'memorial_price_past', value: { amount: memorialPricePast, currency: 'XAF' } });
      toast.success('Paramètres de monétisation mis à jour');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    }
  };

  const promoEnd = promoStart ? new Date(Date.parse(`${promoStart}T00:00:00Z`) + promoDays * 86400000) : null;

  const handleSavePromo = async () => {
    if (!promoStart || promoDays < 1 || !promoEnd) {
      toast.error('Date de début et durée (≥ 1 jour) requises');
      return;
    }
    try {
      await updateSetting.mutateAsync({
        key: 'obituary_free_campaign',
        value: {
          active: promoActive,
          starts_at: `${promoStart}T00:00:00Z`,
          ends_at: promoEnd.toISOString(),
          reason: promoReason,
          scope: 'worldwide',
        },
      });
      toast.success(promoActive ? 'Campagne enregistrée' : 'Campagne désactivée');
    } catch (error: any) {
      toast.error(error?.message || 'Erreur lors de la mise à jour');
    }
  };

  if (isLoading || monetizationLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Paramètres</h1>

      <div className="grid gap-6 max-w-2xl">
        {/* Monetization Switch & Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Tarifs & Limites
            </CardTitle>
            <CardDescription>
              Le mode ne concerne que la publication des mémoriaux. Les hommages écrits sont toujours gratuits ; cierges et fleurs sont toujours payants.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4" aria-labelledby="bloc-memoriaux">
              <h3 id="bloc-memoriaux" className="font-serif text-lg text-foreground">Publication des mémoriaux</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{isMonetized ? 'Mode Payant' : 'Mode Gratuit'}</p>
                  <p className="text-sm text-muted-foreground">
                    {isMonetized
                      ? 'Les mémoriaux sont facturés au prix ci-dessous'
                      : 'Publication des mémoriaux offerte (0 XAF)'}
                  </p>
                </div>
                <Switch
                  checked={isMonetized}
                  onCheckedChange={setIsMonetized}
                  aria-label="Basculer le mode de publication des mémoriaux"
                />
              </div>

              <div className={`space-y-4 transition-opacity ${isMonetized ? '' : 'opacity-60'}`}>
                <div className="space-y-2">
                  <Label htmlFor="memorial-price-future">Prix création — obsèques à venir (FCFA)</Label>
                  <Input
                    id="memorial-price-future"
                    type="number"
                    min={0}
                    disabled={!isMonetized}
                    value={memorialPriceFuture}
                    onChange={(e) => setMemorialPriceFuture(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="memorial-price-past">Prix création — obsèques passées (FCFA)</Label>
                  <Input
                    id="memorial-price-past"
                    type="number"
                    min={0}
                    disabled={!isMonetized}
                    value={memorialPricePast}
                    onChange={(e) => setMemorialPricePast(parseInt(e.target.value) || 0)}
                  />
                </div>
                {!isMonetized && (
                  <p className="text-xs text-muted-foreground">Inactif en Mode Gratuit : les prix sont conservés et s'appliqueront au retour du Mode Payant.</p>
                )}
              </div>
            </section>

            <section className="space-y-4 border-t border-border pt-6" aria-labelledby="bloc-gestes">
              <h3 id="bloc-gestes" className="font-serif text-lg text-foreground">Gestes rituels — toujours payants</h3>
              <p className="text-sm text-muted-foreground">
                Règle immuable : cierges et fleurs sont facturés à leur prix actif quel que soit le mode ou la campagne en cours. Contrôlé par le serveur.
              </p>
              <div className="space-y-2">
                <Label htmlFor="candle-price" className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-gesture-candle" />
                  Prix du cierge (FCFA)
                </Label>
                <Input
                  id="candle-price"
                  type="number"
                  min={500}
                  value={candlePrice}
                  onChange={(e) => setCandlePrice(parseInt(e.target.value) || 500)}
                />
                {candlePrice < 500 && (
                  <p className="text-xs text-destructive">Minimum : 500 FCFA</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="flower-price" className="flex items-center gap-2">
                  <Flower2 className="w-4 h-4 text-gesture-flower" />
                  Prix de la fleur (FCFA)
                </Label>
                <Input
                  id="flower-price"
                  type="number"
                  min={500}
                  value={flowerPrice}
                  onChange={(e) => setFlowerPrice(parseInt(e.target.value) || 500)}
                />
                {flowerPrice < 500 && (
                  <p className="text-xs text-destructive">Minimum : 500 FCFA</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gesture-quota">Maximum de gestes par hommage</Label>
                <Input
                  id="gesture-quota"
                  type="number"
                  min={1}
                  max={10}
                  value={gestureQuota}
                  onChange={(e) => setGestureQuota(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">Un seul type de geste (cierge ou fleur) par hommage. Contrôlé par le serveur, entre 1 et 10.</p>
              </div>
            </section>

            <Button
              onClick={handleSaveMonetization}
              disabled={updateMonetization.isPending || updateRitualPrice.isPending || candlePrice < 500 || flowerPrice < 500}
            >
              {(updateMonetization.isPending || updateRitualPrice.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer la monétisation
            </Button>
          </CardContent>
        </Card>

        {/* PROMO-01 — Free obituary publication campaign */}
        <Card>
          <CardHeader>
            <CardTitle>Campagne : avis de décès offerts</CardTitle>
            <CardDescription>
              Publication gratuite des avis de décès, portée mondiale. Les cierges et fleurs restent toujours payants.
              Chaque modification est tracée dans le Journal d'audit.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{promoActive ? 'Campagne activée' : 'Campagne désactivée'}</p>
                <p className="text-sm text-muted-foreground">
                  {settings && isObituaryPromoActive(settings.obituary_free_campaign)
                    ? 'En cours : les nouveaux avis sont publiés à 0 XAF'
                    : 'Aucune gratuité en cours'}
                </p>
              </div>
              <Switch checked={promoActive} onCheckedChange={setPromoActive} aria-label="Activer la campagne" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="promo-start">Date de début</Label>
                <Input id="promo-start" type="date" value={promoStart} onChange={(e) => setPromoStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="promo-days">Durée (jours)</Label>
                <Input id="promo-days" type="number" min={1} value={promoDays} onChange={(e) => setPromoDays(parseInt(e.target.value) || 1)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Date de fin : {promoEnd ? promoEnd.toLocaleDateString('fr-FR', { timeZone: 'UTC' }) : '—'} (exclue)
            </p>
            <div className="space-y-1">
              <Label>Motif</Label>
              <RadioGroup value={promoReason} onValueChange={setPromoReason}>
                {Object.entries(PROMO_REASON_LABELS).map(([v, l]) => (
                  <div key={v} className="flex items-center space-x-2">
                    <RadioGroupItem value={v} id={`promo-${v}`} />
                    <Label htmlFor={`promo-${v}`} className="cursor-pointer font-normal">{l}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            <Button onClick={handleSavePromo} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Enregistrer la campagne
            </Button>
          </CardContent>
        </Card>

        {/* Notification Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Configuration globale des notifications
            </CardTitle>
            <CardDescription>
              Ces paramètres s'appliquent par défaut à tous les nouveaux mémoriaux.
              Les créateurs peuvent personnaliser ces réglages pour leur propre espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fréquence par défaut</Label>
              <RadioGroup value={notifFrequency} onValueChange={setNotifFrequency}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value={opt.value} id={`freq-${opt.value}`} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={`freq-${opt.value}`} className="font-medium cursor-pointer">
                        {opt.label}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {notifFrequency === 'monthly_window' && (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
                <Label className="text-sm font-medium">Fenêtre mensuelle (période d'envoi)</Label>
                <p className="text-xs text-muted-foreground">
                  Les notifications seront envoyées uniquement entre le jour de début et le jour de fin de chaque mois.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="start-day" className="text-xs text-muted-foreground">Du jour</Label>
                    <Input
                      id="start-day"
                      type="number"
                      min={1}
                      max={31}
                      value={notifStartDay}
                      onChange={(e) => setNotifStartDay(parseInt(e.target.value) || 25)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="end-day" className="text-xs text-muted-foreground">Au jour</Label>
                    <Input
                      id="end-day"
                      type="number"
                      min={1}
                      max={31}
                      value={notifEndDay}
                      onChange={(e) => setNotifEndDay(parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Ex : du 25 au 05 = période de la paie, idéale pour les rappels de contributions
                </p>
              </div>
            )}

            <Button onClick={handleSaveNotifications} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer les notifications
            </Button>
          </CardContent>
        </Card>

        {/* External Contribution Link */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Lien de contribution externe
            </CardTitle>
            <CardDescription>
              Les contributions sont redirigées vers un lien externe (Wave, Orange Money, etc.).
              Floorence n'effectue aucun prélèvement. Les fonds vont directement aux bénéficiaires.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Contributions activées</p>
                <p className="text-sm text-muted-foreground">
                  {contributionEnabled
                    ? 'Le lien de contribution est visible sur les espaces mémoriels'
                    : 'Les contributions sont désactivées'}
                </p>
              </div>
              <Switch
                checked={contributionEnabled}
                onCheckedChange={setContributionEnabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contribution-url">URL de redirection</Label>
              <Input
                id="contribution-url"
                type="url"
                value={contributionUrl}
                onChange={(e) => setContributionUrl(e.target.value)}
                placeholder="https://wave.com/..."
                disabled={!contributionEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Lien vers le service de paiement externe (Wave, Orange Money, etc.)
              </p>
            </div>
            
            <Button onClick={handleSaveContributionLink} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
