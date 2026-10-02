import React, { useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { useLocation, useNavigate } from 'react-router-dom';
import { selectUser } from '../../features/auth';
import { selectClasses, fetchClasses } from '../../features/classroom';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import {
    BookOpen, Clock, CheckCircle2, Star, ArrowRight,
    Filter, Layers
} from 'lucide-react';
import PageShell from '../../components/dashboard/PageShell';

function getDeadlineStatus(deadline) {
    if (!deadline) return 'none';
    const diff = new Date(deadline) - Date.now();
    const days = diff / 86400000;
    if (diff < 0) return 'overdue';
    if (days <= 2) return 'soon';
    return 'normal';
}

function StatusChip({ status }) {
    const map = {
        graded: { label: 'Reviewed', cls: 'apc-chip-green' },
        submitted: { label: 'Submitted', cls: 'apc-chip-blue' },
        overdue: { label: 'Overdue', cls: 'apc-chip-red' },
        locked: { label: 'Locked', cls: 'apc-chip-gray' },
        upcoming: { label: 'Upcoming', cls: 'apc-chip-blue' },
        pending: { label: 'Pending', cls: 'apc-chip-amber' },
    };
    const { label, cls } = map[status] || map.pending;
    return <span className={`apc-chip ${cls}`}>{label}</span>;
}

function DeadlineChip({ deadline }) {
    const s = getDeadlineStatus(deadline);
    if (s === 'none') return <span className="apc-dl-chip apc-dl-none">No deadline</span>;
    const d = new Date(deadline);
    const label = s === 'overdue'
        ? `Overdue · ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
        : `Due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    return <span className={`apc-dl-chip apc-dl-${s}`}>{label}</span>;
}

const StudentAssignmentsList = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();

    const queryParams = new URLSearchParams(location.search);
    const filterClassId = queryParams.get('classId');

    const allClasses = useAppSelector(selectClasses);
    const assignments = useAppSelector(selectAllAssignments) || [];
    const mySubmissions = useAppSelector(selectSubmissions) || [];

    useEffect(() => {
        dispatch(fetchClasses('STUDENT'));
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch]);

    const myClasses = useMemo(
        () => (allClasses || []).filter(c =>
            c.studentIds?.includes(user?.id) || c.students?.some(s => s.id === user?.id)
        ),
        [allClasses, user?.id]
    );

    const filteredAssignments = useMemo(() => {
        let list = assignments.filter(a => myClasses.some(c => c.id === a.classId));
        if (filterClassId) list = list.filter(a => a.classId === filterClassId);
        return list;
    }, [assignments, myClasses, filterClassId]);

    const activeClass = filterClassId ? myClasses.find(c => c.id === filterClassId) : null;

    // Counts
    const pending = filteredAssignments.filter(a => { const sub = mySubmissions.find(s => s.assignmentId === a.id); const st = (sub?.status || '').toLowerCase(); return st !== 'submitted' && st !== 'graded'; }).length;
    const submitted = filteredAssignments.filter(a => { const sub = mySubmissions.find(s => s.assignmentId === a.id); return sub?.status?.toLowerCase() === 'submitted'; }).length;
    const graded = filteredAssignments.filter(a => { const sub = mySubmissions.find(s => s.assignmentId === a.id); return ['graded', 'completed'].includes(sub?.status?.toLowerCase()); }).length;

    return (
        <PageShell
            title={activeClass ? activeClass.name : 'All Assignments'}
            subtitle={activeClass ? `Tasks for ${activeClass.name}` : 'Comprehensive view of all your academic tasks'}
            icon={<Layers size={22} />}
            badge={filteredAssignments.length}
            breadcrumbs={activeClass ? [
                { label: activeClass.name, path: `/student/classes/${activeClass.id}` },
                { label: 'Assignments' }
            ] : [{ label: 'All Assignments' }]}
        >
            {/* Summary strip */}
            {filteredAssignments.length > 0 && (
                <div className="apc-summary-strip">
                    <div className="apc-summary-item">
                        <Layers size={14} />
                        <span className="apc-summary-val">{filteredAssignments.length}</span>
                        <span className="apc-summary-label">Total</span>
                    </div>
                    <div className="apc-summary-sep" />
                    <div className="apc-summary-item apc-summary-amber">
                        <Clock size={14} />
                        <span className="apc-summary-val">{pending}</span>
                        <span className="apc-summary-label">Pending</span>
                    </div>
                    <div className="apc-summary-sep" />
                    <div className="apc-summary-item apc-summary-blue">
                        <BookOpen size={14} />
                        <span className="apc-summary-val">{submitted}</span>
                        <span className="apc-summary-label">Submitted</span>
                    </div>
                    <div className="apc-summary-sep" />
                    <div className="apc-summary-item apc-summary-green">
                        <CheckCircle2 size={14} />
                        <span className="apc-summary-val">{graded}</span>
                        <span className="apc-summary-label">Reviewed</span>
                    </div>
                </div>
            )}

            {/* Cards grid */}
            {filteredAssignments.length > 0 ? (
                <div className="apc-grid">
                    {filteredAssignments.map(asgn => {
                        const submission = mySubmissions.find(s => s.assignmentId === asgn.id);
                        const subStatus = submission?.status?.toLowerCase();
                        const isSubmitted = subStatus === 'submitted' || subStatus === 'graded';
                        const isOverdue = asgn.deadline && new Date(asgn.deadline) < new Date() && !isSubmitted;
                        const dlStatus = getDeadlineStatus(asgn.deadline);
                        const displayStatus = subStatus === 'graded' ? 'graded' :
                            isSubmitted ? 'submitted' :
                                isOverdue ? 'overdue' : 'pending';
                        const className = myClasses.find(c => c.id === asgn.classId);

                        return (
                            <div
                                key={asgn.id}
                                className={`apc-card ${isOverdue ? 'apc-card-overdue' : ''}`}
                                onClick={() => navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === 'Enter') navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`); }}
                            >
                                {/* Accent top bar by status */}
                                <div className={`apc-card-bar apc-bar-${displayStatus}`} />

                                <div className="apc-card-body">
                                    <div className="apc-card-top">
                                        <StatusChip status={displayStatus} />
                                        {className && (
                                            <span className="apc-class-tag">{className.code || className.name}</span>
                                        )}
                                    </div>

                                    <h3 className="apc-card-title">{asgn.title}</h3>
                                    {asgn.description && (
                                        <p className="apc-card-desc">{asgn.description}</p>
                                    )}

                                    <div className="apc-card-footer">
                                        <DeadlineChip deadline={asgn.deadline} />
                                        {submission?.score != null ? (
                                            <span className="apc-score" style={{
                                                background: submission.score >= 80 ? 'var(--green-soft)' : submission.score >= 50 ? 'var(--amber-soft)' : 'var(--red-soft)',
                                                color: submission.score >= 80 ? 'var(--green)' : submission.score >= 50 ? 'var(--amber)' : 'var(--red)',
                                            }}>
                                                {submission.score}%
                                            </span>
                                        ) : (
                                            <span className="apc-pts">100 pts</span>
                                        )}
                                    </div>
                                </div>

                                <div className="apc-card-cta">
                                    <ArrowRight size={15} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="apc-empty">
                    <div className="apc-empty-icon">📄</div>
                    <h3>No assignments found</h3>
                    <p>Take a break   no tasks are waiting for you here.</p>
                </div>
            )}
        </PageShell>
    );
};

export default StudentAssignmentsList;
