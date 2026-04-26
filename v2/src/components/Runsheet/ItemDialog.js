'use client';
import { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmojiPicker } from "frimousse";
import dynamic from 'next/dynamic';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MinimalTiptapEditor = dynamic(
    () => import('@/components/ui/minimal-tiptap/minimal-tiptap').then(mod => mod.MinimalTiptapEditor),
    { ssr: false, loading: () => <div className="h-64 animate-pulse bg-muted rounded-md w-full" /> }
);

function EmojiPickerPopover({ value, onChange }) {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-muted/40 text-xl hover:bg-muted transition-colors shrink-0"
                    title="Pick emoji"
                >
                    {value || <span className="text-muted-foreground text-sm">😀</span>}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-fit p-0 border-border shadow-xl rounded-2xl overflow-hidden" align="start" side="bottom">
                <EmojiPicker.Root
                    className="isolate flex h-[320px] w-[300px] flex-col bg-background"
                    onEmojiSelect={({ emoji }) => {
                        onChange(emoji);
                        setOpen(false);
                    }}
                >
                    <EmojiPicker.Search
                        className="z-10 mx-2 mt-2 h-9 appearance-none rounded-lg bg-muted/60 border border-border/40 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Search emoji..."
                    />
                    <EmojiPicker.Viewport className="relative flex-1 outline-hidden overflow-y-auto">
                        <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                            Loading…
                        </EmojiPicker.Loading>
                        <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                            No emoji found.
                        </EmojiPicker.Empty>
                        <EmojiPicker.List
                            className="select-none pb-1.5"
                            components={{
                                CategoryHeader: ({ category, ...props }) => (
                                    <div className="bg-background px-3 pt-3 pb-1.5 font-bold text-muted-foreground text-[10px] uppercase tracking-widest" {...props}>
                                        {category.label}
                                    </div>
                                ),
                                Row: ({ children, ...props }) => (
                                    <div className="scroll-my-1.5 px-1.5" {...props}>{children}</div>
                                ),
                                Emoji: ({ emoji, ...props }) => (
                                    <button
                                        className="flex size-8 items-center justify-center rounded-lg text-lg data-[active]:bg-primary/10 transition-colors"
                                        {...props}
                                    >
                                        {emoji.emoji}
                                    </button>
                                ),
                            }}
                        />
                    </EmojiPicker.Viewport>
                </EmojiPicker.Root>
            </PopoverContent>
        </Popover>
    );
}

const DEFAULT_LINK = () => ({ emoji: '🔗', name: '', url: '' });

export default function ItemDialog({ open, onClose, onSubmit, initialData }) {
    const [data, setData] = useState({ text: '', remarks: '', duration: '', location: '', links: [] });

    useEffect(() => {
        if (initialData) {
            setData({
                text: initialData.text || '',
                remarks: initialData.remarks || '',
                duration: initialData.duration || '',
                location: initialData.location || '',
                links: Array.isArray(initialData.links) ? initialData.links : [],
            });
        } else {
            setData({ text: '', remarks: '', duration: '', location: '', links: [] });
        }
    }, [initialData, open]);

    const handleChange = (e) => setData({ ...data, [e.target.name]: e.target.value });

    const handleLinkChange = (index, field, value) => {
        const updated = data.links.map((link, i) => i === index ? { ...link, [field]: value } : link);
        setData({ ...data, links: updated });
    };

    const handleAddLink = () => setData({ ...data, links: [...data.links, DEFAULT_LINK()] });

    const handleRemoveLink = (index) => {
        setData({ ...data, links: data.links.filter((_, i) => i !== index) });
    };

    const handleSubmit = () => {
        // Strip empty links before submitting
        const cleanedLinks = data.links.filter(l => l.name.trim() || l.url.trim());
        if (onSubmit) onSubmit({ ...data, links: cleanedLinks });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-[700px] w-full h-[100dvh] sm:h-auto !rounded-none sm:!rounded-2xl border-0 sm:border p-0 sm:p-6 flex flex-col gap-0 [&>button.absolute]:hidden sm:[&>button.absolute]:flex max-h-[100dvh] overflow-hidden">
                {/* Desktop Header */}
                <DialogHeader className="hidden sm:block shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">{initialData ? 'edit_note' : 'add_circle'}</span>
                        {initialData ? 'Edit Item' : 'Add Item'}
                    </DialogTitle>
                    <DialogDescription>
                        {initialData ? 'Update item details.' : 'Enter the details for the new programme item.'}
                    </DialogDescription>
                </DialogHeader>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto w-full min-h-0 relative">
                    {/* Mobile Header (Sticky) */}
                    <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b sm:hidden bg-card z-50">
                        <button onClick={onClose} className="flex p-2 -ml-2 text-muted-foreground hover:text-foreground items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-2xl">close</span>
                        </button>
                        <span className="font-bold text-base">{initialData ? 'Edit Item' : 'Add Item'}</span>
                        <Button onClick={handleSubmit} size="sm" className="h-8 rounded-full px-4 text-xs font-semibold shadow-none">Save</Button>
                    </div>

                    <div className="grid gap-4 p-4 sm:p-0 sm:py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="text" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Title</Label>
                            <Input
                                id="text"
                                name="text"
                                placeholder="e.g. Opening Song"
                                value={data.text}
                                onChange={handleChange}
                                autoFocus
                                className="rounded-xl h-11 text-base"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="duration" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration (min)</Label>
                                <Input
                                    id="duration"
                                    name="duration"
                                    type="number"
                                    placeholder="e.g. 5"
                                    value={data.duration}
                                    onChange={handleChange}
                                    className="rounded-xl"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Location</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    placeholder="e.g. Main Stage"
                                    value={data.location}
                                    onChange={handleChange}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="grid gap-2 flex-grow flex flex-col min-h-0">
                            <Label htmlFor="remarks" className="text-xs font-bold uppercase tracking-wider text-muted-foreground shrink-0">Remarks / Description</Label>
                            <div className="touch-auto" style={{ WebkitUserSelect: 'text', userSelect: 'text' }}>
                                <MinimalTiptapEditor
                                    value={data.remarks}
                                    onChange={(val) => setData({ ...data, remarks: val })}
                                    className="w-full border-input shadow-xs rounded-xl flex-grow flex flex-col min-h-[200px]"
                                    editorContentClassName="p-3 flex-grow overflow-y-auto prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0.5 prose-a:text-primary prose-a:underline-offset-[3px] hover:prose-a:text-primary/80 prose-ul:list-disc prose-ol:list-decimal"
                                    output="html"
                                    placeholder="e.g. Lead singer starts..."
                                    editable={true}
                                    editorClassName="focus:outline-hidden touch-auto select-text"
                                />
                            </div>
                        </div>

                        {/* ── Links Section ── */}
                        <div className="grid gap-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Links or other metadata</Label>

                            {data.links.map((link, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <EmojiPickerPopover
                                        value={link.emoji}
                                        onChange={(emoji) => handleLinkChange(index, 'emoji', emoji)}
                                    />
                                    <Input
                                        placeholder="Name e.g. Slides"
                                        value={link.name}
                                        onChange={(e) => handleLinkChange(index, 'name', e.target.value)}
                                        className="rounded-xl h-10 flex-[2] min-w-0"
                                    />
                                    <Input
                                        placeholder="https://"
                                        value={link.url}
                                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                        className="rounded-xl h-10 flex-[3] min-w-0"
                                        type="url"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveLink(index)}
                                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">remove</span>
                                    </button>
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={handleAddLink}
                                className="flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 transition-colors w-fit"
                            >
                                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-base font-bold leading-none">+</span>
                                Add link
                            </button>
                        </div>
                    </div>
                </div>

                {/* Desktop Footer */}
                <DialogFooter className="gap-2 hidden sm:flex shrink-0">
                    <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
                    <Button onClick={handleSubmit} className="rounded-xl shadow-sm">
                        <span className="material-symbols-outlined text-sm mr-1.5">save</span>
                        Save Item
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
