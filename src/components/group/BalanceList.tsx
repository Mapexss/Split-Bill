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
                    Balanço
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {balances.length === 0 ? (
                    <div className="flex items-center justify-center p-4 bg-green-500/10 rounded-lg border-2 border-green-500/20">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 mb-2">
                                <svg className="w-6 h-6 text-green-600 dark:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-500">Tudo quitado!</p>
                            <p className="text-xs text-green-600 dark:text-green-500 mt-1">R$ 0,00</p>
                        </div>
                    </div>
                ) : (
                    balances.map((balance) => (
                        <div
                            key={balance.userId}
                            className="flex items-center justify-between p-2 rounded"
                        >
                            <span className="text-sm">{balance.username}</span>
                            <span
                                className={`text-sm font-semibold flex items-center gap-1 ${balance.balance > 0
                                    ? "text-green-600 dark:text-green-500"
                                    : balance.balance < 0
                                        ? "text-destructive"
                                        : "text-muted-foreground"
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
                    ))
                )}
            </CardContent>
        </Card>
    );
}

