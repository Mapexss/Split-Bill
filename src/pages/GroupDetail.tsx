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
import {
    ArrowLeft,
    Clock,
    DollarSign,
    Edit,
    History,
    LogOut,
    Plus,
    TrendingDown,
    TrendingUp,
    UserPlus,
    Users
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
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

    // Add member form
    const [showAddMember, setShowAddMember] = useState(false);
    const [memberUsername, setMemberUsername] = useState("");
    const [memberError, setMemberError] = useState("");
    const [searchResults, setSearchResults] = useState<{ id: number; username: string }[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    // Add expense form
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [expenseDescription, setExpenseDescription] = useState("");
    const [expenseAmount, setExpenseAmount] = useState("");
    const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0] || "");
    const [expenseCategory, setExpenseCategory] = useState("");
    const [expensePaidBy, setExpensePaidBy] = useState<number | "">("");
    const [expenseSplits, setExpenseSplits] = useState<Record<number, string>>({});
    const [includedMembers, setIncludedMembers] = useState<Set<number>>(new Set());
    const [expenseError, setExpenseError] = useState("");

    // Expense details
    const [expandedExpense, setExpandedExpense] = useState<number | null>(null);
    const [expenseDetails, setExpenseDetails] = useState<Record<number, { user_id: number; username: string; amount: number }[]>>({});

    // Edit expense
    const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
    const [editExpenseDescription, setEditExpenseDescription] = useState("");
    const [editExpenseAmount, setEditExpenseAmount] = useState("");
    const [editExpenseDate, setEditExpenseDate] = useState("");
    const [editExpenseCategory, setEditExpenseCategory] = useState("");
    const [editExpensePaidBy, setEditExpensePaidBy] = useState<number | "">("");
    const [editExpenseSplits, setEditExpenseSplits] = useState<Record<number, string>>({});
    const [editIncludedMembers, setEditIncludedMembers] = useState<Set<number>>(new Set());
    const [editExpenseError, setEditExpenseError] = useState("");

    // Expense history
    const [showHistory, setShowHistory] = useState<number | null>(null);
    const [expenseHistory, setExpenseHistory] = useState<any[]>([]);

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

                // Initialize splits equally
                const initialSplits: Record<number, string> = {};
                const allMemberIds = new Set<number>();
                data.members.forEach((m: Member) => {
                    initialSplits[m.user_id] = "";
                    allMemberIds.add(m.user_id);
                });
                setExpenseSplits(initialSplits);
                setIncludedMembers(allMemberIds);
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

    // Debounce para a busca
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
            const response = await fetch(`/api/groups/${id}/members`, {
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
                loadGroupData();
            } else {
                setMemberError(data.error || "Erro ao adicionar membro");
            }
        } catch (err) {
            setMemberError("Erro ao adicionar membro");
        }
    };

    const splitEqually = () => {
        const amount = parseFloat(expenseAmount);
        const includedCount = includedMembers.size;

        if (!isNaN(amount) && includedCount > 0) {
            const perPerson = (amount / includedCount).toFixed(2);
            const newSplits: Record<number, string> = {};
            members.forEach((m) => {
                if (includedMembers.has(m.user_id)) {
                    newSplits[m.user_id] = perPerson;
                } else {
                    newSplits[m.user_id] = "0";
                }
            });
            setExpenseSplits(newSplits);
        }
    };

    const toggleMemberInclusion = (userId: number) => {
        const newIncluded = new Set(includedMembers);
        if (newIncluded.has(userId)) {
            newIncluded.delete(userId);
            // Zerar o valor quando remover
            setExpenseSplits({
                ...expenseSplits,
                [userId]: "0",
            });
        } else {
            newIncluded.add(userId);
        }
        setIncludedMembers(newIncluded);
    };

    const handleAddExpense = async (e: FormEvent) => {
        e.preventDefault();
        setExpenseError("");

        const amount = parseFloat(expenseAmount);
        if (isNaN(amount) || amount <= 0) {
            setExpenseError("Valor inválido");
            return;
        }

        if (!expensePaidBy) {
            setExpenseError("Selecione quem pagou");
            return;
        }

        if (includedMembers.size === 0) {
            setExpenseError("Selecione pelo menos uma pessoa para dividir a despesa");
            return;
        }

        // Build splits array
        const splits = Object.entries(expenseSplits)
            .filter(([_, value]) => value && parseFloat(value) > 0)
            .map(([userId, value]) => ({
                userId: parseInt(userId),
                amount: parseFloat(value),
            }));

        if (splits.length === 0) {
            setExpenseError("Adicione pelo menos uma divisão");
            return;
        }

        const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
            setExpenseError(
                `Soma das divisões (R$ ${totalSplits.toFixed(2)}) não corresponde ao total (R$ ${amount.toFixed(2)})`
            );
            return;
        }

        try {
            const response = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    groupId: parseInt(id!),
                    description: expenseDescription,
                    amount,
                    paidBy: expensePaidBy,
                    date: expenseDate,
                    category: expenseCategory || null,
                    splits,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setExpenseDescription("");
                setExpenseAmount("");
                setExpenseCategory("");
                setExpenseDate(new Date().toISOString().split('T')[0] || "");
                setShowAddExpense(false);
                loadGroupData();
            } else {
                setExpenseError(data.error || "Erro ao adicionar despesa");
            }
        } catch (err) {
            setExpenseError("Erro ao adicionar despesa");
        }
    };

    const handleSettlement = async (debt: Debt) => {
        try {
            const response = await fetch("/api/settlements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    groupId: parseInt(id!),
                    fromUser: debt.from,
                    toUser: debt.to,
                    amount: debt.amount,
                    note: `Pagamento registrado`,
                }),
            });

            const data = await response.json();

            if (data.success) {
                loadGroupData();
            }
        } catch (err) {
            console.error("Erro ao registrar pagamento:", err);
        }
    };

    const loadExpenseDetails = async (expenseId: number) => {
        if (expenseDetails[expenseId]) {
            // Já carregado, apenas toggle
            setExpandedExpense(expandedExpense === expenseId ? null : expenseId);
            return;
        }

        try {
            const response = await fetch(`/api/expenses/${expenseId}`);
            const data = await response.json();

            if (data.success) {
                setExpenseDetails({
                    ...expenseDetails,
                    [expenseId]: data.splits,
                });
                setExpandedExpense(expenseId);
            }
        } catch (err) {
            console.error("Erro ao carregar detalhes da despesa:", err);
        }
    };

    const loadExpenseForEdit = async (expenseId: number) => {
        try {
            const response = await fetch(`/api/expenses/${expenseId}`);
            const data = await response.json();

            if (data.success) {
                setEditingExpenseId(expenseId);
                setEditExpenseDescription(data.expense.description);
                setEditExpenseAmount(data.expense.amount.toString());
                setEditExpenseDate(data.expense.date);
                setEditExpenseCategory(data.expense.category || "");
                setEditExpensePaidBy(data.expense.paid_by);

                // Carregar splits
                const splits: Record<number, string> = {};
                const included = new Set<number>();
                data.splits.forEach((split: any) => {
                    splits[split.user_id] = split.amount.toString();
                    included.add(split.user_id);
                });

                // Adicionar membros que não estão na split com valor 0
                members.forEach((m) => {
                    if (!splits[m.user_id]) {
                        splits[m.user_id] = "0";
                    }
                });

                setEditExpenseSplits(splits);
                setEditIncludedMembers(included);
                setShowAddExpense(false);
            }
        } catch (err) {
            console.error("Erro ao carregar despesa:", err);
        }
    };

    const splitEquallyEdit = () => {
        const amount = parseFloat(editExpenseAmount);
        const includedCount = editIncludedMembers.size;

        if (!isNaN(amount) && includedCount > 0) {
            const perPerson = (amount / includedCount).toFixed(2);
            const newSplits: Record<number, string> = {};
            members.forEach((m) => {
                if (editIncludedMembers.has(m.user_id)) {
                    newSplits[m.user_id] = perPerson;
                } else {
                    newSplits[m.user_id] = "0";
                }
            });
            setEditExpenseSplits(newSplits);
        }
    };

    const toggleMemberInclusionEdit = (userId: number) => {
        const newIncluded = new Set(editIncludedMembers);
        if (newIncluded.has(userId)) {
            newIncluded.delete(userId);
            setEditExpenseSplits({
                ...editExpenseSplits,
                [userId]: "0",
            });
        } else {
            newIncluded.add(userId);
        }
        setEditIncludedMembers(newIncluded);
    };

    const handleUpdateExpense = async (e: FormEvent) => {
        e.preventDefault();
        setEditExpenseError("");

        if (!editingExpenseId) return;

        const amount = parseFloat(editExpenseAmount);
        if (isNaN(amount) || amount <= 0) {
            setEditExpenseError("Valor inválido");
            return;
        }

        if (!editExpensePaidBy) {
            setEditExpenseError("Selecione quem pagou");
            return;
        }

        if (editIncludedMembers.size === 0) {
            setEditExpenseError("Selecione pelo menos uma pessoa para dividir a despesa");
            return;
        }

        const splits = Object.entries(editExpenseSplits)
            .filter(([userId, value]) => editIncludedMembers.has(parseInt(userId)) && value && parseFloat(value) > 0)
            .map(([userId, value]) => ({
                userId: parseInt(userId),
                amount: parseFloat(value),
            }));

        if (splits.length === 0) {
            setEditExpenseError("Adicione pelo menos uma divisão");
            return;
        }

        const totalSplits = splits.reduce((sum, s) => sum + s.amount, 0);
        if (Math.abs(totalSplits - amount) > 0.01) {
            setEditExpenseError(
                `Soma das divisões (R$ ${totalSplits.toFixed(2)}) não corresponde ao total (R$ ${amount.toFixed(2)})`
            );
            return;
        }

        try {
            const response = await fetch(`/api/expenses/${editingExpenseId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: editExpenseDescription,
                    amount,
                    paidBy: editExpensePaidBy,
                    date: editExpenseDate,
                    category: editExpenseCategory || null,
                    splits,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setEditingExpenseId(null);
                setEditExpenseError("");
                loadGroupData();
            } else {
                setEditExpenseError(data.error || "Erro ao atualizar despesa");
            }
        } catch (err) {
            setEditExpenseError("Erro ao atualizar despesa");
        }
    };

    const loadExpenseHistory = async (expenseId: number) => {
        if (showHistory === expenseId) {
            setShowHistory(null);
            return;
        }

        try {
            const response = await fetch(`/api/expenses/${expenseId}/history`);
            const data = await response.json();

            if (data.success) {
                setExpenseHistory(data.changes);
                setShowHistory(expenseId);
            }
        } catch (err) {
            console.error("Erro ao carregar histórico:", err);
        }
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
                        {/* Members */}
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

                        {/* Balances */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5" />
                                    Balanços
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {balances.map((balance) => (
                                    <div
                                        key={balance.userId}
                                        className="flex items-center justify-between p-2 rounded"
                                    >
                                        <span className="text-sm">{balance.username}</span>
                                        <span
                                            className={`text-sm font-semibold flex items-center gap-1 ${balance.balance > 0
                                                ? "text-green-600"
                                                : balance.balance < 0
                                                    ? "text-red-600"
                                                    : "text-gray-600"
                                                }`}
                                        >
                                            {balance.balance > 0 ? (
                                                <TrendingUp className="h-4 w-4" />
                                            ) : balance.balance < 0 ? (
                                                <TrendingDown className="h-4 w-4" />
                                            ) : null}
                                            R$ {Math.abs(balance.balance).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Debts/Payments */}
                        {debts.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Quem deve pagar</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {debts.map((debt) => (
                                        <div key={`debt-${debt.from}-${debt.to}-${debt.amount}`} className="p-3 bg-orange-50 rounded-lg">
                                            <p className="text-sm mb-2">
                                                <span className="font-medium">{debt.fromUsername}</span> deve{" "}
                                                <span className="font-bold text-orange-600">
                                                    R$ {debt.amount.toFixed(2)}
                                                </span>{" "}
                                                para <span className="font-medium">{debt.toUsername}</span>
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => handleSettlement(debt)}
                                            >
                                                Marcar como pago
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Add expense button */}
                        <Card>
                            <CardContent className="py-4">
                                <Button
                                    onClick={() => setShowAddExpense(!showAddExpense)}
                                    className="w-full gap-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    Adicionar Despesa
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Add expense form */}
                        {showAddExpense && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Nova Despesa</CardTitle>
                                    <CardDescription>Adicione uma despesa para dividir com o grupo</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleAddExpense} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="description">Descrição</Label>
                                                <Input
                                                    id="description"
                                                    type="text"
                                                    placeholder="Ex: Jantar"
                                                    value={expenseDescription}
                                                    onChange={(e) => setExpenseDescription(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="amount">Valor Total</Label>
                                                <Input
                                                    id="amount"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={expenseAmount}
                                                    onChange={(e) => setExpenseAmount(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="paidBy">Pago por</Label>
                                                <select
                                                    id="paidBy"
                                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    value={expensePaidBy}
                                                    onChange={(e) => setExpensePaidBy(parseInt(e.target.value))}
                                                    required
                                                >
                                                    <option value="">Selecione...</option>
                                                    {members.map((m) => (
                                                        <option key={m.user_id} value={m.user_id}>
                                                            {m.username}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="date">Data</Label>
                                                <Input
                                                    id="date"
                                                    type="date"
                                                    value={expenseDate}
                                                    onChange={(e) => setExpenseDate(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2 col-span-2">
                                                <Label htmlFor="category">Categoria (opcional)</Label>
                                                <Input
                                                    id="category"
                                                    type="text"
                                                    placeholder="Ex: Alimentação"
                                                    value={expenseCategory}
                                                    onChange={(e) => setExpenseCategory(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Label>Dividir entre</Label>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {includedMembers.size} de {members.length} pessoa{members.length !== 1 ? 's' : ''} selecionada{includedMembers.size !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={splitEqually}
                                                    disabled={includedMembers.size === 0}
                                                >
                                                    Dividir igualmente
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                💡 Desmarque membros que não participarão desta despesa
                                            </p>
                                            <div className="space-y-2">
                                                {members.map((member) => (
                                                    <div key={member.user_id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={includedMembers.has(member.user_id)}
                                                            onChange={() => toggleMemberInclusion(member.user_id)}
                                                            className="h-4 w-4 rounded border-gray-300"
                                                        />
                                                        <span className={`text-sm w-32 ${!includedMembers.has(member.user_id) ? 'text-gray-400 line-through' : ''}`}>
                                                            {member.username}
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={expenseSplits[member.user_id] || ""}
                                                            onChange={(e) =>
                                                                setExpenseSplits({
                                                                    ...expenseSplits,
                                                                    [member.user_id]: e.target.value,
                                                                })
                                                            }
                                                            disabled={!includedMembers.has(member.user_id)}
                                                            className={!includedMembers.has(member.user_id) ? 'bg-gray-100' : ''}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {expenseError && (
                                            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                                                {expenseError}
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button type="submit" className="flex-1">
                                                Adicionar Despesa
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setShowAddExpense(false);
                                                    setExpenseError("");
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Edit expense form */}
                        {editingExpenseId && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <Edit className="h-5 w-5" />
                                            Editar Despesa
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setEditingExpenseId(null);
                                                setEditExpenseError("");
                                            }}
                                        >
                                            ✕
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleUpdateExpense} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2 col-span-2">
                                                <Label htmlFor="edit-description">Descrição</Label>
                                                <Input
                                                    id="edit-description"
                                                    type="text"
                                                    placeholder="Ex: Jantar no restaurante"
                                                    value={editExpenseDescription}
                                                    onChange={(e) => setEditExpenseDescription(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-amount">Valor total (R$)</Label>
                                                <Input
                                                    id="edit-amount"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={editExpenseAmount}
                                                    onChange={(e) => setEditExpenseAmount(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-paid-by">Quem pagou?</Label>
                                                <select
                                                    id="edit-paid-by"
                                                    value={editExpensePaidBy}
                                                    onChange={(e) => setEditExpensePaidBy(parseInt(e.target.value))}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    required
                                                >
                                                    <option value="">Selecione...</option>
                                                    {members.map((m) => (
                                                        <option key={m.user_id} value={m.user_id}>
                                                            {m.username}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-date">Data</Label>
                                                <Input
                                                    id="edit-date"
                                                    type="date"
                                                    value={editExpenseDate}
                                                    onChange={(e) => setEditExpenseDate(e.target.value)}
                                                    required
                                                />
                                            </div>

                                            <div className="space-y-2 col-span-2">
                                                <Label htmlFor="edit-category">Categoria (opcional)</Label>
                                                <Input
                                                    id="edit-category"
                                                    type="text"
                                                    placeholder="Ex: Alimentação"
                                                    value={editExpenseCategory}
                                                    onChange={(e) => setEditExpenseCategory(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Label>Dividir entre</Label>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {editIncludedMembers.size} de {members.length} pessoa{members.length !== 1 ? 's' : ''} selecionada{editIncludedMembers.size !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={splitEquallyEdit}
                                                    disabled={editIncludedMembers.size === 0}
                                                >
                                                    Dividir igualmente
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                💡 Desmarque membros que não participarão desta despesa
                                            </p>
                                            <div className="space-y-2">
                                                {members.map((member) => (
                                                    <div key={member.user_id} className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={editIncludedMembers.has(member.user_id)}
                                                            onChange={() => toggleMemberInclusionEdit(member.user_id)}
                                                            className="h-4 w-4 rounded border-gray-300"
                                                        />
                                                        <span className={`text-sm w-32 ${!editIncludedMembers.has(member.user_id) ? 'text-gray-400 line-through' : ''}`}>
                                                            {member.username}
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="0.00"
                                                            value={editExpenseSplits[member.user_id] || ""}
                                                            onChange={(e) =>
                                                                setEditExpenseSplits({
                                                                    ...editExpenseSplits,
                                                                    [member.user_id]: e.target.value,
                                                                })
                                                            }
                                                            disabled={!editIncludedMembers.has(member.user_id)}
                                                            className={!editIncludedMembers.has(member.user_id) ? 'bg-gray-100' : ''}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {editExpenseError && (
                                            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                                                {editExpenseError}
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <Button type="submit" className="flex-1">
                                                Salvar Alterações
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setEditingExpenseId(null);
                                                    setEditExpenseError("");
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        {/* Expenses list */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5" />
                                    Despesas Recentes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {expenses.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Nenhuma despesa ainda. Adicione a primeira!
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {expenses.map((expense) => (
                                            <div key={expense.id} className="bg-gray-50 rounded-lg overflow-hidden">
                                                <div
                                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                                    onClick={() => loadExpenseDetails(expense.id)}
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium">{expense.description}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            Pago por {expense.paid_by_username} •{" "}
                                                            {new Date(expense.date).toLocaleDateString('pt-BR')}
                                                            {expense.category && ` • ${expense.category}`}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-semibold text-lg">
                                                            R$ {expense.amount.toFixed(2)}
                                                        </span>
                                                        <svg
                                                            className={`w-5 h-5 text-gray-400 transition-transform ${expandedExpense === expense.id ? 'rotate-180' : ''
                                                                }`}
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M19 9l-7 7-7-7"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {expandedExpense === expense.id && expenseDetails[expense.id] && editingExpenseId !== expense.id && (
                                                    <div className="px-3 pb-3 pt-0 border-t border-gray-200">
                                                        <p className="text-sm font-medium text-gray-700 mb-2 mt-3">
                                                            Divisão:
                                                        </p>
                                                        <div className="space-y-2">
                                                            {expenseDetails[expense.id]!.map((split) => (
                                                                <div
                                                                    key={split.user_id}
                                                                    className="flex items-center justify-between text-sm"
                                                                >
                                                                    <span className="text-gray-700">
                                                                        {split.username}
                                                                    </span>
                                                                    <span className="font-medium text-red-600">
                                                                        -R$ {split.amount.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            <div className="pt-2 mt-2 border-t border-gray-200">
                                                                <div className="flex items-center justify-between text-sm">
                                                                    <span className="text-gray-700 font-medium">
                                                                        {expense.paid_by_username} (pagou)
                                                                    </span>
                                                                    <span className="font-semibold text-green-600">
                                                                        +R$ {expense.amount.toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Action buttons */}
                                                            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        loadExpenseForEdit(expense.id);
                                                                    }}
                                                                    className="flex-1 gap-2"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                    Editar
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        loadExpenseHistory(expense.id);
                                                                    }}
                                                                    className="flex-1 gap-2"
                                                                >
                                                                    <Clock className="h-4 w-4" />
                                                                    Histórico
                                                                </Button>
                                                            </div>

                                                            {/* History section */}
                                                            {showHistory === expense.id && (
                                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                                    <p className="text-sm font-medium text-gray-700 mb-2">
                                                                        Histórico de Mudanças:
                                                                    </p>
                                                                    {expenseHistory.length > 0 ? (
                                                                        <div className="space-y-2 max-h-60 overflow-y-auto">
                                                                            {expenseHistory.map((change, index) => (
                                                                                <div
                                                                                    key={`history-${expense.id}-${index}`}
                                                                                    className="text-xs bg-white p-2 rounded border border-gray-200"
                                                                                >
                                                                                    <div className="flex justify-between items-start mb-1">
                                                                                        <span className="font-medium text-gray-900">
                                                                                            {change.changed_by_username}
                                                                                        </span>
                                                                                        <span className="text-gray-500">
                                                                                            {new Date(change.changed_at).toLocaleString('pt-BR')}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="text-gray-700">
                                                                                        <span className="font-medium">
                                                                                            {(() => {
                                                                                                const fieldNames: Record<string, string> = {
                                                                                                    'description': 'Descrição',
                                                                                                    'amount': 'Valor',
                                                                                                    'paid_by': 'Pago por',
                                                                                                    'date': 'Data',
                                                                                                    'category': 'Categoria',
                                                                                                    'splits': 'Divisão'
                                                                                                };
                                                                                                return fieldNames[change.field_name] || change.field_name;
                                                                                            })()}:
                                                                                        </span>
                                                                                        <div className="mt-1 text-sm">
                                                                                            <span className="text-red-600 line-through">
                                                                                                {change.old_value || '(vazio)'}
                                                                                            </span>
                                                                                            {' → '}
                                                                                            <span className="text-green-600">
                                                                                                {change.new_value || '(vazio)'}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-gray-500 italic">
                                                                            Nenhuma alteração registrada ainda.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

