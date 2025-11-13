import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import {
    Home,
    LogOut,
    Menu,
    Moon,
    Sun,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface NavbarProps {
    username?: string;
}

export function Navbar({ username }: NavbarProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await fetch("/api/logout", { method: "POST" });
            navigate("/entrar");
        } catch (error) {
            console.error("Erro ao sair:", error);
        }
    };

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(path + "/");
    };

    const navLinks = [
        { path: "/painel", label: "Painel", icon: Home },
        { path: "/grupos", label: "Grupos", icon: Users },
        { path: "/amigos", label: "Amigos", icon: UserPlus },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link
                        to="/painel"
                        className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
                    >
                        <span className="hidden sm:inline">Dividir Conta</span>
                        <span className="sm:hidden">DC</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${isActive(link.path)
                                        ? "bg-primary text-primary-foreground"
                                        : "text-foreground/70 hover:text-foreground hover:bg-accent"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* User Actions */}
                    <div className="flex items-center space-x-2">
                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleTheme}
                            className="rounded-full"
                            aria-label="Alternar tema"
                        >
                            {theme === "light" ? (
                                <Moon className="h-5 w-5" />
                            ) : (
                                <Sun className="h-5 w-5" />
                            )}
                        </Button>

                        {/* Username - Hidden on mobile */}
                        {username && (
                            <span className="hidden lg:block text-sm text-muted-foreground px-2">
                                Olá, <span className="font-medium text-foreground">{username}</span>
                            </span>
                        )}

                        {/* Logout - Hidden on mobile */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleLogout}
                            className="hidden md:flex gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden lg:inline">Sair</span>
                        </Button>

                        {/* Mobile Menu Button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden"
                            aria-label="Menu"
                        >
                            {mobileMenuOpen ? (
                                <X className="h-5 w-5" />
                            ) : (
                                <Menu className="h-5 w-5" />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden py-4 space-y-2 border-t">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-md transition-colors ${isActive(link.path)
                                        ? "bg-primary text-primary-foreground"
                                        : "text-foreground/70 hover:text-foreground hover:bg-accent"
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}

                        {username && (
                            <div className="px-4 py-2 text-sm text-muted-foreground border-t mt-2 pt-4">
                                Olá, <span className="font-medium text-foreground">{username}</span>
                            </div>
                        )}

                        <Button
                            variant="outline"
                            onClick={handleLogout}
                            className="w-full gap-2 mt-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Sair
                        </Button>
                    </div>
                )}
            </div>
        </nav>
    );
}

