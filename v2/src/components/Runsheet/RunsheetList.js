'use client';
import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { collection, query, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Navbar';
import Link from 'next/link';
import moment from 'moment';
import RunsheetMetadataDialog from './RunsheetMetadataDialog';
import ConfirmationDialog from '../ConfirmationDialog';

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

export default function RunsheetList() {
    const { user } = useAuth();
    const [runsheets, setRunsheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [sortOrder, setSortOrder] = useState('desc');

    const [metadataDialog, setMetadataDialog] = useState({ open: false, data: null });
    const [deleteDialog, setDeleteDialog] = useState({ open: false, runsheetId: null });

    const fetchRunsheets = async () => {
        if (!user) return;
        setLoading(true);
        try {
            if (!user.email) {
                console.error("User has no email, cannot fetch legacy data");
                setLoading(false);
                return;
            }

            const userRunsheetsRef = collection(db, `users/${user.email}/runsheets`);
            const q = query(userRunsheetsRef);

            const snapshot = await getDocs(q);
            const runsheetPromises = snapshot.docs.map(async (userDoc) => {
                const runsheetDocRef = doc(db, 'runsheets', userDoc.id);
                try {
                    const runsheetSnap = await getDoc(runsheetDocRef);
                    if (runsheetSnap.exists()) {
                        const data = runsheetSnap.data();
                        return {
                            id: runsheetSnap.id,
                            ...data,
                            category: data.category || 'active'
                        };
                    }
                } catch (e) {
                    console.error("Error fetching runsheet", userDoc.id, e);
                }
                return null;
            });

            const results = await Promise.all(runsheetPromises);
            const validRunsheets = results.filter(r => r !== null);
            validRunsheets.sort((a, b) => new Date(b.date) - new Date(a.date));

            setRunsheets(validRunsheets);
        } catch (error) {
            console.error("Error fetching runsheets:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRunsheets();
    }, [user]);

    const handleCreateOrUpdate = async (formData) => {
        try {
            if (!user?.email) return;

            if (metadataDialog.data) {
                // UPDATE
                const runsheetRef = doc(db, 'runsheets', metadataDialog.data.id);
                await updateDoc(runsheetRef, {
                    name: formData.name,
                    date: formData.date,
                    time: formData.time,
                    lastUpdated: moment().format()
                });
            } else {
                // CREATE
                const newRunsheet = {
                    name: formData.name,
                    date: formData.date,
                    time: formData.time,
                    orderCount: 0,
                    lastUpdated: moment().format(),
                    category: 'active'
                };

                const docRef = await addDoc(collection(db, 'runsheets'), newRunsheet);

                await setDoc(doc(db, `users/${user.email}/runsheets`, docRef.id), { id: docRef.id });

                await setDoc(doc(db, `runsheets/${docRef.id}/users`, user.email), {
                    id: user.email,
                    role: 'editor',
                    email: user.email
                });
            }

            setMetadataDialog({ open: false, data: null });
            fetchRunsheets();
        } catch (err) {
            console.error("Error saving runsheet", err);
        }
    };

    const duplicateRunsheet = async (runsheet) => {
        try {
            setLoading(true);
            const q = query(collection(db, `runsheets/${runsheet.id}/programme`), orderBy('orderCount', 'asc'));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => doc.data());

            const newRunsheet = {
                ...runsheet,
                name: `Copy of ${runsheet.name}`,
                category: 'active',
                lastUpdated: moment().format()
            };
            delete newRunsheet.id;

            const newDocRef = await addDoc(collection(db, 'runsheets'), newRunsheet);

            await setDoc(doc(db, `users/${user.email}/runsheets`, newDocRef.id), { id: newDocRef.id });
            await setDoc(doc(db, `runsheets/${newDocRef.id}/users`, user.email), {
                id: user.email,
                role: 'editor',
                email: user.email
            });

            const batch = writeBatch(db);
            items.forEach((item) => {
                const itemRef = doc(collection(db, `runsheets/${newDocRef.id}/programme`));
                batch.set(itemRef, item);
            });
            await batch.commit();

            fetchRunsheets();
        } catch (err) {
            console.error("Error duplicating runsheet", err);
            setLoading(false);
        }
    };

    const toggleArchive = async (runsheet) => {
        try {
            const newCategory = runsheet.category === 'archived' ? 'active' : 'archived';
            const runsheetRef = doc(db, 'runsheets', runsheet.id);
            await updateDoc(runsheetRef, { category: newCategory });

            setRunsheets(prev => prev.map(r =>
                r.id === runsheet.id ? { ...r, category: newCategory } : r
            ));
        } catch (err) {
            console.error("Error updating archive status", err);
            fetchRunsheets();
        }
    };

    const handleDelete = async () => {
        if (!deleteDialog.runsheetId) return;
        try {
            await deleteDoc(doc(db, 'runsheets', deleteDialog.runsheetId));
            setRunsheets(prev => prev.filter(r => r.id !== deleteDialog.runsheetId));
            setDeleteDialog({ open: false, runsheetId: null });
        } catch (err) {
            console.error("Error deleting runsheet", err);
        }
    };

    const sortedRunsheets = [...runsheets].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    const filteredRunsheets = sortedRunsheets.filter(r => r.category === filter);

    return (
        <div className="flex flex-col min-h-screen bg-muted/40">
            <Navbar />
            <div className="container mx-auto px-4 mt-8 pb-32 max-w-5xl">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6">
                    <h1 className="text-4xl font-extrabold tracking-tight">My Runsheets</h1>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Select value={sortOrder} onValueChange={setSortOrder}>
                            <SelectTrigger className="w-[180px] bg-background">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="desc">Newest First</SelectItem>
                                <SelectItem value="asc">Oldest First</SelectItem>
                            </SelectContent>
                        </Select>

                        <Tabs value={filter} onValueChange={setFilter} className="w-full md:w-auto">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="active" className="px-8">Active</TabsTrigger>
                                <TabsTrigger value="archived" className="px-8">Archive</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center mt-20 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <p className="text-muted-foreground animate-pulse">Loading your runsheets...</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {filteredRunsheets.length === 0 && (
                            <Card className="border-dashed py-12">
                                <CardContent className="flex flex-col items-center justify-center text-muted-foreground">
                                    <p className="text-lg">No {filter} runsheets found.</p>
                                    <Button variant="link" onClick={() => setMetadataDialog({ open: true, data: null })}>
                                        Create your first one
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                        {filteredRunsheets.map((runsheet) => {
                            const dateObj = moment(runsheet.date);
                            return (
                                <Card key={runsheet.id} className="group hover:shadow-md transition-all border-muted/60 hover:border-primary/20">
                                    <CardContent className="p-4 flex items-center gap-6">
                                        {/* Col 1: Visual Date */}
                                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-muted rounded-xl flex-shrink-0 group-hover:bg-primary/5 transition-colors">
                                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                                                {dateObj.format("MMM")}
                                            </span>
                                            <span className="text-2xl font-bold tracking-tighter">
                                                {dateObj.format("D")}
                                            </span>
                                        </div>

                                        {/* Col 2: Info */}
                                        <div className="flex-grow min-w-0">
                                            <Link href={`/runsheet/${runsheet.id}`} className="block">
                                                <h3 className="text-xl font-bold truncate group-hover:text-primary transition-colors">
                                                    {runsheet.name}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-muted-foreground font-medium">
                                                {dateObj.format("dddd, D MMMM YYYY")} • <span className="text-primary/70">{moment(runsheet.time, "HHmm").format("h:mm a")}</span>
                                            </p>
                                        </div>

                                        {/* Col 3: Actions */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertIcon className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/runsheet/${runsheet.id}`} className="cursor-pointer">View Details</Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setMetadataDialog({ open: true, data: runsheet })} className="cursor-pointer">
                                                    Rename
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => duplicateRunsheet(runsheet)} className="cursor-pointer">
                                                    Duplicate
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => toggleArchive(runsheet)} className="cursor-pointer">
                                                    {runsheet.category === 'archived' ? 'Unarchive' : 'Archive'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setDeleteDialog({ open: true, runsheetId: runsheet.id })}
                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                <Button
                    size="icon"
                    className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl z-50 hover:scale-110 transition-transform"
                    onClick={() => setMetadataDialog({ open: true, data: null })}
                >
                    <AddIcon className="h-8 w-8" />
                </Button>

                <RunsheetMetadataDialog
                    open={metadataDialog.open}
                    onClose={() => setMetadataDialog({ open: false, data: null })}
                    onSubmit={handleCreateOrUpdate}
                    initialData={metadataDialog.data}
                />

                <ConfirmationDialog
                    open={deleteDialog.open}
                    onClose={() => setDeleteDialog({ open: false, runsheetId: null })}
                    onConfirm={handleDelete}
                    title="Delete Runsheet"
                    message="Are you sure you want to delete this runsheet? This action cannot be undone."
                    confirmText="Delete"
                    confirmStyle="destructive"
                />
            </div>
        </div>
    );
}
