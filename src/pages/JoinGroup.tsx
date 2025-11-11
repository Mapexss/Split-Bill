import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, Users, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface GroupInfo {
    id: number;
    name: string;
    description?: string;
}

interface Member {
    username: string;
}

export function JoinGroup() {
    const { public_id } = useParams<{ public_id: string }>();
    const navigate = useNavigate();
    const [group, setGroup] = useState<GroupInfo | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (public_id) {
            loadGroupInfo();
        }
    }, [public_id]);

    const loadGroupInfo = async () => {
        try {
            const response = await fetch(`/api/join-group/${public_id}`);
            const data = await response.json();

            if (data.success) {
                setGroup(data.group);
                setMembers(data.members);
                setError(null);
            } else {
                setError(data.error || "Erro ao carregar informações do grupo");
            }
        } catch (error) {
            console.error("Erro ao carregar grupo:", error);
            setError("Erro ao carregar informações do grupo");
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        setJoining(true);
        setError(null);

        try {
            const response = await fetch(`/api/join-group/${public_id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                // Redirecionar para o grupo após 2 segundos
                setTimeout(() => {
                    navigate(`/grupos/${data.groupId}`);
                }, 2000);
            } else {
                if (data.error === "Não autenticado" || data.error === "Sessão inválida") {
                    // Redirecionar para login
                    navigate(`/entrar?redirect=/join-group/${public_id}`);
                } else {
                    setError(data.error || "Erro ao entrar no grupo");
                }
            }
        } catch (error) {
            console.error("Erro ao entrar no grupo:", error);
            setError("Erro ao entrar no grupo");
        } finally {
            setJoining(false);
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

    if (error && !group) {
        return (
            <Layout>
                <div className="flex items-center justify-center py-20">
                    <Card className="max-w-md w-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-destructive">
                                <XCircle className="h-5 w-5" />
                                Erro
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">{error}</p>
                            <Button onClick={() => navigate("/grupos")} variant="outline" className="w-full">
                                Voltar para Grupos
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    if (success) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4">
                    <Card className="max-w-md w-full shadow-lg">
                        <CardHeader className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
                                Sucesso!
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-foreground">
                                Você entrou no grupo <strong className="font-semibold">{group?.name}</strong> com sucesso!
                            </p>
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                <span>Redirecionando...</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4">
                <Card className="max-w-lg w-full shadow-lg">
                    <CardHeader className="text-center space-y-3 pb-6">
                        <CardTitle className="text-2xl md:text-3xl font-bold">
                            Convite para Grupo
                        </CardTitle>
                        <CardDescription className="text-base">
                            Você foi convidado para participar de um grupo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        {group && (
                            <>
                                {/* Nome do Grupo - Destaque */}
                                <div className="text-center space-y-3 pb-6 border-b">
                                    <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
                                        <p className="text-2xl md:text-4xl font-bold text-primary uppercase tracking-wide">
                                            {group.name}
                                        </p>
                                    </div>
                                    {group.description && (
                                        <p className="text-muted-foreground text-sm max-w-md mx-auto">
                                            {group.description}
                                        </p>
                                    )}
                                </div>

                                {/* Integrantes */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 justify-center">
                                        <Users className="h-5 w-5 text-muted-foreground" />
                                        <h3 className="font-semibold text-base">
                                            Integrantes Atuais
                                        </h3>
                                    </div>
                                    {members.length > 0 ? (
                                        <div className="bg-muted/50 rounded-lg p-4">
                                            <ul className="space-y-2">
                                                {members.map((member, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-center gap-2 text-sm"
                                                    >
                                                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                                                        <span className="text-foreground">{member.username}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="bg-muted/50 rounded-lg p-4 text-center">
                                            <p className="text-sm text-muted-foreground">
                                                Nenhum integrante ainda
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Mensagem de Erro */}
                                {error && (
                                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                        <p className="text-sm text-destructive text-center">{error}</p>
                                    </div>
                                )}

                                {/* Botões de Ação */}
                                <div className="space-y-3 pt-2">
                                    <Button
                                        onClick={handleJoin}
                                        disabled={joining}
                                        className="w-full h-12 text-base font-semibold"
                                        size="lg"
                                    >
                                        {joining ? "Entrando..." : "Entrar no Grupo"}
                                    </Button>
                                    <Button
                                        onClick={() => navigate("/grupos")}
                                        variant="outline"
                                        disabled={joining}
                                        className="w-full"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

