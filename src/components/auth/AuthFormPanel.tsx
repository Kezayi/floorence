import { forwardRef } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, CheckCircle2 } from 'lucide-react';

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
        className="flex flex-col justify-center items-center min-h-[50vh] lg:min-h-screen p-8 md:p-12 lg:p-16"
        style={{ backgroundColor: '#111111' }}
      >
        <div className="w-full max-w-sm space-y-8 animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          {step === 'email' ? (
            <>
              {/* Header */}
              <div className="text-center space-y-3">
                <h2 className="font-serif text-2xl md:text-3xl font-light" style={{ color: '#F5F0EB' }}>
                  Connexion
                </h2>
                <p className="text-sm font-sans" style={{ color: '#8A8680' }}>
                  Entrez votre email pour recevoir un lien d'accès sécurisé.
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
                        <FormLabel className="font-sans text-sm" style={{ color: '#B0ADA8' }}>
                          Adresse email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="votre@email.com"
                            autoComplete="email"
                            className="h-11 border-0 ring-1 ring-white/10 focus-visible:ring-candle-glow/40 placeholder:text-white/20"
                            style={{ backgroundColor: '#1A1A1A', color: '#F5F0EB' }}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-11 font-sans text-sm font-medium tracking-wide border transition-all duration-300"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'hsl(var(--candle-glow))',
                      borderColor: 'hsl(var(--candle-glow) / 0.4)',
                    }}
                    disabled={isLoading}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(var(--candle-glow) / 0.1)';
                      e.currentTarget.style.borderColor = 'hsl(var(--candle-glow) / 0.7)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = 'hsl(var(--candle-glow) / 0.4)';
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours…
                      </>
                    ) : (
                      "Recevoir mon lien d'accès"
                    )}
                  </Button>
                </form>
              </Form>

              {/* Footer */}
              <p className="text-center text-xs font-sans leading-relaxed" style={{ color: '#5A5854' }}>
                En vous connectant, vous entrez dans un espace
                <br />
                de recueillement privé et sécurisé.
              </p>
            </>
          ) : (
            <>
              {/* Sent confirmation */}
              <div className="text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: '#1A1A1A' }}>
                  <CheckCircle2 className="w-6 h-6" style={{ color: 'hsl(var(--candle-glow))' }} />
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-light" style={{ color: '#F5F0EB' }}>
                  Vérifiez votre email
                </h2>
                <p className="text-sm font-sans" style={{ color: '#8A8680' }}>
                  Nous avons envoyé un lien de connexion à
                </p>
                <p className="font-medium text-sm font-sans" style={{ color: '#F5F0EB' }}>{email}</p>
              </div>

              <div className="space-y-4">
                {testMagicLink ? (
                  <div className="rounded-lg p-4 text-sm" style={{ backgroundColor: '#1A1A1A', border: '1px solid hsl(var(--candle-glow) / 0.2)' }}>
                    <p className="font-semibold mb-2 font-sans" style={{ color: '#F5F0EB' }}>
                      🧪 Mode Test Activé
                    </p>
                    <p className="mb-3 font-sans" style={{ color: '#8A8680' }}>
                      Cliquez sur le bouton ci-dessous pour vous connecter directement :
                    </p>
                    <a
                      href={testMagicLink}
                      className="inline-block w-full text-center py-3 px-4 rounded-md font-medium font-sans transition-colors"
                      style={{
                        backgroundColor: 'hsl(var(--candle-glow) / 0.15)',
                        color: 'hsl(var(--candle-glow))',
                        border: '1px solid hsl(var(--candle-glow) / 0.3)',
                      }}
                    >
                      Se connecter maintenant
                    </a>
                  </div>
                ) : (
                  <div className="rounded-lg p-4 text-sm font-sans" style={{ backgroundColor: '#1A1A1A', color: '#8A8680' }}>
                    <p className="mb-2">
                      <strong style={{ color: '#F5F0EB' }}>Cliquez sur le lien dans l'email</strong> pour vous connecter.
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
                    className="w-full border-white/10 hover:border-white/20 hover:bg-white/5"
                    style={{ color: '#B0ADA8', backgroundColor: 'transparent' }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Renvoi en cours…
                      </>
                    ) : (
                      "Renvoyer le lien"
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={onBack}
                    className="w-full hover:bg-white/5"
                    style={{ color: '#5A5854' }}
                  >
                    Utiliser une autre adresse email
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <p className="text-center text-xs font-sans leading-relaxed" style={{ color: '#5A5854' }}>
                En vous connectant, vous entrez dans un espace
                <br />
                de recueillement privé et sécurisé.
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
