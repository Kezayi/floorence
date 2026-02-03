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
import { useToast } from '@/hooks/use-toast';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Adresse email invalide" }).max(255),
});

type EmailFormValues = z.infer<typeof emailSchema>;

const Auth = () => {
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testMagicLink, setTestMagicLink] = useState<string | null>(null);
  const { user, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/compte');
    }
  }, [user, navigate]);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const handleEmailSubmit = async (values: EmailFormValues) => {
    setIsLoading(true);
    setTestMagicLink(null);
    const { error, magicLink } = await sendMagicLink(values.email);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Une erreur est survenue lors de l'envoi du lien.",
      });
      return;
    }

    setEmail(values.email);
    setStep('sent');
    
    // If test mode, store the magic link for display
    if (magicLink) {
      setTestMagicLink(magicLink);
      toast({
        title: "Mode test activé",
        description: "Le lien de connexion est affiché ci-dessous (pas d'email envoyé)",
      });
    } else {
      toast({
        title: "Lien envoyé",
        description: `Un lien de connexion a été envoyé à ${values.email}`,
      });
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    const { error } = await sendMagicLink(email);
    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible de renvoyer le lien. Veuillez réessayer.",
      });
      return;
    }

    toast({
      title: "Lien renvoyé",
      description: `Un nouveau lien a été envoyé à ${email}`,
    });
  };

  const handleBack = () => {
    setStep('email');
    setEmail('');
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
                    Entrez votre email pour recevoir un lien de connexion
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
                        "Recevoir le lien"
                      )}
                    </Button>
                  </form>
                </Form>
              </>
            ) : (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="font-serif text-2xl md:text-3xl mb-2">Vérifiez votre email</h1>
                  <p className="text-muted-foreground text-sm">
                    Nous avons envoyé un lien de connexion à
                  </p>
                  <p className="text-foreground font-medium mt-1">{email}</p>
                </div>

                <div className="space-y-4">
                  {testMagicLink ? (
                    <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 text-sm">
                      <p className="font-semibold text-accent-foreground mb-2">
                        🧪 Mode Test Activé
                      </p>
                      <p className="text-muted-foreground mb-3">
                        Cliquez sur le bouton ci-dessous pour vous connecter directement :
                      </p>
                      <a
                        href={testMagicLink}
                        className="inline-block w-full bg-primary text-primary-foreground text-center py-3 px-4 rounded-md font-medium hover:bg-primary/90 transition-colors"
                      >
                        Se connecter maintenant
                      </a>
                    </div>
                  ) : (
                    <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                      <p className="mb-2">
                        <strong>Cliquez sur le lien dans l'email</strong> pour vous connecter.
                      </p>
                      <p>
                        Le lien expire dans 1 heure. Pensez à vérifier vos spams si vous ne le voyez pas.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button
                      variant="outline"
                      onClick={handleResend}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Renvoi en cours...
                        </>
                      ) : (
                        "Renvoyer le lien"
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="w-full text-muted-foreground"
                    >
                      Utiliser une autre adresse email
                    </Button>
                  </div>
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
