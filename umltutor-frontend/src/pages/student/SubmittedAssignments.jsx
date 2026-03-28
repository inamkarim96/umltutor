import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Calendar, Target, FileText } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { selectUser } from '../../features/auth';

const SubmittedAssignments = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const allAssignments = useAppSelector(selectAllAssignments) || [];
    const mySubmissions = useAppSelector(selectSubmissions) || [];
    
    // Detect mode from URL
    const isReviewedMode = window.location.pathname.includes('/reviewed');

    React.useEffect(() => {
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch]);

    const submittedAssignments = allAssignments.filter(assignment => {
        const submission = mySubmissions.find(s => s.assignmentId === assignment.id);
        const status = submission?.status?.toLowerCase();
        
        if (isReviewedMode) {
            return submission && (status === 'graded' || status === 'completed');
        } else {
            return submission && status === 'submitted';
        }
    });

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {isReviewedMode ? 'Reviewed Work' : 'Submitted Work'}
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">
                            {isReviewedMode 
                                ? 'Assignments that have received teacher feedback' 
                                : 'Assignments you have submitted and are awaiting review'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            {submittedAssignments.length > 0 ? (
                <div className="space-y-4">
                    {submittedAssignments.map((assignment) => {
                        const submission = mySubmissions.find(s => s.assignmentId === assignment.id);
                        return (
                            <div
                                key={assignment.id}
                                onClick={() => navigate(`/student/assignments/${assignment.title.toLowerCase().replace(/\s+/g, '-')}`)}
                                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-widest bg-emerald-50 text-emerald-600">
                                                {submission?.status?.toLowerCase() === 'graded' ? 'Reviewed' : 'Submitted'}
                                            </span>
                                            <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {assignment.type || 'Text'} Exploration
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
                                            {assignment.title}
                                        </h3>
                                        <p className="text-gray-500 text-sm line-clamp-2 font-medium">
                                            {assignment.description || "No description provided."}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-8">
                                        <div className="text-center md:text-left">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Submitted</p>
                                            <div className="flex items-center gap-2 text-gray-900 font-bold">
                                                <Calendar size={14} className="text-indigo-500" />
                                                <span className="text-sm">
                                                    {submission?.submittedAt ?
                                                        new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        }) :
                                                        submission?.lastActivityAt ?
                                                            new Date(submission.lastActivityAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            }) :
                                                            'No Date'
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        {submission?.score !== null && submission?.score !== undefined ? (
                                            <div className="text-center md:text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Grade</p>
                                                <p className="text-xl font-black text-indigo-600">{submission.score}%</p>
                                            </div>
                                        ) : (
                                            <div className="text-center md:text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {submission?.status?.toLowerCase() === 'graded' ? 'Reviewed' : 'Pending Review'}
                                                </p>
                                            </div>
                                        )}

                                        <div className="hidden md:flex w-10 h-10 bg-gray-50 text-gray-400 rounded-xl items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                            <FileText size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white p-20 rounded-[40px] border border-dashed border-gray-200 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <FileText size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">
                        {isReviewedMode ? 'No Reviewed Work' : 'No Submitted Work'}
                    </h3>
                    <p className="text-gray-500 font-medium max-w-xs mx-auto">
                        {isReviewedMode 
                            ? "You don't have any reviewed assignments yet. Once your teacher provides feedback, they will appear here!"
                            : "You haven't submitted any assignments for review yet. Start with your pending assignments!"
                        }
                    </p>
                </div>
            )}
        </div>
    );
};

export default SubmittedAssignments;

