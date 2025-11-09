import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";
import { useState } from "react";
import { ExpenseDetails } from "./ExpenseDetails";
import { ExpenseHistory } from "./ExpenseHistory";

interface Expense {
    id: number;
    description: string;
    amount: number;
    paid_by_username: string;
    category?: string;
    date: string;
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
                <div className="space-y-3">
                    {expenses.map((expense) => (
                        <div key={expense.id} className="bg-gray-50 rounded-lg overflow-hidden">
                            <div
                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                onClick={() => loadExpenseDetails(expense.id)}
                            >
                                <div className="flex-1">
                                    <p className="font-medium">{expense.description}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Pago por {expense.paid_by_username} •{" "}
                                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                                        {expense.category && ` • ${expense.category}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-semibold text-lg">
                                        R$ {expense.amount.toFixed(2)}
                                    </span>
                                    <svg
                                        className={`w-5 h-5 text-gray-400 transition-transform ${expandedExpense === expense.id ? 'rotate-180' : ''
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
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

