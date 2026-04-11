import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  setTutorialStep
} from '../../features/modes';
import { selectIsAuthenticated } from '../../features/auth';
import { useManualSave } from '../../hooks/useManualSave';
import { UseCaseDiagramEditor } from '../../features/diagram';
import { UseCaseDescriptionEditor } from '../../features/description';
import { SSDDiagramEditor, validateAllSSDsTutorial } from '../../features/ssd';
import { CheckingModePanel } from '../../features/checking';
import { validateUseCaseDiagramTutorial } from '../../features/diagram';
import { validateAllDescriptionsTutorial } from '../../features/description';
import { useErrorToast, useSuccessToast } from '../ui/Toast';
import { SubmitAssignmentModal } from '../../features/classroom';
import { selectAllAssignments, selectAssignmentDetail } from '../../features/assignments';
import { submitAssignmentData, selectIsSubmitting, fetchSubmissionStatus, selectCurrentSubmission, requestTutorialMode } from '../../features/submissions';
import { selectUser } from '../../features/auth';
import { runSubmissionCheckLogic } from '../../features/submissions/submissionLogic';

import ConfirmModal from './ConfirmModal';
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
  X
} from 'lucide-react';

const StepSelectionModal = ({ isOpen, onClose, onSelect, format }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100 italic tracking-tight">Select Export Step</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
          Which step would you like to export as <span className="text-indigo-600 font-black uppercase">{format}</span>?
          The result will include both your work and the complete checking report.
        </p>

        <div className="space-y-3">
          {[
            { id: 'usecase', label: 'Step 1', desc: 'Use Case Diagram' },
            { id: 'description', label: 'Step 2', desc: 'Use Case Descriptions' },
            { id: 'ssd', label: 'Step 3', desc: 'System Sequence Diagrams' }
          ].map(step => (
            <button
              key={step.id}
              data-step-id={step.id}
              onClick={() => onSelect(step.id)}
              className="w-full p-5 bg-gray-50 dark:bg-gray-800/50 border-2 border-transparent hover:border-indigo-500/30 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 rounded-2xl text-left transition-all flex items-center justify-between group"
            >
              <div>
                <span className="block text-[10px] font-black uppercase text-indigo-600 mb-0.5 tracking-widest">{step.label}</span>
                <span className="block font-black text-gray-800 dark:text-gray-200">{step.desc}</span>
              </div>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
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
const ModeAwareEditor = ({ isReadOnly = false }) => {
  const [activeSection, setActiveSection] = useState('usecase');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(true); // Open by default if it's an assignment
  const [exportModal, setExportModal] = useState({ isOpen: false, format: null });
  const [isExporting, setIsExporting] = useState(false);

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isCheckingActive = useAppSelector(selectIsCheckingActive);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentMode = useAppSelector(selectCurrentMode);
  const isTutorialMode = useAppSelector(selectIsTutorialMode);
  const currentSubmission = useAppSelector(selectCurrentSubmission);
  // Strictly enforce tutorial UI if approved by teacher, even if Redux mode hasn't switched yet
  const isTutorialActive = currentMode === 'tutorial';
  const isSubmitted = ['submitted', 'graded', 'reviewed', 'completed', 'approved'].includes(currentSubmission?.status?.toLowerCase()) || !!currentSubmission?.fullReport;
  const effectivelyReadOnly = isReadOnly || (isStudentWork && isSubmitted && !isTutorialActive);

  useEffect(() => {
    // Submission status tracking effect
  }, [currentSubmission?.status, isSubmitted, currentMode]);

  const tutorialStep = useAppSelector(selectTutorialStep);
  const isSubmitting = useAppSelector(selectIsSubmitting);
  const checkingState = useAppSelector(state => state.checking);

  const tutorialModel = useAppSelector(selectTutorialModel);
  const developmentModel = useAppSelector(selectDevelopmentModel);
  const model = currentMode === 'tutorial' ? tutorialModel : developmentModel;

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
  const assignmentId = model?.id || assignments.find(a => a.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug)?.id;

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

  const handleSave = async () => {
    try {
      await saveToLocal();
      if (!isAuthenticated) {
        successToast('Session saved temporarily.');
      } else {
        // Authenticated student: Save to backend database
        if (isStudentWork && assignmentId) {
          await dispatch(submitAssignmentData({
            assignmentId: assignmentId,
            data: {
              status: 'draft',
              diagramData: model
            }
          })).unwrap();
          successToast('Progress saved securely to the database.');
          // Refresh status so auto-save/draft indicator can be updated if desired
          dispatch(fetchSubmissionStatus(assignmentId));
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
      errorToast('Failed to save progress: ' + (error.message || 'Unknown error'));
    }
  };

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

  // Automatically enable checking mode for students if graded (only once)
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (isStudentWork && isGraded && !autoOpenedRef.current) {
      dispatch(setCheckingActive(true));
      autoOpenedRef.current = true;
    }
  }, [isStudentWork, isGraded, dispatch]);

  // Reset autoOpen if the submission/assignment changes
  useEffect(() => {
    autoOpenedRef.current = false;
  }, [assignmentId]);

  // Fetch status on mount if not available
  useEffect(() => {
    if (isStudentWork && assignmentId && !currentSubmission) {
      dispatch(fetchSubmissionStatus(assignmentId));
    }
  }, [isStudentWork, assignmentId, currentSubmission, dispatch]);

  // Auto-Progression for Tutorial Mode
  useEffect(() => {
    if (isTutorialActive && model && !isReadOnly && !isGraded) {
      // 1. Check Step 1 (Use Case Diagram)
      const step1 = validateUseCaseDiagramTutorial(
        model.diagram?.nodes || [],
        model.diagram?.edges || [],
        systemName
      );

      if (step1.isValid) {
        // Step 1 is done, check Step 2 (Descriptions)
        const useCaseNodes = model.diagram?.nodes?.filter(n => n.type === 'usecase' || n.type === 'useCase') || [];
        const step2 = validateAllDescriptionsTutorial(useCaseNodes, model.descriptions || {});

        if (step2.isValid) {
          // Both Step 1 and 2 are done
          if (tutorialStep !== 'SEQUENCE') {
            dispatch(setTutorialStep('SEQUENCE'));
          }
        } else {
          // Step 1 done, but Step 2 not done
          if (tutorialStep !== 'DESCRIPTION') {
            dispatch(setTutorialStep('DESCRIPTION'));
          }
        }
      } else {
        // Step 1 not done
        if (tutorialStep !== 'USE_CASE') {
          dispatch(setTutorialStep('USE_CASE'));
        }
      }
    }

  }, [isTutorialActive, model?.diagram, model?.descriptions, systemName, isReadOnly, isGraded, dispatch]);

  const sections = [
    {
      id: 'usecase',
      label: '1. Use Case Diagram',
      icon: Share2,
      isLocked: false,
      isActive: true
    },
    {
      id: 'description',
      label: '2. Use Case Descriptions',
      icon: FileText,
      // Enforce flow only in Tutorial mode
      isLocked: isTutorialMode && tutorialStep === 'USE_CASE',
      isActive: !isTutorialMode || tutorialStep === 'DESCRIPTION' || tutorialStep === 'SEQUENCE'
    },
    {
      id: 'ssd',
      label: '3. System Sequence Diagrams',
      icon: Database,
      // Enforce flow only in Tutorial mode
      isLocked: isTutorialMode && (tutorialStep === 'USE_CASE' || tutorialStep === 'DESCRIPTION'),
      isActive: !isTutorialMode || tutorialStep === 'SEQUENCE'
    },
  ];

  const handleSectionTabChange = (sectionId) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.isLocked) {
      errorToast('Please complete the previous step first.');
      return;
    }
    setActiveSection(sectionId);
  };

  const handleProcess = async () => {
    if (activeSection === 'usecase') {
      if (isTutorialMode) {
        const validation = validateUseCaseDiagramTutorial(
          model.diagram?.nodes || [],
          model.diagram?.edges || [],
          systemName
        );

        if (!validation.isValid) {
          errorToast(validation.message);
          return;
        }
        successToast('Diagram validated! Moving to Use Case Descriptions.');
        dispatch(setTutorialStep('DESCRIPTION'));
      }
      setActiveSection('description');
    } else if (activeSection === 'description') {
      if (isTutorialMode) {
        const useCaseNodes = model.diagram?.nodes?.filter(n => n.type === 'usecase' || n.type === 'useCase') || [];
        const validation = validateAllDescriptionsTutorial(
          useCaseNodes,
          model.descriptions || {}
        );

        if (!validation.isValid) {
          errorToast(validation.message);
          return;
        }
        successToast('Descriptions completed! Moving to System Sequence Diagram.');
        dispatch(setTutorialStep('SEQUENCE'));
      }
      setActiveSection('ssd');
    } else if (activeSection === 'ssd') {
      if (isTutorialMode) {
        const validation = validateAllSSDsTutorial(model);
        if (!validation.isValid) {
          errorToast(validation.message);
          return;
        }
        successToast('All steps completed! Your UML model is ready for review.');
      } else if (isStudentWork) {
        // Check if already submitted
        const currentSub = Object.values(assignments).find(s => s.assignmentId === assignmentId && s.id !== assignmentId);
        // Allow resubmission before the deadline. Lock only after dueDate (handled by backend too).
        const dueDate = assignmentDetails?.dueDate ? new Date(assignmentDetails.dueDate) : null;
        const isPastDeadline = dueDate ? new Date() > dueDate : false;
        if (isPastDeadline) {
          errorToast('Deadline has passed. You can no longer resubmit this assignment.');
          return;
        }
        setIsSubmitModalOpen(true);
      } else {
        successToast('All steps completed in Development Mode.');
      }
    }
  };

  const handleFinalSubmit = async ({ description }) => {
    try {
      await dispatch(submitAssignmentData({
        assignmentId: assignmentId,
        data: {
          status: 'submitted',
          description,
          diagramData: model // Send the whole model: diagrams, descriptions, etc.
        }
      })).unwrap();

      successToast('Assignment submitted successfully!');
      setIsSubmitModalOpen(false);
      navigate('/student/dashboard');
    } catch (error) {
      errorToast('Submission failed: ' + error);
    }
  };

  const handleBack = () => {
    if (activeSection === 'description') {
      setActiveSection('usecase');
    } else if (activeSection === 'ssd') {
      setActiveSection('description');
    } else if (activeSection === 'usecase') {
      setIsExitConfirmOpen(true);
    }
  };

  const handleConfirmExit = () => {
    navigate(isStudentWork ? `/student/assignments/${assignmentId}` : '/student/dashboard');
  };

  if (!model) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-bold">Initializing Workspace...</p>
        </div>
      </div>
    );
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
            <div className="w-80 border-l border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-900/10 flex flex-col h-full animate-in slide-in-from-right duration-500">
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
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-white dark:bg-gray-900">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 max-h-48 md:max-h-none border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0 overflow-y-auto">
        {/* Tutorial Mode Toggle (Enabled ONLY if Approved) */}
        {currentSubmission?.tutorialApproved && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-indigo-50/30 dark:bg-indigo-900/10">
            <button
              onClick={() => {
                const newMode = currentMode === 'tutorial' ? 'development' : 'tutorial';
                dispatch(setMode(newMode));
                // Optional: clear state related to the other mode if needed
                dispatch(clearModeState(currentMode));
              }}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm animate-in fade-in slide-in-from-top-2 duration-300 ${currentMode === 'tutorial'
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
                }`}
            >
              {currentMode === 'tutorial' ? <Database size={16} /> : <BookOpen size={16} />}
              {currentMode === 'tutorial' ? 'Switch to Development Mode' : 'Switch to Tutorial Mode'}
            </button>
          </div>
        )}

        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-sm font-black uppercase tracking-tighter text-indigo-600 dark:text-indigo-400">
            {currentMode === 'tutorial' ? 'Tutorial Steps' : 'Editor Sections'}
          </h1>
        </div>

        <nav className="flex-1 p-2 flex overflow-x-auto md:flex-col md:space-y-1 gap-2 md:gap-0">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionTabChange(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === section.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                } ${isTutorialMode && section.isLocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {currentMode === 'development' && (!isStudentWork || isGraded || currentSubmission?.tutorialApproved) && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-800">
            <button
              id="checking-toggle-btn"
              onClick={toggleCheckingMode}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${isCheckingActive
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              <span>{isGraded || currentSubmission?.tutorialApproved ? 'Teacher Report' : 'Checking Mode'}</span>
              {isCheckingActive && <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded-full">Visible</span>}
            </button>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                disabled={!model}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-[10px] font-bold rounded-lg transition-colors"
              >
                <Download size={12} /> Export Model
                <ChevronDown size={10} className={`transition-transform ${showExportDropdown ? 'rotate-180' : ''}`} />
              </button>
              {showExportDropdown && (
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {['png', 'jpeg', 'svg', 'pdf'].map(ext => (
                      <button
                        key={ext}
                        onClick={() => {
                          setExportModal({ isOpen: true, format: ext });
                          setShowExportDropdown(false);
                        }}
                        className="text-left px-2 py-1 text-[10px] hover:bg-gray-100 dark:hover:bg-gray-700 rounded border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 font-bold"
                      >
                        {ext.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                  <button
                    onClick={async () => {
                      setIsExporting(true);
                      // Give browser a short moment to start rendering, utility will handle fine-grained waiting
                      await new Promise(resolve => setTimeout(resolve, 300));

                      try {
                        const studentName = model?.studentName ||
                          (user?.firstName ? `${user.firstName} ${user.lastName || ''}` : '') ||
                          (user?.first_name ? `${user.first_name} ${user.last_name || ''}` : '') ||
                          user?.name || user?.fullName || currentSubmission?.studentName || '';

                        const teacherName = model?.teacherName ||
                          assignmentDetails?.teacher_name || assignmentDetails?.teacherName ||
                          assignmentDetails?.teacher?.name || assignmentDetails?.createdBy?.name || '';

                        const className = model?.className ||
                          assignmentDetails?.class_name || assignmentDetails?.className ||
                          assignmentDetails?.class?.name || assignmentDetails?.course || '';

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
                    className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded font-black text-indigo-600 dark:text-indigo-400 flex flex-col gap-0.5"
                  >
                    <div className="flex items-center gap-1.5 font-black">
                      <File size={10} />
                      <span>Export Complete Model</span>
                    </div>
                    <span className="text-[8px] opacity-60 font-medium">Include Diagrams, Description & Reports</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          {saveError && (
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold border border-red-100 dark:border-red-800/50">
              {saveError}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full border-l border-gray-100 dark:border-gray-800">
        {/* Assignment Header (Student Only) */}
        {isStudentWork && model && (
          <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-all flex flex-col">
            <div className="px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center text-xl shadow-sm">
                  📝
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">{model.title || assignmentDetails?.title}</h2>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded uppercase tracking-widest">Assignment</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium truncate max-w-md">{model.description || assignmentDetails?.description}</p>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 sm:gap-6 w-full sm:w-auto">
                {assignmentDetails?.deadline && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Deadline</p>
                    <p className="text-xs font-bold text-red-500">
                      {new Date(assignmentDetails.deadline).toLocaleString()}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${isInstructionsOpen
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                    }`}
                >
                  <BookOpen size={16} />
                  {isInstructionsOpen ? 'Hide Brief' : 'View Brief'}
                </button>
              </div>
            </div>

            {/* Expandable Brief Content */}
            {isInstructionsOpen && (
              <div className="px-8 pb-6 animate-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-50 dark:border-gray-800">
                  <div className="md:col-span-2 space-y-4">
                    {/* Instructions/Text Content */}
                    <div>
                      <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <FileText size={12} /> Assignment Brief & Instructions
                      </h3>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-h-60 overflow-y-auto font-medium">
                        {model.textContent ? (
                          <div className="whitespace-pre-wrap">{model.textContent}</div>
                        ) : model.instructions ? (
                          <div className="whitespace-pre-wrap">{model.instructions}</div>
                        ) : (
                          <p className="italic text-gray-400">Please refer to the description or attached resources for instructions.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Resources */}
                    <div>
                      <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Database size={12} /> Reference Materials
                      </h3>
                      <div className="space-y-2">
                        {model.assignmentFileUrl ? (
                          <a
                            href={model.assignmentFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                <File size={16} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                                {model.assignmentFileName || 'Resource File'}
                              </span>
                            </div>
                            <Download size={14} className="text-gray-400 group-hover:text-indigo-600" />
                          </a>
                        ) : (
                          <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">No extra files</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-1 relative overflow-hidden h-full">
          <div className="h-full flex flex-col bg-slate-50 dark:bg-gray-950">
            <div className={`flex-1 relative overflow-auto transition-all duration-700 ${isTutorialMode && !sections.find(s => s.id === activeSection)?.isActive ? 'grayscale opacity-70 pointer-events-none' : ''}`}>
              {renderContent()}
              {isTutorialMode && !sections.find(s => s.id === activeSection)?.isActive ? (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-50/10 backdrop-blur-[1px]">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center gap-3">
                    <Lock size={48} className="text-gray-300" />
                    <p className="font-black text-gray-800 dark:text-gray-100">Step Locked</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center max-w-[200px]">
                      {sections.find(s => s.id === activeSection)?.isLocked ? "Please complete the previous step first." : "This step is already completed."}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            {/* Professional Navigation Bar */}
            <div className="p-3 sm:p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] bg-slate-50/50 backdrop-blur-sm overflow-x-auto">
              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  onClick={handleBack}
                  className="px-8 py-3 bg-[#6B7280] hover:bg-gray-600 active:bg-gray-700 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-sm min-w-[140px] justify-center"
                >
                  <ArrowLeft size={20} /> Back
                </button>

                {/* Save button only in Development Mode before submission */}
                {!isTutorialActive && !isSubmitted && (!isStudentWork || (!currentSubmission?.status || !['submitted', 'graded', 'reviewed', 'completed'].includes(currentSubmission?.status?.toLowerCase()))) && (
                  <button
                    onClick={handleSave}
                    disabled={isSubmitting || isSaving}
                    className="px-8 py-3 bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center gap-2 shadow-sm min-w-[140px] justify-center"
                  >
                    {isSubmitting || isSaving ? 'Saving...' : 'Save'}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start">
                {/* Student Workflow Controls - Show Submit if it's not submitted/graded and NOT in tutorial mode */}
                {!isTutorialActive && isStudentWork && (!currentSubmission?.status || !['submitted', 'graded', 'reviewed', 'completed'].includes(currentSubmission?.status?.toLowerCase())) && !currentSubmission?.tutorialApproved && (
                  <div className="flex items-center gap-2">

                  </div>
                )}

                {/* Tutorial Mode Status / Request Toggle */}
                {isTutorialActive && (
                  <div className="px-6 py-3 bg-green-50 text-green-700 rounded-xl font-bold flex items-center gap-2 border border-green-200">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Tutorial Mode Active
                  </div>
                )}

                {!isTutorialActive && currentSubmission?.status === 'submitted' && !currentSubmission?.tutorialApproved && (
                  <button
                    onClick={handleRequestTutorial}
                    disabled={currentSubmission?.tutorialRequested}
                    className={`px-8 py-3 ${currentSubmission?.tutorialRequested ? 'bg-amber-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'} text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-sm min-w-[200px]`}
                  >
                    {currentSubmission?.tutorialRequested ? 'Waiting for Approval...' : 'Unlock Tutorial Mode'}
                  </button>
                )}
              </div>


              {/* Show 'Finish' (Tutorial) or 'Submit/Process' (Development) */}
              {isTutorialActive ? (
                <button
                  onClick={handleProcess}
                  className="px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 min-w-[180px] justify-center"
                >
                  {activeSection === 'ssd' ? <CheckCircle size={20} /> : <ArrowRight size={20} />}
                  {activeSection === 'ssd' ? "Finish Tutorial" : `Process Step ${activeSection === 'usecase' ? '1' : '2'}`}
                </button>
              ) : (
                !isSubmitted && (
                  <button
                    onClick={handleProcess}
                    disabled={(activeSection === 'ssd' && isStudentWork && isReadOnly) || isGraded}
                    className={`px-4 sm:px-12 py-3 sm:py-4 ${activeSection === 'ssd' && isStudentWork ? (isReadOnly || isGraded ? 'bg-gray-400 cursor-not-allowed opacity-70' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200') : 'bg-[#2563EB] hover:bg-blue-700 shadow-blue-200'} text-white font-black rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 min-w-[120px] sm:min-w-[180px] justify-center mt-2 sm:mt-0 w-full sm:w-auto`}
                  >
                    {activeSection === 'ssd' && isStudentWork ? (
                      <>
                        <CheckCircle size={20} />
                        {isReadOnly ? 'Editing Locked' : 'Submit Assignment'}
                      </>
                    ) : activeSection === 'ssd' ? "Finish" : "Process"}
                    <ArrowRight size={20} />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
      <SubmitAssignmentModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleFinalSubmit}
        isSubmitting={isSubmitting}
        assignmentTitle={assignmentDetails?.title || 'Assignment Submission'}
      />
      <ConfirmModal
        isOpen={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        onConfirm={handleConfirmExit}
        title="Exit Editor"
        message="Are you sure you want to exit the editor? Any unsaved changes will be lost permanently."
        confirmText="Exit Anyway"
      />

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
          <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-4 italic">Select Specific Item</h3>
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
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-left rounded-xl transition-all font-bold text-gray-800 dark:text-gray-200 border border-transparent hover:border-indigo-200"
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/60 dark:bg-gray-950/60 backdrop-blur-md">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-black text-indigo-600 uppercase tracking-widest">Preparing High-Quality Export...</p>
              <p className="text-xs text-gray-500 mt-1">Including your work and checking report</p>
              <p className="text-[10px] text-gray-400 mt-4 italic">Sequential rendering in progress (Diagrams → Descriptions → SSDs)</p>
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
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModeAwareEditor;

