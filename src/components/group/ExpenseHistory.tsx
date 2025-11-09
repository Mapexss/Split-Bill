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
        'splits': 'Divisão',
        'payment': 'Pagamento'
    };

    if (history.length === 0) {
        return (
            <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium mb-3">
                    Histórico de Mudanças
                </p>
                <div className="bg-secondary/50 rounded-lg p-4 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-2">
                        <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium">Sem alterações</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        Esta despesa não foi modificada desde sua criação
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 pt-3 border-t">
            <p className="text-sm font-medium m-3">
                Histórico de Mudanças:
            </p>
            <div className="space-y-3 max-h-72 overflow-y-auto p-2 scrollbar-thin">
                {history.map((change, index) => (
                    <div
                        key={`history-${expenseId}-${index}`}
                        className="bg-secondary/30 p-3 rounded-lg border hover:bg-secondary/50 transition-colors"
                    >
                        <div className="flex justify-between items-start gap-2 mb-2 pb-2 border-b border-border/50">
                            <span className="font-semibold text-sm">
                                {change.changed_by_username}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(change.changed_at).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {change.field_name === 'payment' ? (
                                <div className="flex items-start gap-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                                    <div className="flex-shrink-0 mt-1">
                                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-green-600 dark:text-green-500 text-sm block mb-1">
                                            {fieldNames[change.field_name]}
                                        </span>
                                        <p className="text-sm break-words">
                                            {change.new_value}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                        {fieldNames[change.field_name] || change.field_name}
                                    </div>
                                    <div className="flex flex-col gap-1.5 text-sm">
                                        <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                                            <span className="text-destructive font-medium line-through break-all">
                                                {change.old_value || '(vazio)'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                            </svg>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                                            <span className="text-green-600 dark:text-green-500 font-medium break-all">
                                                {change.new_value || '(vazio)'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

