import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, ArrowUp, ArrowDown } from "lucide-react";
import { GoalsComparisonData } from "@/hooks/useFinancialData"; // Importa a interface

interface GoalsComparisonProps {
  goals: GoalsComparisonData;
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const GoalsComparison = ({ goals }: GoalsComparisonProps) => {
    const incomeDiff = goals.achieved - goals.lastMonthIncome;
    const expenseDiff = goals.lastMonthExpenses - (goals.achieved - goals.monthlyGoal); // Assumindo despesa atual = Receita - Lucro (Meta aqui é de Receita)

    const incomeTrendIcon = incomeDiff >= 0 ? <ArrowUp className="h-4 w-4 text-green-600" /> : <ArrowDown className="h-4 w-4 text-red-600" />;
    const incomeTrendText = incomeDiff >= 0 ? `${formatCurrency(incomeDiff)} a mais` : `${formatCurrency(Math.abs(incomeDiff))} a menos`;

    const expenseTrendIcon = expenseDiff >= 0 ? <ArrowDown className="h-4 w-4 text-green-600" /> : <ArrowUp className="h-4 w-4 text-red-600" />; // Invertido: menos despesa é bom
    const expenseTrendText = expenseDiff >= 0 ? `${formatCurrency(expenseDiff)} a menos` : `${formatCurrency(Math.abs(expenseDiff))} a mais`;


  return (
    <Card>
      <CardHeader>
         <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Metas e Comparativos</CardTitle>
        </div>
        <CardDescription>Acompanhe seu progresso mensal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Meta de Faturamento */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Meta de Faturamento (Mês)</span>
            <span className="text-sm text-muted-foreground">{formatCurrency(goals.monthlyGoal)}</span>
          </div>
           <Progress value={goals.percentage} className="h-2" />
          <div className="flex justify-between items-center mt-1">
             <span className="text-xs text-muted-foreground">Realizado: {formatCurrency(goals.achieved)}</span>
             <span className={`text-sm font-semibold ${goals.percentage >= 100 ? 'text-green-600' : 'text-primary'}`}>{goals.percentage.toFixed(0)}%</span>
           </div>
        </div>

        {/* Comparativo Mês Anterior */}
        <div className="space-y-3 pt-4 border-t">
             <h4 className="text-sm font-medium text-muted-foreground">Comparativo com Mês Anterior</h4>
             <div className="flex justify-between items-center">
                 <span className="text-sm">Receitas</span>
                 <div className="flex items-center gap-1 text-sm">
                    {incomeTrendIcon}
                    <span className={incomeDiff >= 0 ? 'text-green-600' : 'text-red-600'}>{incomeTrendText}</span>
                 </div>
             </div>
              <div className="flex justify-between items-center">
                 <span className="text-sm">Despesas</span>
                  <div className="flex items-center gap-1 text-sm">
                    {expenseTrendIcon}
                     <span className={expenseDiff >= 0 ? 'text-green-600' : 'text-red-600'}>{expenseTrendText}</span>
                 </div>
             </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoalsComparison;