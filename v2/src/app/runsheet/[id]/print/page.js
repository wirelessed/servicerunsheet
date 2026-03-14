'use client';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import moment from 'moment';
import { QRCodeSVG } from 'qrcode.react';

export default function RunsheetPrintPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;
    const [runsheet, setRunsheet] = useState(null);
    const [programme, setProgramme] = useState([]);
    const [timings, setTimings] = useState({});
    const [loading, setLoading] = useState(true);

    const calculateTimings = useCallback((programmeItems, startTimeStr, dateStr) => {
        const date = dateStr ? dateStr.split('T')[0] : moment().format('YYYY-MM-DD');
        let currentTime = moment(`${date} ${startTimeStr}`, "YYYY-MM-DD HHmm");
        const newTimings = {};
        programmeItems.forEach(item => {
            newTimings[item.id] = { start: currentTime.format("h:mm"), amPm: currentTime.format("A") };
            currentTime.add(parseInt(item.duration) || 0, 'minutes');
        });
        setTimings(newTimings);
    }, []);

    useEffect(() => {
        if (!id) return;

        const unsubRunsheet = onSnapshot(doc(db, 'runsheets', id), (docSnap) => {
            if (docSnap.exists()) {
                setRunsheet({ id: docSnap.id, ...docSnap.data() });
            }
        });

        const q = query(collection(db, `runsheets/${id}/programme`), orderBy('orderCount', 'asc'));
        const unsubProgramme = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setProgramme(items);
            setLoading(false);
        });

        return () => { unsubRunsheet(); unsubProgramme(); };
    }, [id]);

    useEffect(() => {
        if (runsheet && programme.length >= 0) {
            calculateTimings(programme, runsheet.time, runsheet.date);
        }
    }, [runsheet, programme, calculateTimings]);

    const formattedDate = runsheet?.date ? moment(runsheet.date).format("dddd, MMMM Do YYYY") : '';
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/runsheet/${id}` : '';

    // Set document title to runsheet name so browser uses it as the PDF filename
    useEffect(() => {
        if (runsheet?.name) {
            document.title = runsheet.name;
        }
    }, [runsheet?.name]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black font-sans gap-4 p-8">
                <div className="text-xl">Loading runsheet for print...</div>
            </div>
        );
    }

    if (!runsheet) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black font-sans p-8">
                <div className="text-2xl font-bold mb-2">Runsheet Not Found</div>
                <div className="text-gray-500">The runsheet you requested does not exist or has been deleted.</div>
                <button onClick={() => router.back()} className="mt-8 px-4 py-2 border border-black rounded-lg hover:bg-gray-100">
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="print-container bg-white text-[#1c1c1e] min-h-screen print:min-h-0 font-sans">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm 18mm 12mm 12mm;
                    }
                    html, body {
                        background-color: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        font-size: 75% !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .page-break-inside-avoid {
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }
                    .item-card {
                        background-color: white !important;
                    }
                }
            `}</style>

            {/* Native browser print dialogue requires user intervention, but providing a fallback button is good practice */}
            <div className="no-print p-4 bg-gray-100 border-b border-gray-200 flex justify-between items-center sticky top-0 z-50">
                <div className="text-sm text-gray-600">
                    <span className="font-semibold text-black">A4 Portrait Print Preview</span>
                    <span className="mx-2">•</span>
                    Optimization for PDF export
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors text-black"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 text-sm font-medium border border-transparent rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Print / Save as PDF
                    </button>
                </div>
            </div>

            <div className="max-w-[210mm] mx-auto p-[12mm] bg-white text-black min-h-[297mm] print:min-h-0 shadow-none print:shadow-none print:p-0 print:m-0 print:max-w-none">
                {/* Header */}
                <header className="mb-5 border-b border-gray-200 pb-4 print:mb-4 print:pb-3">
                    <div className="flex items-start justify-between gap-4">
                        {/* Left: Title + metadata */}
                        <div className="flex-1 min-w-0">
                            <div className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-500 mb-1">
                                RunsheetPro
                            </div>
                            <h1 className="text-2xl font-extrabold tracking-tight mb-1.5 leading-tight text-[#1c1c1e]">{runsheet.name}</h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-700 font-medium tracking-wide print:text-gray-800">
                                <div className="flex items-center gap-1.5 bg-transparent border border-gray-300 px-3 py-1.5 rounded-lg whitespace-nowrap print:bg-transparent print:border-gray-400 print:text-gray-800">
                                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                    <span className="text-gray-800 font-semibold print:text-gray-900">{formattedDate}</span>
                                </div>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 print:bg-gray-500"></span>
                                <div className="flex items-center gap-1.5 text-gray-700 print:text-gray-800">
                                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                                    {runsheet.time} Start
                                </div>
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 print:bg-gray-500"></span>
                                <div className="flex items-center gap-1.5 text-gray-700 print:text-gray-800">
                                    <span className="material-symbols-outlined text-[18px]">list</span>
                                    {programme.length} {programme.length === 1 ? 'item' : 'items'}
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-400">
                                Updated as of {moment().format('D MMM YYYY, h:mm A')}
                            </div>
                        </div>

                        {/* Right: QR code */}
                        {shareUrl && (
                            <div className="flex flex-col items-center gap-1.5 shrink-0">
                                <QRCodeSVG
                                    value={shareUrl}
                                    size={80}
                                    fgColor="#1c1c1e"
                                    bgColor="transparent"
                                    level="M"
                                />
                                <p className="text-[0.6rem] text-gray-500 text-center leading-tight max-w-[90px]">
                                    Scan to view the latest version on your phone
                                </p>
                            </div>
                        )}
                    </div>
                </header>

                {/* Programme List */}
                <main className="flex flex-col gap-0 relative">
                    {/* Left Timeline Line */}
                    <div className="absolute left-[72px] top-3 bottom-3 w-px bg-gray-300 print:bg-gray-400 -z-10"></div>

                    {programme.map((item, index) => {
                        const timing = timings[item.id] || { start: '--:--', amPm: '--' };
                        return (
                            <div key={item.id} className="flex w-full mb-4 page-break-inside-avoid relative z-10 group">
                                {/* Time Column */}
                                <div className="w-[88px] shrink-0 text-right pr-4 pt-2.5 flex flex-col items-end">
                                    <div className="flex items-baseline gap-0.5 text-gray-800">
                                        <span className="text-[1rem] font-bold leading-none tracking-tight">{timing.start}</span>
                                        <span className="text-[0.55rem] font-bold uppercase opacity-80">{timing.amPm}</span>
                                    </div>
                                    <div className="mt-1.5 px-1.5 py-0.5 rounded text-[0.6rem] font-bold tabular-nums bg-transparent text-gray-600 border border-gray-300 whitespace-nowrap print:border-gray-400 print:text-gray-700 print:bg-transparent">
                                        {item.duration} min
                                    </div>
                                </div>

                                {/* Item Card */}
                                <div className="flex-1">
                                    <div className="item-card bg-transparent rounded-lg p-3.5 border border-gray-200 print:border-gray-200 print:shadow-none transition-all">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-[0.95rem] font-bold leading-snug text-[#1c1c1e] tracking-tight">{item.text}</h3>
                                        </div>

                                        {item.location && (
                                            <div className="flex items-center gap-1 mb-2">
                                                <span className="material-symbols-outlined text-[13px] text-gray-600">location_on</span>
                                                <span className="text-[0.6rem] font-bold uppercase tracking-widest text-gray-600 opacity-80">{item.location}</span>
                                            </div>
                                        )}

                                        {item.remarks && (
                                            <div
                                                className="text-[0.8rem] leading-relaxed mt-2 text-gray-700 prose prose-sm max-w-none print:text-gray-800"
                                                dangerouslySetInnerHTML={{ __html: item.remarks.replace(/\n/g, '<br />') }}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {programme.length === 0 && (
                        <div className="text-center py-16 text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-xl">
                            No program items found.
                        </div>
                    )}
                </main>

                <footer className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400 tabular-nums">
                    Printed on {moment().format('MMMM Do YYYY, h:mm:ss a')} • Generated by RunsheetPro.com
                </footer>
            </div>
        </div>
    );
}

