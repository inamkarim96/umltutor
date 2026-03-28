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
import { BookOpen, Clock, CheckCircle, Plus, X, Users, GraduationCap, LogOut } from 'lucide-react';
import NotificationDropdown from '../../components/shared/NotificationDropdown';

const StudentDashboard = () => {
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { logout: authLogout } = useAuth();
    
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
        { label: 'Joined Classes', value: myClasses.length, icon: <BookOpen />, color: 'bg-blue-500', path: '/student/classes' },
        { 
            label: 'Pending Assignments', 
            value: myAssignmentsFromMyClasses.filter(a => {
                const sub = mySubmissions.find(s => s.assignmentId === a.id);
                const status = sub?.status?.toLowerCase();
                return !sub || status === 'draft' || status === 'pending';
            }).length, 
            icon: <Clock />, 
            color: 'bg-amber-500', 
            path: '/student/assignments/pending' 
        },
        { 
            label: 'Submitted Work', 
            value: mySubmissions.filter(s => {
                const status = s.status?.toLowerCase();
                return status === 'submitted';
            }).length, 
            icon: <CheckCircle className="text-blue-500" />, 
            color: 'bg-blue-500', 
            path: '/student/assignments/submitted' 
        },
        { 
            label: 'Reviewed Work', 
            value: mySubmissions.filter(s => {
                const status = s.status?.toLowerCase();
                return status === 'graded' || status === 'completed';
            }).length, 
            icon: <CheckCircle className="text-emerald-500" />, 
            color: 'bg-emerald-500', 
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
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        Hi, {user?.firstName || user?.name || 'Student'}!
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Ready to continue your learning journey?</p>
                </div>
                <div className="flex gap-4 items-center">
                    <NotificationDropdown />
                    <button
                        onClick={authLogout}
                        className="p-3 bg-white border border-red-100 text-red-500 rounded-xl font-bold shadow-sm hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center"
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {stats.map((stat, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => stat.path && navigate(stat.path)}
                        className={`bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all ${stat.path ? 'cursor-pointer' : ''}`}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                                <h3 className="text-3xl font-black text-gray-900 mt-1">{stat.value}</h3>
                            </div>
                            <div className={`w-12 h-12 ${stat.color} bg-opacity-10 rounded-xl flex items-center justify-center text-2xl text-blue-600`}> 
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Partition */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Classes Grid */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <BookOpen className="text-indigo-600" /> My Classes
                    </h2>
                    <p className="text-gray-500 text-sm mb-6">Click on any class to view assignments and access the UML editor</p>
                    {myClasses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {myClasses.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg"> 
                                            {c.name.charAt(0)}
                                        </div>
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest"> 
                                            {c.code}
                                        </span>
                                    </div>
                                    <h4 className="font-extrabold text-gray-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors">{c.name}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{c.description}</p>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                            <GraduationCap size={14} />
                                            <span>Prof. {c.teacherName || 'Teacher'}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-semibold text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <BookOpen size={14} />
                                                {c.totalAssignments || 0} Assignments
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users size={14} />
                                                {c.totalStudents || 0} Students
                                            </span>
                                        </div>
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
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Upcoming Deadlines</h2>
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
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
                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${idx !== arr.length - 1 ? 'border-b border-gray-50' : ''}`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{asgn.title}</p>
                                                <p className="text-xs text-gray-500"> 
                                                    {myClasses.find(c => c.id === asgn.classId)?.name}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pending</span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                            📅 Due {asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : 'No Date'}
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

