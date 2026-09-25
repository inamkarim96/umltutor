import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    GraduationCap,
    Calendar,
    MessageSquare,
    Files,
    ArrowRight,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import AnnouncementBoard from '../../features/teacher/components/AnnouncementBoard';
import FileBrowser from '../../features/teacher/components/FileBrowser';
import PageShell from '../../components/dashboard/PageShell';

function StatusChip({ status }) {
    if (status === 'overdue') {
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#fef2f2',
                color: '#b91c1c',
                border: '1px solid #fca5a5',
                whiteSpace: 'nowrap'
            }}>
                <AlertCircle size={12} /> Overdue
            </span>
        );
    }
    if (status === 'graded') {
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#eef2ff',
                color: '#4338ca',
                border: '1px solid #c7d2fe',
                whiteSpace: 'nowrap'
            }}>
                <CheckCircle2 size={12} /> Graded
            </span>
        );
    }
    if (status === 'submitted') {
        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '4px 10px',
                borderRadius: '8px',
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                whiteSpace: 'nowrap'
            }}>
                <CheckCircle2 size={12} /> Submitted
            </span>
        );
    }
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '4px 10px',
            borderRadius: '8px',
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            whiteSpace: 'nowrap'
        }}>
            <Clock size={12} /> Active
        </span>
    );
}

const StudentClassDetail = () => {
    const name = window.location.pathname
        .split('/')
        .find((segment, i, arr) => arr[i - 1] === 'classes' && segment.length > 0);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const allClasses = useAppSelector(selectClasses);
    const assignments = useAppSelector(selectAllAssignments) || [];
    const submissionsMap = useAppSelector(selectSubmissions) || [];
    const user = useAppSelector(selectUser);

    // Default to 'assignments' tab
    const [activeTab, setActiveTab] = useState('assignments');

    useEffect(() => {
        if (allClasses.length === 0) dispatch(fetchClasses('STUDENT'));
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch, allClasses.length]);

    const currentClass = useAppSelector(state =>
        name
            ? state.classroom.classes.find(c => c.name.toLowerCase().replace(/\s+/g, '-') === name)
            : undefined
    );

    const classId = currentClass?.id;
    const classAssignments = useMemo(() => {
        return assignments.filter(a => a.classId === classId);
    }, [assignments, classId]);

    // Calculate class completion stats
    const stats = useMemo(() => {
        const total = classAssignments.length;
        if (total === 0) return { total: 0, submitted: 0, pct: 0, avgScore: null };

        const classAsgnIds = new Set(classAssignments.map(a => a.id));
        const classSubs = submissionsMap.filter(s =>
            classAsgnIds.has(s.assignmentId) &&
            (s.status?.toLowerCase() === 'submitted' || s.status?.toLowerCase() === 'graded')
        );

        const submitted = classSubs.length;
        const pct = Math.round((submitted / total) * 100);

        const gradedSubs = classSubs.filter(s => s.score != null);
        const avgScore = gradedSubs.length > 0
            ? Math.round(gradedSubs.reduce((acc, s) => acc + Number(s.score), 0) / gradedSubs.length)
            : null;

        return { total, submitted, pct, avgScore };
    }, [classAssignments, submissionsMap]);

    if (!currentClass) {
        return (
            <PageShell
                backPath="/student/classes"
                breadcrumbs={[{ label: 'My Classes', path: '/student/classes' }]}
            >
                <div className="apc-loading-state">
                    <div className="apc-spinner" />
                    <p className="apc-loading-text">Loading Class Details...</p>
                </div>
            </PageShell>
        );
    }

    const tabs = [
        { id: 'assignments', label: 'Assignments', count: classAssignments.length, icon: <BookOpen size={18} /> },
        { id: 'posts', label: 'Announcements', icon: <MessageSquare size={18} /> },
        { id: 'files', label: 'Files & Resources', icon: <Files size={18} /> },
    ];

    return (
        <PageShell
            backPath="/student/classes"
            breadcrumbs={[
                { label: 'My Classes', path: '/student/classes' },
                { label: currentClass.name }
            ]}
        >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* ── Class Hero Banner ── */}
                <div className="cld-hero-card">
                    <div className="cld-hero-inner">
                        <div className="cld-hero-main">
                            <div className="cld-hero-avatar">
                                {currentClass.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="cld-hero-info">
                                <div className="cld-hero-tags">
                                    <span className="cld-code-badge">
                                        {currentClass.code || 'COURSE'}
                                    </span>
                                    <span className="cld-status-badge">
                                        <span className="cld-status-dot" /> Enrolled
                                    </span>
                                    {currentClass.teacherName && (
                                        <span className="cld-teacher-chip">
                                            <GraduationCap size={13} /> Instructor: {currentClass.teacherName}
                                        </span>
                                    )}
                                </div>

                                <h1 className="cld-title">{currentClass.name}</h1>
                                <p className="cld-desc">
                                    {currentClass.description || 'Welcome to your course workspace. Track assignments, access announcements, and review your feedback here.'}
                                </p>
                            </div>
                        </div>

                        {/* Quick Stats on the right */}
                        <div className="cld-stats-group">
                            <div className="cld-stat-card">
                                <span className="cld-stat-lbl">Assignments</span>
                                <span className="cld-stat-num">{stats.total}</span>
                            </div>
                            <div className="cld-stat-card">
                                <span className="cld-stat-lbl">Completed</span>
                                <span className="cld-stat-num cld-stat-green">
                                    {stats.submitted} / {stats.total}
                                </span>
                            </div>
                            {stats.avgScore !== null && (
                                <div className="cld-stat-card">
                                    <span className="cld-stat-lbl">Avg Grade</span>
                                    <span className="cld-stat-num cld-stat-purple">
                                        {stats.avgScore}%
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── High-Contrast, Crystal Clear Navigation Tab Bar ── */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.06)',
                    marginBottom: '28px',
                    flexWrap: 'wrap'
                }}>
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                type="button"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '11px 22px',
                                    borderRadius: '12px',
                                    border: isActive ? '1px solid #4338ca' : '1px solid transparent',
                                    background: isActive ? '#4f46e5' : '#f8fafc',
                                    color: isActive ? '#ffffff' : '#1e293b',
                                    fontSize: '14px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease',
                                    boxShadow: isActive ? '0 4px 14px rgba(79, 70, 229, 0.35)' : 'none',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = '#eef2ff';
                                        e.currentTarget.style.color = '#4338ca';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) {
                                        e.currentTarget.style.background = '#f8fafc';
                                        e.currentTarget.style.color = '#1e293b';
                                    }
                                }}
                            >
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: isActive ? '#ffffff' : '#4f46e5'
                                }}>
                                    {tab.icon}
                                </span>
                                <span>{tab.label}</span>
                                {tab.count != null && (
                                    <span style={{
                                        background: isActive ? 'rgba(255, 255, 255, 0.28)' : '#e0e7ff',
                                        color: isActive ? '#ffffff' : '#4338ca',
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        padding: '2px 8px',
                                        borderRadius: '100px',
                                    }}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Tab Content ── */}
                <div>
                    {/* ASSIGNMENTS TAB */}
                    {activeTab === 'assignments' && (
                        <div>
                            {classAssignments.length === 0 ? (
                                <div style={{
                                    background: '#ffffff',
                                    border: '2px dashed #cbd5e1',
                                    borderRadius: '20px',
                                    padding: '60px 20px',
                                    textAlign: 'center'
                                }}>
                                    <BookOpen size={44} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
                                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                                        No Assignments Posted Yet
                                    </h3>
                                    <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                                        Your instructor hasn't posted any assignments for this class yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="apc-grid">
                                    {classAssignments.map(asgn => {
                                        const sub = submissionsMap.find(s => s.assignmentId === asgn.id);
                                        const subStatus = (sub?.status || '').toLowerCase();
                                        const isSubmitted = subStatus === 'submitted' || subStatus === 'graded';
                                        const isGraded = subStatus === 'graded';
                                        const isOverdue = asgn.deadline && new Date(asgn.deadline) < new Date() && !isSubmitted;

                                        const asgnSlug = asgn.title.toLowerCase().replace(/\s+/g, '-');
                                        const displayStatus = isGraded ? 'graded' : isSubmitted ? 'submitted' : isOverdue ? 'overdue' : 'pending';

                                        const deadlineStr = asgn.deadline
                                            ? new Date(asgn.deadline).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric'
                                            })
                                            : null;

                                        const scoreVal = sub?.score != null ? Number(sub.score) : null;

                                        return (
                                            <div
                                                key={asgn.id}
                                                className={`apc-card ${isOverdue ? 'apc-card-overdue' : ''}`}
                                                onClick={() => navigate(`/student/assignments/${asgnSlug}`)}
                                                tabIndex={0}
                                                role="button"
                                                onKeyDown={(e) => e.key === 'Enter' && navigate(`/student/assignments/${asgnSlug}`)}
                                            >
                                                {/* Top accent bar indicating status */}
                                                <div className={`apc-card-bar apc-bar-${displayStatus}`} />

                                                <div className="apc-card-body">
                                                    <div className="apc-card-top">
                                                        <StatusChip status={displayStatus} />
                                                        {scoreVal !== null && (
                                                            <span style={{
                                                                fontFamily: 'var(--font-d)',
                                                                fontSize: '13px',
                                                                fontWeight: 900,
                                                                padding: '3px 10px',
                                                                borderRadius: '100px',
                                                                marginLeft: 'auto',
                                                                background: scoreVal >= 80 ? '#dcfce7' : scoreVal >= 50 ? '#fef3c7' : '#fee2e2',
                                                                color: scoreVal >= 80 ? '#15803d' : scoreVal >= 50 ? '#b45309' : '#b91c1c',
                                                                border: scoreVal >= 80 ? '1px solid #86efac' : scoreVal >= 50 ? '1px solid #fde68a' : '1px solid #fca5a5'
                                                            }}>
                                                                {scoreVal}%
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="apc-card-title">{asgn.title}</h3>
                                                    <p className="apc-card-desc">
                                                        {asgn.description || asgn.textContent || 'Build and verify your UML model according to specifications.'}
                                                    </p>

                                                    <div className="apc-card-footer">
                                                        <div className="apc-card-deadline">
                                                            <Calendar size={13} style={{ color: '#64748b' }} />
                                                            <span>{deadlineStr ? `Due ${deadlineStr}` : 'No deadline'}</span>
                                                        </div>

                                                        <span className="apc-card-btn">
                                                            View Details <ArrowRight size={13} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ANNOUNCEMENTS TAB */}
                    {activeTab === 'posts' && (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            padding: '28px',
                            boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.05)'
                        }}>
                            <AnnouncementBoard classId={classId} />
                        </div>
                    )}

                    {/* FILES & RESOURCES TAB */}
                    {activeTab === 'files' && (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.05)'
                        }}>
                            <FileBrowser classId={classId} allowStudentUploads={currentClass.allowStudentUploads} />
                        </div>
                    )}
                </div>
            </div>
        </PageShell>
    );
};

export default StudentClassDetail;
