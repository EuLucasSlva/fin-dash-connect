import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { PluggyConnect } from "react-pluggy-connect";
import { supabase } from "@/integrations/supabase/client";

interface ConnectBankButtonProps {
  userId?: string;
}

const ConnectBankButton = ({ userId }: ConnectBankButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!userId) {
      toast.error("Usuário não autenticado");
      return;
    }

    try {
      setLoading(true);
      
      // Chamar edge function para criar connect token
      const { data, error } = await supabase.functions.invoke('create-connect-token');
      
      if (error) throw error;
      
      if (data?.accessToken) {
        setConnectToken(data.accessToken);
      } else {
        throw new Error("Token não recebido");
      }
    } catch (error: any) {
      console.error("Erro ao conectar:", error);
      toast.error(error.message || "Erro ao conectar banco");
      setLoading(false);
    }
  };

  const handleSuccess = async (itemData: any) => {
    console.log("Conexão bem-sucedida:", itemData);
    
    // Salvar conexão no banco de dados
    try {
      const { error } = await supabase
        .from('bank_connections')
        .insert({
          user_id: userId,
          pluggy_item_id: itemData.item.id,
          bank_name: itemData.item.connector.name,
          connector_name: itemData.item.connector.name,
          status: 'active'
        });

      if (error) throw error;

      toast.success("Conta bancária conectada com sucesso!");
      setConnectToken(null);
      setLoading(false);
      
      // Recarregar página para atualizar dados
      window.location.reload();
    } catch (error: any) {
      console.error("Erro ao salvar conexão:", error);
      toast.error("Erro ao salvar conexão bancária");
      setLoading(false);
    }
  };

  const handleError = (error: any) => {
    console.error("Erro no widget:", error);
    toast.error(error.message || "Erro ao conectar banco");
    setConnectToken(null);
    setLoading(false);
  };

  const handleClose = () => {
    setConnectToken(null);
    setLoading(false);
  };

  const handleOpen = () => {
    console.log("Widget Pluggy aberto");
  };

  return (
    <>
      <Button onClick={handleConnect} disabled={loading} size="lg" className="w-full md:w-auto">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Conectando...
          </>
        ) : (
          <>
            <LinkIcon className="mr-2 h-4 w-4" />
            Conectar Conta Bancária
          </>
        )}
      </Button>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          onSuccess={handleSuccess}
          onError={handleError}
          onClose={handleClose}
          onOpen={handleOpen}
          includeSandbox={true}
          updateItem={undefined}
          language="pt"
        />
      )}
    </>
  );
};

export default ConnectBankButton;
