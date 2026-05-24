import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    setModel,
    selectTutorialModel,
    selectDevelopmentModel,

} from '../features/diagram';
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
            
            const adaptedModel = await fetchModelLogic({ assignmentId });

            dispatch(setModel({ mode, model: adaptedModel }));

            const hasDiagramData =
                (adaptedModel.diagram?.nodes?.length ?? 0) > 0 ||
                (adaptedModel.classDiagram?.nodes?.length ?? 0) > 0 ||
                Object.keys(adaptedModel.descriptions || {}).length > 0 ||
                Object.keys(adaptedModel.ssds || {}).length > 0 ||
                Object.keys(adaptedModel.sequenceDiagrams || {}).length > 0;

            if (adaptedModel.loadWarning && !hasDiagramData) {
                setError(adaptedModel.loadWarning);
            } else {
                setError(null);
            }
        } catch (err) {
            const status = err.status ?? err.response?.status;

            if (status === 404 || assignmentId === 'guest-default') {
                const newModel = createEmptyModel(assignmentId, `New ${mode === 'tutorial' ? 'Tutorial' : 'Project'}`);
                dispatch(setModel({ mode, model: newModel }));
                setError(status === 404 ? 'Assignment not found' : null);
            } else if (status === 403) {
                setError('You do not have access to this assignment. Make sure you joined the class.');
            } else if (status === 401) {
                setError('Unauthorized access. Please sign in again.');
            } else if (status >= 500) {
                const fallback = createEmptyModel(assignmentId, `Assignment ${assignmentId}`);
                dispatch(setModel({ mode, model: fallback }));
                setError('Server error. Please try again later.');
            } else {
                const msg =
                    status === 429
                        ? 'Too many requests. Please wait a moment and refresh.'
                        : err.message || 'Failed to initialize workspace';
                setError(msg);
            }
        } finally {
            setIsLoading(false);
            loadingRef.current = null;
        }
    }, [assignmentId, mode, dispatch]);


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

