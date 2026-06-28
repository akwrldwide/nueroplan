import { createContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../supabaseClient';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const userRef = useRef<User | null>(null);
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const fetchUserProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('User')
                .select('*, academicProfile:AcademicProfile(*)')
                .eq('id', userId)
                .maybeSingle();
            
            if (error) {
                console.error('Error fetching user profile from database:', error);
                return null;
            }
            return data;
        } catch (error) {
            console.error('Exception fetching user profile:', error);
            return null;
        }
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session) {
                setToken(session.access_token);
                const currentUser = userRef.current;
                if (!currentUser || currentUser.id !== session.user.id) {
                    const profile = await fetchUserProfile(session.user.id);
                    setUser(profile);
                }
            }
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session) {
                setToken(session.access_token);
                const currentUser = userRef.current;
                if (!currentUser || currentUser.id !== session.user.id) {
                    const profile = await fetchUserProfile(session.user.id);
                    setUser(profile);
                }
            } else {
                setToken(null);
                setUser(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setToken(null);
        setUser(null);
    };

    const reloadUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const profile = await fetchUserProfile(session.user.id);
            setUser(profile);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, reloadUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
