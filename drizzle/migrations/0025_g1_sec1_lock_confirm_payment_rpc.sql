-- G1-SEC1: before = {=X, postgres=X, anon=X, authenticated=X, service_role=X}; SECURITY DEFINER; no app/edge caller.
REVOKE EXECUTE ON FUNCTION public.confirm_payment_and_publish(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment_and_publish(text, text) TO service_role;