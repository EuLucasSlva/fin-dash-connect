import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopClientSupplier } from "@/hooks/useFinancialData";

interface ClientSupplierListProps {
  clients: TopClientSupplier[]; // Idealmente, buscaria a lista completa aqui
  suppliers: TopClientSupplier[]; // Idealmente, buscaria a lista completa aqui
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const ClientSupplierList = ({ clients, suppliers }: ClientSupplierListProps) => {
  // OBS: Atualmente, este componente recebe apenas os Top 5 do hook.
  // Para uma lista completa, seria necessário:
  // 1. Modificar o hook useFinancialData para calcular e retornar TODOS os clientes/fornecedores.
  // 2. Adicionar paginação a estas tabelas similar à DetailedTransactionsTable.

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clientes e Fornecedores</CardTitle>
        <CardDescription>
          Principais fontes de receita e despesa identificadas (baseado na descrição da transação).
          <span className="block text-xs italic">(Mostrando Top 5 atualmente)</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Clientes */}
        <div>
          <h3 className="font-semibold mb-3 text-lg text-green-600">Clientes (Receita)</h3>
          {clients.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Valor Total Recebido</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {clients.map((client, index) => (
                    <TableRow key={client.name + index}> {/* Usa index como parte da chave se nomes repetirem */}
                        <TableCell className="font-medium truncate max-w-[200px]" title={client.name}>{client.name}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{formatCurrency(client.totalAmount)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum cliente identificado.</p>
          )}
        </div>

        {/* Fornecedores */}
        <div>
          <h3 className="font-semibold mb-3 text-lg text-red-600">Fornecedores (Despesa)</h3>
           {suppliers.length > 0 ? (
             <div className="border rounded-md overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-right">Valor Total Gasto</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {suppliers.map((supplier, index) => (
                        <TableRow key={supplier.name + index}>
                            <TableCell className="font-medium truncate max-w-[200px]" title={supplier.name}>{supplier.name}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(supplier.totalAmount)}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
             </div>
            ) : (
                 <p className="text-sm text-muted-foreground">Nenhum fornecedor identificado.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientSupplierList;