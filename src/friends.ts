import { db } from "./db";

// Tipos
export interface Friend {
    id: number;
    username: string;
    created_at: string;
}

// Adicionar amigo (bidirecional)
export function addFriend(userId: number, friendId: number): { success: boolean; error?: string } {
    try {
        // Verificar se não está tentando adicionar a si mesmo
        if (userId === friendId) {
            return { success: false, error: "Você não pode adicionar a si mesmo como amigo" };
        }

        // Verificar se o amigo existe
        const friend = db.query("SELECT id FROM users WHERE id = ?").get(friendId) as { id: number } | null;
        if (!friend) {
            return { success: false, error: "Usuário não encontrado" };
        }

        // Verificar se já são amigos (em qualquer direção)
        const existingFriendship = db
            .query(
                `SELECT id FROM friendships 
                 WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`
            )
            .get(userId, friendId, friendId, userId) as { id: number } | null;

        if (existingFriendship) {
            return { success: false, error: "Vocês já são amigos" };
        }

        // Criar amizade bidirecional
        db.query("INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)").run(userId, friendId);
        db.query("INSERT INTO friendships (user_id, friend_id) VALUES (?, ?)").run(friendId, userId);

        return { success: true };
    } catch (error) {
        console.error("Erro ao adicionar amigo:", error);
        return { success: false, error: "Erro ao adicionar amigo" };
    }
}

// Remover amigo (bidirecional)
export function removeFriend(userId: number, friendId: number): { success: boolean; error?: string } {
    try {
        // Remover amizade em ambas as direções
        db.query("DELETE FROM friendships WHERE user_id = ? AND friend_id = ?").run(userId, friendId);
        db.query("DELETE FROM friendships WHERE user_id = ? AND friend_id = ?").run(friendId, userId);

        return { success: true };
    } catch (error) {
        console.error("Erro ao remover amigo:", error);
        return { success: false, error: "Erro ao remover amigo" };
    }
}

// Listar amigos do usuário
export function getUserFriends(userId: number): Friend[] {
    return db
        .query(
            `SELECT u.id, u.username, f.created_at
             FROM friendships f
             INNER JOIN users u ON f.friend_id = u.id
             WHERE f.user_id = ?
             ORDER BY u.username`
        )
        .all(userId) as Friend[];
}

// Verificar se dois usuários são amigos
export function areFriends(userId: number, friendId: number): boolean {
    const result = db
        .query("SELECT id FROM friendships WHERE user_id = ? AND friend_id = ?")
        .get(userId, friendId) as { id: number } | null;
    return result !== null;
}

// Buscar amigos por nome (para adicionar a grupos)
export function searchFriends(userId: number, searchTerm: string): { id: number; username: string }[] {
    // Normalizar: remover acentos, lowercase, remover caracteres especiais
    const normalizeText = (text: string) => {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .toLowerCase()
            .replace(/[^a-z0-9]/g, ""); // Remove caracteres especiais
    };

    if (searchTerm.length < 2) {
        return [];
    }

    const normalizedSearch = normalizeText(searchTerm);

    // Buscar apenas amigos do usuário
    const friends = db
        .query(
            `SELECT u.id, u.username
             FROM friendships f
             INNER JOIN users u ON f.friend_id = u.id
             WHERE f.user_id = ?`
        )
        .all(userId) as { id: number; username: string }[];

    const filtered = friends
        .filter(friend => {
            const normalizedUsername = normalizeText(friend.username);
            return normalizedUsername.includes(normalizedSearch);
        })
        .slice(0, 10);

    return filtered;
}

