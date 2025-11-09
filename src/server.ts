import { cookie } from "@elysiajs/cookie";
import { Elysia } from "elysia";
import {
    createSession,
    deleteSession,
    getUserFromSession,
    loginUser,
    registerUser,
} from "./auth";
import "./db"; // Initialize database
import { db } from "./db";
import {
    addExpense,
    addGroupMember,
    addSettlement,
    calculateDebts,
    calculateGroupBalances,
    createGroup,
    getExpenseChanges,
    getExpenseSplits,
    getGroup,
    getGroupExpenses,
    getGroupMembers,
    getGroupTransactions,
    getUserGroups,
    isGroupMember,
    updateExpense,
} from "./groups";

// Read HTML file once at startup
const indexHtml = await Bun.file("public/index.html").text();

const app = new Elysia()
    .use(cookie())
    // Static files
    .get("/styles.css", () => Bun.file("public/styles.css"))
    .get("/client.js", () => Bun.file("public/client.js"))
    .get("/client.js.map", () => Bun.file("public/client.js.map"))
    // API endpoints
    .post("/api/register", async ({ body, cookie }) => {
        const { username, password } = body as {
            username: string;
            password: string;
        };

        // Validate input
        if (!username || !password) {
            return { success: false, error: "Todos os campos são obrigatórios" };
        }

        // Register user
        const result = await registerUser(username, password);

        if (result.success && result.userId) {
            // Create session
            const sessionId = createSession(result.userId);
            if (cookie.session) {
                cookie.session.set({
                    value: sessionId,
                    httpOnly: true,
                    maxAge: 7 * 24 * 60 * 60, // 7 days
                    path: "/",
                    sameSite: "lax",
                });
            }

            return { success: true };
        }

        return { success: false, error: result.error };
    })
    .post("/api/login", async ({ body, cookie }) => {
        const { username, password } = body as {
            username: string;
            password: string;
        };

        // Validate input
        if (!username || !password) {
            return { success: false, error: "Todos os campos são obrigatórios" };
        }

        // Login user
        const result = await loginUser(username, password);

        if (result.success && result.userId) {
            // Create session
            const sessionId = createSession(result.userId);
            if (cookie.session) {
                cookie.session.set({
                    value: sessionId,
                    httpOnly: true,
                    maxAge: 7 * 24 * 60 * 60, // 7 days
                    path: "/",
                    sameSite: "lax",
                });
            }

            return { success: true };
        }

        return { success: false, error: result.error };
    })
    .get("/api/me", ({ cookie }) => {
        const sessionId = cookie.session?.value;

        if (!sessionId || typeof sessionId !== 'string') {
            return { authenticated: false };
        }

        const userId = getUserFromSession(sessionId);

        if (!userId) {
            return { authenticated: false };
        }

        const user = db
            .query("SELECT username FROM users WHERE id = ?")
            .get(userId) as { username: string } | null;

        if (!user) {
            return { authenticated: false };
        }

        return {
            authenticated: true,
            username: user.username,
        };
    })
    .post("/api/logout", ({ cookie }) => {
        const sessionId = cookie.session?.value;

        if (sessionId && typeof sessionId === 'string' && cookie.session) {
            deleteSession(sessionId);
            cookie.session.remove();
        }

        return { success: true };
    })
    // ===== BUSCAR USUÁRIOS =====
    .get("/api/users/search", ({ query, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const searchTerm = (query.q as string) || "";

        // Normalizar: remover acentos, lowercase, remover caracteres especiais
        const normalizeText = (text: string) => {
            return text
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // Remove acentos
                .toLowerCase()
                .replace(/[^a-z0-9]/g, ""); // Remove caracteres especiais
        };

        if (searchTerm.length < 2) {
            return { success: true, users: [] };
        }

        const normalizedSearch = normalizeText(searchTerm);

        // Buscar usuários cujo username normalizado contenha o termo
        const users = db
            .query("SELECT id, username FROM users LIMIT 50")
            .all() as { id: number; username: string }[];

        const filtered = users
            .filter(u => {
                const normalizedUsername = normalizeText(u.username);
                return normalizedUsername.includes(normalizedSearch) && u.id !== userId;
            })
            .slice(0, 10);

        return { success: true, users: filtered };
    })
    // ===== GRUPOS =====
    // Criar grupo
    .post("/api/groups", ({ body, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const { name, description } = body as { name: string; description?: string };
        if (!name) {
            return { success: false, error: "Nome do grupo é obrigatório" };
        }

        try {
            const groupId = createGroup(name, description || null, userId);
            return { success: true, groupId };
        } catch (error) {
            return { success: false, error: "Erro ao criar grupo" };
        }
    })
    // Listar grupos do usuário
    .get("/api/groups", ({ cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const groups = getUserGroups(userId);
        return { success: true, groups };
    })
    // Obter detalhes do grupo
    .get("/api/groups/:id", ({ params, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const groupId = parseInt(params.id);
        if (!isGroupMember(groupId, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        const group = getGroup(groupId);
        const members = getGroupMembers(groupId);
        const expenses = getGroupExpenses(groupId);
        const balances = calculateGroupBalances(groupId);
        const debts = calculateDebts(groupId);

        return { success: true, group, members, expenses, balances, debts };
    })
    // Adicionar membro ao grupo
    .post("/api/groups/:id/members", ({ params, body, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const groupId = parseInt(params.id);
        if (!isGroupMember(groupId, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        const { username } = body as { username: string };
        if (!username) {
            return { success: false, error: "Nome de usuário é obrigatório" };
        }

        // Encontrar usuário pelo nome
        const user = db
            .query("SELECT id FROM users WHERE username = ?")
            .get(username) as { id: number } | null;

        if (!user) {
            return { success: false, error: "Usuário não encontrado" };
        }

        const success = addGroupMember(groupId, user.id);
        if (!success) {
            return { success: false, error: "Usuário já é membro do grupo" };
        }

        return { success: true };
    })
    // ===== DESPESAS =====
    // Adicionar despesa
    .post("/api/expenses", ({ body, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const { groupId, description, amount, paidBy, date, category, splits } = body as {
            groupId: number;
            description: string;
            amount: number;
            paidBy: number;
            date: string;
            category?: string;
            splits: { userId: number; amount: number }[];
        };

        if (!groupId || !description || !amount || !paidBy || !date || !splits || splits.length === 0) {
            return { success: false, error: "Dados incompletos" };
        }

        if (!isGroupMember(groupId, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        // Validar que a soma das divisões é igual ao total
        const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
            return { success: false, error: "Soma das divisões não corresponde ao total" };
        }

        try {
            const expenseId = addExpense(
                groupId,
                description,
                amount,
                paidBy,
                date,
                category || null,
                splits
            );
            return { success: true, expenseId };
        } catch (error) {
            return { success: false, error: "Erro ao adicionar despesa" };
        }
    })
    // Obter detalhes de uma despesa
    .get("/api/expenses/:id", ({ params, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const expenseId = parseInt(params.id);
        const expense = db
            .query("SELECT * FROM expenses WHERE id = ?")
            .get(expenseId) as any;

        if (!expense) {
            return { success: false, error: "Despesa não encontrada" };
        }

        if (!isGroupMember(expense.group_id, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        const splits = getExpenseSplits(expenseId);
        return { success: true, expense, splits };
    })
    // Editar despesa
    .put("/api/expenses/:id", ({ params, body, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const expenseId = parseInt(params.id);
        const expense = db
            .query("SELECT * FROM expenses WHERE id = ?")
            .get(expenseId) as any;

        if (!expense) {
            return { success: false, error: "Despesa não encontrada" };
        }

        if (!isGroupMember(expense.group_id, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        const { description, amount, paidBy, date, category, splits } = body as {
            description?: string;
            amount?: number;
            paidBy?: number;
            date?: string;
            category?: string;
            splits?: { userId: number; amount: number }[];
        };

        // Validar que a soma das divisões é igual ao total (se splits fornecidos)
        if (splits && amount !== undefined) {
            const totalSplits = splits.reduce((sum, split) => sum + split.amount, 0);
            if (Math.abs(totalSplits - amount) > 0.01) {
                return { success: false, error: "Soma das divisões não corresponde ao total" };
            }
        }

        try {
            const success = updateExpense(expenseId, userId, {
                description,
                amount,
                paidBy,
                date,
                category,
                splits,
            });

            if (success) {
                return { success: true };
            } else {
                return { success: false, error: "Erro ao atualizar despesa" };
            }
        } catch (error) {
            return { success: false, error: "Erro ao atualizar despesa" };
        }
    })
    // Obter histórico de mudanças de uma despesa
    .get("/api/expenses/:id/history", ({ params, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const expenseId = parseInt(params.id);
        const expense = db
            .query("SELECT * FROM expenses WHERE id = ?")
            .get(expenseId) as any;

        if (!expense) {
            return { success: false, error: "Despesa não encontrada" };
        }

        if (!isGroupMember(expense.group_id, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        const changes = getExpenseChanges(expenseId);
        return { success: true, changes };
    })
    // ===== LIQUIDAÇÕES =====
    // Registrar pagamento
    .post("/api/settlements", ({ body, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const { groupId, fromUser, toUser, amount, note } = body as {
            groupId: number;
            fromUser: number;
            toUser: number;
            amount: number;
            note?: string;
        };

        if (!groupId || !fromUser || !toUser || !amount) {
            return { success: false, error: "Dados incompletos" };
        }

        if (!isGroupMember(groupId, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        try {
            const settlementId = addSettlement(groupId, fromUser, toUser, amount, note || null);
            return { success: true, settlementId };
        } catch (error) {
            return { success: false, error: "Erro ao registrar pagamento" };
        }
    })
    // ===== TRANSAÇÕES =====
    // Obter histórico de transações do grupo
    .get("/api/groups/:id/transactions", ({ params, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const groupId = parseInt(params.id);
        if (!isGroupMember(groupId, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        const transactions = getGroupTransactions(groupId);
        return { success: true, transactions };
    })
    // Serve React app for SPA routes (not for static files)
    .get("/entrar", ({ set }) => {
        set.headers["content-type"] = "text/html; charset=utf-8";
        return indexHtml;
    })
    .get("/registrar", ({ set }) => {
        set.headers["content-type"] = "text/html; charset=utf-8";
        return indexHtml;
    })
    .get("/painel", ({ set }) => {
        set.headers["content-type"] = "text/html; charset=utf-8";
        return indexHtml;
    })
    .get("/grupos", ({ set }) => {
        set.headers["content-type"] = "text/html; charset=utf-8";
        return indexHtml;
    })
    .get("/grupos/:id", ({ set }) => {
        set.headers["content-type"] = "text/html; charset=utf-8";
        return indexHtml;
    })
    .get("/", ({ set }) => {
        set.headers["content-type"] = "text/html; charset=utf-8";
        return indexHtml;
    })
    .listen(3000);

console.log(
    `🚀 Dividir Conta está rodando em http://${app.server?.hostname}:${app.server?.port}`
);
