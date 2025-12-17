'use client';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

export default function ShareDialog({ open, onClose, runsheetId, runsheetName }) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/share/${runsheetId}`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        // Could show a snackbar here
    };

    if (!open) return null;

    return (
        <dialog className="modal modal-open">
            <div className="modal-box">
                <h3 className="font-bold text-lg mb-4">Share Runsheet</h3>
                <p className="py-2 text-sm text-base-content/70">
                    Anyone with this link can view the runsheet.
                </p>

                <div className="join w-full mt-2">
                    <input
                        className="input input-bordered join-item w-full"
                        value={shareUrl}
                        readOnly
                    />
                    <button className="btn join-item btn-primary" onClick={copyToClipboard}>
                        <ContentCopyIcon fontSize="small" />
                    </button>
                </div>

                <div className="modal-action">
                    <button className="btn" onClick={onClose}>Close</button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
}
