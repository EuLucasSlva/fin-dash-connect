import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PluggyWebhookEvent {
  event: string;
  data: {
    itemId: string;
    connectorId?: number;
    status?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event: PluggyWebhookEvent = await req.json();
    console.log('Pluggy webhook received:', event);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Processar eventos do Pluggy
    if (event.event === 'item/created' || event.event === 'item/updated') {
      console.log(`Processing ${event.event} for itemId: ${event.data.itemId}`);
      
      // Buscar transações do Pluggy para este item
      const pluggyClientId = Deno.env.get('PLUGGY_CLIENT_ID');
      const pluggyClientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');

      if (!pluggyClientId || !pluggyClientSecret) {
        throw new Error('Pluggy credentials not configured');
      }

      // Autenticar com Pluggy
      const authResponse = await fetch('https://api.pluggy.ai/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: pluggyClientId,
          clientSecret: pluggyClientSecret,
        }),
      });

      if (!authResponse.ok) {
        throw new Error(`Pluggy auth failed: ${authResponse.status}`);
      }

      const { apiKey } = await authResponse.json();

      // Buscar transações do item
      const transactionsResponse = await fetch(
        `https://api.pluggy.ai/transactions?itemId=${event.data.itemId}`,
        {
          headers: {
            'X-API-KEY': apiKey,
          },
        }
      );

      if (!transactionsResponse.ok) {
        throw new Error(`Failed to fetch transactions: ${transactionsResponse.status}`);
      }

      const { results: transactions } = await transactionsResponse.json();
      console.log(`Found ${transactions.length} transactions`);

      // Buscar conexão bancária
      const { data: bankConnection } = await supabaseClient
        .from('bank_connections')
        .select('user_id')
        .eq('pluggy_item_id', event.data.itemId)
        .single();

      if (!bankConnection) {
        console.error(`Bank connection not found for itemId: ${event.data.itemId}`);
        return new Response(
          JSON.stringify({ error: 'Bank connection not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Inserir transações no banco
      const transactionsToInsert = transactions.map((tx: any) => ({
        user_id: bankConnection.user_id,
        bank_connection_id: event.data.itemId,
        pluggy_transaction_id: tx.id,
        description: tx.description || 'Sem descrição',
        amount: parseFloat(tx.amount || 0),
        transaction_date: tx.date,
        category: tx.category || null,
        transaction_type: parseFloat(tx.amount) >= 0 ? 'CREDIT' : 'DEBIT',
        balance: tx.balance ? parseFloat(tx.balance) : null,
      }));

      const { error: insertError } = await supabaseClient
        .from('transactions')
        .upsert(transactionsToInsert, { onConflict: 'pluggy_transaction_id' });

      if (insertError) {
        console.error('Error inserting transactions:', insertError);
        throw insertError;
      }

      console.log(`Successfully inserted ${transactionsToInsert.length} transactions`);

      // Atualizar última sincronização
      await supabaseClient
        .from('bank_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('pluggy_item_id', event.data.itemId);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
