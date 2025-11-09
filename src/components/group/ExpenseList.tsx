import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Filter, History, Receipt, Tag, User, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ExpenseDetails } from "./ExpenseDetails";
import { ExpenseHistory } from "./ExpenseHistory";

interface Expense {
    id: number;
    description: string;
    amount: number;
    paid_by_username: string;
    category?: string;
    date: string;
    is_fully_paid?: boolean;
}

interface ExpenseSplit {
    user_id: number;
    username: string;
    amount: number;
}

interface ExpenseChange {
    changed_by_username: string;
    changed_at: string;
    field_name: string;
    old_value: string;
    new_value: string;
}

interface ExpenseListProps {
    expenses: Expense[];
    onEdit: (expenseId: number) => void;
}

export function ExpenseList({ expenses, onEdit }: ExpenseListProps) {
    const [expandedExpense, setExpandedExpense] = useState<number | null>(null);
    const [expenseDetails, setExpenseDetails] = useState<Record<number, ExpenseSplit[]>>({});
    const [showHistory, setShowHistory] = useState<number | null>(null);
    const [expenseHistory, setExpenseHistory] = useState<ExpenseChange[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<string>("pending"); // "all", "pending", "paid"

    // Obter lista única de pessoas
    const uniquePeople = useMemo(() => {
        const people = new Set(expenses.map(e => e.paid_by_username));
        return Array.from(people).sort();
    }, [expenses]);

    // Obter lista única de categorias
    const uniqueCategories = useMemo(() => {
        const categories = new Set(
            expenses
                .filter(e => e.category)
                .map(e => e.category!)
        );
        return Array.from(categories).sort();
    }, [expenses]);

    // Filtrar despesas
    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            // Filtro de pessoa
            if (selectedPerson && expense.paid_by_username !== selectedPerson) {
                return false;
            }
            
            // Filtro de categoria
            if (selectedCategory && expense.category !== selectedCategory) {
                return false;
            }
            
            // Filtro de status
            if (selectedStatus === "pending" && expense.is_fully_paid) {
                return false;
            }
            if (selectedStatus === "paid" && !expense.is_fully_paid) {
                return false;
            }
            
            return true;
        });
    }, [expenses, selectedPerson, selectedCategory, selectedStatus]);

    const clearFilters = () => {
        setSelectedPerson("");
        setSelectedCategory("");
        setSelectedStatus("pending"); // Volta ao padrão
    };

    const hasActiveFilters = selectedPerson || selectedCategory || selectedStatus !== "pending";

    const loadExpenseDetails = async (expenseId: number) => {
        if (expenseDetails[expenseId]) {
            setExpandedExpense(expandedExpense === expenseId ? null : expenseId);
            return;
        }

        try {
            const response = await fetch(`/api/expenses/${expenseId}`);
            const data = await response.json();

            if (data.success) {
                setExpenseDetails({
                    ...expenseDetails,
                    [expenseId]: data.splits,
                });
                setExpandedExpense(expenseId);
            }
        } catch (err) {
            console.error("Erro ao carregar detalhes da despesa:", err);
        }
    };

    const loadExpenseHistory = async (expenseId: number) => {
        if (showHistory === expenseId) {
            setShowHistory(null);
            return;
        }

        try {
            const response = await fetch(`/api/expenses/${expenseId}/history`);
            const data = await response.json();

            if (data.success) {
                setExpenseHistory(data.changes);
                setShowHistory(expenseId);
            }
        } catch (err) {
            console.error("Erro ao carregar histórico:", err);
        }
    };

    if (expenses.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        Despesas Recentes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-center text-muted-foreground py-8">
                        Nenhuma despesa ainda. Adicione a primeira!
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Despesas Recentes
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Filtros */}
                <div className="mb-4 pb-4 border-b space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-semibold">Filtros</span>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="ml-auto h-7 text-xs"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Limpar
                            </Button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Filtro de Status */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                <Filter className="h-3 w-3" />
                                Status
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="pending">Pendentes</option>
                                <option value="paid">Pagas</option>
                                <option value="all">Todas</option>
                            </select>
                        </div>

                        {/* Filtro de Pessoa */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Pago por
                            </label>
                            <select
                                value={selectedPerson}
                                onChange={(e) => setSelectedPerson(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Todas as pessoas</option>
                                {uniquePeople.map(person => (
                                    <option key={person} value={person}>{person}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro de Categoria */}
                        <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                Categoria
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Todas as categorias</option>
                                {uniqueCategories.map(category => (
                                    <option key={category} value={category}>{category}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Contador de resultados */}
                    {hasActiveFilters && (
                        <div className="text-xs text-muted-foreground pt-2">
                            {filteredExpenses.length} de {expenses.length} despesa{expenses.length !== 1 ? 's' : ''} {filteredExpenses.length !== 1 ? 'encontradas' : 'encontrada'}
                        </div>
                    )}
                </div>

                {/* Lista de despesas filtradas */}
                <div className="space-y-3">
                    {filteredExpenses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhuma despesa encontrada com os filtros selecionados</p>
                        </div>
                    ) : (
                        filteredExpenses.map((expense) => (
                        <div key={expense.id} className="bg-secondary/50 rounded-lg overflow-hidden border hover:border-primary/30 transition-all">
                            <div
                                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => loadExpenseDetails(expense.id)}
                            >
                                {/* Icon/Avatar */}
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Receipt className="h-5 w-5 text-primary" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    {/* Title and Category */}
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-base truncate">{expense.description}</h3>
                                            {expense.category && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <Tag className="w-3 h-3 text-primary" />
                                                    <span className="text-xs font-medium text-primary">{expense.category}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="text-xl font-bold text-primary">
                                                R$ {expense.amount.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3.5 h-3.5" />
                                            <span>Pago por <span className="font-medium text-foreground">{expense.paid_by_username}</span></span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{new Date(expense.date).toLocaleDateString('pt-BR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expand icon */}
                                <div className="flex-shrink-0">
                                    <svg
                                        className={`w-5 h-5 text-muted-foreground transition-transform ${expandedExpense === expense.id ? 'rotate-180' : ''
                                            }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 9l-7 7-7-7"
                                        />
                                    </svg>
                                </div>
                            </div>

                            {expandedExpense === expense.id && expenseDetails[expense.id] && (
                                <>
                                    <ExpenseDetails
                                        splits={expenseDetails[expense.id] || []}
                                        paidByUsername={expense.paid_by_username}
                                        totalAmount={expense.amount}
                                        onEdit={() => {
                                            onEdit(expense.id);
                                        }}
                                        onShowHistory={() => loadExpenseHistory(expense.id)}
                                    />
                                    {showHistory === expense.id && (
                                        <ExpenseHistory
                                            history={expenseHistory}
                                            expenseId={expense.id}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

