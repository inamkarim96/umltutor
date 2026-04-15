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
        <div className="min-h-screen bg-[#f8fafc] p-8 md:p-12">
            <div>
                {/* Header */}
                <div className="mb-12">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="mb-6 text-gray-500 font-extrabold text-sm hover:text-indigo-600 transition-all flex items-center gap-2 group"
                    >
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        Back to Dashboard
                    </button>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        {isReviewedMode ? 'Reviewed Work' : 'Submitted Work'}
                        <span className="block text-lg font-medium text-gray-500 mt-2 italic">
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
                                    className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                                    
                                    <div className="flex-1 relative z-10">
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-widest ${
                                                submission?.status?.toLowerCase() === 'graded' 
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50' 
                                                : 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                                            }`}>
                                                {submission?.status?.toLowerCase() === 'graded' ? 'Reviewed' : 'Submitted'}
                                            </span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                                                {assignment.type || 'Standard'} Task
                                            </span>
                                        </div>
                                        <h3 className="text-2xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors mb-3">
                                            {assignment.title}
                                        </h3>
                                        <p className="text-gray-500 font-medium leading-relaxed max-w-3xl">
                                            {assignment.description || "You have successfully submitted your work for this assignment."}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l border-gray-50 pt-6 md:pt-0 md:pl-12 relative z-10">
                                        <div className="min-w-[120px]">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">
                                                {submission?.status?.toLowerCase() === 'graded' ? 'Reviewed On' : 'Submitted On'}
                                            </p>
                                            <div className="flex items-center gap-2 text-gray-900 font-black">
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
                                        
                                        {submission?.score !== null && submission?.score !== undefined ? (
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Grade</p>
                                                <p className="text-2xl font-black text-indigo-600 bg-indigo-50 px-4 py-1 rounded-full">{submission.score}%</p>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Status</p>
                                                <p className="text-sm font-black text-gray-900">Pending Review</p>
                                            </div>
                                        )}

                                        <div className="hidden lg:flex w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-100 transition-all duration-300">
                                            <FileText size={20} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white p-20 rounded-[3rem] border border-dashed border-gray-200 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8">
                            <FileText size={40} className="text-gray-200" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 mb-3">
                            {isReviewedMode ? 'No Feedback Yet' : 'No Submissions'}
                        </h3>
                        <p className="text-gray-500 font-medium max-w-sm mx-auto text-lg text-pretty">
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

