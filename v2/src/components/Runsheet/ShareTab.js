'use client';
import { useState, useEffect } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PrintIcon from '@mui/icons-material/Print';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import ConfirmationDialog from '../ConfirmationDialog';

/**
 * Returns true if the user record counts as an editor:
 *   - role === 'editor' (includes legacy records without addedAt/addedBy)
 *   - role === 'owner'
 */
const hasEditAccess = (role) => role === 'editor' || role === 'owner';

const ROLE_LABELS = {
    owner: 'Owner',
    editor: 'Editor',
    viewer: 'Viewer',
};

export default function ShareTab({ runsheetId, runsheetName, isEditor }) {
    const { user } = useAuth();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/runsheet/${runsheetId}`;

    const [copied, setCopied] = useState(false);
    const [users, setUsers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [newEmail, setNewEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [removeConfirm, setRemoveConfirm] = useState({ open: false, email: null });

    // Whether the current user can manage editors (must be editor or owner)
    const canManage = hasEditAccess(currentUserRole);

    useEffect(() => {
        if (!runsheetId) return;
        const unsubscribe = onSnapshot(collection(db, `runsheets/${runsheetId}/users`), (snapshot) => {
            const list = snapshot.docs.map(d => ({
                id: d.id,
                email: d.id, // doc ID is always the email — use as fallback
                ...d.data(),  // may override email if the field exists
            }));
            setUsers(list);
            if (user?.email) {
                const me = list.find(u => u.email === user.email);
                setCurrentUserRole(me?.role ?? null);
            }
        });
        return () => unsubscribe();
    }, [runsheetId, user]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareWhatsApp = () => {
        const text = `Check out this runsheet: ${runsheetName}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(shareUrl)}`, '_blank');
    };

    const handleExportPDF = () => {
        window.open(`/runsheet/${runsheetId}/print`, '_blank');
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newEmail || !newEmail.includes('@')) return;
        setIsLoading(true);
        try {
            const email = newEmail.trim().toLowerCase();
            // Default new users as 'viewer'
            await setDoc(doc(db, `runsheets/${runsheetId}/users`, email), {
                email,
                role: 'viewer',
                addedAt: new Date().toISOString(),
                addedBy: user.email,
            });
            // Also add to their personal runsheets list
            await setDoc(doc(db, `users/${email}/runsheets`, runsheetId), {
                id: runsheetId,
                role: 'viewer',
                sharedBy: user.email,
                sharedAt: new Date().toISOString(),
            });
            setNewEmail('');
        } catch (err) {
            console.error('Error adding user:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeRole = async (email, newRole) => {
        try {
            // Don't allow changing owner role
            const target = users.find(u => u.email === email);
            if (target?.role === 'owner') return;

            await updateDoc(doc(db, `runsheets/${runsheetId}/users`, email), { role: newRole });
            await updateDoc(doc(db, `users/${email}/runsheets`, runsheetId), { role: newRole });
        } catch (err) {
            console.error('Error changing role:', err);
        }
    };

    const handleRemoveUser = async () => {
        if (!removeConfirm.email) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, `runsheets/${runsheetId}/users`, removeConfirm.email));
            await deleteDoc(doc(db, `users/${removeConfirm.email}/runsheets`, runsheetId));
            setRemoveConfirm({ open: false, email: null });
        } catch (err) {
            console.error('Error removing user:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Sort: owners first, then editors, then viewers
    const roleOrder = { owner: 0, editor: 1, viewer: 2 };
    let displayUsers = [...users].sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3));

    // Viewers should not see other viewers or editors, only owners and themselves
    if (!canManage) {
        displayUsers = displayUsers.filter(u => u.role === 'owner' || u.email === user?.email);
    }

    return (
        <>
            <div className="flex flex-col gap-6 px-5 md:px-0 py-5 max-w-xl">
                {/* Section: Link */}
                <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Viewing Link</h4>
                    <div className="flex items-center gap-2">
                        <Input
                            value={shareUrl}
                            readOnly
                            className="bg-muted/60 focus-visible:ring-0 text-sm rounded-xl"
                        />
                        <Button
                            size="icon"
                            onClick={copyToClipboard}
                            variant={copied ? 'outline' : 'default'}
                            className="shrink-0 rounded-xl"
                            title="Copy Link"
                        >
                            {copied
                                ? <CheckIcon className="h-4 w-4 text-green-500" />
                                : <ContentCopyIcon className="h-4 w-4" />}
                        </Button>
                    </div>
                    <Button
                        onClick={handleShareWhatsApp}
                        variant="outline"
                        className="w-full rounded-xl gap-2 bg-muted border text-emerald-700 hover:bg-muted/80 border-emerald-700/20 dark:bg-transparent dark:text-[#25D366] dark:border-[#25D366]/30 dark:hover:bg-[#25D366]/10"
                    >
                        <WhatsAppIcon className="h-4 w-4" />
                        Share via WhatsApp
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        variant="outline"
                        className="w-full rounded-xl gap-2 bg-muted border text-foreground hover:bg-muted/80 border-border dark:bg-transparent dark:text-primary dark:border-primary/30 dark:hover:bg-primary/10"
                    >
                        <PrintIcon className="h-4 w-4" />
                        Export as PDF
                    </Button>
                </div>

                <Separator />

                {/* Section: People */}
                <div className="space-y-3">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Share by Email Address
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Viewers will see this runsheet in their list.
                            Editors can modify the programme and details.
                        </p>
                    </div>

                    {/* Add user (only editors/owners can add) */}
                    {canManage && (
                        <form onSubmit={handleAddUser} className="flex gap-2">
                            <Input
                                placeholder="Add email address"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                type="email"
                                className="rounded-xl"
                            />
                            <Button
                                type="submit"
                                disabled={isLoading || !newEmail}
                                className="shrink-0 rounded-xl"
                            >
                                <PersonAddIcon className="h-4 w-4" />
                            </Button>
                        </form>
                    )}

                    {/* Users list */}
                    <div className="space-y-2">
                        {displayUsers.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground py-6 bg-muted/30 rounded-xl">
                                No people added yet
                            </div>
                        ) : (
                            displayUsers.map((member) => {
                                const isOwner = member.role === 'owner';
                                const isMe = member.email === user?.email;
                                // Other owners cannot be modified; current user's own row: no X but owns it
                                const canModifyThisRow = canManage && !isOwner && !isMe;

                                return (
                                    <div
                                        key={member.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/40"
                                    >
                                        <div className="flex flex-col min-w-0 mr-3">
                                            <span className="text-sm font-medium text-foreground truncate">
                                                {member.email}
                                                {isMe && (
                                                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                                                        You
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {/* Role indicator / dropdown */}
                                            {(isOwner || isMe || !canManage) ? (
                                                // Non-editable role pill
                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg
                                                    ${isOwner
                                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                                        : hasEditAccess(member.role)
                                                            ? 'bg-primary/10 text-primary'
                                                            : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {ROLE_LABELS[member.role] ?? member.role}
                                                </span>
                                            ) : (
                                                // Editable role dropdown
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border transition-colors
                                                                ${hasEditAccess(member.role)
                                                                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                                                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                                                }`}
                                                        >
                                                            {ROLE_LABELS[member.role] ?? member.role} ▾
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => handleChangeRole(member.email, 'editor')}
                                                            className={member.role === 'editor' ? 'font-bold' : ''}
                                                        >
                                                            Editor
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleChangeRole(member.email, 'viewer')}
                                                            className={member.role === 'viewer' ? 'font-bold' : ''}
                                                        >
                                                            Viewer
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}

                                            {/* Remove button container to maintain consistent height */}
                                            <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                                {canModifyThisRow && (
                                                    <button
                                                        onClick={() => setRemoveConfirm({ open: true, email: member.email })}
                                                        className="flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
                                                        title="Remove"
                                                    >
                                                        <span className="material-symbols-outlined text-base leading-none">close</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <ConfirmationDialog
                open={removeConfirm.open}
                onClose={() => setRemoveConfirm({ open: false, email: null })}
                onConfirm={handleRemoveUser}
                title="Remove Person"
                message={`Are you sure you want to remove ${removeConfirm.email}? They will lose access to this runsheet.`}
                confirmText="Remove"
                confirmStyle="destructive"
            />
        </>
    );
}
