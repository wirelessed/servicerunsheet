'use client';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import moment from 'moment';
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground animate-pulse font-medium">Loading Runsheet...</p>
            </div>
        );
    }

    if (!runsheet) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-3xl font-extrabold tracking-tighter mb-2">Not Found</h1>
                <p className="text-muted-foreground">This runsheet may have been deleted or is private.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-muted/30">
            <div className="container mx-auto px-4 mt-12 mb-20 max-w-4xl">
                <div className="mb-12 text-center space-y-2">
                    <h1 className="text-5xl font-extrabold tracking-tighter">{runsheet.name}</h1>
                    <p className="text-xl text-muted-foreground font-semibold">
                        {moment(runsheet.date).format("dddd, D MMMM YYYY")}
                    </p>
                </div>

                <Card className="shadow-2xl border-none overflow-hidden bg-background">
                    <CardContent className="p-0">
                        <div className="flex flex-col">
                            {programme.map((item, index) => (
                                <div key={item.id}>
                                    <div className="flex items-start p-8 group hover:bg-muted/10 transition-colors">
                                        <div className="min-w-[110px] mr-8 text-right flex-shrink-0">
                                            <p className="font-black text-xl text-primary tracking-tighter">
                                                {timings[item.id]}
                                            </p>
                                            <p className="text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
                                                {item.duration} MIN
                                            </p>
                                        </div>
                                        <div className="flex-grow">
                                            <p className="text-2xl font-bold tracking-tight mb-2 text-foreground/90">{item.text}</p>
                                            <p className="text-muted-foreground text-sm leading-relaxed font-medium whitespace-pre-line italic">{item.remarks}</p>
                                        </div>
                                    </div>
                                    {index < programme.length - 1 && <Separator className="bg-muted" />}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
