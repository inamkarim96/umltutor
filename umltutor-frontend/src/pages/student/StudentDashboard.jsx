import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectUser } from '../../features/auth';
import { useAuth } from '../../contexts/AuthContext';
import {
    selectClasses,
    joinClass,
    fetchClasses
} from '../../features/classroom';
import { selectAllAssignments, fetchAllAssignments } from '../../features/assignments';
import { selectSubmissions, fetchMySubmissions } from '../../features/submissions';
import { auth } from '../../config/firebase';
import { sendEmailVerification, reload } from 'firebase/auth';
import {
    BookOpen,
    Clock,
    CheckCircle,
    X,
    LogOut,
    Mail,
    RefreshCw,
    CheckCircle2,
    Settings as SettingsIcon
} from 'lucide-react';
import NotificationDropdown from '../../components/shared/NotificationDropdown';
import SettingsPanel from '../../components/shared/SettingsPanel';

const StudentDashboard = () => {
    const user = useAppSelector(selectUser);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { logout: authLogout, authState } = useAuth();

    // Verification state
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

    const submittedCount = mySubmissions.filter(s => {
        const status = s.status?.toLowerCase();
        return status === 'submitted';
    }).length;

    const reviewedCount = mySubmissions.filter(s => {
        const status = s.status?.toLowerCase();
        return status === 'graded' || status === 'completed';
    }).length;

    const handleJoinClass = async (e) => {
        e.preventDefault();
        setJoinError('');

        try {
            await dispatch(joinClass(classCode)).unwrap();
            setClassCode('');
            setIsJoining(false);
        } catch (error) {
            setJoinError(error || 'Failed to join class. Please check the code.');
        }
    };

    const userName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.name || 'Student';
    const userInitials = (user?.firstName?.[0] || user?.name?.[0] || 'S').toUpperCase() + (user?.lastName?.[0] || '').toUpperCase();

    // Sort assignments by deadline
    const sortedAssignments = [...pendingAssignments].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const recentAssignments = sortedAssignments.slice(0, 3);
    const upcomingDeadlines = sortedAssignments.slice(0, 3);

    // Get active assignment progress if any
    const activeAssignment = pendingAssignments[0];
    const activeAssignmentProgress = 20; // Example static logic from original, could be dynamic

    // Date formatting
    const today = new Date();
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = today.toLocaleDateString(undefined, dateOptions);

    const getDeadlineStatus = (deadline) => {
        if (!deadline) return { class: 'ok', text: 'No Date' };
        const date = new Date(deadline);
        const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { class: 'overdue', text: date.toLocaleDateString() };
        if (diffDays <= 3) return { class: 'soon', text: date.toLocaleDateString() };
        return { class: 'ok', text: date.toLocaleDateString() };
    };

    return (
        <div className="app">
            <style>{`
                .app{
                  --ink:#0D0D14;
                  --ink-muted:#5A5A72;
                  --ink-faint:#9898AD;
                  --accent:#5046E5;
                  --accent-light:#7B6FFF;
                  --accent-glow:rgba(80,70,229,0.12);
                  --surface:#FFFFFF;
                  --surface-2:#F7F7FC;
                  --surface-3:#EFEFF9;
                  --sidebar-bg:#0D0D14;
                  --border:rgba(13,13,20,0.08);
                  --border-strong:rgba(13,13,20,0.14);
                  --green:#16A34A;
                  --green-bg:#F0FDF4;
                  --amber:#D97706;
                  --amber-bg:#FFFBEB;
                  --red:#DC2626;
                  --red-bg:#FEF2F2;
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
                .sidebar{
                  width:256px;flex-shrink:0;
                  background:var(--sidebar-bg);
                  display:flex;flex-direction:column;
                  padding:0;
                  position:relative;
                  overflow:hidden;
                }
                .sidebar::before{
                  content:'';position:absolute;
                  bottom:-40%;left:-30%;
                  width:300px;height:300px;
                  background:radial-gradient(circle,rgba(80,70,229,0.25),transparent 70%);
                  pointer-events:none;
                }
                .sidebar-logo{
                  display:flex;align-items:center;gap:10px;
                  padding:24px 24px 20px;
                  font-family:var(--font-display);font-size:18px;font-weight:800;
                  color:#fff;text-decoration:none;
                  border-bottom:1px solid rgba(255,255,255,0.06);
                }
                .logo-icon{
                  width:32px;height:32px;
                  background:var(--accent);
                  border-radius:8px;
                  display:grid;place-items:center;
                }
                .logo-icon svg{width:16px;height:16px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round}
                .sidebar-user{
                  padding:16px 20px;
                  border-bottom:1px solid rgba(255,255,255,0.06);
                  display:flex;align-items:center;gap:12px;
                }
                .user-avatar{
                  width:36px;height:36px;
                  background:var(--accent);
                  border-radius:50%;
                  display:grid;place-items:center;
                  font-family:var(--font-display);font-size:13px;font-weight:700;color:#fff;flex-shrink:0;
                }
                .user-info-name{font-size:13px;font-weight:600;color:#fff}
                .user-info-role{font-size:11px;color:rgba(255,255,255,0.35);font-weight:300;text-transform:uppercase;letter-spacing:.06em}
                .sidebar-nav{padding:16px 12px;flex:1;overflow-y:auto}
                .nav-section-label{
                  font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
                  color:rgba(255,255,255,0.25);
                  padding:0 12px;margin:16px 0 8px;
                }
                .nav-item{
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
                .nav-item svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0}
                .nav-item:hover,.nav-item.active{background:rgba(255,255,255,0.07);color:#fff}
                .nav-item.active{background:rgba(80,70,229,0.25);color:var(--accent-light)}
                .nav-item.active svg{stroke:var(--accent-light)}
                .sidebar-bottom{
                  padding:16px;
                  border-top:1px solid rgba(255,255,255,0.06);
                }
                .sidebar-logout{
                  display:flex;align-items:center;gap:10px;
                  padding:10px 12px;
                  border-radius:var(--radius-sm);
                  color:rgba(255,255,255,0.4);
                  font-size:13px;
                  cursor:pointer;
                  transition:background .2s,color .2s;
                }
                .sidebar-logout:hover{background:rgba(255,255,255,0.06);color:#fff}
                .sidebar-logout svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}

                /* ── Main ── */
                .main{flex:1;overflow-y:auto;display:flex;flex-direction:column}
                .topbar{
                  position:sticky;top:0;z-index:50;
                  background:rgba(247,247,252,0.9);
                  backdrop-filter:blur(12px);
                  border-bottom:1px solid var(--border);
                  padding:16px 32px;
                  display:flex;align-items:center;justify-content:space-between;
                }
                .topbar-left h1{font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--ink);letter-spacing:-.5px}
                .topbar-left p{font-size:13px;color:var(--ink-muted);font-weight:300;margin-top:2px}
                .topbar-right{display:flex;align-items:center;gap:12px}
                .topbar-btn{
                  width:38px;height:38px;
                  background:var(--surface);
                  border:1px solid var(--border-strong);
                  border-radius:var(--radius-sm);
                  display:grid;place-items:center;
                  cursor:pointer;transition:background .2s,border-color .2s;
                  position:relative;
                }
                .topbar-btn:hover{background:var(--surface-3);border-color:var(--accent)}
                .topbar-btn svg{width:18px;height:18px;stroke:var(--ink-muted);fill:none;stroke-width:1.8;stroke-linecap:round}

                /* ── Content ── */
                .content{padding:32px;flex:1}

                /* ── Stats cards ── */
                .stats-grid{
                  display:grid;
                  grid-template-columns:repeat(4,1fr);
                  gap:16px;
                  margin-bottom:32px;
                }
                .stat-card{
                  background:var(--surface);
                  border:1px solid var(--border);
                  border-radius:var(--radius-md);
                  padding:24px;
                  transition:transform .25s,box-shadow .25s,border-color .25s;
                  position:relative;overflow:hidden;
                  cursor:pointer;
                }
                .stat-card::before{
                  content:'';position:absolute;
                  top:0;right:0;
                  width:80px;height:80px;
                  border-radius:50%;
                  background:var(--surface-3);
                  transform:translate(20px,-20px);
                  transition:transform .3s;
                }
                .stat-card:hover::before{transform:translate(10px,-10px) scale(1.2)}
                .stat-card:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(13,13,20,0.08);border-color:var(--accent)}
                .stat-icon{
                  width:40px;height:40px;
                  border-radius:var(--radius-sm);
                  display:grid;place-items:center;
                  margin-bottom:16px;
                  position:relative;z-index:1;
                }
                .stat-icon.blue{background:var(--surface-3)}
                .stat-icon.amber{background:#FFFBEB}
                .stat-icon.green{background:#F0FDF4}
                .stat-icon.purple{background:var(--surface-3)}
                .stat-icon svg{width:20px;height:20px;fill:none;stroke-width:2;stroke-linecap:round}
                .stat-icon.blue svg{stroke:var(--accent)}
                .stat-icon.amber svg{stroke:var(--amber)}
                .stat-icon.green svg{stroke:var(--green)}
                .stat-icon.purple svg{stroke:var(--accent-light)}
                .stat-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:6px;position:relative;z-index:1}
                .stat-value{font-family:var(--font-display);font-size:32px;font-weight:800;color:var(--ink);letter-spacing:-1px;position:relative;z-index:1}
                .stat-note{font-size:12px;color:var(--ink-muted);font-weight:300;margin-top:4px;position:relative;z-index:1}

                /* ── Grid layout ── */
                .dash-grid{display:grid;grid-template-columns:1fr 340px;gap:24px}
                .dash-main-col{display:flex;flex-direction:column;gap:24px}
                .dash-side-col{display:flex;flex-direction:column;gap:24px}

                /* ── Panel ── */
                .panel{
                  background:var(--surface);
                  border:1px solid var(--border);
                  border-radius:var(--radius-lg);
                  overflow:hidden;
                }
                .panel-header{
                  padding:20px 24px 16px;
                  display:flex;align-items:center;justify-content:space-between;
                  border-bottom:1px solid var(--border);
                }
                .panel-title{font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--ink);letter-spacing:-.2px}
                .panel-subtitle{font-size:12px;color:var(--ink-muted);font-weight:300;margin-top:2px}
                .panel-action{
                  font-size:13px;font-weight:500;color:var(--accent);
                  text-decoration:none;
                  padding:6px 12px;
                  border-radius:var(--radius-sm);
                  background:var(--surface-3);
                  transition:background .2s;
                  cursor:pointer;
                }
                .panel-action:hover{background:var(--accent);color:#fff}

                /* ── Class card ── */
                .classes-list{padding:20px 24px;display:flex;flex-direction:column;gap:12px}
                .class-card{
                  display:flex;align-items:center;gap:16px;
                  padding:16px 20px;
                  background:var(--surface-2);
                  border:1px solid var(--border);
                  border-radius:var(--radius-md);
                  text-decoration:none;
                  transition:background .2s,border-color .2s,transform .2s;
                }
                .class-card:hover{background:var(--surface-3);border-color:var(--accent);transform:translateX(4px)}
                .class-icon{
                  width:44px;height:44px;
                  background:var(--surface-3);
                  border-radius:var(--radius-sm);
                  display:grid;place-items:center;
                  font-family:var(--font-display);font-size:16px;font-weight:800;
                  color:var(--accent);flex-shrink:0;
                  border:1px solid var(--border-strong);
                }
                .class-info{flex:1}
                .class-name{font-size:15px;font-weight:600;color:var(--ink)}
                .class-desc{font-size:12px;color:var(--ink-muted);font-weight:300;margin-top:2px}
                .class-meta{display:flex;align-items:center;gap:16px;margin-top:6px}
                .class-meta-item{display:flex;align-items:center;gap:4px;font-size:11px;color:var(--ink-faint)}
                .class-meta-item svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2}
                .class-badge{
                  font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
                  padding:3px 8px;border-radius:100px;
                  background:var(--surface-3);color:var(--accent);
                  border:1px solid var(--border-strong);flex-shrink:0;
                }

                /* ── Assignment row ── */
                .assignments-list{padding:0 8px 16px}
                .assignment-row{
                  display:flex;align-items:center;gap:16px;
                  padding:14px 16px;
                  border-radius:var(--radius-md);
                  text-decoration:none;
                  transition:background .2s,transform .15s;
                  cursor:pointer;
                }
                .assignment-row:hover{background:var(--surface-2);transform:translateX(2px)}
                .assignment-avatar{
                  width:36px;height:36px;
                  background:var(--accent);
                  border-radius:var(--radius-sm);
                  display:grid;place-items:center;
                  font-family:var(--font-display);font-size:12px;font-weight:800;color:#fff;flex-shrink:0;
                }
                .assignment-info{flex:1}
                .assignment-name{font-size:14px;font-weight:600;color:var(--ink)}
                .assignment-class{font-size:11px;color:var(--ink-muted);font-weight:300;margin-top:2px}
                .assignment-due{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;white-space:nowrap}
                .assignment-due.overdue{color:var(--red)}
                .assignment-due.soon{color:var(--amber)}
                .assignment-due.ok{color:var(--green)}
                .assignment-due svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2}
                .assignment-status{
                  width:8px;height:8px;border-radius:50%;flex-shrink:0;
                }
                .assignment-status.pending{background:var(--amber)}
                .assignment-status.done{background:var(--green)}

                /* ── Progress panel ── */
                .progress-list{padding:16px 24px;display:flex;flex-direction:column;gap:16px}
                .progress-item{display:flex;flex-direction:column;gap:6px}
                .progress-item-header{display:flex;align-items:center;justify-content:space-between}
                .progress-item-label{font-size:13px;font-weight:500;color:var(--ink)}
                .progress-item-value{font-size:12px;font-weight:600;color:var(--ink-muted)}
                .progress-bar-wrap{height:6px;background:var(--surface-3);border-radius:100px;overflow:hidden}
                .progress-bar{height:100%;border-radius:100px;background:var(--accent);transition:width 1s ease}

                /* ── Deadline items ── */
                .deadline-list{padding:0 8px 16px}
                .deadline-item{
                  display:flex;align-items:center;gap:12px;
                  padding:12px 16px;
                  border-radius:var(--radius-md);
                  transition:background .2s;
                  cursor:pointer;
                }
                .deadline-item:hover{background:var(--surface-2)}
                .deadline-dot{
                  width:10px;height:10px;border-radius:50%;flex-shrink:0;
                  margin-top:2px;
                }
                .deadline-dot.overdue{background:var(--red)}
                .deadline-dot.soon{background:var(--amber)}
                .deadline-dot.ok{background:var(--green)}
                .deadline-info{flex:1}
                .deadline-name{font-size:13px;font-weight:600;color:var(--ink)}
                .deadline-class{font-size:11px;color:var(--ink-muted);font-weight:300;margin-top:1px}
                .deadline-date{font-size:11px;font-weight:600;color:var(--ink-muted);white-space:nowrap}

                /* ── Quick links ── */
                .quick-links{padding:16px 24px;display:grid;grid-template-columns:1fr 1fr;gap:10px}
                .quick-link-btn{
                  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
                  padding:16px 12px;
                  background:var(--surface-2);
                  border:1px solid var(--border);
                  border-radius:var(--radius-md);
                  text-decoration:none;font-size:12px;font-weight:600;
                  color:var(--ink-muted);
                  transition:background .2s,border-color .2s,color .2s,transform .2s;
                  cursor:pointer;text-align:center;
                }
                .quick-link-btn:hover{background:var(--surface-3);border-color:var(--accent);color:var(--accent);transform:translateY(-2px)}
                .quick-link-btn svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;transition:stroke .2s}

                /* ── Animations ── */
                @keyframes slideIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:translateX(0)}}
                @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
                .stat-card{animation:fadeUp .5s ease both}
                .stat-card:nth-child(1){animation-delay:.05s}
                .stat-card:nth-child(2){animation-delay:.1s}
                .stat-card:nth-child(3){animation-delay:.15s}
                .stat-card:nth-child(4){animation-delay:.2s}
                .panel{animation:fadeUp .6s .2s ease both}
            `}</style>

            {/* Sidebar */}
            <aside className="sidebar">
                <Link to="/student/dashboard" className="sidebar-logo">
                    <div className="logo-icon"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h12M3 18h8" /><circle cx="19" cy="18" r="3" /></svg></div>
                    UMLTutor
                </Link>
                <div className="sidebar-user">
                    <div className="user-avatar">{userInitials}</div>
                    <div>
                        <div className="user-info-name">{userName}</div>
                        <div className="user-info-role">Student</div>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section-label">Main</div>
                    <Link to="/student/dashboard" className="nav-item active">
                        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                        Dashboard
                    </Link>
                    <Link to="/student/classes" className="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                        My Classes
                    </Link>
                    <Link to="/student/assignments" className="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /><path d="M9 12h6M9 16h4" /></svg>
                        Assignments
                    </Link>
                    <Link to="/student/assignments/pending" className="nav-item">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                        Upcoming
                    </Link>
                    <div className="nav-section-label">Work</div>
                    <Link to="/student/assignments/pending" className="nav-item">
                        <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        In Progress
                    </Link>
                    <Link to="/student/assignments/submitted" className="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        Submitted
                    </Link>
                    <Link to="/student/assignments/reviewed" className="nav-item">
                        <svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                        Reviewed
                    </Link>
                </nav>
                <div className="sidebar-bottom">
                    <div className="sidebar-logout" onClick={authLogout}>
                        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                        Log out
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="main">
                {/* Topbar */}
                <div className="topbar">
                    <div className="topbar-left">
                        <h1>Good {today.getHours() < 12 ? 'morning' : today.getHours() < 18 ? 'afternoon' : 'evening'}, {user?.firstName || user?.name || 'Student'} 👋</h1>
                        <p>{dateString} — You have {pendingAssignments.length} pending assignment{pendingAssignments.length !== 1 && 's'}</p>
                    </div>
                    <div className="topbar-right">
                        <NotificationDropdown />
                        <div className="topbar-btn" onClick={() => setIsSettingsOpen(true)}>
                            <SettingsIcon size={18} />
                        </div>
                    </div>
                </div>

                <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

                {/* Content */}
                <div className="content">
                    {/* Email Verification Banner */}
                    {authState.needsEmailVerification && (
                        <div className="mb-8 animate-in slide-in-from-top-4 duration-300">
                            <div className={`p-5 rounded-lg border ${verifType === 'success' ? 'bg-status-green/10 border-green-200' :
                                verifType === 'error' ? 'bg-status-red/10 border-status-red/20' :
                                    'bg-amber-50 border-amber-200'
                                } shadow-card overflow-hidden relative`}>
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
                                                {verifMessage ? '' : <>We've sent a link to <span className="font-bold font-body">{auth.currentUser?.email}</span>. Please verify to access all features.</>}
                                            </p>
                                        </div>
                                    </div>
                                    {!verifMessage && (
                                        <div className="flex gap-2 shrink-0">
                                            <button onClick={handleCheckStatus} disabled={isChecking} className="flex items-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold font-heading rounded-lg transition-all active:scale-95 disabled:opacity-50">
                                                {isChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 size={14} />} I'VE VERIFIED
                                            </button>
                                            <button onClick={handleResendEmail} disabled={isResending} className="flex items-center gap-2 py-2 px-4 border-2 border-amber-200 text-amber-700 hover:bg-amber-100 text-xs font-extrabold font-heading rounded-lg transition-all active:scale-95 disabled:opacity-50">
                                                {isResending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw size={14} />} RESEND LINK
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="stat-card" onClick={() => navigate('/student/classes')}>
                            <div className="stat-icon blue">
                                <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                            </div>
                            <div className="stat-label">Joined Classes</div>
                            <div className="stat-value">{myClasses.length}</div>
                            <div className="stat-note">Active enrollment</div>
                        </div>
                        <div className="stat-card" onClick={() => navigate('/student/assignments/pending')}>
                            <div className="stat-icon amber">
                                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            </div>
                            <div className="stat-label">Pending Assignments</div>
                            <div className="stat-value">{pendingAssignments.length}</div>
                            <div className="stat-note">Awaiting your work</div>
                        </div>
                        <div className="stat-card" onClick={() => navigate('/student/assignments/submitted')}>
                            <div className="stat-icon green">
                                <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                            </div>
                            <div className="stat-label">Submitted Work</div>
                            <div className="stat-value">{submittedCount}</div>
                            <div className="stat-note">Under review</div>
                        </div>
                        <div className="stat-card" onClick={() => navigate('/student/assignments/reviewed')}>
                            <div className="stat-icon purple">
                                <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                            </div>
                            <div className="stat-label">Reviewed Work</div>
                            <div className="stat-value">{reviewedCount}</div>
                            <div className="stat-note">Feedback received</div>
                        </div>
                    </div>

                    {/* Main content grid */}
                    <div className="dash-grid">
                        <div className="dash-main-col">

                            {/* My Classes */}
                            <div className="panel">
                                <div className="panel-header">
                                    <div>
                                        <div className="panel-title">My Classes</div>
                                        <div className="panel-subtitle">Courses you're enrolled in</div>
                                    </div>
                                    <div onClick={() => navigate('/student/classes')} className="panel-action">View All →</div>
                                </div>
                                <div className="classes-list">
                                    {myClasses.length > 0 ? (
                                        myClasses.slice(0, 3).map(c => (
                                            <div key={c.id} className="class-card" onClick={() => navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}>
                                                <div className="class-icon">{c.name.charAt(0)}</div>
                                                <div className="class-info">
                                                    <div className="class-name">{c.name}</div>
                                                    <div className="class-desc">{c.description || 'No description provided'}</div>
                                                    <div className="class-meta">
                                                        <span className="class-meta-item">
                                                            <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                            {c.teacherName || 'Teacher'}
                                                        </span>
                                                        <span className="class-meta-item">
                                                            <svg viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" /></svg>
                                                            {c.totalAssignments || 0} assignments
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="class-badge">{c.code || 'CODE'}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-muted font-medium">You haven't joined any classes yet.</div>
                                    )}
                                </div>
                            </div>

                            {/* Assignments */}
                            <div className="panel">
                                <div className="panel-header">
                                    <div>
                                        <div className="panel-title">Recent Assignments</div>
                                        <div className="panel-subtitle">Your active and recent work</div>
                                    </div>
                                    <div onClick={() => navigate('/student/assignments')} className="panel-action">View All →</div>
                                </div>
                                <div className="assignments-list">
                                    {recentAssignments.length > 0 ? (
                                        recentAssignments.map(asgn => {
                                            const status = getDeadlineStatus(asgn.deadline);
                                            return (
                                                <div key={asgn.id} className="assignment-row" onClick={() => navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`)}>
                                                    <div className="assignment-avatar">{asgn.title?.charAt(0)}</div>
                                                    <div className="assignment-info">
                                                        <div className="assignment-name">{asgn.title}</div>
                                                        <div className="assignment-class">{myClasses.find(c => c.id === asgn.classId)?.name}</div>
                                                    </div>
                                                    <div className={`assignment-due ${status.class}`}>
                                                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                        {status.text}
                                                    </div>
                                                    <div className="assignment-status pending"></div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="p-8 text-center text-muted text-sm italic">All caught up!</div>
                                    )}
                                </div>
                            </div>

                        </div>
                        <div className="dash-side-col">

                            {/* Upcoming Deadlines */}
                            <div className="panel">
                                <div className="panel-header">
                                    <div>
                                        <div className="panel-title">Upcoming Deadlines</div>
                                        <div className="panel-subtitle">Don't miss these</div>
                                    </div>
                                </div>
                                <div className="deadline-list">
                                    {upcomingDeadlines.length > 0 ? (
                                        upcomingDeadlines.map(asgn => {
                                            const status = getDeadlineStatus(asgn.deadline);
                                            return (
                                                <div key={asgn.id} className="deadline-item" onClick={() => navigate(`/student/assignments/${asgn.title.toLowerCase().replace(/\s+/g, '-')}/work`)}>
                                                    <div className={`deadline-dot ${status.class}`}></div>
                                                    <div className="deadline-info">
                                                        <div className="deadline-name">{asgn.title}</div>
                                                        <div className="deadline-class">{myClasses.find(c => c.id === asgn.classId)?.name}</div>
                                                    </div>
                                                    <div className="deadline-date">{status.text}</div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="p-8 text-center text-muted text-sm italic">No upcoming deadlines</div>
                                    )}
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="panel">
                                <div className="panel-header">
                                    <div>
                                        <div className="panel-title">Assignment Progress</div>
                                        <div className="panel-subtitle">{activeAssignment ? activeAssignment.title : 'No active work'} - current work</div>
                                    </div>
                                </div>
                                <div className="progress-list">
                                    {activeAssignment ? (
                                        <>
                                            <div className="progress-item">
                                                <div className="progress-item-header">
                                                    <span className="progress-item-label">Use Case Diagram</span>
                                                    <span className="progress-item-value">{activeAssignmentProgress}%</span>
                                                </div>
                                                <div className="progress-bar-wrap"><div className="progress-bar" style={{ width: `${activeAssignmentProgress}%` }}></div></div>
                                            </div>
                                            <div className="progress-item">
                                                <div className="progress-item-header">
                                                    <span className="progress-item-label">Use Case Descriptions</span>
                                                    <span className="progress-item-value">0%</span>
                                                </div>
                                                <div className="progress-bar-wrap"><div className="progress-bar" style={{ width: '0%' }}></div></div>
                                            </div>
                                            <div className="progress-item">
                                                <div className="progress-item-header">
                                                    <span className="progress-item-label">System Sequence Diagrams</span>
                                                    <span className="progress-item-value">0%</span>
                                                </div>
                                                <div className="progress-bar-wrap"><div className="progress-bar" style={{ width: '0%' }}></div></div>
                                            </div>
                                            <div className="progress-item">
                                                <div className="progress-item-header">
                                                    <span className="progress-item-label">Class Diagram</span>
                                                    <span className="progress-item-value">0%</span>
                                                </div>
                                                <div className="progress-bar-wrap"><div className="progress-bar" style={{ width: '0%' }}></div></div>
                                            </div>
                                            <div className="progress-item">
                                                <div className="progress-item-header">
                                                    <span className="progress-item-label">Sequence Diagram</span>
                                                    <span className="progress-item-value">0%</span>
                                                </div>
                                                <div className="progress-bar-wrap"><div className="progress-bar" style={{ width: '0%' }}></div></div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-4 text-center text-muted text-sm italic">Nothing in progress</div>
                                    )}
                                </div>
                            </div>

                            {/* Quick actions */}
                            <div className="panel">
                                <div className="panel-header">
                                    <div className="panel-title">Quick Actions</div>
                                </div>
                                <div className="quick-links">
                                    <div className="quick-link-btn" onClick={() => setIsJoining(true)}>
                                        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>
                                        Join Class
                                    </div>
                                    <div className="quick-link-btn" onClick={() => navigate('/student/assignments/pending')}>
                                        <svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="2" /></svg>
                                        View Work
                                    </div>
                                    <div className="quick-link-btn" onClick={() => navigate('/student/assignments/pending')}>
                                        <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                        Submit
                                    </div>
                                    <div className="quick-link-btn" onClick={() => setIsSettingsOpen(true)}>
                                        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 10-16 0" /></svg>
                                        Profile
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Join Class Modal */}
                {isJoining && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl w-full max-w-md shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-extrabold font-heading text-ink">Join a Class</h2>
                                    <button onClick={() => setIsJoining(false)} className="text-gray-400 hover:text-muted">
                                        <X size={24} />
                                    </button>
                                </div>
                                <p className="text-muted text-sm mb-6">Ask your teacher for the class code, then enter it below to join the classroom.</p>
                                <form onSubmit={handleJoinClass} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold font-body text-gray-700 mb-1">Class Code</label>
                                        <input
                                            type="text"
                                            required
                                            value={classCode}
                                            onChange={e => setClassCode(e.target.value.toUpperCase())}
                                            className={`w-full px-4 py-4 rounded-xl border ${joinError ? 'border-red-300 focus:ring-red-500' : 'border-black/10 focus:ring-indigo-500'} bg-surface-3 text-center text-2xl font-extrabold font-heading tracking-widest outline-none transition-all`}
                                            placeholder="E.G. SE101A"
                                            maxLength={8}
                                        />
                                        {joinError && <p className="mt-2 text-xs font-bold font-body text-status-red">{joinError}</p>}
                                    </div>
                                    <button
                                        type="submit"
                                        className="w-full py-4 bg-accent text-white rounded-xl font-bold font-body shadow-lg hover:bg-indigo-700 transition-all"
                                    >
                                        Join Classroom
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
