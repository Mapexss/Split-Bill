import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";

interface Balance {
    userId: number;
    username: string;
    balance: number;
}

interface BalanceListProps {
    balances: Balance[];
}

export function BalanceList({ balances }: BalanceListProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Balanços
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {balances.map((balance) => (
                    <div
                        key={balance.userId}
                        className="flex items-center justify-between p-2 rounded"
                    >
                        <span className="text-sm">{balance.username}</span>
                        <span
                            className={`text-sm font-semibold flex items-center gap-1 ${balance.balance > 0
                                ? "text-green-600"
                                : balance.balance < 0
                                    ? "text-red-600"
                                    : "text-gray-600"
                                }`}
                        >
                            {balance.balance > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                            ) : balance.balance < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                            ) : null}
                            R$ {Math.abs(balance.balance).toFixed(2)}
                        </span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

