import { cookie } from "@elysiajs/cookie";
import { Elysia } from "elysia";
import {
    createSession,
    deleteSession,
    getUserFromSession,
    loginUser,
    registerUser,
    resetPassword,
} from "./auth";
import "./db"; // Initialize database
import { db } from "./db";
import {
    addFriend,
    getUserFriends,
    removeFriend,
    searchFriends,
} from "./friends";
import {
    addDebtSettlement,
    addExpense,
    addExpenseSettlement,
    addGroupMember,
    addSettlement,
    calculateDebts,
    calculateDebtsWithDetails,
    calculateGroupBalances,
    createGroup,
    deleteGroup,
    getExpenseChanges,
    getExpenseSplits,
    getGroup,
    getGroupByPublicId,
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
            userId: userId,
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
    // ===== RESETAR SENHA =====
    .post("/api/reset-password", async ({ body, request }) => {
        const { username, newPassword, code } = body as {
            username: string;
            newPassword: string;
            code: string;
        };

        // Validate input
        if (!username || !newPassword || !code) {
            return { success: false, error: "Todos os campos são obrigatórios" };
        }

        // Get reset code from environment
        const envCode = process.env.PASSWORD_RESET_CODE;
        if (!envCode) {
            console.error("PASSWORD_RESET_CODE não configurado no .env");
            return { success: false, error: "Erro de configuração do servidor" };
        }

        // Verify code
        if (code !== envCode) {
            return { success: false, error: "Código de segurança inválido" };
        }

        // Rate limiting: Check attempts in the last 24 hours
        // Get IP from headers (X-Forwarded-For for proxies, or direct connection)
        const forwardedFor = request.headers?.get("x-forwarded-for");
        const realIp = request.headers?.get("x-real-ip");
        let ipAddress = "unknown";
        if (forwardedFor && typeof forwardedFor === "string" && forwardedFor.length > 0) {
            ipAddress = forwardedFor.split(",")[0]?.trim() ?? "unknown";
        } else if (realIp && typeof realIp === "string" && realIp.length > 0) {
            ipAddress = realIp;
        }

        /* const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const attempts = db
            .query(
                "SELECT COUNT(*) as count FROM password_reset_attempts WHERE ip_address = ? AND attempted_at > ?"
            )
            .get(ipAddress, oneDayAgo) as { count: number } | null;

        const attemptCount = attempts?.count || 0;
        if (attemptCount >= 6) {
            return {
                success: false,
                error: "Limite de tentativas excedido. Tente novamente em 24 horas.",
            };
        }*/

        // Record attempt
        db.query(
            "INSERT INTO password_reset_attempts (ip_address, attempted_at) VALUES (?, ?)"
        ).run(ipAddress, new Date().toISOString());

        // Reset password
        const result = await resetPassword(username, newPassword);

        if (result.success) {
            return { success: true };
        }

        return { success: false, error: result.error || "Falha ao resetar senha" };
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
        const friendsOnly = (query.friendsOnly as string) === "true";

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

        // Se friendsOnly for true, buscar apenas amigos
        if (friendsOnly) {
            const friends = searchFriends(userId, searchTerm);
            return { success: true, users: friends };
        }

        // Caso contrário, buscar todos os usuários
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
    // ===== AMIGOS =====
    // Listar amigos do usuário
    .get("/api/friends", ({ cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const friends = getUserFriends(userId);
        return { success: true, friends };
    })
    // Adicionar amigo
    .post("/api/friends", ({ body, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
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

        const result = addFriend(userId, user.id);
        return result;
    })
    // Remover amigo
    .delete("/api/friends/:id", ({ params, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const friendId = parseInt(params.id);
        if (isNaN(friendId)) {
            return { success: false, error: "ID inválido" };
        }

        const result = removeFriend(userId, friendId);
        return result;
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
        const debtsWithDetails = calculateDebtsWithDetails(groupId);

        return { success: true, group, members, expenses, balances, debts, debtsWithDetails };
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
    // Atualizar flag de convites abertos
    .put("/api/groups/:id/invites", ({ params, body, cookie }) => {
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

        const { open_to_invites } = body as { open_to_invites: boolean };

        if (typeof open_to_invites !== 'boolean') {
            return { success: false, error: "Valor inválido para open_to_invites" };
        }

        try {
            // Se estiver habilitando convites e não tiver public_id, gerar um
            if (open_to_invites) {
                const group = getGroup(groupId);
                if (!group) {
                    return { success: false, error: "Grupo não encontrado" };
                }

                if (!group.public_id) {
                    const publicId = crypto.randomUUID();
                    db.query("UPDATE groups SET public_id = ?, open_to_invites = ? WHERE id = ?")
                        .run(publicId, 1, groupId);
                } else {
                    db.query("UPDATE groups SET open_to_invites = ? WHERE id = ?")
                        .run(1, groupId);
                }
            } else {
                db.query("UPDATE groups SET open_to_invites = ? WHERE id = ?")
                    .run(0, groupId);
            }
            return { success: true };
        } catch (error: any) {
            console.error("Erro ao atualizar configuração:", error);
            return {
                success: false,
                error: error?.message || String(error) || "Erro ao atualizar configuração"
            };
        }
    })
    // Deletar grupo (soft delete)
    .delete("/api/groups/:id", ({ params, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const groupId = parseInt(params.id);

        try {
            const result = deleteGroup(groupId, userId);
            if (!result.success) {
                return { success: false, error: result.error || "Erro ao deletar grupo" };
            }

            return { success: true };
        } catch (error) {
            return { success: false, error: "Erro ao deletar grupo" };
        }
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
    // Registrar pagamento de despesa específica
    .post("/api/expense-settlements", ({ body, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const { groupId, expenseId, fromUser, toUser, amount } = body as {
            groupId: number;
            expenseId: number;
            fromUser: number;
            toUser: number;
            amount: number;
        };

        if (!groupId || !expenseId || !fromUser || !toUser || !amount) {
            return { success: false, error: "Dados incompletos" };
        }

        if (!isGroupMember(groupId, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        try {
            const settlementId = addExpenseSettlement(groupId, expenseId, fromUser, toUser, amount);
            return { success: true, settlementId };
        } catch (error) {
            return { success: false, error: "Erro ao registrar pagamento" };
        }
    })
    // Registrar pagamento de dívida completa (todas as despesas)
    .post("/api/debt-settlements", ({ body, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const { groupId, fromUser, toUser, expenses } = body as {
            groupId: number;
            fromUser: number;
            toUser: number;
            expenses: Array<{ expenseId: number; amount: number }>;
        };

        if (!groupId || !fromUser || !toUser || !expenses || expenses.length === 0) {
            return { success: false, error: "Dados incompletos" };
        }

        if (!isGroupMember(groupId, userId)) {
            return { success: false, error: "Acesso negado" };
        }

        try {
            const settlementIds = addDebtSettlement(groupId, fromUser, toUser, expenses);
            return { success: true, settlementIds };
        } catch (error) {
            return { success: false, error: "Erro ao registrar pagamentos" };
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
    // ===== CONVITES =====
    // Obter informações do grupo por public_id (público, sem autenticação)
    .get("/api/join-group/:public_id", ({ params }) => {
        const { public_id } = params;

        if (!public_id) {
            return { success: false, error: "ID público inválido" };
        }

        const group = getGroupByPublicId(public_id);

        if (!group) {
            return { success: false, error: "Grupo não encontrado" };
        }

        // Verificar se o grupo está aberto a convites
        if (!group.open_to_invites || group.open_to_invites === 0) {
            return { success: false, error: "Este grupo não está aberto a convites" };
        }

        const members = getGroupMembers(group.id);

        return {
            success: true,
            group: {
                id: group.id,
                name: group.name,
                description: group.description,
            },
            members: members.map(m => ({
                username: m.username,
            })),
        };
    })
    // Aceitar convite e entrar no grupo
    .post("/api/join-group/:public_id", ({ params, cookie }) => {
        const sessionId = cookie.session?.value;
        if (!sessionId || typeof sessionId !== 'string') {
            return { success: false, error: "Não autenticado" };
        }

        const userId = getUserFromSession(sessionId);
        if (!userId) {
            return { success: false, error: "Sessão inválida" };
        }

        const { public_id } = params;

        if (!public_id) {
            return { success: false, error: "ID público inválido" };
        }

        const group = getGroupByPublicId(public_id);

        if (!group) {
            return { success: false, error: "Grupo não encontrado" };
        }

        // Verificar se o grupo está aberto a convites
        if (!group.open_to_invites || group.open_to_invites === 0) {
            return { success: false, error: "Este grupo não está aberto a convites" };
        }

        // Verificar se o usuário já é membro
        if (isGroupMember(group.id, userId)) {
            return { success: false, error: "Você já é membro deste grupo" };
        }

        // Adicionar usuário ao grupo
        const success = addGroupMember(group.id, userId);

        if (!success) {
            return { success: false, error: "Erro ao entrar no grupo" };
        }

        return { success: true, groupId: group.id };
    })
    // Generic static file handler - serves all files from public directory
    .get("*", async ({ path, set }) => {
        // Only handle static files (not SPA routes)
        if (path.startsWith("/api/") ||
            path === "/" ||
            path === "/entrar" ||
            path === "/registrar" ||
            path === "/resetar-senha" ||
            path === "/painel" ||
            path === "/grupos" ||
            path.startsWith("/grupos/") ||
            path.startsWith("/join-group/")) {
            return; // Skip to next handler
        }

        // Try to serve file from public directory
        const filePath = `public${path}`;
        const file = Bun.file(filePath);

        if (await file.exists()) {
            return file;
        }

        // File not found - skip to next handler
        return;
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
    .get("/resetar-senha", ({ set }) => {
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
    .get("/join-group/:public_id", ({ set }) => {
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
