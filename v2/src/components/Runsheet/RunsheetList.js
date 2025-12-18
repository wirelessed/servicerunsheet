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

export default function RunsheetList() {
    const { user } = useAuth();
    const [runsheets, setRunsheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // 'active' or 'archived'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (New->Old) or 'asc' (Old->New)

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
            // Initial sort (descending default)
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

                // Add relation to user
                await setDoc(doc(db, `users/${user.email}/runsheets`, docRef.id), { id: docRef.id });

                // Add user to runsheet's users subcollection
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
            // 1. Fetch original items
            const q = query(collection(db, `runsheets/${runsheet.id}/programme`), orderBy('orderCount', 'asc'));
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => doc.data());

            // 2. Create new runsheet doc
            const newRunsheet = {
                ...runsheet,
                name: `Copy of ${runsheet.name}`,
                category: 'active', // Reset to active if duplicating an archived one
                lastUpdated: moment().format()
            };
            delete newRunsheet.id; // Remove original ID

            const newDocRef = await addDoc(collection(db, 'runsheets'), newRunsheet);

            // 3. Add relationships
            await setDoc(doc(db, `users/${user.email}/runsheets`, newDocRef.id), { id: newDocRef.id });
            await setDoc(doc(db, `runsheets/${newDocRef.id}/users`, user.email), {
                id: user.email,
                role: 'editor',
                email: user.email
            });

            // 4. Batch add items
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
        <div className="flex flex-col min-h-screen bg-base-200">
            <Navbar />
            <div className="container mx-auto px-4 mt-8 pb-32 max-w-5xl">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-3xl font-bold">My Runsheets</h1>

                    <div className="flex items-center gap-4">
                        <select
                            className="select select-bordered select-sm w-full max-w-xs"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>

                        <div role="tablist" className="tabs tabs-boxed bg-base-200/50 p-1">
                            <a
                                role="tab"
                                className={`tab px-6 ${filter === 'active' ? 'tab-active' : ''}`}
                                onClick={() => setFilter('active')}
                            >
                                Active
                            </a>
                            <a
                                role="tab"
                                className={`tab px-6 ${filter === 'archived' ? 'tab-active' : ''}`}
                                onClick={() => setFilter('archived')}
                            >
                                Archive
                            </a>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center mt-10">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {filteredRunsheets.length === 0 && (
                            <div className="text-center py-10 text-base-content/50">
                                No {filter} runsheets found.
                            </div>
                        )}
                        {filteredRunsheets.map((runsheet) => {
                            const dateObj = moment(runsheet.date);
                            return (
                                <div key={runsheet.id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="card-body p-4 flex-row items-center gap-6">
                                        {/* Col 1: Visual Date */}
                                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-base-200 rounded-xl flex-shrink-0">
                                            <span className="text-xs font-bold uppercase text-base-content/60">
                                                {dateObj.format("MMM")}
                                            </span>
                                            <span className="text-2xl font-bold">
                                                {dateObj.format("D")}
                                            </span>
                                        </div>

                                        {/* Col 2: Info */}
                                        <div className="flex-grow min-w-0">
                                            <Link href={`/runsheet/${runsheet.id}`} className="hover:underline">
                                                <h3 className="card-title text-lg truncate">
                                                    {runsheet.name}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-base-content/70">
                                                {dateObj.format("dddd, D MMMM YYYY")} • {moment(runsheet.time, "HHmm").format("h:mm a")}
                                            </p>
                                        </div>

                                        {/* Col 3: Actions */}
                                        <div className="dropdown dropdown-end">
                                            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle btn-sm">
                                                <MoreVertIcon />
                                            </div>
                                            <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 border border-base-200">
                                                <li>
                                                    <Link href={`/runsheet/${runsheet.id}`}>View</Link>
                                                </li>
                                                <li>
                                                    <a onClick={() => setMetadataDialog({ open: true, data: runsheet })}>
                                                        Rename
                                                    </a>
                                                </li>
                                                <li>
                                                    <a onClick={() => duplicateRunsheet(runsheet)}>
                                                        Duplicate
                                                    </a>
                                                </li>
                                                <li>
                                                    <a onClick={() => toggleArchive(runsheet)}>
                                                        {runsheet.category === 'archived' ? 'Unarchive' : 'Archive'}
                                                    </a>
                                                </li>
                                                <li>
                                                    <a onClick={() => setDeleteDialog({ open: true, runsheetId: runsheet.id })} className="text-error">
                                                        Delete
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <button
                    className="btn btn-circle btn-primary btn-lg fixed bottom-8 right-8 shadow-lg"
                    onClick={() => setMetadataDialog({ open: true, data: null })}
                >
                    <AddIcon />
                </button>

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
                />
            </div>
        </div>
    );
}
