import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    BookOpen,
    Send,
    Clock,
    Mail,
    RefreshCw,
    CheckCircle2,
    Settings as SettingsIcon,
    Plus
} from 'lucide-react';
import { auth } from '../../config/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import NotificationDropdown from '../../components/shared/NotificationDropdown';
import SettingsPanel from '../../components/shared/SettingsPanel';

const TeacherDashboard = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { logout, authState } = useAuth();

    const [isResending, setIsResending] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [verifMessage, setVerifMessage] = useState('');
    const [verifType, setVerifType] = useState('warning');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

    const userName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.firstName || user?.name || 'Teacher';
    const userInitials = (user?.firstName?.[0] || user?.name?.[0] || 'T').toUpperCase() + (user?.lastName?.[0] || '').toUpperCase();

    const today = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString(undefined, dateOptions);
    const greeting = today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening';

    return (
        <div className="t-app">
            <style>{`
                .t-app{
                  --ink:#0D0D14;
                  --ink-muted:#5A5A72;
                  --ink-faint:#9898AD;
                  --accent:#5046E5;
                  --accent-light:#7B6FFF;
                  --surface:#FFFFFF;
                  --surface-2:#F7F7FC;
                  --surface-3:#EFEFF9;
                  --sidebar-bg:#0D0D14;
                  --border:rgba(13,13,20,0.08);
                  --border-strong:rgba(13,13,20,0.14);
                  --green:#16A34A;
                  --amber:#D97706;
                  --red:#DC2626;
                  --radius-sm:8px;
                  --radius-md:14px;
                  --radius-lg:20px;
                  --font-display:'Syne',sans-serif;
                  --font-body:'DM Sans',sans-serif;
                  display:flex;height:100vh;overflow:hidden;
                  background:transparent;
                  font-family:var(--font-body);
                  color:var(--ink);
                }

                /* ── Sidebar ── */
                .t-sidebar{
                  width:256px;flex-shrink:0;
                  background:var(--sidebar-bg);
                  display:flex;flex-direction:column;
                  position:relative;overflow:hidden;
                }
                .t-sidebar::before{
                  content:'';position:absolute;
                  bottom:-40%;left:-30%;
                  width:300px;height:300px;
                  background:radial-gradient(circle,rgba(80,70,229,0.25),transparent 70%);
                  pointer-events:none;
                }
                .t-sidebar-logo{
                  display:flex;align-items:center;gap:10px;
                  padding:24px 24px 20px;
                  font-family:var(--font-display);font-size:18px;font-weight:800;
                  color:#fff;text-decoration:none;
                  border-bottom:1px solid rgba(255,255,255,0.06);
                }
                .t-logo-icon{
                  width:32px;height:32px;background:var(--accent);
                  border-radius:8px;display:grid;place-items:center;
                }
                .t-logo-icon svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round}
                .t-sidebar-user{
                  padding:16px 20px;
                  border-bottom:1px solid rgba(255,255,255,0.06);
                  display:flex;align-items:center;gap:12px;
                }
                .t-user-avatar{
                  width:36px;height:36px;background:var(--accent);
                  border-radius:50%;display:grid;place-items:center;
                  font-family:var(--font-display);font-size:13px;font-weight:700;
                  color:#fff;flex-shrink:0;
                }
                .t-user-name{font-size:13px;font-weight:600;color:#fff}
                .t-user-role{font-size:11px;color:rgba(255,255,255,0.35);font-weight:300;text-transform:uppercase;letter-spacing:.06em}
                .t-nav{padding:16px 12px;flex:1;overflow-y:auto}
                .t-nav-label{
                  font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
                  color:rgba(255,255,255,0.25);
                  padding:0 12px;margin:16px 0 8px;
                }
                .t-nav-item{
                  display:flex;align-items:center;gap:10px;
                  padding:10px 12px;
                  border-radius:var(--radius-sm);
                  color:rgba(255,255,255,0.5);
                  font-size:14px;font-weight:400;
                  text-decoration:none;
                  transition:background .2s,color .2s;
                  margin-bottom:2px;
                  cursor:pointer;
                }
                .t-nav-item svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
                .t-nav-item:hover,.t-nav-item.active{background:rgba(255,255,255,0.07);color:#fff}
                .t-nav-item.active{background:rgba(80,70,229,0.25);color:var(--accent-light)}
                .t-nav-item.active svg{stroke:var(--accent-light)}
                .t-sidebar-bottom{padding:16px;border-top:1px solid rgba(255,255,255,0.06)}
                .t-logout{
                  display:flex;align-items:center;gap:10px;
                  padding:10px 12px;border-radius:var(--radius-sm);
                  color:rgba(255,255,255,0.4);font-size:13px;
                  cursor:pointer;transition:background .2s,color .2s;
                }
                .t-logout:hover{background:rgba(255,255,255,0.06);color:#fff}
                .t-logout svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}

                /* ── Main ── */
                .t-main{flex:1;overflow-y:auto;display:flex;flex-direction:column}
                .t-topbar{
                  position:sticky;top:0;z-index:50;
                  background:rgba(247,247,252,0.9);
                  backdrop-filter:blur(12px);
                  border-bottom:1px solid var(--border);
                  padding:16px 32px;
                  display:flex;align-items:center;justify-content:space-between;
                }
                .t-topbar-title{font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--ink);letter-spacing:-.5px}
                .t-topbar-sub{font-size:13px;color:var(--ink-muted);font-weight:300;margin-top:2px}
                .t-topbar-right{display:flex;align-items:center;gap:12px}
                .t-topbar-btn{
                  width:38px;height:38px;background:var(--surface);
                  border:1px solid var(--border-strong);border-radius:var(--radius-sm);
                  display:grid;place-items:center;
                  cursor:pointer;transition:background .2s,border-color .2s;
                }
                .t-topbar-btn:hover{background:var(--surface-3);border-color:var(--accent)}
                .t-topbar-btn svg{width:18px;height:18px;stroke:var(--ink-muted);fill:none;stroke-width:1.8;stroke-linecap:round}
                .t-create-btn{
                  display:flex;align-items:center;gap:6px;
                  padding:8px 16px;
                  background:var(--accent);
                  color:#fff;
                  border:none;border-radius:var(--radius-sm);
                  font-family:var(--font-display);font-size:13px;font-weight:700;
                  cursor:pointer;transition:transform .2s,box-shadow .2s,background .2s;
                  box-shadow:0 4px 16px rgba(80,70,229,0.3);
                }
                .t-create-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(80,70,229,0.4);background:#4038c7}
                .t-create-btn svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2.5;stroke-linecap:round}

                /* ── Content ── */
                .t-content{padding:32px;flex:1}

                /* ── Stats ── */
                .t-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
                .t-stat{
                  background:var(--surface);
                  border:1px solid var(--border);
                  border-radius:var(--radius-md);
                  padding:24px;
                  cursor:pointer;
                  transition:transform .25s,box-shadow .25s,border-color .25s;
                  position:relative;overflow:hidden;
                  animation:tFadeUp .5s ease both;
                }
                .t-stat:nth-child(1){animation-delay:.05s}
                .t-stat:nth-child(2){animation-delay:.1s}
                .t-stat:nth-child(3){animation-delay:.15s}
                .t-stat:nth-child(4){animation-delay:.2s}
                .t-stat::before{
                  content:'';position:absolute;top:0;right:0;
                  width:80px;height:80px;border-radius:50%;
                  background:var(--surface-3);
                  transform:translate(20px,-20px);
                  transition:transform .3s;
                }
                .t-stat:hover::before{transform:translate(10px,-10px) scale(1.2)}
                .t-stat:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(13,13,20,0.08);border-color:var(--accent)}
                .t-stat-icon{
                  width:40px;height:40px;border-radius:var(--radius-sm);
                  display:grid;place-items:center;margin-bottom:16px;position:relative;z-index:1;
                }
                .t-stat-icon.blue{background:var(--surface-3)}
                .t-stat-icon.amber{background:#FFFBEB}
                .t-stat-icon.green{background:#F0FDF4}
                .t-stat-icon.purple{background:var(--surface-3)}
                .t-stat-icon svg{width:20px;height:20px;fill:none;stroke-width:2;stroke-linecap:round}
                .t-stat-icon.blue svg{stroke:var(--accent)}
                .t-stat-icon.amber svg{stroke:var(--amber)}
                .t-stat-icon.green svg{stroke:var(--green)}
                .t-stat-icon.purple svg{stroke:var(--accent-light)}
                .t-stat-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:6px;position:relative;z-index:1}
                .t-stat-value{font-family:var(--font-display);font-size:32px;font-weight:800;color:var(--ink);letter-spacing:-1px;position:relative;z-index:1}
                .t-stat-note{font-size:12px;color:var(--ink-muted);font-weight:300;margin-top:4px;position:relative;z-index:1}

                /* ── Grid ── */
                .t-grid{display:grid;grid-template-columns:1fr 340px;gap:24px}
                .t-main-col{display:flex;flex-direction:column;gap:24px}
                .t-side-col{display:flex;flex-direction:column;gap:24px}

                /* ── Panel ── */
                .t-panel{
                  background:var(--surface);border:1px solid var(--border);
                  border-radius:var(--radius-lg);overflow:hidden;
                  animation:tFadeUp .6s .2s ease both;
                }
                .t-panel-header{
                  padding:20px 24px 16px;
                  display:flex;align-items:center;justify-content:space-between;
                  border-bottom:1px solid var(--border);
                }
                .t-panel-title{font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--ink);letter-spacing:-.2px}
                .t-panel-subtitle{font-size:12px;color:var(--ink-muted);font-weight:300;margin-top:2px}
                .t-panel-action{
                  font-size:13px;font-weight:500;color:var(--accent);
                  text-decoration:none;padding:6px 12px;
                  border-radius:var(--radius-sm);background:var(--surface-3);
                  transition:background .2s;cursor:pointer;
                }
                .t-panel-action:hover{background:var(--accent);color:#fff}

                /* ── Class cards ── */
                .t-classes-list{padding:20px 24px;display:flex;flex-direction:column;gap:12px}
                .t-class-card{
                  display:flex;align-items:center;gap:16px;
                  padding:16px 20px;
                  background:var(--surface-2);border:1px solid var(--border);
                  border-radius:var(--radius-md);
                  text-decoration:none;
                  transition:background .2s,border-color .2s,transform .2s;
                  cursor:pointer;
                }
                .t-class-card:hover{background:var(--surface-3);border-color:var(--accent);transform:translateX(4px)}
                .t-class-icon{
                  width:44px;height:44px;background:var(--surface-3);
                  border-radius:var(--radius-sm);display:grid;place-items:center;
                  font-family:var(--font-display);font-size:16px;font-weight:800;
                  color:var(--accent);flex-shrink:0;border:1px solid var(--border-strong);
                }
                .t-class-info{flex:1}
                .t-class-name{font-size:15px;font-weight:600;color:var(--ink)}
                .t-class-desc{font-size:12px;color:var(--ink-muted);font-weight:300;margin-top:2px}
                .t-class-meta{display:flex;align-items:center;gap:16px;margin-top:6px}
                .t-class-meta-item{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--ink-faint)}
                .t-class-meta-item svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2}
                .t-class-badge{
                  font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
                  padding:3px 8px;border-radius:100px;
                  background:var(--surface-3);color:var(--accent);
                  border:1px solid var(--border-strong);flex-shrink:0;
                }

                /* ── Submission rows ── */
                .t-sub-list{padding:0 8px 16px}
                .t-sub-row{
                  display:flex;align-items:center;gap:14px;
                  padding:12px 16px;border-radius:var(--radius-md);
                  transition:background .2s,transform .15s;cursor:pointer;
                }
                .t-sub-row:hover{background:var(--surface-2);transform:translateX(2px)}
                .t-sub-avatar{
                  width:36px;height:36px;background:#F0FDF4;
                  border-radius:var(--radius-sm);display:grid;place-items:center;
                  font-family:var(--font-display);font-size:12px;font-weight:800;
                  color:var(--green);flex-shrink:0;
                }
                .t-sub-info{flex:1}
                .t-sub-name{font-size:14px;font-weight:600;color:var(--ink)}
                .t-sub-asgn{font-size:11px;color:var(--ink-muted);font-weight:300;margin-top:2px}
                .t-sub-date{font-size:11px;font-weight:600;color:var(--ink-muted);white-space:nowrap}
                .t-sub-status{
                  font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
                  padding:3px 8px;border-radius:100px;
                  background:#F0FDF4;color:var(--green);
                  border:1px solid rgba(22,163,74,0.2);flex-shrink:0;
                }

                /* ── Quick actions ── */
                .t-quick-links{padding:16px 24px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
                .t-quick-btn{
                  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
                  padding:16px 12px;
                  background:var(--surface-2);border:1px solid var(--border);
                  border-radius:var(--radius-md);
                  font-size:12px;font-weight:600;color:var(--ink-muted);
                  transition:background .2s,border-color .2s,color .2s,transform .2s;
                  cursor:pointer;text-align:center;
                }
                .t-quick-btn:hover{background:var(--surface-3);border-color:var(--accent);color:var(--accent);transform:translateY(-2px)}
                .t-quick-btn svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;transition:stroke .2s}

                /* ── Anim ── */
                @keyframes tFadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
            `}</style>

            {/* Sidebar */}
            <aside className="t-sidebar">
                <Link to="/teacher/dashboard" className="t-sidebar-logo">
                    <div className="t-logo-icon"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h12M3 18h8" /><circle cx="19" cy="18" r="3" /></svg></div>
                    UMLTutor
                </Link>
                <div className="t-sidebar-user">
                    <div className="t-user-avatar">{userInitials}</div>
                    <div>
                        <div className="t-user-name">{userName}</div>
                        <div className="t-user-role">Teacher</div>
                    </div>
                </div>
                <nav className="t-nav">
                    <div className="t-nav-label">Main</div>
                    <Link to="/teacher/dashboard" className="t-nav-item active">
                        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                        Dashboard
                    </Link>
                    <Link to="/teacher/classes" className="t-nav-item">
                        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                        My Classes
                    </Link>
                    <Link to="/teacher/assignments" className="t-nav-item">
                        <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg>
                        Assignments
                    </Link>
                    <Link to="/teacher/submissions" className="t-nav-item">
                        <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        Submissions
                    </Link>
                    <Link to="/teacher/tutorial-requests" className="t-nav-item">
                        <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                        Tutorial Requests
                    </Link>
                    <div className="t-nav-label">Management</div>
                    <Link to="/teacher/classes" className="t-nav-item">
                        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                        Create Class
                    </Link>
                    <Link to="/teacher/assignments" className="t-nav-item">
                        <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                        Create Assignment
                    </Link>
                </nav>
                <div className="t-sidebar-bottom">
                    <div className="t-logout" onClick={logout}>
                        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                        Log out
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="t-main">
                {/* Topbar */}
                <div className="t-topbar">
                    <div>
                        <div className="t-topbar-title">Good {greeting}, {user?.firstName || user?.name || 'Teacher'} 👋</div>
                        <div className="t-topbar-sub">{dateString} — {pendingReview} submission{pendingReview !== 1 ? 's' : ''} awaiting review</div>
                    </div>
                    <div className="t-topbar-right">
                        <NotificationDropdown />
                        <div className="t-topbar-btn" onClick={() => setIsSettingsOpen(true)}>
                            <SettingsIcon size={18} />
                        </div>
                        <button className="t-create-btn" onClick={() => navigate('/teacher/classes')}>
                            <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                            New Class
                        </button>
                    </div>
                </div>

                <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

                {/* Content */}
                <div className="t-content">
                    {/* Email Verification Banner */}
                    {authState.needsEmailVerification && (
                        <div className="mb-8">
                            <div className={`p-5 rounded-lg border ${verifType === 'success' ? 'bg-status-green/10 border-green-200' :
                                verifType === 'error' ? 'bg-status-red/10 border-status-red/20' :
                                    'bg-amber-50 border-amber-200'
                                } overflow-hidden relative`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-xl ${verifType === 'success' ? 'bg-green-100 text-status-green' : 'bg-amber-100 text-amber-600'}`}>
                                            <Mail size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className={`text-base font-extrabold font-heading ${verifType === 'success' ? 'text-green-900' : 'text-amber-900'}`}>
                                                {verifMessage || 'Action Required: Email Verification'}
                                            </h3>
                                            <p className={`text-sm font-medium ${verifType === 'success' ? 'text-green-700' : 'text-amber-700'}`}>
                                                {verifMessage ? '' : <>We've sent a link to <span className="font-bold">{auth.currentUser?.email}</span>. Please verify to access all features.</>}
                                            </p>
                                        </div>
                                    </div>
                                    {!verifMessage && (
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={handleCheckStatus} disabled={isChecking} className="flex items-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold font-heading rounded-lg transition-all disabled:opacity-50">
                                                {isChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={14} />} I'VE VERIFIED
                                            </button>
                                            <button onClick={handleResendEmail} disabled={isResending} className="flex items-center gap-2 py-2 px-4 border-2 border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-extrabold font-heading rounded-lg transition-all disabled:opacity-50">
                                                {isResending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw size={14} />} RESEND LINK
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="t-stats">
                        <div className="t-stat" onClick={() => navigate('/teacher/classes')}>
                            <div className="t-stat-icon blue">
                                <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                            </div>
                            <div className="t-stat-label">Total Classes</div>
                            <div className="t-stat-value">{classes.length}</div>
                            <div className="t-stat-note">Active classrooms</div>
                        </div>
                        <div className="t-stat" onClick={() => navigate('/teacher/assignments')}>
                            <div className="t-stat-icon amber">
                                <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /></svg>
                            </div>
                            <div className="t-stat-label">Active Assignments</div>
                            <div className="t-stat-value">{assignments.length}</div>
                            <div className="t-stat-note">Across all classes</div>
                        </div>
                        <div className="t-stat" onClick={() => navigate('/teacher/submissions')}>
                            <div className="t-stat-icon green">
                                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            </div>
                            <div className="t-stat-label">Total Submissions</div>
                            <div className="t-stat-value">{submissions.length}</div>
                            <div className="t-stat-note">Student work received</div>
                        </div>
                        <div className="t-stat" onClick={() => navigate('/teacher/submissions')}>
                            <div className="t-stat-icon purple">
                                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                            <div className="t-stat-label">Pending Review</div>
                            <div className="t-stat-value">{pendingReview}</div>
                            <div className="t-stat-note">Awaiting your feedback</div>
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="t-grid">
                        <div className="t-main-col">

                            {/* Classes */}
                            <div className="t-panel">
                                <div className="t-panel-header">
                                    <div>
                                        <div className="t-panel-title">Your Classes</div>
                                        <div className="t-panel-subtitle">Classrooms you manage</div>
                                    </div>
                                    <div className="t-panel-action" onClick={() => navigate('/teacher/classes')}>View All →</div>
                                </div>
                                <div className="t-classes-list">
                                    {isLoading ? (
                                        <div className="py-8 text-center text-muted text-sm">Loading classes...</div>
                                    ) : classes.length > 0 ? (
                                        classes.slice(0, 4).map(c => (
                                            <div key={c.id} className="t-class-card" onClick={() => navigate(`/teacher/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}>
                                                <div className="t-class-icon">{c.name.charAt(0)}</div>
                                                <div className="t-class-info">
                                                    <div className="t-class-name">{c.name}</div>
                                                    <div className="t-class-desc">{c.description || 'No description'}</div>
                                                    <div className="t-class-meta">
                                                        <span className="t-class-meta-item">
                                                            <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                                            {c.studentCount || 0} students
                                                        </span>
                                                        <span className="t-class-meta-item">
                                                            <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                                                            {c.totalAssignments || 0} assignments
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="t-class-badge">{c.code || 'CODE'}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center text-muted text-sm">No classes yet. Create one to get started!</div>
                                    )}
                                </div>
                            </div>

                            {/* Tutorial Requests */}
                            <div className="t-panel">
                                <div className="t-panel-header">
                                    <div>
                                        <div className="t-panel-title">Tutorial Requests</div>
                                        <div className="t-panel-subtitle">
                                            {pendingTutorialRequests} pending approval
                                        </div>
                                    </div>
                                    <div className="t-panel-action" onClick={() => navigate('/teacher/tutorial-requests')}>
                                        Manage →
                                    </div>
                                </div>
                                <div className="px-6 pb-6">
                                    <TutorialRequestsPanel compact showHeader={false} />
                                </div>
                            </div>

                            {/* Recent Assignments */}
                            <div className="t-panel">
                                <div className="t-panel-header">
                                    <div>
                                        <div className="t-panel-title">Active Assignments</div>
                                        <div className="t-panel-subtitle">Assignments across your classes</div>
                                    </div>
                                    <div className="t-panel-action" onClick={() => navigate('/teacher/assignments')}>View All →</div>
                                </div>
                                <div className="t-sub-list">
                                    {assignments.slice(0, 4).map(asgn => (
                                        <div key={asgn.id} className="t-sub-row" onClick={() => navigate(`/teacher/assignments/${asgn.title?.toLowerCase().replace(/\s+/g, '-')}`)}>
                                            <div className="t-sub-avatar" style={{ background: '#EFEFF9', color: 'var(--accent)' }}>{asgn.title?.charAt(0)}</div>
                                            <div className="t-sub-info">
                                                <div className="t-sub-name">{asgn.title}</div>
                                                <div className="t-sub-asgn">{classes.find(c => c.id === asgn.classId)?.name || 'Class'}</div>
                                            </div>
                                            <div className="t-sub-date">
                                                {asgn.deadline ? new Date(asgn.deadline).toLocaleDateString() : 'No deadline'}
                                            </div>
                                        </div>
                                    ))}
                                    {assignments.length === 0 && (
                                        <div className="py-8 text-center text-muted text-sm italic">No assignments yet</div>
                                    )}
                                </div>
                            </div>

                        </div>
                        <div className="t-side-col">

                            {/* Recent Submissions */}
                            <div className="t-panel">
                                <div className="t-panel-header">
                                    <div>
                                        <div className="t-panel-title">Recent Submissions</div>
                                        <div className="t-panel-subtitle">Latest student work</div>
                                    </div>
                                    <div className="t-panel-action" onClick={() => navigate('/teacher/submissions')}>All →</div>
                                </div>
                                <div className="t-sub-list">
                                    {isLoading ? (
                                        <div className="py-8 text-center text-muted text-sm">Loading...</div>
                                    ) : recentSubmissions.length > 0 ? (
                                        recentSubmissions.map(sub => (
                                            <div key={sub.id} className="t-sub-row" onClick={() => {
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
                                                <div className="t-sub-avatar">{sub.studentName?.charAt(0) || 'S'}</div>
                                                <div className="t-sub-info">
                                                    <div className="t-sub-name">{sub.studentName || 'Student'}</div>
                                                    <div className="t-sub-asgn">{assignmentsMap[sub.assignmentId]?.title || sub.assignmentTitle || 'Assignment'}</div>
                                                </div>
                                                <div className="t-sub-date">{new Date(sub.submittedAt).toLocaleDateString()}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center text-muted text-sm italic">No recent activity</div>
                                    )}
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="t-panel">
                                <div className="t-panel-header">
                                    <div className="t-panel-title">Quick Actions</div>
                                </div>
                                <div className="t-quick-links">
                                    <div className="t-quick-btn" onClick={() => navigate('/teacher/classes')}>
                                        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                                        New Class
                                    </div>
                                    <div className="t-quick-btn" onClick={() => navigate('/teacher/assignments')}>
                                        <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /></svg>
                                        Assignment
                                    </div>
                                    <div className="t-quick-btn" onClick={() => navigate('/teacher/submissions')}>
                                        <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                        Review
                                    </div>
                                    <div className="t-quick-btn" onClick={() => navigate('/teacher/tutorial-requests')}>
                                        <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                                        Tutorials
                                    </div>
                                    <div className="t-quick-btn" onClick={() => setIsSettingsOpen(true)}>
                                        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" /></svg>
                                        Profile
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherDashboard;
