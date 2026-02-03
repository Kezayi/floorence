import { useState, useEffect } from 'react';
import { useSystemSettings, useUpdateSetting } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, ExternalLink, CreditCard, Flower2 } from 'lucide-react';

const Settings = () => {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSetting = useUpdateSetting();

  // Gesture prices
  const [candlePrice, setCandlePrice] = useState(500);
  const [flowerPrice, setFlowerPrice] = useState(1000);
  
  // Memorial creation prices
  const [memorialPriceFuture, setMemorialPriceFuture] = useState(15000);
  const [memorialPricePast, setMemorialPricePast] = useState(10000);
  
  // Contribution link
  const [contributionUrl, setContributionUrl] = useState('');
  const [contributionEnabled, setContributionEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setCandlePrice(settings.candle_price.amount);
      setFlowerPrice(settings.flower_price.amount);
      setMemorialPriceFuture(settings.memorial_price_future.amount);
      setMemorialPricePast(settings.memorial_price_past.amount);
      setContributionUrl(settings.contribution_link_template.url);
      setContributionEnabled(settings.contribution_link_template.enabled);
    }
  }, [settings]);

  const handleSaveGesturePrices = async () => {
    try {
      await Promise.all([
        updateSetting.mutateAsync({
          key: 'candle_price',
          value: { amount: candlePrice, currency: 'XOF' },
        }),
        updateSetting.mutateAsync({
          key: 'flower_price',
          value: { amount: flowerPrice, currency: 'XOF' },
        }),
      ]);
      toast.success('Prix des gestes mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleSaveMemorialPrices = async () => {
    // Validate: future price must be higher than past price
    if (memorialPriceFuture <= memorialPricePast) {
      toast.error('Le prix "obsèques futures" doit être supérieur au prix "obsèques passées"');
      return;
    }
    
    try {
      await Promise.all([
        updateSetting.mutateAsync({
          key: 'memorial_price_future',
          value: { amount: memorialPriceFuture, currency: 'XOF' },
        }),
        updateSetting.mutateAsync({
          key: 'memorial_price_past',
          value: { amount: memorialPricePast, currency: 'XOF' },
        }),
      ]);
      toast.success('Prix de création mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

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

  if (isLoading) {
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
        {/* Memorial Creation Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Tarification de création
            </CardTitle>
            <CardDescription>
              Définissez les prix de création d'un espace mémoriel selon la date des obsèques.
              Le prix "obsèques futures" doit être supérieur au prix "obsèques passées".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memorial-price-future">Obsèques futures (FCFA)</Label>
                <Input
                  id="memorial-price-future"
                  type="number"
                  value={memorialPriceFuture}
                  onChange={(e) => setMemorialPriceFuture(Number(e.target.value))}
                  min={0}
                  step={500}
                />
                <p className="text-xs text-muted-foreground">
                  Date des obsèques dans le futur
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="memorial-price-past">Obsèques passées (FCFA)</Label>
                <Input
                  id="memorial-price-past"
                  type="number"
                  value={memorialPricePast}
                  onChange={(e) => setMemorialPricePast(Number(e.target.value))}
                  min={0}
                  step={500}
                />
                <p className="text-xs text-muted-foreground">
                  Date des obsèques dans le passé
                </p>
              </div>
            </div>
            <Button onClick={handleSaveMemorialPrices} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer les tarifs
            </Button>
          </CardContent>
        </Card>

        {/* Gesture Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flower2 className="w-5 h-5" />
              Tarification des gestes
            </CardTitle>
            <CardDescription>
              Définissez les prix des cierges et des fleurs en FCFA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candle-price">Prix d'un cierge (FCFA)</Label>
                <Input
                  id="candle-price"
                  type="number"
                  value={candlePrice}
                  onChange={(e) => setCandlePrice(Number(e.target.value))}
                  min={0}
                  step={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="flower-price">Prix d'une fleur (FCFA)</Label>
                <Input
                  id="flower-price"
                  type="number"
                  value={flowerPrice}
                  onChange={(e) => setFlowerPrice(Number(e.target.value))}
                  min={0}
                  step={50}
                />
              </div>
            </div>
            <Button onClick={handleSaveGesturePrices} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer les prix
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
