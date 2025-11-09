import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Calendar, ChevronDown, ChevronRight, CreditCard, Tag } from "lucide-react";
import { useState } from "react";

interface ExpenseDebt {
    expenseId: number;
    expenseDescription: string;
    expenseDate: string;
    expenseCategory?: string;
    from: number;
    fromUsername: string;
    to: number;
    toUsername: string;
    amount: number;
    totalExpenseAmount: number;
}

interface DebtWithDetails {
    from: number;
    fromUsername: string;
    to: number;
    toUsername: string;
    amount: number;
    expenses: ExpenseDebt[];
}

interface DebtListProps {
    debtsWithDetails: DebtWithDetails[];
    groupId: string;
    currentUserId: number | null;
    onSettlement: () => void;
}

export function DebtList({ debtsWithDetails, groupId, currentUserId, onSettlement }: DebtListProps) {
    const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
    const [confirmingDebt, setConfirmingDebt] = useState<DebtWithDetails | null>(null);
    const [confirmingExpense, setConfirmingExpense] = useState<ExpenseDebt | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Calcular quanto o usuário atual tem a receber
    const amountToReceive = debtsWithDetails
        .filter(debt => debt.to === currentUserId)
        .reduce((total, debt) => total + debt.amount, 0);

    // Calcular quanto o usuário atual tem a pagar
    const amountToPay = debtsWithDetails
        .filter(debt => debt.from === currentUserId)
        .reduce((total, debt) => total + debt.amount, 0);

    // Calcular o balanço líquido (positivo = receberá mais do que pagará)
    const netBalance = amountToReceive - amountToPay;

    const handleSettlement = async () => {
        if (!confirmingDebt) return;

        setIsProcessing(true);
        try {
            // Preparar lista de despesas com seus valores
            const expenses = confirmingDebt.expenses.map(exp => ({
                expenseId: exp.expenseId,
                amount: exp.amount
            }));

            const response = await fetch("/api/debt-settlements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    groupId: parseInt(groupId),
                    fromUser: confirmingDebt.from,
                    toUser: confirmingDebt.to,
                    expenses: expenses,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setConfirmingDebt(null);
                onSettlement();
            }
        } catch (err) {
            console.error("Erro ao registrar pagamento:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExpenseSettlement = async () => {
        if (!confirmingExpense) return;

        setIsProcessing(true);
        try {
            const response = await fetch("/api/expense-settlements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    groupId: parseInt(groupId),
                    expenseId: confirmingExpense.expenseId,
                    fromUser: confirmingExpense.from,
                    toUser: confirmingExpense.to,
                    amount: confirmingExpense.amount,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setConfirmingExpense(null);
                onSettlement();
            }
        } catch (err) {
            console.error("Erro ao registrar pagamento da despesa:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleExpanded = (debtKey: string) => {
        setExpandedDebt(expandedDebt === debtKey ? null : debtKey);
    };

    return (
        <Card className="shadow-md">
            <CardHeader className="bg-primary/10 border-b">
                <div className="flex flex-col gap-3">
                    <CardTitle className="text-lg font-bold">💰 Quem deve pagar</CardTitle>
                    {currentUserId && (
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Valor a receber */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border-2 border-green-500/20">
                                <span className="text-xs font-medium text-muted-foreground">A receber:</span>
                                <span className="text-sm font-bold text-green-600 dark:text-green-500">
                                    R$ {amountToReceive.toFixed(2)}
                                </span>
                            </div>

                            {/* Valor a pagar */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 rounded-full border-2 border-orange-500/20">
                                <span className="text-xs font-medium text-muted-foreground">A pagar:</span>
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-500">
                                    R$ {amountToPay.toFixed(2)}
                                </span>
                            </div>

                            {/* Balanço líquido */}
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${netBalance > 0
                                    ? 'bg-emerald-500/10 border-emerald-500/20'
                                    : netBalance < 0
                                        ? 'bg-red-500/10 border-red-500/20'
                                        : 'bg-gray-500/10 border-gray-500/20'
                                }`}>
                                <span className="text-xs font-medium text-muted-foreground">Balanço:</span>
                                <span className={`text-sm font-bold ${netBalance > 0
                                        ? 'text-emerald-600 dark:text-emerald-500'
                                        : netBalance < 0
                                            ? 'text-red-600 dark:text-red-500'
                                            : 'text-gray-600 dark:text-gray-500'
                                    }`}>
                                    {netBalance > 0 ? '+' : ''}R$ {netBalance.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {debtsWithDetails.length === 0 ? (
                    <div className="flex items-center justify-center p-4 bg-green-500/10 rounded-lg border-2 border-green-500/20">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-2">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-500">Tudo pago!</p>
                            <p className="text-xs text-green-600 dark:text-green-500 mt-1">R$ 0,00</p>
                        </div>
                    </div>
                ) : (
                    debtsWithDetails.map((debt) => {
                        const debtKey = `debt-${debt.from}-${debt.to}`;
                        const isExpanded = expandedDebt === debtKey;

                        return (
                            <div
                                key={debtKey}
                                className="border-2 border-primary/20 bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                            >
                                {/* Header com resumo da dívida */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                                                {debt.fromUsername.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-base font-semibold">
                                                    {debt.fromUsername}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    deve para <span className="font-semibold">{debt.toUsername}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 mt-2 pl-12">
                                            <div className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full">
                                                <span className="text-lg font-bold">R$ {debt.amount.toFixed(2)}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground bg-secondary px-3 py-1 rounded-full border">
                                                {debt.expenses.length} despesa{debt.expenses.length !== 1 ? "s" : ""}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleExpanded(debtKey)}
                                        className="ml-3 p-2 rounded-full hover:bg-accent transition-colors text-primary"
                                        title={isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                                    >
                                        {isExpanded ? (
                                            <ChevronDown className="w-6 h-6" />
                                        ) : (
                                            <ChevronRight className="w-6 h-6" />
                                        )}
                                    </button>
                                </div>

                                {/* Detalhes das despesas (expansível) */}
                                {isExpanded && (
                                    <div className="mt-4 mb-4 space-y-3 border-t-2 border-primary/30 pt-4">
                                        <p className="text-sm font-bold flex items-center gap-2">
                                            <CreditCard className="w-4 h-4" />
                                            Detalhes das despesas:
                                        </p>
                                        {debt.expenses.map((expense) => (
                                            <div
                                                key={`expense-${expense.expenseId}`}
                                                className="bg-secondary/50 border-2 border-primary/20 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="mb-3">
                                                    <p className="text-base font-semibold mb-2">
                                                        {expense.expenseDescription}
                                                    </p>
                                                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4 text-primary" />
                                                            <span>{new Date(expense.expenseDate).toLocaleDateString("pt-BR")}</span>
                                                        </div>
                                                        {expense.expenseCategory && (
                                                            <div className="flex items-center gap-1">
                                                                <Tag className="w-4 h-4 text-primary" />
                                                                <span>{expense.expenseCategory}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 p-3 bg-primary/10 rounded-lg border-2 border-primary/30">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-medium">
                                                                Sua parte:
                                                            </span>
                                                            <span className="text-xl font-bold text-primary">
                                                                R$ {expense.amount.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between pt-2 border-t border-border">
                                                            <span className="text-xs text-muted-foreground">
                                                                Total da despesa:
                                                            </span>
                                                            <span className="text-sm font-medium">
                                                                R$ {expense.totalExpenseAmount.toFixed(2)}
                                                            </span>
                                                        </div>
                                                        {expense.amount < expense.totalExpenseAmount && (
                                                            <div className="mt-2 pt-2 border-t border-border">
                                                                <div className="text-xs text-muted-foreground text-center">
                                                                    {((expense.amount / expense.totalExpenseAmount) * 100).toFixed(0)}% do total
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="default"
                                                    variant="outline"
                                                    className="w-full border-2 border-primary hover:bg-primary/10 font-semibold"
                                                    onClick={() => setConfirmingExpense(expense)}
                                                >
                                                    Pagar esta despesa (R$ {expense.amount.toFixed(2)})
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Botão para pagar tudo */}
                                <Button
                                    size="lg"
                                    className="w-full font-bold shadow-md text-base py-6"
                                    onClick={() => setConfirmingDebt(debt)}
                                >
                                    ✓ Marcar tudo como pago (R$ {debt.amount.toFixed(2)})
                                </Button>
                            </div>
                        );
                    })
                )}
            </CardContent>

            {/* Modal de confirmação para pagamento total */}
            <AlertDialog open={!!confirmingDebt} onOpenChange={() => setConfirmingDebt(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-primary" />
                            Confirmar pagamento
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmingDebt && (
                                <div className="space-y-3 mt-2">
                                    <p className="text-base">
                                        Deseja confirmar o pagamento de <strong>{confirmingDebt.fromUsername}</strong> para <strong>{confirmingDebt.toUsername}</strong>?
                                    </p>
                                    <div className="bg-primary/10 p-3 rounded-lg border-2 border-primary/30">
                                        <p className="text-sm text-muted-foreground mb-1">Valor total:</p>
                                        <p className="text-2xl font-bold text-primary">
                                            R$ {confirmingDebt.amount.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {confirmingDebt.expenses.length} despesa{confirmingDebt.expenses.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Esta ação registrará o pagamento de todas as despesas pendentes.
                                    </p>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmingDebt(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleSettlement}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Processando..." : "Confirmar pagamento"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Modal de confirmação para pagamento de despesa individual */}
            <AlertDialog open={!!confirmingExpense} onOpenChange={() => setConfirmingExpense(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-primary" />
                            Confirmar pagamento da despesa
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmingExpense && (
                                <div className="space-y-3 mt-2">
                                    <div className="bg-secondary/50 p-3 rounded-lg border">
                                        <p className="font-semibold mb-1">
                                            {confirmingExpense.expenseDescription}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Calendar className="w-3 h-3" />
                                            <span>{new Date(confirmingExpense.expenseDate).toLocaleDateString("pt-BR")}</span>
                                            {confirmingExpense.expenseCategory && (
                                                <>
                                                    <span>•</span>
                                                    <Tag className="w-3 h-3" />
                                                    <span>{confirmingExpense.expenseCategory}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-base">
                                        <strong>{confirmingExpense.fromUsername}</strong> pagará para <strong>{confirmingExpense.toUsername}</strong>:
                                    </p>
                                    <div className="bg-primary/10 p-3 rounded-lg border-2 border-primary/30">
                                        <p className="text-sm text-muted-foreground mb-1">Valor a pagar:</p>
                                        <p className="text-2xl font-bold text-primary">
                                            R$ {confirmingExpense.amount.toFixed(2)}
                                        </p>
                                        {confirmingExpense.amount < confirmingExpense.totalExpenseAmount && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                ({((confirmingExpense.amount / confirmingExpense.totalExpenseAmount) * 100).toFixed(0)}% de R$ {confirmingExpense.totalExpenseAmount.toFixed(2)})
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmingExpense(null)}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleExpenseSettlement}
                            disabled={isProcessing}
                        >
                            {isProcessing ? "Processando..." : "Confirmar pagamento"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

