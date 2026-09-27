import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, X, ChevronRight, Users, GraduationCap, Layers } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectClasses, fetchClasses, joinClass } from '../../features/classroom';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import PageShell from '../../components/dashboard/PageShell';

/* Gradient pool for class avatars */
const GRADIENTS = [
    'linear-gradient(135deg,#5046E5,#8B5CF6)',
    'linear-gradient(135deg,#3B82F6,#06B6D4)',
    'linear-gradient(135deg,#10B981,#3B82F6)',
    'linear-gradient(135deg,#F59E0B,#EF4444)',
    'linear-gradient(135deg,#8B5CF6,#EC4899)',
    'linear-gradient(135deg,#06B6D4,#10B981)',
];

const StudentClasses = () => {
    const navigate   = useNavigate();
    const dispatch   = useAppDispatch();
    const classes    = useAppSelector(selectClasses) || [];
    const assignments = useAppSelector(selectAllAssignments) || [];
    const submissions = useAppSelector(selectSubmissions) || [];

    const [classCode, setClassCode]     = useState('');
    const [isJoining, setIsJoining]     = useState(false);
    const [joinError, setJoinError]     = useState('');
    const [showJoinForm, setShowJoinForm] = useState(false);

    useEffect(() => {
        dispatch(fetchClasses('STUDENT'));
        dispatch(fetchAllAssignments('STUDENT'));
        dispatch(fetchMySubmissions());
    }, [dispatch]);

    const handleJoinClass = async (e) => {
        e.preventDefault();
        setJoinError('');
        setIsJoining(true);
        try {
            await dispatch(joinClass(classCode)).unwrap();
            setClassCode('');
            setIsJoining(false);
            setShowJoinForm(false);
            dispatch(fetchClasses('STUDENT'));
        } catch (error) {
            setJoinError(error || 'Invalid class code. Please try again.');
            setIsJoining(false);
        }
    };

    return (
        <>
            <PageShell
                title="My Classes"
                subtitle="Courses you're enrolled in — click to enter a classroom"
                icon={<BookOpen size={22} />}
                badge={classes.length}
                breadcrumbs={[{ label: 'My Classes' }]}
                actions={
                    <button className="apc-primary-btn" onClick={() => setShowJoinForm(true)}>
                        <Plus size={16} />
                        <span>Join Class</span>
                    </button>
                }
            >
                {classes.length > 0 ? (
                    <div className="cls-grid">
                        {classes.map((c, idx) => {
                            const classAssignments = assignments.filter(a => a.classId === c.id);
                            const done = classAssignments.filter(a => {
                                const sub = submissions.find(s => s.assignmentId === a.id);
                                return ['submitted','graded','completed'].includes(sub?.status?.toLowerCase());
                            }).length;
                            const progress = classAssignments.length > 0
                                ? Math.round((done / classAssignments.length) * 100)
                                : null;
                            const grad = GRADIENTS[idx % GRADIENTS.length];

                            return (
                                <div
                                    key={c.id}
                                    className="cls-card"
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '20px',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)'
                                    }}
                                    onClick={() => navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={e => { if (e.key === 'Enter') navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`); }}
                                >
                                    {/* Colour banner */}
                                    <div className="cls-card-banner" style={{ background: grad }}>
                                        <div className="cls-card-avatar">
                                            {c.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="cls-card-code">{c.code}</span>
                                    </div>

                                    <div className="cls-card-body" style={{ background: '#ffffff', padding: '22px' }}>
                                        <h3 className="cls-card-name" style={{ color: '#0f172a', fontWeight: 800 }}>{c.name}</h3>
                                        <p className="cls-card-desc" style={{ color: '#334155', fontWeight: 500 }}>
                                            {c.description || 'No description provided for this classroom yet.'}
                                        </p>

                                        <div className="cls-card-meta">
                                            {c.teacherName && (
                                                <span className="cls-meta-tag" style={{ color: '#1e293b', background: '#f1f5f9', borderColor: '#cbd5e1' }}>
                                                    <GraduationCap size={12} /> {c.teacherName}
                                                </span>
                                            )}
                                            <span className="cls-meta-tag" style={{ color: '#1e293b', background: '#f1f5f9', borderColor: '#cbd5e1' }}>
                                                <Layers size={12} /> {classAssignments.length} assignments
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        {progress !== null && (
                                            <div className="cls-progress-wrap" style={{ marginTop: 'auto', paddingTop: '10px' }}>
                                                <div className="cls-progress-header">
                                                    <span className="cls-progress-label" style={{ color: '#475569', fontWeight: 800 }}>Completion</span>
                                                    <span className="cls-progress-pct" style={{ color: '#0f172a', fontWeight: 900 }}>{progress}%</span>
                                                </div>
                                                <div className="cls-progress-track" style={{ background: '#e2e8f0', height: '7px' }}>
                                                    <div
                                                        className="cls-progress-fill"
                                                        style={{ width: `${progress}%`, background: grad, height: '100%', borderRadius: '99px' }}
                                                    />
                                                </div>
                                                <span className="cls-progress-note" style={{ color: '#475569', fontWeight: 600 }}>{done} of {classAssignments.length} done</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="cls-card-enter" style={{ background: '#f8fafc', color: '#4338ca', fontWeight: 800, borderTop: '1px solid #e2e8f0' }}>
                                        Enter Classroom <ChevronRight size={14} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="apc-empty">
                        <div className="apc-empty-ring">
                            <BookOpen size={40} style={{ color: 'var(--ink-3)' }} />
                        </div>
                        <h3>No Classes Yet</h3>
                        <p>You haven't joined any classes. Get a class code from your teacher to get started.</p>
                        <button className="apc-empty-btn" onClick={() => setShowJoinForm(true)}>
                            <Plus size={14} /> Join Your First Class
                        </button>
                    </div>
                )}
            </PageShell>

            {/* Join Class Modal */}
            {showJoinForm && (
                <div className="sdb-modal-backdrop" onClick={() => setShowJoinForm(false)}>
                    <div className="sdb-modal" onClick={e => e.stopPropagation()}>
                        <div className="sdb-modal-head">
                            <div>
                                <h2>Join a Class</h2>
                                <p>Enter the class code your teacher gave you</p>
                            </div>
                            <button className="sdb-modal-close" onClick={() => setShowJoinForm(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form className="sdb-modal-body" onSubmit={handleJoinClass}>
                            <label htmlFor="cls-code-input">Class Code</label>
                            <input
                                id="cls-code-input"
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
                            <button type="submit" disabled={isJoining} className="sdb-modal-submit">
                                {isJoining ? 'Joining…' : 'Join Classroom'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default StudentClasses;
