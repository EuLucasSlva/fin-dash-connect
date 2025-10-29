import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { GoalsComparisonData } from "@/hooks/useFinancialData";

interface ComparativeReportsProps {
  goals: GoalsComparisonData; // Reutiliza a interface, pois contém os dados do mês anterior
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDifference = (diff: number): string => {
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${formatCurrency(diff)}`;
}

const ComparativeReports = ({ goals }: ComparativeReportsProps) => {
    const incomeDiff = goals.achieved - goals.lastMonthIncome;
    const expenseDiffVsLastMonth = (goals.achieved - goals.monthlyGoal) - goals.lastMonthExpenses; // Precisa recalcular despesa atual se não vier pronta
    const currentMonthExpenses = goals.achieved - goals.monthlyGoal; // Estimativa baseada na meta de receita/lucro

    const incomeDiffPercent = goals.lastMonthIncome !== 0 ? (incomeDiff / Math.abs(goals.lastMonthIncome)) * 100 : (goals.achieved > 0 ? Infinity : 0);
    const expenseDiffPercent = goals.lastMonthExpenses !== 0 ? ((currentMonthExpenses - goals.lastMonthExpenses) / Math.abs(goals.lastMonthExpenses)) * 100 : (currentMonthExpenses > 0 ? Infinity : 0);


  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo Mensal</CardTitle>
        <CardDescription>Análise da performance atual em relação ao mês anterior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Comparativo de Receitas */}
             <div className="border p-4 rounded-md">
                 <h4 className="text-sm font-medium text-muted-foreground mb-2">Receitas</h4>
                 <p className="text-2xl font-bold">{formatCurrency(goals.achieved)}</p>
                 <div className={`flex items-center gap-1 text-sm mt-1 ${incomeDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                     {incomeDiff >= 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                     <span>{formatDifference(incomeDiff)} ({isFinite(incomeDiffPercent) ? `${incomeDiffPercent.toFixed(1)}%` : 'N/A'})</span>
                 </div>
                 <p className="text-xs text-muted-foreground mt-1">Mês anterior: {formatCurrency(goals.lastMonthIncome)}</p>
             </div>

             {/* Comparativo de Despesas */}
             <div className="border p-4 rounded-md">
                 <h4 className="text-sm font-medium text-muted-foreground mb-2">Despesas</h4>
                  <p className="text-2xl font-bold">{formatCurrency(currentMonthExpenses)}</p>
                  <div className={`flex items-center gap-1 text-sm mt-1 ${currentMonthExpenses <= goals.lastMonthExpenses ? 'text-green-600' : 'text-red-600'}`}>
                     {currentMonthExpenses <= goals.lastMonthExpenses ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                     <span>{formatDifference(currentMonthExpenses - goals.lastMonthExpenses)} ({isFinite(expenseDiffPercent) ? `${expenseDiffPercent.toFixed(1)}%` : 'N/A'})</span>
                  </div>
                 <p className="text-xs text-muted-foreground mt-1">Mês anterior: {formatCurrency(goals.lastMonthExpenses)}</p>
             </div>
         </div>
         {/* Adicionar comparativo de Lucro se desejar */}
      </CardContent>
    </Card>
  );
};

export default ComparativeReports;