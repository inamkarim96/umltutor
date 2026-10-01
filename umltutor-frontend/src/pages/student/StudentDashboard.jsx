import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectUser } from '../../features/auth';
import { selectClasses, joinClass, fetchClasses } from '../../features/classroom';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import {
    X, BookOpen, Clock, CheckCircle2, Users, ArrowRight,
    Plus, Star, TrendingUp
} from 'lucide-react';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import HeroBanner from '../../components/dashboard/HeroBanner';
import StatisticsCard from '../../components/dashboard/StatisticsCard';
import DashboardCard from '../../components/dashboard/DashboardCard';
import ClassRow from '../../components/shared/ClassRow';
import EmptyState from '../../components/shared/EmptyState';
import StatusChip from '../../components/shared/StatusChip';

/* ─── Small utility: deadline urgency ─── */
function getDeadlineStatus(deadline) {
    if (!deadline) return 'none';
    const diff = new Date(deadline) - Date.now();
    const days = diff / 86400000;
    if (diff < 0) return 'overdue';
    if (days <= 2) return 'soon';
    return 'normal';
}



/* ─── Deadline chip component ─── */
function DeadlineChip({ deadline }) {
    const status = getDeadlineStatus(deadline);
    if (status === 'none') return <span className="sdb-deadline-chip sdb-dc-none">No deadline</span>;
    const label = status === 'overdue'
        ? 'Overdue'
        : `Due ${new Date(deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    return <span className={`sdb-deadline-chip sdb-dc-${status}`}>{label}</span>;
}

const StudentDashboard = () => {
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

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

    const pendingAssignments = myAssignmentsFromMyClasses.filter(a => {
        const sub = mySubmissions.find(s => s.assignmentId === a.id);
        const status = (sub?.status || a.status || '').toLowerCase();
        return status !== 'submitted' && status !== 'graded';
    });

    const submittedCount = mySubmissions.filter(s => s.status?.toLowerCase() === 'submitted').length;
    const reviewedCount = mySubmissions.filter(s => ['graded', 'completed'].includes(s.status?.toLowerCase())).length;
    const overdueCount = pendingAssignments.filter(a => getDeadlineStatus(a.deadline) === 'overdue').length;

    const handleJoinClass = async (e) => {
        e.preventDefault();
        setJoinError('');
        try {
            await dispatch(joinClass(classCode)).unwrap();
            setClassCode('');
            setIsJoining(false);
            dispatch(fetchClasses('STUDENT'));
        } catch (err) {
            setJoinError(err || 'Failed to join class. Please check the code.');
        }
    };

    const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Student';
    const today = new Date();
    const hr = today.getHours();
    const greeting = hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening';
    const greetEmoji = hr < 12 ? '☀️' : hr < 17 ? '🌤️' : '🌙';
    const dateStr = today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const completionRate = myAssignmentsFromMyClasses.length > 0
        ? Math.round(((submittedCount + reviewedCount) / myAssignmentsFromMyClasses.length) * 100)
        : 0;

    /* ── Stats ── */
    const stats = [
        { label: 'Classes', value: myClasses.length, note: 'Enrolled', icon: <BookOpen size={20} />, color: 'blue', path: '/student/classes' },
        { label: 'Pending', value: pendingAssignments.length, note: overdueCount > 0 ? `${overdueCount} overdue` : 'Awaiting work', icon: <Clock size={20} />, color: 'amber', path: '/student/upcoming', badge: overdueCount > 0 ? `${overdueCount}` : null },
        { label: 'Submitted', value: submittedCount, note: 'Under review', icon: <CheckCircle2 size={20} />, color: 'green', path: '/student/submitted' },
        { label: 'Reviewed', value: reviewedCount, note: 'Feedback received', icon: <Star size={20} />, color: 'purple', path: '/student/reviewed' },
    ];

    const heroProgress = myAssignmentsFromMyClasses.length > 0 ? {
        label: 'Overall Completion',
        percentage: completionRate,
        note: `${submittedCount + reviewedCount} of ${myAssignmentsFromMyClasses.length} done`
    } : null;

    /* ── Upcoming (sorted by deadline) ── */
    const upcoming = [...pendingAssignments]
        .sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        })
        .slice(0, 5);

    /* ── Recent graded submissions ── */
    const recentGraded = mySubmissions
        .filter(s => ['graded', 'completed'].includes(s.status?.toLowerCase()))
        .slice(0, 3)
        .map(s => ({
            ...s,
            assignmentTitle: myAssignmentsFromMyClasses.find(a => a.id === s.assignmentId)?.title || 'Assignment'
        }));

    const hero = (
        <HeroBanner
            roleName="Student"
            greeting={greeting}
            userName={firstName}
            greetEmoji={greetEmoji}
            dateStr={dateStr}
            subText={
                pendingAssignments.length === 0
                    ? 'All caught up, great work!'
                    : overdueCount > 0
                        ? `You have ${overdueCount} overdue assignment${overdueCount !== 1 ? 's' : ''}, act now!`
                        : `You have ${pendingAssignments.length} pending assignment${pendingAssignments.length !== 1 ? 's' : ''}, let's get to it!`
            }
            primaryAction={{ icon: <Plus size={16} />, label: 'Join a Class', onClick: () => setIsJoining(true) }}
            secondaryAction={
                pendingAssignments.length > 0
                    ? { icon: <ArrowRight size={16} />, label: 'View Assignments', onClick: () => navigate('/student/upcoming') }
                    : null
            }
            progress={heroProgress}
        />
    );

    const statCards = stats.map(stat => <StatisticsCard key={stat.label} {...stat} />);

    const sidebar = null;

    return (
        <>
            <DashboardLayout hero={hero} stats={statCards} sidebar={sidebar}>
                <div className="sdb-col">

                    {/* ─── Upcoming Assignments ─── */}
                    <DashboardCard
                        title="Upcoming Assignments"
                        subtitle="Sorted by deadline, act on overdue items first"
                        icon={<Clock size={16} />}
                        badge={upcoming.length > 0 ? String(upcoming.length) : null}
                        actionLabel="View All"
                        onActionClick={() => navigate('/student/upcoming')}
                    >
                        {upcoming.length > 0 ? (
                            <div className="sdb-asgn-list">
                                {upcoming.map(a => {
                                    const dlStatus = getDeadlineStatus(a.deadline);
                                    const sub = mySubmissions.find(s => s.assignmentId === a.id);
                                    const statusLabel = (sub?.status || a.status || 'pending').toLowerCase();
                                    const className = myClasses.find(c => c.id === a.classId)?.name;
                                    return (
                                        <div
                                            key={a.id}
                                            className={`sdb-asgn-row${dlStatus === 'overdue' ? ' sdb-asgn-row-overdue' : ''}`}
                                            onClick={() => navigate(`/student/classes/${myClasses.find(c => c.id === a.classId)?.name?.toLowerCase().replace(/\s+/g, '-')}`)}
                                        >
                                            <div className="sdb-asgn-icon-wrap">
                                                {dlStatus === 'overdue'
                                                    ? <span></span>
                                                    : <BookOpen size={22} />
                                                }
                                            </div>
                                            <div className="sdb-asgn-info">
                                                <div className="sdb-asgn-title-row">
                                                    <span className="sdb-asgn-title">{a.title}</span>
                                                    <span className={`sdb-asgn-status-chip sdb-asc-${statusLabel}`}>{statusLabel}</span>
                                                </div>
                                                {a.description && (
                                                    <p className="sdb-asgn-desc">{a.description}</p>
                                                )}
                                                <div className="sdb-asgn-meta-row">
                                                    {className && (
                                                        <span className="sdb-asgn-class-tag">
                                                            <Users size={11} /> {className}
                                                        </span>
                                                    )}
                                                    <DeadlineChip deadline={a.deadline} />
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="sdb-asgn-arrow" />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="sdb-empty">
                                <CheckCircle2 size={36} className="sdb-empty-icon" style={{ color: 'var(--green)' }} />
                                <p>All assignments complete!</p>
                            </div>
                        )}
                    </DashboardCard>

                    {/* ─── My Classes ─── */}
                    <DashboardCard
                        title="My Classes"
                        subtitle="Courses you're enrolled in"
                        icon={<BookOpen size={16} />}
                        badge={myClasses.length > 0 ? String(myClasses.length) : null}
                        actionLabel="View All"
                        onActionClick={() => navigate('/student/classes')}
                    >
                        {myClasses.length > 0 ? (
                            <div className="sdb-class-list">
                                {myClasses.slice(0, 4).map(c => {
                                    const classAssignments = myAssignmentsFromMyClasses.filter(a => a.classId === c.id);
                                    const classDone = classAssignments.filter(a => {
                                        const sub = mySubmissions.find(s => s.assignmentId === a.id);
                                        const st = (sub?.status || '').toLowerCase();
                                        return st === 'submitted' || st === 'graded';
                                    }).length;
                                    const classProgress = classAssignments.length > 0
                                        ? Math.round((classDone / classAssignments.length) * 100)
                                        : null;
                                    return (
                                        <div
                                            key={c.id}
                                            className="sdb-class-row"
                                            onClick={() => navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                        >
                                            <div className="sdb-class-avatar">{c.name.charAt(0).toUpperCase()}</div>
                                            <div className="sdb-class-info">
                                                <div className="sdb-class-name">{c.name}</div>
                                                <div className="sdb-class-meta">
                                                    <span><Users size={11} /> {c.teacherName || 'Teacher'}</span>
                                                    <span><BookOpen size={11} /> {c.totalAssignments || classAssignments.length} assignments</span>
                                                </div>
                                                {classProgress !== null && (
                                                    <div className="sdb-class-progress-bar">
                                                        <div
                                                            className="sdb-class-progress-fill"
                                                            style={{ width: `${classProgress}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="sdb-class-badge">{c.code || 'CODE'}</span>
                                            <ArrowRight size={14} className="sdb-class-arrow" />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="sdb-empty">
                                <BookOpen size={36} className="sdb-empty-icon" />
                                <p>No classes yet</p>
                                <button onClick={() => setIsJoining(true)} className="sdb-empty-cta">
                                    <Plus size={14} /> Join your first class
                                </button>
                            </div>
                        )}
                    </DashboardCard>

                    {/* ─── Recent Grades ─── */}
                    {recentGraded.length > 0 && (
                        <DashboardCard
                            title="Recent Grades"
                            subtitle="Your latest reviewed submissions"
                            icon={<TrendingUp size={16} />}
                            actionLabel="View All"
                            onActionClick={() => navigate('/student/reviewed')}
                        >
                            <div className="sdb-grade-list">
                                {recentGraded.map((s, idx) => (
                                    <div key={s.id || idx} className="sdb-grade-row">
                                        <div className="sdb-grade-score-pill" style={{
                                            background: s.score >= 80 ? 'var(--green-soft)' : s.score >= 50 ? 'var(--amber-soft)' : 'var(--red-soft)',
                                            color: s.score >= 80 ? 'var(--green)' : s.score >= 50 ? 'var(--amber)' : 'var(--red)',
                                        }}>
                                            {s.score ?? '–'}%
                                        </div>
                                        <div className="sdb-grade-info">
                                            <div className="sdb-grade-title">{s.assignmentTitle}</div>
                                            <div className="sdb-grade-status">
                                                <CheckCircle2 size={11} style={{ color: 'var(--green)' }} /> Reviewed
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </DashboardCard>
                    )}

                </div>
            </DashboardLayout>

            {/* ─── Join Class Modal ─── */}
            {isJoining && (
                <div className="sdb-modal-backdrop" onClick={() => setIsJoining(false)}>
                    <div className="sdb-modal" onClick={e => e.stopPropagation()}>
                        <div className="sdb-modal-head">
                            <div>
                                <h2>Join a Class</h2>
                                <p>Enter the class code your teacher gave you</p>
                            </div>
                            <button className="sdb-modal-close" onClick={() => setIsJoining(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form className="sdb-modal-body" onSubmit={handleJoinClass}>
                            <label htmlFor="class-code-input">Class Code</label>
                            <input
                                id="class-code-input"
                                type="text"
                                required
                                value={classCode}
                                onChange={e => setClassCode(e.target.value.toUpperCase())}
                                placeholder="E.G. SE101A"
                                maxLength={8}
                                className={joinError ? 'sdb-input-err' : ''}
                                autoFocus
                            />
                            {joinError && <p className="sdb-form-err">{joinError}</p>}
                            <button type="submit" className="sdb-modal-submit">
                                Join Classroom
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default StudentDashboard;



