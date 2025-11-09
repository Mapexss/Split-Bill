import { cookie } from "@elysiajs/cookie";
import { staticPlugin } from "@elysiajs/static";
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

const app = new Elysia()
    .use(cookie())
    .use(
        staticPlugin({
            assets: "public",
            prefix: "/",
        })
    )
    // API endpoints
    .post("/api/register", async ({ body, cookie: { session } }) => {
        const { username, email, password } = body as {
            username: string;
            email: string;
            password: string;
        };

        // Validate input
        if (!username || !email || !password) {
            return { success: false, error: "Todos os campos são obrigatórios" };
        }

        if (password.length < 6) {
            return { success: false, error: "A senha deve ter pelo menos 6 caracteres" };
        }

        // Register user
        const result = await registerUser(username, email, password);

        if (result.success && result.userId) {
            // Create session
            const sessionId = createSession(result.userId);
            session.set({
                value: sessionId,
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60, // 7 days
                path: "/",
                sameSite: "lax",
            });

            return { success: true };
        }

        return { success: false, error: result.error };
    })
    .post("/api/login", async ({ body, cookie: { session } }) => {
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
            session.set({
                value: sessionId,
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60, // 7 days
                path: "/",
                sameSite: "lax",
            });

            return { success: true };
        }

        return { success: false, error: result.error };
    })
    .get("/api/me", ({ cookie: { session } }) => {
        const sessionId = session.value;

        if (!sessionId) {
            return { authenticated: false };
        }

        const userId = getUserFromSession(sessionId);

        if (!userId) {
            return { authenticated: false };
        }

        const user = db
            .query("SELECT username, email FROM users WHERE id = ?")
            .get(userId) as { username: string; email: string } | null;

        if (!user) {
            return { authenticated: false };
        }

        return {
            authenticated: true,
            username: user.username,
            email: user.email,
        };
    })
    .post("/api/logout", ({ cookie: { session } }) => {
        const sessionId = session.value;

        if (sessionId) {
            deleteSession(sessionId);
            session.remove();
        }

        return { success: true };
    })
    // Serve React app for all other routes
    .get("*", async () => {
        return Bun.file("public/index.html");
    })
    .listen(3000);

console.log(
    `🚀 Dividir Conta está rodando em http://${app.server?.hostname}:${app.server?.port}`
);
