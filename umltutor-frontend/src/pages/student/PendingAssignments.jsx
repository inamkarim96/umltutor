import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Calendar, Play, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { selectClasses, fetchClasses } from '../../features/classroom';
import PageShell from '../../components/dashboard/PageShell';

function getDeadlineStatus(deadline) {
    if (!deadline) return 'none';
    const diff = new Date(deadline) - Date.now();
    if (diff < 0) return 'overdue';
    if (diff / 86400000 <= 2) return 'soon';
    return 'normal';
}

function daysLeft(deadline) {
    if (!deadline) return null;
    const diff = new Date(deadline) - Date.now();
    if (diff < 0) return null;
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Due today';
    if (d === 1) return '1 day left';
    return `${d} days left`;
}

const PendingAssignments = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const allAssignments = useAppSelector(selectAllAssignments) || [];
    const mySubmissions  = useAppSelector(selectSubmissions) || [];
    const allClasses     = useAppSelector(selectClasses) || [];

    useEffect(() => {
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
        dispatch(fetchClasses('STUDENT'));
    }, [dispatch]);

    const pending = allAssignments.filter(a => {
        const sub = mySubmissions.find(s => s.assignmentId === a.id);
        const status = (sub?.status || a.status || '').toLowerCase();
        return status !== 'submitted' && status !== 'graded';
    }).sort((a, b) => {
        // overdue first, then by deadline
        const da = getDeadlineStatus(a.deadline);
        const db = getDeadlineStatus(b.deadline);
        if (da === 'overdue' && db !== 'overdue') return -1;
        if (db === 'overdue' && da !== 'overdue') return 1;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
    });

    const overdueCount = pending.filter(a => getDeadlineStatus(a.deadline) === 'overdue').length;
    const soonCount    = pending.filter(a => getDeadlineStatus(a.deadline) === 'soon').length;

    return (
        <PageShell
            title="Pending Assignments"
            subtitle="Tasks waiting for your work — sorted by urgency"
            icon={<Clock size={22} />}
            badge={pending.length}
            breadcrumbs={[{ label: 'Pending Assignments' }]}
        >
            {/* Urgency banner */}
            {(overdueCount > 0 || soonCount > 0) && (
                <div className={`apc-urgency-bar ${overdueCount > 0 ? 'apc-ub-red' : 'apc-ub-amber'}`}>
                    <AlertTriangle size={16} />
                    {overdueCount > 0
                        ? `${overdueCount} overdue assignment${overdueCount !== 1 ? 's' : ''} — submit as soon as possible!`
                        : `${soonCount} assignment${soonCount !== 1 ? 's' : ''} due within 2 days — act now!`
                    }
                </div>
            )}

            {pending.length > 0 ? (
                <div className="apc-list">
                    {pending.map(assignment => {
                        const sub = mySubmissions.find(s => s.assignmentId === assignment.id);
                        const isLocked   = assignment.assignmentStatus === 'locked';
                        const isUpcoming = assignment.assignmentStatus === 'upcoming';
                        const dlStatus   = getDeadlineStatus(assignment.deadline);
                        const countdown  = daysLeft(assignment.deadline);
                        const className  = allClasses.find(c => c.id === assignment.classId);

                        return (
                            <div
                                key={assignment.id}
                                className={`apc-list-row ${isLocked ? 'apc-list-locked' : ''} ${dlStatus === 'overdue' ? 'apc-list-overdue' : ''}`}
                                onClick={() => !isLocked && !isUpcoming && navigate(`/student/assignments/${assignment.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                role={!isLocked && !isUpcoming ? 'button' : undefined}
                                tabIndex={!isLocked && !isUpcoming ? 0 : undefined}
                                onKeyDown={e => { if (e.key === 'Enter' && !isLocked && !isUpcoming) navigate(`/student/assignments/${assignment.title.toLowerCase().replace(/\s+/g, '-')}/work`); }}
                            >
                                {/* Left: icon */}
                                <div className={`apc-list-icon ${dlStatus === 'overdue' ? 'apc-li-red' : isLocked ? 'apc-li-gray' : 'apc-li-accent'}`}>
                                    {isLocked ? <Lock size={20} /> : dlStatus === 'overdue' ? <AlertTriangle size={20} /> : <Play size={20} />}
                                </div>

                                {/* Center: info */}
                                <div className="apc-list-info">
                                    <div className="apc-list-title-row">
                                        <span className="apc-list-title">{assignment.title}</span>
                                        <span className={`apc-chip ${
                                            isLocked ? 'apc-chip-gray' :
                                            isUpcoming ? 'apc-chip-blue' :
                                            dlStatus === 'overdue' ? 'apc-chip-red' :
                                            dlStatus === 'soon' ? 'apc-chip-amber' : 'apc-chip-amber'
                                        }`}>
                                            {isLocked ? 'Locked' : isUpcoming ? 'Upcoming' : dlStatus === 'overdue' ? 'Overdue' : 'Pending'}
                                        </span>
                                        {className && (
                                            <span className="apc-class-tag">{className.code || className.name}</span>
                                        )}
                                    </div>
                                    <p className="apc-list-desc">
                                        {isLocked ? 'This assignment is locked for submissions.' :
                                         isUpcoming ? 'This assignment will be available on the release date.' :
                                         assignment.description || 'Click to open the workspace and begin modeling.'}
                                    </p>
                                    <div className="apc-list-meta">
                                        {assignment.deadline && (
                                            <span className={`apc-dl-chip apc-dl-${dlStatus}`}>
                                                <Calendar size={11} />
                                                {new Date(assignment.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        )}
                                        {countdown && (
                                            <span className={`apc-countdown ${dlStatus === 'soon' ? 'apc-countdown-red' : ''}`}>
                                                ⏱ {countdown}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: max score + CTA */}
                                <div className="apc-list-right">
                                    <div className="apc-list-pts">
                                        <span className="apc-list-pts-val">{assignment.maxScore ?? 100}</span>
                                        <span className="apc-list-pts-label">pts</span>
                                    </div>
                                    {!isLocked && !isUpcoming && (
                                        <div className="apc-list-go">
                                            <Play size={16} fill="currentColor" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="apc-empty">
                    <div className="apc-empty-ring">
                        <CheckCircle2 size={40} style={{ color: 'var(--green)' }} />
                    </div>
                    <h3>All Caught Up! 🎉</h3>
                    <p>You've submitted all your assignments or nothing new is waiting. Take a well-deserved break.</p>
                    <button className="apc-empty-btn" onClick={() => navigate('/student/submitted')}>
                        View Submitted Work
                    </button>
                </div>
            )}
        </PageShell>
    );
};

export default PendingAssignments;
