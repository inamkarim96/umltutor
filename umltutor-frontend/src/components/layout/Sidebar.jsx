import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../../features/auth';
import SettingsPanel from '../shared/SettingsPanel';

const Sidebar = ({ role, navConfig }) => {
    const user = useAppSelector(selectUser);
    const { logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const userName = user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.firstName || user?.name || (role === 'TEACHER' ? 'Teacher' : 'Student');

    const userInitials = (
        (user?.firstName?.[0] || user?.name?.[0] || (role === 'TEACHER' ? 'T' : 'S')).toUpperCase() +
        (user?.lastName?.[0] || '').toUpperCase()
    );

    const isActive = (path, exact) => {
        if (!path) return false;
        const cleanPath = path.split('?')[0];
        if (exact) return location.pathname === cleanPath;
        return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + '/');
    };

    const isSubmenuActive = (submenu) =>
        submenu?.some(child => child.path && isActive(child.path, child.exact));

    const isDiagramSubmenuActive = (item) =>
        item.selectedDiagram && item.submenu?.some(child => child.diagramType === item.selectedDiagram);

    const closeMobile = () => setIsMobileOpen(false);

    const renderNavItem = (item, key) => {
        /* ── Submenu item – hover-driven via CSS ── */
        if (item.submenu) {
            const anyChildActive = isSubmenuActive(item.submenu) || isDiagramSubmenuActive(item) || (item.path && isActive(item.path, item.exact));
            return (
                <div key={key} className="sdb-submenu-wrapper">
                    <Link
                        to={item.path || item.submenu[0]?.path || '#'}
                        className={`sdb-sidebar-item sdb-submenu-trigger ${anyChildActive ? 'active' : ''}`}
                        aria-haspopup="true"
                        onClick={closeMobile}
                    >
                        {item.icon}
                        <span>{item.title}</span>
                        <svg className="sdb-chevron" viewBox="0 0 24 24">
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </Link>
                    <div className="sdb-submenu">
                        {item.submenu.map((child, cIdx) => {
                            if (child.path) {
                                return (
                                    <Link
                                        key={cIdx}
                                        to={child.path}
                                        className={`sdb-submenu-item ${isActive(child.path, child.exact) ? 'active' : ''}`}
                                        onClick={closeMobile}
                                    >
                                        {child.title}
                                    </Link>
                                );
                            }
                            return (
                                <button
                                    key={cIdx}
                                    type="button"
                                    className={`sdb-submenu-item ${item.selectedDiagram === child.diagramType ? 'active' : ''}`}
                                    onClick={() => {
                                        item.onSubmenuSelect?.(child.diagramType);
                                        closeMobile();
                                    }}
                                >
                                    {child.title}
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
                    <span>{item.title}</span>
                </button>
            );
        }

        /* ── Regular link ── */
        return (
            <button
                key={key}
                type="button"
                className={`sdb-sidebar-item ${isActive(item.path, item.exact) ? 'active' : ''}`}
                style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    navigate(item.path);
                    closeMobile();
                }}
            >
                {item.icon}
                <span>{item.title}</span>
            </button>
        );
    };

    const sidebarContent = (
        <>
            {/* ── Logo ── */}
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
                UMLTutor
            </button>

            {/* ── Navigation ── */}
            <nav className="sdb-sidebar-nav">
                {navConfig.map((section, sIdx) => (
                    <React.Fragment key={sIdx}>
                        {section.label && (
                            <div className="sdb-sidebar-section-label">{section.label}</div>
                        )}
                        {section.items.map((item, iIdx) => renderNavItem(item, `${sIdx}-${iIdx}`))}
                    </React.Fragment>
                ))}
            </nav>

            {/* ── Bottom: User Profile & Utility Actions ── */}
            <div className="sdb-sidebar-bottom">
                <div className="sdb-sidebar-divider" />

                {/* User Profile */}
                <div className="sdb-sidebar-user">
                    <div className="sdb-sidebar-avatar">{userInitials}</div>
                    <div className="sdb-sidebar-user-info">
                        <div className="sdb-sidebar-user-name">{userName}</div>
                        <div className="sdb-sidebar-user-role">{role === 'TEACHER' ? 'Teacher' : 'Student'}</div>
                    </div>
                </div>

                {/* Settings */}
                <button
                    type="button"
                    className={`sdb-sidebar-item sdb-util-btn ${isActive(role === 'TEACHER' ? '/teacher/settings' : '/student/settings') ? 'active' : ''}`}
                    onClick={() => {
                        navigate(role === 'TEACHER' ? '/teacher/settings' : '/student/settings');
                        closeMobile();
                    }}
                >
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></svg>
                    <span>Settings</span>
                </button>

                {/* Logout */}
                <button
                    type="button"
                    className="sdb-sidebar-item sdb-util-btn sdb-logout-btn"
                    onClick={() => { logout(); closeMobile(); }}
                >
                    <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    <span>Log out</span>
                </button>
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
