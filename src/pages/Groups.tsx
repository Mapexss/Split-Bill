import { Layout } from "@/components/layout";
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
import { Plus, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

interface Group {
    id: number;
    name: string;
    description?: string;
    created_at: string;
}

export function Groups() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        loadGroups();
    }, []);

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
        <Layout maxWidth="2xl">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold">Meus Grupos</h1>
                        <p className="text-muted-foreground mt-1">Gerencie suas despesas compartilhadas</p>
                    </div>
                    <Button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="gap-2 w-full sm:w-auto"
                        size="lg"
                    >
                        <Plus className="h-5 w-5" />
                        Novo Grupo
                    </Button>
                </div>

                {showCreateForm && (
                    <Card className="border-2 border-primary/20">
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
                        <CardContent className="py-16 text-center">
                            <div className="flex flex-col items-center space-y-4">
                                <div className="p-4 bg-primary/10 rounded-full">
                                    <Users className="h-16 w-16 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold">Nenhum grupo ainda</h3>
                                <p className="text-muted-foreground max-w-md">
                                    Crie seu primeiro grupo para começar a dividir despesas com amigos e familiares
                                </p>
                                <Button onClick={() => setShowCreateForm(true)} className="gap-2" size="lg">
                                    <Plus className="h-5 w-5" />
                                    Criar Primeiro Grupo
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {groups.map((group) => (
                            <Link key={group.id} to={`/grupos/${group.id}`}>
                                <Card className="hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer h-full hover:scale-105">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <Users className="h-5 w-5 text-primary" />
                                            </div>
                                            <span className="truncate">{group.name}</span>
                                        </CardTitle>
                                        {group.description && (
                                            <CardDescription className="line-clamp-2">{group.description}</CardDescription>
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
            </div>
        </Layout>
    );
}

