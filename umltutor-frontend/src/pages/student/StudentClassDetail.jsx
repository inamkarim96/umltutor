import React, { useEffect, useMemo, useState } from 'react';
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
    ArrowUpRight,
    MessageSquare,
    Files,
    Hash
} from 'lucide-react';
import AnnouncementBoard from '../../features/teacher/components/AnnouncementBoard';
import FileBrowser from '../../features/teacher/components/FileBrowser';

const StudentClassDetail = () => {
    const { name } = useParams();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const allClasses = useAppSelector(selectClasses);
    const assignments = useAppSelector(selectAllAssignments) || [];
    const submissionsMap = useAppSelector(selectSubmissions);
    const user = useAppSelector(selectUser);
    
    // UI State
    const [activeTab, setActiveTab] = useState('posts'); // posts, files, assignments, grades

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

    const tabs = [
        { id: 'posts', label: 'Post', icon: <MessageSquare size={18} /> },
        { id: 'files', label: 'File', icon: <Files size={18} /> },
        { id: 'assignments', label: 'Assignment', icon: <BookOpen size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
                <button
                    onClick={() => navigate('/student/dashboard')}
                    className="mb-6 text-gray-500 font-extrabold text-sm hover:text-indigo-600 transition-all flex items-center gap-2 group"
                >
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                        <ArrowLeft size={16} />
                    </div>
                    Back to Dashboard
                </button>
            </div>

            {/* Class Hero Header */}
            <div className="bg-white border-b border-gray-100 shadow-sm">
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
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                            {currentClass.code}
                                        </span>
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
                                            <GraduationCap size={10} /> Student View
                                        </span>
                                    </div>
                                    <h1 className="text-4xl font-black text-gray-900 leading-tight">
                                        {currentClass.name}
                                    </h1>
                                </div>
                            </div>
                            <p className="text-gray-500 max-w-2xl font-medium leading-relaxed">
                                {currentClass.description || "Welcome back to your workspace. Stay updated with announcements and manage your assignments."}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <Hash size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Code</p>
                                    <p className="text-sm font-bold text-gray-900 font-mono">{currentClass.code}</p>
                                </div>
                            </div>
                            <div className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                    <BookOpen size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignments</p>
                                    <p className="text-sm font-bold text-gray-900">{classAssignments.length} Active</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-8 overflow-x-auto no-scrollbar pt-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-4 border-b-4 transition-all whitespace-nowrap ${
                                    activeTab === tab.id 
                                    ? 'border-indigo-600 text-indigo-600 font-black scale-105 px-2' 
                                    : 'border-transparent text-gray-400 font-bold hover:text-gray-600 px-2'
                                }`}
                            >
                                {tab.icon}
                                <span className="uppercase tracking-widest text-xs">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                {activeTab === 'posts' && (
                    <div className="animate-in fade-in duration-500">
                        <AnnouncementBoard classId={classId} />
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="animate-in fade-in duration-500 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[600px]">
                        <FileBrowser classId={classId} allowStudentUploads={currentClass.allowStudentUploads} />
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900">Class Assignments</h2>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white border border-gray-200 text-gray-400 text-[10px] font-bold rounded-lg uppercase tracking-widest">Sorted by Date</span>
                            </div>
                        </div>

                        {classAssignments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {classAssignments.map(asgn => {
                                    const submission = mySubmissions.find(s => s.assignmentId === asgn.id);
                                    const status = submission?.status?.toLowerCase();
                                    const isSubmitted = status === 'submitted' || status === 'graded';
                                    const isOverdue = asgn.deadline && new Date(asgn.deadline) < new Date() && !isSubmitted;

                                    return (
                                        <div
                                            key={asgn.id}
                                            onClick={() => navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between h-full"
                                        >
                                            <div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className={`px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-widest ${
                                                        status === 'graded' ? 'bg-indigo-50 text-indigo-600' :
                                                        status === 'submitted' ? 'bg-emerald-50 text-emerald-600' :
                                                        isOverdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                        {status === 'graded' ? 'Reviewed' :
                                                            status === 'submitted' ? 'Submitted' :
                                                                isOverdue ? 'Late' : 'Open'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                        {asgn.type || 'Standard'} Task
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
                                                    {asgn.title}
                                                </h3>
                                                <p className="text-gray-500 text-sm line-clamp-2 font-medium mb-6">
                                                    {asgn.description || "No specific instructions provided."}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Deadline</p>
                                                        <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs mt-0.5">
                                                            <Calendar size={12} className="text-indigo-500" />
                                                            {asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : '—'}
                                                        </div>
                                                    </div>
                                                    {submission?.score !== undefined && submission?.score !== null && (
                                                        <div>
                                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Score</p>
                                                            <p className="text-indigo-600 font-black text-sm">{submission.score}%</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-8 h-8 bg-gray-50 text-gray-400 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                    <ArrowUpRight size={18} />
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
                                <p className="text-gray-500 font-medium max-w-xs mx-auto">Your instructor hasn't posted any assignments yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentClassDetail;

