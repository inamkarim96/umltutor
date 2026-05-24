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
            <div className="min-h-screen flex flex-col items-center justify-center bg-transparent p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
                <p className="text-muted font-medium">Loading class details...</p>
            </div>
        );
    }

    const tabs = [
        { id: 'posts', label: 'Post', icon: <MessageSquare size={18} /> },
        { id: 'files', label: 'File', icon: <Files size={18} /> },
        { id: 'assignments', label: 'Assignment', icon: <BookOpen size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-transparent pb-12">
            <div className="px-4 sm:px-6 lg:px-8 pt-8">
                <button
                    onClick={() => navigate('/student/dashboard')}
                    className="mb-6 text-muted font-extrabold text-sm hover:text-accent transition-all flex items-center gap-2 group"
                >
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-card border border-black/5 group-hover:bg-accent/10 group-hover:border-accent/10 transition-all">
                        <ArrowLeft size={16} />
                    </div>
                    Back to Dashboard
                </button>
            </div>

            <div className="bg-white border-b border-black/5 shadow-card p-4 md:p-12 mb-10 overflow-hidden relative">
                <div>
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-xs font-bold font-body text-gray-400 mb-6 uppercase tracking-widest">
                        <Link to="/student/dashboard" className="hover:text-accent transition-colors">Dashboard</Link>
                        <ChevronRight size={14} />
                        <span className="text-accent">Classes</span>
                        <ChevronRight size={14} />
                        <span className="text-ink">{currentClass.name}</span>
                    </nav>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-accent text-white rounded-lg flex items-center justify-center font-extrabold font-heading text-xl shadow-hover shadow-accent/20">
                                    {currentClass.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-extrabold font-heading rounded-lg uppercase tracking-widest">
                                            {currentClass.code}
                                        </span>
                                        <span className="px-3 py-1 bg-status-green/10 text-status-green text-[10px] font-extrabold font-heading rounded-lg uppercase tracking-widest flex items-center gap-1">
                                            <GraduationCap size={10} /> Enrolled
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <h1 className="text-5xl font-extrabold font-heading text-ink tracking-tight mb-4 leading-tight">
                                {currentClass.name}
                            </h1>
                            <p className="text-muted max-w-2xl font-medium text-lg leading-relaxed">
                                {currentClass.description || "Welcome back to your workspace. Stay updated with announcements and manage your assignments."}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="bg-[#f1f5f9] px-6 py-6 rounded-3xl border border-white shadow-inner flex flex-col items-center min-w-[140px]">
                                <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-status-green/100 animate-pulse"></div>
                                    <p className="text-xs font-bold font-body text-gray-700 uppercase tracking-tighter tracking-wider">Active</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full bg-white border-y border-black/5 flex overflow-x-auto no-scrollbar sticky top-0 z-20 shadow-card shadow-gray-50/50">
                <div className="flex items-center gap-12 px-8 md:px-12">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-6 relative font-extrabold font-heading text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap group ${
                                activeTab === tab.id 
                                ? 'text-accent' 
                                : 'text-gray-400 hover:text-muted'
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
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-accent rounded-t-full shadow-[0_-4px_12px_rgba(79,70,229,0.3)]" />
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
                    <div className="animate-in fade-in duration-500 bg-white rounded-lg border border-black/5 shadow-card overflow-hidden min-h-[600px]">
                        <FileBrowser classId={classId} allowStudentUploads={currentClass.allowStudentUploads} />
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-extrabold font-heading text-ink flex items-center gap-3">
                                <BookOpen size={24} className="text-accent" /> Assignments
                                <span className="ml-2 px-3 py-1 bg-surface-3 text-muted text-xs rounded-full">{classAssignments.length}</span>
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
                                            className="bg-white p-6 rounded-3xl border border-black/5 shadow-card hover:border-accent/20 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between h-full"
                                        >
                                            <div>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className={`px-2 py-0.5 text-[10px] font-extrabold font-heading rounded uppercase tracking-widest ${
                                                        status === 'graded' ? 'bg-accent/10 text-accent' :
                                                        status === 'submitted' ? 'bg-status-green/10 text-status-green' :
                                                        isOverdue ? 'bg-status-red/10 text-status-red' : 'bg-amber-50 text-amber-600'
                                                    }`}>
                                                        {status === 'graded' ? 'Reviewed' :
                                                            status === 'submitted' ? 'Submitted' :
                                                                isOverdue ? 'Late' : 'Open'}
                                                    </span>
                                                    <span className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">
                                                        {asgn.type || 'Standard'} Task
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold font-body text-ink group-hover:text-accent transition-colors mb-2">
                                                    {asgn.title}
                                                </h3>
                                                <p className="text-muted text-sm line-clamp-2 font-medium mb-6">
                                                    {asgn.description || "No specific instructions provided."}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                                                <div className="flex items-center gap-4">
                                                    <div>
                                                        <p className="text-[9px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">Deadline</p>
                                                        <div className="flex items-center gap-1.5 text-ink font-bold font-body text-xs mt-0.5">
                                                            <Calendar size={12} className="text-indigo-500" />
                                                            {asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : '—'}
                                                        </div>
                                                    </div>
                                                    {submission?.score !== undefined && submission?.score !== null && (
                                                        <div>
                                                            <p className="text-[9px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">Score</p>
                                                            <p className="text-accent font-extrabold font-heading text-sm">{submission.score}%</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-8 h-8 bg-surface-3 text-gray-400 rounded-lg flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                                                    <ArrowUpRight size={18} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white p-20 rounded-[40px] border border-dashed border-black/10 text-center">
                                <div className="w-20 h-20 bg-surface-3 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                    <FileText size={32} className="text-gray-300" />
                                </div>
                                <h3 className="text-2xl font-extrabold font-heading text-ink mb-2">No Assignments Yet</h3>
                                <p className="text-muted font-medium max-w-xs mx-auto">Your instructor hasn't posted any assignments yet.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentClassDetail;

