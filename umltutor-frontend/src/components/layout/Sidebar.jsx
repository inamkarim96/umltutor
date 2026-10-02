import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectUser } from '../../features/auth';
import { selectUnreadCount, fetchNotifications } from '../../features/notifications/notificationSlice';
import SettingsPanel from '../shared/SettingsPanel';

const Sidebar = ({ role, navConfig = [] }) => {
    const user = useAppSelector(selectUser);
    const unreadCount = useAppSelector(selectUnreadCount);
    const dispatch = useAppDispatch();
    const { logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [expandedSubmenus, setExpandedSubmenus] = useState({});

    const userName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.firstName || user?.name || (role === 'TEACHER' ? 'Instructor' : 'Student');

    const userInitials = (
        (user?.firstName?.[0] || user?.name?.[0] || (role === 'TEACHER' ? 'T' : 'S')).toUpperCase() +
        (user?.lastName?.[0] || '').toUpperCase()
    );

    const isActive = (path, exact) => {
        if (!path) return false;
        const currentUrl = location.pathname + location.search;
        if (path.includes('?')) {
            const [pathBase, pathQuery] = path.split('?');
            return location.pathname === pathBase && location.search.includes(pathQuery);
        }
        const cleanPath = path.split('?')[0];
        if (exact) return location.pathname === cleanPath;
        return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/');
    };

    const isSubmenuActive = (submenu) =>
        submenu?.some(child => child.path && isActive(child.path, child.exact));

    const isDiagramSubmenuActive = (item) =>
        item.selectedDiagram && item.submenu?.some(child => child.diagramType === item.selectedDiagram);

    // Keep submenus expanded if any child route is active
    useEffect(() => {
        const nextState = {};
        navConfig.forEach((section, sIdx) => {
            section.items?.forEach((item, iIdx) => {
                if (item.submenu) {
                    const key = `${sIdx}-${iIdx}`;
                    const hasActiveChild = item.submenu.some(child => child.path && isActive(child.path, child.exact));
                    const isParentActive = item.path && isActive(item.path, item.exact);
                    if (hasActiveChild || isParentActive) {
                        nextState[key] = true;
                    }
                }
            });
        });
        if (Object.keys(nextState).length > 0) {
            setExpandedSubmenus(prev => ({ ...prev, ...nextState }));
        }
    }, [location.pathname, location.search, navConfig]);

    // Fetch notifications on mount
    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const closeMobile = () => setIsMobileOpen(false);

    const toggleSubmenu = (key, e) => {
        e?.preventDefault();
        e?.stopPropagation();
        setExpandedSubmenus(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const renderNavItem = (item, key) => {
        /* ── Submenu item – Accordion with click toggle + auto-expand on active child ── */
        if (item.submenu) {
            const anyChildActive = isSubmenuActive(item.submenu) || isDiagramSubmenuActive(item);
            const parentActive = item.path && isActive(item.path, item.exact);
            const isExpanded = !!expandedSubmenus[key];

            return (
                <div key={key} className={`sdb-submenu-wrapper ${isExpanded ? 'expanded' : ''}`}>
                    <div
                        className={`sdb-sidebar-item sdb-submenu-trigger ${anyChildActive || parentActive ? 'active' : ''}`}
                        onClick={(e) => {
                            if (item.path) {
                                navigate(item.path);
                                setExpandedSubmenus(prev => ({ ...prev, [key]: true }));
                                closeMobile();
                            } else {
                                toggleSubmenu(key, e);
                            }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                    >
                        {item.icon}
                        <span className="sdb-item-text">{item.title}</span>
                        <button
                            type="button"
                            className="sdb-chevron-btn"
                            aria-label={`Toggle ${item.title} menu`}
                            onClick={(e) => toggleSubmenu(key, e)}
                        >
                            <svg className={`sdb-chevron ${isExpanded ? 'open' : ''}`} viewBox="0 0 24 24">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    </div>

                    <div className={`sdb-submenu ${isExpanded ? 'sdb-submenu-open' : ''}`}>
                        {item.submenu.map((child, cIdx) => {
                            const isChildActive = child.path
                                ? isActive(child.path, child.exact)
                                : item.selectedDiagram === child.diagramType;

                            if (child.path) {
                                return (
                                    <Link
                                        key={cIdx}
                                        to={child.path}
                                        className={`sdb-submenu-item ${isChildActive ? 'active' : ''}`}
                                        onClick={closeMobile}
                                    >
                                        <span className="sdb-submenu-bullet" />
                                        <span className="sdb-submenu-text">{child.title}</span>
                                    </Link>
                                );
                            }
                            return (
                                <button
                                    key={cIdx}
                                    type="button"
                                    className={`sdb-submenu-item ${isChildActive ? 'active' : ''}`}
                                    onClick={() => {
                                        item.onSubmenuSelect?.(child.diagramType);
                                        closeMobile();
                                    }}
                                >
                                    <span className="sdb-submenu-bullet" />
                                    <span className="sdb-submenu-text">{child.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        /* ── Action button ── */
        if (item.type === 'button') {
            return (
                <button
                    key={key}
                    type="button"
                    className="sdb-sidebar-item"
                    onClick={() => {
                        if (item.action === 'settings') setIsSettingsOpen(true);
                        else if (item.action === 'logout') logout();
                        else item.onClick?.();
                        closeMobile();
                    }}
                >
                    {item.icon}
                    <span className="sdb-item-text">{item.title}</span>
                </button>
            );
        }

        /* ── Regular link ── */
        const itemActive = isActive(item.path, item.exact);
        return (
            <button
                key={key}
                type="button"
                className={`sdb-sidebar-item ${itemActive ? 'active' : ''}`}
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(item.path);
                    closeMobile();
                }}
            >
                {item.icon}
                <span className="sdb-item-text">{item.title}</span>
                {itemActive && <span className="sdb-active-indicator" />}
            </button>
        );
    };

    const sidebarContent = (
        <>
            {/* ── Brand / Logo ── */}
            <div className="sdb-sidebar-header">
                <button
                    type="button"
                    className="sdb-sidebar-logo"
                    onClick={() => {
                        navigate(role === 'TEACHER' ? '/teacher/dashboard' : '/student/dashboard');
                        closeMobile();
                    }}
                >
                    <div className="sdb-sidebar-logo-icon">
                        <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h12M3 18h8" /><circle cx="19" cy="18" r="3" /></svg>
                    </div>
                    <div className="sdb-sidebar-logo-meta">
                        <span className="sdb-sidebar-logo-text">UMLTutor</span>
                        <span className="sdb-sidebar-badge">{role === 'TEACHER' ? 'Teacher Portal' : 'Student Hub'}</span>
                    </div>
                </button>
            </div>

            {/* ── Navigation ── */}
            <nav className="sdb-sidebar-nav" aria-label="Main Navigation">
                {navConfig.map((section, sIdx) => (
                    <div key={sIdx} className="sdb-sidebar-section">
                        {section.label && (
                            <div className="sdb-sidebar-section-label">{section.label}</div>
                        )}
                        <div className="sdb-sidebar-items-group">
                            {section.items.map((item, iIdx) => renderNavItem(item, `${sIdx}-${iIdx}`))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* ── Bottom: User Profile & Utility Actions ── */}
            <div className="sdb-sidebar-bottom">
                {/* User Profile Card */}
                <div
                    className="sdb-sidebar-user"
                    onClick={() => {
                        navigate(role === 'TEACHER' ? '/teacher/settings' : '/student/settings');
                        closeMobile();
                    }}
                    role="button"
                    tabIndex={0}
                    title="View Profile & Settings"
                >
                    <div className="sdb-avatar-wrapper">
                        <div className="sdb-sidebar-avatar">{userInitials}</div>
                        <span className="sdb-user-status-dot" title="Active" />
                    </div>
                    <div className="sdb-sidebar-user-info">
                        <div className="sdb-sidebar-user-name">{userName}</div>
                        <div className="sdb-sidebar-user-role">
                            <span className="sdb-role-pill">{role === 'TEACHER' ? 'Instructor' : 'Student'}</span>
                        </div>
                    </div>
                </div>

                <div className="sdb-sidebar-bottom-actions">
                    {/* Notifications Bell */}
                    <button
                        type="button"
                        className={`sdb-sidebar-item sdb-util-btn sdb-notif-btn ${isActive(role === 'TEACHER' ? '/teacher/notifications' : '/student/notifications') ? 'active' : ''}`}
                        onClick={() => {
                            navigate(role === 'TEACHER' ? '/teacher/notifications' : '/student/notifications');
                            closeMobile();
                        }}
                        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                    >
                        <span className="sdb-bell-wrap">
                            <svg viewBox="0 0 24 24" className={unreadCount > 0 ? 'sdb-bell-ring' : ''}>
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            {unreadCount > 0 && (
                                <span className="sdb-notif-badge">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            )}
                        </span>
                        <span className="sdb-item-text">Notifications</span>
                    </button>

                    {/* Settings */}
                    <button
                        type="button"
                        className={`sdb-sidebar-item sdb-util-btn ${isActive(role === 'TEACHER' ? '/teacher/settings' : '/student/settings') ? 'active' : ''}`}
                        onClick={() => {
                            navigate(role === 'TEACHER' ? '/teacher/settings' : '/student/settings');
                            closeMobile();
                        }}
                        title="Settings"
                    >
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                        <span className="sdb-item-text">Settings</span>
                    </button>

                    {/* Logout */}
                    <button
                        type="button"
                        className="sdb-sidebar-item sdb-util-btn sdb-logout-btn"
                        onClick={() => { logout(); closeMobile(); }}
                        title="Log out"
                    >
                        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                        <span className="sdb-item-text">Log out</span>
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                type="button"
                className="sdb-hamburger"
                onClick={() => setIsMobileOpen(true)}
                aria-label="Open navigation"
            >
                <svg viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
            </button>

            {isMobileOpen && (
                <div className="sdb-sidebar-overlay" onClick={closeMobile} />
            )}

            <aside className={`sdb-sidebar ${isMobileOpen ? 'sdb-sidebar-open' : ''}`}>
                <button
                    type="button"
                    className="sdb-sidebar-close"
                    onClick={closeMobile}
                    aria-label="Close navigation"
                >
                    <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
                {sidebarContent}
            </aside>

            <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
};

export default Sidebar;
