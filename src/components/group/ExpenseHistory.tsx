interface ExpenseChange {
    changed_by_username: string;
    changed_at: string;
    field_name: string;
    old_value: string;
    new_value: string;
}

interface ExpenseHistoryProps {
    history: ExpenseChange[];
    expenseId: number;
}

export function ExpenseHistory({ history, expenseId }: ExpenseHistoryProps) {
    const fieldNames: Record<string, string> = {
        'description': 'Descrição',
        'amount': 'Valor',
        'paid_by': 'Pago por',
        'date': 'Data',
        'category': 'Categoria',
        'splits': 'Divisão'
    };

    if (history.length === 0) {
        return (
            <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">
                    Histórico de Mudanças
                </p>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-200 mb-2">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">Sem alterações</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Esta despesa não foi modificada desde sua criação
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">
                Histórico de Mudanças:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {history.map((change, index) => (
                    <div
                        key={`history-${expenseId}-${index}`}
                        className="text-xs bg-white p-2 rounded border border-gray-200"
                    >
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-gray-900">
                                {change.changed_by_username}
                            </span>
                            <span className="text-gray-500">
                                {new Date(change.changed_at).toLocaleString('pt-BR')}
                            </span>
                        </div>
                        <div className="text-gray-700">
                            <span className="font-medium">
                                {fieldNames[change.field_name] || change.field_name}:
                            </span>
                            <div className="mt-1 text-sm">
                                <span className="text-red-600 line-through">
                                    {change.old_value || '(vazio)'}
                                </span>
                                {' → '}
                                <span className="text-green-600">
                                    {change.new_value || '(vazio)'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

