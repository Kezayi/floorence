-- Drop the OTP cleanup function
DROP FUNCTION IF EXISTS public.cleanup_expired_otp_codes();

-- Drop the otp_codes table
DROP TABLE IF EXISTS public.otp_codes;