import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import useFinancialData from '@/hooks/useFinancialData';
import { Skeleton } from '@/components/ui/skeleton';

// --- IMPORTAR OS COMPONENTES DETALHADOS REAIS ---
import DetailedTransactionsTable from '@/components/dashboard/details/DetailedTransactionsTable';
import CategoryAnalysisChart from '@/components/dashboard/details/CategoryAnalysisChart';
import ClientSupplierList from '@/components/dashboard/details/ClientSupplierList';
import ComparativeReports from '@/components/dashboard/details/ComparativeReports';

const DetailedView = () => {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  // Reutiliza o hook para buscar os dados
  const { data: financialData, isLoading: isLoadingData } = useFinancialData(user?.id);

  useEffect(() => {
    // Verifica a sessão ao carregar a página
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        setInitialLoading(false);
      }
    };
    checkSession();

     // Listener para mudanças na autenticação
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

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho Simples com Botão Voltar */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur z-50">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Button variant="outline" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar para o Dashboard</span>
            </Link>
          </Button>
          <h1 className="text-xl font-semibold ml-4">Detalhes Financeiros</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Indicador de Carregamento */}
        {isLoadingData && (
          <div className="space-y-6">
            <Skeleton className="h-96 w-full" /> {/* Skeleton maior para tabela */}
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-64 w-full" />
            {/* Adicione mais skeletons se houver mais seções */}
          </div>
        )}

        {/* Conteúdo Detalhado */}
        {financialData && !isLoadingData && (
          <>
            {/* --- Seção de Extrato Detalhado --- */}
            <div id="extrato">
              {/* Renderiza a tabela detalhada de transações */}
              <DetailedTransactionsTable transactions={financialData.rawTransactions} />
            </div>

            {/* --- Seção de Análise de Categorias --- */}
            <div id="categorias">
               {/* Renderiza o gráfico de análise de categorias */}
               <CategoryAnalysisChart categorySpending={financialData.spendingDistribution} />
            </div>

            {/* --- Seção de Clientes/Fornecedores --- */}
             <div id="clientes-fornecedores">
               {/* Renderiza as listas de clientes e fornecedores */}
                <ClientSupplierList clients={financialData.topClients} suppliers={financialData.topSuppliers} />
            </div>

             {/* --- Seção de Relatórios Comparativos --- */}
             <div id="comparativos">
               {/* Renderiza o card de relatórios comparativos */}
                <ComparativeReports goals={financialData.goals} />
            </div>

            {/* Adicione aqui outras seções detalhadas se/quando forem criadas */}

          </>
        )}

        {/* Mensagem caso não haja dados */}
         {!isLoadingData && !financialData && (
             <div className="flex flex-col items-center justify-center text-center py-10">
                <p className="text-lg text-muted-foreground mb-4">Não foi possível carregar os dados detalhados.</p>
                <p className="text-sm text-muted-foreground">Verifique se há contas bancárias conectadas e transações sincronizadas.</p>
                <Button variant="outline" className="mt-6" asChild>
                    <Link to="/dashboard">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Dashboard
                    </Link>
                </Button>
            </div>
         )}
      </main>
    </div>
  );
};

export default DetailedView;