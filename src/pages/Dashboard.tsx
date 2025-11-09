import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface User {
    authenticated: boolean;
    username?: string;
}

export function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch("/api/me");
            const data = await response.json();

            if (!data.authenticated) {
                navigate("/entrar");
            } else {
                setUser(data);
            }
        } catch (error) {
            navigate("/entrar");
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
                        <h1 className="text-2xl font-bold text-primary">Dividir Conta</h1>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-muted-foreground">
                                Olá, <span className="font-medium text-foreground">{user?.username}</span>
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLogout}
                                className="gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Bem-vindo ao Dividir Conta!</CardTitle>
                        <CardDescription>
                            Gerencie suas despesas compartilhadas de forma fácil e organizada
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">Usuário:</span> {user?.username}
                                </p>
                            </div>

                            <div className="pt-4 border-t">
                                <Button
                                    onClick={() => navigate("/grupos")}
                                    className="w-full"
                                >
                                    Ver Meus Grupos
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

