'use client';
import GoogleIcon from '@mui/icons-material/Google';
// Note: Keeping MUI icon for now as uninstallation of MUI icons wasn't explicitly done yet or can be kept if we want icons.
// DaisyUI doesn't ship with icons.
import { useAuth } from '../context/AuthContext';

export default function Login() {
    const { googleSignIn } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-base-200">
            <div className="card w-96 bg-base-100 shadow-xl">
                <div className="card-body items-center text-center">
                    <h2 className="card-title text-3xl font-bold mb-2">RunsheetPro</h2>
                    <p className="text-base-content/70 mb-6">
                        Plan your events with ease. Login to get started.
                    </p>
                    <div className="card-actions w-full">
                        <button
                            className="btn btn-primary w-full"
                            onClick={googleSignIn}
                        >
                            <GoogleIcon /> Sign in with Google
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
