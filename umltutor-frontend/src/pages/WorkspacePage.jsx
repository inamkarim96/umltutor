import React, { useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { setMode, selectCurrentMode, } from '../features/modes';
import ModeAwareEditor from '../components/shared/ModeAwareEditor';
import { useUMLModel } from '../hooks/useUMLModel';
import { clearModeState } from '../features/diagram';
import { selectAllAssignments, fetchAllAssignments, fetchAssignmentById, selectAssignmentLoading } from '../features/assignments';
import { selectSubmissions, fetchSubmissionStatus, selectCurrentSubmission } from '../features/submissions';

/**
 * WorkspacePage is the unified workspace for both Tutorial and Development modes.
 */
const WorkspacePage = ({ mode }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const currentMode = useAppSelector(selectCurrentMode);
    const { titleSlug } = useParams();

    const assignments = useAppSelector(selectAllAssignments) || [];
    const isAssignmentLoading = useAppSelector(selectAssignmentLoading);

    // Resolve slug to numeric ID for student assignments
    const assignmentId = useMemo(() => {
        if (!titleSlug) return null;

        const found = assignments.find(asgn =>
            asgn.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug
        );

        return found?.id || titleSlug; // Fallback to slug if not found yet
    }, [assignments, titleSlug]);

    // 1. Unified Data Loading (Separated internally by mode)
    const { error } = useUMLModel(assignmentId);

    // Ensure assignments and submission status are loaded if we're in a student assignment context
    useEffect(() => {
        if (titleSlug && !isAssignmentLoading) {
            if (assignments.length === 0) {
                dispatch(fetchAllAssignments('STUDENT'));
            } else if (assignmentId) {
                const found = assignments.find(a => a.id === assignmentId);
                if (!found) {
                    dispatch(fetchAssignmentById({ id: assignmentId, role: 'STUDENT' }));
                } else {
                    // Always try to fetch submission status to ensure locking is accurate
                    dispatch(fetchSubmissionStatus(assignmentId));
                }
            }
        }
    }, [dispatch, titleSlug, assignments, isAssignmentLoading, assignmentId]);

    // Handle browser back button properly
    useEffect(() => {
        // Force re-render on navigation changes with delay
        const handleNavigation = () => {
            setTimeout(() => {
                window.location.reload();
            }, 100); // 300ms delay for smooth transition
        };

        window.addEventListener('popstate', handleNavigation);
        return () => window.removeEventListener('popstate', handleNavigation);
    }, []);

    const submissions = useAppSelector(selectSubmissions) || [];
    const currentSubmission = useAppSelector(selectCurrentSubmission);

    // Sync mode to Redux on mount and when prop changes (Automatic Switch on Approval)
    const initialSwitchRef = useRef(false);

    useEffect(() => {
        let finalMode = mode;
        const isWorkPage = window.location.pathname.includes('/student/assignments/') && window.location.pathname.includes('/work');

        // Only auto-switch to tutorial if approved AND we haven't done the initial switch for this submission session
        if (currentSubmission?.tutorialApproved && isWorkPage && !initialSwitchRef.current) {
            finalMode = 'tutorial';
            initialSwitchRef.current = true; // Mark as switched so student can toggle back

            dispatch(clearModeState(finalMode === 'tutorial' ? 'development' : 'tutorial'));
            dispatch(setMode(finalMode));
        } else if (!currentSubmission?.tutorialApproved && isWorkPage) {
            // If not approved, reset ref (maybe request was revoked or it's a new context)
            initialSwitchRef.current = false;
        }

        // If 'mode' prop specifically changed (e.g. via parent component), respect it
        if (mode && mode !== currentMode && !initialSwitchRef.current) {
            dispatch(setMode(mode));
        }
    }, [mode, dispatch, currentSubmission?.tutorialApproved, location.pathname, currentMode]);

    const assignmentObj = useMemo(() => {
        return assignments.find(asgn => asgn.id === assignmentId);
    }, [assignments, assignmentId]);

    const isReadOnly = useMemo(() => {
        const isMatch = (sub) => {
            const subAsgnId = sub.assignmentId || sub.id;
            return subAsgnId === assignmentId ||
                (typeof subAsgnId === 'string' && subAsgnId === titleSlug) ||
                (assignmentObj && subAsgnId === assignmentObj.id);
        };

        // 1. Check currentSubmission (most accurate for student work)
        if (currentSubmission &&
            isMatch(currentSubmission) &&
            ['submitted', 'graded', 'reviewed', 'completed'].includes(currentSubmission.status?.toLowerCase())
        ) {
            return true;
        }

        // 2. Check bulk submissions list (as fallback)
        const pastSubmission = submissions.find(s =>
            isMatch(s) &&
            ['submitted', 'graded', 'reviewed', 'completed'].includes(s.status?.toLowerCase())
        );

        if (pastSubmission) return true;

        if (!assignmentObj) return false;
        const targetDate = assignmentObj.dueDate || assignmentObj.deadline;
        if (!targetDate) return false;

        return new Date(targetDate) < new Date();
    }, [assignmentObj, submissions, currentSubmission, assignmentId, titleSlug]);

    return (
        <div className="h-screen flex flex-col bg-white">
            {/* Mode Banner */}
            <div className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-center flex items-center justify-center gap-4 shadow-sm relative z-50 ${currentMode === 'tutorial'
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 text-white'
                }`}>
                <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                    {currentMode === 'tutorial'
                        ? 'Guided Tutorial Session Active'
                        : 'Free Development Workspace'}
                </span>
            </div>

            {error && (
                <div className="bg-red-500 text-white text-xs py-2 px-4 text-center">
                    ⚠️ Error: {error}. Progress may not be saved.
                </div>
            )}

            {/* Main Editor Area */}
            <div className="flex-1 overflow-hidden">
                <ModeAwareEditor isReadOnly={isReadOnly} />
            </div>
        </div>
    );
};

export default WorkspacePage;

