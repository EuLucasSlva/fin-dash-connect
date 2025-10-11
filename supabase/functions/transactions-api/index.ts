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
    const url = new URL(req.url);
    const apiKey = url.searchParams.get('api_key');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar API key
    const { data: apiKeyData, error: keyError } = await supabaseClient
      .from('api_keys')
      .select('user_id, is_active')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar last_used_at
    await supabaseClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('api_key', apiKey);

    // Buscar transações do usuário
    let query = supabaseClient
      .from('transactions')
      .select('*')
      .eq('user_id', apiKeyData.user_id)
      .order('transaction_date', { ascending: false });

    if (from) {
      query = query.gte('transaction_date', from);
    }

    if (to) {
      query = query.lte('transaction_date', to);
    }

    const { data: transactions, error: txError } = await query;

    if (txError) {
      throw txError;
    }

    console.log(`Returning ${transactions?.length || 0} transactions for user ${apiKeyData.user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        count: transactions?.length || 0,
        transactions: transactions || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
