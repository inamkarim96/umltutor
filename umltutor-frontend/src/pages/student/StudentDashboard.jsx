import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectUser } from '../../features/auth';
import { useAuth } from '../../contexts/AuthContext';
import {
    selectClasses,
    joinClass,
    fetchClasses
} from '../../features/classroom';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import {
    BookOpen,
    Clock,
    CheckCircle,
    Plus,
    X,
    Users,
    GraduationCap,
    LogOut,
    Mail,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ArrowRight,
    ArrowLeft,
    Settings as SettingsIcon
} from 'lucide-react';
import NotificationDropdown from '../../components/shared/NotificationDropdown';
import SettingsPanel from '../../components/shared/SettingsPanel';

const StudentDashboard = () => {
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { logout: authLogout, authState } = useAuth();

    // Verification state
    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [verifMessage, setVerifMessage] = useState('');
    const [verifType, setVerifType] = useState('warning');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    const allClasses = useAppSelector(selectClasses);
    const allAssignments = useAppSelector(selectAllAssignments) || [];
    const mySubmissions = useAppSelector(selectSubmissions) || [];

    const [classCode, setClassCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');

    useEffect(() => {
        dispatch(fetchClasses('STUDENT'));
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch]);

    const myClasses = allClasses || [];
    const myAssignmentsFromMyClasses = allAssignments.filter(a =>
        myClasses.some(c => c.id === a.classId)
    );

    const stats = [
        {
            label: 'Joined Classes',
            value: myClasses.length,
            icon: BookOpen,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            path: '/student/classes'
        },
        {
            label: 'Pending Assignments',
            value: myAssignmentsFromMyClasses.filter(a => {
                const sub = mySubmissions.find(s => s.assignmentId === a.id);
                const status = sub?.status?.toLowerCase();
                return !sub || status === 'draft' || status === 'pending';
            }).length,
            icon: Clock,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            path: '/student/assignments/pending'
        },
        {
            label: 'Submitted Work',
            value: mySubmissions.filter(s => {
                const status = s.status?.toLowerCase();
                return status === 'submitted';
            }).length,
            icon: CheckCircle2,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            path: '/student/assignments/submitted'
        },
        {
            label: 'Reviewed Work',
            value: mySubmissions.filter(s => {
                const status = s.status?.toLowerCase();
                return status === 'graded' || status === 'completed';
            }).length,
            icon: CheckCircle,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            path: '/student/assignments/reviewed'
        },
    ];

    const handleJoinClass = async (e) => {
        e.preventDefault();
        setJoinError('');

        try {
            await dispatch(joinClass(classCode)).unwrap();
            setClassCode('');
            setIsJoining(false);
        } catch (error) {
            setJoinError(error || 'Failed to join class. Please check the code.');
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                        Hi, {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.name || 'Student'}!
                    </h1>
                </div>
                <div className="flex gap-4 items-center">
                    <NotificationDropdown />
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 bg-white border border-gray-100 text-gray-500 rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:border-gray-200 hover:text-indigo-600 transition-all flex items-center justify-center"
                        title="Settings"
                    >
                        <SettingsIcon size={20} />
                    </button>
                    <button
                        onClick={authLogout}
                        className="p-3 bg-white border border-red-100 text-red-500 rounded-xl font-bold shadow-sm hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* Email Verification Banner */}
            {authState.needsEmailVerification && (
                <div className="mb-8 animate-in slide-in-from-top-4 duration-300">
                    <div className={`p-5 rounded-2xl border ${verifType === 'success' ? 'bg-green-50 border-green-200' :
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
                        onClick={() => stat.path && navigate(stat.path)}
                        className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group ${stat.path ? 'cursor-pointer' : ''}`}
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

            {/* Main Content Partition */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Classes Grid */}
                <div className="lg:col-span-3">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <BookOpen className="text-indigo-600" /> My Classes
                        </h2>
                        <button
                            onClick={() => navigate('/student/classes')}
                            className="text-indigo-600 font-extrabold text-sm hover:underline flex items-center gap-1"
                        >
                            View All <ChevronRight size={14} />
                        </button>
                    </div>
                    {myClasses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {myClasses.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                    className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group cursor-pointer relative overflow-hidden h-full flex flex-col"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
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
                                            <GraduationCap size={12} /> {c.teacherName || 'Teacher'}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-full">
                                            <BookOpen size={12} /> {c.totalAssignments || 0}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                            <div className="text-4xl mb-4">📚</div>
                            <p className="text-gray-500 font-medium">You haven't joined any classes yet.</p>
                            <button
                                onClick={() => setIsJoining(true)}
                                className="mt-4 text-indigo-600 font-bold hover:underline"
                            >
                                Join your first class now
                            </button>
                        </div>
                    )}
                </div>

                {/* Pending Tasks */}
                <div>
                    <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                        <Clock className="text-amber-600" /> Upcoming Deadlines
                    </h2>
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-2">
                        {myAssignmentsFromMyClasses.length > 0 ? (
                            myAssignmentsFromMyClasses
                                .filter(a => {
                                    const sub = mySubmissions.find(s => s.assignmentId === a.id);
                                    const status = sub?.status?.toLowerCase();
                                    return !sub || status === 'draft' || status === 'pending';
                                })
                                .slice(0, 5)
                                .map((asgn, idx, arr) => (
                                    <div
                                        key={asgn.id}
                                        onClick={() => navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                        className={`p-4 hover:bg-amber-50 rounded-2xl transition-all cursor-pointer group flex items-center gap-4`}
                                    >
                                        <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black text-lg group-hover:bg-white transition-colors shadow-sm">
                                            {asgn.title?.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-gray-900 group-hover:text-amber-700 transition-colors">{asgn.title}</p>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                <GraduationCap size={10} /> {myClasses.find(c => c.id === asgn.classId)?.name}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end shrink-0">
                                            <span className="text-[10px] font-black text-gray-400 flex items-center gap-1">
                                                <Clock size={10} /> {asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : 'No Date'}
                                            </span>
                                            <ChevronRight size={14} className="text-gray-300 group-hover:text-amber-500 transition-colors" />
                                        </div>
                                    </div>
                                ))
                        ) : (
                            <div className="p-8 text-center">
                                <p className="text-gray-400 italic text-sm">All caught up!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Join Class Modal */}
            {isJoining && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-gray-900">Join a Class</h2>
                                <button onClick={() => setIsJoining(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={24} />
                                </button>
                            </div>
                            <p className="text-gray-500 text-sm mb-6">Ask your teacher for the class code, then enter it below to join the classroom.</p>
                            <form onSubmit={handleJoinClass} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Class Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={classCode}
                                        onChange={e => setClassCode(e.target.value.toUpperCase())}
                                        className={`w-full px-4 py-4 rounded-xl border ${joinError ? 'border-red-300 ring-red-50' : 'border-gray-200 focus:ring-indigo-500'} bg-gray-50 text-center text-2xl font-black tracking-widest outline-none transition-all`}
                                        placeholder="E.G. SE101A"
                                        maxLength={8}
                                    />
                                    {joinError && <p className="mt-2 text-xs font-bold text-red-500">{joinError}</p>}
                                </div>
                                <button
                                    type="submit"
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                >
                                    Join Classroom
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;

