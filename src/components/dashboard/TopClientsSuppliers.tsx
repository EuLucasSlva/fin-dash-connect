import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TopClientSupplier } from "@/hooks/useFinancialData"; // Importa a interface

interface TopClientsSuppliersProps {
  clients: TopClientSupplier[];
  suppliers: TopClientSupplier[];
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const TopClientsSuppliers = ({ clients, suppliers }: TopClientsSuppliersProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Clientes e Fornecedores</CardTitle>
        <CardDescription>Maiores fontes de receita e despesa (baseado na descrição)</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Clientes */}
        <div>
          <h4 className="font-medium mb-2 text-green-600">Top Clientes (Receita)</h4>
          {clients.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.name}>
                    <TableCell className="font-medium truncate max-w-[150px]" title={client.name}>{client.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(client.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados de clientes para exibir.</p>
          )}
        </div>

        {/* Top Fornecedores */}
        <div>
          <h4 className="font-medium mb-2 text-red-600">Top Fornecedores (Despesa)</h4>
           {suppliers.length > 0 ? (
            <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {suppliers.map((supplier) => (
                    <TableRow key={supplier.name}>
                        <TableCell className="font-medium truncate max-w-[150px]" title={supplier.name}>{supplier.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(supplier.totalAmount)}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
             </Table>
            ) : (
                 <p className="text-sm text-muted-foreground">Sem dados de fornecedores para exibir.</p>
            )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TopClientsSuppliers;