import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';

interface User {
    id: string;
    name: string;
    email: string;
    onboarding_stage: string;
    allow_morning_revision?: boolean;
    post_exam_preference?: string;
    preferred_focus_window?: string;
    academicProfile?: any;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    reloadUser: () => Promise<void>;
    loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Using axios interceptor to attach token implicitly
axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await axios.get('/api/auth/me');
                setUser(res.data);
            } catch (error) {
                console.error('Error fetching user', error);
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, [token]);

    const login = (newToken: string, newUser: User) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('lastActivity');
        setToken(null);
        setUser(null);
    };

    const reloadUser = async () => {
        if (!token) return;
        try {
            const res = await axios.get('/api/auth/me');
            setUser(res.data);
        } catch (error) {
            console.error('Error reloading user', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, reloadUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
