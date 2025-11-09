import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

interface Member {
    user_id: number;
    username: string;
}

interface ExpenseEditFormProps {
    expenseId: number;
    members: Member[];
    onExpenseUpdated: () => void;
    onCancel: () => void;
}

export function ExpenseEditForm({ expenseId, members, onExpenseUpdated, onCancel }: ExpenseEditFormProps) {
    const [editExpenseDescription, setEditExpenseDescription] = useState("");
    const [editExpenseAmount, setEditExpenseAmount] = useState("");
    const [editExpenseDate, setEditExpenseDate] = useState("");
    const [editExpenseCategory, setEditExpenseCategory] = useState("");
    const [editExpensePaidBy, setEditExpensePaidBy] = useState<number | "">("");
    const [editExpenseSplits, setEditExpenseSplits] = useState<Record<number, string>>({});
    const [editIncludedMembers, setEditIncludedMembers] = useState<Set<number>>(new Set());
    const [editExpenseError, setEditExpenseError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadExpenseData();
    }, [expenseId]);

    const loadExpenseData = async () => {
        try {
            const response = await fetch(`/api/expenses/${expenseId}`);
            const data = await response.json();

            if (data.success) {
                setEditExpenseDescription(data.expense.description);
                setEditExpenseAmount(data.expense.amount.toString());
                setEditExpenseDate(data.expense.date);
                setEditExpenseCategory(data.expense.category || "");
                setEditExpensePaidBy(data.expense.paid_by);

                // Carregar splits
                const splits: Record<number, string> = {};
                const included = new Set<number>();
                data.splits.forEach((split: any) => {
                    splits[split.user_id] = split.amount.toString();
                    included.add(split.user_id);
                });

                // Adicionar membros que não estão na split com valor 0
                members.forEach((m) => {
                    if (!splits[m.user_id]) {
                        splits[m.user_id] = "0";
                    }
                });

                setEditExpenseSplits(splits);
                setEditIncludedMembers(included);
            }
        } catch (err) {
            console.error("Erro ao carregar despesa:", err);
        } finally {
            setLoading(false);
        }
    };

    const splitEquallyEdit = () => {
        const amount = parseFloat(editExpenseAmount);
        const includedCount = editIncludedMembers.size;

        if (!isNaN(amount) && includedCount > 0) {
            const perPerson = parseFloat((amount / includedCount).toFixed(2));
            const newSplits: Record<number, string> = {};

            // Atribuir valor base para todos
            members.forEach((m) => {
                if (editIncludedMembers.has(m.user_id)) {
                    newSplits[m.user_id] = perPerson.toFixed(2);
                } else {
                    newSplits[m.user_id] = "0";
                }
            });

            // Calcular diferença por causa de arredondamento
            const totalSplit = perPerson * includedCount;
            const difference = Math.round((amount - totalSplit) * 100) / 100;

            // Se houver diferença (centavos), adicionar ao pagador ou primeiro incluído
            if (Math.abs(difference) > 0.001) {
                let adjustUserId: number | null = null;

                // Prioridade 1: Adicionar ao pagador se estiver incluído
                if (editExpensePaidBy && editIncludedMembers.has(editExpensePaidBy)) {
                    adjustUserId = editExpensePaidBy;
                } else {
                    // Prioridade 2: Adicionar ao primeiro membro incluído
                    const firstIncluded = Array.from(editIncludedMembers)[0];
                    if (firstIncluded) {
                        adjustUserId = firstIncluded;
                    }
                }

                // Ajustar o valor
                if (adjustUserId !== null) {
                    const adjustedValue = perPerson + difference;
                    newSplits[adjustUserId] = adjustedValue.toFixed(2);
                }
            }

            setEditExpenseSplits(newSplits);
        }
    };

    const toggleMemberInclusionEdit = (userId: number) => {
        const newIncluded = new Set(editIncludedMembers);
        if (newIncluded.has(userId)) {
            newIncluded.delete(userId);
            setEditExpenseSplits({
                ...editExpenseSplits,
                [userId]: "0",
            });
        } else {
            newIncluded.add(userId);
        }
        setEditIncludedMembers(newIncluded);
    };

    const handleUpdateExpense = async (e: FormEvent) => {
        e.preventDefault();
        setEditExpenseError("");

        const amount = parseFloat(editExpenseAmount);
        if (isNaN(amount) || amount <= 0) {
            setEditExpenseError("Valor inválido");
            return;
        }

        if (!editExpensePaidBy) {
            setEditExpenseError("Selecione quem pagou");
            return;
        }

        if (editIncludedMembers.size === 0) {
            setEditExpenseError("Selecione pelo menos uma pessoa para dividir a despesa");
            return;
        }

        const splits = Object.entries(editExpenseSplits)
            .filter(([userId, value]) => editIncludedMembers.has(parseInt(userId)) && value && parseFloat(value) > 0)
            .map(([userId, value]) => ({
                userId: parseInt(userId),
                amount: parseFloat(value),
            }));

        if (splits.length === 0) {
            setEditExpenseError("Adicione pelo menos uma divisão");
            return;
        }

        const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
            setEditExpenseError(
                `Soma das divisões (R$ ${totalSplits.toFixed(2)}) não corresponde ao total (R$ ${amount.toFixed(2)})`
            );
            return;
        }

        try {
            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: editExpenseDescription,
                    amount,
                    paidBy: editExpensePaidBy,
                    date: editExpenseDate,
                    category: editExpenseCategory || null,
                    splits,
                }),
            });

            const data = await response.json();

            if (data.success) {
                onExpenseUpdated();
            } else {
                setEditExpenseError(data.error || "Erro ao atualizar despesa");
            }
        } catch (err) {
            setEditExpenseError("Erro ao atualizar despesa");
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">Carregando...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Edit className="h-5 w-5" />
                        Editar Despesa
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onCancel}
                    >
                        ✕
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleUpdateExpense} className="space-y-4">
                    <div className="grid grid-cols-5 gap-4">
                        <div className="space-y-2 col-span-5">
                            <Label htmlFor="edit-description">Descrição</Label>
                            <Input
                                id="edit-description"
                                type="text"
                                placeholder="Ex: Jantar no restaurante"
                                value={editExpenseDescription}
                                onChange={(e) => setEditExpenseDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 col-span-3">
                            <Label htmlFor="edit-amount">Valor (R$)</Label>
                            <Input
                                id="edit-amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={editExpenseAmount}
                                onChange={(e) => setEditExpenseAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="edit-date">Data</Label>
                            <Input
                                id="edit-date"
                                type="date"
                                value={editExpenseDate}
                                onChange={(e) => setEditExpenseDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 col-span-5">
                            <Label htmlFor="edit-paid-by">Quem pagou?</Label>
                            <select
                                id="edit-paid-by"
                                value={editExpensePaidBy}
                                onChange={(e) => setEditExpensePaidBy(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-input bg-background rounded-md"
                                required
                            >
                                <option value="">Selecione...</option>
                                {members.map((m) => (
                                    <option key={m.user_id} value={m.user_id}>
                                        {m.username}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2 col-span-5">
                            <Label htmlFor="edit-category">Categoria (opcional)</Label>
                            <Input
                                id="edit-category"
                                type="text"
                                placeholder="Ex: Alimentação"
                                value={editExpenseCategory}
                                onChange={(e) => setEditExpenseCategory(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <Label>Dividir entre</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {editIncludedMembers.size} de {members.length} pessoa{members.length !== 1 ? 's' : ''} selecionada{editIncludedMembers.size !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={splitEquallyEdit}
                                disabled={editIncludedMembers.size === 0}
                            >
                                Dividir igualmente
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            💡 Desmarque membros que não participarão desta despesa
                        </p>
                        <div className="space-y-2">
                            {members.map((member) => (
                                <div key={member.user_id} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={editIncludedMembers.has(member.user_id)}
                                        onChange={() => toggleMemberInclusionEdit(member.user_id)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span className={`text-sm w-32 ${!editIncludedMembers.has(member.user_id) ? 'text-gray-400 line-through' : ''}`}>
                                        {member.username}
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={editExpenseSplits[member.user_id] || ""}
                                        onChange={(e) =>
                                            setEditExpenseSplits({
                                                ...editExpenseSplits,
                                                [member.user_id]: e.target.value,
                                            })
                                        }
                                        disabled={!editIncludedMembers.has(member.user_id)}
                                        className={!editIncludedMembers.has(member.user_id) ? 'bg-gray-100' : ''}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {editExpenseError && (
                        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                            {editExpenseError}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                            Salvar Alterações
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

