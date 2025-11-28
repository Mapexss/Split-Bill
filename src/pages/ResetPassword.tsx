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
import { Key, Moon, Sun } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export function ResetPassword() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [username, setUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        // Validações
        if (newPassword !== confirmPassword) {
            setError("As senhas não coincidem");
            return;
        }

        if (!username || !newPassword || !code) {
            setError("Todos os campos são obrigatórios");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, newPassword, code }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    navigate("/entrar");
                }, 2000);
            } else {
                setError(data.error || "Falha ao resetar senha");
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
                            <Key className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-bold text-center">
                        Resetar Senha
                    </CardTitle>
                    <CardDescription className="text-center text-base">
                        Informe seu login, nova senha e o código de segurança
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="space-y-4">
                            <div className="text-sm text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-md text-center">
                                Senha resetada com sucesso! Redirecionando para o login...
                            </div>
                        </div>
                    ) : (
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
                                <Label htmlFor="newPassword">Nova senha</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Digite sua nova senha"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="Confirme sua nova senha"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="code">Código de segurança</Label>
                                <Input
                                    id="code"
                                    type="text"
                                    placeholder="Digite o código de segurança"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
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
                                {loading ? "Resetando..." : "Resetar Senha"}
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 pt-4 border-t">
                        <p className="text-center text-sm text-muted-foreground">
                            Lembrou sua senha?{" "}
                            <Link to="/entrar" className="text-primary hover:underline font-medium">
                                Entre aqui
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

