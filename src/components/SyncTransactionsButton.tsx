import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SyncTransactionsButtonProps {
  userId?: string;
  onSuccess?: () => void;
}

export function SyncTransactionsButton({ userId, onSuccess }: SyncTransactionsButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    if (!userId) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLoading(true);
    console.log("🔄 Iniciando sincronização manual...");

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Sessão não encontrada");
      }

      const { data, error } = await supabase.functions.invoke('sync-transactions', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      console.log("✅ Sincronização concluída:", data);
      
      if (data.success) {
        toast.success(`${data.transactions} transações sincronizadas!`);
        
        // Chamar callback de sucesso
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
          }, 1500);
        }
      } else {
        toast.error(data.message || "Erro na sincronização");
      }
    } catch (error: any) {
      console.error("❌ Erro ao sincronizar:", error);
      toast.error(error.message || "Erro ao sincronizar transações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Sincronizando...' : 'Sincronizar Transações'}
    </Button>
  );
}
