import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import AuthVisionPanel from '@/components/auth/AuthVisionPanel';
import AuthFormPanel from '@/components/auth/AuthFormPanel';

const Auth = () => {
  const [step, setStep] = useState<'email' | 'sent'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testMagicLink, setTestMagicLink] = useState<string | null>(null);
  const { user, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) navigate('/compte');
  }, [user, navigate]);

  const handleScrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleEmailSubmit = async (values: { email: string }) => {
    setIsLoading(true);
    setTestMagicLink(null);
    const { error, magicLink } = await sendMagicLink(values.email);
    setIsLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: error.message || "Une erreur est survenue lors de l'envoi du lien." });
      return;
    }

    setEmail(values.email);
    setStep('sent');

    if (magicLink) {
      setTestMagicLink(magicLink);
      toast({ title: "Mode test activé", description: "Le lien de connexion est affiché ci-dessous (pas d'email envoyé)" });
    } else {
      toast({ title: "Lien envoyé", description: `Un lien de connexion a été envoyé à ${values.email}` });
    }
  };

  const handleResend = async () => {
    setIsLoading(true);
    const { error } = await sendMagicLink(email);
    setIsLoading(false);

    if (error) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de renvoyer le lien. Veuillez réessayer." });
      return;
    }

    toast({ title: "Lien renvoyé", description: `Un nouveau lien a été envoyé à ${email}` });
  };

  const handleBack = () => {
    setStep('email');
    setEmail('');
    setTestMagicLink(null);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left: Vision — 60% on desktop */}
      <div className="lg:w-[60%] lg:sticky lg:top-0 lg:h-screen">
        <AuthVisionPanel onScrollToForm={handleScrollToForm} />
      </div>

      {/* Right: Form — 40% on desktop */}
      <div className="lg:w-[40%]">
        <AuthFormPanel
          ref={formRef}
          step={step}
          email={email}
          isLoading={isLoading}
          testMagicLink={testMagicLink}
          onEmailSubmit={handleEmailSubmit}
          onResend={handleResend}
          onBack={handleBack}
        />
      </div>
    </div>
  );
};

export default Auth;
