import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Database } from "../_shared/database.types.ts"; // Assume types gerados pelo Supabase

// Tipos locais (ajuste conforme a API da Pluggy)
interface PluggyAccount {
  id: string; // Pluggy Account ID
  itemId: string;
  type: string; // 'BANK', 'CREDIT_CARD', etc.
  name: string;
  balance?: number; // Para contas BANK
  creditData?: {
    level?: string | null; // Não usado no schema, mas pode existir
    brand?: string | null;
    creditLimit?: number | null;
    availableCreditLimit?: number | null;
    closeDay?: number | null;
    dueDay?: number | null;
  } | null;
  // ... outras propriedades
}

interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO Date String
  category?: string | null;
  balance?: number | null;
  accountId: string;
  type?: string; // CREDIT or DEBIT from Pluggy
  // ... outras propriedades
}

interface PluggyBill {
    id: string; // Pluggy Bill ID
    dueDate: string; // ISO Date string
    closeDate?: string | null; // ISO Date string or null
    amount: number;
    openAmount?: number | null;
    paidAmount?: number | null;
    minimumPayment?: number | null;
    status: 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE' | 'UPCOMING'; // Ou outros que a Pluggy retornar
    // summary?: Record<string, any> | null; // Se precisar do JSONB
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Função Auxiliar para Autenticação Pluggy ---
async function getPluggyApiKey(): Promise<string> {
    const pluggyClientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const pluggyClientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
    if (!pluggyClientId || !pluggyClientSecret) {
      throw new Error('Credenciais Pluggy não configuradas');
    }
    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: pluggyClientId, clientSecret: pluggyClientSecret }),
    });
    if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error("Pluggy auth failed:", errorText);
        throw new Error(`Falha na autenticação Pluggy: ${authResponse.status}`);
    }
    const { apiKey } = await authResponse.json();
    console.log('✅ Autenticado com Pluggy');
    return apiKey;
}

// --- Função para buscar contas de um Item ---
async function fetchPluggyAccounts(itemId: string, apiKey: string): Promise<PluggyAccount[]> {
    const accountsResponse = await fetch(
          `https://api.pluggy.ai/accounts?itemId=${itemId}`,
          { headers: { 'X-API-KEY': apiKey } }
    );
    if (!accountsResponse.ok) {
        console.error(`❌ Erro ao buscar contas do Item ${itemId}: ${accountsResponse.status}`);
        return []; // Retorna array vazio em caso de erro para não parar tudo
    }
    const { results }: { results: PluggyAccount[] } = await accountsResponse.json();
    return results || [];
}

// --- Função para buscar transações de uma conta ---
async function fetchPluggyTransactions(accountId: string, apiKey: string): Promise<PluggyTransaction[]> {
     try {
        const transactionsResponse = await fetch(
            `https://api.pluggy.ai/transactions?accountId=${accountId}`,
            { headers: { 'X-API-KEY': apiKey } }
        );

        if (!transactionsResponse.ok) {
            const errorBody = await transactionsResponse.text();
            console.error(`❌ Erro ao buscar transações da conta ${accountId}: ${transactionsResponse.status} ${errorBody}`);
            return [];
        }

        const { results }: { results: PluggyTransaction[] } = await transactionsResponse.json();
        return results || [];
      } catch (error: any) {
        console.error(`❌ Erro inesperado ao buscar transações da conta ${accountId}:`, error.message);
        return [];
      }
}

// --- Função para buscar faturas de um cartão ---
async function fetchPluggyBills(accountId: string, apiKey: string): Promise<PluggyBill[]> {
     try {
        const billsResponse = await fetch(
            `https://api.pluggy.ai/credit-card-bills?accountId=${accountId}`,
            { headers: { 'X-API-KEY': apiKey } }
        );

        if (!billsResponse.ok) {
            const errorBody = await billsResponse.text();
            console.error(`❌ Erro ao buscar faturas da conta ${accountId}: ${billsResponse.status} ${errorBody}`);
            return [];
        }

        const { results }: { results: PluggyBill[] } = await billsResponse.json();
        return results || [];
      } catch (error: any) {
        console.error(`❌ Erro inesperado ao buscar faturas da conta ${accountId}:`, error.message);
        return [];
      }
}

// --- Função Principal ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Autenticação do Usuário Supabase
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');
    console.log(`🔄 Sincronizando dados para usuário: ${user.id}`);

    // 2. Busca Conexões Bancárias Ativas
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('bank_connections')
      .select('id, user_id, pluggy_item_id, bank_name') // Seleciona só o necessário
      .eq('user_id', user.id)
      .eq('status', 'active'); // Pode ajustar se quiser sincronizar outros status

    if (connectionsError) throw connectionsError;
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma conexão bancária ativa encontrada', transactions: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    console.log(`📊 Encontradas ${connections.length} conexões bancárias ativas.`);

    // 3. Autenticação Pluggy
    const apiKey = await getPluggyApiKey();

    // 4. Cliente Supabase Admin para escrita segura
    const supabaseAdmin = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let totalTransactionsSynced = 0;
    let totalCardsSynced = 0;
    let totalBillsSynced = 0;
    const nowISO = new Date().toISOString();

    // 5. Iterar sobre Conexões
    for (const connection of connections) {
      console.log(`🏦 Processando conexão: ${connection.bank_name} (ItemID: ${connection.pluggy_item_id})`);
      let connectionTransactions: PluggyTransaction[] = [];
      let creditCardAccountsToUpsert: Database['public']['Tables']['credit_card_accounts']['Insert'][] = [];
      let creditCardBillsToUpsert: Database['public']['Tables']['credit_card_bills']['Insert'][] = [];
      const pluggyAccounts = await fetchPluggyAccounts(connection.pluggy_item_id, apiKey);

      if (pluggyAccounts.length === 0) {
        console.log(`🤷 Nenhuma conta encontrada para ${connection.bank_name}, pulando.`);
        // Atualiza last_sync_at mesmo assim
        await supabaseAdmin.from('bank_connections').update({ last_sync_at: nowISO }).eq('id', connection.id);
        continue;
      }
      console.log(`🔍 Encontradas ${pluggyAccounts.length} contas para ${connection.bank_name}`);

      // 6. Iterar sobre Contas da Conexão
      for (const account of pluggyAccounts) {
        console.log(`🧾 Processando conta ${account.id} (Tipo: ${account.type})`);

        // 6.1 Buscar Transações Gerais da Conta
        const accountTransactions = await fetchPluggyTransactions(account.id, apiKey);
        if (accountTransactions.length > 0) {
            connectionTransactions.push(...accountTransactions);
            console.log(`📄 ${accountTransactions.length} transações gerais encontradas para conta ${account.id}`);
        }

        // 6.2 Se for Cartão de Crédito, buscar detalhes e faturas
        if (account.type === 'CREDIT_CARD' && account.creditData) {
            const cardAccountData: Database['public']['Tables']['credit_card_accounts']['Insert'] = {
                user_id: user.id,
                bank_connection_id: connection.id,
                pluggy_account_id: account.id,
                name: account.name || `Cartão ${account.creditData.brand || ''}`, // Nome fallback
                brand: account.creditData.brand || null,
                credit_limit: account.creditData.creditLimit,
                available_credit_limit: account.creditData.availableCreditLimit,
                close_day: account.creditData.closeDay,
                due_day: account.creditData.dueDay,
                updated_at: nowISO // Controla atualização no upsert
            };
            creditCardAccountsToUpsert.push(cardAccountData);

            // Buscar Faturas deste cartão
            const accountBills = await fetchPluggyBills(account.id, apiKey);
            if (accountBills.length > 0) {
                 console.log(`🧾 ${accountBills.length} faturas encontradas para conta ${account.id}`);
                 // Mapear para o formato do Supabase ANTES de adicionar ao array
                 const billsData = accountBills.map(bill => ({
                     // credit_card_account_id será preenchido após o upsert do cartão
                     pluggy_bill_id: bill.id,
                     due_date: bill.dueDate,
                     close_date: bill.closeDate || null,
                     amount: bill.amount,
                     open_amount: bill.openAmount,
                     paid_amount: bill.paidAmount,
                     minimum_payment: bill.minimumPayment,
                     status: bill.status,
                     updated_at: nowISO
                 }));
                 // Adiciona dados mapeados junto com o pluggy_account_id para vincular depois
                 creditCardBillsToUpsert.push(...billsData.map(b => ({ ...b, pluggy_account_id_temp: account.id })));
             }
        }
      } // Fim do loop de contas

      // --- Inserções/Atualizações no Supabase ---

      try {
            // 7. Upsert Contas de Cartão
            if (creditCardAccountsToUpsert.length > 0) {
                const { data: upsertedCards, error: cardError } = await supabaseAdmin
                    .from('credit_card_accounts')
                    .upsert(creditCardAccountsToUpsert, { onConflict: 'pluggy_account_id', ignoreDuplicates: false })
                    .select('id, pluggy_account_id'); // Retorna o ID interno e o da Pluggy

                if (cardError) throw new Error(`Erro ao salvar contas de cartão: ${cardError.message}`);
                totalCardsSynced += upsertedCards?.length || 0;
                console.log(`💳 ${upsertedCards?.length || 0} contas de cartão salvas/atualizadas.`);

                // Mapear pluggy_account_id para o ID interno do Supabase
                const accountIdMap = new Map(upsertedCards?.map(c => [c.pluggy_account_id, c.id]));

                // 8. Upsert Faturas (agora com o ID do cartão)
                if (creditCardBillsToUpsert.length > 0) {
                    const billsWithAccountId = creditCardBillsToUpsert
                        .map(bill => {
                             const internalAccountId = accountIdMap.get(bill.pluggy_account_id_temp);
                             if (!internalAccountId) {
                                 console.warn(`Não foi possível encontrar o ID interno para a fatura ${bill.pluggy_bill_id} (conta ${bill.pluggy_account_id_temp})`);
                                 return null; // Ignora faturas sem conta correspondente
                             }
                             // Remove a chave temporária e adiciona a FK correta
                             const { pluggy_account_id_temp, ...billData } = bill;
                             return { ...billData, credit_card_account_id: internalAccountId };
                        })
                        .filter(Boolean); // Remove nulos

                     if (billsWithAccountId.length > 0) {
                        const { error: billError } = await supabaseAdmin
                            .from('credit_card_bills')
                            .upsert(billsWithAccountId, { onConflict: 'pluggy_bill_id', ignoreDuplicates: false });

                        if (billError) throw new Error(`Erro ao salvar faturas: ${billError.message}`);
                        totalBillsSynced += billsWithAccountId.length || 0;
                        console.log(`🧾 ${billsWithAccountId.length || 0} faturas salvas/atualizadas.`);
                     }
                }
            }

            // 9. Upsert Transações Gerais
            if (connectionTransactions.length > 0) {
                console.log(`💾 Preparando ${connectionTransactions.length} transações gerais de ${connection.bank_name} para inserção.`);
                const transactionsToInsert = connectionTransactions.map((tx) => ({
                    user_id: user.id,
                    bank_connection_id: connection.id,
                    pluggy_transaction_id: tx.id,
                    description: tx.description || 'Sem descrição',
                    amount: Number(tx.amount?.toString() || '0'), // Garante número
                    transaction_date: tx.date.substring(0, 10), // Garante formato YYYY-MM-DD
                    category: tx.category || null,
                    // Usa o 'type' da Pluggy se disponível, senão calcula pelo amount
                    transaction_type: tx.type || (Number(tx.amount?.toString() || '0') >= 0 ? 'CREDIT' : 'DEBIT'),
                    balance: tx.balance ? Number(tx.balance.toString()) : null, // Garante número ou null
                }));

                const { error: insertTxError } = await supabaseAdmin
                    .from('transactions')
                    .upsert(transactionsToInsert, { onConflict: 'pluggy_transaction_id' }); // Ignore duplicates = true por padrão no upsert

                if (insertTxError) {
                    console.error(`❌ Erro ao inserir transações de ${connection.bank_name}:`, insertTxError);
                    // Decide se quer pular ou parar - aqui vamos continuar
                } else {
                     totalTransactionsSynced += connectionTransactions.length; // Soma apenas se inseriu/atualizou com sucesso
                     console.log(`✅ ${connectionTransactions.length} transações gerais inseridas/atualizadas para ${connection.bank_name}`);
                }
            }

            // 10. Atualizar 'last_sync_at' da Conexão
            await supabaseAdmin
                .from('bank_connections')
                .update({ last_sync_at: nowISO })
                .eq('id', connection.id);

        } catch (syncError: any) {
            console.error(`❌ Erro durante o upsert para conexão ${connection.id}:`, syncError.message);
            // Marcar a conexão com erro? Ou apenas logar e continuar? Por enquanto, continua.
             try { // Tenta atualizar o status da conexão para erro
                 await supabaseAdmin.from('bank_connections').update({ status: 'error', updated_at: nowISO }).eq('id', connection.id);
             } catch (updateError) { console.error("Falha ao atualizar status da conexão para erro:", updateError);}
        }

    } // Fim do loop de conexões

    console.log(`🏁 Sincronização concluída. Total Transações: ${totalTransactionsSynced}, Cartões: ${totalCardsSynced}, Faturas: ${totalBillsSynced}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalTransactionsSynced} transações, ${totalCardsSynced} cartões e ${totalBillsSynced} faturas processadas.`,
        transactions: totalTransactionsSynced // Mantém a chave original para compatibilidade
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Erro GERAL na sincronização:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper Type para pegar tipos de Insert/Update de tabelas
// Ex: type BillInsert = TableInsert<'credit_card_bills'>;
type TableInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];