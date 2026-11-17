'use client';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export default function Navbar() {
    const { user, logOut } = useAuth();
    const router = useRouter();

    return (
        <nav className="flex items-center justify-between px-6 py-3 bg-background border-b shadow-sm">
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight">RunsheetPro</span>
            </div>
            {user && (
                <div className="flex items-center gap-4">
                    <span className="hidden sm:inline text-sm font-medium text-muted-foreground">{user.displayName}</span>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                                    <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onClick={() => window.location.href = '/feedback'} className="cursor-pointer">
                                Feedback
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logOut} className="text-destructive focus:text-destructive">
                                Logout
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            )}
        </nav>
    );
}
