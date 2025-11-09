import { BalanceList } from "@/components/group/BalanceList";
import { DebtList } from "@/components/group/DebtList";
import { ExpenseAddForm } from "@/components/group/ExpenseAddForm";
import { ExpenseEditForm } from "@/components/group/ExpenseEditForm";
import { ExpenseList } from "@/components/group/ExpenseList";
import { MemberList } from "@/components/group/MemberList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, LogOut, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

interface Group {
    id: number;
    name: string;
    description?: string;
}

interface Member {
    user_id: number;
    username: string;
}

interface Expense {
    id: number;
    description: string;
    amount: number;
    paid_by_username: string;
    category?: string;
    date: string;
}

interface Balance {
    userId: number;
    username: string;
    balance: number;
}

interface Debt {
    from: number;
    fromUsername: string;
    to: number;
    toUsername: string;
    amount: number;
}

export function GroupDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<Balance[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ username: string; userId?: number } | null>(null);

    // UI states
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

    useEffect(() => {
        checkAuth();
        if (id) {
            loadGroupData();
        }
    }, [id]);

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

    const loadGroupData = async () => {
        try {
            const response = await fetch(`/api/groups/${id}`);
            const data = await response.json();

            if (data.success) {
                setGroup(data.group);
                setMembers(data.members);
                setExpenses(data.expenses);
                setBalances(data.balances);
                setDebts(data.debts);
            } else {
                navigate("/grupos");
            }
        } catch (error) {
            console.error("Erro ao carregar grupo:", error);
            navigate("/grupos");
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

    const handleExpenseAdded = () => {
        setShowAddExpense(false);
        loadGroupData();
    };

    const handleExpenseUpdated = () => {
        setEditingExpenseId(null);
        loadGroupData();
    };

    const handleEdit = (expenseId: number) => {
        setEditingExpenseId(expenseId);
        setShowAddExpense(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
            </div>
        );
    }

    if (!group) {
        return null;
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
                <div className="mb-6">
                    <Link to="/grupos" className="inline-flex items-center text-primary hover:underline mb-2">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar para grupos
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
                    {group.description && <p className="text-gray-600 mt-1">{group.description}</p>}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-4">
                        <MemberList
                            members={members}
                            groupId={id!}
                            onMemberAdded={loadGroupData}
                        />

                        <BalanceList balances={balances} />

                        <DebtList
                            debts={debts}
                            groupId={id!}
                            onSettlement={loadGroupData}
                        />
                    </div>

                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Add expense button */}
                        {!showAddExpense && !editingExpenseId && (
                            <Card>
                                <CardContent className="py-4">
                                    <Button
                                        onClick={() => setShowAddExpense(true)}
                                        className="w-full gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Adicionar Despesa
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Add expense form */}
                        {showAddExpense && (
                            <ExpenseAddForm
                                groupId={id!}
                                members={members}
                                onExpenseAdded={handleExpenseAdded}
                                onCancel={() => setShowAddExpense(false)}
                            />
                        )}

                        {/* Edit expense form */}
                        {editingExpenseId && (
                            <ExpenseEditForm
                                expenseId={editingExpenseId}
                                members={members}
                                onExpenseUpdated={handleExpenseUpdated}
                                onCancel={() => setEditingExpenseId(null)}
                            />
                        )}

                        {/* Expenses list */}
                        {!editingExpenseId && (
                            <ExpenseList
                                expenses={expenses}
                                onEdit={handleEdit}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
