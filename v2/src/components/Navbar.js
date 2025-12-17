'use client';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logOut } = useAuth();

    return (
        <div className="navbar bg-base-100 border-b border-base-200">
            <div className="flex-1">
                <a className="btn btn-ghost text-xl font-bold">RunsheetPro</a>
            </div>
            {user && (
                <div className="flex-none gap-2">
                    <span className="hidden sm:inline text-sm">{user.displayName}</span>
                    <div className="dropdown dropdown-end">
                        <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                            <div className="w-8 rounded-full">
                                <img
                                    alt="User Avatar"
                                    src={user.photoURL}
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                        </div>
                        <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52 border border-base-200">
                            <li><a onClick={logOut}>Logout</a></li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
