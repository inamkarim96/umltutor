import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { resolveResourceUrl } from '../../utils/urlHelper';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectTutorialModel, selectDevelopmentModel, clearModeState } from '../../features/diagram';
import {
  setMode,
  selectCurrentMode,
  selectIsCheckingActive,
  setCheckingActive,
  selectIsTutorialMode,
  selectTutorialStep,
  setTutorialStep,
  selectTutorialCompletedSteps,
  selectTutorialValidationByStep,
  markTutorialStepComplete,
  setTutorialValidationResult,
  hydrateTutorialProgress,
} from '../../features/modes';
import TutorialWorkspaceShell from '../tutorial/TutorialWorkspaceShell';
import {
  TUTORIAL_STEPS,
  validateTutorialSection,
  normalizeTutorialStepId,
  getNextStepId,
  getPreviousStepId,
  isStepUnlocked,
  loadTutorialProgressFromStorage,
  saveTutorialProgressToStorage,
  getStepById,
} from '../../features/tutorial/tutorialWorkflow';
import { selectIsAuthenticated } from '../../features/auth';
import { useManualSave } from '../../hooks/useManualSave';
import { UseCaseDiagramEditor } from '../../features/diagram';
import { UseCaseDescriptionEditor } from '../../features/description';
import { SSDDiagramEditor } from '../../features/ssd';
import { ClassDiagramEditor } from '../../features/class-diagram';
import { SequenceDiagramEditor } from '../../features/sequence-diagram';
import { CheckingModePanel } from '../../features/checking';
import { useErrorToast, useSuccessToast } from '../ui/Toast';
import { SubmitAssignmentModal } from '../../features/classroom';
import { selectAllAssignments, selectAssignmentDetail } from '../../features/assignments';
import { submitAssignmentData, selectIsSubmitting, fetchSubmissionStatus, selectCurrentSubmission, requestTutorialMode } from '../../features/submissions';
import { selectUser } from '../../features/auth';
import { runSubmissionCheckLogic } from '../../features/submissions/submissionLogic';
import { buildSavePayload } from '../../utils/savePayloadUtils';

import ConfirmModal from './ConfirmModal';
import WorkspaceSkeleton from '../workspace/WorkspaceSkeleton';
import {
  Info,
  CheckCircle,
  Share2,
  FileText,
  Database,
  Save,
  Download,
  ChevronDown,
  Search,
  ArrowLeft,
  ArrowRight,
  Lock,
  BookOpen,
  File,
  X,
  Eye
} from 'lucide-react';

const StepSelectionModal = ({ isOpen, onClose, onSelect, format }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-hover ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-extrabold font-heading text-ink tracking-tight">Select Export Step</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-3 rounded-lg transition-colors" aria-label="Close">
            <X size={20} className="text-muted" />
          </button>
        </div>

        <p className="text-sm text-muted font-medium mb-8 leading-relaxed">
          Which step would you like to export as <span className="text-accent font-extrabold uppercase">{format}</span>?
          The result will include both your work and the complete checking report.
        </p>

        <div className="space-y-3">
          {[
            { id: 'usecase', label: 'Step 1', desc: 'Use Case Diagram' },
            { id: 'description', label: 'Step 2', desc: 'Use Case Descriptions' },
            { id: 'ssd', label: 'Step 3', desc: 'System Sequence Diagrams' },
            { id: 'class-diagram', label: 'Step 4', desc: 'Class Diagram' },
            { id: 'sequence-diagram', label: 'Step 5', desc: 'Sequence Diagram' }
          ].map(step => (
            <button
              key={step.id}
              data-step-id={step.id}
              onClick={() => onSelect(step.id)}
              className="w-full p-5 bg-surface-3/50 border-2 border-transparent hover:border-accent/30 hover:bg-accent/5 rounded-lg text-left transition-all flex items-center justify-between group"
            >
              <div>
                <span className="block text-[10px] font-extrabold uppercase text-accent mb-0.5 tracking-widest">{step.label}</span>
                <span className="block font-extrabold font-heading text-ink">{step.desc}</span>
              </div>
              <ArrowRight size={20} className="text-muted group-hover:text-accent transform group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * ModeAwareEditor acts as a unified entry point for all UML editors.
 * It identifies current mode (Tutorial/Development) from Redux and 
 * manages the switching between Diagram, Description, and SSD editors.
 */
const ModeAwareEditor = ({ isReadOnly = false, assignmentId: assignmentIdProp, onExit }) => {
  const [activeSection, setActiveSection] = useState('usecase');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(true); // Open by default if it's an assignment
  const [exportModal, setExportModal] = useState({ isOpen: false, format: null });
  const [isExporting, setIsExporting] = useState(false);
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const [lastSaved, setLastSaved] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [saveRetryCount, setSaveRetryCount] = useState(0);
  const [isTutorialValidating, setIsTutorialValidating] = useState(false);
  const [showTutorialComplete, setShowTutorialComplete] = useState(false);

  const fetchedFullReportRef = useRef(null);
  const activeSectionRef = useRef(activeSection);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isCheckingActive = useAppSelector(selectIsCheckingActive);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentMode = useAppSelector(selectCurrentMode);
  const isTutorialMode = useAppSelector(selectIsTutorialMode);
  const currentSubmission = useAppSelector(selectCurrentSubmission);
  // Strictly enforce tutorial UI if approved by teacher, even if Redux mode hasn't switched yet
  const isTutorialActive = currentMode === 'tutorial';
  const submittedStatuses = ['submitted', 'graded', 'reviewed', 'completed', 'approved'];
  const isSubmitted =
    !!currentSubmission?.submittedAt ||
    submittedStatuses.includes(currentSubmission?.status?.toLowerCase()) ||
    !!currentSubmission?.fullReport;
  const isTutorialEditable = isTutorialActive && isSubmitted && currentSubmission?.tutorialApproved;

  let effectivelyReadOnly = isReadOnly;
  if (isTutorialEditable) {
    effectivelyReadOnly = false;
  } else if (isStudentWork && isSubmitted) {
    effectivelyReadOnly = true;
  }

  const tutorialStep = useAppSelector(selectTutorialStep);
  const tutorialCompletedSteps = useAppSelector(selectTutorialCompletedSteps);
  const tutorialValidationByStep = useAppSelector(selectTutorialValidationByStep);
  const normalizedTutorialStep = normalizeTutorialStepId(tutorialStep);
  // Tutorial shell when in tutorial mode and the student can edit (incl. approved tutorial on submitted work)
  const showTutorialUI = isTutorialMode && !effectivelyReadOnly;
  const enforceTutorialProgression = isTutorialMode;
  const isSubmitting = useAppSelector(selectIsSubmitting);
  const checkingState = useAppSelector(state => state.checking);

  const tutorialModel = useAppSelector(selectTutorialModel);
  const developmentModel = useAppSelector(selectDevelopmentModel);
  const model = useMemo(() => currentMode === 'tutorial' ? tutorialModel : developmentModel, [currentMode, tutorialModel, developmentModel]);
  const modelRef = useRef(model);

  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { activeSectionRef.current = activeSection; }, [activeSection]);

  const errorToast = useErrorToast();
  const successToast = useSuccessToast();

  const registry = useAppSelector(s => s.mode.nameRegistry);
  const systemName = (registry?.system)?.lockedName;

  const exportDropdownRef = useRef(null);
  const { saveToLocal, exportToFile, canSave, isSaving, saveError } = useManualSave(activeSection);

  // Student Assignment Context
  const user = useAppSelector(selectUser);
  const assignments = useAppSelector(selectAllAssignments) || [];
  const isStudentWork = window.location.pathname.includes('/student/assignments/') && window.location.pathname.includes('/work');
  const titleSlug = window.location.pathname.split('/').find((segment, i, arr) => arr[i - 1] === 'assignments');
  const isStudent = user?.role === 'STUDENT';
  const assignmentId = useMemo(
    () =>
      assignmentIdProp ||
      model?.id ||
      assignments.find((a) => a.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug)?.id,
    [assignmentIdProp, model, assignments, titleSlug]
  );

  // Use both the assignments list and the specific detail from Redux
  const assignmentDetail = useAppSelector(selectAssignmentDetail);

  const assignmentDetails = React.useMemo(() => {
    // 1. Prioritize singular detail if it matches current assignment
    if (assignmentDetail && (assignmentDetail.id === assignmentId || assignmentDetail.id?.toString() === assignmentId?.toString())) {
      return assignmentDetail;
    }

    if (!assignments || assignments.length === 0) return null;

    // 2. Try finding by database ID from model
    if (assignmentId) {
      const found = assignments.find(a => a.id === assignmentId || a.id?.toString() === assignmentId?.toString());
      if (found) return found;
    }

    // 3. Try finding by title slug from URL
    if (titleSlug) {
      const found = assignments.find(a => a.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug);
      if (found) return found;
    }

    return null;
  }, [assignments, assignmentDetail, assignmentId, titleSlug]);

  const persistDraft = useCallback(
    async (isAutoSave = false) => {
      if (isSubmitted) return;
      try {
        if (isAutoSave) setIsAutoSaving(true);
        else setIsManualSaving(true);
        await saveToLocal();
        if (!isAuthenticated) {
          if (!isAutoSave) successToast('Session saved temporarily.');
          return;
        }
        if (isStudentWork && assignmentId) {
          const currentModel = modelRef.current;
          const currentSection = activeSectionRef.current;
          await dispatch(
            submitAssignmentData({
              assignmentId,
              data: buildSavePayload(currentModel, {
                status: 'draft',
                section: currentSection,
                ...(showTutorialUI
                  ? {
                      tutorialProgress: {
                        currentStep: currentSection,
                        completedSteps: tutorialCompletedSteps,
                      },
                    }
                  : {}),
              }),
              lean: true,
            })
          ).unwrap();
          setLastSaved(new Date());
          setSaveRetryCount(0);
          if (!isAutoSave) successToast('Progress saved to the database.');
        }
      } catch (error) {
        console.error('Save failed:', error);
        if (!isAutoSave) {
          errorToast('Failed to save: ' + (error.message || 'Unknown error'));
          setSaveRetryCount((c) => c + 1);
        }
        throw error;
      } finally {
        if (isAutoSave) setIsAutoSaving(false);
        else setIsManualSaving(false);
      }
    },
    [
      isSubmitted,
      saveToLocal,
      isAuthenticated,
      isStudentWork,
      assignmentId,
      dispatch,
      successToast,
      errorToast,
      showTutorialUI,
      tutorialCompletedSteps,
    ]
  );

  const handleSave = () => persistDraft(false);

  useEffect(() => {
    if (isSubmitted || effectivelyReadOnly || isSubmitting || isManualSaving || !model) return;
    const timer = setTimeout(() => {
      persistDraft(true).catch(() => {});
    }, 15000);
    return () => clearTimeout(timer);
  }, [model, isSubmitted, effectivelyReadOnly, isSubmitting, isManualSaving, activeSection, persistDraft]);
  const handleRequestTutorial = async () => {
    try {
      if (!currentSubmission?.id) {
        errorToast("Please save your draft first before requesting tutorial mode.");
        return;
      }
      await dispatch(requestTutorialMode(currentSubmission.id)).unwrap();
      successToast("Tutorial Mode requested successfully!");
    } catch (err) {
      errorToast(err || "Failed to request tutorial mode.");
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCheckingMode = () => {
    dispatch(setCheckingActive(!isCheckingActive));
  };

  const isGraded = currentSubmission?.status?.toLowerCase() === 'graded' || currentSubmission?.status?.toLowerCase() === 'completed';
  const hasReport = isGraded || !!currentSubmission?.fullReport;

  // Workflow stage determination
  const workflowStages = [
    { id: 'usecase', label: 'Use Case Diagram' },
    { id: 'development', label: 'Development' },
    { id: 'editorial', label: 'Editorial' },
    { id: 'completed', label: 'Completed' },
  ];
  const currentStage = useMemo(() => {
    if (isGraded) return 'completed';
    if (isSubmitted && currentSubmission?.tutorialApproved) return 'editorial';
    if (isSubmitted) return 'editorial';
    if (activeSection !== 'usecase') return 'development';
    return 'usecase';
  }, [isGraded, isSubmitted, currentSubmission?.tutorialApproved, activeSection]);
  const getStageStatus = (stageId) => {
    const stageOrder = ['usecase', 'development', 'editorial', 'completed'];
    const currentIdx = stageOrder.indexOf(currentStage);
    const stageIdx = stageOrder.indexOf(stageId);
    if (stageIdx < currentIdx) return 'completed';
    if (stageIdx === currentIdx) return 'active';
    return 'locked';
  };

  const submissionStatusLabel = useMemo(() => {
    if (!currentSubmission) return 'Not Started';
    const s = currentSubmission.status?.toLowerCase();
    if (s === 'graded') return 'Graded';
    if (s === 'submitted') return 'Submitted';
    if (s === 'draft') return 'Draft';
    return 'Not Started';
  }, [currentSubmission]);

  // Automatically enable checking mode for students if graded or has report (only once)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (isStudentWork && hasReport && !autoOpenedRef.current) {
      dispatch(setCheckingActive(true));
      autoOpenedRef.current = true;
    }
  }, [isStudentWork, hasReport, dispatch]);

  // Reset autoOpen if the submission/assignment changes
  useEffect(() => {
    autoOpenedRef.current = false;
  }, [assignmentId]);

  // Fetch full report when the submission is submitted or graded (lightweight status loaded by WorkspacePage)
  useEffect(() => {
    const s = currentSubmission?.status?.toLowerCase();
    if (isStudentWork && assignmentId && (s === 'graded' || s === 'submitted') && !currentSubmission?.fullReport) {
      if (fetchedFullReportRef.current === assignmentId) return;
      fetchedFullReportRef.current = assignmentId;
      dispatch(fetchSubmissionStatus({ assignmentId, includeReport: true }));
    }
  }, [isStudentWork, assignmentId, currentSubmission?.status, currentSubmission?.fullReport, dispatch]);

  const tutorialHydratedRef = useRef(null);

  // Restore tutorial progress from local storage (until backend persistence is added)
  useEffect(() => {
    if (!showTutorialUI || !assignmentId) return;
    if (tutorialHydratedRef.current === assignmentId) return;
    tutorialHydratedRef.current = assignmentId;
    const stored = loadTutorialProgressFromStorage(assignmentId);
    if (stored) {
      dispatch(
        hydrateTutorialProgress({
          currentStep: normalizeTutorialStepId(stored.currentStep),
          completedSteps: stored.completedSteps || [],
        })
      );
      if (stored.validationByStep) {
        Object.entries(stored.validationByStep).forEach(([stepId, result]) => {
          dispatch(setTutorialValidationResult({ stepId, result }));
        });
      }
      if (stored.currentStep) {
        setActiveSection(normalizeTutorialStepId(stored.currentStep));
      }
    }
  }, [showTutorialUI, assignmentId, dispatch]);

  // Keep the student on the highest allowed step (cannot skip ahead)
  useEffect(() => {
    if (!enforceTutorialProgression) return;
    if (isStepUnlocked(activeSection, tutorialCompletedSteps)) return;
    const allowedStep =
      [...TUTORIAL_STEPS].reverse().find((s) => isStepUnlocked(s.id, tutorialCompletedSteps))?.id ||
      'usecase';
    setActiveSection(allowedStep);
    dispatch(setTutorialStep(allowedStep));
  }, [enforceTutorialProgression, tutorialCompletedSteps, activeSection, dispatch]);

  useEffect(() => {
    if (!enforceTutorialProgression) return;
    const step = normalizeTutorialStepId(tutorialStep);
    if (isStepUnlocked(step, tutorialCompletedSteps) && activeSection !== step) {
      setActiveSection(step);
    }
  }, [enforceTutorialProgression, tutorialStep, tutorialCompletedSteps]);

  const persistTutorialProgress = useCallback(
    (overrides = {}) => {
      if (!assignmentId) return;
      saveTutorialProgressToStorage(assignmentId, {
        currentStep: normalizeTutorialStepId(overrides.currentStep ?? activeSection),
        completedSteps: overrides.completedSteps ?? tutorialCompletedSteps,
        validationByStep: overrides.validationByStep ?? tutorialValidationByStep,
      });
    },
    [assignmentId, activeSection, tutorialCompletedSteps, tutorialValidationByStep]
  );

  const sections = TUTORIAL_STEPS.map((step) => ({
    id: step.id,
    label: `${step.order}. ${step.label}`,
    icon: step.id === 'usecase' || step.id === 'sequence-diagram' ? Share2 : step.id === 'description' ? FileText : Database,
    isLocked: enforceTutorialProgression && !isStepUnlocked(step.id, tutorialCompletedSteps),
    isActive:
      !enforceTutorialProgression ||
      step.id === normalizedTutorialStep ||
      tutorialCompletedSteps.includes(step.id),
  }));

  const currentStepValidation = tutorialValidationByStep[activeSection];
  const canProceedTutorial = !!currentStepValidation?.isValid;
  const isLastTutorialStep = activeSection === TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].id;

  const runTutorialValidation = useCallback(async () => {
    if (!model) return null;
    setIsTutorialValidating(true);
    await new Promise((r) => setTimeout(r, 350));
    const result = validateTutorialSection(activeSection, model, systemName);
    dispatch(setTutorialValidationResult({ stepId: activeSection, result }));
    persistTutorialProgress();
    setIsTutorialValidating(false);
    return result;
  }, [model, activeSection, systemName, dispatch, persistTutorialProgress]);

  const handleSectionTabChange = (sectionId) => {
    if (enforceTutorialProgression && !isStepUnlocked(sectionId, tutorialCompletedSteps)) {
      errorToast('Complete and validate the current step before opening later editors.');
      return;
    }
    const section = sections.find((s) => s.id === sectionId);
    if (section?.isLocked) {
      errorToast('Please complete the previous step first.');
      return;
    }
    setActiveSection(sectionId);
    if (showTutorialUI) {
      dispatch(setTutorialStep(sectionId));
      persistTutorialProgress({ currentStep: sectionId });
    }
  };

  const handleTutorialProcess = async () => {
    const validation = await runTutorialValidation();

    if (!validation?.isValid) {
      errorToast(validation?.message || 'Complete this step according to the validation rules.');
      return;
    }

    dispatch(markTutorialStepComplete(activeSection));
    const nextCompleted = tutorialCompletedSteps.includes(activeSection)
      ? tutorialCompletedSteps
      : [...tutorialCompletedSteps, activeSection];

    try {
      setIsManualSaving(true);
      await persistDraft(false);
    } catch {
      errorToast('Could not save progress. Please try Save Progress.');
    } finally {
      setIsManualSaving(false);
    }

    if (isLastTutorialStep) {
      persistTutorialProgress({ completedSteps: nextCompleted, currentStep: activeSection });
      setShowTutorialComplete(true);
      successToast('Tutorial completed! Great work.');
      return;
    }

    const nextId = getNextStepId(activeSection);
    if (nextId) {
      dispatch(setTutorialStep(nextId));
      setActiveSection(nextId);
      persistTutorialProgress({ completedSteps: nextCompleted, currentStep: nextId });
      successToast(`Step validated! Opening ${getStepById(nextId).label}.`);
    }
  };

  const handleProcess = async () => {
    if (enforceTutorialProgression) {
      await handleTutorialProcess();
      return;
    }
    if (activeSection === 'usecase') {
      setActiveSection('description');
    } else if (activeSection === 'description') {
      setActiveSection('ssd');
    } else if (activeSection === 'ssd') {
      if (isStudentWork) {
        const dueDate = assignmentDetails?.dueDate ? new Date(assignmentDetails.dueDate) : null;
        const isPastDeadline = dueDate ? new Date() > dueDate : false;
        if (isPastDeadline) {
          errorToast('Deadline has passed. You can no longer resubmit this assignment.');
          return;
        }
        setIsSubmitModalOpen(true);
        return;
      }
      successToast('Moving to Class Diagram.');
      setActiveSection('class-diagram');
    } else if (activeSection === 'class-diagram') {
      setActiveSection('sequence-diagram');
    } else if (activeSection === 'sequence-diagram') {
      if (isStudentWork) {
        setIsSubmitModalOpen(true);
      } else {
        successToast('All steps completed in Development Mode.');
      }
    }
  };

  const handleFinalSubmit = async ({ description }) => {
    if (isSubmitted) {
      errorToast('Assignment already submitted. Editing is disabled.');
      return;
    }
    try {
      await dispatch(
        submitAssignmentData({
          assignmentId,
          data: buildSavePayload(model, { status: 'submitted', notes: description }),
          lean: false,
        })
      ).unwrap();

      await dispatch(fetchSubmissionStatus({ assignmentId, includeReport: false }));
      successToast('Assignment submitted successfully! The workspace is now read-only.');
      setIsSubmitModalOpen(false);
      dispatch(setMode('development'));
    } catch (error) {
      const msg = typeof error === 'string' ? error : error?.message || 'Submission failed';
      errorToast(msg);
    }
  };

  const handleBack = () => {
    if (showTutorialUI) {
      const prev = getPreviousStepId(activeSection);
      if (prev) {
        setActiveSection(prev);
        dispatch(setTutorialStep(prev));
        persistTutorialProgress({ currentStep: prev });
      }
      return;
    }
    if (activeSection === 'description') {
      setActiveSection('usecase');
    } else if (activeSection === 'ssd') {
      setActiveSection('description');
    } else if (activeSection === 'class-diagram') {
      setActiveSection('ssd');
    } else if (activeSection === 'sequence-diagram') {
      setActiveSection('class-diagram');
    } else if (activeSection === 'usecase') {
      setIsExitConfirmOpen(true);
    }
  };

  const handleTutorialSave = async () => {
    try {
      setIsManualSaving(true);
      await persistDraft(false);
      persistTutorialProgress();
      successToast('Tutorial progress saved.');
    } catch {
      errorToast('Save failed. Check your connection and retry.');
    } finally {
      setIsManualSaving(false);
    }
  };

  const handleConfirmExit = () => {
    if (onExit) onExit();
    else navigate(isStudentWork ? '/student/dashboard' : '/student/dashboard');
  };

  if (!model) {
    return <WorkspaceSkeleton />;
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'usecase':
        if (!isCheckingActive) {
          return <UseCaseDiagramEditor key={effectivelyReadOnly ? 'read-only' : 'editable'} assignmentId={model.id} initialData={model.diagram} isReadOnly={effectivelyReadOnly} />;
        }
        return (
          <div className="flex h-full">
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              <UseCaseDiagramEditor key={effectivelyReadOnly ? 'read-only' : 'editable'} assignmentId={model.id} initialData={model.diagram} isReadOnly={effectivelyReadOnly} />
            </div>
            <div className="w-80 border-l border-gray-100 bg-gray-50/30 flex flex-col h-full animate-in slide-in-from-right duration-500">
              <CheckingModePanel
                activeSection="usecase"
                reportOverride={isGraded || currentSubmission?.tutorialApproved || isSubmitted ? currentSubmission?.fullReport : null}
                onRunChecker={!effectivelyReadOnly && !isStudent && currentMode === 'development' ? ((args) => dispatch(runSubmissionCheckLogic(model.id, args))) : undefined}
              />
            </div>
          </div>
        );
      case 'description':
        return <UseCaseDescriptionEditor
          key={effectivelyReadOnly ? 'read-only' : 'editable'}
          assignmentId={model.id}
          isReadOnly={effectivelyReadOnly}
          isCheckingActive={isCheckingActive}
          reportOverride={isGraded || currentSubmission?.tutorialApproved || isSubmitted ? currentSubmission?.fullReport : null}
        />;
      case 'ssd':
        return <SSDDiagramEditor
          key={effectivelyReadOnly ? 'read-only' : 'editable'}
          assignmentId={model.id}
          isReadOnly={effectivelyReadOnly}
          isCheckingActive={isCheckingActive}
          reportOverride={isGraded || currentSubmission?.tutorialApproved || isSubmitted ? currentSubmission?.fullReport : null}
          onRunChecker={!effectivelyReadOnly && !isStudent && currentMode === 'development' ? ((args) => dispatch(runSubmissionCheckLogic(model.id, args))) : undefined}
          modelOverride={model}
        />;
      case 'class-diagram':
        if (!isCheckingActive) {
          return (
            <ClassDiagramEditor
              key={effectivelyReadOnly ? 'read-only' : 'editable'}
              assignmentId={model.id}
              initialData={model.classDiagram}
              isReadOnly={effectivelyReadOnly}
              embedded={showTutorialUI}
            />
          );
        }
        return (
          <div className="flex h-full gap-0">
            <div className="flex-1 min-w-0 h-full overflow-hidden">
              <ClassDiagramEditor
                key={effectivelyReadOnly ? 'read-only' : 'editable'}
                assignmentId={model.id}
                initialData={model.classDiagram}
                isReadOnly={effectivelyReadOnly}
                embedded={showTutorialUI}
              />
            </div>
            <div className="w-80 border-l border-gray-100 bg-gray-50/30 flex flex-col h-full">
              <CheckingModePanel
                activeSection="class-diagram"
                reportOverride={isGraded || currentSubmission?.tutorialApproved || isSubmitted ? currentSubmission?.fullReport : null}
                modelOverride={model}
                onRunChecker={!effectivelyReadOnly && !isStudent && currentMode === 'development' ? ((args) => dispatch(runSubmissionCheckLogic(model.id, args))) : undefined}
              />
            </div>
          </div>
        );
      case 'sequence-diagram':
        return (
          <SequenceDiagramEditor
            key={effectivelyReadOnly ? 'read-only' : 'editable'}
            assignmentId={model.id}
            isReadOnly={effectivelyReadOnly}
            isCheckingActive={isCheckingActive && !showTutorialUI}
            modelOverride={model}
            embedded={showTutorialUI}
            reportOverride={isGraded || currentSubmission?.tutorialApproved || isSubmitted ? currentSubmission?.fullReport : null}
            onRunChecker={!effectivelyReadOnly && !isStudent && currentMode === 'development' ? ((args) => dispatch(runSubmissionCheckLogic(model.id, args))) : undefined}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white/90 backdrop-blur-sm font-body overflow-x-hidden relative w-full">
      {/* 1. Sticky Top Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-black/5 shadow-sm px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center text-xl shadow-card shrink-0">
            📝
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold font-heading text-ink truncate max-w-sm">{model.title || assignmentDetails?.title || 'Workspace'}</h2>
              {isStudentWork && <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-extrabold font-heading rounded uppercase tracking-widest border border-amber-100">Assignment</span>}
              {assignmentDetails?.deadline && (
                <span className="px-2 py-0.5 bg-red-50 text-status-red text-[9px] font-extrabold font-heading rounded uppercase tracking-widest border border-red-100">
                  Due: {new Date(assignmentDetails.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            <p className="text-xs text-muted font-medium truncate max-w-lg mt-0.5">{model.description || assignmentDetails?.description || 'Your UML modeling workspace'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 mr-2">
            {isAutoSaving ? (
              <span className="text-[10px] font-bold font-body text-gray-400 flex items-center gap-1 animate-pulse"><Database size={10}/> Saving...</span>
            ) : lastSaved ? (
              <span className="text-[10px] font-bold font-body text-gray-400 flex items-center gap-1"><CheckCircle size={10}/> Saved {lastSaved.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            ) : null}
          </div>

          <button
            onClick={handleSave}
            disabled={!model || isManualSaving || isAutoSaving || effectivelyReadOnly || isSubmitted}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-surface-3 border border-black/10 disabled:opacity-50 disabled:cursor-not-allowed text-ink text-xs font-bold font-body rounded-lg transition-all shadow-sm hover:shadow-md"
            aria-label="Save draft progress"
          >
            <Save size={14} className="text-accent" />
            {isManualSaving ? 'Saving...' : 'Save'}
          </button>
          {saveRetryCount > 0 && !isSubmitted && (
            <button
              type="button"
              onClick={handleSave}
              className="text-[10px] font-bold text-accent hover:underline"
            >
              Retry save
            </button>
          )}
          
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              disabled={!model}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-surface-3 border border-black/10 disabled:opacity-50 text-ink text-xs font-bold font-body rounded-lg transition-colors shadow-sm"
            >
              <Download size={14} className="text-accent" /> Export
              <ChevronDown size={12} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showExportDropdown && (
                <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-black/10 rounded-xl shadow-hover p-2 z-50">
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {['png', 'jpeg', 'svg', 'pdf'].map(ext => (
                      <button
                        key={ext}
                        onClick={() => {
                          setExportModal({ isOpen: true, format: ext });
                          setShowExportDropdown(false);
                        }}
                        className="text-center px-2 py-1.5 text-[10px] hover:bg-surface-3 rounded border border-black/5 bg-surface-3/50 font-bold font-body uppercase transition-colors"
                      >
                        {ext}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-black/5 my-1"></div>
                  <button
                    onClick={async () => {
                      setIsExporting(true);
                      await new Promise(resolve => setTimeout(resolve, 300));
                      try {
                        const studentName = model?.studentName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '') || (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : '') || user?.name || user?.fullName || currentSubmission?.studentName || '';
                        const teacherName = model?.teacherName || assignmentDetails?.teacher_name || assignmentDetails?.teacherName || assignmentDetails?.teacher?.name || assignmentDetails?.createdBy?.name || '';
                        const className = model?.className || assignmentDetails?.class_name || assignmentDetails?.className || assignmentDetails?.class?.name || assignmentDetails?.course || '';
                        await exportToFile('combined', currentSubmission?.fullReport || checkingState.results, {
                          studentName: studentName.trim() || user?.username || user?.email || '',
                          teacherName: teacherName.trim(),
                          className: className.trim(),
                          assignmentTitle: model.title || assignmentDetails?.title || '',
                          mode: currentMode,
                          reviewerName: currentSubmission?.reviewedBy?.name || currentSubmission?.reviewedBy?.username || ''
                        });
                        successToast('Full model exported successfully!');
                      } catch (err) {
                        errorToast('Export failed: ' + err.message);
                      } finally {
                        setIsExporting(false);
                        setShowExportDropdown(false);
                      }
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent/10 rounded-lg font-extrabold font-heading text-accent flex flex-col gap-0.5 transition-colors"
                  >
                    <div className="flex items-center gap-1.5 font-extrabold font-heading">
                      <File size={12} />
                      <span>Export Complete Model</span>
                    </div>
                    <span className="text-[9px] opacity-70 font-medium">Include Diagrams & Reports</span>
                  </button>
                </div>
            )}
          </div>

          {isStudentWork && (
            <button
              onClick={() => {
                if (isSubmitted) {
                  errorToast('Assignment already submitted. Editing is disabled.');
                  return;
                }
                setIsSubmitModalOpen(true);
              }}
              disabled={isSubmitted || isSubmitting || effectivelyReadOnly}
              title={isSubmitted ? 'Assignment already submitted' : 'Submit your final work'}
              className="flex items-center justify-center gap-1.5 px-6 py-2 bg-accent hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-white text-xs font-extrabold font-heading rounded-lg transition-all shadow-md hover:-translate-y-0.5"
            >
              <CheckCircle size={14} />
              {isSubmitted ? 'Submitted' : isSubmitting ? 'Submitting...' : 'Submit Assignment'}
            </button>
          )}

          {isStudentWork && isSubmitted && !currentSubmission?.tutorialApproved && (
            <button
              onClick={handleRequestTutorial}
              disabled={currentSubmission?.tutorialRequested && !currentSubmission?.tutorialRejected}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold font-heading uppercase tracking-wider transition-all shadow-sm border border-accent/20 bg-accent/10 text-accent hover:bg-accent/15 disabled:opacity-60"
            >
              <BookOpen size={14} />
              {currentSubmission?.tutorialRejected
                ? 'Request Tutorial'
                : currentSubmission?.tutorialRequested
                  ? 'Tutorial Pending'
                  : 'Request Tutorial'}
            </button>
          )}

          {isStudentWork && isSubmitted && currentSubmission?.tutorialApproved && (
            <button
              onClick={() => {
                const newMode = currentMode === 'tutorial' ? 'development' : 'tutorial';
                dispatch(setMode(newMode));
                if (newMode === 'tutorial') dispatch(clearModeState('tutorial'));
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-extrabold font-heading uppercase tracking-wider transition-all shadow-sm ${
                currentMode === 'tutorial'
                  ? 'bg-ink text-white hover:bg-ink/90'
                  : 'bg-status-green text-white hover:bg-green-700'
              }`}
            >
              {currentMode === 'tutorial' ? <Eye size={14} /> : <BookOpen size={14} />}
              {currentMode === 'tutorial' ? 'Submitted View' : 'Tutorial Mode'}
            </button>
          )}

          {(currentMode === 'development' || isTutorialMode) &&
            (!isStudentWork || hasReport || currentSubmission?.fullReport || currentSubmission?.tutorialApproved) && (
            <button
                onClick={toggleCheckingMode}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold font-body transition-colors shadow-sm border ${isCheckingActive
                  ? 'bg-status-green text-white border-green-600'
                  : 'bg-white text-ink hover:bg-surface-3 border-black/10'
                  }`}
              >
                <Search size={14} />
                {hasReport || currentSubmission?.fullReport || currentSubmission?.tutorialApproved
                  ? 'Checking Report'
                  : 'Checking Mode'}
            </button>
          )}
        </div>
      </div>

      {/* Workspace Info Bar */} 
      {isStudentWork && (
        <div className="bg-white border-b border-black/5 px-6 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[11px] font-medium text-gray-500 z-30">
          <span className="flex items-center gap-1.5">
            <span className="font-extrabold font-heading uppercase tracking-widest text-gray-400">Class</span>
            <span className="text-ink font-bold">{model?.className || assignmentDetails?.class?.name || '—'}</span>
          </span>
          { (model?.classCode || assignmentDetails?.class?.code) && (
            <span className="flex items-center gap-1.5">
              <span className="font-extrabold font-heading uppercase tracking-widest text-gray-400">Batch</span>
              <span className="text-ink font-bold">{model?.classCode || assignmentDetails?.class?.code}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="font-extrabold font-heading uppercase tracking-widest text-gray-400">Role</span>
            <span className="text-ink font-bold capitalize">{user?.role || 'Student'}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-extrabold font-heading uppercase tracking-widest text-gray-400">Status</span>
            <span className={`font-bold capitalize ${
              submissionStatusLabel === 'Graded' ? 'text-status-green' :
              submissionStatusLabel === 'Submitted' ? 'text-accent' :
              submissionStatusLabel === 'Draft' ? 'text-amber-600' : 'text-gray-400'
            }`}>{submissionStatusLabel}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-extrabold font-heading uppercase tracking-widest text-gray-400">Stage</span>
            <span className="text-ink font-bold capitalize">{workflowStages.find(s => s.id === currentStage)?.label || currentStage}</span>
          </span>
        </div>
      )}

      {/* Workflow Stage Pipeline */}
      {isStudentWork && (
        <div className="bg-surface-3/60 border-b border-black/5 px-6 py-3 z-30">
          <div className="max-w-[1600px] mx-auto flex items-center gap-0">
            {workflowStages.map((stage, idx) => {
              const stageStatus = getStageStatus(stage.id);
              return (
                <React.Fragment key={stage.id}>
                  {idx > 0 && (
                    <div className={`flex-1 h-0.5 mx-1 ${
                      stageStatus === 'locked' ? 'bg-gray-200' : 'bg-accent/30'
                    }`} />
                  )}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold font-heading uppercase tracking-widest whitespace-nowrap transition-all ${
                    stageStatus === 'active'
                      ? 'bg-accent/10 text-accent border border-accent/20 shadow-sm'
                      : stageStatus === 'completed'
                        ? 'bg-status-green/10 text-status-green border border-emerald-100'
                        : 'bg-white/50 text-gray-300 border border-transparent'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      stageStatus === 'active' ? 'bg-accent animate-pulse' :
                      stageStatus === 'completed' ? 'bg-status-green' : 'bg-gray-300'
                    }`} />
                    {stage.label}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {isSubmitted && currentMode !== 'tutorial' && (
        <div
          className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-center gap-2 text-xs font-extrabold font-heading uppercase tracking-widest z-30"
          role="status"
        >
          <Lock size={14} aria-hidden />
          Assignment already submitted. Editing is disabled.
          {currentSubmission?.tutorialApproved && (
            <span className="normal-case font-medium tracking-normal text-amber-700">
              Switch to Tutorial Mode for guided review.
            </span>
          )}
        </div>
      )}
      {isStudentWork && currentSubmission?.tutorialRejected && !currentSubmission?.tutorialApproved && (
        <div
          className="bg-red-50 border-b border-red-100 text-status-red px-4 md:px-6 py-2 text-xs font-medium z-30 text-center"
          role="status"
        >
          Tutorial request declined
          {currentSubmission.tutorialRejectionReason
            ? `: ${currentSubmission.tutorialRejectionReason}`
            : '.'}{' '}
          You may submit a new request when ready.
        </div>
      )}

      {/* 3. Horizontal Tab Bar (development only — tutorial uses guided sidebar) */}
      {!enforceTutorialProgression && (
      <div className="bg-white border-b border-black/5 px-6 pt-3 flex gap-4 overflow-x-auto custom-scrollbar sticky z-30" style={{ top: '73px' }}>
         {sections.map(section => (
            <button
              key={section.id}
              onClick={() => handleSectionTabChange(section.id)}
              disabled={section.isLocked}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-bold font-body transition-all border-b-2 whitespace-nowrap ${
                activeSection === section.id
                ? 'border-accent text-accent bg-accent/5'
                : 'border-transparent text-muted hover:bg-surface-3 hover:text-ink'
              } ${section.isLocked ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
            >
              <section.icon size={16} className={activeSection === section.id ? 'text-accent' : 'text-gray-400'} />
              {section.label}
            </button>
         ))}
      </div>
      )}

      {/* 4. Instructions & Resources */}
      {isStudentWork && model && (
         <div className="px-6 py-4 bg-surface-3 border-b border-black/5">
            <div className="max-w-[1600px] mx-auto w-full flex flex-col md:flex-row gap-6">
               <div className="flex-1">
                 <h3 className="text-[10px] font-extrabold font-heading text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <FileText size={12} /> Instructions
                 </h3>
                 <div className="bg-white rounded-lg p-4 text-sm text-gray-700 leading-relaxed max-h-40 overflow-y-auto border border-black/5 shadow-sm font-medium custom-scrollbar">
                    {model.textContent ? (
                      <div className="whitespace-pre-wrap">{model.textContent}</div>
                    ) : model.instructions ? (
                      <div className="whitespace-pre-wrap">{model.instructions}</div>
                    ) : (
                      <p className="italic text-gray-400">Please refer to the description or attached resources for instructions.</p>
                    )}
                 </div>
               </div>
               
               {model.assignmentFileUrl && (
                 <div className="w-full md:w-80 shrink-0">
                   <h3 className="text-[10px] font-extrabold font-heading text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Database size={12} /> Resource
                   </h3>
                   <div className="flex items-center justify-between p-3 bg-white border border-black/5 rounded-lg hover:border-accent/30 transition-all shadow-sm group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-accent/10 text-accent rounded-lg flex items-center justify-center shrink-0">
                          <File size={16} />
                        </div>
                        <span className="text-xs font-bold font-body text-gray-700 truncate">
                          {model.assignmentFileName || 'Resource File'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button onClick={() => setPreviewFile({ url: model.assignmentFileUrl, name: model.assignmentFileName || 'Resource File', type: model.assignmentFileType })} className="p-1.5 hover:bg-surface-3 rounded-md text-muted transition-colors">
                          <Eye size={14} />
                        </button>
                        <a href={resolveResourceUrl(model.assignmentFileUrl)} download={model.assignmentFileName || 'Resource'} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-surface-3 rounded-md text-muted transition-colors">
                          <Download size={14} />
                        </a>
                      </div>
                   </div>
                 </div>
               )}
            </div>
         </div>
      )}

      {/* 5. Main Active Content */}
      {showTutorialUI ? (
        <TutorialWorkspaceShell
          activeSection={activeSection}
          completedSteps={tutorialCompletedSteps}
          validationByStep={tutorialValidationByStep}
          currentValidation={currentStepValidation}
          isValidating={isTutorialValidating}
          canProceed={canProceedTutorial}
          isLastStep={isLastTutorialStep}
          isSaving={isManualSaving || isAutoSaving}
          proceedTooltip="Complete this diagram, run Check, then use Process to continue."
          processLabel="Process"
          onStepSelect={handleSectionTabChange}
          onValidate={runTutorialValidation}
          onPrevious={handleBack}
          onProceed={handleTutorialProcess}
          onSave={handleTutorialSave}
          onExit={() => setIsExitConfirmOpen(true)}
          showPrevious={!!getPreviousStepId(activeSection)}
          headerExtras={
            <span className="text-[10px] font-bold text-muted uppercase tracking-widest hidden sm:inline">
              Guided step-by-step learning
            </span>
          }
        >
          <div className="flex-1 min-h-0 w-full h-full p-2 flex flex-col" style={{ minHeight: 480 }}>
            {renderContent()}
          </div>
        </TutorialWorkspaceShell>
      ) : (
        <div className="flex-1 w-full max-w-[1600px] mx-auto px-6 py-8 pb-32">
          <div className="bg-white rounded-2xl shadow-card border border-black/5 p-2 h-[600px] md:h-[750px] flex flex-col">
            {renderContent()}
          </div>
        </div>
      )}

      {showTutorialComplete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-hover animate-in zoom-in-95">
            <div className="text-5xl mb-4" aria-hidden>🎉</div>
            <h3 className="text-2xl font-black font-heading text-ink mb-2">Tutorial Complete!</h3>
            <p className="text-sm text-muted font-medium mb-6">
              You have validated all five UML steps. Your progress has been saved.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowTutorialComplete(false);
                dispatch(setMode('development'));
              }}
              className="w-full py-3 bg-accent text-white font-extrabold font-heading rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Continue in Development Mode
            </button>
          </div>
        </div>
      )}

      <SubmitAssignmentModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
        assignmentTitle={assignmentDetails?.title || model?.title || 'Assignment Submission'}
        assignment={assignmentDetails}
      />
      <ConfirmModal
        isOpen={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        onConfirm={handleConfirmExit}
        title="Exit Workspace?"
        message="Any unsaved progress will be lost. Ensure you have saved your draft before leaving."
      />

      {/* Resource Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <File size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-none">{previewFile.name}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Resource Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolveResourceUrl(previewFile.url)}
                  download={previewFile.name}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
                >
                  <Download size={16} /> Download
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50/50 p-8 flex items-center justify-center">
              {previewFile.url && (previewFile.type?.startsWith('image/') ||
                ['png', 'jpg', 'jpeg', 'gif', 'webp'].some(ext => previewFile.url.toLowerCase().endsWith('.' + ext)) ||
                ['png', 'jpg', 'jpeg', 'gif', 'webp'].some(ext => previewFile.name.toLowerCase().endsWith('.' + ext))) ? (
                <img
                  src={resolveResourceUrl(previewFile.url)}
                  alt={previewFile.name}
                  className="max-w-full h-auto object-contain rounded-2xl shadow-lg border border-white"
                />
              ) : (previewFile.type === 'application/pdf' || previewFile.url.toLowerCase().endsWith('.pdf') || previewFile.name.toLowerCase().endsWith('.pdf')) ? (
                <iframe
                  src={resolveResourceUrl(previewFile.url)}
                  className="w-full h-[70vh] rounded-2xl border border-gray-100 shadow-lg"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center p-20">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-300 shadow-sm border border-gray-50">
                    <File size={32} />
                  </div>
                  <p className="text-gray-400 font-bold">No interactive preview for this file type.</p>
                  <button
                    onClick={() => window.open(resolveResourceUrl(previewFile.url), '_blank')}
                    className="mt-4 px-6 py-2 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest"
                  >
                    Open in New Tab
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <StepSelectionModal
        isOpen={exportModal.isOpen}
        format={exportModal.format}
        onClose={() => setExportModal({ ...exportModal, isOpen: false, subItems: null })}
        onSelect={async (stepId) => {
          const format = exportModal.format;

          // Check if we need to show sub-selection for hierarchical types
          const descriptions = Object.entries(model.descriptions || {});
          if (stepId === 'description' && descriptions.length > 1 && !exportModal.selectedItemId) {
            setExportModal(prev => ({ ...prev, subItems: descriptions.map(([id, d], i) => ({ id, label: `2.${i + 1}: ${d.useCaseName || 'Untitled'}` })) }));
            return;
          }

          const ssdCanvases = Array.from(document.querySelectorAll('[data-testid="ssd-canvas"]'));
          if (stepId === 'ssd' && ssdCanvases.length > 1 && !exportModal.selectedItemId) {
            setExportModal(prev => ({ ...prev, subItems: ssdCanvases.map((c, i) => ({ id: c.getAttribute('data-usecase-id'), label: `3.${i + 1}` })) }));
            return;
          }

          const finalItemId = exportModal.selectedItemId || (stepId === 'description' ? descriptions[0]?.[0] : stepId === 'ssd' ? ssdCanvases[0]?.getAttribute('data-usecase-id') : null);

          setExportModal({ ...exportModal, isOpen: false, subItems: null, selectedItemId: null });
          setIsExporting(true);

          const prevSection = activeSection;
          try {
            if (activeSection !== stepId) {
              setActiveSection(stepId);
              await new Promise(resolve => setTimeout(resolve, 600));
            }

            const { exportStepWithReport } = await import('../../utils/exportUtils');
            await exportStepWithReport(stepId, format, model, currentSubmission?.fullReport || (activeSection === stepId ? checkingState.results : null), finalItemId);

            successToast(`Step exported successfully as ${format.toUpperCase()}.`);
          } catch (error) {
            console.error('Single step export failed:', error);
            errorToast('Export failed: ' + error.message);
          } finally {
            if (prevSection !== stepId) {
              setActiveSection(prevSection);
            }
            setIsExporting(false);
          }
        }}
      />

      {exportModal.subItems && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 mb-4 italic">Select Specific Item</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {exportModal.subItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    const stepId = item.label.startsWith('2.') ? 'description' : 'ssd';
                    setExportModal(prev => ({ ...prev, selectedItemId: item.id, subItems: null }));
                    // Re-trigger original select with item info
                    const selectBtn = document.querySelector(`[data-step-id="${stepId}"]`);
                    if (selectBtn) selectBtn.click();
                  }}
                  className="w-full p-4 bg-gray-50 hover:bg-indigo-50 text-left rounded-xl transition-all font-bold text-gray-800 border border-transparent hover:border-indigo-200"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setExportModal(prev => ({ ...prev, subItems: null }))}
              className="mt-6 w-full py-3 text-sm font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isExporting && (
        <>
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">Preparing High-Quality Export...</p>
              <p className="text-xs text-gray-500 mt-1">Including your work and checking report</p>
              <p className="text-[10px] text-gray-400 mt-4 italic">Sequential rendering in progress (Diagrams → Descriptions → SSDs → Class Diagram)</p>
            </div>
          </div>
          <div
            id="full-model-export-renderer"
            className="fixed opacity-0 pointer-events-none"
            style={{ width: '1300px', height: 'auto', left: '-20000px', top: 0, overflow: 'visible' }}
          >
            <div className="w-full flex flex-col gap-20 p-20 bg-white">
              {/* Step 1: Use Case Diagram & Report */}
              <div className="flex flex-col gap-8" data-export-section="usecase">
                <h1 className="text-4xl font-black text-indigo-600 uppercase tracking-tight">1. Use Case Diagram</h1>
                <div className="w-full border rounded-2xl overflow-hidden bg-slate-50" style={{ height: '600px' }}>
                  <UseCaseDiagramEditor
                    assignmentId={model.id}
                    initialData={model.diagram}
                    isReadOnly={true}
                  />
                </div>
                <div className="w-full">
                  <CheckingModePanel
                    activeSection="usecase"
                    reportOverride={currentSubmission?.fullReport}
                    modelOverride={model}
                  />
                </div>
              </div>

              {/* Step 2: Use Case Descriptions & Reports */}
              <div className="flex flex-col gap-12" data-export-section="descriptions">
                <h1 className="text-4xl font-black text-indigo-600 uppercase tracking-tight">2. Use Case Descriptions</h1>
                {model?.descriptions && Object.entries(model.descriptions).map(([id, desc]) => (
                  <div key={id} className="flex flex-col gap-6 p-8 border-2 border-slate-100 rounded-3xl">
                    <h2 className="text-2xl font-black text-slate-800 italic">2.1 Use Case: {desc.useCaseName}</h2>
                    <div className="w-full">
                      <UseCaseDescriptionEditor
                        assignmentId={model.id}
                        isReadOnly={true}
                        isCheckingActive={false}
                        useCaseId={id}
                      />
                    </div>
                    <div className="w-full mt-4">
                      <CheckingModePanel
                        activeSection="description"
                        useCaseId={id}
                        reportOverride={currentSubmission?.fullReport}
                        modelOverride={model}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Step 3: SSDs & Reports */}
              <div className="flex flex-col gap-12" data-export-section="ssds">
                <h1 className="text-4xl font-black text-indigo-600 uppercase tracking-tight">3. System Sequence Diagrams</h1>
                {model?.descriptions && Object.keys(model.descriptions).map(id => (
                  <div key={id} className="flex flex-col gap-8 p-10 border-2 border-slate-100 rounded-3xl">
                    <h2 className="text-2xl font-black text-slate-800 italic">3.1 SSD: {model.descriptions[id]?.useCaseName}</h2>
                    <div className="w-full border rounded-2xl overflow-hidden bg-slate-50" style={{ height: '600px' }}>
                      <SSDDiagramEditor
                        assignmentId={model.id}
                        isReadOnly={true}
                        isCheckingActive={false}
                        modelOverride={model}
                        useCaseId={id}
                      />
                    </div>
                    <div className="w-full">
                      <CheckingModePanel
                        activeSection="ssd"
                        useCaseId={id}
                        reportOverride={currentSubmission?.fullReport}
                        modelOverride={model}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Step 4: Class Diagram & Report */}
              <div className="flex flex-col gap-12" data-export-section="class-diagram">
                <h1 className="text-4xl font-black text-indigo-600 uppercase tracking-tight">4. Class Diagram</h1>
                <div className="w-full border rounded-2xl overflow-hidden bg-slate-50" style={{ height: '800px' }}>
                  <ClassDiagramEditor
                    assignmentId={model.id}
                    initialData={model.classDiagram}
                    isReadOnly={true}
                  />
                </div>
                <div className="w-full">
                  <CheckingModePanel
                    activeSection="class-diagram"
                    reportOverride={currentSubmission?.fullReport}
                    modelOverride={model}
                  />
                </div>
              </div>

              {/* Step 5: Sequence Diagrams & Reports */}
              <div className="flex flex-col gap-12" data-export-section="sequence-diagrams">
                <h1 className="text-4xl font-black text-indigo-600 uppercase tracking-tight">5. Sequence Diagrams</h1>
                {model?.descriptions && Object.keys(model.descriptions).map(id => (
                  <div key={id} className="flex flex-col gap-8 p-10 border-2 border-slate-100 rounded-3xl">
                    <h2 className="text-2xl font-black text-slate-800 italic">5.1 Sequence: {model.descriptions[id]?.useCaseName}</h2>
                    <div className="w-full border rounded-2xl overflow-hidden bg-slate-50" style={{ height: '700px' }}>
                      <SequenceDiagramEditor
                        assignmentId={model.id}
                        isReadOnly={true}
                        modelOverride={model}
                        useCaseId={id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModeAwareEditor;

