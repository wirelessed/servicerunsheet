'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import moment from 'moment';

export default function SharePage() {
    const params = useParams();
    const id = params.id;
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timings, setTimings] = useState({});

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                // Fetch Runsheet
                const docRef = doc(db, 'runsheets', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setRunsheet({ id: docSnap.id, ...docSnap.data() });

                    // Fetch Programme
                    const q = query(collection(db, `runsheets/${id}/programme`), orderBy('orderCount', 'asc'));
                    const querySnapshot = await getDocs(q);
                    const items = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                    // Calculate timings
                    const startTimeStr = docSnap.data().time;
                    let currentTime = moment(startTimeStr, "HHmm");
                    const newTimings = {};

                    items.forEach(item => {
                        newTimings[item.id] = currentTime.format("h:mm a");
                        const duration = parseInt(item.duration) || 0;
                        currentTime.add(duration, 'minutes');
                    });
                    setTimings(newTimings);
                    setProgramme(items);
                }
            } catch (err) {
                console.error("Error fetching shared runsheet", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center mt-10">
                <span className="loading loading-spinner loading-lg"></span>
            </div>
        );
    }

    if (!runsheet) {
        return (
            <div className="container mx-auto px-4 mt-10">
                <h1 className="text-2xl font-bold text-center">Runsheet not found or private.</h1>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-base-100">
            <div className="container mx-auto px-4 mt-8 mb-20 max-w-4xl">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold mb-2">{runsheet.name}</h1>
                    <p className="text-xl text-base-content/60">
                        {moment(runsheet.date).format("dddd, D MMMM YYYY")}
                    </p>
                </div>

                <div className="card w-full bg-base-100 shadow-xl border border-base-200">
                    <div className="card-body p-0">
                        <div className="divide-y divide-base-200">
                            {programme.map((item, index) => (
                                <div key={item.id} className="flex items-start p-6">
                                    <div className="min-w-[100px] mr-6 text-right">
                                        <p className="font-bold text-lg">
                                            {timings[item.id]}
                                        </p>
                                        <p className="text-sm text-base-content/50">
                                            {item.duration} min
                                        </p>
                                    </div>
                                    <div className="flex-grow">
                                        <p className="text-xl font-medium mb-1 whitespace-pre-line">{item.text}</p>
                                        <p className="text-base-content/60 whitespace-pre-line">{item.remarks}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
