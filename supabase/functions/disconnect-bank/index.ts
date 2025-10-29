// supabase/functions/disconnect-bank/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Permitir POST
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Somente método POST permitido
  if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  try {
    // 1. Autenticar Usuário Supabase
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

    // 2. Obter bank_connection_id do corpo da requisição
    const { bank_connection_id } = await req.json();
    if (!bank_connection_id) {
        throw new Error('bank_connection_id is required');
    }
     console.log(`🔌 Tentando desconectar bank_connection_id: ${bank_connection_id} para user: ${user.id}`);


    // 3. Buscar a conexão no Supabase (usando Admin Client para segurança)
     const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: connection, error: connError } = await supabaseAdmin
        .from('bank_connections')
        .select('id, user_id, pluggy_item_id')
        .eq('id', bank_connection_id)
        .single();

     if (connError || !connection) {
         console.error("Erro ao buscar conexão ou não encontrada:", connError);
         throw new Error('Bank connection not found');
     }

     // 4. Verificar se a conexão pertence ao usuário autenticado
     if (connection.user_id !== user.id) {
          console.warn(`Usuário ${user.id} tentou desconectar conexão ${bank_connection_id} de outro usuário (${connection.user_id})`);
          throw new Error('Forbidden: You do not own this connection');
     }

    const pluggyItemId = connection.pluggy_item_id;
    console.log(`Encontrada conexão com Pluggy Item ID: ${pluggyItemId}`);

    // 5. Autenticar com Pluggy (necessário para deletar o Item)
    const pluggyClientId = Deno.env.get('PLUGGY_CLIENT_ID');
    const pluggyClientSecret = Deno.env.get('PLUGGY_CLIENT_SECRET');
    if (!pluggyClientId || !pluggyClientSecret) {
      throw new Error('Pluggy credentials not configured');
    }
    const authResponse = await fetch('https://api.pluggy.ai/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: pluggyClientId, clientSecret: pluggyClientSecret }),
    });
    if (!authResponse.ok) {
      throw new Error(`Pluggy authentication failed: ${authResponse.status}`);
    }
    const { apiKey } = await authResponse.json();
    console.log('Autenticado com Pluggy para deletar item.');


    // 6. Chamar API da Pluggy para deletar o Item
    const deleteResponse = await fetch(`https://api.pluggy.ai/items/${pluggyItemId}`, {
      method: 'DELETE',
      headers: { 'X-API-KEY': apiKey },
    });

    // Tratar resposta da Pluggy (ignorar erro 404 caso já tenha sido deletado)
    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const errorBody = await deleteResponse.text();
      console.error(`Erro ao deletar item ${pluggyItemId} na Pluggy: ${deleteResponse.status} ${errorBody}`);
      // Considerar se deve parar ou continuar (continuar permite remover do Supabase mesmo se falhar na Pluggy)
      // throw new Error(`Failed to delete Pluggy item: ${deleteResponse.status}`);
    } else if (deleteResponse.ok) {
        console.log(`Item ${pluggyItemId} deletado com sucesso na Pluggy.`);
    } else {
         console.log(`Item ${pluggyItemId} já não existia na Pluggy (status 404), continuando.`);
    }


    // 7. Deletar a conexão do Supabase
    const { error: deleteConnError } = await supabaseAdmin
        .from('bank_connections')
        .delete()
        .eq('id', bank_connection_id);

     if (deleteConnError) {
         console.error("Erro ao deletar conexão no Supabase:", deleteConnError);
         throw new Error('Failed to delete bank connection from database');
     }
     console.log(`Conexão ${bank_connection_id} deletada do Supabase.`);

    // Opcional: Deletar transações associadas (CUIDADO!)
    // const { error: deleteTxError } = await supabaseAdmin
    //     .from('transactions')
    //     .delete()
    //     .eq('bank_connection_id', bank_connection_id);
    // if (deleteTxError) console.error("Erro ao deletar transações:", deleteTxError);


    // 8. Retornar sucesso
    return new Response(
      JSON.stringify({ success: true, message: 'Bank connection disconnected successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in disconnect-bank function:', error);
    // Determinar o status code apropriado
     const statusCode = error.message.includes('Unauthorized') || error.message.includes('Forbidden') ? 401 :
                       error.message.includes('not found') ? 404 : 500;
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unknown error' }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});