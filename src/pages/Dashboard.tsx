import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import ConnectBankButton from "@/components/ConnectBankButton";
import TransactionsList from "@/components/TransactionsList";
import ApiKeySection from "@/components/ApiKeySection";
import { SyncTransactionsButton } from "@/components/SyncTransactionsButton";

interface DashboardStats {
  totalBalance: number;
  monthIncome: number;
  monthExpenses: number;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    monthIncome: 0,
    monthExpenses: 0,
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        loadDashboardStats(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      } else {
        setLoading(false);
        loadDashboardStats(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, refreshKey]);

  const loadDashboardStats = async (userId: string) => {
    try {
      // Buscar transações do mês atual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      if (transactions && transactions.length > 0) {
        // Calcular saldo total (última transação com balance)
        const lastBalance = transactions
          .filter(t => t.balance !== null)
          .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())[0];
        
        const totalBalance = lastBalance?.balance || 0;

        // Calcular entradas e saídas do mês
        const monthTransactions = transactions.filter(t => {
          const date = new Date(t.transaction_date);
          return date >= firstDayOfMonth && date <= lastDayOfMonth;
        });

        const monthIncome = monthTransactions
          .filter(t => t.transaction_type === 'CREDIT')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        const monthExpenses = Math.abs(
          monthTransactions
            .filter(t => t.transaction_type === 'DEBIT')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
        );

        setStats({
          totalBalance,
          monthIncome,
          monthExpenses,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Dashboard atualizado!');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">
            Bem-vindo, {user?.email}! Conecte suas contas e visualize suas finanças.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {stats.totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalBalance === 0 ? 'Conecte uma conta bancária' : 'Saldo atualizado'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas (mês)</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {stats.monthIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.monthIncome === 0 ? 'Aguardando transações' : 'Entradas do mês'}
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saídas (mês)</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {stats.monthExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.monthExpenses === 0 ? 'Aguardando transações' : 'Saídas do mês'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conectar Conta Bancária</CardTitle>
            <CardDescription>
              Conecte sua conta do Nubank, Itaú ou Santander para começar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ConnectBankButton userId={user?.id} onSuccess={handleRefresh} />
            <div className="pt-2 border-t flex gap-2">
              <SyncTransactionsButton userId={user?.id} onSuccess={handleRefresh} />
              <Button onClick={handleRefresh} variant="outline" size="sm">
                Atualizar Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        <TransactionsList key={refreshKey} userId={user?.id} />

        <ApiKeySection userId={user?.id} />
      </main>
    </div>
  );
};

export default Dashboard;
