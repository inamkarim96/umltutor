import React, { useEffect, useMemo, useState } from 'react';
import { resolveResourceUrl } from '../utils/urlHelper';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
    selectClasses,
    selectStudents,
    fetchClassStudents
} from '../features/classroom';
import {
    selectAllAssignments,
    fetchAssignmentById,
    fetchAllAssignments,
    updateAssignment
} from '../features/assignments';
import {
    selectSubmissions,
    selectAssignmentSubmissions,
    fetchAssignmentSubmissions,
    fetchSubmissionStatus,
    selectCurrentSubmission
} from '../features/submissions';
import { selectUser } from '../features/auth';
import {
    ArrowLeft,
    Calendar,
    FileText,
    CheckCircle,
    Info,
    Clock,
    Users,
    ChevronRight,
    Layout,
    Edit,
    X,
    Upload,
    Eye,
    Download,
    Database
} from 'lucide-react';
import { SubmitAssignment } from '../features/classroom';
import { CreateAssignmentModal } from '../features/teacher';

const AssignmentDetails = () => {
    const { titleSlug } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const submissionStatus = useAppSelector(selectCurrentSubmission);
    const role = user?.role;

    // Edit modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [previewFile, setPreviewFile] = useState(null);

    // Edit functions
    const handleEditAssignment = () => {
        setIsEditModalOpen(true);
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    const handleUpdateAssignment = async (data) => {
        try {
            setIsSubmitting(true);
            setErrorMessage('');

            if (assignment?.id) {
                // Update existing assignment using thunk to ensure state & DB sync
                await dispatch(updateAssignment({
                    id: assignment.id,
                    data: data
                })).unwrap();

                setSuccessMessage('Edit has been successfully done');
                setTimeout(() => setSuccessMessage(''), 5000);
            }

            setIsEditModalOpen(false);
            setIsSubmitting(false);
        } catch (error) {
            console.error('Error updating assignment:', error);
            setErrorMessage(error?.message || 'Failed to update assignment');
            setIsSubmitting(false);
        }
    };

    const assignments = useAppSelector(selectAllAssignments);
    const submissionsArr = useAppSelector(selectSubmissions);
    const classes = useAppSelector(selectClasses);
    const studentsMap = useAppSelector(selectStudents);
    // Find assignment by slugified title
    const assignment = useMemo(() => {
        return (assignments || []).find(asgn =>
            asgn.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug
        );
    }, [assignments, titleSlug]);

    const id = assignment?.id;
    const assignmentSubmissionsFromSlice = useAppSelector(state => selectAssignmentSubmissions(state, id));
    const targetClass = assignment ? classes?.find(c => c.id === assignment.classId) : null;

    // Student's own official submission (only submitted or graded)
    const myOfficialSubmission = useMemo(() => {
        if (!id) return null;
        const sub = role === 'STUDENT' ? submissionStatus : submissionsArr.find(s => (s.assignmentId === id || s.id === id) && s.studentId === user?.id);
        const status = sub?.status?.toLowerCase();
        return (status === 'submitted' || status === 'graded') ? sub : null;
    }, [submissionsArr, submissionStatus, id, user?.id, role]);

    // All submissions for this assignment (Teacher only)
    const assignmentSubmissions = useMemo(() => {
        if (role === 'TEACHER' && id) {
            return assignmentSubmissionsFromSlice;
        }
        return id ? submissionsArr.filter(s => s.assignmentId === id) : [];
    }, [role, id, assignmentSubmissionsFromSlice, submissionsArr]);

    useEffect(() => {
        if ((assignments || []).length === 0) {
            dispatch(fetchAllAssignments(role));
        }
    }, [dispatch, assignments]);

    useEffect(() => {
        if (id) {
            dispatch(fetchAssignmentById({ id, role }));
        }
    }, [id, role, dispatch]);

    useEffect(() => {
        if (role === 'TEACHER' && id) {
            dispatch(fetchAssignmentSubmissions(id));
        } else if (role === 'STUDENT' && id) {
            dispatch(fetchSubmissionStatus(id));
        }
    }, [id, role, dispatch]);

    const classId = assignment?.classId;
    useEffect(() => {
        if (role === 'TEACHER' && classId) {
            dispatch(fetchClassStudents(classId));
        }
    }, [classId, role, dispatch]);

    if (!assignment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Assignment Details...</p>
                </div>
            </div>
        );
    }

    const isOverdue = new Date(assignment.deadline) < new Date();

    return (
        <>
            <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
                <div className="w-full">
                    {/* Back Button */}
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 font-bold transition-colors mb-8 group"
                    >
                        <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm group-hover:shadow group-hover:-translate-x-1 transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        Back
                    </button>

                    {/* Status Messages */}
                    {(errorMessage || successMessage) && (
                        <div className={`mb-8 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 border ${errorMessage ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                {errorMessage ? <X size={18} /> : <CheckCircle size={18} />}
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-[10px] uppercase tracking-widest leading-none mb-1">{errorMessage ? 'Error' : 'Success'}</p>
                                <p className="text-sm font-bold">{errorMessage || successMessage}</p>
                            </div>
                            <button
                                onClick={() => { setErrorMessage(''); setSuccessMessage(''); }}
                                className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    <div className="space-y-8 w-full mx-auto">
                        {/* Main Content */}
                        <div className="space-y-8">
                            {/* Assignment Card */}
                            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-16 -mt-16"></div>

                                <div className="flex-1 space-y-6 relative z-10 w-full">
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-indigo-100">Assignment</span>
                                                {myOfficialSubmission ? (
                                                    <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-emerald-100">
                                                        {myOfficialSubmission.status?.toLowerCase() === 'graded' ? 'Graded' : 'Submitted'}
                                                    </span>
                                                ) : (
                                                    <>
                                                        {isOverdue && <span className="px-3 py-1 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase tracking-widest">Closed</span>}
                                                        {!isOverdue && <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest">In Progress</span>}
                                                    </>
                                                )}
                                                {targetClass && (
                                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-amber-100">
                                                        {targetClass.name}
                                                    </span>
                                                )}
                                            </div>

                                            <h1 className="text-4xl font-black text-gray-900 leading-tight">{assignment.title}</h1>
                                        </div>

                                        <div className="flex flex-col items-end gap-5">
                                            {role === 'TEACHER' && (
                                                <button
                                                    onClick={handleEditAssignment}
                                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all shadow-sm border border-indigo-100 font-bold text-xs"
                                                    title="Edit Assignment"
                                                >
                                                    <Edit size={16} /> Edit
                                                </button>
                                            )}
                                            <div className="flex flex-wrap items-center gap-6 bg-white border border-gray-100 rounded-2xl px-6 py-3 shadow-sm">
                                                <div className="flex items-center gap-3 text-gray-500">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Due Date</p>
                                                        <p className="text-sm font-bold text-gray-700">
                                                            {new Date(assignment.deadline).toLocaleDateString(undefined, {
                                                                weekday: 'short',
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="w-px h-8 bg-gray-200"></div>

                                                <div className="flex items-center gap-3 text-gray-500">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Due Time</p>
                                                        <p className="text-sm font-bold text-gray-700">
                                                            {new Date(assignment.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assignment Instructions */}
                                    <div className="pt-6 border-t border-gray-50">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="md:col-span-2 space-y-4">
                                                <div>
                                                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        Assignment Instructions
                                                    </h3>
                                                    <div className="bg-gray-50 rounded-[2rem] p-8 text-sm text-gray-700 leading-relaxed max-h-80 overflow-y-auto font-medium border border-gray-100">
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

                                            {/* Reference Materials */}
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        Reference Materials
                                                    </h3>
                                                    <div className="space-y-2">
                                                        {assignment?.assignmentFileUrl ? (
                                                            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
                                                                        <FileText size={16} />
                                                                    </div>
                                                                    <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]" title={assignment.assignmentFileName}>
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
                                                                        className="p-2 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-colors"
                                                                        title="View Resource"
                                                                    >
                                                                        <Eye size={16} />
                                                                    </button>
                                                                    <a
                                                                        href={resolveResourceUrl(assignment.assignmentFileUrl)}
                                                                        download={assignment.assignmentFileName || 'Resource'}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 hover:bg-indigo-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors"
                                                                        title="Download Resource"
                                                                    >
                                                                        <Download size={16} />
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No extra files</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>


                            {/* Submission Section / Teacher View */}
                            {role === 'TEACHER' ? (
                                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black shadow-sm">
                                                <Users size={20} />
                                            </div>
                                            <h2 className="text-xl font-black text-gray-900">Class Submissions</h2>
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <div className="text-center px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest tabular-nums">Submissions</p>
                                                <p className="text-lg font-black text-indigo-600">
                                                    {assignmentSubmissions.filter(s => s.status && s.status.toLowerCase() !== 'pending').length}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/teacher/assignments/${titleSlug}/submissions`)}
                                                className="px-6 py-2.5 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                                            >
                                                Full Report
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-2">
                                        {assignmentSubmissions.filter(s => s.status && s.status.toLowerCase() !== 'pending').length === 0 ? (
                                            <div className="p-20 text-center">
                                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                                    <Users size={32} />
                                                </div>
                                                <p className="text-gray-400 font-bold">No submissions yet.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            <th className="px-8 py-5">Student</th>
                                                            <th className="px-8 py-5">Status</th>
                                                            <th className="px-8 py-5">Date</th>
                                                            <th className="px-8 py-5 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {assignmentSubmissions
                                                            .filter(s => s.status && s.status.toLowerCase() !== 'pending')
                                                            .map((sub, index) => {
                                                                const student = studentsMap[sub.studentId];
                                                                const displayName = sub.studentName ||
                                                                    student?.name ||
                                                                    (sub.studentEmail ? sub.studentEmail.split('@')[0] : '') ||
                                                                    'Unknown Student';
                                                                const displayEmail = sub.studentEmail || student?.email || '';
                                                                return (
                                                                    <tr key={sub.submissionId || sub.id || `sub-${index}`} className="hover:bg-gray-50/80 transition-all group">
                                                                        <td className="px-8 py-5">
                                                                            <div className="flex items-center gap-4">
                                                                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center font-black text-sm shadow-sm ring-4 ring-indigo-50 group-hover:ring-indigo-100 transition-all">
                                                                                    {displayName?.charAt(0).toUpperCase() || '?'}
                                                                                </div>
                                                                                <div>
                                                                                    <p className="font-bold text-gray-900">{displayName}</p>
                                                                                    <p className="text-xs text-gray-400">{displayEmail}</p>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-5">
                                                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm ${sub.status?.toLowerCase() === 'graded' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                                'bg-blue-50 text-blue-600 border border-blue-100'
                                                                                }`}>
                                                                                {sub.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-8 py-5">
                                                                            <div className="flex items-center gap-2 text-gray-500 font-bold text-xs uppercase tracking-tighter">
                                                                                <Clock size={12} />
                                                                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'Pending'}
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-8 py-5 text-right">
                                                                            <button
                                                                                onClick={() => {
                                                                                    const assignmentName = assignment?.title || 'assignment';
                                                                                    const aSlug = assignmentName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                                                                    const sSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                                                                    navigate(`/teacher/submissions/${aSlug}/${sSlug}/${sub.submissionId || sub.id}`);
                                                                                }}
                                                                                className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-indigo-600 border border-transparent hover:border-gray-100 hover:shadow-sm transition-all"
                                                                            >
                                                                                <ChevronRight size={20} />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black shadow-sm">
                                            <Layout size={20} />
                                        </div>
                                        <h2 className="text-xl font-black text-gray-900">Your Submission</h2>
                                    </div>

                                    {myOfficialSubmission ? (
                                        <div className="space-y-6">
                                            <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 shadow-sm">
                                                <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                                                    <CheckCircle size={28} />
                                                </div>
                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tighter">Work Turned In</h3>
                                                    <p className="text-sm text-emerald-600 font-bold mt-1">Submitted on {new Date(myOfficialSubmission.submittedAt).toLocaleString()}</p>
                                                </div>
                                                {myOfficialSubmission.score != null && (
                                                    <div className="text-center md:text-right">
                                                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Final Score</p>
                                                        <p className="text-3xl font-black text-emerald-600">{myOfficialSubmission.score}<span className="text-emerald-300 text-sm">/100</span></p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Teacher Feedback */}
                                            {myOfficialSubmission.status?.toLowerCase() === 'graded' && (myOfficialSubmission.remarks || myOfficialSubmission.feedback) && (
                                                <div className="p-8 bg-indigo-900 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full -mr-16 -mt-16"></div>
                                                    <h4 className="text-xs font-black text-indigo-300 uppercase tracking-[0.2em] mb-4">💬 Feedback from Teacher</h4>
                                                    <p className="text-lg font-medium leading-relaxed italic">
                                                        "{myOfficialSubmission.remarks || myOfficialSubmission.feedback}"
                                                    </p>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => navigate(`/student/assignments/${titleSlug}/work`)}
                                                className="w-full py-5 bg-gray-900 border border-gray-800 text-white rounded-[1.5rem] font-bold hover:bg-gray-800 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3 overflow-hidden group shadow-xl"
                                            >
                                                <Layout size={20} className="group-hover:rotate-12 transition-transform" />
                                                View Your UML Design
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="p-10 border-2 border-dashed border-indigo-100 rounded-[3rem] text-center space-y-4 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all cursor-pointer group"
                                                onClick={() => navigate(`/student/assignments/${titleSlug}/work`)}>
                                                <div className="text-6xl group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">🏗️</div>
                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">Workspace Ready</h3>
                                                    <p className="text-gray-400 font-bold uppercase tracking-tighter text-xs">Build your diagrams in the editor and come back here to submit</p>
                                                </div>
                                                <div className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm text-sm font-black text-indigo-600 group-hover:shadow-md transition-all">
                                                    Go to Editor <ChevronRight size={16} />
                                                </div>
                                            </div>

                                            {!isOverdue && (
                                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
                                                    <SubmitAssignment assignment={assignment} />
                                                </div>
                                            )}

                                            {isOverdue && (
                                                <div className="p-10 bg-gray-100 rounded-[2.5rem] text-center">
                                                    <p className="font-black text-gray-400 uppercase tracking-widest text-sm">Deadline Passed - Submissions Closed</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Assignment Modal */}
            {role === 'TEACHER' && (
                <CreateAssignmentModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    onSubmit={handleUpdateAssignment}
                    isSubmitting={isSubmitting}
                    initialData={assignment}
                />
            )}
            {/* Resource Preview Modal */}
            {previewFile && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <FileText size={20} />
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
                                        <FileText size={32} />
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
        </>
    );
};

export default AssignmentDetails;
