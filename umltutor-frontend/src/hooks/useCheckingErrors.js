import { useAppSelector } from '../app/hooks';
import { useAppContext } from '../contexts/AppContext';

/**
 * Hook to retrieve checking errors for a specific location and optionally a specific node.
 * returns empty array if checking mode is not active.
 */
export function useCheckingErrors(
    location,
    nodeId
) {
    const { state: { checkingModeActive } } = useAppContext();
    const results = useAppSelector(state => state.checking.results);

    if (!checkingModeActive || !results) return [];

    // results is the full CheckingResult object, we need the issues array
    const issues = results.issues ?? [];
    if (!Array.isArray(issues)) return [];

    return issues.filter(err => {
        const locationMatch = err?.location === location;
        const nodeMatch = nodeId ? (err?.nodeId === nodeId || !err?.nodeId) : true;
        return locationMatch && nodeMatch;
    });
}
