import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Receipt, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Dashboard() {
    const navigate = useNavigate();

    return (
        <Layout>
            <div className="space-y-8">
                {/* Hero Section */}
                <div className="text-center space-y-4 py-8">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                        Bem-vindo ao Dividir Conta!
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Gerencie suas despesas compartilhadas de forma fácil, organizada e transparente
                    </p>
                </div>

                {/* Feature Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card
                        className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2"
                        onClick={() => navigate("/grupos")}
                    >
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Users className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Grupos</CardTitle>
                            </div>
                            <CardDescription>
                                Crie grupos para diferentes ocasiões e adicione membros
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card
                        className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2"
                        onClick={() => navigate("/grupos")}
                    >
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Receipt className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Despesas</CardTitle>
                            </div>
                            <CardDescription>
                                Registre despesas e divida automaticamente entre membros
                            </CardDescription>
                        </CardHeader>
                    </Card>

                    <Card
                        className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer border-2"
                        onClick={() => navigate("/grupos")}
                    >
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle>Saldos</CardTitle>
                            </div>
                            <CardDescription>
                                Visualize quem deve para quem e simplifique pagamentos
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </div>

                {/* Quick Actions */}
                <Card className="border-2 border-primary/20">
                    <CardHeader>
                        <CardTitle>Comece Agora</CardTitle>
                        <CardDescription>
                            Organize suas despesas compartilhadas em poucos cliques
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button
                            onClick={() => navigate("/grupos")}
                            className="w-full gap-2 h-12 text-lg"
                            size="lg"
                        >
                            Ver Meus Grupos
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                        <p className="text-sm text-muted-foreground text-center">
                            Crie um grupo novo ou acesse grupos existentes
                        </p>
                    </CardContent>
                </Card>

                {/* How it works */}
                <Card>
                    <CardHeader>
                        <CardTitle>Como Funciona</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="space-y-2 text-center">
                                <div className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
                                    1
                                </div>
                                <h3 className="font-semibold">Crie um Grupo</h3>
                                <p className="text-sm text-muted-foreground">
                                    Organize despesas por ocasião
                                </p>
                            </div>
                            <div className="space-y-2 text-center">
                                <div className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
                                    2
                                </div>
                                <h3 className="font-semibold">Adicione Membros</h3>
                                <p className="text-sm text-muted-foreground">
                                    Convide pessoas para o grupo
                                </p>
                            </div>
                            <div className="space-y-2 text-center">
                                <div className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
                                    3
                                </div>
                                <h3 className="font-semibold">Registre Despesas</h3>
                                <p className="text-sm text-muted-foreground">
                                    Adicione gastos e divida valores
                                </p>
                            </div>
                            <div className="space-y-2 text-center">
                                <div className="bg-primary text-primary-foreground w-10 h-10 rounded-full flex items-center justify-center mx-auto font-bold text-lg">
                                    4
                                </div>
                                <h3 className="font-semibold">Acerte as Contas</h3>
                                <p className="text-sm text-muted-foreground">
                                    Veja quem deve e receba pagamentos
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

