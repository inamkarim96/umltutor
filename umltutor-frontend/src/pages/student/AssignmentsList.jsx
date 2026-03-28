import React, { useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectUser } from '../../features/auth';
import { selectClasses, fetchClasses } from '../../features/classroom';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';

const StudentAssignmentsList = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();

    const queryParams = new URLSearchParams(location.search);
    const filterClassId = queryParams.get('classId');

    const allClasses = useAppSelector(selectClasses);
    const assignments = useAppSelector(selectAllAssignments) || [];
    const submissionsMap = useAppSelector(selectSubmissions) || [];

    useEffect(() => {
        dispatch(fetchClasses('STUDENT'));
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch]);

    const myClasses = (allClasses || []).filter(c => c.studentIds?.includes(user?.id) || c.students?.some(s => s.id === user?.id));
    const mySubmissions = submissionsMap;

    const filteredAssignments = useMemo(() => {
        let list = assignments.filter(a =>
            myClasses.some(c => c.id === a.classId)
        );

        if (filterClassId) {
            list = list.filter(a => a.classId === filterClassId);
        }

        return list;
    }, [assignments, myClasses, filterClassId]);

    const activeClass = filterClassId ? myClasses.find(c => c.id === filterClassId) : null;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Breadcrumbs / Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-400 mb-2">
                    <button onClick={() => navigate('/student/dashboard')} className="hover:text-indigo-600">Dashboard</button>
                    <span>/</span>
                    {activeClass ? (
                        <>
                            <button onClick={() => navigate(`/student/classes/${activeClass.id}`)} className="hover:text-indigo-600">{activeClass.name}</button>
                            <span>/</span>
                            <span className="text-gray-900">Assignments</span>
                        </>
                    ) : (
                        <span className="text-gray-900">All Assignments</span>
                    )}
                </div>
                <h1 className="text-3xl font-black text-gray-900">
                    {activeClass ? `Assignments for ${activeClass.name}` : "Your Assignments"}
                </h1>
            </div>

            {/* Filter/Tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssignments.length > 0 ? (
                    filteredAssignments.map(asgn => {
                        const submission = mySubmissions.find(s => s.assignmentId === asgn.id);
                        const status = submission?.status?.toLowerCase();
                        const isSubmitted = status === 'submitted' || status === 'graded';
                        const isOverdue = asgn.deadline && new Date(asgn.deadline) < new Date() && !isSubmitted;

                        return (
                            <div
                                key={asgn.id}
                                onClick={() => navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col"
                            >
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`px-2 py-1 ${isSubmitted ? 'bg-emerald-50 text-emerald-600' : isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} text-[10px] font-bold rounded uppercase`}>
                                            {status === 'graded' ? '✓ Reviewed' : isSubmitted ? '✓ Submitted' : isOverdue ? '⚠️ Overdue' : '⏳ Pending'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400">
                                            {myClasses.find(c => c.id === asgn.classId)?.code}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{asgn.title}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-3">{asgn.description}</p>
                                </div>
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-50 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deadline</p>
                                        <p className="text-xs font-bold text-gray-700">{asgn.deadline ? new Date(asgn.deadline).toLocaleString() : 'No Date'}</p>
                                    </div>
                                    {(submission?.score !== undefined && submission?.score !== null) ? (
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grade</p>
                                            <p className="text-sm font-black text-indigo-600">{submission.score}%</p>
                                        </div>
                                    ) : (
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Points</p>
                                            <p className="text-xs font-bold text-gray-700">100 Max</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <div className="text-5xl mb-6">📄</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No assignments found</h3>
                        <p className="text-gray-400">Take a break! There are no tasks waiting for you in this section.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAssignmentsList;

