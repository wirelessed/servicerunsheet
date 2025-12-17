'use client';
import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import { collection, query, getDocs, doc, getDoc, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../Navbar';
import Link from 'next/link';
import moment from 'moment';

export default function RunsheetList() {
    const { user } = useAuth();
    const [runsheets, setRunsheets] = useState([]);
    const [loading, setLoading] = useState(true);

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
                        return { id: runsheetSnap.id, ...runsheetSnap.data() };
                    }
                } catch (e) {
                    console.error("Error fetching runsheet", userDoc.id, e);
                }
                return null;
            });

            const results = await Promise.all(runsheetPromises);
            const validRunsheets = results.filter(r => r !== null);

            // Sort by date descending
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

    const createRunsheet = async () => {
        try {
            if (!user?.email) return;

            const newRunsheet = {
                name: "New Service",
                date: moment().format(),
                time: "1000",
                orderCount: 0,
                lastUpdated: moment().format(),
            };

            const docRef = await addDoc(collection(db, 'runsheets'), newRunsheet);

            // Add relation to user using EMAIL
            await setDoc(doc(db, `users/${user.email}/runsheets`, docRef.id), {
                id: docRef.id
            });

            // Add user to runsheet's users subcollection using EMAIL 
            await setDoc(doc(db, `runsheets/${docRef.id}/users`, user.email), {
                id: user.email,
                role: 'editor',
                email: user.email
            });

            fetchRunsheets();
        } catch (err) {
            console.error("Error creating runsheet", err);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-base-200">
            <Navbar />
            <div className="container mx-auto px-4 mt-8 pb-32 max-w-5xl">
                <h1 className="text-3xl font-bold mb-6">
                    My Runsheets
                </h1>
                {loading ? (
                    <div className="flex justify-center mt-10">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {runsheets.map((runsheet) => (
                            <div key={runsheet.id} className="card bg-base-100 shadow-xl">
                                <div className="card-body">
                                    <h3 className="card-title truncate">
                                        {runsheet.name}
                                    </h3>
                                    <p className="text-sm text-base-content/70">
                                        {moment(runsheet.date).format("dddd, D MMMM YYYY")}
                                    </p>
                                    <div className="card-actions justify-end mt-4">
                                        <Link href={`/runsheet/${runsheet.id}`}>
                                            <button className="btn btn-primary btn-sm">View</button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <button
                    className="btn btn-circle btn-primary btn-lg fixed bottom-8 right-8 shadow-lg"
                    onClick={createRunsheet}
                >
                    <AddIcon />
                </button>
            </div>
        </div>
    );
}
