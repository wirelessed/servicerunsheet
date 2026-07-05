'use client';
import { useAuth } from '../../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SidebarFooter({ theme, toggleTheme, layout = 'full' }) {
    const { user, logOut } = useAuth();

    if (layout === 'compact') {
        return (
            <div className="flex flex-col gap-6 items-center px-4 pb-2 w-full">
                <button
                    onClick={toggleTheme}
                    className="flex flex-col items-center w-full gap-1 transition-all active:scale-95 text-muted-foreground hover:text-foreground group cursor-pointer"
                >
                    <div className="flex items-center justify-center w-[52px] py-1.5 rounded-xl transition-colors">
                        <span className="material-symbols-outlined text-[24px] group-hover:scale-105 transition-transform">
                            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
                        </span>
                    </div>
                    <span className="text-[11px] font-bold">Theme</span>
                </button>

                {user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex flex-col items-center w-full gap-1 transition-all active:scale-95 text-muted-foreground hover:text-foreground cursor-pointer">
                                <div className="flex items-center justify-center w-[52px] py-1">
                                    <Avatar className="h-7 w-7 border border-border">
                                        <AvatarImage src={user.photoURL} alt={user.displayName} />
                                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                            {user.displayName?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <span className="text-[11px] font-bold truncate max-w-[60px]">{user.displayName?.split(' ')[0] || 'User'}</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="right" className="w-52 ml-2">
                            <DropdownMenuItem disabled className="text-xs text-muted-foreground">{user.email}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => window.location.href = '/feedback'}
                                className="cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-base mr-2">feedback</span>
                                Feedback
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={async () => {
                                    try {
                                        Object.keys(localStorage).forEach(key => {
                                            if (key.startsWith('runsheetsCache_') || key.startsWith('groupsCache_') || key.startsWith('public_group')) {
                                                localStorage.removeItem(key);
                                            }
                                        });
                                        const dbs = await window.indexedDB.databases();
                                        for (const dbInfo of dbs) {
                                            if (dbInfo.name && dbInfo.name.startsWith('firebaseLocalStorage')) {
                                                window.indexedDB.deleteDatabase(dbInfo.name);
                                            }
                                        }
                                        window.location.reload();
                                    } catch (e) {
                                        console.error('Error clearing cache:', e);
                                        window.location.reload();
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-base mr-2">cached</span>
                                Clear Cache
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={logOut} className="text-destructive focus:text-destructive cursor-pointer">
                                <span className="material-symbols-outlined text-base mr-2">logout</span>
                                Log Out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 px-4 w-full animate-in fade-in duration-200">
            <div className="border-t border-border pt-4 mb-2"></div>
            <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
            >
                <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>

            {user && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all w-full text-left cursor-pointer">
                            <Avatar className="h-7 w-7">
                                <AvatarImage src={user.photoURL} alt={user.displayName} />
                                <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">{user.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate flex-1">{user.displayName}</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-52">
                        <DropdownMenuItem disabled className="text-xs text-muted-foreground">{user.email}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => window.location.href = '/feedback'}
                            className="cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base mr-2">feedback</span>
                            Feedback
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={async () => {
                                try {
                                    Object.keys(localStorage).forEach(key => {
                                        if (key.startsWith('runsheetsCache_') || key.startsWith('groupsCache_') || key.startsWith('public_group')) {
                                            localStorage.removeItem(key);
                                        }
                                    });
                                    const dbs = await window.indexedDB.databases();
                                    for (const dbInfo of dbs) {
                                        if (dbInfo.name && dbInfo.name.startsWith('firebaseLocalStorage')) {
                                            window.indexedDB.deleteDatabase(dbInfo.name);
                                        }
                                    }
                                    window.location.reload();
                                } catch (e) {
                                    console.error('Error clearing cache:', e);
                                    window.location.reload();
                                }
                            }}
                            className="cursor-pointer"
                        >
                            <span className="material-symbols-outlined text-base mr-2">cached</span>
                            Clear Cache
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={logOut} className="text-destructive focus:text-destructive cursor-pointer">
                            <span className="material-symbols-outlined text-base mr-2">logout</span>
                            Log Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
