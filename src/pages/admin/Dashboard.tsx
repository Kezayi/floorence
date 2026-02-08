import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DashboardSkeleton } from '@/components/admin/AdminSkeletons';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePendingSuggestionsCount } from '@/hooks/usePendingSuggestionsCount';
import TabVerite from '@/components/admin/dashboard/TabVerite';
import TabClassement from '@/components/admin/dashboard/TabClassement';
import TabBusiness from '@/components/admin/dashboard/TabBusiness';
import TabImpact from '@/components/admin/dashboard/TabImpact';

const Dashboard = () => {
  const { data: dashStats, isLoading: dashLoading, error: dashError, refetch: refetchDash } = useDashboardStats();
  const pendingCount = usePendingSuggestionsCount();

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

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-6">Tableau de bord</h1>

      <Tabs defaultValue="verite" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-12 mb-6 bg-muted/60 p-1">
          <TabsTrigger
            value="verite"
            className="relative data-[state=active]:bg-[hsl(240,60%,55%)] data-[state=active]:text-white data-[state=active]:shadow-md hover:text-[hsl(240,60%,55%)] transition-all text-xs sm:text-sm font-medium"
          >
            Vérité
            {(pendingCount ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[hsl(25,95%,55%)] text-white text-[10px] font-bold flex items-center justify-center px-1">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="classement"
            className="data-[state=active]:bg-[hsl(142,70%,45%)] data-[state=active]:text-white data-[state=active]:shadow-md hover:text-[hsl(142,70%,45%)] transition-all text-xs sm:text-sm font-medium"
          >
            Classement
          </TabsTrigger>
          <TabsTrigger
            value="business"
            className="data-[state=active]:bg-[hsl(45,90%,45%)] data-[state=active]:text-white data-[state=active]:shadow-md hover:text-[hsl(45,90%,45%)] transition-all text-xs sm:text-sm font-medium"
          >
            Business
          </TabsTrigger>
          <TabsTrigger
            value="impact"
            className="data-[state=active]:bg-[hsl(280,60%,55%)] data-[state=active]:text-white data-[state=active]:shadow-md hover:text-[hsl(280,60%,55%)] transition-all text-xs sm:text-sm font-medium"
          >
            Impact
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verite">
          {dashStats && <TabVerite stats={dashStats} />}
        </TabsContent>

        <TabsContent value="classement">
          <TabClassement />
        </TabsContent>

        <TabsContent value="business">
          {dashStats && <TabBusiness stats={dashStats} />}
        </TabsContent>

        <TabsContent value="impact">
          {dashStats && <TabImpact stats={dashStats} />}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
