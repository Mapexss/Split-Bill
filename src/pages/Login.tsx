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
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Receipt, Sun } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { theme, toggleTheme } = useTheme();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success) {
                const redirect = searchParams.get("redirect");
                navigate(redirect || "/painel");
            } else {
                setError(data.error || "Falha no login");
            }
        } catch (err) {
            setError("Ocorreu um erro. Por favor, tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 bg-background relative">
            {/* Theme Toggle - Top Right */}
            <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="absolute top-4 right-4 rounded-full"
                aria-label="Alternar tema"
            >
                {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>

            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-4 pb-4">
                    <div className="flex justify-center">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Receipt className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-center">
                        Dividir Conta
                    </CardTitle>
                    <CardDescription className="text-center text-base">
                        Entre para gerenciar suas despesas compartilhadas
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Nome de usuário</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Digite seu nome de usuário"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={loading}
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Senha</Label>
                                <Link
                                    to="/resetar-senha"
                                    className="text-xs text-primary hover:underline"
                                >
                                    Esqueceu sua senha?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Digite sua senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="h-11"
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full h-11" disabled={loading}>
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>

                    <div className="mt-6 pt-4 border-t">
                        <p className="text-center text-sm text-muted-foreground">
                            Não tem uma conta?{" "}
                            <Link to="/registrar" className="text-primary hover:underline font-medium">
                                Cadastre-se aqui
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

