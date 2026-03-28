import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    setModel,
    selectTutorialModel,
    selectDevelopmentModel,

} from '../features/diagram';
import { selectIsGuest } from '../features/auth';
import { selectCurrentMode } from '../features/modes';
import { createEmptyModel, } from '../types/umlModel';
import { fetchModelLogic } from '../features/diagram/diagramLogic';

/**
 * Central hook for fetching and managing the UMLModel state.
 * Now mode-aware to support physical separation of Tutorial and Development data.
 */
export const useUMLModel = (assignmentId) => {
    const dispatch = useDispatch();
    const mode = useSelector(selectCurrentMode);
    const tutorialModel = useSelector(selectTutorialModel);
    const developmentModel = useSelector(selectDevelopmentModel);
    const isGuest = useSelector(selectIsGuest);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Current active model based on mode
    const model = useMemo(() => mode === 'tutorial' ? tutorialModel : developmentModel, [mode, tutorialModel, developmentModel]);

    const loadingRef = useRef(null);
    const lastFailedIdRef = useRef(null);

    const loadModel = useCallback(async () => {
        if (!assignmentId || (assignmentId !== 'guest-default' && isNaN(Number(assignmentId)))) {
            return;
        }

        // Prevent parallel calls or retrying a recently failed ID
        if (loadingRef.current === assignmentId || lastFailedIdRef.current === assignmentId) return;
        
        try {
            loadingRef.current = assignmentId;
            lastFailedIdRef.current = null;
            setIsLoading(true);
            setError(null);
            
            const isStudentWork = window.location.pathname.includes('/student/assignments/');
            console.log(`[useUMLModel] Loading ${mode} model for ID: ${assignmentId}`);

            const adaptedModel = await fetchModelLogic({
                assignmentId,
                mode,
                isGuest,
                isStudentWork
            });

            dispatch(setModel({ mode, model: adaptedModel }));
        } catch (err) {
            console.error(`[useUMLModel] Error loading ID ${assignmentId}:`, err);
            
            if (err.status === 404 || assignmentId === 'guest-default' || err.response?.status === 404) {
                const newModel = createEmptyModel(assignmentId, `New ${mode === 'tutorial' ? 'Tutorial' : 'Project'}`);
                dispatch(setModel({ mode, model: newModel }));
                setError(null);
            } else {
                // For other errors (like 429 or 500), mark as failed to prevent infinite retry loop
                lastFailedIdRef.current = assignmentId;
                const msg = err.response?.status === 429 
                    ? 'Too many requests. Please wait a moment.' 
                    : (err.message || 'Failed to initialize model');
                setError(msg);
            }
        } finally {
            setIsLoading(false);
            loadingRef.current = null;
        }
    }, [assignmentId, isGuest, mode, dispatch]);


    // Reset failure ref if target ID changes
    useEffect(() => {
        if (assignmentId !== lastFailedIdRef.current) {
            lastFailedIdRef.current = null;
        }
    }, [assignmentId]);

    // Effect to refetch only when target ID doesn't match current state
    useEffect(() => {
        const currentModelId = model?.id?.toString();
        const targetId = assignmentId?.toString();

        if (targetId && currentModelId !== targetId && !isLoading) {
            loadModel();
        }
    }, [assignmentId, mode, loadModel, model?.id, isLoading]);

    return {
        model,
        isLoading,
        error,
        refresh: loadModel
    };
};

export default useUMLModel;

