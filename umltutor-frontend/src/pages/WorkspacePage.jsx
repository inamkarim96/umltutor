import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setMode, selectCurrentMode } from '../features/modes';
import ModeAwareEditor from '../components/shared/ModeAwareEditor';
import WorkspaceSkeleton from '../components/workspace/WorkspaceSkeleton';
import { useUMLModel } from '../hooks/useUMLModel';
import { clearModeState } from '../features/diagram';
import {
    selectAllAssignments,
    fetchAllAssignments,
    fetchAssignmentById,
    selectAssignmentLoading,
} from '../features/assignments';
import {
    selectSubmissions,
    fetchSubmissionStatus,
    selectCurrentSubmission,
    selectSubmissionLoading,
} from '../features/submissions';

/**
 * Unified assignment workspace — tutorial and development modes.
 */
const WorkspacePage = ({ mode }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const currentMode = useAppSelector(selectCurrentMode);
    // NOTE: The app uses a custom router (manual pushState + matchPath) with no <Route>
    // components, so React Router's useParams() always returns {} here.
    // We parse the slug directly from the URL — the same pattern used in ModeAwareEditor.jsx.
    const titleSlug = window.location.pathname
        .split('/')
        .find((segment, i, arr) => arr[i - 1] === 'assignments' && segment !== 'submitted' && segment !== 'pending' && segment !== 'reviewed');

    const assignments = useAppSelector(selectAllAssignments) || [];
    const isAssignmentLoading = useAppSelector(selectAssignmentLoading);
    const isSubmissionLoading = useAppSelector(selectSubmissionLoading);

    const assignmentId = useMemo(() => {
        if (!titleSlug) return null;
        const found = assignments.find(
            (asgn) => asgn.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug
        );
        return found?.id || null;
    }, [assignments, titleSlug]);

    const { error, isLoading: isModelLoading, refresh: refreshModel } = useUMLModel(assignmentId);

    // Guard ref: tracks which assignmentId we have already fetched submission status for.
    // This prevents fetchSubmissionStatus from being dispatched multiple times when the
    // `assignments` array gets a new reference (which happens on every Redux state update).
    const submissionFetchedRef = useRef(null);

    // Reset the guard whenever we navigate to a different assignment.
    useEffect(() => {
        if (submissionFetchedRef.current !== assignmentId) {
            submissionFetchedRef.current = null;
        }
    }, [assignmentId]);

    useEffect(() => {
        if (!titleSlug || isAssignmentLoading) return;
        if (assignments.length === 0) {
            dispatch(fetchAllAssignments('STUDENT'));
            return;
        }
        if (assignmentId) {
            const found = assignments.find((a) => a.id === assignmentId);
            if (found) {
                // Only dispatch once per assignmentId — guard against repeated fetches
                // caused by Redux returning a new `assignments` array reference on every update.
                if (submissionFetchedRef.current !== assignmentId) {
                    submissionFetchedRef.current = assignmentId;
                    // Fetch lightweight status only — no report on initial load.
                    // ModeAwareEditor fetches the full report lazily when status === 'graded'.
                    dispatch(fetchSubmissionStatus(assignmentId));
                }
            } else {
                dispatch(fetchAssignmentById({ id: assignmentId, role: 'STUDENT' }));
            }
        }
    }, [dispatch, titleSlug, assignments.length, isAssignmentLoading, assignmentId]);

    const submissions = useAppSelector(selectSubmissions) || [];
    const currentSubmission = useAppSelector(selectCurrentSubmission);

    const initialSwitchRef = useRef(false);

    useEffect(() => {
        const isWorkPage =
            window.location.pathname.includes('/student/assignments/') &&
            window.location.pathname.includes('/work');

        if (currentSubmission?.tutorialApproved && isWorkPage && !initialSwitchRef.current) {
            initialSwitchRef.current = true;
            dispatch(clearModeState('development'));
            dispatch(setMode('tutorial'));
        } else if (!currentSubmission?.tutorialApproved && isWorkPage) {
            initialSwitchRef.current = false;
        }

        if (mode && mode !== currentMode && !initialSwitchRef.current) {
            dispatch(setMode(mode));
        }
    }, [mode, dispatch, currentSubmission?.tutorialApproved, currentMode]);

    const assignmentObj = useMemo(
        () => assignments.find((asgn) => asgn.id === assignmentId),
        [assignments, assignmentId]
    );

    const isReadOnly = useMemo(() => {
        const isMatch = (sub) => {
            const subAsgnId = sub.assignmentId || sub.id;
            return (
                subAsgnId === assignmentId ||
                (typeof subAsgnId === 'string' && subAsgnId === titleSlug) ||
                (assignmentObj && subAsgnId === assignmentObj.id)
            );
        };

        const lockedStatuses = ['submitted', 'graded', 'reviewed', 'completed'];
        const isLockedStatus = (sub) =>
            lockedStatuses.includes(sub?.status?.toLowerCase()) || !!sub?.submittedAt;

        if (currentSubmission && isMatch(currentSubmission) && isLockedStatus(currentSubmission)) {
            return true;
        }

        const pastSubmission = submissions.find((s) => isMatch(s) && isLockedStatus(s));
        if (pastSubmission) return true;

        if (!assignmentObj) return false;
        const targetDate = assignmentObj.dueDate || assignmentObj.deadline;
        if (!targetDate) return false;
        return new Date(targetDate) < new Date();
    }, [assignmentObj, submissions, currentSubmission, assignmentId, titleSlug]);

    const isPageLoading =
        isModelLoading || isAssignmentLoading || (assignmentId && isSubmissionLoading && !currentSubmission);

    if (isPageLoading) {
        return <WorkspaceSkeleton />;
    }

    return (
        <div className="min-h-screen flex flex-col bg-transparent font-body overflow-x-hidden">
            {/* Mode banner */}
            <div
                className={`px-4 py-3 text-center shadow-sm relative z-50 border-b transition-colors duration-300 ${
                    currentMode === 'tutorial'
                        ? 'bg-gradient-to-r from-emerald-600 via-status-green to-teal-600 text-white border-green-800'
                        : 'bg-ink text-white border-black/20'
                }`}
                role="status"
                aria-live="polite"
            >
                <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                    <span className="flex items-center gap-2 text-[11px] font-extrabold font-heading uppercase tracking-[0.2em]">
                        <span
                            className={`w-2 h-2 rounded-full bg-white ${currentMode === 'tutorial' ? 'animate-pulse' : 'opacity-70'}`}
                            aria-hidden
                        />
                        {currentMode === 'tutorial'
                            ? 'Guided Tutorial Mode'
                            : isReadOnly
                              ? 'Submitted Assignment — View Only'
                              : 'Development Workspace'}
                    </span>
                    {currentMode === 'tutorial' && (
                        <span className="text-[10px] font-medium normal-case tracking-normal opacity-90 max-w-lg">
                            Complete each step, run validation, then proceed to the next editor.
                        </span>
                    )}
                </div>
            </div>

            {/* Hide non-critical warnings on student side — students don't need "no saved work" noise */}
            {error && !window.location.pathname.includes('/student/') && (
                <div
                    className="bg-amber-600 text-white text-xs py-3 px-4 text-center font-bold font-body shadow-sm z-40 relative flex flex-wrap items-center justify-center gap-3"
                    role="alert"
                >
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => refreshModel()}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-[10px] uppercase tracking-widest transition-colors"
                    >
                        Retry load
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-[10px] uppercase tracking-widest transition-colors"
                    >
                        Reload page
                    </button>
                </div>
            )}

            <div className="flex-1 w-full">
                <ModeAwareEditor
                    isReadOnly={isReadOnly}
                    assignmentId={assignmentId}
                    onExit={() => navigate('/student/dashboard')}
                />
            </div>
        </div>
    );
};

export default WorkspacePage;
