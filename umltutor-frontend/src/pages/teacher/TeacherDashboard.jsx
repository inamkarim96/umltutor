import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectUser } from '../../features/auth';
import {
    selectClasses,
    fetchClasses,
    selectClassroomLoading
} from '../../features/classroom';
import {
    selectAllAssignments,
    fetchAllAssignments
} from '../../features/assignments';
import {
    fetchAllSubmissionsForTeacher,
    fetchTutorialRequests,
    selectSubmissions,
    selectTutorialRequests,
} from '../../features/submissions';
import TutorialRequestsPanel from '../../features/teacher/components/TutorialRequestsPanel';
import { useAuth } from '../../contexts/AuthContext';
import {
    Mail,
    RefreshCw,
    CheckCircle2,
    BookOpen,
    Clock,
    Star,
    Plus,
    Users,
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import HeroBanner from '../../components/dashboard/HeroBanner';
import StatisticsCard from '../../components/dashboard/StatisticsCard';
import DashboardCard from '../../components/dashboard/DashboardCard';
import { auth } from '../../config/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';



const TeacherDashboard = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { authState } = useAuth();

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

    const user = useAppSelector(selectUser);
    const classes = useAppSelector(selectClasses) || [];
    const assignments = useAppSelector(selectAllAssignments) || [];
    const submissions = useAppSelector(selectSubmissions) || [];
    const tutorialRequests = useAppSelector(selectTutorialRequests) || [];
    const isLoading = useAppSelector(selectClassroomLoading);

    useEffect(() => {
        dispatch(fetchClasses('TEACHER'));
        dispatch(fetchAllAssignments('TEACHER'));
        dispatch(fetchAllSubmissionsForTeacher());
        dispatch(fetchTutorialRequests({ status: 'pending', page: 1, limit: 5 }));
    }, [dispatch]);

    const assignmentsMap = assignments.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
    }, {});

    const now = Date.now();
    const activeAssignments = assignments.filter(a => {
        if (!a.deadline) return true;
        return new Date(a.deadline) >= now;
    });

    const pendingReview = submissions.filter(s => {
        const status = s?.status?.toLowerCase();
        return status === 'submitted';
    }).length;

    const pendingTutorialRequests = tutorialRequests.filter(
        (r) => r.tutorialRequestStatus === 'pending'
    ).length;

    const recentSubmissions = submissions
        .filter((s) => {
            const id = s?.submissionId ?? s?.id;
            const numericId = Number(id);
            return !!s?.submittedAt && Number.isFinite(numericId) && numericId > 0;
        })
        .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
        .slice(0, 5);

    const today = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString(undefined, dateOptions);
    const greeting = today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening';



    const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Teacher';
    const greetEmoji = today.getHours() < 12 ? '☀️' : today.getHours() < 17 ? '🌤️' : '🌙';

    const stats = [
        {
            label: 'Total Classes',
            value: classes.length,
            note: 'Active classrooms',
            icon: <BookOpen size={20} />,
            color: 'blue',
            path: '/teacher/classes',
        },
        {
            label: 'Active Assignments',
            value: activeAssignments.length,
            note: 'Across all classes',
            icon: <Clock size={20} />,
            color: 'amber',
            path: '/teacher/assignments',
        },
        {
            label: 'Total Submissions',
            value: submissions.length,
            note: 'Student work received',
            icon: <Users size={20} />,
            color: 'green',
            path: '/teacher/submissions',
        },
        {
            label: 'Pending Review',
            value: pendingReview,
            note: 'Awaiting your feedback',
            icon: <Star size={20} />,
            color: 'purple',
            path: '/teacher/submissions',
        },
    ];

    const hero = (
        <HeroBanner
            roleName="Teacher"
            greeting={greeting}
            userName={firstName}
            greetEmoji={greetEmoji}
            dateStr={dateString}
            subText={pendingReview === 0
                ? '🎉 All caught up on grading!'
                : `You have ${pendingReview} submission${pendingReview !== 1 ? 's' : ''} awaiting review.`
            }
            primaryAction={{
                icon: <Plus size={16} />,
                label: 'New Assignment',
                onClick: () => navigate('/teacher/assignments')
            }}
        />
    );

    const statCards = stats.map((stat) => (
        <StatisticsCard key={stat.label} {...stat} />
    ));

    return (
        <>
            {/* Email Verification Banner */}
            {authState.needsEmailVerification && (
                <div className="mb-8 sdb-root">
                    <div className={`sdb-verif-banner ${verifType}`}>
                        <div className="sdb-verif-body">
                            <div className={`sdb-verif-icon ${verifType}`}>
                                <Mail size={24} />
                            </div>
                            <div>
                                <h3 className={`sdb-verif-title ${verifType}`}>
                                    {verifMessage || 'Action Required: Email Verification'}
                                </h3>
                                <p className={`sdb-verif-text ${verifType}`}>
                                    {verifMessage ? '' : <>We've sent a link to <strong>{auth.currentUser?.email}</strong>. Please verify to access all features.</>}
                                </p>
                            </div>
                        </div>
                        {!verifMessage && (
                            <div className="sdb-verif-actions">
                                <button onClick={handleCheckStatus} disabled={isChecking} className="sdb-verif-btn primary">
                                    {isChecking ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} I'VE VERIFIED
                                </button>
                                <button onClick={handleResendEmail} disabled={isResending} className="sdb-verif-btn secondary">
                                    {isResending ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} RESEND LINK
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <DashboardLayout hero={hero} stats={statCards}>
                <div className="sdb-col">

                    {/* Classes */}
                    <DashboardCard
                        title="Your Classes"
                        subtitle="Classrooms you manage"
                        icon={<BookOpen size={16} />}
                        actionLabel="View All"
                        onActionClick={() => navigate('/teacher/classes')}
                    >
                        <div className="sdb-class-list">
                            {isLoading ? (
                                <div className="sdb-empty">Loading classes...</div>
                            ) : classes.length > 0 ? (
                                classes.slice(0, 4).map(c => (
                                    <div key={c.id} className="sdb-class-row" onClick={() => navigate(`/teacher/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                    >
                                        <div className="sdb-class-avatar">{c.name.charAt(0)}</div>
                                        <div className="sdb-class-info">
                                            <div className="sdb-class-name">{c.name}</div>
                                            <div className="sdb-class-meta">{c.description || 'No description'}</div>
                                            <div className="sdb-class-meta">
                                                <span>
                                                    <svg viewBox="0 0 24 24" width="11" height="11"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                                    {c.studentCount || 0} students
                                                </span>
                                                <span>
                                                    <svg viewBox="0 0 24 24" width="11" height="11"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                                                    {c.totalAssignments || 0} assignments
                                                </span>
                                            </div>
                                        </div>
                                        <span className="sdb-class-badge">{c.code || 'CODE'}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="sdb-empty">No classes yet. Create one to get started!</div>
                            )}
                        </div>
                    </DashboardCard>

                    {/* Recent Submissions */}
                    <DashboardCard
                        title="Recent Submissions"
                        subtitle="Latest student work"
                        icon={<CheckCircle2 size={16} />}
                        actionLabel="All"
                        onActionClick={() => navigate('/teacher/submissions')}
                    >
                        <div className="sdb-class-list">
                            {isLoading ? (
                                <div className="sdb-empty">Loading...</div>
                            ) : recentSubmissions.length > 0 ? (
                                recentSubmissions.map(sub => (
                                    <div key={sub.id} className="sdb-class-row" onClick={() => {
                                        const submissionId = sub?.submissionId ?? sub?.id;
                                        const numericId = Number(submissionId);
                                        if (Number.isFinite(numericId) && numericId > 0) {
                                            const assignmentName = assignmentsMap[sub.assignmentId]?.title || sub.assignmentTitle || 'assignment';
                                            const studentName = sub.studentName || 'student';
                                            const aSlug = assignmentName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                            const sSlug = studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                            navigate(`/teacher/submissions/${aSlug}/${sSlug}/${numericId}`);
                                        }
                                    }}>
                                        <div className="sdb-class-avatar">{sub.studentName?.charAt(0) || 'S'}</div>
                                        <div className="sdb-class-info">
                                            <div className="sdb-class-name">{sub.studentName || 'Student'}</div>
                                            <div className="sdb-class-meta">{assignmentsMap[sub.assignmentId]?.title || sub.assignmentTitle || 'Assignment'}</div>
                                        </div>
                                        <div className="sdb-class-meta">{new Date(sub.submittedAt).toLocaleDateString()}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="sdb-empty">No recent activity</div>
                            )}
                        </div>
                    </DashboardCard>

                    {/* Active Assignments */}
                    <DashboardCard
                        title="Active Assignments"
                        subtitle="Assignments across your classes"
                        icon={<Clock size={16} />}
                        actionLabel="View All"
                        onActionClick={() => navigate('/teacher/assignments')}
                    >
                        <div className="sdb-class-list">
                            {activeAssignments.slice(0, 4).map(asgn => (
                                <div key={asgn.id} className="sdb-class-row" onClick={() => navigate(`/teacher/assignments/${asgn.title?.toLowerCase().replace(/\s+/g, '-')}`)}>
                                    <div className="sdb-class-avatar" style={{ background: 'var(--surface-3)', color: 'var(--accent)' }}>{asgn.title?.charAt(0)}</div>
                                    <div className="sdb-class-info">
                                        <div className="sdb-class-name">{asgn.title}</div>
                                        <div className="sdb-class-meta">{classes.find(c => c.id === asgn.classId)?.name || 'Class'}</div>
                                    </div>
                                    <div className="sdb-class-meta">
                                        {asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : 'No deadline'}
                                    </div>
                                </div>
                            ))}
                            {assignments.length === 0 && (
                                <div className="sdb-empty">No assignments yet</div>
                            )}
                        </div>
                    </DashboardCard>

                    {/* Tutorial Requests */}
                    <DashboardCard
                        title="Tutorial Requests"
                        subtitle={`${pendingTutorialRequests} pending approval`}
                        icon={<Users size={16} />}
                        actionLabel="Manage"
                        onActionClick={() => navigate('/teacher/tutorial-requests')}
                    >
                        <div className="sdb-workbench-body">
                            <TutorialRequestsPanel compact showHeader={false} />
                        </div>
                    </DashboardCard>

                </div>
            </DashboardLayout>
        </>
    );
};

export default TeacherDashboard;
