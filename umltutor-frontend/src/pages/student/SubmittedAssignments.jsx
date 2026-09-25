import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, FileText, Calendar, TrendingUp, Clock, ArrowRight, Star } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { selectClasses, fetchClasses } from '../../features/classroom';
import PageShell from '../../components/dashboard/PageShell';

function ScorePill({ score }) {
    if (score == null) return <span className="apc-score-pill apc-sp-pending">Pending Review</span>;
    const color = score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red';
    return (
        <span className={`apc-score-pill apc-sp-${color}`}>
            {score}%
        </span>
    );
}

const SubmittedAssignments = () => {
    const navigate  = useNavigate();
    const location  = useLocation();
    const dispatch  = useAppDispatch();

    const allAssignments = useAppSelector(selectAllAssignments) || [];
    const mySubmissions  = useAppSelector(selectSubmissions) || [];
    const allClasses     = useAppSelector(selectClasses) || [];

    const isReviewedMode = location.pathname.includes('/reviewed');

    useEffect(() => {
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
        dispatch(fetchClasses('STUDENT'));
    }, [dispatch]);

    const matchedAssignments = allAssignments.filter(a => {
        const sub = mySubmissions.find(s => s.assignmentId === a.id);
        const status = (sub?.status || a.status || '').toLowerCase();
        return isReviewedMode
            ? (status === 'graded' || status === 'completed')
            : status === 'submitted';
    });

    // Stats for reviewed mode
    const avgScore = isReviewedMode && matchedAssignments.length > 0
        ? Math.round(
            matchedAssignments.reduce((sum, a) => {
                const sub = mySubmissions.find(s => s.assignmentId === a.id);
                return sum + (sub?.score ?? 0);
            }, 0) / matchedAssignments.length
          )
        : null;

    const highScore = isReviewedMode && matchedAssignments.length > 0
        ? Math.max(...matchedAssignments.map(a => {
              const sub = mySubmissions.find(s => s.assignmentId === a.id);
              return sub?.score ?? 0;
          }))
        : null;

    return (
        <PageShell
            title={isReviewedMode ? 'Reviewed Work' : 'Submitted Work'}
            subtitle={isReviewedMode
                ? 'Your graded assignments with instructor feedback'
                : 'Work awaiting review from your instructors'}
            icon={isReviewedMode ? <Star size={22} /> : <CheckCircle2 size={22} />}
            badge={matchedAssignments.length}
            breadcrumbs={[{ label: isReviewedMode ? 'Reviewed' : 'Submitted' }]}
        >
            {/* Stats row for reviewed mode */}
            {isReviewedMode && matchedAssignments.length > 0 && (
                <div className="apc-summary-strip">
                    <div className="apc-summary-item">
                        <CheckCircle2 size={14} />
                        <span className="apc-summary-val">{matchedAssignments.length}</span>
                        <span className="apc-summary-label">Reviewed</span>
                    </div>
                    <div className="apc-summary-sep" />
                    <div className="apc-summary-item apc-summary-blue">
                        <TrendingUp size={14} />
                        <span className="apc-summary-val">{avgScore}%</span>
                        <span className="apc-summary-label">Avg Score</span>
                    </div>
                    <div className="apc-summary-sep" />
                    <div className="apc-summary-item apc-summary-green">
                        <Star size={14} />
                        <span className="apc-summary-val">{highScore}%</span>
                        <span className="apc-summary-label">Best Score</span>
                    </div>
                </div>
            )}

            {matchedAssignments.length > 0 ? (
                <div className="apc-list">
                    {matchedAssignments.map(assignment => {
                        const submission = mySubmissions.find(s => s.assignmentId === assignment.id);
                        const isGraded   = submission?.status?.toLowerCase() === 'graded';
                        const className  = allClasses.find(c => c.id === assignment.classId);
                        const dateLabel  = isGraded
                            ? (submission?.updatedAt || submission?.submittedAt)
                            : submission?.submittedAt;

                        return (
                            <div
                                key={assignment.id}
                                className="apc-list-row"
                                onClick={() => navigate(`/student/assignments/${assignment.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === 'Enter') navigate(`/student/assignments/${assignment.title.toLowerCase().replace(/\s+/g, '-')}/work`); }}
                            >
                                {/* Left: Icon */}
                                <div className={`apc-list-icon ${isGraded ? 'apc-li-green' : 'apc-li-blue'}`}>
                                    {isGraded ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                                </div>

                                {/* Center: Info */}
                                <div className="apc-list-info">
                                    <div className="apc-list-title-row">
                                        <span className="apc-list-title">{assignment.title}</span>
                                        <span className={`apc-chip ${isGraded ? 'apc-chip-green' : 'apc-chip-blue'}`}>
                                            {isGraded ? 'Reviewed' : 'Submitted'}
                                        </span>
                                        {className && (
                                            <span className="apc-class-tag">{className.code || className.name}</span>
                                        )}
                                    </div>
                                    <p className="apc-list-desc">
                                        {assignment.description || 'You have submitted your work for this assignment.'}
                                    </p>
                                    <div className="apc-list-meta">
                                        {dateLabel && (
                                            <span className="apc-dl-chip apc-dl-normal">
                                                <Calendar size={11} />
                                                {isGraded ? 'Reviewed' : 'Submitted'} {new Date(dateLabel).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                        )}
                                        {assignment.deadline && (
                                            <span className="apc-dl-chip apc-dl-normal">
                                                <Clock size={11} />
                                                Deadline {new Date(assignment.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Score */}
                                <div className="apc-list-right">
                                    <ScorePill score={submission?.score ?? assignment?.score} />
                                    <div className="apc-list-go">
                                        <ArrowRight size={16} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="apc-empty">
                    <div className="apc-empty-ring">
                        {isReviewedMode
                            ? <Star size={40} style={{ color: 'var(--amber)' }} />
                            : <FileText size={40} style={{ color: 'var(--ink-3)' }} />
                        }
                    </div>
                    <h3>{isReviewedMode ? 'No Feedback Yet' : 'No Submissions Yet'}</h3>
                    <p>
                        {isReviewedMode
                            ? "Once your teacher grades your work, it will appear here."
                            : "Submit your pending assignments to see them here."}
                    </p>
                    <button className="apc-empty-btn" onClick={() => navigate(isReviewedMode ? '/student/submitted' : '/student/upcoming')}>
                        {isReviewedMode ? 'View Submitted Work' : 'View Pending Assignments'}
                    </button>
                </div>
            )}
        </PageShell>
    );
};

export default SubmittedAssignments;
