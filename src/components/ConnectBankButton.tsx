import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface ConnectBankButtonProps {
  userId?: string;
}

const ConnectBankButton = ({ userId }: ConnectBankButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    if (!userId) {
      toast.error("Usuário não autenticado");
      return;
    }

    setLoading(true);
    toast.info("Conectando com Pluggy...");
    
    // TODO: Implementar widget Pluggy
    setTimeout(() => {
      setLoading(false);
      toast.success("Widget Pluggy será implementado em breve!");
    }, 1500);
  };

  return (
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
  );
};

export default ConnectBankButton;
