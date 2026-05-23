import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    const { titleSlug } = useParams();

    const assignments = useAppSelector(selectAllAssignments) || [];
    const isAssignmentLoading = useAppSelector(selectAssignmentLoading);
    const isSubmissionLoading = useAppSelector(selectSubmissionLoading);

    const assignmentId = useMemo(() => {
        if (!titleSlug) return null;
        const found = assignments.find(
            (asgn) => asgn.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug
        );
        return found?.id || titleSlug;
    }, [assignments, titleSlug]);

    const { error, isLoading: isModelLoading, refresh: refreshModel } = useUMLModel(assignmentId);

    useEffect(() => {
        if (!titleSlug || isAssignmentLoading) return;
        if (assignments.length === 0) {
            dispatch(fetchAllAssignments('STUDENT'));
            return;
        }
        if (!assignmentId) return;
        const found = assignments.find((a) => a.id === assignmentId);
        if (!found) {
            dispatch(fetchAssignmentById({ id: assignmentId, role: 'STUDENT' }));
        } else {
            dispatch(fetchSubmissionStatus({ assignmentId, includeReport: false }));
        }
    }, [dispatch, titleSlug, assignments, isAssignmentLoading, assignmentId]);

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
        <div className="min-h-screen flex flex-col bg-surface font-body overflow-x-hidden">
            {/* Mode banner */}
            <div
                className={`px-4 py-2 text-[11px] font-extrabold font-heading uppercase tracking-[0.2em] text-center flex items-center justify-center gap-3 shadow-sm relative z-50 border-b transition-colors duration-300 ${
                    currentMode === 'tutorial'
                        ? 'bg-status-green text-white border-green-700'
                        : 'bg-ink text-white border-black/20'
                }`}
                role="status"
                aria-live="polite"
            >
                <span className="flex items-center gap-2">
                    <span
                        className={`w-2 h-2 rounded-full bg-white ${currentMode === 'tutorial' ? 'animate-pulse' : 'opacity-70'}`}
                        aria-hidden
                    />
                    {currentMode === 'tutorial'
                        ? 'Guided Tutorial Session'
                        : isReadOnly
                          ? 'Submitted Assignment — View Only'
                          : 'Development Workspace'}
                </span>
            </div>

            {error && (
                <div
                    className="bg-status-red text-white text-xs py-3 px-4 text-center font-bold font-body shadow-sm z-40 relative flex flex-wrap items-center justify-center gap-3"
                    role="alert"
                >
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => refreshModel()}
                        className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md text-[10px] uppercase tracking-widest transition-colors"
                    >
                        Retry
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
