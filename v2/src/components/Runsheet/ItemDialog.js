'use client';
import { useState, useEffect } from 'react';

export default function ItemDialog({ open, onClose, onSubmit, initialData }) {
    const [data, setData] = useState({ text: '', remarks: '', duration: '' });

    useEffect(() => {
        if (initialData) {
            setData({
                text: initialData.text || '',
                remarks: initialData.remarks || '',
                duration: initialData.duration || ''
            });
        } else {
            setData({ text: '', remarks: '', duration: '' });
        }
    }, [initialData, open]);

    const handleChange = (e) => {
        setData({ ...data, [e.target.name]: e.target.value });
    };

    const handleSubmit = () => {
        onSubmit(data);
    };

    if (!open) return null;

    return (
        <dialog className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">{initialData ? 'Edit Item' : 'Add Item'}</h3>

                <div className="form-control w-full mb-2">
                    <label className="label">
                        <span className="label-text">Item Title</span>
                    </label>
                    <input
                        type="text"
                        name="text"
                        autoFocus
                        className="input input-bordered w-full"
                        value={data.text}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-control w-full mb-2">
                    <label className="label">
                        <span className="label-text">Duration (minutes)</span>
                    </label>
                    <input
                        type="number"
                        name="duration"
                        className="input input-bordered w-full"
                        value={data.duration}
                        onChange={handleChange}
                    />
                </div>

                <div className="form-control w-full mb-2">
                    <label className="label">
                        <span className="label-text">Remarks / Description</span>
                    </label>
                    <textarea
                        name="remarks"
                        className="textarea textarea-bordered h-24"
                        value={data.remarks}
                        onChange={handleChange}
                    ></textarea>
                </div>

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>Save</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
