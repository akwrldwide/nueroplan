import { useEffect, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

export default function SessionTimeout({ children }: { children: ReactNode }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Only set timeout if user is logged in
    if (user) {
      localStorage.setItem('lastActivity', Date.now().toString());
      timeoutRef.current = setTimeout(() => {
        logout();
        navigate('/login?timeout=true');
      }, TIMEOUT_MS);
    }
  };

  useEffect(() => {
    // Check inactivity on mount/load
    if (user) {
      const lastActivity = localStorage.getItem('lastActivity');
      if (lastActivity) {
        if (Date.now() - parseInt(lastActivity, 10) > TIMEOUT_MS) {
          logout();
          navigate('/login?timeout=true');
          return;
        }
      }
    }
    resetTimeout();
  }, [location.pathname, user]);

  useEffect(() => {
    const events = [
      'load',
      'mousemove',
      'mousedown',
      'click',
      'scroll',
      'keypress'
    ];

    const handleEvent = () => resetTimeout();

    for (let i in events) {
      window.addEventListener(events[i], handleEvent);
    }

    resetTimeout();

    return () => {
      for (let i in events) {
        window.removeEventListener(events[i], handleEvent);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user]); // Re-bind if user context changes

  return <>{children}</>;
}
