import { useState, useEffect } from 'react';
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
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Adresse email invalide" }).max(255),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "Le code doit contenir 6 chiffres" }),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

const Auth = () => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, signInWithOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
    toast({
      title: "Code envoyé",
      description: `Un code de vérification a été envoyé à ${values.email}`,
    });
  };

  const handleOtpSubmit = async (values: OtpFormValues) => {
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
  };

  const handleResendCode = async () => {
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

                    <Button type="submit" className="w-full" disabled={isLoading}>
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
                    disabled={isLoading}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Renvoyer le code
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
