export type ReceiptData = {
  reference: string;
  amount: number;
  date: string | Date;
  deceased?: string | null;
  typeLabel?: string | null;
  operator?: string | null;
};

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Opens a printable A4 receipt (save as PDF from the print dialog). Successful payments only. */
export function openPaymentReceipt(r: ReceiptData) {
  const date = new Date(r.date).toLocaleString("fr-FR", { timeZone: "Africa/Libreville", dateStyle: "long", timeStyle: "short" });
  const rows: [string, string][] = [
    ["Référence", r.reference],
    ["Date (Libreville)", date],
    ...(r.deceased ? [["En mémoire de", r.deceased] as [string, string]] : []),
    ...(r.typeLabel ? [["Geste", r.typeLabel] as [string, string]] : []),
    ...(r.operator ? [["Opérateur", r.operator] as [string, string]] : []),
    ["Montant", `${r.amount.toLocaleString("fr-FR")} XAF`],
  ];
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${esc(r.reference)}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap" rel="stylesheet">
<style>@page{size:A4;margin:24mm}body{font-family:'Cormorant Garamond',Georgia,serif;color:#1a1a1a;max-width:150mm;margin:auto}
h1{font-weight:400;font-size:34px;text-align:center;letter-spacing:.08em;margin:0}.sub{text-align:center;color:#666;margin:6px 0 40px;font-size:16px}
.sep{text-align:center;color:#999;margin:28px 0;letter-spacing:.5em}table{width:100%;border-collapse:collapse;font-size:18px}
td{padding:10px 0;border-bottom:1px solid #e5e7eb}td:last-child{text-align:right;font-weight:600}
.foot{margin-top:48px;text-align:center;color:#666;font-size:14px}</style></head><body>
<h1>FLOORENCE</h1><p class="sub">Reçu de recueillement</p><div class="sep">✦ ✦ ✦</div>
<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<div class="sep">✦ ✦ ✦</div><p class="foot">Paiement confirmé par Mobile Money · floorence.org</p>
<script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(html); w.document.close();
  return true;
}
