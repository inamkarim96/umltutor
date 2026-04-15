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
        <div className="min-h-screen bg-[#f8fafc] p-8 md:p-12">
            <div>
                {/* Header Section */}
                <div className="mb-12">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                        <button onClick={() => navigate('/student/dashboard')} className="hover:text-indigo-600 transition-colors">Dashboard</button>
                        <span>/</span>
                        {activeClass ? (
                            <>
                                <button onClick={() => navigate(`/student/classes/${activeClass.id}`)} className="hover:text-indigo-600 transition-colors">{activeClass.name}</button>
                                <span>/</span>
                                <span className="text-gray-900">Assignments</span>
                            </>
                        ) : (
                            <span className="text-gray-900">All Assignments</span>
                        )}
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        {activeClass ? activeClass.name : "Your Assignments"}
                        <span className="block text-lg font-medium text-gray-500 mt-2 italic">
                            {activeClass ? `Manage tasks for ${activeClass.name}` : "Comprehensive list of all your academic tasks"}
                        </span>
                    </h1>
                </div>

                {/* Filter/Tabs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
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
                                    className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col h-full overflow-hidden relative"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/30 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>

                                    <div className="p-8 flex-1 relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`px-3 py-1 ${
                                                status === 'graded' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                                isSubmitted ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 
                                                isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 
                                                'bg-blue-50 text-blue-600 border-blue-100'
                                            } text-[10px] font-black rounded-lg uppercase tracking-widest border`}>
                                                {status === 'graded' ? 'Reviewed' : isSubmitted ? 'Submitted' : isOverdue ? 'Overdue' : 'Pending'}
                                            </span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                                                {myClasses.find(c => c.id === asgn.classId)?.code}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">{asgn.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-3 font-medium leading-relaxed">{asgn.description}</p>
                                    </div>

                                    <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-50 flex justify-between items-center relative z-10">
                                        <div>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Deadline</p>
                                            <p className="text-xs font-bold text-gray-700">{asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : 'No Date'}</p>
                                        </div>
                                        {(submission?.score !== undefined && submission?.score !== null) ? (
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Grade</p>
                                                <p className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{submission.score}%</p>
                                            </div>
                                        ) : (
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Weight</p>
                                                <p className="text-sm font-black text-gray-700">100 Pts</p>
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
        </div>
    );
};

export default StudentAssignmentsList;

