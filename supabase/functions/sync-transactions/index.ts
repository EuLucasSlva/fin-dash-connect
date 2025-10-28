import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface para simplificar a tipagem da conta Pluggy
interface PluggyAccount {
  id: string; // O accountId que precisamos
  // ... outras propriedades da conta que podem ser úteis no futuro
}

// Interface para simplificar a tipagem da transação Pluggy
interface PluggyTransaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO Date String
  category?: string | null;
  balance?: number | null;
  accountId: string; // Para referência, se necessário
  // ... outras propriedades da transação
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Autenticação do Usuário Supabase (sem alterações) ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }
    console.log(`🔄 Sincronizando transações para usuário: ${user.id}`);

    // --- Busca Conexões Bancárias (sem alterações) ---
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('bank_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active');
    if (connectionsError) throw connectionsError;
    if (!connections || connections.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Nenhuma conexão bancária encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`📊 Encontradas ${connections.length} conexões bancárias`);

    // --- Autenticação Pluggy (sem alterações) ---
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
      throw new Error(`Falha na autenticação Pluggy: ${authResponse.status}`);
    }
    const { apiKey } = await authResponse.json();
    console.log('✅ Autenticado com Pluggy');

    // --- Cliente Supabase Admin (sem alterações) ---
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let totalTransactionsSynced = 0; // Renomeado para clareza

    // --- **MODIFICAÇÃO PRINCIPAL COMEÇA AQUI** ---
    // Buscar transações para cada conexão, iterando por contas
    for (const connection of connections) {
      let connectionTransactions: PluggyTransaction[] = [];
      console.log(`🏦 Processando conexão: ${connection.bank_name} (ItemID: ${connection.pluggy_item_id})`);

      try {
        // 1. Buscar as contas associadas a este ItemId
        const accountsResponse = await fetch(
          `https://api.pluggy.ai/accounts?itemId=${connection.pluggy_item_id}`,
          { headers: { 'X-API-KEY': apiKey } }
        );

        if (!accountsResponse.ok) {
          console.error(`❌ Erro ao buscar contas de ${connection.bank_name} (ItemID: ${connection.pluggy_item_id}): ${accountsResponse.status}`);
          // Decide se quer pular esta conexão ou parar tudo
          continue; // Pula para a próxima conexão
        }

        const { results: accounts }: { results: PluggyAccount[] } = await accountsResponse.json();
        console.log(`🔍 Encontradas ${accounts.length} contas para ${connection.bank_name}`);

        if (accounts.length === 0) {
          console.log(`🤷 Nenhuma conta encontrada para ${connection.bank_name}, pulando.`);
          continue;
        }

        // 2. Para cada conta, buscar suas transações
        for (const account of accounts) {
          console.log(`🧾 Buscando transações da conta ${account.id} (${connection.bank_name})`);
          try {
            // *** AQUI USAMOS O accountId NA URL ***
            const transactionsResponse = await fetch(
              `https://api.pluggy.ai/transactions?accountId=${account.id}`,
              { headers: { 'X-API-KEY': apiKey } }
            );

            if (!transactionsResponse.ok) {
              // Log detalhado do erro da Pluggy
              const errorBody = await transactionsResponse.text();
              console.error(`❌ Erro ao buscar transações da conta ${account.id} (${connection.bank_name}): ${transactionsResponse.status} ${errorBody}`);
              // Decide se quer pular esta conta ou parar tudo
              continue; // Pula para a próxima conta
            }

            const { results: accountTransactions }: { results: PluggyTransaction[] } = await transactionsResponse.json();
            console.log(`📄 ${accountTransactions.length} transações encontradas para conta ${account.id}`);
            connectionTransactions.push(...accountTransactions);

          } catch (accountError: any) {
            console.error(`❌ Erro inesperado ao buscar transações da conta ${account.id}:`, accountError.message);
            continue; // Pula para a próxima conta em caso de erro de rede, etc.
          }
        } // Fim do loop de contas

        // 3. Inserir todas as transações coletadas para esta conexão
        if (connectionTransactions.length === 0) {
          console.log(`🤷 Nenhuma transação encontrada para ${connection.bank_name} após verificar todas as contas.`);
          // Atualiza last_sync_at mesmo se não houver transações novas
          await supabaseAdmin
            .from('bank_connections')
            .update({ last_sync_at: new Date().toISOString() })
            .eq('id', connection.id);
          continue; // Pula para a próxima conexão
        }

        console.log(`💾 Preparando ${connectionTransactions.length} transações totais de ${connection.bank_name} para inserção.`);

        const transactionsToInsert = connectionTransactions.map((tx) => ({
          user_id: user.id,
          bank_connection_id: connection.id,
          pluggy_transaction_id: tx.id, // Chave única da Pluggy
          description: tx.description || 'Sem descrição',
          amount: parseFloat(tx.amount?.toString() || '0'), // Garante que é número
          transaction_date: tx.date, // Pluggy retorna no formato YYYY-MM-DD ou ISO
          category: tx.category || null,
          transaction_type: parseFloat(tx.amount?.toString() || '0') >= 0 ? 'CREDIT' : 'DEBIT',
          balance: tx.balance ? parseFloat(tx.balance.toString()) : null, // Garante que é número ou null
          // account_id_pluggy: tx.accountId // Opcional: Adicione se quiser guardar qual conta Pluggy gerou a transação
        }));

        // Inserir transações (upsert para evitar duplicatas pelo pluggy_transaction_id)
        const { error: insertError } = await supabaseAdmin
          .from('transactions')
          .upsert(transactionsToInsert, { onConflict: 'pluggy_transaction_id' }); // IMPORTANTE: Garanta que existe unique constraint em 'pluggy_transaction_id'

        if (insertError) {
          console.error(`❌ Erro ao inserir transações de ${connection.bank_name}:`, insertError);
          // Decide se quer pular ou parar
          continue; // Pula para a próxima conexão
        }

        totalTransactionsSynced += connectionTransactions.length; // Soma as transações desta conexão

        // Atualizar última sincronização
        await supabaseAdmin
          .from('bank_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id);

        console.log(`✅ ${connectionTransactions.length} transações inseridas/atualizadas para ${connection.bank_name}`);

      } catch (connectionError: any) {
        // Captura erros gerais da conexão (ex: buscar contas)
        console.error(`❌ Erro processando ${connection.bank_name}:`, connectionError.message);
        continue; // Pula para a próxima conexão
      }
    } // --- **FIM DA MODIFICAÇÃO PRINCIPAL** ---

    console.log(`🏁 Sincronização concluída. Total de transações processadas: ${totalTransactionsSynced}`);

    // Retorna o número total de transações sincronizadas *nesta execução*
    return new Response(
      JSON.stringify({
        success: true,
        message: `${totalTransactionsSynced} transações sincronizadas com sucesso`,
        connections: connections.length,
        transactions: totalTransactionsSynced // Retorna o número correto agora
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    // Captura erros gerais (autenticação Supabase, Pluggy, etc.)
    console.error('❌ Erro GERAL na sincronização:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});