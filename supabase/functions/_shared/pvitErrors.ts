// Official dictionary verified against https://docs.mypvit.pro/fr/errors/codes.
// This pure module is shared by edge functions and the browser; never return raw provider messages.
export const PVIT_ERRORS: Record<number, string> = {
  500: "Le service de paiement a rencontré une erreur interne. Réessayez plus tard.",
  1000: "La connexion de Floorence est refusée par PVit. L’administration doit vérifier les accès autorisés.",
  1001: "Les réglages de paiement ne correspondent pas au même environnement. L’administration doit les corriger.",
  1002: "PVit ne peut pas utiliser l’adresse de confirmation. L’administration doit vérifier sa configuration ou son activation.",
  1003: "PVit ne peut pas utiliser l’adresse de retour. L’administration doit vérifier sa configuration ou son activation.",
  1004: "PVit ne peut pas utiliser l’adresse de retour en cas d’échec. L’administration doit vérifier sa configuration ou son activation.",
  1005: "Votre compte Mobile Money n’a pas de PIN configuré. Configurez-le auprès de votre opérateur avant de payer.",
  1006: "PVit ne peut pas utiliser le type de paiement. L’administration doit vérifier sa configuration ou son activation.",
  1007: "PVit ne peut pas utiliser l’opérateur. L’administration doit vérifier sa configuration ou son activation.",
  1008: "PVit ne peut pas utiliser un élément obligatoire de la connexion. L’administration doit vérifier sa configuration ou son activation.",
  1009: "Ce numéro de téléphone est invalide. Vérifiez votre numéro Airtel Money ou Moov Money.",
  1010: "PVit ne peut pas utiliser le contenu de la demande. L’administration doit vérifier sa configuration ou son activation.",
  1011: "PVit ne peut pas utiliser l’adresse de réception de l’autorisation. L’administration doit vérifier sa configuration ou son activation.",
  1012: "PVit ne peut pas utiliser un paramètre obligatoire. L’administration doit vérifier sa configuration ou son activation.",
  2000: "Le compte marchand Floorence auprès de cet opérateur a un solde insuffisant. Ce n’est pas le solde de votre compte personnel. L’administration doit régulariser ce compte avant un nouvel essai.",
  2001: "Le plafond du compte marchand Floorence est atteint. L’administration doit régulariser ce compte.",
  3000: "PVit ne peut pas utiliser le marchand Floorence. L’administration doit vérifier sa configuration ou son activation.",
  3001: "PVit ne peut pas utiliser le compte marchand. L’administration doit vérifier sa configuration ou son activation.",
  3002: "PVit ne peut pas utiliser ce type de paiement pour le compte marchand. L’administration doit vérifier sa configuration ou son activation.",
  3003: "PVit ne peut pas utiliser ce type de paiement pour le compte marchand. L’administration doit vérifier sa configuration ou son activation.",
  3004: "PVit ne peut pas utiliser le service. L’administration doit vérifier sa configuration ou son activation.",
  3005: "PVit ne peut pas utiliser ce type de paiement. L’administration doit vérifier sa configuration ou son activation.",
  3006: "PVit ne peut pas utiliser cet opérateur. L’administration doit vérifier sa configuration ou son activation.",
  3007: "PVit ne peut pas utiliser le service pour cet opérateur. L’administration doit vérifier sa configuration ou son activation.",
  3008: "PVit ne peut pas utiliser le service pour cet opérateur. L’administration doit vérifier sa configuration ou son activation.",
  3009: "PVit ne peut pas utiliser ce type de paiement pour cet opérateur. L’administration doit vérifier sa configuration ou son activation.",
  3010: "PVit ne peut pas utiliser ce type de paiement pour cet opérateur. L’administration doit vérifier sa configuration ou son activation.",
  3011: "PVit ne peut pas utiliser l’adresse de confirmation. L’administration doit vérifier sa configuration ou son activation.",
  3012: "PVit ne peut pas utiliser l’adresse de retour. L’administration doit vérifier sa configuration ou son activation.",
  3013: "PVit ne peut pas utiliser l’adresse de retour en cas d’échec. L’administration doit vérifier sa configuration ou son activation.",
  3014: "Votre compte Mobile Money est bloqué. Contactez votre opérateur.",
  3015: "PVit ne peut pas utiliser le compte de reversement. L’administration doit vérifier sa configuration ou son activation.",
  3016: "PVit refuse l’accès au service de paiement. L’administration doit vérifier les autorisations.",
  3017: "Le compte marchand ne correspond pas à l’opérateur de votre numéro. L’administration doit vérifier le routage Airtel/Moov.",
  3018: "Le montant est inférieur au minimum accepté par l’opérateur. Augmentez le montant du paiement.",
  3019: "Le montant dépasse le plafond accepté par l’opérateur. Répartissez votre achat en plusieurs paiements.",
  3020: "PVit ne peut pas utiliser ce service pour le compte marchand. L’administration doit vérifier sa configuration ou son activation.",
  3021: "PVit ne peut pas utiliser l’adresse de réception de l’autorisation. L’administration doit vérifier sa configuration ou son activation.",
  3022: "Votre compte Mobile Money n’a pas de PIN configuré. Configurez-le auprès de votre opérateur avant de payer.",
  3023: "Ce numéro n’est pas reconnu comme compte Mobile Money. Vérifiez votre numéro et son activation auprès de l’opérateur.",
  3100: "L’authentification de Floorence auprès de PVit a échoué. L’administration doit vérifier la connexion de paiement.",
  4000: "PVit ne peut pas utiliser l’adresse du service. L’administration doit vérifier sa configuration ou son activation.",
  4001: "PVit ne peut pas utiliser le marchand Floorence. L’administration doit vérifier sa configuration ou son activation.",
  4002: "PVit ne peut pas utiliser le compte marchand. L’administration doit vérifier sa configuration ou son activation.",
  4003: "PVit ne peut pas utiliser le service. L’administration doit vérifier sa configuration ou son activation.",
  4004: "PVit ne peut pas utiliser le type de paiement. L’administration doit vérifier sa configuration ou son activation.",
  4005: "PVit ne peut pas utiliser l’opérateur. L’administration doit vérifier sa configuration ou son activation.",
  4006: "PVit ne retrouve pas ce paiement. Conservez sa référence et faites vérifier son état avant toute nouvelle tentative.",
  4007: "Ce numéro n’est pas reconnu comme compte Mobile Money. Vérifiez son activation auprès de votre opérateur.",
  4008: "PVit ne peut pas utiliser le compte de reversement. L’administration doit vérifier sa configuration ou son activation.",
  4009: "PVit ne peut pas utiliser le compte de reversement. L’administration doit vérifier sa configuration ou son activation.",
  5000: "Cette référence de paiement existe déjà. Vérifiez le paiement existant avant toute nouvelle demande.",
  5001: "L’opérateur ne peut pas déterminer le résultat du paiement. La vérification continue ; ne relancez pas de paiement.",
  5002: "Ce lien de paiement a déjà été utilisé. Consultez le résultat du paiement existant.",
  5003: "PVit ne peut pas utiliser le type de paiement. L’administration doit vérifier sa configuration ou son activation.",
  5400: "La période du rapport est invalide. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5401: "La période du rapport est trop longue. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5402: "Le format du rapport est invalide. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5403: "Un filtre du rapport est invalide. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5404: "Le tri demandé n’est pas disponible. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5405: "L’adresse de notification du rapport est refusée. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5406: "Trop de rapports sont déjà en cours. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5407: "Le rapport contient trop de lignes. Réduisez la période ou les filtres. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5408: "Ce rapport est introuvable. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5409: "Le rapport n’est pas encore prêt. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5410: "Ce rapport a expiré. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5411: "Le rapport n’a pas pu être généré. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5412: "Le compte marchand du rapport est introuvable. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5413: "La notification du rapport ne peut pas être authentifiée. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5414: "Le stockage du rapport est temporairement indisponible. Vérifiez les réglages du rapport ou réessayez plus tard.",
  5417: "Le téléchargement du rapport est temporairement indisponible. Vérifiez les réglages du rapport ou réessayez plus tard.",
  6000: "La demande de paiement a expiré. Vérifiez son état et votre historique Mobile Money avant une nouvelle tentative.",
  7000: "Le format de la demande de paiement n’est pas accepté. L’administration doit corriger l’envoi.",
  8000: "Certaines données de la demande de paiement ne sont pas acceptées par PVit. L’administration doit vérifier la demande.",
  9000: "Aucun tarif de frais n’est disponible pour ce montant. L’administration doit vérifier les frais auprès de PVit.",
  9001: "Cette opération n’est pas prise en charge pour votre opérateur. Contactez l’administration de Floorence.",
  9002: "Le tarif des frais n’est pas actif. L’administration doit le faire activer auprès de PVit.",
  10000: "PVit est en maintenance. Réessayez plus tard ; ne relancez pas un paiement déjà en attente.",
  10001: "Le service de paiement est temporairement indisponible. Réessayez plus tard ; vérifiez d’abord tout paiement en attente.",
  10008: "PVit n’a pas pu transmettre l’autorisation de connexion. Réessayez plus tard.",
  // Observed in production; not yet listed in the official dictionary.
  3024: "Ce numéro n’est pas valide pour l’opérateur sélectionné. Vérifiez votre numéro Airtel Money ou Moov Money.",
};

export type PaymentIssue = { code: string; message: string };
export function parsePaymentPayload(input: unknown): Record<string, unknown> {
  if (typeof input === "string") { try { return parsePaymentPayload(JSON.parse(input)); } catch { return {}; } }
  return input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : {};
}
export function pvitIssue(input: unknown, httpStatus?: number): PaymentIssue {
  const payload = parsePaymentPayload(input);
  const candidate = payload.status_code ?? payload.code;
  const numeric = typeof candidate === "number" || (typeof candidate === "string" && /^\d+$/.test(candidate)) ? Number(candidate) : NaN;
  if (Number.isFinite(numeric) && numeric !== 200) return {
    code: String(numeric),
    message: PVIT_ERRORS[numeric] ?? "Le service de paiement a refusé la demande sans cause connue de Floorence. Conservez la référence et faites vérifier le paiement avant de recommencer.",
  };
  const state = String(payload.status ?? "").toUpperCase();
  if (state === "CANCELLED") return { code: state, message: "La demande de paiement a été annulée. Vérifiez votre historique Mobile Money avant une nouvelle tentative." };
  if (state === "EXPIRED") return { code: state, message: PVIT_ERRORS[6000] };
  if (state === "AMBIGUOUS") return { code: state, message: PVIT_ERRORS[5001] };
  if (state === "FAILED" || state === "REJECTED" || state === "FAILURE") return { code: state, message: "L’opérateur a refusé le paiement sans préciser la raison. Vérifiez votre compte Mobile Money et conservez la référence pour une vérification." };
  return { code: httpStatus ? `HTTP_${httpStatus}` : "UNKNOWN", message: "La connexion au service de paiement n’a pas abouti. Le résultat est inconnu : vérifiez le paiement existant avant toute nouvelle demande." };
}
export function paymentIssueText(issue: PaymentIssue, reference?: string): string {
  return `${issue.message} (Code ${issue.code}${reference ? ` · Référence ${reference}` : ""})`;
}
