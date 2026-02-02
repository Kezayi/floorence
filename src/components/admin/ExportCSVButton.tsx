import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { exportToCSV } from '@/lib/csvExport';
import { toast } from 'sonner';

interface ExportCSVButtonProps<T> {
  fetchData: () => Promise<T[]>;
  columns: { key: keyof T; label: string }[];
  filename: string;
  label?: string;
}

const ExportCSVButton = <T,>({
  fetchData,
  columns,
  filename,
  label = 'Exporter CSV',
}: ExportCSVButtonProps<T>) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchData();
      if (data.length === 0) {
        toast.info('Aucune donnée à exporter');
        return;
      }
      exportToCSV(data, columns, filename);
      toast.success(`${data.length} entrées exportées`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      {label}
    </Button>
  );
};

export default ExportCSVButton;
