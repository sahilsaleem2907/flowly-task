import { useState, useEffect } from 'react';
import type { User } from '../types/User';

const AUTH_STORAGE_KEY = 'slate_auth_user';

export const useAuth = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                // Validate that the user object has required properties
                if (user && user.email && user.fullName && user.color) {
                    setCurrentUser(user);
                } else {
                    console.warn('Invalid user data in localStorage, clearing...');
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                }
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem(AUTH_STORAGE_KEY);
            }
        } else {
        }
        setIsLoading(false);
    }, []);

    const signIn = (user: User) => {
        setCurrentUser(user);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    };

    const signOut = () => {
        setCurrentUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    const clearAuth = () => {
        setCurrentUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    return {
        currentUser,
        isLoading,
        signIn,
        signOut,
        clearAuth,
        isAuthenticated: !!currentUser,
    };
}; 