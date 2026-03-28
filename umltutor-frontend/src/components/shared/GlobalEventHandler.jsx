import { useEffect } from 'react';
import { useToast } from '../ui/Toast';
import { eventBus, GLOBAL_EVENTS } from '../../utils/events';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Global component to listen for non-React events (like from apiClient)
 * and trigger UI actions like toasts and navigation.
 */
const GlobalEventHandler = () => {
    const { addToast } = useToast();
    const { logout } = useAuth();

    useEffect(() => {
        // Handle Toast events
        const handleShowToast = (data) => {
            addToast({
                message: data.message,
                type: data.type || 'info'
            });
        };

        // Handle Auth failure (401)
        const handleAuthFailure = () => {
            // Let the centralized logout logic clear state and navigate.
            // (Avoid pushing extra history entries that break Back navigation.)
            logout();
        };

        eventBus.on(GLOBAL_EVENTS.SHOW_TOAST, handleShowToast);
        eventBus.on(GLOBAL_EVENTS.AUTH_FAILURE, handleAuthFailure);

        return () => {
            eventBus.off(GLOBAL_EVENTS.SHOW_TOAST, handleShowToast);
            eventBus.off(GLOBAL_EVENTS.AUTH_FAILURE, handleAuthFailure);
        };
    }, [addToast, logout]);

    return null; // This component doesn't render anything
};

export default GlobalEventHandler;
