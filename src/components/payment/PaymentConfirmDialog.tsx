// Shared pre-debit confirmation: amount, purpose and operator are shown before any PVit request.
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { paymentOperatorLabel, paymentPhone } from "@/lib/paymentPhone";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: string;
  amount: number;
  phone: string;
  onConfirm: () => void;
}

const PaymentConfirmDialog = ({ open, onOpenChange, purpose, amount, phone, onConfirm }: Props) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="font-serif">Vérifiez avant de payer</AlertDialogTitle>
        <AlertDialogDescription>Aucun débit n'est demandé avant votre confirmation.</AlertDialogDescription>
      </AlertDialogHeader>
      <dl className="space-y-2 text-sm font-sans" aria-label="Détail du paiement">
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Objet</dt><dd className="text-right font-medium">{purpose}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Opérateur</dt><dd className="text-right font-medium">{paymentOperatorLabel(phone) ?? "—"}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Numéro débité</dt><dd className="text-right font-medium">{paymentPhone(phone) ?? "—"}</dd></div>
        <div className="flex justify-between gap-4 border-t border-border pt-2"><dt className="font-medium">Montant</dt><dd className="text-right font-serif text-lg font-bold">{amount.toLocaleString("fr-FR")} XAF</dd></div>
      </dl>
      <p className="text-xs text-muted-foreground">Saisissez votre PIN uniquement sur votre téléphone, si votre opérateur vous le demande.</p>
      <AlertDialogFooter>
        <AlertDialogCancel>Modifier</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>Confirmer le paiement</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default PaymentConfirmDialog;
