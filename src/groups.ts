import { db } from "./db";

// Tipos
export interface Group {
    id: number;
    name: string;
    description?: string;
    created_by: number;
    created_at: string;
    public_id?: string;
    open_to_invites?: number;
}

export interface GroupMember {
    id: number;
    group_id: number;
    user_id: number;
    username: string;
    joined_at: string;
}

export interface Expense {
    id: number;
    group_id: number;
    description: string;
    amount: number;
    paid_by: number;
    paid_by_username: string;
    category?: string;
    date: string;
    created_at: string;
    is_fully_paid?: boolean;
}

export interface ExpenseSplit {
    expense_id: number;
    user_id: number;
    username: string;
    amount: number;
}

// Criar grupo
export function createGroup(name: string, description: string | null, createdBy: number): number {
    // Gerar UUID para public_id
    const publicId = crypto.randomUUID();

    const result = db
        .query("INSERT INTO groups (name, description, created_by, public_id, open_to_invites) VALUES (?, ?, ?, ?, ?)")
        .run(name, description, createdBy, publicId, 0);

    const groupId = Number(result.lastInsertRowid);

    // Adicionar criador como membro
    db.query("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)")
        .run(groupId, createdBy);

    return groupId;
}

// Listar grupos do usuário
export function getUserGroups(userId: number): Group[] {
    return db
        .query(
            `SELECT DISTINCT g.* FROM groups g
       INNER JOIN group_members gm ON g.id = gm.group_id
       WHERE gm.user_id = ? AND g.deleted_at IS NULL
       ORDER BY g.created_at DESC`
        )
        .all(userId) as Group[];
}

// Obter detalhes do grupo
export function getGroup(groupId: number): Group | null {
    return db
        .query("SELECT * FROM groups WHERE id = ? AND deleted_at IS NULL")
        .get(groupId) as Group | null;
}

// Obter grupo por public_id
export function getGroupByPublicId(publicId: string): Group | null {
    return db
        .query("SELECT * FROM groups WHERE public_id = ? AND deleted_at IS NULL")
        .get(publicId) as Group | null;
}

// Verificar se usuário é membro do grupo
export function isGroupMember(groupId: number, userId: number): boolean {
    const result = db
        .query(`SELECT gm.id FROM group_members gm
                INNER JOIN groups g ON gm.group_id = g.id
                WHERE gm.group_id = ? AND gm.user_id = ? AND g.deleted_at IS NULL`)
        .get(groupId, userId);
    return result !== null;
}

// Obter membros do grupo
export function getGroupMembers(groupId: number): GroupMember[] {
    return db
        .query(
            `SELECT gm.*, u.username 
       FROM group_members gm
       INNER JOIN users u ON gm.user_id = u.id
       INNER JOIN groups g ON gm.group_id = g.id
       WHERE gm.group_id = ? AND g.deleted_at IS NULL
       ORDER BY gm.joined_at`
        )
        .all(groupId) as GroupMember[];
}

// Adicionar membro ao grupo
export function addGroupMember(groupId: number, userId: number): boolean {
    try {
        db.query("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)")
            .run(groupId, userId);
        return true;
    } catch {
        return false;
    }
}

// Adicionar despesa
export function addExpense(
    groupId: number,
    description: string,
    amount: number,
    paidBy: number,
    date: string,
    category: string | null,
    splits: { userId: number; amount: number }[]
): number {
    // Inserir despesa
    const result = db
        .query(
            "INSERT INTO expenses (group_id, description, amount, paid_by, date, category) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(groupId, description, amount, paidBy, date, category);

    const expenseId = Number(result.lastInsertRowid);

    // Inserir divisões
    const insertSplit = db.prepare(
        "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)"
    );

    for (const split of splits) {
        insertSplit.run(expenseId, split.userId, split.amount);
    }

    return expenseId;
}

// Listar despesas do grupo
export function getGroupExpenses(groupId: number): Expense[] {
    const expenses = db
        .query(
            `SELECT e.*, u.username as paid_by_username
       FROM expenses e
       INNER JOIN users u ON e.paid_by = u.id
       INNER JOIN groups g ON e.group_id = g.id
       WHERE e.group_id = ? AND g.deleted_at IS NULL
       ORDER BY e.date DESC, e.created_at DESC`
        )
        .all(groupId) as Expense[];

    // Adicionar informação sobre se a despesa está totalmente paga
    return expenses.map(expense => ({
        ...expense,
        is_fully_paid: isExpenseFullyPaid(expense.id)
    }));
}

// Verificar se uma despesa está totalmente paga
export function isExpenseFullyPaid(expenseId: number): boolean {
    // Buscar todas as splits da despesa
    const splits = getExpenseSplits(expenseId);

    // Buscar todos os settlements vinculados a esta despesa
    const settlements = db
        .query("SELECT * FROM settlements WHERE expense_id = ?")
        .all(expenseId) as any[];

    // Criar mapa de pagamentos por pessoa (from_user -> to_user)
    const paidAmounts = new Map<string, number>();

    for (const settlement of settlements) {
        const key = `${settlement.from_user}-${settlement.to_user}`;
        paidAmounts.set(key, (paidAmounts.get(key) || 0) + settlement.amount);
    }

    // Buscar quem pagou a despesa
    const expense = db.query("SELECT paid_by FROM expenses WHERE id = ?").get(expenseId) as any;
    if (!expense) return false;

    // Verificar se cada split está paga
    for (const split of splits) {
        // Se a pessoa é a mesma que pagou, não precisa pagar a si mesma
        if (split.user_id === expense.paid_by) continue;

        const key = `${split.user_id}-${expense.paid_by}`;
        const amountPaid = paidAmounts.get(key) || 0;

        // Se não pagou o suficiente, a despesa não está totalmente paga
        if (amountPaid < split.amount - 0.01) {
            return false;
        }
    }

    return true;
}

// Obter divisões de uma despesa
export function getExpenseSplits(expenseId: number): ExpenseSplit[] {
    return db
        .query(
            `SELECT es.*, u.username
       FROM expense_splits es
       INNER JOIN users u ON es.user_id = u.id
       WHERE es.expense_id = ?`
        )
        .all(expenseId) as ExpenseSplit[];
}

// Calcular balanços do grupo (quem deve para quem)
export interface Balance {
    userId: number;
    username: string;
    balance: number; // positivo = deve receber, negativo = deve pagar
}

export interface Debt {
    from: number;
    fromUsername: string;
    to: number;
    toUsername: string;
    amount: number;
}

export interface ExpenseDebt {
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

export interface DebtWithDetails extends Debt {
    expenses: ExpenseDebt[];
}

export function calculateGroupBalances(groupId: number): Balance[] {
    // Obter todos os membros
    const members = getGroupMembers(groupId);
    const balances: Map<number, { username: string; balance: number }> = new Map();

    // Inicializar balanços
    for (const member of members) {
        balances.set(member.user_id, { username: member.username, balance: 0 });
    }

    // Obter todas as despesas
    const expenses = getGroupExpenses(groupId);

    for (const expense of expenses) {
        const splits = getExpenseSplits(expense.id);

        // Quem pagou deve receber de volta
        const payer = balances.get(expense.paid_by);
        if (payer) {
            payer.balance += expense.amount;
        }

        // Quem deve pagar sua parte
        for (const split of splits) {
            const debtor = balances.get(split.user_id);
            if (debtor) {
                debtor.balance -= split.amount;
            }
        }
    }

    // Subtrair settlements (pagamentos já realizados)
    const settlements = db
        .query("SELECT * FROM settlements WHERE group_id = ?")
        .all(groupId) as any[];

    for (const settlement of settlements) {
        const from = balances.get(settlement.from_user);
        const to = balances.get(settlement.to_user);

        if (from) from.balance += settlement.amount; // from pagou, então sua dívida diminui
        if (to) to.balance -= settlement.amount; // to recebeu, então o que deve receber diminui
    }

    return Array.from(balances.entries())
        .map(([userId, data]) => ({
            userId,
            username: data.username,
            balance: Math.round(data.balance * 100) / 100, // arredondar para 2 casas decimais
        }))
        .filter(balance => Math.abs(balance.balance) > 0.01); // Filtrar balanços muito próximos de zero
}

// Calcular quem deve pagar para quem (simplificado)
export function calculateDebts(groupId: number): Debt[] {
    const balances = calculateGroupBalances(groupId);

    const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

    const debts: Debt[] = [];

    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i]!;
        const debtor = debtors[j]!;

        const amount = Math.min(creditor.balance, Math.abs(debtor.balance));

        if (amount > 0.01) {
            debts.push({
                from: debtor.userId,
                fromUsername: debtor.username,
                to: creditor.userId,
                toUsername: creditor.username,
                amount: Math.round(amount * 100) / 100,
            });
        }

        creditor.balance -= amount;
        debtor.balance += amount;

        if (creditor.balance < 0.01) i++;
        if (debtor.balance > -0.01) j++;
    }

    return debts;
}

// Calcular dívidas detalhadas por despesa
export function calculateDebtsWithDetails(groupId: number): DebtWithDetails[] {
    const expenses = getGroupExpenses(groupId);
    const members = getGroupMembers(groupId);

    // Buscar todos os settlements
    const settlements = db
        .query("SELECT * FROM settlements WHERE group_id = ?")
        .all(groupId) as any[];

    // Criar mapa de pagamentos por despesa específica
    const paidExpenses = new Map<string, number>(); // key: "from-to-expenseId", value: total pago

    for (const settlement of settlements) {
        if (settlement.expense_id) {
            const key = `${settlement.from_user}-${settlement.to_user}-${settlement.expense_id}`;
            paidExpenses.set(key, (paidExpenses.get(key) || 0) + settlement.amount);
        }
    }

    const expenseDebts: ExpenseDebt[] = [];

    for (const expense of expenses) {
        const splits = getExpenseSplits(expense.id);

        for (const split of splits) {
            // Se a pessoa que deve pagar é diferente de quem pagou
            if (split.user_id !== expense.paid_by) {
                const fromMember = members.find(m => m.user_id === split.user_id);
                const toMember = members.find(m => m.user_id === expense.paid_by);

                if (fromMember && toMember) {
                    // Verificar quanto já foi pago desta despesa específica
                    const paidKey = `${split.user_id}-${expense.paid_by}-${expense.id}`;
                    const amountPaid = paidExpenses.get(paidKey) || 0;
                    const remainingAmount = split.amount - amountPaid;

                    // Só adicionar se ainda resta algo a pagar
                    if (remainingAmount > 0.01) {
                        expenseDebts.push({
                            expenseId: expense.id,
                            expenseDescription: expense.description,
                            expenseDate: expense.date,
                            expenseCategory: expense.category,
                            from: split.user_id,
                            fromUsername: split.username,
                            to: expense.paid_by,
                            toUsername: expense.paid_by_username,
                            amount: Math.round(remainingAmount * 100) / 100,
                            totalExpenseAmount: expense.amount,
                        });
                    }
                }
            }
        }
    }

    // Agrupar dívidas por from -> to
    const debtMap = new Map<string, DebtWithDetails>();

    for (const expDebt of expenseDebts) {
        const key = `${expDebt.from}-${expDebt.to}`;

        if (!debtMap.has(key)) {
            debtMap.set(key, {
                from: expDebt.from,
                fromUsername: expDebt.fromUsername,
                to: expDebt.to,
                toUsername: expDebt.toUsername,
                amount: 0,
                expenses: [],
            });
        }

        const debt = debtMap.get(key)!;
        debt.amount += expDebt.amount;
        debt.expenses.push(expDebt);
    }

    // Consolidar dívidas bidirecionais (calcular valor líquido)
    const consolidatedDebts = new Map<string, DebtWithDetails>();
    const processedPairs = new Set<string>();

    for (const [key, debt] of debtMap.entries()) {
        // Verificar se já processamos este par
        const reverseKey = `${debt.to}-${debt.from}`;
        const pairKey = debt.from < debt.to ? `${debt.from}-${debt.to}` : `${debt.to}-${debt.from}`;

        if (processedPairs.has(pairKey)) {
            continue; // Já processamos este par
        }

        processedPairs.add(pairKey);

        // Verificar se há dívida na direção oposta
        const reverseDebt = debtMap.get(reverseKey);

        if (reverseDebt) {
            // Há dívidas em ambas as direções - calcular valor líquido
            const netAmount = debt.amount - reverseDebt.amount;

            if (Math.abs(netAmount) > 0.01) {
                // Determinar direção do valor líquido
                if (netAmount > 0) {
                    // A dívida líquida é de debt.from para debt.to
                    // Ordenar despesas por data (mais recente primeiro)
                    const allExpenses = [...debt.expenses, ...reverseDebt.expenses].sort(
                        (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
                    );
                    consolidatedDebts.set(key, {
                        from: debt.from,
                        fromUsername: debt.fromUsername,
                        to: debt.to,
                        toUsername: debt.toUsername,
                        amount: Math.round(netAmount * 100) / 100,
                        expenses: allExpenses,
                    });
                } else {
                    // A dívida líquida é de reverseDebt.from para reverseDebt.to
                    // Ordenar despesas por data (mais recente primeiro)
                    const allExpenses = [...debt.expenses, ...reverseDebt.expenses].sort(
                        (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
                    );
                    consolidatedDebts.set(reverseKey, {
                        from: reverseDebt.from,
                        fromUsername: reverseDebt.fromUsername,
                        to: reverseDebt.to,
                        toUsername: reverseDebt.toUsername,
                        amount: Math.round(Math.abs(netAmount) * 100) / 100,
                        expenses: allExpenses,
                    });
                }
            }
            // Se netAmount <= 0.01, não adicionamos nada (dívidas se cancelam)
        } else {
            // Não há dívida na direção oposta, manter como está
            consolidatedDebts.set(key, {
                ...debt,
                amount: Math.round(debt.amount * 100) / 100,
            });
        }
    }

    // Retornar apenas dívidas com valor > 0.01
    return Array.from(consolidatedDebts.values())
        .filter(debt => debt.amount > 0.01);
}

// Soft delete do grupo
export function deleteGroup(groupId: number, userId: number): { success: boolean; error?: string } {
    try {
        // Verificar se o grupo existe e não está deletado
        const group = db
            .query("SELECT created_by FROM groups WHERE id = ? AND deleted_at IS NULL")
            .get(groupId) as { created_by: number } | null;

        if (!group) {
            return { success: false, error: "Grupo não encontrado" };
        }

        // Verificar se o usuário é o criador do grupo
        if (group.created_by !== userId) {
            return { success: false, error: "Apenas o criador do grupo pode excluí-lo" };
        }

        // Atualizar deleted_at
        db.query("UPDATE groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?")
            .run(groupId);

        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar grupo:", error);
        return { success: false, error: "Erro ao deletar grupo" };
    }
}

// Registrar pagamento (settlement)
export function addSettlement(
    groupId: number,
    fromUser: number,
    toUser: number,
    amount: number,
    note: string | null,
    expenseId?: number | null
): number {
    const result = db
        .query(
            "INSERT INTO settlements (group_id, from_user, to_user, amount, note, expense_id) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(groupId, fromUser, toUser, amount, note, expenseId || null);

    return Number(result.lastInsertRowid);
}

// Registrar pagamento de uma despesa específica
export function addExpenseSettlement(
    groupId: number,
    expenseId: number,
    fromUser: number,
    toUser: number,
    amount: number
): number {
    const expense = db
        .query("SELECT description FROM expenses WHERE id = ?")
        .get(expenseId) as any;

    const note = expense ? `Pagamento da despesa: ${expense.description}` : `Pagamento da despesa #${expenseId}`;

    // Registrar settlement com expense_id
    const settlementId = addSettlement(groupId, fromUser, toUser, amount, note, expenseId);

    // Obter nomes dos usuários para o histórico
    const fromUserData = db.query("SELECT username FROM users WHERE id = ?").get(fromUser) as any;
    const toUserData = db.query("SELECT username FROM users WHERE id = ?").get(toUser) as any;

    // Registrar no histórico da despesa
    db.query(
        `INSERT INTO expense_changes (expense_id, changed_by, field_name, old_value, new_value)
         VALUES (?, ?, ?, ?, ?)`
    ).run(
        expenseId,
        fromUser,
        "payment",
        null,
        `${fromUserData?.username || 'Usuário'} pagou R$ ${amount.toFixed(2)} para ${toUserData?.username || 'Usuário'}`
    );

    return settlementId;
}

// Registrar pagamento de todas as despesas de uma dívida
export function addDebtSettlement(
    groupId: number,
    fromUser: number,
    toUser: number,
    expenses: Array<{ expenseId: number; amount: number }>
): number[] {
    const settlementIds: number[] = [];

    for (const expense of expenses) {
        const settlementId = addExpenseSettlement(
            groupId,
            expense.expenseId,
            fromUser,
            toUser,
            expense.amount
        );
        settlementIds.push(settlementId);
    }

    return settlementIds;
}

// Obter histórico de transações do grupo
export interface Transaction {
    id: number;
    type: "expense" | "settlement";
    description: string;
    amount: number;
    date: string;
    from_user?: number;
    from_username?: string;
    to_user?: number;
    to_username?: string;
    paid_by?: number;
    paid_by_username?: string;
    category?: string;
}

export function getGroupTransactions(groupId: number): Transaction[] {
    // Obter despesas
    const expenses = db
        .query(
            `SELECT e.id, e.description, e.amount, e.date, e.paid_by, u.username as paid_by_username, e.category
       FROM expenses e
       INNER JOIN users u ON e.paid_by = u.id
       INNER JOIN groups g ON e.group_id = g.id
       WHERE e.group_id = ? AND g.deleted_at IS NULL`
        )
        .all(groupId) as any[];

    // Obter settlements
    const settlements = db
        .query(
            `SELECT s.id, s.amount, s.settled_at as date, s.note as description,
              s.from_user, uf.username as from_username,
              s.to_user, ut.username as to_username
       FROM settlements s
       INNER JOIN users uf ON s.from_user = uf.id
       INNER JOIN users ut ON s.to_user = ut.id
       INNER JOIN groups g ON s.group_id = g.id
       WHERE s.group_id = ? AND g.deleted_at IS NULL`
        )
        .all(groupId) as any[];

    const transactions: Transaction[] = [
        ...expenses.map((e) => ({
            id: e.id,
            type: "expense" as const,
            description: e.description,
            amount: e.amount,
            date: e.date,
            paid_by: e.paid_by,
            paid_by_username: e.paid_by_username,
            category: e.category,
        })),
        ...settlements.map((s) => ({
            id: s.id,
            type: "settlement" as const,
            description: s.description || `Pagamento de ${s.from_username} para ${s.to_username}`,
            amount: s.amount,
            date: s.date,
            from_user: s.from_user,
            from_username: s.from_username,
            to_user: s.to_user,
            to_username: s.to_username,
        })),
    ];

    // Ordenar por data
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
}

// Registrar mudança em despesa
function logExpenseChange(
    expenseId: number,
    changedBy: number,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null
) {
    db.query(
        `INSERT INTO expense_changes (expense_id, changed_by, field_name, old_value, new_value)
         VALUES (?, ?, ?, ?, ?)`
    ).run(expenseId, changedBy, fieldName, oldValue, newValue);
}

// Editar despesa
export function updateExpense(
    expenseId: number,
    userId: number,
    updates: {
        description?: string;
        amount?: number;
        paidBy?: number;
        date?: string;
        category?: string | null;
        splits?: { userId: number; amount: number }[];
    }
): boolean {
    try {
        // Buscar despesa atual
        const currentExpense = db
            .query("SELECT * FROM expenses WHERE id = ?")
            .get(expenseId) as any;

        if (!currentExpense) {
            return false;
        }

        // Registrar mudanças
        if (updates.description && updates.description !== currentExpense.description) {
            logExpenseChange(expenseId, userId, "description", currentExpense.description, updates.description);
        }

        if (updates.amount && updates.amount !== currentExpense.amount) {
            logExpenseChange(
                expenseId,
                userId,
                "amount",
                currentExpense.amount.toString(),
                updates.amount.toString()
            );
        }

        if (updates.paidBy && updates.paidBy !== currentExpense.paid_by) {
            const oldUser = db.query("SELECT username FROM users WHERE id = ?").get(currentExpense.paid_by) as any;
            const newUser = db.query("SELECT username FROM users WHERE id = ?").get(updates.paidBy) as any;
            logExpenseChange(
                expenseId,
                userId,
                "paid_by",
                oldUser?.username || currentExpense.paid_by.toString(),
                newUser?.username || updates.paidBy.toString()
            );
        }

        if (updates.date && updates.date !== currentExpense.date) {
            logExpenseChange(expenseId, userId, "date", currentExpense.date, updates.date);
        }

        if (updates.category !== undefined && updates.category !== currentExpense.category) {
            logExpenseChange(expenseId, userId, "category", currentExpense.category, updates.category);
        }

        // Atualizar despesa
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        if (updates.description) {
            updateFields.push("description = ?");
            updateValues.push(updates.description);
        }
        if (updates.amount !== undefined) {
            updateFields.push("amount = ?");
            updateValues.push(updates.amount);
        }
        if (updates.paidBy) {
            updateFields.push("paid_by = ?");
            updateValues.push(updates.paidBy);
        }
        if (updates.date) {
            updateFields.push("date = ?");
            updateValues.push(updates.date);
        }
        if (updates.category !== undefined) {
            updateFields.push("category = ?");
            updateValues.push(updates.category);
        }

        if (updateFields.length > 0) {
            updateValues.push(expenseId);
            db.query(`UPDATE expenses SET ${updateFields.join(", ")} WHERE id = ?`).run(...updateValues);
        }

        // Atualizar splits se fornecidos
        if (updates.splits) {
            const oldSplits = db
                .query(
                    `SELECT es.*, u.username 
                     FROM expense_splits es
                     INNER JOIN users u ON es.user_id = u.id
                     WHERE es.expense_id = ?`
                )
                .all(expenseId) as any[];

            // Deletar splits antigas
            db.query("DELETE FROM expense_splits WHERE expense_id = ?").run(expenseId);

            // Inserir novas splits
            for (const split of updates.splits) {
                db.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(
                    expenseId,
                    split.userId,
                    split.amount
                );
            }

            // Registrar mudança nas divisões
            const oldSplitsStr = oldSplits.map(s => `${s.username}: R$ ${s.amount.toFixed(2)}`).join(", ");
            const newSplits = updates.splits.map(s => {
                const user = db.query("SELECT username FROM users WHERE id = ?").get(s.userId) as any;
                return `${user?.username || s.userId}: R$ ${s.amount.toFixed(2)}`;
            }).join(", ");

            logExpenseChange(expenseId, userId, "splits", oldSplitsStr, newSplits);
        }

        return true;
    } catch (error) {
        console.error("Erro ao atualizar despesa:", error);
        return false;
    }
}

// Obter histórico de mudanças de uma despesa
export function getExpenseChanges(expenseId: number) {
    return db
        .query(
            `SELECT ec.*, u.username as changed_by_username
             FROM expense_changes ec
             INNER JOIN users u ON ec.changed_by = u.id
             WHERE ec.expense_id = ?
             ORDER BY ec.changed_at DESC`
        )
        .all(expenseId) as any[];
}

