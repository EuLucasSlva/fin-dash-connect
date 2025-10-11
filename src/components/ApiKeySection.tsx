import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Key, Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ApiKeyData {
  id: string;
  api_key: string;
  name: string;
  created_at: string;
}

interface ApiKeySectionProps {
  userId?: string;
}

const ApiKeySection = ({ userId }: ApiKeySectionProps) => {
  const [apiKey, setApiKey] = useState<ApiKeyData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchApiKey = async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setApiKey(data);
      }
    };

    fetchApiKey();
  }, [userId]);

  const generateApiKey = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const newKey = `pbk_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          user_id: userId,
          api_key: newKey,
          name: "Power BI Key",
        })
        .select()
        .single();

      if (error) throw error;

      setApiKey(data);
      toast.success("API Key gerada com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao gerar API Key: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey.api_key);
      toast.success("API Key copiada!");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Key para Power BI
        </CardTitle>
        <CardDescription>
          Use esta chave para conectar seu template Power BI e visualizar suas transações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {apiKey ? (
          <>
            <div className="flex gap-2">
              <Input value={apiKey.api_key} readOnly className="font-mono" />
              <Button onClick={copyToClipboard} variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Endpoint da API: <code className="bg-muted px-2 py-1 rounded">
                {window.location.origin}/api/v1/transactions
              </code>
            </p>
            <Button onClick={generateApiKey} variant="outline" disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Gerar Nova Chave
            </Button>
          </>
        ) : (
          <Button onClick={generateApiKey} disabled={loading}>
            <Key className="mr-2 h-4 w-4" />
            {loading ? "Gerando..." : "Gerar API Key"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiKeySection;
