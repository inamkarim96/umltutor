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
            <div className="px-4 sm:px-6 lg:px-8 pt-8">
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

            <div className="bg-white border-b border-gray-100 shadow-sm p-4 md:p-12 mb-10 overflow-hidden relative">
                <div>
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
                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-100">
                                    {currentClass.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                            {currentClass.code}
                                        </span>
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1">
                                            <GraduationCap size={10} /> Enrolled
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
                                {currentClass.name}
                            </h1>
                            <p className="text-gray-500 max-w-2xl font-medium text-lg leading-relaxed">
                                {currentClass.description || "Welcome back to your workspace. Stay updated with announcements and manage your assignments."}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="bg-[#f1f5f9] px-6 py-6 rounded-3xl border border-white shadow-inner flex flex-col items-center min-w-[140px]">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <p className="text-xs font-bold text-gray-700 uppercase tracking-tighter tracking-wider">Active</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full bg-white border-y border-gray-100 flex overflow-x-auto no-scrollbar sticky top-0 z-20 shadow-sm shadow-gray-50/50">
                <div className="flex items-center gap-12 px-8 md:px-12">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-6 relative font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap group ${
                                activeTab === tab.id 
                                ? 'text-indigo-600' 
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`}>
                                    {React.cloneElement(tab.icon, { size: 18 })}
                                </span>
                                {tab.label}
                            </div>
                            
                            {/* Active Indicator */}
                            {activeTab === tab.id ? (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-600 rounded-t-full shadow-[0_-4px_12px_rgba(79,70,229,0.3)]" />
                            ) : (
                                <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-0.5 bg-gray-200 transition-all duration-300" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 sm:px-6 lg:px-8 mt-8">
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
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                <BookOpen size={24} className="text-indigo-600" /> Assignments
                                <span className="ml-2 px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">{classAssignments.length}</span>
                            </h2>
                        </div>

                        {classAssignments.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
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

