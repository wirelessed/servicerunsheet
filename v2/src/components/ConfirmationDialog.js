'use client';

export default function ConfirmationDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', confirmStyle = 'btn-error' }) {
    if (!open) return null;

    return (
        <dialog className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="py-4">{message}</p>
                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Cancel</button>
                    <button className={`btn ${confirmStyle}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
