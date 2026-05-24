import React, { useEffect, useMemo, useState } from 'react';
import { resolveResourceUrl } from '../../utils/urlHelper';

import { useNavigate, useParams } from 'react-router-dom';

import { ArrowLeft, Mail, Clock, BookOpen, User, Plus, Minus, CheckCircle, FileText, Database, Download, X, Eye } from 'lucide-react';

import { loadSubmissionLogic, runSubmissionCheckLogic, saveSubmissionFeedbackLogic } from './submissionLogic';

import { useAppSelector, useAppDispatch } from '../../app/hooks';

import { selectUser } from '../auth';

import { approveTutorialMode } from '../../features/submissions';

import { UseCaseDiagramEditor } from '../diagram';

import { UseCaseDescriptionEditor } from '../description';

import { SSDDiagramEditor } from '../ssd';

import { CheckingModePanel } from '../checking';
import { useSuccessToast } from '../../components/ui/Toast';

const SubmissionDetail = () => {
  const successToast = useSuccessToast();
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isStudent = user?.role === 'STUDENT';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState(null);
  const [checkReport, setCheckReport] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [marks, setMarks] = useState('');
  const [savingRemarks, setSavingRemarks] = useState(false);
  const [localUseCaseHighlights, setLocalUseCaseHighlights] = useState([]);
  const [localSSDHighlights, setLocalSSDHighlights] = useState([]);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setIsLoading(true);
        setError('');
        const { submission: data, remarks: initialRemarks, validationReport } = await loadSubmissionLogic(submissionId);

        if (!cancelled) {
          setSubmission(data);
          setRemarks(initialRemarks);
          setMarks(data?.evaluation?.totalScore !== undefined && data?.evaluation?.totalScore !== null ? data.evaluation.totalScore : '');
          if (validationReport) {
            setCheckReport(validationReport);

            // Pre-fill highlights for student view
            const ucHighlights = (validationReport.useCaseDiagram?.highlights || []).map(h => ({
              elementId: h.elementId,
              message: h.message,
              type: h.type
            }));
            const sdHighlights = (validationReport.systemSequence?.highlights || []).map(h => ({
              elementId: h.elementId,
              message: h.message,
              type: h.type
            }));

            setLocalUseCaseHighlights(ucHighlights);
            setLocalSSDHighlights(sdHighlights);
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load submission');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    if (submissionId) run();
    return () => { cancelled = true; };
  }, [submissionId]);

  const handleRunCheck = async ({ section, targetId } = {}) => {
    if (!submissionId) return;
    try {
      setIsChecking(true);

      const report = await runSubmissionCheckLogic(submissionId, { section, targetId });

      setCheckReport(prev => {
        const updatedIssues = report.issues || [];
        const prevIssues = prev?.issues || [];

        // Use the report from server as base (it already merged on backend)
        // The backend now returns a comprehensive report, so we just use that.
        // No need to merge issues or set section-specific reports manually here.
        return report;
      });

      return report;
    } catch (e) {
      setError(e?.message || 'Failed to run checking');
      return null;
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveRemarks = async (isDraft = false) => {
    if (!submissionId) return;
    try {
      setSavingRemarks(true);
      const updatedData = await saveSubmissionFeedbackLogic(submissionId, {
        checkReport,
        remarks,
        marks: marks === '' ? 0 : marks,
        currentSubmission: submission,
        isDraft
      });

      setSubmission((prev) => prev ? ({ ...prev, ...updatedData }) : prev);
      if (updatedData.validationReport) {
        setCheckReport(updatedData.validationReport);
      }

      if (isDraft) {
        successToast("Grade, remarks and diagram reports have been saved successfully.");
      }
    } catch (e) {
      setError(e?.message || 'Failed to save remarks');
    } finally {
      setSavingRemarks(false);
    }
  };

  const handleLocalReportUpdate = (section, newReport, targetId = null) => {
    setCheckReport(prev => {
      const next = prev ? { ...prev } : {};

      // If we have a previous report, merge the issues
      if (prev && prev.issues && newReport && newReport.issues) {
        const oldIssues = prev.issues;
        const newIssues = newReport.issues;

        // Filter out old issues for this specific section/target
        const filteredOld = oldIssues.filter(i => {
          const isSameSection = (i.type === section || i.location === section ||
            (section === 'ssd' && i.type === 'consistency') ||
            (section === 'usecase' && (i.location === 'diagram' || i.location === 'usecase' || i.type === 'diagram')));
          const isSameTarget = targetId ? (i.relatedId === targetId || i.context?.useCaseId === targetId) : true;
          return !(isSameSection && isSameTarget);
        });

        const mergedIssues = [...filteredOld, ...newIssues];
        const mergedReport = { ...newReport, issues: mergedIssues };

        if (section === 'usecase') next.useCaseDiagramReport = mergedReport;
        if (section === 'description') next.useCaseDescriptionReport = mergedReport;
        if (section === 'ssd') next.sequenceDiagramReport = mergedReport;
        next.issues = mergedIssues;
      } else {
        // Fallback for first run
        if (section === 'usecase') next.useCaseDiagramReport = newReport;
        if (section === 'description') next.useCaseDescriptionReport = newReport;
        if (section === 'ssd') next.sequenceDiagramReport = newReport;
        if (newReport?.issues) next.issues = newReport.issues;
      }

      return next;
    });
  }

  const studentName = useMemo(() => {
    const n = submission?.student?.name;
    const email = submission?.student?.email;
    return n || (email ? email.split('@')[0] : 'Student');
  }, [submission]);

  const modelPayload = useMemo(() => {
    const safeParse = (val, defaultValue = {}) => {
      if (!val) return defaultValue;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch { return defaultValue; }
    };

    const artifacts = submission?.artifacts || {};
    const diagram = safeParse(artifacts.useCaseDiagram || submission?.useCaseDiagram || submission?.diagramData, { nodes: [], edges: [] });
    const descriptions = safeParse(artifacts.useCaseDescription || submission?.useCaseDescription || submission?.descriptions, {});
    const ssds = safeParse(artifacts.systemSequenceDiagram || submission?.systemSequenceDiagram || submission?.ssdData, {});

    return {
      id: `submission-${submissionId}`,
      diagram,
      descriptions,
      ssds
    };
  }, [submissionId, submission]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-3">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted font-bold font-body uppercase tracking-widest text-xs">Loading submission...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-transparent p-10">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted hover:text-accent font-bold font-body transition-colors mb-8"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="bg-white rounded-lg border border-red-100 p-10">
            <p className="text-status-red font-extrabold font-heading uppercase tracking-widest text-xs mb-2">Error</p>
            <p className="text-gray-700 font-bold font-body">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-transparent p-10">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted hover:text-accent font-bold font-body transition-colors mb-8"
          >
            <ArrowLeft size={18} /> Back
          </button>
          <div className="bg-white rounded-lg border border-black/5 p-10 text-center text-gray-400 font-bold font-body italic">
            Submission not found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent p-6 md:p-10">
      <div className="max-w-[98%] 2xl:max-w-[1800px] w-full mx-auto space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted hover:text-accent font-bold font-body transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </button>

        {/* Header */}
        <div className="bg-white rounded-lg border border-black/5 shadow-card p-10">
          <div className="flex flex-col md:flex-row md:items-center gap-8 justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl flex items-center justify-center font-extrabold font-heading text-2xl shadow-hover shadow-accent/20">
                {studentName?.charAt(0)?.toUpperCase() || <User size={24} />}
              </div>
              <div>
                <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em]">Student</p>
                <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">{studentName}</h1>
                <div className="mt-2 flex items-center gap-2 text-sm text-muted font-bold font-body">
                  <Mail size={16} className="text-gray-300" />
                  {submission.student?.email || '—'}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted font-bold font-body">
                <BookOpen size={16} className="text-gray-300" />
                <span className="text-ink font-extrabold font-heading">{submission.assignment?.title || 'Assignment'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted font-bold font-body">
                <Clock size={16} className="text-gray-300" />
                Submitted: <span className="text-ink">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : '—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* 'Hide Brief' button removed per user request */}

              {/* Score Display For Student/Teacher */}
              <div className="bg-accent/10 px-6 py-4 rounded-3xl border border-accent/10/50">
                <p className="text-[10px] font-extrabold font-heading text-indigo-400 uppercase tracking-widest mb-1 text-center">Total Marks</p>
                <div className="flex items-baseline gap-1 justify-center">
                  <span className="text-3xl font-extrabold font-heading text-accent">
                    {submission.assignment?.maxScore ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Static Expanded Brief Content */}
          <div className="mt-8 pt-8 border-t border-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-[10px] font-extrabold font-heading text-accent uppercase tracking-widest mb-2 flex items-center gap-2">
                    <FileText size={12} /> Assignment Instructions
                  </h3>
                  <div className="bg-surface-3 rounded-lg p-8 text-sm text-gray-700 leading-relaxed max-h-80 overflow-y-auto font-medium border border-black/5">
                    {submission.assignment?.textContent ? (
                      <div className="whitespace-pre-wrap">{submission.assignment.textContent}</div>
                    ) : submission.assignment?.instructions ? (
                      <div className="whitespace-pre-wrap">{submission.assignment.instructions}</div>
                    ) : (
                      <p className="italic text-gray-400">No detailed instructions available.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-[10px] font-extrabold font-heading text-accent uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Database size={12} /> Reference Materials
                  </h3>
                  <div className="space-y-2">
                    {submission.assignment?.assignmentFileUrl ? (
                      <div className="flex flex-col gap-2">
                        <div
                          className="flex items-center justify-between p-4 bg-white border border-black/10 rounded-lg hover:border-indigo-300 hover:bg-accent/10/50 transition-all group shadow-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                              <FileText size={16} />
                            </div>
                            <span className="text-xs font-bold font-body text-gray-700 truncate max-w-[120px]">
                              {submission.assignment.assignmentFileName || 'Resource File'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setPreviewFile({
                                url: submission.assignment.assignmentFileUrl,
                                name: submission.assignment.assignmentFileName || 'Resource File',
                                type: submission.assignment.assignmentFileType
                              })}
                              className="p-2 hover:bg-accent/20 rounded-lg text-accent transition-colors"
                              title="View Resource"
                            >
                              <Eye size={16} />
                            </button>
                            <a
                              href={resolveResourceUrl(submission.assignment.assignmentFileUrl)}
                              download={submission.assignment.assignmentFileName || 'Resource'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-accent/20 rounded-lg text-gray-400 hover:text-accent transition-colors"
                              title="Download Resource"
                            >
                              <Download size={16} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-surface-3 rounded-lg border border-dashed border-black/10 ">
                        <p className="text-[10px] font-bold font-body text-gray-400 uppercase">No extra files</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Teacher Feedback & Remarks */}
        <div className="bg-white rounded-lg border border-black/5 shadow-card p-10 space-y-8 animate-in slide-in-from-bottom duration-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Teacher</p>
              <h2 className="text-2xl font-extrabold font-heading text-ink tracking-tight">Remarks & Feedback</h2>
            </div>

            {!isStudent && (
              <div className="flex items-center gap-3">
                {submission?.tutorialRequested && !submission?.tutorialApproved && (
                  <button
                    onClick={() => dispatch(approveTutorialMode(submissionId))}
                    className="flex items-center gap-3 px-10 py-4 bg-amber-500 text-white font-extrabold font-heading rounded-[1.25rem] hover:bg-amber-600 shadow-xl shadow-amber-100 transition-all active:scale-95 text-sm uppercase tracking-widest mr-4"
                  >
                    <CheckCircle size={18} />
                    Approve Tutorial
                  </button>
                )}
                <div className="flex flex-col items-end mr-6">
                  <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Assigned Marks</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-surface-3 rounded-lg border border-black/5 p-1">
                      <button
                        onClick={() => setMarks(m => Math.max(0, (Number(m) || 0) - 1))}
                        className="p-2 hover:bg-white hover:shadow-card rounded-xl text-gray-400 hover:text-accent transition-all active:scale-90"
                        title="Decrease marks"
                      >
                        <Minus size={16} strokeWidth={3} />
                      </button>
                      <input
                        type="text"
                        value={marks}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setMarks('');
                          } else {
                            const numValue = parseInt(val);
                            if (!isNaN(numValue)) {
                              const max = submission.assignment?.maxScore ?? undefined;
                              setMarks(Math.min(max, Math.max(0, numValue)));
                            }
                          }
                        }}
                        placeholder=""
                        className="w-16 bg-transparent border-none font-extrabold font-heading text-accent focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => setMarks(m => Math.min(submission.assignment?.maxScore ?? Infinity, (Number(m) || 0) + 1))}
                        className="p-2 hover:bg-white hover:shadow-card rounded-xl text-gray-400 hover:text-accent transition-all active:scale-90"
                        title="Increase marks"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </div>
                    <span className="font-extrabold font-heading text-gray-300 text-lg">/ {submission.assignment?.maxScore ?? '—'}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleSaveRemarks(true)}
                  disabled={savingRemarks}
                  className="flex items-center gap-3 px-10 py-4 bg-accent text-white font-extrabold font-heading rounded-[1.25rem] hover:bg-indigo-700 shadow-xl shadow-accent/20 transition-all active:scale-95 text-sm uppercase tracking-widest disabled:opacity-50"
                >
                  {savingRemarks ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save Draft
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isStudent}
            placeholder={isStudent ? "No feedback provided." : "Add feedback for student..."}
            rows={5}
            className={`w-full px-6 py-4 bg-surface-3 border border-black/10 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 flex-1 transition-all text-ink font-medium ${isStudent ? 'opacity-70 cursor-not-allowed border-transparent bg-surface-3/50' : 'bg-white'}`}
          />
        </div>

        {/* Section-wise: Diagram (left) + Checking Panel (right) */}
        <div className="grid grid-cols-1 gap-10">
          {/* Use Case Diagram */}
          <div className="bg-white rounded-lg border border-black/5 shadow-card overflow-hidden">
            <div className="p-8 border-b border-gray-50 bg-surface-3/30">
              <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em]">Section</p>
              <h3 className="text-xl font-extrabold font-heading text-ink">Use Case Diagram</h3>
            </div>
            <div className="flex flex-col lg:flex-row w-full gap-8 h-auto lg:h-[700px] p-8">
              <div className="w-full lg:w-[70%] lg:flex-none min-w-0 h-[500px] lg:h-full border border-slate-100 rounded-lg overflow-hidden bg-slate-50/30 shadow-inner">
                <UseCaseDiagramEditor
                  key={submission?.id || 'empty-uc'}
                  initialData={modelPayload.diagram}
                  isReadOnly
                  highlights={localUseCaseHighlights}
                />
              </div>
              <div className="w-full lg:w-[30%] min-w-[320px] flex-shrink-0 animate-in slide-in-from-right-4 duration-500 flex flex-col h-[500px] lg:h-full">
                <div className="flex-1 overflow-hidden w-full rounded-lg border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-slate-50/50">
                  <CheckingModePanel
                    activeSection="usecase"
                    modelOverride={modelPayload}
                    reportOverride={checkReport?.useCaseDiagramReport || checkReport?.useCaseDiagram || checkReport}
                    onRunChecker={!isStudent ? handleRunCheck : undefined}
                    onLocalReport={!isStudent ? ((r) => {
                      const h = (r?.issues || []).filter(i => i.context?.useCaseId).map(i => ({
                        elementId: i.context.useCaseId,
                        message: i.message,
                        type: i.severity === 'error' ? 'error' : 'warning'
                      }));
                      setLocalUseCaseHighlights(h);
                      handleLocalReportUpdate('usecase', r);
                    }) : undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Use Case Description */}
          <div className="mt-10">
            <UseCaseDescriptionEditor
              key={submission?.id || 'empty-desc'}
              assignmentId={submissionId}
              isReadOnly
              isCheckingActive={true}
              reportOverride={checkReport?.useCaseDescriptionReport || checkReport?.useCaseDescription || checkReport}
              onRunChecker={!isStudent ? handleRunCheck : undefined}
              onLocalReport={!isStudent ? ((r, tid) => handleLocalReportUpdate('description', r, tid)) : undefined}
              modelOverride={modelPayload}
            />
          </div>

          {/* System Sequence Diagram */}
          <div className="mt-10">
            <SSDDiagramEditor
              key={submission?.id || 'empty-ssd'}
              assignmentId={submissionId}
              isReadOnly
              isCheckingActive={true}
              reportOverride={checkReport?.sequenceDiagramReport || checkReport?.systemSequence || checkReport}
              onRunChecker={!isStudent ? handleRunCheck : undefined}
              modelOverride={modelPayload}
              highlights={localSSDHighlights}
              onLocalReport={!isStudent ? ((r, tid) => {
                const h = (r?.issues || []).filter(i => i.context?.useCaseId).map(i => ({
                  elementId: i.context.useCaseId,
                  message: i.message,
                  type: i.severity === 'error' ? 'error' : 'warning'
                }));
                setLocalSSDHighlights(prev => {
                  const filtered = (prev || []).filter(item => tid ? item.elementId !== tid : false);
                  return [...filtered, ...h];
                });
                handleLocalReportUpdate('ssd', r, tid);
              }) : undefined}
            />
          </div>
        </div>
      </div>
      {/* Resource Preview Modal (Shared Logic) */}
      {previewFile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-hover overflow-hidden relative">
            <div className="p-6 border-b border-black/5 flex justify-between items-center bg-white sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold font-heading text-ink leading-none">{previewFile.name}</h3>
                  <p className="text-[10px] font-bold font-body text-gray-400 uppercase tracking-widest mt-1">Resource Preview</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={resolveResourceUrl(previewFile.url)}
                  download={previewFile.name}
                  className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-xl font-bold font-body text-xs hover:bg-accent/20 transition-all"
                >
                  <Download size={16} /> Download
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-surface-3 rounded-full transition-colors text-gray-400 hover:text-muted"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-surface-3/50 p-8 flex items-center justify-center">
              {previewFile.url && (previewFile.type?.startsWith('image/') ||
                ['png', 'jpg', 'jpeg', 'gif', 'webp'].some(ext => previewFile.url.toLowerCase().endsWith('.' + ext)) ||
                ['png', 'jpg', 'jpeg', 'gif', 'webp'].some(ext => previewFile.name.toLowerCase().endsWith('.' + ext))) ? (
                <img
                  src={resolveResourceUrl(previewFile.url)}
                  alt={previewFile.name}
                  className="max-w-full h-auto object-contain rounded-lg shadow-hover border border-white"
                />
              ) : (previewFile.type === 'application/pdf' || previewFile.url.toLowerCase().endsWith('.pdf') || previewFile.name.toLowerCase().endsWith('.pdf')) ? (
                <iframe
                  src={resolveResourceUrl(previewFile.url)}
                  className="w-full h-[70vh] rounded-lg border border-black/5 shadow-hover"
                  title="PDF Preview"
                />
              ) : (
                <div className="text-center p-20">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 text-gray-300 shadow-card border border-gray-50">
                    <FileText size={32} />
                  </div>
                  <p className="text-gray-400 font-bold font-body">No interactive preview for this file type.</p>
                  <button
                    onClick={() => window.open(resolveResourceUrl(previewFile.url), '_blank')}
                    className="mt-4 px-6 py-2 bg-accent text-white font-extrabold font-heading rounded-xl text-[10px] uppercase tracking-widest"
                  >
                    Open in New Tab
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionDetail;
