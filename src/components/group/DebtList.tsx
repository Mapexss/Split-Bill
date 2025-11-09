import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Debt {
    from: number;
    fromUsername: string;
    to: number;
    toUsername: string;
    amount: number;
}

interface DebtListProps {
    debts: Debt[];
    groupId: string;
    onSettlement: () => void;
}

export function DebtList({ debts, groupId, onSettlement }: DebtListProps) {
    const handleSettlement = async (debt: Debt) => {
        try {
            const response = await fetch("/api/settlements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    groupId: parseInt(groupId),
                    fromUser: debt.from,
                    toUser: debt.to,
                    amount: debt.amount,
                    note: `Pagamento registrado`,
                }),
            });

            const data = await response.json();

            if (data.success) {
                onSettlement();
            }
        } catch (err) {
            console.error("Erro ao registrar pagamento:", err);
        }
    };

    if (debts.length === 0) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Quem deve pagar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {debts.map((debt) => (
                    <div key={`debt-${debt.from}-${debt.to}-${debt.amount}`} className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-sm mb-2">
                            <span className="font-medium">{debt.fromUsername}</span> deve{" "}
                            <span className="font-bold text-orange-600">
                                R$ {debt.amount.toFixed(2)}
                            </span>{" "}
                            para <span className="font-medium">{debt.toUsername}</span>
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => handleSettlement(debt)}
                        >
                            Marcar como pago
                        </Button>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

