import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, type FormEvent } from "react";

interface Member {
    user_id: number;
    username: string;
}

interface ExpenseAddFormProps {
    groupId: string;
    members: Member[];
    onExpenseAdded: () => void;
    onCancel: () => void;
}

export function ExpenseAddForm({ groupId, members, onExpenseAdded, onCancel }: ExpenseAddFormProps) {
    const [expenseDescription, setExpenseDescription] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0] || "");
    const [expenseCategory, setExpenseCategory] = useState("");
    const [expensePaidBy, setExpensePaidBy] = useState<number | "">("");
    const [expenseSplits, setExpenseSplits] = useState<Record<number, string>>(() => {
        const initialSplits: Record<number, string> = {};
        members.forEach((m) => {
            initialSplits[m.user_id] = "";
        });
        return initialSplits;
    });
    const [includedMembers, setIncludedMembers] = useState<Set<number>>(() => {
        const allMemberIds = new Set<number>();
        members.forEach((m) => {
            allMemberIds.add(m.user_id);
        });
        return allMemberIds;
    });
    const [expenseError, setExpenseError] = useState("");

    const splitEqually = () => {
        const amount = parseFloat(expenseAmount);
        const includedCount = includedMembers.size;

        if (!isNaN(amount) && includedCount > 0) {
            const perPerson = parseFloat((amount / includedCount).toFixed(2));
            const newSplits: Record<number, string> = {};

            // Atribuir valor base para todos
            members.forEach((m) => {
                if (includedMembers.has(m.user_id)) {
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
                if (expensePaidBy && includedMembers.has(expensePaidBy)) {
                    adjustUserId = expensePaidBy;
                } else {
                    // Prioridade 2: Adicionar ao primeiro membro incluído
                    const firstIncluded = Array.from(includedMembers)[0];
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

            setExpenseSplits(newSplits);
        }
    };

    const toggleMemberInclusion = (userId: number) => {
        const newIncluded = new Set(includedMembers);
        if (newIncluded.has(userId)) {
            newIncluded.delete(userId);
            setExpenseSplits({
                ...expenseSplits,
                [userId]: "0",
            });
        } else {
            newIncluded.add(userId);
        }
        setIncludedMembers(newIncluded);
    };

    const handleAddExpense = async (e: FormEvent) => {
        e.preventDefault();
        setExpenseError("");

        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) {
            setExpenseError("Valor inválido");
            return;
        }

        if (!expensePaidBy) {
            setExpenseError("Selecione quem pagou");
            return;
        }

        if (includedMembers.size === 0) {
            setExpenseError("Selecione pelo menos uma pessoa para dividir a despesa");
            return;
        }

        const splits = Object.entries(expenseSplits)
            .filter(([_, value]) => value && parseFloat(value) > 0)
            .map(([userId, value]) => ({
                userId: parseInt(userId),
                amount: parseFloat(value),
            }));

        if (splits.length === 0) {
            setExpenseError("Adicione pelo menos uma divisão");
            return;
        }

        const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
            setExpenseError(
                `Soma das divisões (R$ ${totalSplits.toFixed(2)}) não corresponde ao total (R$ ${amount.toFixed(2)})`
            );
            return;
        }

        try {
            const response = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    groupId: parseInt(groupId),
                    description: expenseDescription,
                    amount,
                    paidBy: expensePaidBy,
                    date: expenseDate,
                    category: expenseCategory || null,
                    splits,
                }),
            });

            const data = await response.json();

            if (data.success) {
                onExpenseAdded();
            } else {
                setExpenseError(data.error || "Erro ao adicionar despesa");
            }
        } catch (err) {
            setExpenseError("Erro ao adicionar despesa");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nova Despesa</CardTitle>
                <CardDescription>Adicione uma despesa para dividir com o grupo</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleAddExpense} className="space-y-4">
                    <div className="grid grid-cols-5 gap-4">
                        <div className="space-y-2 col-span-5">
                            <Label htmlFor="description">Descrição</Label>
                            <Input
                                id="description"
                                type="text"
                                placeholder="Ex: Jantar no restaurante"
                                value={expenseDescription}
                                onChange={(e) => setExpenseDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 col-span-3">
                            <Label htmlFor="amount">Valor (R$)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={expenseAmount}
                                onChange={(e) => setExpenseAmount(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label htmlFor="date">Data</Label>
                            <Input
                                id="date"
                                type="date"
                                value={expenseDate}
                                onChange={(e) => setExpenseDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2 col-span-5">
                            <Label htmlFor="paidBy">Quem pagou?</Label>
                            <select
                                id="paidBy"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={expensePaidBy}
                                onChange={(e) => setExpensePaidBy(parseInt(e.target.value))}
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
                            <Label htmlFor="category">Categoria (opcional)</Label>
                            <Input
                                id="category"
                                type="text"
                                placeholder="Ex: Alimentação"
                                value={expenseCategory}
                                onChange={(e) => setExpenseCategory(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <Label>Dividir entre</Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {includedMembers.size} de {members.length} pessoa{members.length !== 1 ? 's' : ''} selecionada{includedMembers.size !== 1 ? 's' : ''}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={splitEqually}
                                disabled={includedMembers.size === 0}
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
                                        checked={includedMembers.has(member.user_id)}
                                        onChange={() => toggleMemberInclusion(member.user_id)}
                                        className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span className={`text-sm w-32 ${!includedMembers.has(member.user_id) ? 'text-gray-400 line-through' : ''}`}>
                                        {member.username}
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={expenseSplits[member.user_id] || ""}
                                        onChange={(e) =>
                                            setExpenseSplits({
                                                ...expenseSplits,
                                                [member.user_id]: e.target.value,
                                            })
                                        }
                                        disabled={!includedMembers.has(member.user_id)}
                                        className={!includedMembers.has(member.user_id) ? 'bg-gray-100' : ''}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {expenseError && (
                        <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                            {expenseError}
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                            Adicionar Despesa
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

