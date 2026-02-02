-- Table pour stocker les codes OTP custom
CREATE TABLE public.otp_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour recherche rapide par email
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email);

-- Index pour nettoyage des codes expirés
CREATE INDEX idx_otp_codes_expires_at ON public.otp_codes(expires_at);

-- Fonction pour nettoyer les anciens codes OTP (à appeler périodiquement)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_codes 
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;

-- RLS: Personne ne peut accéder directement à cette table (uniquement via service_role)
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Politique restrictive: aucun accès direct
CREATE POLICY "No direct access to OTP codes"
ON public.otp_codes
FOR ALL
USING (false)
WITH CHECK (false);