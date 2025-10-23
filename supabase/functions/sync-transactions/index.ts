import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Buscar conexões bancárias do usuário
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

    // Autenticar com Pluggy
    const pluggyClientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const pluggyClientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

    if (!pluggyClientId || !pluggyClientSecret) {
      throw new Error('Credenciais Pluggy não configuradas');
    }

    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: pluggyClientId,
        clientSecret: pluggyClientSecret,
      }),
    });

    if (!authResponse.ok) {
      throw new Error(`Falha na autenticação Pluggy: ${authResponse.status}`);
    }

    const { apiKey } = await authResponse.json();
    console.log('✅ Autenticado com Pluggy');

    // Cliente Supabase com service role para inserir transações
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let totalTransactions = 0;

    // Buscar transações de cada conexão
    for (const connection of connections) {
      console.log(`🏦 Buscando transações de: ${connection.bank_name}`);

      try {
        const transactionsResponse = await fetch(
          `https://api.pluggy.ai/transactions?itemId=${connection.pluggy_item_id}`,
          {
            headers: { 'X-API-KEY': apiKey },
          }
        );

        if (!transactionsResponse.ok) {
          console.error(`❌ Erro ao buscar transações de ${connection.bank_name}: ${transactionsResponse.status}`);
          continue;
        }

        const { results: transactions } = await transactionsResponse.json();
        console.log(`📄 ${transactions.length} transações encontradas para ${connection.bank_name}`);

        if (transactions.length === 0) continue;

        // Preparar transações para inserção
        const transactionsToInsert = transactions.map((tx: any) => ({
          user_id: user.id,
          bank_connection_id: connection.id,
          pluggy_transaction_id: tx.id,
          description: tx.description || 'Sem descrição',
          amount: parseFloat(tx.amount || 0),
          transaction_date: tx.date,
          category: tx.category || null,
          transaction_type: parseFloat(tx.amount) >= 0 ? 'CREDIT' : 'DEBIT',
          balance: tx.balance ? parseFloat(tx.balance) : null,
        }));

        // Inserir transações (upsert para evitar duplicatas)
        const { error: insertError } = await supabaseAdmin
          .from('transactions')
          .upsert(transactionsToInsert, { onConflict: 'pluggy_transaction_id' });

        if (insertError) {
          console.error(`❌ Erro ao inserir transações de ${connection.bank_name}:`, insertError);
          continue;
        }

        totalTransactions += transactions.length;

        // Atualizar última sincronização
        await supabaseAdmin
          .from('bank_connections')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', connection.id);

        console.log(`✅ ${transactions.length} transações inseridas para ${connection.bank_name}`);
      } catch (error: any) {
        console.error(`❌ Erro processando ${connection.bank_name}:`, error.message);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${totalTransactions} transações sincronizadas com sucesso`,
        connections: connections.length,
        transactions: totalTransactions
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Erro na sincronização:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
