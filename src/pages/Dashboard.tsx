import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // Import Link
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Loader2, ArrowRight } from "lucide-react"; // Import Loader2 e ArrowRight
import { toast } from "sonner";
import ConnectBankButton from "@/components/ConnectBankButton";
import ApiKeySection from "@/components/ApiKeySection";
import { SyncTransactionsButton } from "@/components/SyncTransactionsButton"; // Correção: remover .tsx
import useFinancialData from "@/hooks/useFinancialData";

// --- NOVOS COMPONENTES DE SEÇÃO ---
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import SpendingDistribution from "@/components/dashboard/SpendingDistribution";
import ConnectedAccounts from "@/components/dashboard/ConnectedAccounts";
import CreditCardAnalysis from "@/components/dashboard/CreditCardAnalysis";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import TopClientsSuppliers from "@/components/dashboard/TopClientsSuppliers";
import GoalsComparison from "@/components/dashboard/GoalsComparison";
import InsightsAlerts from "@/components/dashboard/InsightsAlerts";
import DataExport from "@/components/dashboard/DataExport";
import { Skeleton } from "@/components/ui/skeleton";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  // Utiliza o hook para buscar e processar os dados
  const {
    data: financialData,
    isLoading: isLoadingData,
    refetch: refetchFinancialData,
  } = useFinancialData(user?.id);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        setInitialLoading(false);
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
        if (!session) {
            setUser(null);
            navigate("/auth");
        } else if (session.user?.id !== user?.id) {
             setUser(session.user);
        }
    });

    return () => subscription.unsubscribe();
  }, [navigate, user?.id]);

  const handleRefresh = () => {
    refetchFinancialData();
    toast.success('Dashboard atualizado!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  // Indicador de carregamento inicial da sessão
  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Estrutura principal do Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            FinanceHub
          </h1>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* REMOVIDA A TAG <main> DUPLICADA DAQUI */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Título e Botão "Ver Detalhes" (corrigido para não duplicar) */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold">Dashboard Financeiro Inteligente</h2>
            <p className="text-muted-foreground">
              Visão geral das suas finanças, {user?.email}.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard/details">
              Ver Detalhes
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Indicador de Carregamento dos Dados */}
        {isLoadingData && (
          <>
            {/* Skeleton para Resumo Financeiro */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
             {/* Skeleton para Gráficos e Tabelas */}
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="lg:col-span-2 h-[400px] w-full" />
                <Skeleton className="h-[400px] w-full" />
             </div>
             {/* Adicione mais Skeletons conforme necessário */}
          </>
        )}

        {/* Renderiza as seções com os dados do hook */}
        {financialData && !isLoadingData && (
          <>
            {/* === SEÇÃO 1: RESUMO FINANCEIRO === */}
            <FinancialSummary stats={financialData.summary} />

             {/* === SEÇÃO 2: GRÁFICOS PRINCIPAIS === */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                 <CashFlowChart dailyCashFlow={financialData.cashFlow.daily} />
              </div>
              <SpendingDistribution categorySpending={financialData.spendingDistribution} />
            </div>

            {/* === SEÇÃO 3: CARTÃO E TOP CLIENTES/FORNECEDORES === */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <CreditCardAnalysis creditCardData={financialData.creditCardAnalysis} />
                 <TopClientsSuppliers clients={financialData.topClients} suppliers={financialData.topSuppliers} />
             </div>

             {/* === SEÇÃO 4: CONTAS CONECTADAS === */}
             <ConnectedAccounts connections={financialData.connections} userId={user?.id} onSyncSuccess={handleRefresh} />

            {/* === SEÇÃO 5: METAS E INSIGHTS === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GoalsComparison goals={financialData.goals} />
              <InsightsAlerts insights={financialData.insights} />
            </div>

             {/* === SEÇÃO 6: EXPORTAÇÃO E API === */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DataExport transactions={financialData.rawTransactions} />
                <ApiKeySection userId={user?.id} />
             </div>

             {/* Botões de Ação Globais */}
             <div className="flex gap-2 pt-4 border-t">
                {/* O SyncTransactionsButton principal agora está dentro de ConnectedAccounts */}
                <Button onClick={handleRefresh} variant="outline" size="sm">
                   Atualizar Dados do Dashboard
                </Button>
            </div>
          </>
        )}

         {/* Seção de conexão caso não haja dados e não esteja carregando */}
         {!isLoadingData && (!financialData || financialData.connections.length === 0) && (
             <Card>
                 <CardHeader>
                     <CardTitle>Conecte sua Primeira Conta</CardTitle>
                     <CardDescription>
                         Conecte sua conta do Nubank, Itaú ou Santander para começar a visualizar seus dados.
                     </CardDescription>
                 </CardHeader>
                 <CardContent className="flex flex-col sm:flex-row gap-4 items-start">
                     <ConnectBankButton userId={user?.id} onSuccess={handleRefresh} />
                 </CardContent>
             </Card>
         )}

      </main> {/* Fim da tag <main> correta */}
    </div>
  );
};

export default Dashboard;