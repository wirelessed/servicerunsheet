'use client';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * GroupDialog
 * Props:
 *   open          - boolean
 *   onClose       - () => void
 *   existingGroups - [{ id, name }] — groups derived from the user's runsheets
 *   onSetGroup    - (groupId: string, groupName: string) => void  (groupId is the Firestore doc id)
 *   onCreateGroup - (name: string) => Promise<string>            (returns new groupId)
 *   currentGroupId - string | null
 */
export default function GroupDialog({ open, onClose, existingGroups = [], onSetGroup, onCreateGroup, currentGroupId, isLoading }) {
    const [mode, setMode] = useState('pick'); // 'pick' | 'create'
    const [newGroupName, setNewGroupName] = useState('');


    const handleClose = () => {
        setMode('pick');
        setNewGroupName('');
        onClose();
    };

    const handlePick = (group) => {
        onSetGroup(group.id, group.name);
    };

    const handleCreate = async () => {
        if (!newGroupName.trim()) return;
        const name = newGroupName.trim();
        // Run in background
        const newId = await onCreateGroup(name);
        onSetGroup(newId, name);
    };

    const otherGroups = existingGroups.filter(g => g.id !== currentGroupId);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">folder_open</span>
                        Add to Group
                    </DialogTitle>
                </DialogHeader>

                {mode === 'pick' ? (
                    <div className="flex flex-col gap-3 py-2">
                        {otherGroups.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Existing Groups</p>
                                {otherGroups.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => handlePick(group)}
                                        disabled={isLoading}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-muted-foreground group-hover:text-primary transition-colors">folder</span>
                                        <span className="text-sm font-semibold text-foreground">{group.name}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No groups yet. Create one to get started.</p>
                        )}

                        <button
                            onClick={() => setMode('create')}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all text-left group w-full"
                        >
                            <span className="material-symbols-outlined text-[18px] text-muted-foreground group-hover:text-primary transition-colors">create_new_folder</span>
                            <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground">Create a new group...</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="group-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group Name</Label>
                            <Input
                                id="group-name"
                                placeholder="e.g. Camp"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                disabled={isLoading}
                                className="rounded-xl h-11 text-base"
                            />
                        </div>
                        <DialogFooter className="gap-2 flex-row">
                            <Button variant="ghost" onClick={() => setMode('pick')} className="rounded-xl">
                                Back
                            </Button>
                            <Button onClick={handleCreate} disabled={!newGroupName.trim() || isLoading} className="rounded-xl flex-1">
                                <span className="material-symbols-outlined text-sm mr-1.5">{isLoading ? 'sync' : 'create_new_folder'}</span>
                                {isLoading ? 'Creating...' : 'Create & Add'}
                            </Button>
                        </DialogFooter>
                    </div>
                )}

                {mode === 'pick' && (
                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose} className="rounded-xl w-full">Cancel</Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
