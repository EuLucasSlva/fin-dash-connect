import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  transaction_type: string;
  category: string | null;
}

interface TransactionsListProps {
  userId?: string;
}

const TransactionsList = ({ userId }: TransactionsListProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("transaction_date", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Erro ao buscar transações:", error);
      } else {
        setTransactions(data || []);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
          <CardDescription>Nenhuma transação encontrada</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conecte uma conta bancária para visualizar suas transações
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transações Recentes</CardTitle>
        <CardDescription>Últimas 10 transações</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <p className="font-medium">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(transaction.transaction_date), "dd 'de' MMMM, yyyy", {
                    locale: ptBR,
                  })}
                </p>
                {transaction.category && (
                  <Badge variant="outline" className="text-xs">
                    {transaction.category}
                  </Badge>
                )}
              </div>
              <div className="text-right">
                <p
                  className={`text-lg font-bold ${
                    transaction.transaction_type === "CREDIT"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {transaction.transaction_type === "CREDIT" ? "+" : "-"}
                  R$ {Math.abs(transaction.amount).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TransactionsList;
