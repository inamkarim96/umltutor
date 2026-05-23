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

    const loadModel = useCallback(async (force = false) => {
        if (!assignmentId || (assignmentId !== 'guest-default' && isNaN(Number(assignmentId)))) {
            return;
        }

        if (force) lastFailedIdRef.current = null;

        // Prevent parallel calls or retrying a recently failed ID (unless forced)
        if (loadingRef.current === assignmentId || (!force && lastFailedIdRef.current === assignmentId)) return;
        
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
            const status = err.status ?? err.response?.status;
            console.error(`[useUMLModel] Error loading ID ${assignmentId}:`, status, err.message || err);

            if (status === 404 || assignmentId === 'guest-default') {
                const newModel = createEmptyModel(assignmentId, `New ${mode === 'tutorial' ? 'Tutorial' : 'Project'}`);
                dispatch(setModel({ mode, model: newModel }));
                setError(null);
            } else if (status === 403) {
                lastFailedIdRef.current = assignmentId;
                setError('You do not have access to this assignment. Make sure you joined the class.');
            } else {
                lastFailedIdRef.current = assignmentId;
                const msg =
                    status === 429
                        ? 'Too many requests. Please wait a moment and refresh.'
                        : status >= 500
                          ? `Server error (${status}): ${err.message || 'Could not load assignment data'}. Try again or contact support.`
                          : err.message || 'Failed to initialize workspace';
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
        refresh: () => loadModel(true)
    };
};

export default useUMLModel;

