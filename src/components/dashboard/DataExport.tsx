import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet } from "lucide-react";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Transaction = Database['public']['Tables']['transactions']['Row'];

interface DataExportProps {
  transactions: Transaction[];
}

const DataExport = ({ transactions }: DataExportProps) => {

  const exportToCSV = () => {
    if (!transactions || transactions.length === 0) {
      toast.error("Não há transações para exportar.");
      return;
    }

    try {
        const headers = ["ID", "Data", "Descrição", "Valor", "Tipo", "Categoria", "Saldo", "ID Conexão Banco", "ID Transação Pluggy"];
        // Mapeia os dados, tratando valores nulos e formatando a data
        const rows = transactions.map(tx => [
            tx.id,
            tx.transaction_date, // Mantém formato YYYY-MM-DD
            `"${tx.description?.replace(/"/g, '""') || ''}"`, // Trata aspas na descrição
            tx.amount.toFixed(2), // Garante formato numérico com 2 casas decimais
            tx.transaction_type,
            `"${tx.category?.replace(/"/g, '""') || ''}"`,
            tx.balance?.toFixed(2) ?? '', // Saldo pode ser nulo
            tx.bank_connection_id,
            tx.pluggy_transaction_id
        ]);

        // Cria o conteúdo CSV
        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        // Cria um link e simula o clique para download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `financehub_transacoes_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link); // Necessário para Firefox

        link.click(); // Inicia o download
        document.body.removeChild(link); // Remove o link
         toast.success("Exportação CSV iniciada!");

     } catch (error) {
         console.error("Erro ao exportar CSV:", error);
         toast.error("Ocorreu um erro ao gerar o arquivo CSV.");
     }
  };

  return (
    <Card>
      <CardHeader>
         <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            <CardTitle>Exportar Dados</CardTitle>
        </div>
        <CardDescription>Baixe suas transações ou conecte seu BI.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-4 items-start">
        <Button onClick={exportToCSV} variant="outline" disabled={!transactions || transactions.length === 0}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar para CSV
        </Button>
        {/* O ApiKeySection será renderizado separadamente no Dashboard */}
        {/* <ApiKeySection userId={userId} /> */}
      </CardContent>
    </Card>
  );
};

export default DataExport;