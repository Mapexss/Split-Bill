import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { UserPlus, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

interface Member {
    user_id: number;
    username: string;
}

interface MemberListProps {
    members: Member[];
    groupId: string;
    onMemberAdded: () => void;
}

export function MemberList({ members, groupId, onMemberAdded }: MemberListProps) {
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberUsername, setMemberUsername] = useState("");
    const [memberError, setMemberError] = useState("");
    const [searchResults, setSearchResults] = useState<{ id: number; username: string }[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    const searchUsers = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        setSearching(true);
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.success) {
                setSearchResults(data.users);
                setShowResults(data.users.length > 0);
            }
        } catch (err) {
            console.error("Erro ao buscar usuários:", err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (memberUsername && showAddMember) {
                searchUsers(memberUsername);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [memberUsername, showAddMember]);

    const handleSelectUser = (userId: number, username: string) => {
        setSelectedUserId(userId);
        setMemberUsername(username);
        setShowResults(false);
    };

    const handleAddMember = async (e: FormEvent) => {
        e.preventDefault();
        setMemberError("");

        if (!selectedUserId) {
            setMemberError("Selecione um usuário da lista");
            return;
        }

        try {
            const response = await fetch(`/api/groups/${groupId}/members`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: memberUsername }),
            });

            const data = await response.json();

            if (data.success) {
                setMemberUsername("");
                setSelectedUserId(null);
                setSearchResults([]);
                setShowAddMember(false);
                onMemberAdded();
            } else {
                setMemberError(data.error || "Erro ao adicionar membro");
            }
        } catch (err) {
            setMemberError("Erro ao adicionar membro");
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Membros ({members.length})
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddMember(!showAddMember)}
                    >
                        <UserPlus className="h-4 w-4" />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {showAddMember && (
                    <form onSubmit={handleAddMember} className="space-y-2 mb-4 pb-4 border-b">
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Digite para buscar usuário..."
                                value={memberUsername}
                                onChange={(e) => {
                                    setMemberUsername(e.target.value);
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
                                className={selectedUserId ? "border-green-500" : ""}
                            />
                            {searching && (
                                <div className="absolute right-3 top-3">
                                    <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {searchResults.map((user) => (
                                        <button
                                            key={user.id}
                                            type="button"
                                            className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 transition-colors"
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
                            {memberUsername.length >= 2 && searchResults.length === 0 && !searching && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Nenhum usuário encontrado
                                </p>
                            )}
                            {memberUsername.length > 0 && memberUsername.length < 2 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Digite pelo menos 2 caracteres
                                </p>
                            )}
                            {selectedUserId && (
                                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    Usuário selecionado
                                </p>
                            )}
                        </div>
                        {memberError && (
                            <p className="text-sm text-destructive">{memberError}</p>
                        )}
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                size="sm"
                                className="flex-1"
                                disabled={!selectedUserId}
                            >
                                Adicionar
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setShowAddMember(false);
                                    setMemberUsername("");
                                    setMemberError("");
                                    setSearchResults([]);
                                    setSelectedUserId(null);
                                    setShowResults(false);
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </form>
                )}
                {members.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 p-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                                {member.username[0]?.toUpperCase()}
                            </span>
                        </div>
                        <span className="text-sm">{member.username}</span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

