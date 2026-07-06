'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userHash, setUserHash] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                });

                let hash = 5381;
                const cleanEmail = user.email.trim().toLowerCase();
                for (let i = 0; i < cleanEmail.length; i++) {
                    hash = (hash * 33) ^ cleanEmail.charCodeAt(i);
                }
                setUserHash((hash >>> 0).toString(36));
            } else {
                setUser(null);
                setUserHash('');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (user?.email) {
            try {
                const prefixes = ['dashboard_filter_', 'lastGroup_', 'joinedGroups_', 'runsheetsCache_', 'groupsCache_'];
                const keysToMigrate = [];

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) {
                        const prefix = prefixes.find(p => key.startsWith(p));
                        if (prefix && key.substring(prefix.length).includes('@')) {
                            keysToMigrate.push({ key, prefix, email: key.substring(prefix.length) });
                        }
                    }
                }

                keysToMigrate.forEach(({ key, prefix, email }) => {
                    const val = localStorage.getItem(key);

                    let hash = 5381;
                    const cleanEmail = email.trim().toLowerCase();
                    for (let j = 0; j < cleanEmail.length; j++) {
                        hash = (hash * 33) ^ cleanEmail.charCodeAt(j);
                    }
                    const newSuffix = (hash >>> 0).toString(36);
                    const newKey = prefix + newSuffix;

                    localStorage.setItem(newKey, val);
                    localStorage.removeItem(key);
                });
            } catch (e) {
                console.error("Local storage migration failed", e);
            }
        }
    }, [user]);

    const googleSignIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const logOut = async () => {
        try {
            await signOut(auth);
            if (typeof window !== 'undefined') {
                localStorage.clear();
                sessionStorage.clear();
            }
            router.push('/');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, googleSignIn, logOut, loading, userHash }}>
            {children}
        </AuthContext.Provider>
    );
};
