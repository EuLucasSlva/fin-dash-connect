import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SpendingDistributionData } from "@/hooks/useFinancialData";
import { useMemo } from 'react';

interface CategoryAnalysisChartProps {
  categorySpending: SpendingDistributionData; // Recebe os mesmos dados do gráfico de pizza
}

// Cores (pode usar as mesmas ou outras)
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const formatCurrencyAxis = (value: number): string => {
  if (Math.abs(value) >= 1000) {
     return `R$ ${(value / 1000).toFixed(0)}k`;
  }
   return `R$ ${value.toFixed(0)}`;
};
const formatCurrencyTooltip = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};


const CategoryAnalysisChart = ({ categorySpending }: CategoryAnalysisChartProps) => {

  // Prepara e ordena os dados para o gráfico de barras
  const chartData = useMemo(() => {
      return Object.entries(categorySpending)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value); // Ordena do maior para o menor
  }, [categorySpending]);


  const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-background border border-border p-2 rounded shadow-lg text-sm">
            <p className="font-medium">{`${label}`}</p>
            <p style={{ color: payload[0].fill }}>
                {`Gasto: ${formatCurrencyTooltip(payload[0].value)}`}
            </p>
          </div>
        );
      }
      return null;
    };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos por Categoria (Mês)</CardTitle>
        <CardDescription>Visualização detalhada das despesas mensais por categoria.</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px] p-0 pr-4 pb-4"> {/* Altura maior para barras */}
         {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
            <BarChart
                layout="vertical" // Gráfico de barras horizontais
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }} // Ajuste margens
            >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis type="number" tickFormatter={formatCurrencyAxis} tick={{ fontSize: 10 }} />
                <YAxis
                    dataKey="name"
                    type="category"
                    width={120} // Aumenta espaço para nomes das categorias
                    tick={{ fontSize: 10 }}
                    interval={0} // Mostra todos os labels
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(206, 212, 218, 0.1)' }}/>
                {/* <Legend /> // Legenda pode ser redundante aqui */}
                <Bar dataKey="value" name="Gasto" fill="#FF8042" barSize={20}>
                   {/* Pode adicionar cores individuais se quiser */}
                   {/* {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))} */}
                </Bar>
            </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados de despesas categorizadas para exibir.
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default CategoryAnalysisChart;