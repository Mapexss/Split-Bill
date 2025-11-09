import * as React from "react";
import { Button } from "./button";

interface AlertDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            {/* Dialog */}
            <div className="relative z-50 w-full max-w-lg mx-4">
                {children}
            </div>
        </div>
    );
}

interface AlertDialogContentProps {
    children: React.ReactNode;
}

export function AlertDialogContent({ children }: AlertDialogContentProps) {
    return (
        <div className="bg-background border rounded-lg shadow-lg p-6 animate-in fade-in-0 zoom-in-95">
            {children}
        </div>
    );
}

interface AlertDialogHeaderProps {
    children: React.ReactNode;
}

export function AlertDialogHeader({ children }: AlertDialogHeaderProps) {
    return <div className="mb-4">{children}</div>;
}

interface AlertDialogTitleProps {
    children: React.ReactNode;
    className?: string;
}

export function AlertDialogTitle({ children, className }: AlertDialogTitleProps) {
    return <h2 className={`text-lg font-semibold ${className || ""}`}>{children}</h2>;
}

interface AlertDialogDescriptionProps {
    children: React.ReactNode;
}

export function AlertDialogDescription({ children }: AlertDialogDescriptionProps) {
    return <p className="text-sm text-muted-foreground mt-2">{children}</p>;
}

interface AlertDialogFooterProps {
    children: React.ReactNode;
}

export function AlertDialogFooter({ children }: AlertDialogFooterProps) {
    return <div className="flex justify-end gap-3 mt-6">{children}</div>;
}

interface AlertDialogCancelProps {
    onClick?: () => void;
    children: React.ReactNode;
}

export function AlertDialogCancel({ onClick, children }: AlertDialogCancelProps) {
    return (
        <Button variant="outline" onClick={onClick}>
            {children}
        </Button>
    );
}

interface AlertDialogActionProps {
    onClick?: () => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export function AlertDialogAction({ onClick, children, className, disabled }: AlertDialogActionProps) {
    return (
        <Button onClick={onClick} className={className} disabled={disabled}>
            {children}
        </Button>
    );
}

