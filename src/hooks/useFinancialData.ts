import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types'; // Certifique-se que este arquivo foi regenerado!
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, isSameDay, parseISO, compareAsc, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos das tabelas (agora devem incluir as novas tabelas após gerar os tipos)
type Transaction = Database['public']['Tables']['transactions']['Row'];
type Connection = Database['public']['Tables']['bank_connections']['Row'];
type CreditCardAccount = Database['public']['Tables']['credit_card_accounts']['Row'];
type CreditCardBill = Database['public']['Tables']['credit_card_bills']['Row'];

// --- Tipos de dados processados (interfaces exportadas) ---
export interface FinancialSummaryData {
    totalBalance: number;
    monthIncome: number;
    monthExpenses: number;
    monthProfit: number;
    profitVariation: number | null;
}
export interface SpendingDistributionData { [category: string]: number; }
export interface DailyCashFlow { date: string; income: number; expense: number; }
export interface CashFlowData { daily: DailyCashFlow[]; }
export interface TopClientSupplier { name: string; totalAmount: number; }
export interface GoalsComparisonData {
    monthlyGoal: number;
    achieved: number;
    percentage: number;
    lastMonthIncome: number;
    lastMonthExpenses: number;
}
// --- Interface ATUALIZADA para Análise de Cartão ---
export interface CreditCardAnalysisData {
  totalSpentMonth: number; // Gasto total em transações gerais marcadas como cartão no mês
  nextBillAmount: number | null;
  nextBillDueDate: string | null; // Data ISO (YYYY-MM-DD)
  openBillAmount: number | null; // Valor atual da fatura aberta
  // Futuro: billSpendingByCategory: { [category: string]: number };
  // Futuro: installmentExpenses: { description: string; amount: number; currentParcel: number; totalParcels: number }[];
}


// Interface principal de retorno do Hook
export interface FinancialData {
    summary: FinancialSummaryData;
    spendingDistribution: SpendingDistributionData;
    connections: Connection[];
    creditCardAnalysis: CreditCardAnalysisData; // Usará a interface atualizada
    cashFlow: CashFlowData;
    topClients: TopClientSupplier[];
    topSuppliers: TopClientSupplier[];
    goals: GoalsComparisonData;
    insights: string[];
    rawTransactions: Transaction[];
    // Opcional: Adicionar dados brutos de cartão e faturas se necessário em outros lugares
    // rawCreditCards: CreditCardAccount[];
    // rawBills: CreditCardBill[];
}


// --- Funções Auxiliares de Cálculo ---
const calculateMonthlyFigures = (transactions: Transaction[], startDate: Date, endDate: Date) => {
    const monthlyTransactions = transactions.filter(t => {
        try {
            if (!t.transaction_date) return false;
            const date = parseISO(t.transaction_date);
            return date >= startDate && date <= endDate;
        } catch { return false; }
    });
    const income = monthlyTransactions.filter(t => t.transaction_type === 'CREDIT').reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const expenses = Math.abs(monthlyTransactions.filter(t => t.transaction_type === 'DEBIT').reduce((sum, t) => sum + Number(t.amount || 0), 0));
    const profit = income - expenses;
    return { income, expenses, profit, transactions: monthlyTransactions };
};
const calculateSpendingDistribution = (transactions: Transaction[]): SpendingDistributionData => {
     return transactions.filter(t => t.transaction_type === 'DEBIT' && t.category).reduce((acc, t) => {
            const category = t.category || 'Outros';
            acc[category] = (acc[category] || 0) + Math.abs(Number(t.amount || 0));
            return acc;
        }, {} as SpendingDistributionData);
};
const calculateDailyCashFlow = (transactions: Transaction[], startDate: Date, endDate: Date): DailyCashFlow[] => {
     const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
     return daysInterval.map(day => {
         const dayStr = format(day, 'yyyy-MM-dd');
         const dayTransactions = transactions.filter(t => t.transaction_date === dayStr);
         const income = dayTransactions.filter(t => t.transaction_type === 'CREDIT').reduce((sum, t) => sum + Number(t.amount || 0), 0);
         const expense = Math.abs(dayTransactions.filter(t => t.transaction_type === 'DEBIT').reduce((sum, t) => sum + Number(t.amount || 0), 0));
         return { date: dayStr, income, expense };
     });
};
const calculateTopEntities = (transactions: Transaction[], type: 'CREDIT' | 'DEBIT', limit: number): TopClientSupplier[] => {
     const entityTotals = transactions.filter(t => t.transaction_type === type).reduce((acc, t) => {
            const name = t.description?.trim() || 'Desconhecido';
             if (name.length < 4 || ['pagamento', 'transferencia', 'pix', 'fatura', 'compra', 'debito aut', 'rendimento', 'tarifa'].some(term => name.toLowerCase().includes(term))) { return acc; }
            acc[name] = (acc[name] || 0) + Math.abs(Number(t.amount || 0));
            return acc;
        }, {} as Record<string, number>);
     return Object.entries(entityTotals).sort(([, a], [, b]) => b - a).slice(0, limit).map(([name, totalAmount]) => ({ name, totalAmount }));
};
const generateInsights = (currentMonthExpenses: number, lastMonthExpenses: number, topSuppliers: TopClientSupplier[]): string[] => {
      const insights: string[] = [];
      if (lastMonthExpenses > 10 && currentMonthExpenses > lastMonthExpenses * 1.2) {
           const increasePercent = (((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100).toFixed(0);
           insights.push(`📈 Suas despesas aumentaram ${increasePercent}% em relação ao mês anterior.`);
      } else if (lastMonthExpenses > 10 && currentMonthExpenses < lastMonthExpenses * 0.8) {
           const decreasePercent = (((lastMonthExpenses - currentMonthExpenses) / lastMonthExpenses) * 100).toFixed(0);
           insights.push(`📉 Suas despesas diminuíram ${decreasePercent}% em relação ao mês anterior!`);
      }
      if (topSuppliers.length > 0) {
          insights.push(`💡 Seu maior gasto este mês foi com "${topSuppliers[0].name}".`);
      }
      // Adicionar mais insights aqui...
      return insights;
}


// --- Função Principal Atualizada ---
const fetchFinancialData = async (userId: string | undefined): Promise<FinancialData | null> => {
    if (!userId) return null;

    console.log(`[useFinancialData] Fetching data for user: ${userId}`);

    // --- Buscas Paralelas ---
    const [connectionsResult, transactionsResult, creditCardsResult, billsResult] = await Promise.all([
        supabase.from('bank_connections').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId).order('transaction_date', { ascending: false }),
        supabase.from('credit_card_accounts').select('*').eq('user_id', userId), // Busca cartões
        // Busca faturas JOIN com cartões para garantir que pertencem ao usuário
        supabase.from('credit_card_bills')
                .select(`*, credit_card_accounts!inner(user_id)`) // Certifica que só pega faturas de cartões do usuário
                .eq('credit_card_accounts.user_id', userId) // Filtra pelo user_id na tabela interna
                .order('due_date', { ascending: true }) // Ordena faturas pela data de vencimento
    ]);

    // Tratamento de Erros das Buscas
    if (connectionsResult.error) throw new Error(`Erro ao buscar conexões: ${connectionsResult.error.message}`);
    if (transactionsResult.error) throw new Error(`Erro ao buscar transações: ${transactionsResult.error.message}`);
    // Não lança erro se busca de cartões/faturas falhar, pode não haver
    if (creditCardsResult.error) console.warn(`Erro ao buscar cartões: ${creditCardsResult.error.message}`);
    if (billsResult.error) console.warn(`Erro ao buscar faturas: ${billsResult.error.message}`);

    const connections = connectionsResult.data || [];
    const transactions = transactionsResult.data || [];
    const creditCards = creditCardsResult.data || [];
    // Filtra billsResult.data para remover o objeto aninhado 'credit_card_accounts' antes de usar
    const bills = billsResult.data?.map(({ credit_card_accounts, ...bill }) => bill as CreditCardBill) || [];


     console.log(`[useFinancialData] Fetched: ${connections.length} connections, ${transactions.length} transactions, ${creditCards.length} cards, ${bills.length} bills.`);


    // Estrutura padrão vazia
    const emptyData: FinancialData = {
         summary: { totalBalance: 0, monthIncome: 0, monthExpenses: 0, monthProfit: 0, profitVariation: null },
         spendingDistribution: {},
         connections: connections || [],
         // Inicializa a estrutura completa de creditCardAnalysis
         creditCardAnalysis: { totalSpentMonth: 0, nextBillAmount: null, nextBillDueDate: null, openBillAmount: null },
         cashFlow: { daily: [] },
         topClients: [],
         topSuppliers: [],
         goals: { monthlyGoal: 5000, achieved: 0, percentage: 0, lastMonthIncome: 0, lastMonthExpenses: 0 },
         insights: [],
         rawTransactions: transactions || []
         // rawCreditCards: creditCards,
         // rawBills: bills
    };

    // Retorna cedo se não houver transações E faturas (mantém conexões na resposta)
    if (transactions.length === 0 && bills.length === 0) {
        console.log("[useFinancialData] No financial data (transactions or bills) found.");
        return { ...emptyData, connections };
    }


    // --- Processamento dos Dados ---
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Cálculos Mensais
    const currentMonthData = calculateMonthlyFigures(transactions, currentMonthStart, currentMonthEnd);
    const lastMonthData = calculateMonthlyFigures(transactions, lastMonthStart, lastMonthEnd);

     // Variação do Lucro
     let profitVariation: number | null = null;
     if(lastMonthData.profit !== 0) {
         // Evita divisão por zero e calcula corretamente
         profitVariation = ((currentMonthData.profit - lastMonthData.profit) / Math.abs(lastMonthData.profit)) * 100;
         // Trata casos de Infinity ou NaN se algo der muito errado
         if (!isFinite(profitVariation)) profitVariation = null;
     } else if (currentMonthData.profit !== 0) {
         profitVariation = null; // Indica mudança a partir do zero
     }

    // Saldo Total
    const sortedTransactionsWithBalance = transactions
        .filter(t => t.balance !== null && t.balance !== undefined)
        .sort((a, b) => {
            try { return parseISO(b.transaction_date).getTime() - parseISO(a.transaction_date).getTime(); }
            catch { return 0; }
        });
    const totalBalance = sortedTransactionsWithBalance.length > 0 ? Number(sortedTransactionsWithBalance[0].balance) : 0;

    const summary: FinancialSummaryData = {
        totalBalance,
        monthIncome: currentMonthData.income,
        monthExpenses: currentMonthData.expenses,
        monthProfit: currentMonthData.profit,
        profitVariation
    };

    // Distribuição de Gastos
    const spendingDistribution = calculateSpendingDistribution(currentMonthData.transactions);

    // Fluxo de Caixa Diário (Últimos 90 dias)
    const cashFlowStartDate = startOfDay(subDays(now, 89));
    const cashFlowEndDate = endOfMonth(now);
    const dailyCashFlowData = calculateDailyCashFlow(transactions, cashFlowStartDate, cashFlowEndDate);
    const cashFlow: CashFlowData = { daily: dailyCashFlowData };

     // Top Clientes/Fornecedores
     const topClients = calculateTopEntities(transactions, 'CREDIT', 5);
     const topSuppliers = calculateTopEntities(transactions, 'DEBIT', 5);

     // Metas e Comparativos
     const monthlyGoal = 5000;
     const achieved = currentMonthData.income;
     const percentage = monthlyGoal > 0 ? Math.min((achieved / monthlyGoal) * 100, 100) : 0;
     const goals: GoalsComparisonData = {
        monthlyGoal, achieved, percentage,
        lastMonthIncome: lastMonthData.income,
        lastMonthExpenses: lastMonthData.expenses
      };

     // Insights
     const insights = generateInsights(currentMonthData.expenses, lastMonthData.expenses, topSuppliers);

    // --- Análise de Cartão de Crédito ATUALIZADA ---
    let creditCardAnalysis: CreditCardAnalysisData = { // Usa a interface completa
        totalSpentMonth: 0,
        nextBillAmount: null,
        nextBillDueDate: null,
        openBillAmount: null
    };

    // 1. Calcula gasto total do mês em transações que parecem de PAGAMENTO de cartão
    const cardPaymentTransactionsMonth = currentMonthData.transactions.filter(t =>
        t.category?.toLowerCase().includes('credit_card_payment') // Foca na categoria específica
        || t.description?.toLowerCase().includes('pagamento fatura')
        || t.description?.toLowerCase().includes('pagto cartao')
    );
    creditCardAnalysis.totalSpentMonth = cardPaymentTransactionsMonth
        .filter(t => t.transaction_type === 'DEBIT') // Soma apenas os débitos
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

    // 2. Encontra a próxima fatura e valor em aberto usando os dados da tabela `credit_card_bills`
    if (bills.length > 0) {
        const today = startOfDay(new Date()); // Para comparação de datas

        // Filtra faturas futuras ou abertas/vencidas
        const relevantBills = bills
            .filter(bill => {
                 try {
                    const dueDate = parseISO(bill.due_date); // Parse da data de vencimento
                    // Considera faturas Abertas, Vencidas, ou Futuras
                    return bill.status && ['OPEN', 'UPCOMING', 'OVERDUE'].includes(bill.status.toUpperCase())
                           // E que o vencimento seja hoje ou no futuro (para pegar a mais próxima *a vencer*)
                           && dueDate >= today;
                 } catch {
                     console.warn("Invalid due_date found in bill:", bill.pluggy_bill_id, bill.due_date);
                     return false;
                 }
            })
            // A query já ordena por due_date ascendente, então a primeira é a mais próxima
            // .sort((a, b) => compareAsc(parseISO(a.due_date), parseISO(b.due_date))); // Desnecessário se a query ordena

        if (relevantBills.length > 0) {
            const nextBill = relevantBills[0]; // A mais próxima a vencer
            creditCardAnalysis.nextBillAmount = Number(nextBill.amount ?? 0); // Valor total da fatura
            creditCardAnalysis.nextBillDueDate = nextBill.due_date; // Data YYYY-MM-DD
            // Valor em aberto da fatura (se status OPEN ou OVERDUE)
             if(nextBill.status?.toUpperCase() === 'OPEN' || nextBill.status?.toUpperCase() === 'OVERDUE') {
                 // Usa open_amount se disponível, senão o amount total
                 creditCardAnalysis.openBillAmount = Number(nextBill.open_amount ?? nextBill.amount ?? 0);
             } else {
                 // Se for UPCOMING, não há valor "em aberto" ainda
                 creditCardAnalysis.openBillAmount = null;
             }

        } else {
            // Se não achou futura/aberta, pode procurar a última fechada/paga para info histórica? Opcional.
            console.log("[useFinancialData] No upcoming, open, or overdue bills found.");
        }
    } else {
         console.log("[useFinancialData] No bills data found in database.");
    }
     console.log("[useFinancialData] Credit Card Analysis:", creditCardAnalysis);


    console.log("[useFinancialData] Data processing complete.");
    return {
        summary,
        spendingDistribution,
        connections,
        creditCardAnalysis, // Retorna os dados atualizados
        cashFlow,
        topClients,
        topSuppliers,
        goals,
        insights,
        rawTransactions: transactions,
        // rawCreditCards: creditCards, // Descomente para expor se precisar
        // rawBills: bills
    };
};

// --- Hook useQuery ---
const useFinancialData = (userId: string | undefined) => {
    return useQuery<FinancialData | null, Error>({
        queryKey: ['financialData', userId], // Chave única para caching
        queryFn: () => fetchFinancialData(userId), // Função que busca os dados
        enabled: !!userId, // Só roda a query se userId existir
        staleTime: 1000 * 60 * 2, // Considera os dados "novos" por 2 minutos
        refetchOnWindowFocus: true, // Rebusca dados quando a aba/janela ganha foco
        // gcTime: 1000 * 60 * 5, // Tempo que os dados ficam em cache (garbage collection) - opcional
    });
};

export default useFinancialData;