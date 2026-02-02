import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, Loader2, Clock } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Adresse email invalide" }).max(255),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "Le code doit contenir 6 chiffres" }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

const RESEND_COOLDOWN = 60; // seconds
const OTP_EXPIRATION = 300; // 5 minutes in seconds

const Auth = () => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiration, setOtpExpiration] = useState(0);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const expirationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user, signInWithOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
      if (expirationIntervalRef.current) clearInterval(expirationIntervalRef.current);
    };
  }, []);

  // Start resend cooldown timer
  const startResendCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN);
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start OTP expiration timer
  const startExpirationTimer = useCallback(() => {
    setOtpExpiration(OTP_EXPIRATION);
    if (expirationIntervalRef.current) clearInterval(expirationIntervalRef.current);
    expirationIntervalRef.current = setInterval(() => {
      setOtpExpiration((prev) => {
        if (prev <= 1) {
          if (expirationIntervalRef.current) clearInterval(expirationIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const handleEmailSubmit = async (values: EmailFormValues) => {
    setIsLoading(true);
    const { error } = await signInWithOtp(values.email);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'envoi du code.",
      });
      return;
    }

    setEmail(values.email);
    setStep('otp');
    startResendCooldown();
    startExpirationTimer();
    toast({
      title: "Code envoyé",
      description: `Un code de vérification a été envoyé à ${values.email}`,
    });
  };

  const handleOtpSubmit = async (values: OtpFormValues) => {
    if (otpExpiration === 0) {
      toast({
        variant: "destructive",
        title: "Code expiré",
        description: "Votre code a expiré. Veuillez demander un nouveau code.",
      });
      return;
    }

    setIsLoading(true);
    const { error } = await verifyOtp(email, values.otp);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: "Le code saisi est incorrect ou a expiré. Veuillez réessayer.",
      });
      return;
    }

    toast({
      title: "Connexion réussie",
      description: "Vous êtes maintenant connecté.",
    });
    navigate('/');
  };

  const handleBack = () => {
    setStep('email');
    otpForm.reset();
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    if (expirationIntervalRef.current) clearInterval(expirationIntervalRef.current);
    setResendCooldown(0);
    setOtpExpiration(0);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    const { error } = await signInWithOtp(email);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de renvoyer le code. Veuillez réessayer.",
      });
      return;
    }

    startResendCooldown();
    startExpirationTimer();
    otpForm.reset();
    toast({
      title: "Code renvoyé",
      description: `Un nouveau code a été envoyé à ${email}`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 md:pt-28 pb-24 md:pb-12">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-card border border-border rounded-lg p-8">
            {step === 'email' ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="font-serif text-2xl md:text-3xl mb-2">Connexion</h1>
                  <p className="text-muted-foreground text-sm">
                    Entrez votre email pour recevoir un code de vérification
                  </p>
                </div>

                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adresse email</FormLabel>
                          <FormControl>
                            <Input 
                              type="email" 
                              placeholder="votre@email.com" 
                              autoComplete="email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        "Recevoir le code"
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <button
                    onClick={handleBack}
                    className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="font-serif text-2xl md:text-3xl mb-2">Vérification</h1>
                  <p className="text-muted-foreground text-sm">
                    Entrez le code à 6 chiffres envoyé à
                  </p>
                  <p className="text-foreground font-medium mt-1">{email}</p>
                  
                  {/* Expiration timer */}
                  {otpExpiration > 0 ? (
                    <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className={otpExpiration <= 60 ? "text-destructive font-medium" : "text-muted-foreground"}>
                        Code expire dans {formatTime(otpExpiration)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-destructive font-medium">
                      Code expiré - Veuillez demander un nouveau code
                    </p>
                  )}
                </div>

                <Form {...otpForm}>
                  <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-6">
                    <FormField
                      control={otpForm.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
                          <FormControl>
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={field.onChange}
                              disabled={otpExpiration === 0}
                            >
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading || otpExpiration === 0}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Vérification...
                        </>
                      ) : (
                        "Vérifier"
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 text-center">
                  <button
                    onClick={handleResendCode}
                    disabled={isLoading || resendCooldown > 0}
                    className={`text-sm transition-colors ${
                      resendCooldown > 0 
                        ? "text-muted-foreground/50 cursor-not-allowed" 
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {resendCooldown > 0 
                      ? `Renvoyer le code (${resendCooldown}s)` 
                      : "Renvoyer le code"
                    }
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
