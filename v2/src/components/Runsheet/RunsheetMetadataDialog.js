'use client';
import { useState, useEffect } from 'react';
import moment from 'moment';

export default function RunsheetMetadataDialog({ open, onClose, onSubmit, initialData }) {
    const [name, setName] = useState('');
    const [date, setDate] = useState('');

    useEffect(() => {
        if (open) {
            setName(initialData ? initialData.name : '');
            // Format for datetime-local input: YYYY-MM-DDTHH:mm
            const initialDate = initialData?.date && initialData?.time
                ? moment(`${initialData.date.split('T')[0]}T${moment(initialData.time, 'HHmm').format('HH:mm')}`).format('YYYY-MM-DDTHH:mm')
                : initialData?.date
                    ? moment(initialData.date).format('YYYY-MM-DDTHH:mm')
                    : moment().format('YYYY-MM-DDTHH:mm');

            setDate(initialDate);
        }
    }, [open, initialData]);

    const handleSubmit = () => {
        if (name.trim() && date) {
            const dateObj = moment(date);
            onSubmit({
                name: name,
                date: dateObj.format('YYYY-MM-DD'),
                time: dateObj.format('HHmm')
            });
        }
    };

    if (!open) return null;

    return (
        <dialog className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">
                    {initialData ? 'Edit Details' : 'New Runsheet'}
                </h3>

                <div className="form-control w-full mb-4">
                    <label className="label">
                        <span className="label-text">Runsheet Title</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Sunday Service"
                        className="input input-bordered w-full"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="form-control w-full mb-4">
                    <label className="label">
                        <span className="label-text">Date & Time</span>
                    </label>
                    <input
                        type="datetime-local"
                        className="input input-bordered w-full"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </div>

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={!name.trim() || !date}
                    >
                        {initialData ? 'Save' : 'Create'}
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
