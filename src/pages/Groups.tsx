import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Plus, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

interface Group {
    id: number;
    name: string;
    description?: string;
    created_at: string;
}

export function Groups() {
    const navigate = useNavigate();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");
    const [user, setUser] = useState<{ username: string } | null>(null);

    useEffect(() => {
        checkAuth();
        loadGroups();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch("/api/me");
            const data = await response.json();

            if (!data.authenticated) {
                navigate("/entrar");
            } else {
                setUser({ username: data.username });
            }
        } catch (error) {
            navigate("/entrar");
        }
    };

    const loadGroups = async () => {
        try {
            const response = await fetch("/api/groups");
            const data = await response.json();

            if (data.success) {
                setGroups(data.groups);
            }
        } catch (error) {
            console.error("Erro ao carregar grupos:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/logout", { method: "POST" });
            navigate("/entrar");
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    };

    const handleCreateGroup = async (e: FormEvent) => {
        e.preventDefault();
        setError("");

        if (!name.trim()) {
            setError("Nome do grupo é obrigatório");
            return;
        }

        try {
            const response = await fetch("/api/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, description }),
            });

            const data = await response.json();

            if (data.success) {
                setName("");
                setDescription("");
                setShowCreateForm(false);
                loadGroups();
            } else {
                setError(data.error || "Erro ao criar grupo");
            }
        } catch (err) {
            setError("Erro ao criar grupo");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/painel" className="text-2xl font-bold text-primary">
                            Dividir Conta
                        </Link>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">
                                Olá, <span className="font-medium text-foreground">{user?.username}</span>
                            </span>
                            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                                <LogOut className="h-4 w-4" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Meus Grupos</h1>
                        <p className="text-gray-600 mt-1">Gerencie suas despesas compartilhadas</p>
                    </div>
                    <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Novo Grupo
                    </Button>
                </div>

                {showCreateForm && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Criar Novo Grupo</CardTitle>
                            <CardDescription>Adicione um grupo para dividir despesas com amigos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateGroup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome do Grupo</Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Ex: Viagem Praia 2025"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição (opcional)</Label>
                                    <Input
                                        id="description"
                                        type="text"
                                        placeholder="Ex: Despesas da viagem..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </div>

                                {error && (
                                    <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button type="submit" className="flex-1">Criar Grupo</Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowCreateForm(false);
                                            setName("");
                                            setDescription("");
                                            setError("");
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {groups.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nenhum grupo ainda</h3>
                            <p className="text-muted-foreground mb-4">
                                Crie seu primeiro grupo para começar a dividir despesas
                            </p>
                            <Button onClick={() => setShowCreateForm(true)} className="gap-2">
                                <Plus className="h-4 w-4" />
                                Criar Primeiro Grupo
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.map((group) => (
                            <Link key={group.id} to={`/grupos/${group.id}`}>
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="h-5 w-5 text-primary" />
                                            {group.name}
                                        </CardTitle>
                                        {group.description && (
                                            <CardDescription>{group.description}</CardDescription>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">
                                            Criado em {new Date(group.created_at).toLocaleDateString('pt-BR')}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

