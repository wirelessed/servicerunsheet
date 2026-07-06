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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import NotesIcon from '@mui/icons-material/Notes';
import moment from "moment";
import { db } from '../../lib/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection, updateDoc, getDoc } from 'firebase/firestore';
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
    ops: 'Ops',
    viewer: 'Viewer',
};

export default function ShareTab({ runsheetId, runsheetName, isEditor, runsheet, programme, timings }) {
    const { user } = useAuth();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const [shareUrl, setShareUrl] = useState('');

    const [copied, setCopied] = useState(false);
    const [users, setUsers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState(null);
    const [newEmail, setNewEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [removeConfirm, setRemoveConfirm] = useState({ open: false, email: null });

    useEffect(() => {
        if (!runsheetId) return;

        const checkToken = async () => {
            let token = runsheet?.shareToken;
            
            if (!token) {
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let newToken = '';
                for (let i = 0; i < 6; i++) {
                    newToken += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                try {
                    await updateDoc(doc(db, 'runsheets', runsheetId), { shareToken: newToken });
                    token = newToken;
                } catch (e) {
                    console.error("Failed to generate runsheet token", e);
                }
            }

            if (token) {
                setShareUrl(`${origin}/share/${runsheetId}?token=${token}`);
            } else {
                setShareUrl(`${origin}/share/${runsheetId}`);
            }
        };

        checkToken();
    }, [runsheetId, runsheet?.shareToken, origin]);

    const [plainTextDialog, setPlainTextDialog] = useState(false);
    const [includeDescriptions, setIncludeDescriptions] = useState(true);
    const [includeDuration, setIncludeDuration] = useState(true);
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

            // Check if this user already exists in the runsheet — don't overwrite their role
            const existingUserSnap = await getDoc(doc(db, `runsheets/${runsheetId}/users`, email));
            if (existingUserSnap.exists()) {
                const existingRole = existingUserSnap.data().role;
                alert(`${email} already has the "${existingRole}" role on this runsheet.`);
                setNewEmail('');
                setIsLoading(false);
                return;
            }

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

            // Also update the main runsheet document memberEmails and roles
            const currentEmails = runsheet.memberEmails || [];
            const currentRoles = runsheet.roles || {};
            await updateDoc(doc(db, 'runsheets', runsheetId), {
                memberEmails: [...new Set([...currentEmails, email])],
                roles: {
                    ...currentRoles,
                    [email]: 'viewer'
                }
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

            // Also update the main runsheet document roles map
            const currentRoles = runsheet.roles || {};
            await updateDoc(doc(db, 'runsheets', runsheetId), {
                roles: {
                    ...currentRoles,
                    [email]: newRole
                }
            });
        } catch (err) {
            console.error('Error changing role:', err);
        }
    };

    const handleRemoveUser = async () => {
        if (!removeConfirm.email) return;
        const targetEmail = removeConfirm.email;
        setRemoveConfirm({ open: false, email: null });
        try {
            await deleteDoc(doc(db, `runsheets/${runsheetId}/users`, targetEmail));
            await deleteDoc(doc(db, `users/${targetEmail}/runsheets`, runsheetId));

            // Also update the main runsheet document memberEmails and roles
            const currentEmails = runsheet.memberEmails || [];
            const currentRoles = { ...(runsheet.roles || {}) };
            delete currentRoles[targetEmail];
            await updateDoc(doc(db, 'runsheets', runsheetId), {
                memberEmails: currentEmails.filter(e => e !== targetEmail),
                roles: currentRoles
            });
        } catch (err) {
            console.error('Error removing user:', err);
        }
    };

    // Sort: owners first, then editors, then ops, then viewers
    const roleOrder = { owner: 0, editor: 1, ops: 2, viewer: 3 };
    let displayUsers = [...users].sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3));

    // Viewers should not see other viewers or editors, only owners and themselves
    if (!canManage) {
        displayUsers = displayUsers.filter(u => u.role === 'owner' || u.email === user?.email);
    }

    const getPlainText = (isWhatsapp = false) => {
        let text = `${runsheetName}\n`;
        if (runsheet?.date) {
            text += `${moment(runsheet.date).format('D MMMM YYYY (ddd)')}\n`;
        }

        if (programme && timings) {
            let itemsText = [];
            programme.forEach(item => {
                const timeStrInfo = timings[item.id];
                const rawTitle = item.text || item.title || item.name || '';
                const itemTitle = (isWhatsapp && rawTitle) ? `*${rawTitle.trim()}*` : rawTitle;
                let line = '';
                const durationSuffix = (includeDuration && item.duration) ? ` (${item.duration}min)` : '';
                if (timeStrInfo) {
                    const timeStr = `${timeStrInfo.start.replace(':', '.')}${timeStrInfo.amPm.toLowerCase()}`;
                    line = `${timeStr} - ${itemTitle}${durationSuffix}`.trim();
                } else {
                    line = `${itemTitle}${durationSuffix}`.trim();
                }
                itemsText.push(line);

                if (includeDescriptions && item.remarks) {
                    const cleanedRemarks = item.remarks
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<\/p>/gi, '\n')
                        .replace(/<[^>]+>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>');
                    const indentedRemarks = cleanedRemarks
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0)
                        .map(line => `  ${line}`)
                        .join('\n');
                    if (indentedRemarks) {
                        itemsText.push(indentedRemarks);
                    }
                }
            });
            text += '\n' + itemsText.join('\n') + '\n';
        }

        const updatedTime = runsheet?.lastUpdated || new Date().toISOString();
        text += `\n[Info last updated at ${moment(updatedTime).format('DD/MM/YY hh:mm a')}]`;
        text += `\n${shareUrl}`;
        return text;
    };

    const handleSharePlainText = () => {
        setPlainTextDialog(true);
    };

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
                    <Button
                        onClick={handleSharePlainText}
                        variant="outline"
                        className="w-full rounded-xl gap-2 bg-muted border text-foreground hover:bg-muted/80 border-border dark:bg-transparent dark:text-primary dark:border-primary/30 dark:hover:bg-primary/10"
                    >
                        <NotesIcon className="h-4 w-4" />
                        Share as Plain Text
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
                            Viewers will see this runsheet in their list. Editors can modify the programme and details. Ops users can log transition timings but cannot edit the runsheet item details.
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
                    <div className="space-y-2 pb-24">
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
                                                        : member.role === 'editor'
                                                            ? 'bg-primary/10 text-primary'
                                                            : member.role === 'ops'
                                                                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
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
                                                                ${member.role === 'editor'
                                                                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
                                                                    : member.role === 'ops'
                                                                        ? 'bg-violet-500/10 text-violet-600 border-violet-500/20 hover:bg-violet-500/20 dark:text-violet-400'
                                                                        : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                                                                }`}
                                                        >
                                                            {ROLE_LABELS[member.role] ?? member.role} ▾
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => handleChangeRole(member.email, 'editor')}
                                                            className={member.role === 'editor' ? 'font-bold text-primary' : ''}
                                                        >
                                                            Editor
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleChangeRole(member.email, 'ops')}
                                                            className={member.role === 'ops' ? 'font-bold text-primary' : ''}
                                                        >
                                                            Ops
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleChangeRole(member.email, 'viewer')}
                                                            className={member.role === 'viewer' ? 'font-bold text-primary' : ''}
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

            <Dialog open={plainTextDialog} onOpenChange={setPlainTextDialog}>
                <DialogContent className="sm:max-w-[425px] md:max-w-[600px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Share as Plain Text</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-2.5 py-1 border-b border-border/40 pb-3">
                        <label className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                            <input
                                type="checkbox"
                                checked={includeDescriptions}
                                onChange={(e) => setIncludeDescriptions(e.target.checked)}
                                className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background dark:bg-input/80 border cursor-pointer accent-primary"
                            />
                            <span>Include all item descriptions</span>
                        </label>
                        <label className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
                            <input
                                type="checkbox"
                                checked={includeDuration}
                                onChange={(e) => setIncludeDuration(e.target.checked)}
                                className="rounded border-input text-primary focus:ring-ring h-4 w-4 bg-background dark:bg-input/80 border cursor-pointer accent-primary"
                            />
                            <span>Include duration</span>
                        </label>
                    </div>
                    <div className="grid gap-4 py-2">
                        <Textarea
                            readOnly
                            value={getPlainText()}
                            className="h-[45vh] resize-none font-mono text-xs rounded-xl"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                        <Button onClick={() => {
                            const whatsappText = getPlainText(true);
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`, '_blank');
                        }} className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent dark:bg-[#25D366] dark:hover:bg-[#25D366]/90 dark:text-black">
                            <WhatsAppIcon className="h-4 w-4" />
                            Send to WhatsApp
                        </Button>
                        <Button onClick={async () => {
                            try {
                                await navigator.clipboard.writeText(getPlainText(false));
                            } catch (err) {
                                console.error("Clipboard copy failed: ", err);
                            }
                            setPlainTextDialog(false);
                        }} className="rounded-xl">
                            <ContentCopyIcon className="h-4 w-4 mr-2" />
                            Copy to Clipboard
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
