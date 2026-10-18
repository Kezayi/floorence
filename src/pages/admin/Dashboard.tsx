import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardSkeleton } from '@/components/admin/AdminSkeletons';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import TabVerite from '@/components/admin/dashboard/TabVerite';
import TabClassement from '@/components/admin/dashboard/TabClassement';
import BusinessCockpit from '@/components/admin/dashboard/BusinessCockpit';
import { useAdminRole } from '@/hooks/useAdminRole';
import TabImpact from '@/components/admin/dashboard/TabImpact';

const Dashboard = () => {
  const { data: dashStats, isLoading: dashLoading, error: dashError, refetch: refetchDash } = useDashboardStats();
  const { isAdmin } = useAdminRole();

  if (dashLoading) return <DashboardSkeleton />;

  if (dashError) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-8">Tableau de bord</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Erreur de chargement</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-2">
              Impossible de charger les statistiques du tableau de bord.
            </p>
            <code className="text-xs bg-muted px-3 py-1.5 rounded text-destructive mb-6 max-w-lg break-all">
              {dashError.message}
            </code>
            <Button variant="outline" onClick={() => refetchDash()} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabCls = 'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-champagne text-xs sm:text-sm';
  return (
    <div className="max-w-6xl">
      <header className="mb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">Ce qui demande une décision, puis l'état de l'activité.</p>
      </header>

      {dashStats && <BusinessCockpit stats={dashStats} isAdmin={isAdmin} />}

      <section aria-label="Analyses approfondies">
        <h2 className="font-serif text-xl text-foreground mb-3 pb-1 border-b border-champagne/30">Analyses approfondies</h2>
        <Tabs defaultValue="verite" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-11 mb-4 bg-ivory border border-champagne/30 p-1">
            <TabsTrigger value="verite" className={tabCls}>Vérité</TabsTrigger>
            <TabsTrigger value="classement" className={tabCls}>Classement</TabsTrigger>
            <TabsTrigger value="impact" className={tabCls}>Impact</TabsTrigger>
          </TabsList>
          <TabsContent value="verite">{dashStats && <TabVerite stats={dashStats} />}</TabsContent>
          <TabsContent value="classement"><TabClassement /></TabsContent>
          <TabsContent value="impact">{dashStats && <TabImpact stats={dashStats} />}</TabsContent>
        </Tabs>
      </section>
    </div>
  );
};

export default Dashboard;
