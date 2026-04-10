import React, { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectUser } from '../../features/auth';
import {
    selectClasses,
    fetchClasses,
    fetchStudents,
    selectClassroomLoading
} from '../../features/classroom';
import {
    selectAllAssignments,
    fetchAllAssignments
} from '../../features/assignments';
import {
    fetchAllSubmissionsForTeacher,
    selectSubmissions
} from '../../features/submissions';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    BookOpen,
    Send,
    Layout,
    Plus,
    Settings,
    ChevronRight,
    History,
    GraduationCap,
    Clock,
    LogOut,
    Mail,
    RefreshCw,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { useState } from 'react';
import { auth } from '../../config/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import NotificationDropdown from '../../components/shared/NotificationDropdown';

const TeacherDashboard = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { logout, authState } = useAuth();

    // Verification state
    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [verifMessage, setVerifMessage] = useState('');
    const [verifType, setVerifType] = useState('warning');

    const handleResendEmail = async () => {
        if (!auth.currentUser) return;
        setIsResending(true);
        try {
            await sendEmailVerification(auth.currentUser);
            setVerifMessage('Verification email sent! Please check your inbox.');
            setVerifType('success');
            setTimeout(() => setVerifMessage(''), 5000);
        } catch (error) {
            setVerifMessage('Failed to resend verification email.');
            setVerifType('error');
        } finally {
            setIsResending(false);
        }
    };

    const handleCheckStatus = async () => {
        if (!auth.currentUser) return;
        setIsChecking(true);
        try {
            await reload(auth.currentUser);
            if (auth.currentUser.emailVerified) {
                setVerifMessage('Email verified! Initializing session...');
                setVerifType('success');
                setTimeout(() => window.location.reload(), 1500);
            } else {
                setVerifMessage('Email still not verified. Please check your inbox.');
                setVerifType('warning');
                setTimeout(() => setVerifMessage(''), 4000);
            }
        } catch (error) {
            setVerifMessage('Error checking status.');
            setVerifType('error');
        } finally {
            setIsChecking(false);
        }
    };

    // Auth and Data Selectors
    const user = useAppSelector(selectUser);
    const classes = useAppSelector(selectClasses);
    const assignments = useAppSelector(selectAllAssignments) || [];
    const submissions = useAppSelector(selectSubmissions) || [];
    const isLoading = useAppSelector(selectClassroomLoading);

    // Fetch all required data on mount
    useEffect(() => {
        dispatch(fetchClasses('TEACHER'));
        dispatch(fetchAllAssignments('TEACHER'));
        dispatch(fetchAllSubmissionsForTeacher());
        dispatch(fetchStudents());
    }, [dispatch]);

    const assignmentsMap = (assignments || []).reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
    }, {});

    const stats = [
        {
            label: 'Total Classes',
            value: classes?.length || 0,
            icon: GraduationCap,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            path: '/teacher/classes'
        },
        {
            label: 'Total Students',
            value: (classes || []).reduce((sum, c) => sum + (c.studentCount || 0), 0),
            icon: Users,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            path: '/teacher/students'
        },
        {
            label: 'Active Assignments',
            value: (assignments || []).length,
            icon: BookOpen,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            path: '/teacher/assignments'
        },
        {
            label: 'Recent Submissions',
            value: (submissions || []).length,
            icon: Send,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            path: '/teacher/submissions'
        },
    ];

    const recentSubmissions = submissions
        // Only show real submissions (avoid synthetic placeholder rows)
        .filter((s) => {
            const id = s?.submissionId ?? s?.id;
            const numericId = Number(id);
            return !!s?.submittedAt && Number.isFinite(numericId) && numericId > 0;
        })
        .sort((a, b) => {
            const dateA = a?.submittedAt ? new Date(a.submittedAt) : 0;
            const dateB = b?.submittedAt ? new Date(b.submittedAt) : 0;
            return dateB - dateA;
        })
        .slice(0, 5);

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Welcome back, {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.name || 'Teacher'}!
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Here's an overview of your academic workspace today.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <NotificationDropdown />
                    <button
                        onClick={logout}
                        className="p-3 bg-white border border-red-100 text-red-500 rounded-xl font-bold shadow-sm hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Email Verification Banner */}
            {authState.needsEmailVerification && (
                <div className="mb-8 animate-in slide-in-from-top-4 duration-300">
                    <div className={`p-5 rounded-2xl border ${
                        verifType === 'success' ? 'bg-green-50 border-green-200' : 
                        verifType === 'error' ? 'bg-red-50 border-red-200' : 
                        'bg-amber-50 border-amber-200'
                    } shadow-sm overflow-hidden relative`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl ${verifType === 'success' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                                    <Mail size={24} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className={`text-base font-black ${verifType === 'success' ? 'text-green-900' : 'text-amber-900'}`}>
                                        {verifMessage || 'Action Required: Email Verification'}
                                    </h3>
                                    <p className={`text-sm font-medium ${verifType === 'success' ? 'text-green-700' : 'text-amber-700'}`}>
                                        {verifMessage ? '' : <>We've sent a link to <span className="font-bold">{auth.currentUser?.email}</span>. Please verify to access all features.</>}
                                    </p>
                                </div>
                            </div>
                            {!verifMessage && (
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={handleCheckStatus} disabled={isChecking} className="flex items-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-lg transition-all active:scale-95 disabled:opacity-50">
                                        {isChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={14} />} I'VE VERIFIED
                                    </button>
                                    <button onClick={handleResendEmail} disabled={isResending} className="flex items-center gap-2 py-2 px-4 border-2 border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-black rounded-lg transition-all active:scale-95 disabled:opacity-50">
                                        {isResending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw size={14} />} RESEND LINK
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        onClick={() => navigate(stat.path)}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                                    {stat.label}
                                </p>
                                <h3 className="text-3xl font-black text-gray-900 mt-1">{stat.value}</h3>
                            </div>
                            <div className={`w-12 h-12 ${stat.bgColor} ${stat.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lower Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Classes List */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <GraduationCap className="text-indigo-600" /> Your Classes
                        </h2>
                        <button
                            onClick={() => navigate('/teacher/classes')}
                            className="text-indigo-600 font-extrabold text-sm hover:underline flex items-center gap-1"
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {isLoading ? (
                            <div className="col-span-2 py-20 text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-gray-400 font-bold italic">Gathering classroom data...</p>
                            </div>
                        ) : classes.length > 0 ? (
                            classes.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => navigate(`/teacher/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-xl transition-all group cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm">
                                            {c.name.charAt(0)}
                                        </div>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                                            {c.code}
                                        </span>
                                    </div>
                                    <h4 className="font-extrabold text-gray-900 text-lg mb-1 group-hover:text-indigo-600 transition-colors">{c.name}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-2 font-medium">{c.description}</p>
                                    <div className="mt-6 flex items-center gap-4 text-xs font-bold text-gray-400">
                                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                                            <Users size={12} /> {c.studentCount || 0} Students
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                                            <BookOpen size={12} /> {c.totalAssignments || 0}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                                <p className="text-gray-400 font-bold italic">No classes found. Create one to get started!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Submissions */}
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <History className="text-emerald-600" /> Recent Submissions
                        </h2>
                        <button
                            onClick={() => navigate('/teacher/submissions')}
                            className="text-emerald-600 font-extrabold text-sm hover:underline flex items-center gap-1"
                        >
                            History <ChevronRight size={14} />
                        </button>
                    </div>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-2">
                        {isLoading ? (
                            <div className="p-12 text-center text-gray-400 italic">Updating feed...</div>
                        ) : recentSubmissions.length > 0 ? (
                            recentSubmissions.map((sub, idx) => (
                                <div
                                    key={sub.id}
                                    onClick={() => {
                                        const submissionId = sub?.submissionId ?? sub?.id;
                                        const numericId = Number(submissionId);
                                        if (Number.isFinite(numericId) && numericId > 0) {
                                            navigate(`/teacher/submissions/${numericId}`);
                                        }
                                    }}
                                    className={`p-4 flex items-center gap-4 hover:bg-emerald-50 rounded-2xl transition-all cursor-pointer group`}
                                >
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-lg group-hover:bg-white transition-colors shadow-sm">
                                        {sub.studentName?.charAt(0) || 'S'}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-sm font-black text-gray-900">{sub.studentName || 'Student'}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                            <BookOpen size={10} /> {assignmentsMap[sub.assignmentId]?.title || sub.assignmentTitle || 'Assignment'}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-gray-400 flex items-center gap-1">
                                            <Clock size={10} /> {new Date(sub.submittedAt).toLocaleDateString()}
                                        </span>
                                        <ChevronRight size={14} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-12 text-center text-gray-400 font-bold italic text-sm">
                                No recent activity
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;

