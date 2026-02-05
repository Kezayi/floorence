import { useState, useEffect } from 'react';
import { useSystemSettings, useUpdateSetting } from '@/hooks/useSystemSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, ExternalLink, Info } from 'lucide-react';

const Settings = () => {
  const { data: settings, isLoading } = useSystemSettings();
  const updateSetting = useUpdateSetting();

  // Contribution link
  const [contributionUrl, setContributionUrl] = useState('');
  const [contributionEnabled, setContributionEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setContributionUrl(settings.contribution_link_template.url);
      setContributionEnabled(settings.contribution_link_template.enabled);
    }
  }, [settings]);

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
        {/* Beta Mode Notice */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Mode Bêta
            </CardTitle>
            <CardDescription>
              Floorence est actuellement en phase de bêta-test. Toutes les fonctionnalités sont gratuites.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>✓ Création de mémoriaux :</strong> Gratuit
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>✓ Hommages et gestes :</strong> Gratuit
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                Les tarifs seront activés après la phase de bêta.
              </p>
            </div>
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
