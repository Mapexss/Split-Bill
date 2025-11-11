import { BalanceList } from "@/components/group/BalanceList";
import { DebtList } from "@/components/group/DebtList";
import { ExpenseAddForm } from "@/components/group/ExpenseAddForm";
import { ExpenseEditForm } from "@/components/group/ExpenseEditForm";
import { ExpenseList } from "@/components/group/ExpenseList";
import { MemberList } from "@/components/group/MemberList";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Copy, Plus, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

interface Group {
    id: number;
    name: string;
    description?: string;
    public_id?: string;
    open_to_invites?: number;
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

interface ExpenseDebt {
    expenseId: number;
    expenseDescription: string;
    expenseDate: string;
    expenseCategory?: string;
    from: number;
    fromUsername: string;
    to: number;
    toUsername: string;
    amount: number;
    totalExpenseAmount: number;
}

interface DebtWithDetails {
    from: number;
    fromUsername: string;
    to: number;
    toUsername: string;
    amount: number;
    expenses: ExpenseDebt[];
}

export function GroupDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [balances, setBalances] = useState<Balance[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [debtsWithDetails, setDebtsWithDetails] = useState<DebtWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    // UI states
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);

    useEffect(() => {
        loadCurrentUser();
        if (id) {
            loadGroupData();
        }
    }, [id]);

    const loadCurrentUser = async () => {
        try {
            const response = await fetch("/api/me");
            const data = await response.json();
            if (data.authenticated && data.userId) {
                setCurrentUserId(data.userId);
            }
        } catch (error) {
            console.error("Erro ao carregar usuário:", error);
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
                setDebtsWithDetails(data.debtsWithDetails || []);
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

    const handleCopyLink = async () => {
        if (!group?.public_id) return;

        const link = `${window.location.origin}/join-group/${group.public_id}`;

        try {
            await navigator.clipboard.writeText(link);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (error) {
            console.error("Erro ao copiar link:", error);
            // Fallback: criar um input temporário
            const input = document.createElement("input");
            input.value = link;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            document.body.removeChild(input);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        }
    };

    const handleToggleInvites = async (enabled: boolean) => {
        try {
            const response = await fetch(`/api/groups/${id}/invites`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ open_to_invites: enabled }),
            });

            const data = await response.json();
            if (data.success) {
                // Atualizar o estado local imediatamente para feedback visual
                if (group) {
                    setGroup({
                        ...group,
                        open_to_invites: enabled ? 1 : 0,
                    });
                }
                // Recarregar dados do servidor
                loadGroupData();
            } else {
                console.error("Erro ao atualizar:", data.error);
            }
        } catch (error) {
            console.error("Erro ao atualizar configuração:", error);
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

    if (!group) {
        return null;
    }

    return (
        <Layout maxWidth="full">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <Link
                        to="/grupos"
                        className="inline-flex items-center text-primary hover:text-primary/80 transition-colors w-fit gap-1"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        <span className="font-medium">Voltar para grupos</span>
                    </Link>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-3xl md:text-4xl font-bold">{group.name}</h1>
                            {group.description && (
                                <p className="text-muted-foreground mt-2 text-lg">{group.description}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={Number(group.open_to_invites) === 1}
                                    onChange={(e) => handleToggleInvites(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                    Abrir a convites
                                </span>
                            </label>
                            {Number(group.open_to_invites) === 1 && group.public_id && (
                                <Button
                                    onClick={handleCopyLink}
                                    variant="outline"
                                    className="gap-2 whitespace-nowrap"
                                    size="sm"
                                >
                                    {linkCopied ? (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Link copiado!
                                        </>
                                    ) : (
                                        <>
                                            <Share2 className="h-4 w-4" />
                                            Copiar Link
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Sidebar */}
                    <div className="xl:col-span-1 space-y-4 order-2 xl:order-1">
                        <MemberList
                            members={members}
                            groupId={id!}
                            onMemberAdded={loadGroupData}
                        />

                        <BalanceList balances={balances} />

                        <DebtList
                            debtsWithDetails={debtsWithDetails}
                            groupId={id!}
                            currentUserId={currentUserId}
                            onSettlement={loadGroupData}
                        />
                    </div>

                    {/* Main content */}
                    <div className="xl:col-span-2 space-y-4 order-1 xl:order-2">
                        {/* Add expense button */}
                        {!showAddExpense && !editingExpenseId && (
                            <Card className="border-2 border-dashed hover:border-primary transition-colors">
                                <CardContent className="py-6">
                                    <Button
                                        onClick={() => setShowAddExpense(true)}
                                        className="w-full gap-2 h-12 text-lg"
                                        size="lg"
                                    >
                                        <Plus className="h-5 w-5" />
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
            </div>
        </Layout>
    );
}
