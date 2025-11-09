import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";

interface LayoutProps {
    children: ReactNode;
    maxWidth?: "xl" | "2xl" | "full";
}

export function Layout({ children, maxWidth = "2xl" }: LayoutProps) {
    const navigate = useNavigate();
    const [user, setUser] = useState<{ username: string } | null>(null);
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
                setUser({ username: data.username });
            }
        } catch (error) {
            navigate("/entrar");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground">Carregando...</p>
                </div>
            </div>
        );
    }

    const containerClass = {
        xl: "max-w-7xl",
        "2xl": "max-w-screen-2xl",
        full: "max-w-full",
    }[maxWidth];

    return (
        <div className="min-h-screen bg-background">
            <Navbar username={user?.username} />
            <main className={`container ${containerClass} mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8`}>
                {children}
            </main>
        </div>
    );
}

