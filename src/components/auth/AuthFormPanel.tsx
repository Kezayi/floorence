import { forwardRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Adresse email invalide" }).max(255),
});

type EmailFormValues = z.infer<typeof emailSchema>;

interface AuthFormPanelProps {
  step: 'email' | 'sent';
  email: string;
  isLoading: boolean;
  testMagicLink: string | null;
  onEmailSubmit: (values: EmailFormValues) => void;
  onResend: () => void;
  onBack: () => void;
}

const AuthFormPanel = forwardRef<HTMLDivElement, AuthFormPanelProps>(
  ({ step, email, isLoading, testMagicLink, onEmailSubmit, onResend, onBack }, ref) => {
    const emailForm = useForm<EmailFormValues>({
      resolver: zodResolver(emailSchema),
      defaultValues: { email: '' },
    });

    return (
      <div
        ref={ref}
        className="flex flex-col justify-center items-center bg-background min-h-[50vh] lg:min-h-screen p-8 md:p-12 lg:p-16"
      >
        <div className="w-full max-w-sm space-y-8 animate-fade-in">
          {step === 'email' ? (
            <>
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Mail className="w-6 h-6 text-foreground" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-foreground">
                  Connexion
                </h2>
                <p className="text-muted-foreground text-sm font-sans">
                  Entrez votre email pour recevoir un lien de connexion
                </p>
              </div>

              {/* Form */}
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Adresse email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="votre@email.com"
                            autoComplete="email"
                            className="h-11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
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

              {/* Beta mention */}
              <p className="text-center text-xs text-muted-foreground/60 font-sans">
                Accès réservé aux ambassadeurs de la phase Bêta.
              </p>
            </>
          ) : (
            <>
              {/* Sent confirmation */}
              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-foreground" />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-foreground">
                  Vérifiez votre email
                </h2>
                <p className="text-muted-foreground text-sm font-sans">
                  Nous avons envoyé un lien de connexion à
                </p>
                <p className="text-foreground font-medium text-sm font-sans">{email}</p>
              </div>

              <div className="space-y-4">
                {testMagicLink ? (
                  <div className="bg-accent/30 border border-candle-glow/20 rounded-lg p-4 text-sm">
                    <p className="font-semibold text-foreground mb-2 font-sans">
                      🧪 Mode Test Activé
                    </p>
                    <p className="text-muted-foreground mb-3 font-sans">
                      Cliquez sur le bouton ci-dessous pour vous connecter directement :
                    </p>
                    <a
                      href={testMagicLink}
                      className="inline-block w-full bg-primary text-primary-foreground text-center py-3 px-4 rounded-md font-medium font-sans hover:bg-primary/90 transition-colors"
                    >
                      Se connecter maintenant
                    </a>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground font-sans">
                    <p className="mb-2">
                      <strong className="text-foreground">Cliquez sur le lien dans l'email</strong> pour vous connecter.
                    </p>
                    <p>
                      Le lien expire dans 1 heure. Pensez à vérifier vos spams si vous ne le voyez pas.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    onClick={onResend}
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
                    onClick={onBack}
                    className="w-full text-muted-foreground"
                  >
                    Utiliser une autre adresse email
                  </Button>
                </div>
              </div>

              {/* Beta mention */}
              <p className="text-center text-xs text-muted-foreground/60 font-sans">
                Accès réservé aux ambassadeurs de la phase Bêta.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }
);

AuthFormPanel.displayName = 'AuthFormPanel';

export default AuthFormPanel;
