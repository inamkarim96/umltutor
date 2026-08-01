import { useEffect, useRef } from 'react';
import { SequenceAutosave } from './sequenceAutosave.cjs';

export function useSequenceAutosave({
    activeUseCaseId,
    nodes,
    edges,
    mode,
    isReadOnly,
    dispatch,
    updateSequenceDiagramAction,
}) {
    const autosaveRef = useRef(null);

    if (!autosaveRef.current) {
        autosaveRef.current = new SequenceAutosave({
            save: (payload) => dispatch(updateSequenceDiagramAction(payload)),
        });
    }

    useEffect(() => {
        autosaveRef.current.schedule({ activeUseCaseId, nodes, edges, mode, isReadOnly });
    }, [activeUseCaseId, nodes, edges, mode, isReadOnly]);

    useEffect(() => {
        const autosave = autosaveRef.current;
        return () => autosave.dispose();
    }, []);

    return autosaveRef.current;
}
