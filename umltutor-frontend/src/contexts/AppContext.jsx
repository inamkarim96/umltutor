import React, { createContext, useContext, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setMode, setCheckingModeActive, selectCurrentMode, selectIsCheckingActive, selectConstraintsEnabled, } from '../features/modes';

/**
 * AppContext provides mode and checking state to all consumers.
 * Internally backed by Redux modeSlice — this is a thin bridge
 * so existing consumers don't need to be rewritten.
 */
const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
    const dispatch = useAppDispatch();
    const currentMode = useAppSelector(selectCurrentMode);
    const checkingModeActive = useAppSelector(selectIsCheckingActive);
    const constraintsEnabled = useAppSelector(selectConstraintsEnabled);

    const handleSetMode = useCallback((mode) => {
        dispatch(setMode(mode));
    }, [dispatch]);

    const handleSetCheckingActive = useCallback((active) => {
        dispatch(setCheckingModeActive(active));
    }, [dispatch]);

    const value = {
        state: {
            mode: currentMode,
            constraintsEnabled,
            checkingModeActive,
        },
        setMode: handleSetMode,
        setCheckingActive: handleSetCheckingActive,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};

