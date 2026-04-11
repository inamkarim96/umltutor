import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
    selectClasses,
    fetchClasses
} from '../../features/classroom';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { selectUser } from '../../features/auth';
import {
    BookOpen,
    Clock,
    ChevronRight,
    Layout,
    GraduationCap,
    ArrowLeft,
    Calendar,
    FileText,
    ArrowUpRight
} from 'lucide-react';

const StudentClassDetail = () => {
    const { name } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const allClasses = useAppSelector(selectClasses);
    const assignments = useAppSelector(selectAllAssignments) || [];
    const submissionsMap = useAppSelector(selectSubmissions);
    const user = useAppSelector(selectUser);

    useEffect(() => {
        // Ensure data is loaded
        if (allClasses.length === 0) dispatch(fetchClasses('STUDENT'));
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch, allClasses.length]);

    const currentClass = useAppSelector(state =>
        state.classroom.classes.find(c => c.name.toLowerCase().replace(/\s+/g, '-') === name)
    );

    const classId = currentClass?.id;
    const classAssignments = useMemo(() => {
        return assignments.filter(a => a.classId === classId);
    }, [assignments, classId]);

    const mySubmissions = useMemo(() => {
        return submissionsMap || [];
    }, [submissionsMap]);

    if (!currentClass) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading class details...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            {/* Class Hero Header */}
            <div className="bg-white border-b border-gray-100 shadow-sm mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-xs font-bold text-gray-400 mb-6 uppercase tracking-widest">
                        <Link to="/student/dashboard" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
                        <ChevronRight size={14} />
                        <span className="text-indigo-600">Classes</span>
                        <ChevronRight size={14} />
                        <span className="text-gray-900">{currentClass.name}</span>
                    </nav>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-100">
                                    {currentClass.name.charAt(0)}
                                </div>
                                <div>
                                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest mb-2 inline-block">
                                        {currentClass.code}
                                    </span>
                                    <h1 className="text-4xl font-black text-gray-900 leading-tight">
                                        {currentClass.name}
                                    </h1>
                                </div>
                            </div>
                            <p className="text-gray-500 max-w-2xl font-medium leading-relaxed">
                                {currentClass.description || "Welcome to your class dashboard. Here you can find all assignments and resources for this course."}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <GraduationCap size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Instructor</p>
                                    <p className="text-sm font-bold text-gray-900">{currentClass.teacherName || 'Standard Instructor'}</p>
                                </div>
                            </div>
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignments</p>
                                    <p className="text-sm font-bold text-gray-900">{classAssignments.length} Total</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Assignments List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-900">Current Assignments</h2>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white border border-gray-200 text-gray-400 text-[10px] font-bold rounded-lg uppercase tracking-widest">Latest First</span>
                            </div>
                        </div>

                        {classAssignments.length > 0 ? (
                            <div className="space-y-4">
                                {classAssignments.map(asgn => {
                                    const submission = mySubmissions.find(s => s.assignmentId === asgn.id);
                                    const status = submission?.status?.toLowerCase();
                                    const isSubmitted = status === 'submitted' || status === 'graded';
                                    const isOverdue = asgn.deadline && new Date(asgn.deadline) < new Date() && !isSubmitted;

                                    return (
                                        <div
                                            key={asgn.id}
                                            onClick={() => navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-pointer group"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-widest ${status === 'graded' ? 'bg-indigo-50 text-indigo-600' :
                                                                status === 'submitted' ? 'bg-emerald-50 text-emerald-600' :
                                                                    isOverdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                            }`}>
                                                            {status === 'graded' ? 'Reviewed' :
                                                                status === 'submitted' ? 'Submitted' :
                                                                    isOverdue ? 'Late' : 'Open'}
                                                        </span>
                                                        <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                            {asgn.type || 'Text'} Exploration
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
                                                        {asgn.title}
                                                    </h3>
                                                    <p className="text-gray-500 text-sm line-clamp-2 font-medium">
                                                        {asgn.description || "No description provided."}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center justify-between sm:justify-start gap-4 sm:gap-8 border-t md:border-t-0 md:border-l border-gray-50 pt-4 md:pt-0 md:pl-8 mt-4 md:mt-0">
                                                    <div className="text-center md:text-left">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deadline</p>
                                                        <div className="flex items-center gap-2 text-gray-900 font-bold">
                                                            <Calendar size={14} className="text-indigo-500" />
                                                            <span className="text-sm">{asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : 'No Date'}</span>
                                                        </div>
                                                    </div>

                                                    {submission?.score !== null && submission?.score !== undefined ? (
                                                        <div className="text-center md:text-right">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Grade</p>
                                                            <p className="text-xl font-black text-indigo-600">{submission.score}%</p>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center md:text-right">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Max Score</p>
                                                            <p className="text-xl font-black text-gray-900">{asgn.maxScore ?? '—'}</p>
                                                        </div>
                                                    )}

                                                    <div className="hidden md:flex w-10 h-10 bg-gray-50 text-gray-400 rounded-xl items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                        <ArrowUpRight size={20} />
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
                                <h3 className="text-2xl font-black text-gray-900 mb-2">No Assignments Yet</h3>
                                <p className="text-gray-500 font-medium max-w-xs mx-auto">
                                    Your instructor hasn't posted any assignments for this class yet. Check back later!
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-8">
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentClassDetail;

