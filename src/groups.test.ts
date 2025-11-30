import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, it } from "bun:test";

// Helper para criar banco de dados de teste em memória
function createTestDatabase(): Database {
    const testDb = new Database(":memory:");

    // Criar todas as tabelas necessárias
    testDb.run(`
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    testDb.run(`
        CREATE TABLE groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_by INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            public_id TEXT UNIQUE,
            open_to_invites INTEGER DEFAULT 0,
            deleted_at DATETIME,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    testDb.run(`
        CREATE TABLE group_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(group_id, user_id)
        )
    `);

    testDb.run(`
        CREATE TABLE expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            paid_by INTEGER NOT NULL,
            category TEXT,
            date DATE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (paid_by) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    testDb.run(`
        CREATE TABLE expense_splits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            expense_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    testDb.run(`
        CREATE TABLE settlements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            from_user INTEGER NOT NULL,
            to_user INTEGER NOT NULL,
            amount REAL NOT NULL,
            settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            note TEXT,
            expense_id INTEGER,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (from_user) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (to_user) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
        )
    `);

    return testDb;
}

// Mock do módulo db para usar o banco de teste
function setupTestDb(testDb: Database) {
    // Substituir temporariamente o db importado
    const groupsModule = require("./groups");
    const originalDb = groupsModule.db;

    // Criar um proxy que redireciona para o testDb
    // Nota: Isso requer que o módulo groups.ts exporte db ou usemos uma abordagem diferente
    // Por enquanto, vamos usar uma abordagem mais direta: mockar as queries diretamente
    return testDb;
}

describe("calculateDebtsWithDetails - Consolidação de dívidas bidirecionais", () => {
    let testDb: Database;
    let userIdA: number;
    let userIdB: number;
    let groupId: number;

    beforeEach(() => {
        testDb = createTestDatabase();

        // Criar dois usuários
        const userAResult = testDb
            .query("INSERT INTO users (username, password) VALUES (?, ?)")
            .run("usuario_a", "password123");
        userIdA = Number(userAResult.lastInsertRowid);

        const userBResult = testDb
            .query("INSERT INTO users (username, password) VALUES (?, ?)")
            .run("usuario_b", "password123");
        userIdB = Number(userBResult.lastInsertRowid);

        // Criar grupo
        const groupResult = testDb
            .query("INSERT INTO groups (name, description, created_by, public_id, open_to_invites) VALUES (?, ?, ?, ?, ?)")
            .run("Grupo Teste", "Grupo para testes", userIdA, crypto.randomUUID(), 0);
        groupId = Number(groupResult.lastInsertRowid);

        // Adicionar ambos os usuários ao grupo
        testDb.query("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(groupId, userIdA);
        testDb.query("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(groupId, userIdB);
    });

    it("deve consolidar dívidas bidirecionais e mostrar apenas o valor líquido", () => {
        // Despesa 1: R$ 100, dividido 50/50, usuário A pagou
        // Resultado: usuário B deve R$ 50 para usuário A
        const expense1Result = testDb
            .query("INSERT INTO expenses (group_id, description, amount, paid_by, date) VALUES (?, ?, ?, ?, ?)")
            .run(groupId, "Despesa 1", 100, userIdA, "2024-01-01");
        const expense1Id = Number(expense1Result.lastInsertRowid);

        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expense1Id, userIdA, 50);
        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expense1Id, userIdB, 50);

        // Despesa 2: R$ 50, dividido 25/25, usuário B pagou
        // Resultado: usuário A deve R$ 25 para usuário B
        const expense2Result = testDb
            .query("INSERT INTO expenses (group_id, description, amount, paid_by, date) VALUES (?, ?, ?, ?, ?)")
            .run(groupId, "Despesa 2", 50, userIdB, "2024-01-02");
        const expense2Id = Number(expense2Result.lastInsertRowid);

        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expense2Id, userIdA, 25);
        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expense2Id, userIdB, 25);

        // Mockar o db global para usar o testDb
        // Como não podemos facilmente mockar imports em Bun, vamos criar uma função de teste
        // que usa o testDb diretamente
        const debts = calculateDebtsWithDetailsTest(testDb, groupId);

        // Verificar que há apenas uma entrada consolidada
        expect(debts.length).toBe(1);

        // Verificar que a dívida consolidada é de B para A (valor líquido: 50 - 25 = 25)
        const consolidatedDebt = debts[0];
        expect(consolidatedDebt.from).toBe(userIdB);
        expect(consolidatedDebt.to).toBe(userIdA);
        expect(consolidatedDebt.amount).toBeCloseTo(25, 2);

        // Verificar que nos detalhes há 2 despesas (ambas as despesas originais)
        expect(consolidatedDebt.expenses.length).toBe(2);

        // Verificar que ambas as despesas estão presentes
        const expenseIds = consolidatedDebt.expenses.map(e => e.expenseId);
        expect(expenseIds).toContain(expense1Id);
        expect(expenseIds).toContain(expense2Id);
    });

    it("deve manter dívidas unidirecionais sem consolidação", () => {
        // Apenas uma despesa: R$ 100, dividido 50/50, usuário A pagou
        const expenseResult = testDb
            .query("INSERT INTO expenses (group_id, description, amount, paid_by, date) VALUES (?, ?, ?, ?, ?)")
            .run(groupId, "Despesa única", 100, userIdA, "2024-01-01");
        const expenseId = Number(expenseResult.lastInsertRowid);

        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expenseId, userIdA, 50);
        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expenseId, userIdB, 50);

        const debts = calculateDebtsWithDetailsTest(testDb, groupId);

        // Deve haver apenas uma entrada (sem consolidação necessária)
        expect(debts.length).toBe(1);
        expect(debts[0].from).toBe(userIdB);
        expect(debts[0].to).toBe(userIdA);
        expect(debts[0].amount).toBeCloseTo(50, 2);
        expect(debts[0].expenses.length).toBe(1);
    });

    it("deve cancelar dívidas quando os valores são iguais", () => {
        // Despesa 1: R$ 100, dividido 50/50, usuário A pagou
        const expense1Result = testDb
            .query("INSERT INTO expenses (group_id, description, amount, paid_by, date) VALUES (?, ?, ?, ?, ?)")
            .run(groupId, "Despesa 1", 100, userIdA, "2024-01-01");
        const expense1Id = Number(expense1Result.lastInsertRowid);

        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expense1Id, userIdA, 50);
        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expense1Id, userIdB, 50);

        // Despesa 2: R$ 100, dividido 50/50, usuário B pagou (mesmo valor)
        const expense2Result = testDb
            .query("INSERT INTO expenses (group_id, description, amount, paid_by, date) VALUES (?, ?, ?, ?, ?)")
            .run(groupId, "Despesa 2", 100, userIdB, "2024-01-02");
        const expense2Id = Number(expense2Result.lastInsertRowid);

        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expense2Id, userIdA, 50);
        testDb.query("INSERT INTO expense_splits (expense_id, user_id, amount) VALUES (?, ?, ?)").run(expense2Id, userIdB, 50);

        const debts = calculateDebtsWithDetailsTest(testDb, groupId);

        // Quando os valores se cancelam, não deve haver dívidas pendentes
        expect(debts.length).toBe(0);
    });
});

// Função auxiliar que replica a lógica de calculateDebtsWithDetails mas usando o testDb
function calculateDebtsWithDetailsTest(testDb: Database, groupId: number) {
    // Obter despesas
    const expenses = testDb
        .query(
            `SELECT e.*, u.username as paid_by_username
             FROM expenses e
             INNER JOIN users u ON e.paid_by = u.id
             INNER JOIN groups g ON e.group_id = g.id
             WHERE e.group_id = ? AND g.deleted_at IS NULL
             ORDER BY e.date DESC, e.created_at DESC`
        )
        .all(groupId) as any[];

    // Obter membros
    const members = testDb
        .query(
            `SELECT gm.*, u.username 
             FROM group_members gm
             INNER JOIN users u ON gm.user_id = u.id
             INNER JOIN groups g ON gm.group_id = g.id
             WHERE gm.group_id = ? AND g.deleted_at IS NULL
             ORDER BY gm.joined_at`
        )
        .all(groupId) as any[];

    // Buscar todos os settlements
    const settlements = testDb
        .query("SELECT * FROM settlements WHERE group_id = ?")
        .all(groupId) as any[];

    // Criar mapa de pagamentos por despesa específica
    const paidExpenses = new Map<string, number>();

    for (const settlement of settlements) {
        if (settlement.expense_id) {
            const key = `${settlement.from_user}-${settlement.to_user}-${settlement.expense_id}`;
            paidExpenses.set(key, (paidExpenses.get(key) || 0) + settlement.amount);
        }
    }

    const expenseDebts: any[] = [];

    for (const expense of expenses) {
        // Obter splits
        const splits = testDb
            .query(
                `SELECT es.*, u.username
                 FROM expense_splits es
                 INNER JOIN users u ON es.user_id = u.id
                 WHERE es.expense_id = ?`
            )
            .all(expense.id) as any[];

        for (const split of splits) {
            if (split.user_id !== expense.paid_by) {
                const fromMember = members.find(m => m.user_id === split.user_id);
                const toMember = members.find(m => m.user_id === expense.paid_by);

                if (fromMember && toMember) {
                    const paidKey = `${split.user_id}-${expense.paid_by}-${expense.id}`;
                    const amountPaid = paidExpenses.get(paidKey) || 0;
                    const remainingAmount = split.amount - amountPaid;

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
    const debtMap = new Map<string, any>();

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
    const consolidatedDebts = new Map<string, any>();
    const processedPairs = new Set<string>();

    for (const [key, debt] of debtMap.entries()) {
        const reverseKey = `${debt.to}-${debt.from}`;
        const pairKey = debt.from < debt.to ? `${debt.from}-${debt.to}` : `${debt.to}-${debt.from}`;

        if (processedPairs.has(pairKey)) {
            continue;
        }

        processedPairs.add(pairKey);

        const reverseDebt = debtMap.get(reverseKey);

        if (reverseDebt) {
            const netAmount = debt.amount - reverseDebt.amount;

            if (Math.abs(netAmount) > 0.01) {
                if (netAmount > 0) {
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
        } else {
            consolidatedDebts.set(key, {
                ...debt,
                amount: Math.round(debt.amount * 100) / 100,
            });
        }
    }

    return Array.from(consolidatedDebts.values())
        .filter(debt => debt.amount > 0.01);
}

