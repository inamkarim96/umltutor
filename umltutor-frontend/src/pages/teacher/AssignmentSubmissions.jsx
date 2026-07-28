import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
    selectClasses
} from '../../features/classroom';
import {
    selectAllAssignments,
    fetchAllAssignments,
    fetchAssignmentById
} from '../../features/assignments';
import {
    selectAssignmentSubmissions,
    fetchAssignmentSubmissions,
    approveTutorialMode
} from '../../features/submissions';
import { selectUser } from '../../features/auth';
import {
    ArrowLeft,
    Users,
    Clock,
    CheckCircle,
    ChevronRight,
    Search,
    Filter,
    MoreHorizontal,
    Mail,
    FileText,
    BookOpen
} from 'lucide-react';

const AssignmentSubmissions = () => {
    // Custom router — useParams() returns {} without <Route> wrappers. Parse from URL.
    const titleSlug = window.location.pathname
        .split('/')
        .find((segment, i, arr) => arr[i - 1] === 'assignments' && segment !== 'submitted' && segment !== 'pending' && segment !== 'reviewed' && segment.length > 0);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const role = user?.role;

    const assignments = useAppSelector(selectAllAssignments) || [];
    const classes = useAppSelector(selectClasses);

    // Find assignment by slugified title
    const assignment = useMemo(() => {
        return assignments.find(asgn =>
            asgn.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug
        );
    }, [assignments, titleSlug]);

    const id = assignment?.id;
    const submissionsForThisAsgn = useAppSelector(state => selectAssignmentSubmissions(state, id)) || [];

    useEffect(() => {
        if ((assignments || []).length === 0) {
            dispatch(fetchAllAssignments('TEACHER'));
        }
    }, [dispatch, assignments]);

    useEffect(() => {
        if (!assignment && id) {
            dispatch(fetchAssignmentById({ id, role }));
        }
    }, [id, assignment, role, dispatch]);

    useEffect(() => {
        if (id) {
            dispatch(fetchAssignmentSubmissions(id));
        }
    }, [id, dispatch]);

    const handleNavigate = (sub) => {
        const aSlug = assignment?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'assignment';
        const studentName = sub.studentName || (sub.studentEmail ? sub.studentEmail.split('@')[0] : 'Unknown Student');
        const sSlug = studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'student';
        navigate(`/teacher/submissions/${aSlug}/${sSlug}/${sub.submissionId}`);
    };

    if (!assignment) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-transparent">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
                    <p className="text-muted font-bold font-body uppercase tracking-widest text-[10px]">Loading Submissions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent pb-20">
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-black/5 sticky top-0 z-30 px-8 py-4 flex justify-between items-center shadow-card">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 hover:bg-surface-3 rounded-lg text-gray-400 hover:text-accent transition-all border border-transparent hover:border-black/5"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-extrabold font-heading rounded uppercase tracking-widest">Teacher View</span>
                            <span className="text-[10px] font-bold font-body text-gray-400 uppercase tracking-widest">/</span>
                            <span className="text-[10px] font-bold font-body text-gray-400 uppercase tracking-widest">Submissions</span>
                        </div>
                        <h1 className="text-xl font-extrabold font-heading text-ink leading-none">{assignment.title}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden md:flex items-center gap-8 mr-8">
                        <div className="text-right">
                            <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-0.5">Submissions</p>
                            <p className="text-xl font-extrabold font-heading text-accent leading-none">
                                {submissionsForThisAsgn.filter(s => s.status && s.status.toLowerCase() !== 'pending').length}
                            </p>
                        </div>
                    </div>
                    <button className="p-3 bg-surface-3 text-gray-400 rounded-lg border border-black/5 hover:bg-white hover:text-accent transition-all shadow-card">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            <div className="px-8 py-10">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                    <div className="bg-white p-8 rounded-lg border border-black/5 shadow-card flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                            <Users size={28} />
                        </div>
                        <div>
                            <p className="text-xs font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Total Enrolled</p>
                            <p className="text-3xl font-extrabold font-heading text-ink">
                                {submissionsForThisAsgn.length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-lg border border-black/5 shadow-card flex items-center gap-6 relative overflow-hidden group hover:shadow-xl transition-all">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10/50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
                        <div className="w-16 h-16 bg-accent/10 text-accent rounded-lg flex items-center justify-center shadow-inner relative z-10 transition-colors group-hover:bg-accent group-hover:text-white">
                            <CheckCircle size={28} />
                        </div>
                        <div className="relative z-10">
                            <p className="text-xs font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1 group-hover:text-accent transition-colors">Submissions</p>
                            <p className="text-3xl font-extrabold font-heading text-ink">
                                {submissionsForThisAsgn.filter(s => {
                                    const status = s.status?.toLowerCase();
                                    return status === 'submitted' || status === 'graded' || status === 'reviewed' || status === 'completed';
                                }).length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-lg border border-black/5 shadow-card flex items-center gap-6">
                        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shadow-inner">
                            <Clock size={28} />
                        </div>
                        <div>
                            <p className="text-xs font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Awaiting Grade</p>
                            <p className="text-3xl font-extrabold font-heading text-ink">
                                {submissionsForThisAsgn.filter(s => s.status?.toLowerCase() === 'submitted').length}
                            </p>
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-lg border border-black/5 shadow-card flex items-center gap-6">
                        <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center shadow-inner">
                            <BookOpen size={28} />
                        </div>
                        <div>
                            <p className="text-xs font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Tutorial Requests</p>
                            <p className="text-3xl font-extrabold font-heading text-ink">
                                {submissionsForThisAsgn.filter(s => s.tutorialRequested && !s.tutorialApproved).length}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Table */}
                <div className="bg-white rounded-lg border border-black/5 shadow-card overflow-hidden">
                    <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-surface-3/30">
                        <h2 className="text-2xl font-extrabold font-heading text-ink">Student Submissions</h2>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-accent transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search by student name..."
                                className="pl-12 pr-6 py-3 bg-white border border-black/10 rounded-lg text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all w-80 shadow-card"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em]">
                                    <th className="px-10 py-6 border-b border-gray-50">Student Info</th>
                                    <th className="px-10 py-6 border-b border-gray-50">Status</th>
                                    <th className="px-10 py-6 border-b border-gray-50">Submission Time</th>
                                    <th className="px-10 py-6 border-b border-gray-50">Score</th>
                                    <th className="px-10 py-6 border-b border-gray-50 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(() => {
                                    const visibleSubmissions = submissionsForThisAsgn;

                                    if (visibleSubmissions.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan="5" className="px-10 py-32 text-center">
                                                    <div className="w-20 h-20 bg-surface-3 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300">
                                                        <FileText size={40} />
                                                    </div>
                                                    <h3 className="text-xl font-extrabold font-heading text-ink mb-2">No Submissions Yet</h3>
                                                    <p className="text-gray-400 font-medium">Wait for students to turn in their assignments.</p>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return visibleSubmissions.map((sub) => (
                                        <tr key={sub.studentId} className="group hover:bg-accent/10/30 transition-all duration-300">
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-lg flex items-center justify-center font-extrabold font-heading text-xl shadow-hover shadow-accent/20 group-hover:scale-110 transition-transform">
                                                        {sub.studentName?.charAt(0).toUpperCase() || <Mail size={24} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-lg font-extrabold font-heading text-ink group-hover:text-accent transition-colors">
                                                            {sub.studentName || (sub.studentEmail ? sub.studentEmail.split('@')[0] : 'Unknown Student')}
                                                        </p>
                                                        <p className="text-xs text-gray-400 font-medium">{sub.studentEmail}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold font-heading uppercase tracking-widest shadow-card border ${sub.status === 'GRADED' || sub.status === 'graded'
                                                            ? 'bg-status-green/10 text-status-green border-emerald-100'
                                                            : sub.status === 'pending' || sub.status === 'NOT_SUBMITTED'
                                                                ? 'bg-status-red/10 text-status-red border-red-100'
                                                                : 'bg-blue-50 text-blue-600 border-blue-100'
                                                        }`}>
                                                        {sub.status?.replace(/_/g, ' ') || 'NOT STARTED'}
                                                    </span>
                                                    {sub.isUpdated && (
                                                        <span className="ml-3 px-3 py-1.5 rounded-full text-[10px] font-extrabold font-heading uppercase tracking-widest shadow-card border bg-purple-50 text-purple-700 border-purple-100">
                                                            Updated
                                                        </span>
                                                    )}
                                                    {sub.tutorialRequested && !sub.tutorialApproved && (
                                                        <span className="ml-3 px-3 py-1.5 rounded-full text-[10px] font-extrabold font-heading uppercase tracking-widest shadow-card border bg-amber-50 text-amber-600 border-amber-100">
                                                            Tutorial Req
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-10 py-8 text-sm">
                                                <div className="flex items-center gap-3 text-muted font-bold font-body tabular-nums">
                                                    <Clock size={16} className="text-gray-300" />
                                                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }) : ' - '}
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                {sub.status === 'graded' || sub.status === 'GRADED' ? (
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-extrabold font-heading text-accent">{sub.score}</span>
                                                        <span className="text-xs font-bold font-body text-gray-300">/{sub.maxScore ?? '—'}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-extrabold font-heading text-gray-300 uppercase tracking-widest">
                                                        {sub.status === 'NOT_SUBMITTED' ? '-' : 'Not Graded'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-10 py-8 text-right flex items-center justify-end gap-3">
                                                {sub.tutorialRequested && !sub.tutorialApproved && (
                                                    <button
                                                        onClick={() => dispatch(approveTutorialMode(sub.submissionId))}
                                                        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg font-extrabold font-heading uppercase tracking-widest text-[10px] hover:bg-amber-600 transition-all active:scale-95 shadow-hover shadow-amber-100"
                                                    >
                                                        <CheckCircle size={14} />
                                                        Approve
                                                    </button>
                                                )}
                                                <button
                                                    disabled={!sub.submissionId}
                                                    onClick={() => handleNavigate(sub)}
                                                    className={`inline-flex items-center gap-3 px-8 py-3.5 border rounded-lg font-extrabold font-heading uppercase tracking-widest text-[10px] transition-all active:scale-95 group/btn ${!sub.submissionId
                                                            ? 'bg-surface-3 text-gray-400 border-black/10 cursor-not-allowed'
                                                            : 'bg-white border-black/10 text-ink hover:bg-accent hover:text-white hover:border-accent hover:shadow-xl hover:shadow-accent/20 hover:-translate-y-1'
                                                        }`}
                                                >
                                                    {!sub.submissionId ? 'No Submission' : 'Evaluation'}
                                                    <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignmentSubmissions;

