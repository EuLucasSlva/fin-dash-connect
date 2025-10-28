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
      throw new Error('No authorization header');
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

    console.log('Creating connect token for user:', user.id);

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
      const errorText = await authResponse.text();
      console.error('Pluggy auth failed:', errorText);
      throw new Error(`Pluggy authentication failed: ${authResponse.status}`);
    }

    const { apiKey } = await authResponse.json();
    console.log('Pluggy authenticated successfully');

    // Criar connect token
    const connectTokenResponse = await fetch('https://api.pluggy.ai/connect_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        clientUserId: user.id,
      }),
    });

    if (!connectTokenResponse.ok) {
      const errorText = await connectTokenResponse.text();
      console.error('Connect token creation failed:', errorText);
      throw new Error(`Failed to create connect token: ${connectTokenResponse.status}`);
    }

    const { accessToken } = await connectTokenResponse.json();
    console.log('Connect token created successfully');

    return new Response(
      JSON.stringify({ accessToken }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
