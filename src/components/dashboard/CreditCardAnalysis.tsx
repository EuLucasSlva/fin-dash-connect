import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CalendarDays, ReceiptText, CircleDollarSign } from "lucide-react";
import { CreditCardAnalysisData } from "@/hooks/useFinancialData"; // Importa a interface ATUALIZADA
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreditCardAnalysisProps {
  creditCardData: CreditCardAnalysisData | undefined; // Permite undefined enquanto carrega
}

// Funções auxiliares de formatação
const formatCurrency = (value: number | null | undefined): string => {
   if (value === null || value === undefined) return 'R$ --';
   // Garante que é número antes de formatar
   const numberValue = Number(value);
   if (isNaN(numberValue)) return 'R$ --';
   return numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '--/--';
    try {
        // A data já vem como YYYY-MM-DD do Supabase/Hook
        return format(parseISO(dateString), 'dd/MM', { locale: ptBR });
    } catch (e) {
        console.warn("Invalid date format for credit card due date:", dateString, e);
        return dateString; // Retorna original em caso de erro
     }
}

const CreditCardAnalysis = ({ creditCardData }: CreditCardAnalysisProps) => {

  // Caso os dados ainda não tenham chegado (embora o Dashboard já trate o isLoading)
  if (!creditCardData) {
      return (
          <Card>
              <CardHeader>
                  <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <CardTitle>Análise de Cartão de Crédito</CardTitle>
                  </div>
                  <CardDescription>Carregando dados...</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px] flex items-center justify-center">
                   {/* Pode colocar um Skeleton aqui */}
                   <p className="text-sm text-muted-foreground">Aguardando dados...</p>
              </CardContent>
          </Card>
      );
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Análise de Cartão de Crédito</CardTitle>
        </div>
        <CardDescription>Resumo das suas faturas e gastos no cartão.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">

         {/* Próxima Fatura */}
         <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground"/>
                <span className="text-sm font-medium">Próxima Fatura</span>
            </div>
            <div className="text-right">
                {/* Usa os novos campos */}
                <p className="text-lg font-semibold">{formatCurrency(creditCardData.nextBillAmount)}</p>
                <p className="text-xs text-muted-foreground">Vencimento: {formatDate(creditCardData.nextBillDueDate)}</p>
            </div>
         </div>

         {/* Valor Aberto da Fatura Atual */}
          {creditCardData.openBillAmount !== null && ( // Só mostra se tiver valor
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CircleDollarSign className="h-4 w-4 text-muted-foreground"/>
                    <span className="text-sm">Valor em Aberto (Atual)</span>
                </div>
                 {/* Usa o novo campo */}
                 <p className="text-sm font-medium">{formatCurrency(creditCardData.openBillAmount)}</p>
            </div>
           )}

         {/* Gasto Total Mês (calculado das transações gerais) */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
                <ReceiptText className="h-4 w-4 text-muted-foreground"/>
                 {/* Texto ajustado para clareza */}
                <span className="text-sm">Pagamentos/Débitos Cartão (Mês)</span>
            </div>
            {/* Usa o campo existente */}
            <span className="text-sm font-semibold text-red-600">{formatCurrency(creditCardData.totalSpentMonth)}</span>
         </div>


         {/* --- Placeholder para futuras informações --- */}
         <div className="text-xs text-muted-foreground text-center pt-4">
            (Detalhes de parcelas e categorias da fatura em breve)
         </div>
      </CardContent>
    </Card>
  );
};

export default CreditCardAnalysis;