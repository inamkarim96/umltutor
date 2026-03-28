import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, Calendar, Target, Play } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { selectUser } from '../../features/auth';

const PendingAssignments = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const allAssignments = useAppSelector(selectAllAssignments) || [];
    const mySubmissions = useAppSelector(selectSubmissions) || [];

    React.useEffect(() => {
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch]);

    const pendingAssignments = allAssignments.filter(assignment => {
        const submission = mySubmissions.find(s => s.assignmentId === assignment.id);
        const status = submission?.status?.toLowerCase();
        return !submission || (status === 'draft' || status === 'pending');
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
                            Pending Assignments
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">Assignments you haven't started yet</p>
                    </div>
                </div>
            </div>

            {/* Assignments List */}
            {pendingAssignments.length > 0 ? (
                <div className="space-y-4">
                    {pendingAssignments.map((assignment) => (
                        <div
                            key={assignment.id}
                            onClick={() => navigate(`/student/assignments/${assignment.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-widest bg-amber-50 text-amber-600">
                                            Open
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
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deadline</p>
                                        <div className="flex items-center gap-2 text-gray-900 font-bold">
                                            <Calendar size={14} className="text-indigo-500" />
                                            <span className="text-sm">{assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : 'No Date'}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="text-center md:text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Max Score</p>
                                        <p className="text-xl font-black text-gray-900">{assignment.maxScore ?? '—'}</p>
                                    </div>

                                    <div className="hidden md:flex w-10 h-10 bg-gray-50 text-gray-400 rounded-xl items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <Play size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white p-20 rounded-[40px] border border-dashed border-gray-200 text-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Clock size={32} className="text-gray-300" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">No Pending Assignments</h3>
                    <p className="text-gray-500 font-medium max-w-xs mx-auto">
                        Great job! You've started all your assignments or there are no new assignments.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PendingAssignments;

