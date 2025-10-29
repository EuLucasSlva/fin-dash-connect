import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Percent, DollarSign } from "lucide-react";
import { FinancialSummaryData } from "@/hooks/useFinancialData"; // Importa a interface

interface FinancialSummaryProps {
  stats: FinancialSummaryData;
}

// Função auxiliar para formatar moeda
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'R$ --';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Função auxiliar para formatar percentual
const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined || !isFinite(value)) return '--%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

const FinancialSummary = ({ stats }: FinancialSummaryProps) => {
  // Define cores com base no lucro/prejuízo
  const profitColor = stats.monthProfit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitIconColor = stats.monthProfit >= 0 ? 'text-green-600' : 'text-red-600';

  // Define cores e texto para variação
  const variationColor = stats.profitVariation === null ? 'text-muted-foreground' : stats.profitVariation >= 0 ? 'text-green-600' : 'text-red-600';
  const variationText = formatPercentage(stats.profitVariation);


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {/* Saldo Total */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalBalance)}</div>
          <p className="text-xs text-muted-foreground">Saldo atual conciliado</p>
        </CardContent>
      </Card>

      {/* Receitas do Mês */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Receitas (Mês)</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.monthIncome)}</div>
           <p className="text-xs text-muted-foreground">Total de entradas no mês</p>
        </CardContent>
      </Card>

      {/* Despesas do Mês */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Despesas (Mês)</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.monthExpenses)}</div>
           <p className="text-xs text-muted-foreground">Total de saídas no mês</p>
        </CardContent>
      </Card>

       {/* Lucro/Prejuízo (Mês) */}
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Lucro/Prej. (Mês)</CardTitle>
          <DollarSign className={`h-4 w-4 ${profitIconColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${profitColor}`}>{formatCurrency(stats.monthProfit)}</div>
           <p className="text-xs text-muted-foreground">Resultado do mês atual</p>
        </CardContent>
      </Card>

       {/* Variação Lucro (%) */}
       <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Variação Lucro</CardTitle>
           <Percent className={`h-4 w-4 ${variationColor}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${variationColor}`}>{variationText}</div>
           <p className="text-xs text-muted-foreground">vs. Mês anterior</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummary;