import { useState } from "react"; // Importar useState
import * as React from "react"; // <--- ADICIONADO IMPORT DO REACT
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DailyCashFlow } from "@/hooks/useFinancialData";
import { format, parseISO, subDays, startOfDay } from 'date-fns'; // Importar subDays e startOfDay
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select" // Importar Select

interface CashFlowChartProps {
  dailyCashFlow: DailyCashFlow[]; // Recebe todos os dados diários (o hook deve fornecer um período maior)
}

// ... (formatCurrency, formatTooltipCurrency - iguais à resposta anterior) ...
const formatCurrency = (value: number): string => {
  if (Math.abs(value) >= 1000) {
     return `R$ ${(value / 1000).toFixed(0)}k`;
  }
   return `R$ ${value.toFixed(0)}`;
};

const formatTooltipCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatXAxis = (tickItem: string) => {
     try {
       return format(parseISO(tickItem), 'dd/MM');
     } catch (e) { return tickItem; } // Fallback
};

const CustomTooltip = ({ active, payload, label }: any) => {
      // ... (igual à resposta anterior) ...
      if (active && payload && payload.length) {
        let dateFormatted = label;
        try {
           dateFormatted = format(parseISO(label), 'dd/MM/yyyy', { locale: ptBR });
        } catch(e) {/* ignore */}

        return (
          <div className="bg-background border border-border p-2 rounded shadow-lg text-sm">
            <p className="font-medium">{dateFormatted}</p>
            {payload.map((pld: any) => (
                <p key={pld.dataKey} style={{ color: pld.color }}>
                   {pld.name === 'Entradas' ? 'Entradas:' : 'Saídas:'} {formatTooltipCurrency(pld.value)}
                </p>
            ))}
          </div>
        );
      }
      return null;
    };


const CashFlowChart = ({ dailyCashFlow }: CashFlowChartProps) => {
  const [daysToShow, setDaysToShow] = useState<string>("15"); // Estado para controlar o período, padrão 15 dias

  // Filtra os dados com base no período selecionado
  const filteredData = React.useMemo(() => {
    if (!dailyCashFlow) return [];
    const numberOfDays = parseInt(daysToShow, 10);
    const endDate = new Date(); // Hoje
    const startDate = startOfDay(subDays(endDate, numberOfDays - 1)); // -1 porque inclui o dia de hoje

    // Ordena os dados originais por data (importante!)
    const sortedFlow = [...dailyCashFlow].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    // Filtra pelo intervalo de datas
    return sortedFlow.filter(item => {
        try {
            const itemDate = parseISO(item.date);
            return itemDate >= startDate && itemDate <= endDate;
        } catch(e) {
            console.warn("Invalid date found in cash flow data:", item.date);
            return false;
        }
    });
  }, [dailyCashFlow, daysToShow]);

  // Adapta o intervalo do eixo X dependendo do número de dias
  const xAxisInterval = parseInt(daysToShow) <= 15 ? 'preserveStartEnd' : 'equidistantPreserveStart';


  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <CardTitle>Fluxo de Caixa</CardTitle>
          <CardDescription>Entradas e saídas diárias.</CardDescription>
        </div>
        {/* Seletor de Período */}
        <Select value={daysToShow} onValueChange={setDaysToShow}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="15">Últimos 15 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-[350px] p-0 pr-4 pb-4">
        {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={filteredData}
                margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatXAxis}
                    tick={{ fontSize: 10 }}
                    interval={xAxisInterval} // Ajusta o intervalo dinamicamente
                     minTickGap={15} // Reduzido para tentar mostrar mais labels
                />
                <YAxis
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 10 }}
                    width={50}
                 />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconSize={10}/>
                <Line
                    type="monotone" dataKey="income" name="Entradas"
                    stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r: 6 }}
                />
                <Line
                    type="monotone" dataKey="expense" name="Saídas"
                    stroke="#dc2626" strokeWidth={2} dot={false} activeDot={{ r: 6 }}
                />
            </LineChart>
            </ResponsiveContainer>
         ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
                Sem dados de fluxo de caixa para o período selecionado.
            </div>
         )}
      </CardContent>
    </Card>
  );
};

export default CashFlowChart;