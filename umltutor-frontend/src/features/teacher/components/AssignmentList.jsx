import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Clock, ChevronRight, BookOpen, Edit } from 'lucide-react';

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
        graded:    { label: 'Reviewed',    cls: 'apc-chip-green'  },
        submitted: { label: 'Submitted',   cls: 'apc-chip-blue'   },
        overdue:   { label: 'Locked',      cls: 'apc-chip-red'    },
        locked:    { label: 'Locked',      cls: 'apc-chip-red'    },
        upcoming:  { label: 'Upcoming',    cls: 'apc-chip-blue'   },
        pending:   { label: 'Pending',     cls: 'apc-chip-amber'  },
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

const AssignmentList = ({ assignments = [], onEdit, classId }) => {
    const navigate = useNavigate();

    if (assignments.length === 0) {
        return (
            <div className="apc-empty">
                <div className="apc-empty-icon">📄</div>
                <h3>No Assignments Found</h3>
                <p>Start by creating your first assignment.</p>
            </div>
        );
    }

    return (
        <div className="apc-grid">
            {assignments.map(asgn => {
                const dlStatus = getDeadlineStatus(asgn.dueDate || asgn.deadline);
                const isOverdue = dlStatus === 'overdue';
                
                // For teacher, show deadline-based status: locked if overdue, otherwise type-based
                const typeStatus = isOverdue ? 'locked' : (asgn.assignmentType === 'FILE' ? 'upcoming' : 'pending');
                const assignmentSlug = asgn.title.toLowerCase().replace(/\s+/g, '-');
                const detailUrl = classId 
                    ? `/teacher/assignments/${assignmentSlug}?classId=${classId}`
                    : `/teacher/assignments/${assignmentSlug}`;

                return (
                    <div
                        key={asgn.id}
                        className={`apc-card ${isOverdue ? 'apc-card-overdue' : ''}`}
                        onClick={() => navigate(detailUrl)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => { if (e.key === 'Enter') navigate(detailUrl); }}
                    >
                        {/* Accent top bar by deadline status */}
                        <div className={`apc-card-bar apc-bar-${dlStatus}`} />

                        <div className="apc-card-body">
                            <div className="apc-card-top">
                                <StatusChip status={typeStatus} />
                            </div>

                            <h3 className="apc-card-title">{asgn.title}</h3>
                            {asgn.description && (
                                <p className="apc-card-desc">{asgn.description}</p>
                            )}

                            <div className="apc-card-footer">
                                <DeadlineChip deadline={asgn.dueDate || asgn.deadline} />
                                {asgn.submissionCount !== undefined && (
                                    <span className="apc-pts">{asgn.submissionCount} Submissions</span>
                                )}
                            </div>
                        </div>

                        <div className="apc-card-cta">
                            <div className="flex items-center gap-2 w-full justify-end">
                                {onEdit && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEdit(asgn);
                                        }}
                                        className="p-2 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg"
                                        title="Edit"
                                    >
                                        <Edit size={16} />
                                    </button>
                                )}
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AssignmentList;
