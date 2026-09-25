import React, { useEffect, useMemo, useState } from 'react';
import { resolveResourceUrl } from '../utils/urlHelper';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
    selectClasses,
    selectStudents,
    fetchClassStudents
} from '../features/classroom';
import {
    selectAllAssignments,
    fetchAssignmentById,
    fetchAllAssignments,
    updateAssignment
} from '../features/assignments';
import {
    selectSubmissions,
    selectAssignmentSubmissions,
    fetchAssignmentSubmissions,
    fetchSubmissionStatus,
    selectCurrentSubmission
} from '../features/submissions';
import { selectUser } from '../features/auth';
import {
    Calendar,
    FileText,
    CheckCircle2,
    Clock,
    Users,
    ChevronRight,
    Edit,
    X,
    Eye,
    Download,
    Award,
    Sparkles,
    AlertCircle,
    ArrowUpRight,
    ExternalLink
} from 'lucide-react';
import { SubmitAssignment } from '../features/classroom';
import { CreateAssignmentModal } from '../features/teacher';
import StudentCheckingReport from '../components/shared/StudentCheckingReport';
import PageShell from '../components/dashboard/PageShell';

const AssignmentDetails = () => {
    // Custom router — useParams() returns {} without <Route> wrappers. Parse from URL.
    const titleSlug = window.location.pathname
        .split('/')
        .find((segment, i, arr) => arr[i - 1] === 'assignments' && segment !== 'submitted' && segment !== 'pending' && segment !== 'reviewed' && segment.length > 0);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);
    const submissionStatus = useAppSelector(selectCurrentSubmission);
    const role = user?.role;

    // Edit modal state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [previewFile, setPreviewFile] = useState(null);

    const assignments = useAppSelector(selectAllAssignments);
    const submissionsArr = useAppSelector(selectSubmissions);
    const classes = useAppSelector(selectClasses);
    const studentsMap = useAppSelector(selectStudents);

    // Find assignment by slugified title or id
    const assignment = useMemo(() => {
        return (assignments || []).find(asgn =>
            asgn.id === titleSlug ||
            asgn.title?.toLowerCase().replace(/\s+/g, '-') === titleSlug
        );
    }, [assignments, titleSlug]);

    const id = assignment?.id;
    const assignmentSubmissionsFromSlice = useAppSelector(state => selectAssignmentSubmissions(state, id));
    const targetClass = assignment ? classes?.find(c => c.id === assignment.classId) : null;

    // Student's own official submission (only submitted or graded)
    const myOfficialSubmission = useMemo(() => {
        if (!id) return null;
        const sub = role === 'STUDENT' ? submissionStatus : submissionsArr.find(s => (s.assignmentId === id || s.id === id) && s.studentId === user?.id);
        const status = sub?.status?.toLowerCase();
        return (status === 'submitted' || status === 'graded') ? sub : null;
    }, [submissionsArr, submissionStatus, id, user?.id, role]);

    // All submissions for this assignment (Teacher only)
    const assignmentSubmissions = useMemo(() => {
        if (role === 'TEACHER' && id) {
            return assignmentSubmissionsFromSlice || [];
        }
        return id ? submissionsArr.filter(s => s.assignmentId === id) : [];
    }, [role, id, assignmentSubmissionsFromSlice, submissionsArr]);

    useEffect(() => {
        if ((assignments || []).length === 0) {
            dispatch(fetchAllAssignments(role));
        }
    }, [dispatch, assignments, role]);

    useEffect(() => {
        if (id) {
            dispatch(fetchAssignmentById({ id, role }));
        }
    }, [id, role, dispatch]);

    useEffect(() => {
        if (role === 'TEACHER' && id) {
            dispatch(fetchAssignmentSubmissions(id));
        } else if (role === 'STUDENT' && id) {
            dispatch(fetchSubmissionStatus({ assignmentId: id, includeReport: false }));
        }
    }, [id, role, dispatch]);

    useEffect(() => {
        if (role === 'STUDENT' && id && submissionStatus?.status && ['submitted', 'graded'].includes(submissionStatus.status.toLowerCase()) && !submissionStatus?.fullReport) {
            dispatch(fetchSubmissionStatus({ assignmentId: id, includeReport: true }));
        }
    }, [id, role, dispatch, submissionStatus?.status, submissionStatus?.fullReport]);

    const classId = assignment?.classId;
    useEffect(() => {
        if (role === 'TEACHER' && classId) {
            dispatch(fetchClassStudents(classId));
        }
    }, [classId, role, dispatch]);

    // Edit handlers
    const handleEditAssignment = () => setIsEditModalOpen(true);
    const handleCloseEditModal = () => setIsEditModalOpen(false);

    const handleUpdateAssignment = async (data) => {
        try {
            setIsSubmitting(true);
            setErrorMessage('');

            if (assignment?.id) {
                await dispatch(updateAssignment({
                    id: assignment.id,
                    data: data
                })).unwrap();

                setSuccessMessage('Assignment successfully updated.');
                setTimeout(() => setSuccessMessage(''), 5000);
            }

            setIsEditModalOpen(false);
            setIsSubmitting(false);
        } catch (error) {
            console.error('Error updating assignment:', error);
            setErrorMessage(error?.message || 'Failed to update assignment');
            setIsSubmitting(false);
        }
    };

    if (!assignment) {
        return (
            <PageShell
                title="Assignment"
                backPath={role === 'TEACHER' ? '/teacher/assignments' : '/student/assignments'}
                breadcrumbs={[{ label: 'Assignments', path: role === 'TEACHER' ? '/teacher/assignments' : '/student/assignments' }]}
            >
                <div className="apc-loading-state">
                    <div className="apc-spinner" />
                    <p className="apc-loading-text">Loading Assignment Details...</p>
                </div>
            </PageShell>
        );
    }

    const isOverdue = assignment.deadline ? new Date(assignment.deadline) < new Date() : false;
    const isLocked = assignment.assignmentStatus === 'locked';
    const isUpcoming = assignment.assignmentStatus === 'upcoming';

    const getStatusInfo = () => {
        if (myOfficialSubmission) {
            const isGraded = myOfficialSubmission.status?.toLowerCase() === 'graded';
            return {
                label: isGraded ? 'Graded' : 'Submitted',
                cls: isGraded ? 'apc-status-chip apc-status-graded' : 'apc-status-chip apc-status-submitted'
            };
        }
        if (isLocked) return { label: 'Locked', cls: 'apc-status-chip' };
        if (isUpcoming) return { label: 'Upcoming', cls: 'apc-status-chip' };
        if (isOverdue) return { label: 'Overdue / Closed', cls: 'apc-status-chip apc-status-overdue' };
        return { label: 'Active', cls: 'apc-status-chip apc-status-pending' };
    };

    const statusInfo = getStatusInfo();

    const formattedDate = assignment.deadline
        ? new Date(assignment.deadline).toLocaleDateString(undefined, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : 'No date set';

    const formattedTime = assignment.deadline
        ? new Date(assignment.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '—';

    // Countdown / status relative time
    const getDeadlineRel = () => {
        if (!assignment.deadline) return null;
        const diffMs = new Date(assignment.deadline).getTime() - Date.now();
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);
        if (diffMs < 0) return 'Passed';
        if (diffHours < 24) return `Due in ${Math.max(1, diffHours)}h`;
        return `Due in ${diffDays}d`;
    };
    const deadlineRel = getDeadlineRel();

    const teacherSubmissionsCount = assignmentSubmissions.filter(s => s.status && s.status.toLowerCase() !== 'pending').length;

    const backPath = role === 'TEACHER' ? '/teacher/assignments' : '/student/assignments';
    const breadcrumbs = [
        { label: 'Assignments', path: backPath },
        ...(targetClass ? [{ label: targetClass.name, path: role === 'TEACHER' ? `/teacher/classes/${targetClass.id}` : `/student/classes/${targetClass.name?.toLowerCase().replace(/\s+/g, '-')}` }] : []),
        { label: assignment.title }
    ];

    const actions = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {role === 'TEACHER' && (
                <button
                    onClick={handleEditAssignment}
                    className="asg-action-btn"
                    title="Edit Assignment"
                >
                    <Edit size={14} /> Edit Assignment
                </button>
            )}
            {role === 'STUDENT' && (
                <button
                    onClick={() => navigate(`/student/assignments/${assignment.title?.toLowerCase().replace(/\s+/g, '-')}/work`)}
                    className="asg-action-btn asg-action-btn-primary"
                >
                    <Sparkles size={14} /> UML Workspace
                </button>
            )}
        </div>
    );

    return (
        <PageShell
            title={assignment.title}
            subtitle={targetClass ? `Assigned in ${targetClass.name}` : 'UML Assignment Details'}
            icon={<FileText size={24} />}
            backPath={backPath}
            breadcrumbs={breadcrumbs}
            actions={actions}
        >
            <div className="asg-detail-container">
                {/* Status Messages */}
                {errorMessage && (
                    <div className="apc-urgency-banner apc-urgency-overdue">
                        <AlertCircle size={18} />
                        <div style={{ flex: 1 }}>{errorMessage}</div>
                        <button onClick={() => setErrorMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={16} /></button>
                    </div>
                )}
                {successMessage && (
                    <div className="apc-urgency-banner apc-urgency-normal" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.25)', color: '#047857' }}>
                        <CheckCircle2 size={18} />
                        <div style={{ flex: 1 }}>{successMessage}</div>
                        <button onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={16} /></button>
                    </div>
                )}

                {/* Hero Card */}
                <div className="asg-hero-card">
                    <div className="asg-hero-top">
                        <div className="asg-badge-group">
                            <span className="asg-tag asg-tag-type">UML Assignment</span>
                            {targetClass && (
                                <span className="asg-tag asg-tag-class">
                                    {targetClass.name} {targetClass.code ? `(${targetClass.code})` : ''}
                                </span>
                            )}
                            <span className={statusInfo.cls}>{statusInfo.label}</span>
                            {deadlineRel && !myOfficialSubmission && (
                                <span className={`apc-deadline-chip ${isOverdue ? 'apc-deadline-overdue' : 'apc-deadline-soon'}`}>
                                    <Clock size={11} /> {deadlineRel}
                                </span>
                            )}
                        </div>
                    </div>

                    <h1 className="asg-hero-title">{assignment.title}</h1>

                    <div className="asg-meta-strip">
                        <div className="asg-meta-item">
                            <div className="asg-meta-icon"><Calendar size={16} /></div>
                            <div>
                                <p className="asg-meta-label">Due Date</p>
                                <p className="asg-meta-val">{formattedDate}</p>
                            </div>
                        </div>

                        <div className="asg-meta-item">
                            <div className="asg-meta-icon"><Clock size={16} /></div>
                            <div>
                                <p className="asg-meta-label">Due Time</p>
                                <p className="asg-meta-val">{formattedTime}</p>
                            </div>
                        </div>

                        {assignment.type && (
                            <div className="asg-meta-item">
                                <div className="asg-meta-icon"><FileText size={16} /></div>
                                <div>
                                    <p className="asg-meta-label">Task Type</p>
                                    <p className="asg-meta-val">{assignment.type}</p>
                                </div>
                            </div>
                        )}

                        {role === 'TEACHER' && (
                            <div className="asg-meta-item">
                                <div className="asg-meta-icon"><Users size={16} /></div>
                                <div>
                                    <p className="asg-meta-label">Submissions</p>
                                    <p className="asg-meta-val">{teacherSubmissionsCount} Turned In</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="asg-content-grid">
                    {/* Left Column: Instructions & Reference & Work */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Assignment Instructions */}
                        <div className="asg-card">
                            <div className="asg-card-head">
                                <div className="asg-card-title-group">
                                    <div className="asg-card-icon"><FileText size={18} /></div>
                                    <h2 className="asg-card-title">Instructions & Description</h2>
                                </div>
                            </div>
                            <div className="asg-instructions-box">
                                {assignment?.textContent ? (
                                    assignment.textContent
                                ) : assignment?.instructions ? (
                                    assignment.instructions
                                ) : assignment?.description ? (
                                    assignment.description
                                ) : (
                                    <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>No detailed instructions provided for this assignment.</span>
                                )}
                            </div>
                        </div>

                        {/* Reference Materials */}
                        <div className="asg-card">
                            <div className="asg-card-head">
                                <div className="asg-card-title-group">
                                    <div className="asg-card-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' }}><Download size={18} /></div>
                                    <h2 className="asg-card-title">Reference Materials</h2>
                                </div>
                            </div>

                            {assignment?.assignmentFileUrl ? (
                                <div className="asg-resource-row">
                                    <div className="asg-resource-info">
                                        <div className="asg-resource-icon"><FileText size={20} /></div>
                                        <div>
                                            <div className="asg-resource-name" title={assignment.assignmentFileName || 'Resource File'}>
                                                {assignment.assignmentFileName || 'Assignment Specification Document'}
                                            </div>
                                            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                                                {assignment.assignmentFileType || 'Attached file'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="asg-resource-actions">
                                        <button
                                            onClick={() => setPreviewFile({
                                                url: assignment.assignmentFileUrl,
                                                name: assignment.assignmentFileName || 'Resource File',
                                                type: assignment.assignmentFileType
                                            })}
                                            className="asg-action-btn"
                                            title="View Preview"
                                        >
                                            <Eye size={14} /> Preview
                                        </button>
                                        <a
                                            href={resolveResourceUrl(assignment.assignmentFileUrl)}
                                            download={assignment.assignmentFileName || 'Resource'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="asg-action-btn"
                                            title="Download Attachment"
                                        >
                                            <Download size={14} /> Download
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--ink-3)' }}>No supplementary files attached.</p>
                                </div>
                            )}
                        </div>

                        {/* Student View: Checking Report if submitted */}
                        {role === 'STUDENT' && myOfficialSubmission?.fullReport && (
                            <div className="asg-card">
                                <div className="asg-card-head">
                                    <div className="asg-card-title-group">
                                        <div className="asg-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#059669' }}>
                                            <Award size={18} />
                                        </div>
                                        <h2 className="asg-card-title">Automated UML Consistency Report</h2>
                                    </div>
                                </div>
                                <StudentCheckingReport report={myOfficialSubmission.fullReport} />
                            </div>
                        )}

                        {/* Teacher View: Submissions Table */}
                        {role === 'TEACHER' && (
                            <div className="asg-card">
                                <div className="asg-card-head">
                                    <div className="asg-card-title-group">
                                        <div className="asg-card-icon"><Users size={18} /></div>
                                        <h2 className="asg-card-title">Class Submissions ({teacherSubmissionsCount})</h2>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/teacher/assignments/${titleSlug}/submissions`)}
                                        className="asg-action-btn asg-action-btn-primary"
                                    >
                                        Full Report <ExternalLink size={13} />
                                    </button>
                                </div>

                                {teacherSubmissionsCount === 0 ? (
                                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                        <Users size={32} style={{ color: 'var(--ink-3)', margin: '0 auto 12px' }} />
                                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-2)', margin: 0 }}>No submissions received yet.</p>
                                        <p style={{ fontSize: '12px', color: 'var(--ink-3)', margin: '4px 0 0' }}>Students enrolled in this class will appear here once they turn in work.</p>
                                    </div>
                                ) : (
                                    <div className="asg-table-wrap">
                                        <table className="asg-table">
                                            <thead>
                                                <tr>
                                                    <th>Student</th>
                                                    <th>Status</th>
                                                    <th>Submitted At</th>
                                                    <th>Score</th>
                                                    <th style={{ textAlign: 'right' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {assignmentSubmissions
                                                    .filter(s => s.status && s.status.toLowerCase() !== 'pending')
                                                    .map((sub, index) => {
                                                        const student = studentsMap[sub.studentId];
                                                        const displayName = sub.studentName ||
                                                            student?.name ||
                                                            (sub.studentEmail ? sub.studentEmail.split('@')[0] : '') ||
                                                            'Student';
                                                        const displayEmail = sub.studentEmail || student?.email || '';
                                                        const isGraded = sub.status?.toLowerCase() === 'graded';

                                                        return (
                                                            <tr key={sub.submissionId || sub.id || index}>
                                                                <td>
                                                                    <div className="asg-student-cell">
                                                                        <div className="asg-student-avatar">
                                                                            {displayName.charAt(0).toUpperCase()}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: 700, color: 'var(--ink)' }}>{displayName}</div>
                                                                            <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{displayEmail}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <span className={isGraded ? 'apc-status-chip apc-status-graded' : 'apc-status-chip apc-status-submitted'}>
                                                                        {sub.status}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                                                                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '—'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    {sub.score != null ? (
                                                                        <span className="apc-score-pill apc-score-high">
                                                                            {sub.score}%
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>—</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ textAlign: 'right' }}>
                                                                    <button
                                                                        onClick={() => {
                                                                            const aSlug = assignment?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'assignment';
                                                                            const sSlug = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'student';
                                                                            navigate(`/teacher/submissions/${aSlug}/${sSlug}/${sub.submissionId || sub.id}`);
                                                                        }}
                                                                        className="asg-action-btn"
                                                                        title="Review Submission"
                                                                    >
                                                                        Review <ChevronRight size={13} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Status & Submission Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {role === 'STUDENT' ? (
                            <>
                                {myOfficialSubmission ? (
                                    /* Turned in summary card */
                                    <div className="asg-card">
                                        <div className="asg-turnedin-banner">
                                            <div className="asg-turnedin-left">
                                                <div className="asg-turnedin-icon">
                                                    <CheckCircle2 size={28} />
                                                </div>
                                                <div>
                                                    <h3 className="asg-turnedin-title">Work Turned In</h3>
                                                    <p className="asg-turnedin-time">
                                                        {myOfficialSubmission.submittedAt
                                                            ? `Submitted ${new Date(myOfficialSubmission.submittedAt).toLocaleDateString()}`
                                                            : 'Successfully submitted'}
                                                    </p>
                                                </div>
                                            </div>
                                            {myOfficialSubmission.score != null && (
                                                <div className="asg-turnedin-score">
                                                    <div className="asg-score-val">
                                                        {myOfficialSubmission.score}<span className="asg-score-max">/100</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Teacher remarks if graded */}
                                        {myOfficialSubmission.status?.toLowerCase() === 'graded' && (myOfficialSubmission.remarks || myOfficialSubmission.feedback) && (
                                            <div className="asg-feedback-box">
                                                <div className="asg-feedback-label">
                                                    <span>Teacher Feedback</span>
                                                </div>
                                                <p className="asg-feedback-text">
                                                    "{myOfficialSubmission.remarks || myOfficialSubmission.feedback}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Workspace link to view diagrams */}
                                        <button
                                            onClick={() => navigate(`/student/assignments/${assignment.title?.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                            className="asg-workspace-btn"
                                            style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
                                        >
                                            <Sparkles size={16} /> View Your UML Diagrams
                                        </button>
                                    </div>
                                ) : (
                                    /* Not turned in: Workspace Launch CTA + Submit Box */
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div
                                            className="asg-workspace-banner"
                                            onClick={() => navigate(`/student/assignments/${assignment.title?.toLowerCase().replace(/\s+/g, '-')}/work`)}
                                        >
                                            <div className="asg-workspace-icon">📐</div>
                                            <div>
                                                <h3 className="asg-workspace-title">Interactive UML Editor</h3>
                                                <p className="asg-workspace-desc">
                                                    Build Use Case Diagrams, System Sequence Diagrams, Class Diagrams, and Sequence Diagrams directly in the editor.
                                                </p>
                                            </div>
                                            <button className="asg-workspace-btn" type="button">
                                                Launch Workspace <ArrowUpRight size={15} />
                                            </button>
                                        </div>

                                        {!isOverdue ? (
                                            <div className="asg-card">
                                                <div className="asg-card-head">
                                                    <div className="asg-card-title-group">
                                                        <div className="asg-card-icon"><CheckCircle2 size={18} /></div>
                                                        <h2 className="asg-card-title">Turn In Assignment</h2>
                                                    </div>
                                                </div>
                                                <SubmitAssignment assignment={assignment} />
                                            </div>
                                        ) : (
                                            <div className="asg-card" style={{ textAlign: 'center', padding: '32px' }}>
                                                <AlertCircle size={28} style={{ color: '#ef4444', margin: '0 auto 10px' }} />
                                                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>Deadline Passed</h3>
                                                <p style={{ fontSize: '12px', color: 'var(--ink-3)', margin: '6px 0 0' }}>Submissions are closed for this assignment.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            /* Teacher quick stats */
                            <div className="asg-card">
                                <div className="asg-card-head">
                                    <div className="asg-card-title-group">
                                        <div className="asg-card-icon"><Award size={18} /></div>
                                        <h2 className="asg-card-title">Assignment Overview</h2>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 600 }}>Total Submissions</span>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>{teacherSubmissionsCount}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 600 }}>Graded</span>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
                                            {assignmentSubmissions.filter(s => s.status?.toLowerCase() === 'graded').length}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--ink-3)', fontWeight: 600 }}>Pending Review</span>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#d97706' }}>
                                            {assignmentSubmissions.filter(s => s.status?.toLowerCase() === 'submitted').length}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/teacher/assignments/${titleSlug}/submissions`)}
                                    className="asg-action-btn asg-action-btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '6px' }}
                                >
                                    Grade All Submissions
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Assignment Modal */}
            {role === 'TEACHER' && (
                <CreateAssignmentModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    onSubmit={handleUpdateAssignment}
                    isSubmitting={isSubmitting}
                    initialData={assignment}
                />
            )}

            {/* Resource Preview Modal */}
            {previewFile && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.7)',
                    backdropFilter: 'blur(6px)',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--surface)',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '960px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'var(--surface)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="asg-card-icon"><FileText size={18} /></div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--ink)' }}>{previewFile.name}</h3>
                                    <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>File Attachment Preview</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <a
                                    href={resolveResourceUrl(previewFile.url)}
                                    download={previewFile.name}
                                    className="asg-action-btn"
                                >
                                    <Download size={13} /> Download
                                </a>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="asg-action-btn"
                                    style={{ padding: '6px', borderRadius: '50%' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {previewFile.url && (previewFile.type?.startsWith('image/') ||
                                ['png', 'jpg', 'jpeg', 'gif', 'webp'].some(ext => previewFile.url.toLowerCase().endsWith('.' + ext)) ||
                                ['png', 'jpg', 'jpeg', 'gif', 'webp'].some(ext => previewFile.name.toLowerCase().endsWith('.' + ext))) ? (
                                <img
                                    src={resolveResourceUrl(previewFile.url)}
                                    alt={previewFile.name}
                                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '12px', border: '1px solid var(--border)' }}
                                />
                            ) : (previewFile.type === 'application/pdf' || previewFile.url.toLowerCase().endsWith('.pdf') || previewFile.name.toLowerCase().endsWith('.pdf')) ? (
                                <iframe
                                    src={resolveResourceUrl(previewFile.url)}
                                    style={{ width: '100%', height: '70vh', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    title="PDF Preview"
                                />
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <FileText size={40} style={{ color: 'var(--ink-3)', margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink-2)', margin: 0 }}>No interactive preview for this file type.</p>
                                    <button
                                        onClick={() => window.open(resolveResourceUrl(previewFile.url), '_blank')}
                                        className="asg-action-btn asg-action-btn-primary"
                                        style={{ marginTop: '16px' }}
                                    >
                                        Open in New Tab
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </PageShell>
    );
};

export default AssignmentDetails;
