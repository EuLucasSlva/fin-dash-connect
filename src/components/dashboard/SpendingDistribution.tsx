import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SpendingDistributionData } from "@/hooks/useFinancialData";
import { useMemo } from "react"; // Importar useMemo

interface SpendingDistributionProps {
  categorySpending: SpendingDistributionData;
}

// Cores (manter ou expandir)
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c'];
const OTHER_COLOR = '#b0b0b0'; // Cor para "Outros"

interface ChartData {
    name: string;
    value: number;
    // Adiciona uma lista opcional para guardar as categorias originais de "Outros"
    originalCategories?: { name: string; value: number }[];
}


const SpendingDistribution = ({ categorySpending }: SpendingDistributionProps) => {

  // Processa os dados para agrupar em "Outros" usando useMemo
  const chartData: ChartData[] = useMemo(() => {
    const sortedData = Object.entries(categorySpending)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Ordena do maior para o menor

    if (sortedData.length <= 5) { // Se tem 5 ou menos, mostra tudo
      return sortedData;
    }

    const top4 = sortedData.slice(0, 4);
    const others = sortedData.slice(4);
    const othersValue = others.reduce((sum, item) => sum + item.value, 0);

    return [
      ...top4,
      { name: 'Outros', value: othersValue, originalCategories: others }, // Armazena as categorias originais
    ];
  }, [categorySpending]);


  const formatCurrency = (value: number): string => {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Tooltip customizado para mostrar detalhes de "Outros"
  const CustomTooltip = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data: ChartData = payload[0].payload; // Acessa os dados completos
        const totalValue = payload[0].value; // Pega o valor total do payload (para %)
        const chartTotal = chartData.reduce((sum, entry) => sum + entry.value, 0); // Calcula o total geral

        return (
          <div className="bg-background border border-border p-2 rounded shadow-lg text-sm max-w-xs">
            <p className="font-medium">{`${data.name}: ${formatCurrency(totalValue)}`}</p>
             {chartTotal > 0 && (
                 <p className="text-muted-foreground">{`(${(totalValue / chartTotal * 100).toFixed(1)}%)`}</p>
             )}
            {/* Mostra o breakdown se for a categoria "Outros" */}
            {data.name === 'Outros' && data.originalCategories && data.originalCategories.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-semibold mb-1">Detalhes de Outros:</p>
                    <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
                        {data.originalCategories.map((cat, index) => (
                             <li key={index}>{`${cat.name}: ${formatCurrency(cat.value)}`}</li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
        );
      }
      return null;
    };


  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Distribuição de Gastos (Mês)</CardTitle>
        <CardDescription>Top 4 categorias + Outros</CardDescription>
      </CardHeader>
      <CardContent className="h-[300px] p-0">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === 'Outros' ? OTHER_COLOR : COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
               <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{fontSize: "12px"}} />
            </PieChart>
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

export default SpendingDistribution;