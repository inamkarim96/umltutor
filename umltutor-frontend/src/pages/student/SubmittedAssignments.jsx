import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowLeft, Calendar, Target, FileText } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { selectUser } from '../../features/auth';

const SubmittedAssignments = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const allAssignments = useAppSelector(selectAllAssignments) || [];
    const mySubmissions = useAppSelector(selectSubmissions) || [];
    
    // Detect mode reactively from current route location
    const isReviewedMode = location.pathname.includes('/reviewed');

    React.useEffect(() => {
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch]);

    const submittedAssignments = allAssignments.filter(assignment => {
        const status = (mySubmissions.find(s => s.assignmentId === assignment.id)?.status || assignment.status || '').toLowerCase();
        
        if (isReviewedMode) {
            return status === 'graded' || status === 'completed';
        } else {
            return status === 'submitted';
        }
    });

    return (
        <div className="min-h-screen bg-transparent p-8 md:p-12">
            <div>
                {/* Header */}
                <div className="mb-12">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="mb-6 text-muted font-extrabold text-sm hover:text-accent transition-all flex items-center gap-2 group"
                    >
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-card border border-black/5 group-hover:bg-accent/10 group-hover:border-accent/10 transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        Back to Dashboard
                    </button>
                    <h1 className="text-4xl font-extrabold font-heading text-ink tracking-tight">
                        {isReviewedMode ? 'Reviewed Work' : 'Submitted Work'}
                        <span className="block text-lg font-medium text-muted mt-2 italic">
                            {isReviewedMode 
                                ? 'Track your progress and learn from instructor feedback' 
                                : 'Awaiting review from your instructors'}
                        </span>
                    </h1>
                </div>

                {/* Assignments List */}
                {submittedAssignments.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                        {submittedAssignments.map((assignment) => {
                            const submission = mySubmissions.find(s => s.assignmentId === assignment.id);
                            return (
                                <div
                                    key={assignment.id}
                                    onClick={() => navigate(`/student/assignments/${assignment.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                    className="bg-white p-8 rounded-lg border border-black/5 shadow-card hover:shadow-hover hover:-translate-y-1 transition-all group cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10/20 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                                    
                                    <div className="flex-1 relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`px-3 py-1 text-[10px] font-extrabold font-heading rounded-lg uppercase tracking-widest ${
                                                submission?.status?.toLowerCase() === 'graded' 
                                                ? 'bg-status-green/10 text-status-green border border-emerald-100/50' 
                                                : 'bg-accent/10 text-accent border border-accent/10/50'
                                            }`}>
                                                {submission?.status?.toLowerCase() === 'graded' ? 'Reviewed' : 'Submitted'}
                                            </span>
                                            <span className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest bg-surface-3 px-2 py-1 rounded-lg">
                                                {assignment.type || 'Standard'} Task
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-extrabold font-heading text-ink group-hover:text-accent transition-colors mb-3">
                                            {assignment.title}
                                        </h3>
                                        <p className="text-muted font-medium leading-relaxed max-w-3xl">
                                            {assignment.description || "You have successfully submitted your work for this assignment."}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-gray-50 pt-6 md:pt-0 md:pl-12 relative z-10">
                                        <div className="min-w-[120px]">
                                            <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1 italic">
                                                {submission?.status?.toLowerCase() === 'graded' ? 'Reviewed On' : 'Submitted On'}
                                            </p>
                                            <div className="flex items-center gap-2 text-ink font-extrabold font-heading">
                                                <Calendar size={16} className="text-indigo-500" />
                                                <span className="text-sm">
                                                    {submission?.submittedAt ?
                                                        new Date(submission.submittedAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        }) : 'No Date'
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {((submission || assignment)?.score != null) ? (
                                            <div className="text-right">
                                                <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1 italic">Grade</p>
                                                <p className="text-2xl font-extrabold font-heading text-accent bg-accent/10 px-4 py-1 rounded-full">{(submission || assignment)?.score}%</p>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1 italic">Status</p>
                                                <p className="text-sm font-extrabold font-heading text-ink">Pending Review</p>
                                            </div>
                                        )}

                                        <div className="hidden lg:flex w-12 h-12 bg-surface-3 text-gray-400 rounded-lg items-center justify-center group-hover:bg-accent group-hover:text-white group-hover:shadow-hover group-hover:shadow-accent/20 transition-all duration-300">
                                            <FileText size={20} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white p-20 rounded-lg border border-dashed border-black/10 text-center">
                        <div className="w-24 h-24 bg-surface-3 rounded-lg flex items-center justify-center mx-auto mb-8">
                            <FileText size={40} className="text-gray-200" />
                        </div>
                        <h3 className="text-3xl font-extrabold font-heading text-ink mb-3">
                            {isReviewedMode ? 'No Feedback Yet' : 'No Submissions'}
                        </h3>
                        <p className="text-muted font-medium max-w-sm mx-auto text-lg text-pretty">
                            {isReviewedMode 
                                ? "You don't have any reviewed assignments yet. Once your teacher provides feedback, they will appear here!"
                                : "You haven't submitted any assignments for review yet. Start with your pending assignments!"
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubmittedAssignments;

