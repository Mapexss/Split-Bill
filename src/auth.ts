import { db } from "./db";

// Hash password using Bun's built-in password hashing
export async function hashPassword(password: string): Promise<string> {
    return await Bun.password.hash(password, {
        algorithm: "bcrypt",
        cost: 10,
    });
}

// Verify password
export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return await Bun.password.verify(password, hash);
}

// Register new user
export async function registerUser(
    username: string,
    password: string
): Promise<{ success: boolean; error?: string; userId?: number }> {
    try {
        // Check if user already exists
        const existingUser = db
            .query("SELECT id FROM users WHERE username = ?")
            .get(username);

        if (existingUser) {
            return { success: false, error: "Nome de usuário já existe" };
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Insert user
        const result = db
            .query("INSERT INTO users (username, password) VALUES (?, ?)")
            .run(username, hashedPassword);

        return { success: true, userId: Number(result.lastInsertRowid) };
    } catch (error) {
        console.error("Registration error:", error);
        return { success: false, error: "Falha ao registrar usuário" };
    }
}

// Login user
export async function loginUser(
    username: string,
    password: string
): Promise<{ success: boolean; error?: string; userId?: number }> {
    try {
        // Find user
        const user = db
            .query("SELECT id, password FROM users WHERE username = ?")
            .get(username) as { id: number; password: string } | null;

        if (!user) {
            return { success: false, error: "Usuário ou senha inválidos" };
        }

        // Verify password
        const isValid = await verifyPassword(password, user.password);

        if (!isValid) {
            return { success: false, error: "Usuário ou senha inválidos" };
        }

        return { success: true, userId: user.id };
    } catch (error) {
        console.error("Login error:", error);
        return { success: false, error: "Falha ao fazer login" };
    }
}

// Create session
export function createSession(userId: number): string {
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    db.query(
        "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)"
    ).run(sessionId, userId, expiresAt.toISOString());

    return sessionId;
}

// Get user from session
export function getUserFromSession(sessionId: string): number | null {
    const session = db
        .query(
            `SELECT user_id FROM sessions 
       WHERE id = ? AND expires_at > datetime('now')`
        )
        .get(sessionId) as { user_id: number } | null;

    return session ? session.user_id : null;
}

// Delete session (logout)
export function deleteSession(sessionId: string): void {
    db.query("DELETE FROM sessions WHERE id = ?").run(sessionId);
}

