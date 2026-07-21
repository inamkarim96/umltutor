import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectUser } from '../../features/auth';
import { selectClasses, joinClass, fetchClasses } from '../../features/classroom';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { X, BookOpen, Clock, CheckCircle2, Users, ArrowRight, Plus, Star } from 'lucide-react';
import PracticeWorkbench from '../../components/practice/PracticeWorkbench';
import DashboardLayout from '../../components/dashboard/DashboardLayout';
import HeroBanner from '../../components/dashboard/HeroBanner';
import StatisticsCard from '../../components/dashboard/StatisticsCard';
import DashboardCard from '../../components/dashboard/DashboardCard';

const StudentDashboard = () => {
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { practiceSection, setPracticeSection } = useOutletContext() || {};

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
        const status = sub?.status?.toLowerCase();
        return !sub || status === 'draft' || status === 'pending';
    });

    const submittedCount = mySubmissions.filter(s => s.status?.toLowerCase() === 'submitted').length;
    const reviewedCount = mySubmissions.filter(s => ['graded', 'completed'].includes(s.status?.toLowerCase())).length;

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

    const stats = [
        {
            label: 'Joined Classes',
            value: myClasses.length,
            note: 'Active enrollment',
            icon: <BookOpen size={20} />,
            color: 'blue',
            path: '/student/classes',
        },
        {
            label: 'Pending',
            value: pendingAssignments.length,
            note: 'Awaiting your work',
            icon: <Clock size={20} />,
            color: 'amber',
            path: '/student/upcoming',
        },
        {
            label: 'Submitted',
            value: submittedCount,
            note: 'Under review',
            icon: <CheckCircle2 size={20} />,
            color: 'green',
            path: '/student/submitted',
        },
        {
            label: 'Reviewed',
            value: reviewedCount,
            note: 'Feedback received',
            icon: <Star size={20} />,
            color: 'purple',
            path: '/student/reviewed',
        },
    ];

    const heroProgress = myAssignmentsFromMyClasses.length > 0 ? {
        label: 'Overall Completion',
        percentage: completionRate,
        note: `${submittedCount + reviewedCount} of ${myAssignmentsFromMyClasses.length} assignments completed`
    } : null;

    const hero = (
        <HeroBanner
            roleName="Student"
            greeting={greeting}
            userName={firstName}
            greetEmoji={greetEmoji}
            dateStr={dateStr}
            subText={pendingAssignments.length === 0
                ? '🎉 All caught up — great work!'
                : `You have ${pendingAssignments.length} pending assignment${pendingAssignments.length !== 1 ? 's' : ''} — let's get to it!`
            }
            primaryAction={{
                icon: <Plus size={16} />,
                label: 'Join a Class',
                onClick: () => setIsJoining(true)
            }}
            progress={heroProgress}
        />
    );

    const statCards = stats.map((stat) => (
        <StatisticsCard key={stat.label} {...stat} />
    ));

    return (
        <>
            <DashboardLayout hero={hero} stats={statCards}>
                <div className="sdb-col">

                    {/* My Classes */}
                    <DashboardCard
                        title="My Classes"
                        subtitle="Courses you're enrolled in"
                        icon={<BookOpen size={16} />}
                        actionLabel="View All"
                        onActionClick={() => navigate('/student/classes')}
                    >

                        {myClasses.length > 0 ? (
                            <div className="sdb-class-list">
                                {myClasses.slice(0, 3).map(c => (
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
                                                <span><BookOpen size={11} /> {c.totalAssignments || 0} assignments</span>
                                            </div>
                                        </div>
                                        <span className="sdb-class-badge">{c.code || 'CODE'}</span>
                                        <ArrowRight size={14} className="sdb-class-arrow" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="sdb-empty">
                                <BookOpen size={32} className="sdb-empty-icon" />
                                <p>No classes yet</p>
                                <button onClick={() => setIsJoining(true)} className="sdb-empty-cta">
                                    <Plus size={14} /> Join your first class
                                </button>
                            </div>
                        )}
                    </DashboardCard>

                    {/* Practice Workbench */}
                    <DashboardCard
                        title="Practice Workbench"
                        subtitle="Experiment freely — no submission required"
                        icon={<CheckCircle2 size={16} />}
                        className="sdb-card-workbench"
                    >
                        <div className="sdb-workbench-body">
                            <PracticeWorkbench
                                activeSection={practiceSection}
                                onSectionChange={setPracticeSection}
                            />
                        </div>
                    </DashboardCard>
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
                            <label>Class Code</label>
                            <input
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
