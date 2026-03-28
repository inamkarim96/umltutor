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
    LogOut
} from 'lucide-react';
import NotificationDropdown from '../../components/shared/NotificationDropdown';

const TeacherDashboard = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { logout } = useAuth();

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
                        Welcome back, Prof. {user?.firstName || user?.name || 'Teacher'}!
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
                                    onClick={() => navigate(`/teacher/classes/${c.id}`)}
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

