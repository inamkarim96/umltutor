import React, { useState } from 'react';
import { resolveResourceUrl } from '../../utils/urlHelper';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
    selectStudents
} from '../../features/classroom';
import {
    selectAllAssignments,
    fetchAllAssignments
} from '../../features/assignments';
import {
    selectSubmissions,
    gradeSubmission,
    saveValidationReport,
    runSubmissionCheck,
    approveTutorialMode
} from '../../features/submissions';
import { checkConsistency } from '../../features/checking/ConsistencyChecker';
import { ClipboardCheck, AlertTriangle, CheckCircle2, Info, ArrowLeft, BookOpen, Download, Eye, FileText, Database, X } from 'lucide-react';

const AssignmentReview = () => {
    const { titleSlug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const queryParams = new URLSearchParams(location.search);
    const studentId = queryParams.get('studentId');

    const assignments = useAppSelector(selectAllAssignments) || [];
    const submissionsArr = useAppSelector(selectSubmissions) || [];
    const students = useAppSelector(selectStudents);

    const assignment = React.useMemo(() => {
        return assignments.find(asgn =>
            asgn.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug
        );
    }, [assignments, titleSlug]);

    const id = assignment?.id;

    React.useEffect(() => {
        if (assignments.length === 0) {
            dispatch(fetchAllAssignments('TEACHER'));
        }
    }, [dispatch, assignments]);
    const student = students[studentId];
    const submission = submissionsArr.find(s => s.assignmentId === id && s.studentId === studentId);

    const [grade, setGrade] = useState(submission?.grade || '');
    const [feedback, setFeedback] = useState(submission?.feedback || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    if (!assignment || !student || !submission) {
        return (
            <div className="p-20 text-center">
                <h2 className="text-2xl font-bold font-body text-gray-400">Submission or Student not found.</h2>
            </div>
        );
    }

    const handleSaveGrade = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            setErrorMessage('');
            await dispatch(gradeSubmission({
                submissionId: submission.id,
                grade: grade, // Frontend state variable 'grade' maps to 'score' in thunk
                remarks: feedback // Frontend state variable 'feedback' maps to 'remarks' in backend
            })).unwrap();
            setIsSaving(false);
            setSuccessMessage('Grade and feedback posted successfully!');
            setTimeout(() => {
                navigate(`/teacher/assignments/${titleSlug}/submissions`);
            }, 1500);
        } catch (error) {
            setErrorMessage('Failed to save grade: ' + (error?.message || error));
            setIsSaving(false);
        }
    };

    // Sync state with submission if it changes (e.g. after backend check)
    React.useEffect(() => {
        if (submission) {
            if (submission.evaluation?.remarks || submission.remarks) {
                setFeedback(submission.evaluation?.remarks || submission.remarks);
            }
            if (submission.evaluation?.totalScore || submission.score) {
                setGrade(submission.evaluation?.totalScore || submission.score);
            }
        }
    }, [submission]);

    const handleCheckIn = async () => {
        if (!submission?.id) return;
        setIsValidating(true);
        setErrorMessage('');
        try {
            await dispatch(runSubmissionCheck(submission.id)).unwrap();
            setSuccessMessage('Automated check completed successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setErrorMessage('Failed to run automated check: ' + (error?.message || error));
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <div className="min-h-screen bg-surface-3 flex flex-col">
            {/* Top Bar */}
            <div className="bg-white border-b border-black/5 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/teacher/assignments/${titleSlug}/submissions`)}
                        className="w-10 h-10 border border-black/10 rounded-xl flex items-center justify-center hover:bg-surface-3"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="font-extrabold font-heading text-ink">Review: {student.firstName ? `${student.firstName} ${student.lastName}` : (student.name || student.email)}</h2>
                        <p className="text-xs text-gray-400 font-bold font-body">{assignment.title}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {submission?.tutorialRequested && !submission?.tutorialApproved && (
                        <button
                            onClick={async () => {
                                try {
                                    await dispatch(approveTutorialMode(submission.id)).unwrap();
                                    setSuccessMessage('Tutorial Mode approved for the student.');
                                    setTimeout(() => setSuccessMessage(''), 3000);
                                } catch (err) {
                                    setErrorMessage('Failed to approve: ' + (err?.message || err));
                                }
                            }}
                            className="px-6 py-2 bg-amber-500 text-white rounded-xl font-bold font-body shadow-hover shadow-amber-100 hover:bg-amber-600 transition-all text-sm"
                        >
                            Approve Tutorial Mode
                        </button>
                    )}
                    {submission?.tutorialApproved && (
                        <div className="px-4 py-2 bg-status-green/10 text-status-green border border-emerald-100 rounded-xl font-bold font-body text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-status-green/100 rounded-full animate-pulse"></span>
                            Tutorial Mode Enabled
                        </div>
                    )}
                    <button
                        onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
                        className={`px-4 py-2 flex items-center gap-2 rounded-xl text-xs font-extrabold font-heading uppercase tracking-wider transition-all ${isInstructionsOpen
                            ? 'bg-accent text-white shadow-hover shadow-accent/20'
                            : 'bg-accent/10 text-accent hover:bg-accent/20'
                            }`}
                    >
                        <BookOpen size={16} />
                        {isInstructionsOpen ? 'Hide Instructions' : 'View Instructions'}
                    </button>
                    <button
                        onClick={handleCheckIn}
                        disabled={isValidating}
                        className={`px-6 py-2 ${submission?.issues ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-accent/10 text-accent border border-accent/20'} rounded-xl font-bold font-body flex items-center gap-2 hover:bg-opacity-80 transition-all text-sm`}
                    >
                        {isValidating ? "Validating..." : (
                            <>
                                <ClipboardCheck size={18} />
                                {submission?.issues ? "Re-Run Backend Check" : "Run Automated Check-In"}
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleSaveGrade}
                        disabled={isSaving}
                        className="px-6 py-2 bg-accent text-white rounded-xl font-bold font-body shadow-hover shadow-accent/20 hover:bg-indigo-700 transition-all text-sm"
                    >
                        {isSaving ? "Saving..." : "Post Grade & Feedback"}
                    </button>
                </div>
            </div>

            {/* Status Messages */}
            {(errorMessage || successMessage) && (
                <div className={`px-8 py-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 border-b ${errorMessage ? 'bg-status-red/10 text-red-700 border-red-100' : 'bg-status-green/10 text-emerald-700 border-emerald-100'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100 text-status-red' : 'bg-emerald-100 text-emerald-500'}`}>
                        {errorMessage ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <p className="text-sm font-bold font-body flex-1">{errorMessage || successMessage}</p>
                </div>
            )}

            {/* Expandable Brief Content (Synced with Workspace logic) */}
            {isInstructionsOpen && (
                <div className="px-8 py-6 bg-white border-b border-black/5 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <h3 className="text-[10px] font-extrabold font-heading text-accent uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <FileText size={12} /> Assignment Instructions
                                </h3>
                                <div className="bg-surface-3 rounded-lg p-8 text-sm text-gray-700 leading-relaxed max-h-60 overflow-y-auto font-medium border border-black/5">
                                    {assignment?.textContent ? (
                                        <div className="whitespace-pre-wrap">{assignment.textContent}</div>
                                    ) : assignment?.instructions ? (
                                        <div className="whitespace-pre-wrap">{assignment.instructions}</div>
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
                                    {assignment?.assignmentFileUrl ? (
                                        <div className="flex flex-col gap-2">
                                            <div
                                                className="flex items-center justify-between p-4 bg-white border border-black/10 rounded-lg hover:border-indigo-300 hover:bg-accent/10/50 transition-all group shadow-card"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                                        <FileText size={16} />
                                                    </div>
                                                    <span className="text-xs font-bold font-body text-gray-700 truncate max-w-[120px]">
                                                        {assignment.assignmentFileName || 'Resource File'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setPreviewFile({
                                                            url: assignment.assignmentFileUrl,
                                                            name: assignment.assignmentFileName || 'Resource File',
                                                            type: assignment.assignmentFileType
                                                        })}
                                                        className="p-2 hover:bg-accent/20 rounded-lg text-accent transition-colors"
                                                        title="View Resource"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <a
                                                        href={resolveResourceUrl(assignment.assignmentFileUrl)}
                                                        download={assignment.assignmentFileName || 'Resource'}
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
            )}

            {/* Main Review Area */}
            <div className="flex-1 bg-surface-3 p-8 flex flex-col space-y-8 items-center">
                <div className="max-w-5xl w-full space-y-8">
                    {/* Model Snapshot View */}
                    <div className="bg-white rounded-3xl shadow-xl border border-black/10 flex flex-col min-h-[500px]">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                            <span className="text-xs font-extrabold font-heading text-gray-400 uppercase tracking-widest">UML Design Preview</span>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-accent/10 text-accent text-[10px] font-bold font-body rounded">USE CASE</span>
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold font-body rounded">SSD</span>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-[#fafafa] p-12">
                            <div className="text-center">
                                <div className="text-6xl mb-6 opacity-20">📐</div>
                                <h3 className="text-xl font-extrabold font-heading text-ink">Submission Content Active</h3>
                                <p className="text-gray-400 mt-2 max-w-sm">The teacher can now review diagrams and descriptions. Use 'Check-In' to run automated consistency checks.</p>
                            </div>
                        </div>
                    </div>

                    {/* Validation Report Section */}
                    {(submission?.issues || submission?.totalScore != null) && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-extrabold font-heading text-ink">Validation Report</h3>
                                {submission.totalScore != null && (
                                    <div className="flex items-center gap-4">
                                        <div className="bg-accent px-4 py-2 rounded-xl text-white">
                                            <p className="text-[10px] font-extrabold font-heading uppercase tracking-widest opacity-70">Automated Score</p>
                                            <p className="text-xl font-extrabold font-heading">{submission.totalScore}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Section Scores Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Diagram', score: submission.useCaseScore },
                                    { label: 'Description', score: submission.descriptionScore },
                                    { label: 'SSD', score: submission.ssdScore },
                                    { label: 'Consistency', score: submission.consistencyScore }
                                ].map((sec, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-lg border border-black/5 shadow-card">
                                        <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">{sec.label}</p>
                                        <p className="text-xl font-extrabold font-heading text-ink mt-1">{sec.score ?? 0}%</p>
                                    </div>
                                ))}
                            </div>

                            {submission.issues?.length > 0 ? (
                                <div className="bg-white rounded-3xl border border-black/10 overflow-hidden shadow-card">
                                    <div className="px-6 py-4 bg-surface-3 border-b border-black/5 flex justify-between items-center">
                                        <h4 className="font-bold font-body text-gray-700">Identified Issues</h4>
                                        <span className="text-[10px] font-extrabold font-heading bg-white px-2 py-1 rounded border border-black/10">{submission.issues.length} ISSUES FOUND</span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {submission.issues.map((res, rIdx) => (
                                            <div key={rIdx} className="p-6 flex gap-4">
                                                {res.severity === 'error' || res.type === 'error'
                                                    ? <AlertTriangle className="text-status-red shrink-0" size={20} />
                                                    : <Info className="text-amber-500 shrink-0" size={20} />
                                                }
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 bg-surface-3 text-muted text-[10px] font-extrabold font-heading rounded uppercase">{res.type}</span>
                                                        <p className="text-sm font-extrabold font-heading text-ink">{res.message}</p>
                                                    </div>
                                                    <p className="text-sm text-muted">{res.problem}</p>
                                                    <div className="mt-3 p-3 bg-accent/10/50 rounded-xl border border-accent/10">
                                                        <p className="text-[10px] font-extrabold font-heading text-indigo-400 uppercase mb-1">System Suggestion</p>
                                                        <p className="text-xs text-indigo-700 font-bold font-body">{res.suggestion}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                submission.totalScore != null && (
                                    <div className="bg-status-green/10 border border-emerald-100 p-8 rounded-3xl flex flex-col items-center text-center">
                                        <CheckCircle2 className="text-emerald-500 mb-4" size={48} />
                                        <h4 className="text-xl font-extrabold font-heading text-emerald-900">Perfect Consistency!</h4>
                                        <p className="text-status-green mt-2 font-medium">The Validation Engine found no errors in the diagrams or scenarios.</p>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* Grading Panel inside normal scroll flow */}
                    <div className="bg-white rounded-3xl border border-black/5 p-8 space-y-8 flex flex-col shadow-card">
                        <div className="flex-1 space-y-8">
                            <div>
                                <h3 className="text-lg font-extrabold font-heading text-ink mb-6">Grading & Remarks</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold font-body text-gray-400 uppercase mb-2">Final Score (Points / 100)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={grade}
                                            onChange={e => setGrade(e.target.value)}
                                            placeholder="e.g. 85"
                                            className="w-full px-4 py-4 bg-surface-3 border-none rounded-lg text-2xl font-extrabold font-heading text-accent outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold font-body text-gray-400 uppercase mb-2">Instructor Remarks</label>
                                        <textarea
                                            value={feedback}
                                            onChange={e => setFeedback(e.target.value)}
                                            className="w-full p-4 bg-surface-3 border-none rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm h-64 font-medium"
                                            placeholder="Write constructive feedback for the student..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-50 space-y-4">
                            <p className="text-[10px] font-bold font-body text-gray-400 uppercase tracking-widest">Quick Grade</p>
                            <div className="flex gap-2">
                                {['A', 'B', 'C', 'D', 'F'].map(lt => (
                                    <button
                                        key={lt}
                                        onClick={() => setGrade(lt)}
                                        className="w-10 h-10 rounded-lg bg-surface-3 text-gray-400 font-bold font-body text-xs hover:bg-accent/10 hover:text-accent transition-colors"
                                    >
                                        {lt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resource Preview Modal */}
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

export default AssignmentReview;

