import React, { useState } from 'react';
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
import { ClipboardCheck, AlertTriangle, CheckCircle2, Info, ArrowLeft } from 'lucide-react';

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

    if (!assignment || !student || !submission) {
        return (
            <div className="p-20 text-center">
                <h2 className="text-2xl font-bold text-gray-400">Submission or Student not found.</h2>
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Top Bar */}
            <div className="bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(`/teacher/assignments/${titleSlug}/submissions`)}
                        className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50" 
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="font-black text-gray-900">Review: {student.firstName ? `${student.firstName} ${student.lastName}` : (student.name || student.email)}</h2>
                        <p className="text-xs text-gray-400 font-bold">{assignment.title}</p>
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
                            className="px-6 py-2 bg-amber-500 text-white rounded-xl font-bold shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all text-sm"
                        >
                            Approve Tutorial Mode
                        </button>
                    )}
                    {submission?.tutorialApproved && (
                        <div className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-bold text-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            Tutorial Mode Enabled
                        </div>
                    )}
                    <button
                        onClick={handleCheckIn}
                        disabled={isValidating}
                        className={`px-6 py-2 ${submission?.issues ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'} rounded-xl font-bold flex items-center gap-2 hover:bg-opacity-80 transition-all text-sm`}
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
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-sm"
                    >
                        {isSaving ? "Saving..." : "Post Grade & Feedback"}
                    </button>
                </div>
            </div>

            {/* Status Messages */}
            {(errorMessage || successMessage) && (
                <div className={`px-8 py-4 flex items-center gap-4 animate-in slide-in-from-top-2 duration-300 border-b ${errorMessage ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100 text-red-500' : 'bg-emerald-100 text-emerald-500'}`}>
                        {errorMessage ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <p className="text-sm font-bold flex-1">{errorMessage || successMessage}</p>
                </div>
            )}

            {/* Main Review Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Student Work & Reports */}
                <div className="flex-1 bg-gray-100 p-8 overflow-y-auto space-y-8">
                    {/* Model Snapshot View */}
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-200 flex flex-col min-h-[500px]">
                        <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">UML Design Preview</span>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded">USE CASE</span>
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded">SSD</span>
                            </div>
                        </div>
                        <div className="flex-1 flex items-center justify-center bg-[#fafafa] p-12">
                            <div className="text-center">
                                <div className="text-6xl mb-6 opacity-20">📐</div>
                                <h3 className="text-xl font-black text-gray-800">Submission Content Active</h3>
                                <p className="text-gray-400 mt-2 max-w-sm">The teacher can now review diagrams and descriptions. Use 'Check-In' to run automated consistency checks.</p>
                            </div>
                        </div>
                    </div>

                    {/* Validation Report Section */}
                    {(submission?.issues || submission?.totalScore != null) && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-gray-900">Validation Report</h3>
                                {submission.totalScore != null && (
                                    <div className="flex items-center gap-4">
                                        <div className="bg-indigo-600 px-4 py-2 rounded-xl text-white">
                                            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Automated Score</p>
                                            <p className="text-xl font-black">{submission.totalScore}%</p>
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
                                    <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sec.label}</p>
                                        <p className="text-xl font-black text-gray-900 mt-1">{sec.score ?? 0}%</p>
                                    </div>
                                ))}
                            </div>
                            
                            {submission.issues?.length > 0 ? (
                                <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                        <h4 className="font-bold text-gray-700">Identified Issues</h4>
                                        <span className="text-[10px] font-black bg-white px-2 py-1 rounded border border-gray-200">{submission.issues.length} ISSUES FOUND</span>
                                    </div>
                                    <div className="divide-y divide-gray-50">
                                        {submission.issues.map((res, rIdx) => (
                                            <div key={rIdx} className="p-6 flex gap-4">
                                                {res.severity === 'error' || res.type === 'error' 
                                                    ? <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                                    : <Info className="text-amber-500 shrink-0" size={20} />
                                                }
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded uppercase">{res.type}</span>
                                                        <p className="text-sm font-black text-gray-900">{res.message}</p>
                                                    </div>
                                                    <p className="text-sm text-gray-600">{res.problem}</p>
                                                    <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">System Suggestion</p>
                                                        <p className="text-xs text-indigo-700 font-bold">{res.suggestion}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                submission.totalScore != null && (
                                    <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-3xl flex flex-col items-center text-center">
                                        <CheckCircle2 className="text-emerald-500 mb-4" size={48} />
                                        <h4 className="text-xl font-black text-emerald-900">Perfect Consistency!</h4>
                                        <p className="text-emerald-600 mt-2 font-medium">The Validation Engine found no errors in the diagrams or scenarios.</p>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Right: Grading Panel */}
                <div className="w-96 bg-white border-l border-gray-100 p-8 space-y-8 flex flex-col">
                    <div className="flex-1 space-y-8">
                        <div>
                            <h3 className="text-lg font-black text-gray-900 mb-6">Grading</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Final Score (Points / 100)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={grade}
                                        onChange={e => setGrade(e.target.value)}
                                        placeholder="e.g. 85"
                                        className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-2xl font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Instructor Remarks</label>
                                    <textarea
                                        value={feedback}
                                        onChange={e => setFeedback(e.target.value)}
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm h-64 font-medium"
                                        placeholder="Write constructive feedback for the student..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-50 space-y-4 text-center mt-auto">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quick Grade</p>
                        <div className="flex justify-center gap-2">
                            {['A','B','C','D','F'].map(lt => (
                                <button
                                    key={lt}
                                    onClick={() => setGrade(lt)}
                                    className="w-10 h-10 rounded-lg bg-gray-50 text-gray-400 font-bold text-xs hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                >
                                    {lt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentReview;

