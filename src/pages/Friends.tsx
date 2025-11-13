import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserPlus, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

interface Friend {
    id: number;
    username: string;
    created_at: string;
}

export function Friends() {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");
    const [searchResults, setSearchResults] = useState<{ id: number; username: string }[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [removingFriendId, setRemovingFriendId] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const response = await fetch("/api/friends");
            const data = await response.json();

            if (data.success) {
                setFriends(data.friends);
            }
        } catch (error) {
            console.error("Erro ao carregar amigos:", error);
        } finally {
            setLoading(false);
        }
    };

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setSearching(true);
        try {
            // Buscar todos os usuários (não apenas amigos) para adicionar como amigo
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success) {
                // Buscar amigos atuais para filtrar
                const friendsResponse = await fetch("/api/friends");
                const friendsData = await friendsResponse.json();
                const friendIds = friendsData.success
                    ? new Set(friendsData.friends.map((f: Friend) => f.id))
                    : new Set();

                const filtered = data.users.filter((u: { id: number; username: string }) => !friendIds.has(u.id));
                setSearchResults(filtered);
                setShowResults(filtered.length > 0);
            }
        } catch (err) {
            console.error("Erro ao buscar usuários:", err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (username && showAddForm) {
                searchUsers(username);
            }
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [username, showAddForm]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        if (showResults) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showResults]);

    const handleSelectUser = (userId: number, username: string) => {
        setSelectedUserId(userId);
        setUsername(username);
        setShowResults(false);
    };

    const handleAddFriend = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (!selectedUserId) {
            setError("Selecione um usuário da lista");
            return;
        }

        try {
            const response = await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username }),
            });

            const data = await response.json();

            if (data.success) {
                setUsername("");
                setSelectedUserId(null);
                setSearchResults([]);
                setShowAddForm(false);
                loadFriends();
            } else {
                setError(data.error || "Erro ao adicionar amigo");
            }
        } catch (err) {
            setError("Erro ao adicionar amigo");
        }
    };

    const handleRemoveFriend = async (friendId: number) => {
        if (!confirm("Tem certeza que deseja remover este amigo?")) {
            return;
        }

        setRemovingFriendId(friendId);
        try {
            const response = await fetch(`/api/friends/${friendId}`, {
                method: "DELETE",
            });

            const data = await response.json();

            if (data.success) {
                loadFriends();
            } else {
                alert(data.error || "Erro ao remover amigo");
            }
        } catch (err) {
            alert("Erro ao remover amigo");
        } finally {
            setRemovingFriendId(null);
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center py-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground">Carregando...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold">Amigos</h1>
                        <p className="text-muted-foreground mt-2">
                            Gerencie seus amigos para adicioná-los aos grupos
                        </p>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Adicionar Amigo
                    </Button>
                </div>

                {showAddForm && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Adicionar Amigo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddFriend} className="space-y-4">
                                <div className="relative" ref={dropdownRef}>
                                    <Input
                                        type="text"
                                        placeholder="Digite o nome de usuário..."
                                        value={username}
                                        onChange={(e) => {
                                            setUsername(e.target.value);
                                            setSelectedUserId(null);
                                            if (e.target.value.length >= 2) {
                                                setShowResults(true);
                                            }
                                        }}
                                        onFocus={() => {
                                            if (searchResults.length > 0 && !selectedUserId) {
                                                setShowResults(true);
                                            }
                                        }}
                                        autoComplete="off"
                                        className={selectedUserId ? "border-green-500 dark:border-green-600" : ""}
                                    />
                                    {searching && (
                                        <div className="absolute right-3 top-3">
                                            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                    {showResults && searchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto">
                                            {searchResults.map((user) => (
                                                <button
                                                    key={user.id}
                                                    type="button"
                                                    className="w-full text-left px-4 py-2 hover:bg-accent flex items-center gap-2 transition-colors"
                                                    onClick={() => handleSelectUser(user.id, user.username)}
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-sm font-medium text-primary">
                                                            {user.username[0]?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm">{user.username}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {username.length >= 2 && searchResults.length === 0 && !searching && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Nenhum usuário encontrado
                                        </p>
                                    )}
                                    {username.length > 0 && username.length < 2 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Digite pelo menos 2 caracteres
                                        </p>
                                    )}
                                    {selectedUserId && (
                                        <p className="text-xs text-green-600 dark:text-green-500 mt-1 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                            Usuário selecionado
                                        </p>
                                    )}
                                </div>
                                {error && <p className="text-sm text-destructive">{error}</p>}
                                <div className="flex gap-2">
                                    <Button type="submit" disabled={!selectedUserId} className="flex-1">
                                        Adicionar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowAddForm(false);
                                            setUsername("");
                                            setError("");
                                            setSearchResults([]);
                                            setSelectedUserId(null);
                                            setShowResults(false);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Meus Amigos ({friends.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {friends.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Você ainda não tem amigos adicionados.</p>
                                <p className="text-sm mt-2">Adicione amigos para poder incluí-los nos seus grupos!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {friends.map((friend) => (
                                    <div
                                        key={friend.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-sm font-medium text-primary">
                                                    {friend.username[0]?.toUpperCase()}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{friend.username}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Amigo desde {new Date(friend.created_at).toLocaleDateString("pt-BR")}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveFriend(friend.id)}
                                            disabled={removingFriendId === friend.id}
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            {removingFriendId === friend.id ? (
                                                <div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <X className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

