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
  X,
  Eye
} from 'lucide-react';

const StepSelectionModal = ({ isOpen, onClose, onSelect, format }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-gray-900 italic tracking-tight">Select Export Step</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
              className="w-full p-5 bg-gray-50 border-2 border-transparent hover:border-indigo-500/30 hover:bg-indigo-50/30 rounded-2xl text-left transition-all flex items-center justify-between group"
            >
              <div>
                <span className="block text-[10px] font-black uppercase text-indigo-600 mb-0.5 tracking-widest">{step.label}</span>
                <span className="block font-black text-gray-800 ">{step.desc}</span>
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
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }

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
  let effectivelyReadOnly = isReadOnly;
  if (isTutorialActive) {
    effectivelyReadOnly = false; // Tutorial mode is always editable for active tutorials
  } else if (isStudentWork && isSubmitted) {
    effectivelyReadOnly = true;  // Strictly enforce lock in development mode after submission
  }

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
        const step2 = validateAllDescriptionsTutorial(
          useCaseNodes,
          model.descriptions || {},
          model.diagram?.nodes || [],
          model.diagram?.edges || []
        );

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
          model.descriptions || {},
          model.diagram?.nodes || [],
          model.diagram?.edges || []
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
      <div className="h-screen flex items-center justify-center bg-white ">
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
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-row min-h-screen bg-slate-50 relative min-w-[1280px]">
      {/* Sidebar Navigation */}
      <div className="w-64 sticky top-0 h-screen border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto">
        {/* Tutorial Mode Toggle (Enabled ONLY if Approved) */}
        {currentSubmission?.tutorialApproved && (
          <div className="p-4 border-b border-gray-200 bg-indigo-50/30 ">
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

        <div className="p-4 border-b border-gray-200 ">
          <h1 className="text-sm font-black uppercase tracking-tighter text-indigo-600 ">
            {currentMode === 'tutorial' ? 'Tutorial Steps' : 'Editor Sections'}
          </h1>
        </div>

        <nav className="flex-1 p-2 flex flex-col space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => handleSectionTabChange(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === section.id
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 '
                } ${isTutorialMode && section.isLocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {currentMode === 'development' && (!isStudentWork || isGraded || currentSubmission?.tutorialApproved) && (
          <div className="p-2 border-t border-gray-200 ">
            <button
              id="checking-toggle-btn"
              onClick={toggleCheckingMode}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${isCheckingActive
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 '
                }`}
            >
              <span>{isGraded || currentSubmission?.tutorialApproved ? 'Teacher Report' : 'Checking Mode'}</span>
              {isCheckingActive && <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded-full">Visible</span>}
            </button>
          </div>
        )}

        <div className="p-4 border-t border-gray-200 space-y-3">
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
                <div className="absolute bottom-full mb-2 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50">
                  <div className="grid grid-cols-2 gap-1 mb-2">
                    {['png', 'jpeg', 'svg', 'pdf'].map(ext => (
                      <button
                        key={ext}
                        onClick={() => {
                          setExportModal({ isOpen: true, format: ext });
                          setShowExportDropdown(false);
                        }}
                        className="text-left px-2 py-1 text-[10px] hover:bg-gray-100 rounded border border-gray-100 bg-gray-50/50 font-bold"
                      >
                        {ext.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 my-1"></div>
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
                    className="w-full text-left px-2 py-1.5 text-[10px] hover:bg-indigo-50 rounded font-black text-indigo-600 flex flex-col gap-0.5"
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
            <div className="p-2 rounded-lg bg-red-50 text-red-600 text-[10px] font-bold border border-red-100 ">
              {saveError}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 border-l border-gray-100 pb-32">
        {/* Assignment Header (Student Only) */}
        {isStudentWork && model && (
          <div className="bg-white border-b border-gray-100 flex flex-col">
            <div className="px-8 py-6 flex flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-sm">
                  📝
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-gray-900 ">{model.title || assignmentDetails?.title}</h2>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded uppercase tracking-widest">Assignment</span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium truncate max-w-md">{model.description || assignmentDetails?.description}</p>
                </div>
              </div>

              <div className="flex flex-nowrap items-center gap-6 w-auto">
                {assignmentDetails?.deadline && (
                  <div className="text-right block">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Deadline</p>
                    <p className="text-xs font-bold text-red-500">
                      {new Date(assignmentDetails.deadline).toLocaleString()}
                    </p>
                  </div>
                )}
                {/* Hide Brief button removed to adhere to natural scrolling / static layout removal */}
              </div>
            </div>

            {/* Expandable Brief Content always visible now */}
            <div className="px-8 pb-8">
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-50 ">
                <div className="col-span-2 space-y-4">
                  {/* Instructions/Text Content */}
                  <div>
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <FileText size={12} /> Assignment Instructions
                    </h3>
                    <div className="bg-gray-50 rounded-2xl p-5 text-sm text-gray-700 leading-relaxed max-h-60 overflow-y-auto font-medium">
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
                        <div className="flex flex-col gap-2">
                          <div
                            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                <File size={16} />
                              </div>
                              <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">
                                {model.assignmentFileName || 'Resource File'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPreviewFile({
                                  url: model.assignmentFileUrl,
                                  name: model.assignmentFileName || 'Resource File',
                                  type: model.assignmentFileType
                                })}
                                className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                                title="View Resource"
                              >
                                <Eye size={16} />
                              </button>
                              <a
                                href={resolveResourceUrl(model.assignmentFileUrl)}
                                download={model.assignmentFileName || 'Resource'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-indigo-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                                title="Download Resource"
                              >
                                <Download size={16} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 ">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">No extra files</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-16 px-12 py-12 bg-slate-50">

          {/* Section 1: Use Case Diagram */}
          <div id="section-usecase" className={`flex flex-col ${isTutorialMode && !sections[0].isActive ? 'grayscale opacity-70 pointer-events-none' : ''}`}>
            <h3 className="text-2xl font-black text-indigo-600 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">1</span>
              Use Case Diagram
            </h3>
            <div className="max-w-[1300px] w-full mx-auto">
              {!isCheckingActive ? (
                <div className="h-[700px] border border-gray-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-gray-100/50">
                  <UseCaseDiagramEditor key={effectivelyReadOnly ? 'read-only' : 'editable'} assignmentId={model.id} initialData={model.diagram} isReadOnly={effectivelyReadOnly} />
                </div>
              ) : (
                <div className="flex flex-row gap-6">
                  <div className="flex-1 min-w-0 h-[700px] border border-gray-200 rounded-[2.5rem] overflow-hidden bg-white shadow-xl shadow-gray-100/50">
                    <UseCaseDiagramEditor key={effectivelyReadOnly ? 'read-only' : 'editable'} assignmentId={model.id} initialData={model.diagram} isReadOnly={effectivelyReadOnly} />
                  </div>
                  <div className="w-96 shrink-0 flex flex-col h-[700px] rounded-[2.5rem] overflow-hidden border border-gray-200 shadow-xl shadow-gray-100/50 bg-white">
                    <CheckingModePanel
                      activeSection="usecase"
                      reportOverride={isGraded || currentSubmission?.tutorialApproved || isSubmitted ? currentSubmission?.fullReport : null}
                      onRunChecker={!effectivelyReadOnly && !isStudent && currentMode === 'development' ? ((args) => dispatch(runSubmissionCheckLogic(model.id, args))) : undefined}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Use Case Descriptions */}
          <div id="section-description" className={`flex flex-col ${isTutorialMode && sections[1].isLocked ? 'grayscale opacity-70 pointer-events-none' : ''}`}>
            <h3 className="text-2xl font-black text-indigo-600 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">2</span>
              Use Case Descriptions
            </h3>
            <div className="max-w-[1300px] w-full mx-auto">
              <UseCaseDescriptionEditor
                key={effectivelyReadOnly ? 'read-only' : 'editable'}
                assignmentId={model.id}
                isReadOnly={effectivelyReadOnly}
                isCheckingActive={isCheckingActive}
                reportOverride={isGraded || currentSubmission?.tutorialApproved || isSubmitted ? currentSubmission?.fullReport : null}
              />
            </div>
            {isTutorialMode && sections[1].isLocked && (
              <div className="mt-4 p-4 bg-gray-100 rounded-xl text-center text-sm font-bold text-gray-400">Complete the Use Case Diagram step first to unlock this section.</div>
            )}
          </div>

          {/* Section 3: System Sequence Diagrams */}
          <div id="section-ssd" className={`flex flex-col ${isTutorialMode && sections[2].isLocked ? 'grayscale opacity-70 pointer-events-none' : ''}`}>
            <h3 className="text-2xl font-black text-indigo-600 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">3</span>
              System Sequence Diagrams
            </h3>
            <div className="max-w-[1300px] w-full mx-auto">
              <SSDDiagramEditor
                key={effectivelyReadOnly ? 'read-only' : 'editable'}
                assignmentId={model.id}
                isReadOnly={effectivelyReadOnly}
                isCheckingActive={isCheckingActive}
                reportOverride={isGraded || currentSubmission?.tutorialApproved || isSubmitted ? currentSubmission?.fullReport : null}
                onRunChecker={!effectivelyReadOnly && !isStudent && currentMode === 'development' ? ((args) => dispatch(runSubmissionCheckLogic(model.id, args))) : undefined}
                modelOverride={model}
              />
            </div>
            {isTutorialMode && sections[2].isLocked && (
              <div className="mt-4 p-4 bg-gray-100 rounded-xl text-center text-sm font-bold text-gray-400">Complete the Use Case Descriptions step first to unlock this section.</div>
            )}
          </div>
          {/* Bottom floating navigation removed per user request */}
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

