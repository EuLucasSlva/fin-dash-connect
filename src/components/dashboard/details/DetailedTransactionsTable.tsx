import * as React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ArrowRight } from 'lucide-react'; // Ícones para paginação

type Transaction = Database['public']['Tables']['transactions']['Row'];

interface DetailedTransactionsTableProps {
  transactions: Transaction[];
}

const ITEMS_PER_PAGE = 15; // Quantidade de itens por página

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '--';
  const numberValue = Number(value); // Garante que é número
  return numberValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string): string => {
    try {
        return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
        return dateString; // Retorna a string original se falhar
    }
}

const DetailedTransactionsTable = ({ transactions }: DetailedTransactionsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filterDescription, setFilterDescription] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'CREDIT', 'DEBIT'
  // Adicionar estados para outros filtros (data, categoria, conta) se necessário

  // Filtrar transações com base nos filtros ativos
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(tx => {
      const descriptionMatch = tx.description?.toLowerCase().includes(filterDescription.toLowerCase());
      const typeMatch = filterType === 'all' || tx.transaction_type === filterType;
      // Adicionar lógica para outros filtros aqui
      return descriptionMatch && typeMatch;
    });
  }, [transactions, filterDescription, filterType]);

  // Paginar os dados filtrados
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage]);

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <Card>
      <CardHeader>
        {/* Adicionar Filtros Aqui */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
           <Input
                placeholder="Buscar por descrição..."
                value={filterDescription}
                onChange={(e) => {
                    setFilterDescription(e.target.value);
                    setCurrentPage(1); // Reseta página ao filtrar
                }}
                className="max-w-xs"
            />
           <Select value={filterType} onValueChange={(value) => {
                setFilterType(value);
                setCurrentPage(1); // Reseta página ao filtrar
            }}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="CREDIT">Entradas</SelectItem>
                    <SelectItem value="DEBIT">Saídas</SelectItem>
                </SelectContent>
            </Select>
            {/* Adicionar DatePicker, Select de Categoria, Select de Conta aqui */}
             <span className="text-sm text-muted-foreground ml-auto">
                 {filteredTransactions.length} transações encontradas
             </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Saldo</TableHead> {/* Opcional */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => (
                  <TableRow key={tx.pluggy_transaction_id}>
                    <TableCell className="whitespace-nowrap">{formatDate(tx.transaction_date)}</TableCell>
                    <TableCell className="min-w-[200px]">{tx.description}</TableCell>
                    <TableCell>
                        {tx.category ? <Badge variant="outline">{tx.category}</Badge> : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium whitespace-nowrap ${tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(tx.amount)}
                    </TableCell>
                     <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                        {formatCurrency(tx.balance)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhuma transação encontrada com os filtros aplicados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Controles de Paginação */}
        {totalPages > 1 && (
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                >
                    Próxima
                    <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DetailedTransactionsTable;