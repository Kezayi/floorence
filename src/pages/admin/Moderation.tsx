import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface GuestbookPost {
  id: string;
  author_name: string;
  content: string;
  relation_category: string;
  is_hidden: boolean;
  hidden_reason: string | null;
  created_at: string;
  memorial_id: string;
}

const Moderation = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPost, setSelectedPost] = useState<GuestbookPost | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [showHideDialog, setShowHideDialog] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['admin-guestbook-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guestbook_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as GuestbookPost[];
    },
  });

  const hideMutation = useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason: string }) => {
      const { error } = await supabase
        .from('guestbook_posts')
        .update({
          is_hidden: true,
          hidden_at: new Date().toISOString(),
          hidden_by: user?.id,
          hidden_reason: reason,
        })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts'] });
      toast.success('Message masqué');
      setShowHideDialog(false);
      setHideReason('');
      setSelectedPost(null);
    },
    onError: () => {
      toast.error('Erreur lors du masquage');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('guestbook_posts')
        .update({
          is_hidden: false,
          hidden_at: null,
          hidden_by: null,
          hidden_reason: null,
        })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-guestbook-posts'] });
      toast.success('Message restauré');
    },
    onError: () => {
      toast.error('Erreur lors de la restauration');
    },
  });

  const handleHide = (post: GuestbookPost) => {
    setSelectedPost(post);
    setShowHideDialog(true);
  };

  const confirmHide = () => {
    if (selectedPost && hideReason.trim()) {
      hideMutation.mutate({ postId: selectedPost.id, reason: hideReason });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Modération</h1>

      <div className="space-y-4">
        {posts?.map((post) => (
          <Card key={post.id} className={post.is_hidden ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{post.author_name}</CardTitle>
                  <Badge variant="secondary">{post.relation_category}</Badge>
                  {post.is_hidden && (
                    <Badge variant="destructive">Masqué</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(post.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground mb-4">{post.content}</p>

              {post.hidden_reason && (
                <p className="text-sm text-muted-foreground italic mb-4">
                  Raison du masquage : {post.hidden_reason}
                </p>
              )}

              <div className="flex gap-2">
                {post.is_hidden ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreMutation.mutate(post.id)}
                    disabled={restoreMutation.isPending}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurer
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleHide(post)}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Masquer
                  </Button>
                )}
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Voir le mémorial
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {posts?.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucun message à modérer.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showHideDialog} onOpenChange={setShowHideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masquer ce message</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Indiquez la raison du masquage (visible uniquement par les administrateurs) :
            </p>
            <Textarea
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              placeholder="Raison du masquage..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHideDialog(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmHide}
              disabled={!hideReason.trim() || hideMutation.isPending}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Moderation;
