import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button"; // Import buttonVariants
import { RefreshCw, Trash2, Loader2 } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SyncTransactionsButton } from "@/components/SyncTransactionsButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Importar AlertDialog

type Connection = Database['public']['Tables']['bank_connections']['Row'];

interface ConnectedAccountsProps {
  connections: Connection[];
  userId?: string;
  onSyncSuccess: () => void; // Callback para quando uma ação (sync ou disconnect) for bem sucedida e precisar atualizar o dashboard
}

const ConnectedAccounts = ({ connections, userId, onSyncSuccess }: ConnectedAccountsProps) => {
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null); // Estado para loading do disconnect

  // --- Função para desconectar ---
  const handleDisconnect = async (connectionId: string) => {
    if (!userId) {
      toast.error("Usuário não autenticado.");
      return;
    }
    setDisconnectingId(connectionId); // Inicia loading para este item

    try {
        console.log(`Attempting to disconnect connection ID: ${connectionId}`); // Log para debug
        const { error } = await supabase.functions.invoke('disconnect-bank', {
            body: { bank_connection_id: connectionId },
        });

        if (error) {
            console.error("Supabase function error:", error);
            throw error;
        }

        toast.success("Conta desconectada com sucesso!");
        onSyncSuccess(); // Chama o callback para atualizar a lista e o dashboard
    } catch (error: any) {
        console.error("Erro ao desconectar:", error);
        toast.error(`Erro ao desconectar conta: ${error.message || 'Erro desconhecido'}`);
    } finally {
        setDisconnectingId(null); // Termina loading
    }
  };


  const getStatusVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => {
     switch (status?.toLowerCase()) {
      case 'active':
        return 'default'; // Verde (padrão primário) ou um verde específico se definido no tema
      case 'syncing':
        return 'outline'; // Pode usar outline para indicar atividade
      case 'login_error':
         return 'destructive'; // Erro de login é crítico
      case 'outdated':
         return 'secondary'; // Desatualizado, não necessariamente erro
      case 'disconnected':
        return 'secondary'; // Desconectado não é um erro ativo
      case 'error':
        return 'destructive'; // Vermelho para erro genérico
      default:
        return 'secondary'; // Cinza para status desconhecido ou nulo
     }
  };

  const getStatusText = (status: string | null | undefined): string => {
      switch (status?.toLowerCase()) {
        case 'active': return 'Ativa';
        case 'syncing': return 'Sincronizando';
        case 'login_error': return 'Erro de Login';
        case 'outdated': return 'Desatualizada';
        case 'disconnected': return 'Desconectada';
        case 'error': return 'Erro';
        default: return status || 'Desconhecido';
      }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle>Contas Conectadas</CardTitle>
          <CardDescription>Gerencie suas conexões bancárias e sincronize dados</CardDescription>
        </div>
         {/* Botão para sincronizar todas as contas */}
         {connections && connections.length > 0 && userId && (
             <SyncTransactionsButton userId={userId} onSuccess={onSyncSuccess} />
         )}
      </CardHeader>
      <CardContent>
        {connections.length > 0 ? (
          <div className="overflow-x-auto"> {/* Garante rolagem horizontal em telas menores */}
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Banco</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Sinc.</TableHead>
                    <TableHead className="text-right pr-2">Ações</TableHead> {/* Coluna de Ações */}
                </TableRow>
                </TableHeader>
                <TableBody>
                {connections.map((conn) => (
                    <TableRow key={conn.id}>
                    <TableCell className="font-medium">{conn.bank_name || 'Nome Indisponível'}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(conn.status)}>
                        {getStatusText(conn.status)}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap"> {/* Evita quebra de linha */}
                        {conn.last_sync_at
                        ? `${formatDistanceToNow(new Date(conn.last_sync_at), { addSuffix: true, locale: ptBR })}`
                        : "Nunca"}
                    </TableCell>
                    <TableCell className="text-right">
                        {/* Botão Desconectar com Confirmação */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost" // Aparência mais sutil
                                    size="icon"     // Tamanho de ícone
                                    className="text-destructive hover:bg-destructive/10 h-8 w-8" // Estilo vermelho + tamanho
                                    disabled={disconnectingId === conn.id} // Desabilita enquanto desconecta este item
                                    aria-label={`Desconectar ${conn.bank_name}`} // Acessibilidade
                                >
                                    {disconnectingId === conn.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Desconexão</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tem certeza que deseja desconectar a conta "{conn.bank_name || 'esta conta'}"?
                                    Isso removerá a conexão com o banco na Pluggy e no FinanceHub. As transações já sincronizadas <span className="font-semibold">não</span> serão apagadas automaticamente, mas novas transações não serão buscadas.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                      e.preventDefault(); // Previne fechar o dialog imediatamente
                                      handleDisconnect(conn.id);
                                    }}
                                    className={buttonVariants({ variant: "destructive" })} // Usa buttonVariants para estilo
                                >
                                    Desconectar
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma conta conectada ainda. Clique em "Conectar Conta Bancária" para começar.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectedAccounts;