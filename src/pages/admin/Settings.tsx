import { useState, useEffect } from 'react';
import { useSystemSettings, useUpdateSetting } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

const Settings = () => {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSetting = useUpdateSetting();

  const [candlePrice, setCandlePrice] = useState(500);
  const [flowerPrice, setFlowerPrice] = useState(1000);
  const [donationEnabled, setDonationEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setCandlePrice(settings.candle_price.amount);
      setFlowerPrice(settings.flower_price.amount);
      setDonationEnabled(settings.donation_enabled.enabled);
    }
  }, [settings]);

  const handleSavePrices = async () => {
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
      toast.success('Prix mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleToggleDonation = async (enabled: boolean) => {
    setDonationEnabled(enabled);
    try {
      await updateSetting.mutateAsync({
        key: 'donation_enabled',
        value: { enabled },
      });
      toast.success(enabled ? 'Collecte activée' : 'Collecte désactivée');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
      setDonationEnabled(!enabled);
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
        <Card>
          <CardHeader>
            <CardTitle>Tarification des gestes</CardTitle>
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
            <Button onClick={handleSavePrices} disabled={updateSetting.isPending}>
              {updateSetting.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Enregistrer les prix
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collecte de dons</CardTitle>
            <CardDescription>
              Activez ou désactivez la collecte de dons pour les obsèques sur toute la plateforme
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Collecte activée</p>
                <p className="text-sm text-muted-foreground">
                  {donationEnabled
                    ? 'Les utilisateurs peuvent faire des dons'
                    : 'La collecte est désactivée'}
                </p>
              </div>
              <Switch
                checked={donationEnabled}
                onCheckedChange={handleToggleDonation}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
