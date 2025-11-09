import { Button } from "@/components/ui/button";
import { Clock, Edit } from "lucide-react";

interface ExpenseSplit {
    user_id: number;
    username: string;
    amount: number;
}

interface ExpenseDetailsProps {
    splits: ExpenseSplit[];
    paidByUsername: string;
    totalAmount: number;
    onEdit: () => void;
    onShowHistory: () => void;
}

export function ExpenseDetails({
    splits,
    paidByUsername,
    totalAmount,
    onEdit,
    onShowHistory
}: ExpenseDetailsProps) {
    return (
        <div className="px-3 pb-3 pt-0 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2 mt-3">
                Divisão:
            </p>
            <div className="space-y-2">
                {splits.map((split) => (
                    <div
                        key={split.user_id}
                        className="flex items-center justify-between text-sm"
                    >
                        <span className="text-gray-700">
                            {split.username}
                        </span>
                        <span className="font-medium text-red-600">
                            -R$ {split.amount.toFixed(2)}
                        </span>
                    </div>
                ))}
                <div className="pt-2 mt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">
                            {paidByUsername} (pagou)
                        </span>
                        <span className="font-semibold text-green-600">
                            +R$ {totalAmount.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onEdit}
                        className="flex-1 gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        Editar
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onShowHistory}
                        className="flex-1 gap-2"
                    >
                        <Clock className="h-4 w-4" />
                        Histórico
                    </Button>
                </div>
            </div>
        </div>
    );
}

