import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * PageShell   shared page wrapper used by all student sub-pages.
 * Provides a consistent header (breadcrumb + title), action bar, and body.
 */
const PageShell = ({
    title,
    subtitle,
    icon,
    breadcrumbs = [],       // [{ label, path }]
    actions,                // JSX to render top-right
    badge,                  // number or string badge next to title
    backPath = '/student/dashboard',
    children,
}) => {
    const navigate = useNavigate();

    return (
        <div className="psh-root">
            {/* ── Page Header ── */}
            <div className="psh-header">
                <div className="psh-header-inner">
                    {/* Breadcrumbs */}
                    <nav className="psh-breadcrumbs" aria-label="Breadcrumb">
                        <button
                            className="psh-breadcrumb-link"
                            onClick={() => navigate(backPath)}
                            aria-label="Back"
                        >
                            <span className="psh-back-btn">
                                <ArrowLeft size={14} />
                            </span>
                            Dashboard
                        </button>
                        {breadcrumbs.map((crumb, i) => (
                            <React.Fragment key={i}>
                                <span className="psh-breadcrumb-sep">/</span>
                                {crumb.path ? (
                                    <button
                                        className="psh-breadcrumb-link"
                                        onClick={() => navigate(crumb.path)}
                                    >
                                        {crumb.label}
                                    </button>
                                ) : (
                                    <span className="psh-breadcrumb-current">{crumb.label}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>

                    {/* Title row (only if title is provided) */}
                    {title && (
                        <div className="psh-title-row">
                            <div className="psh-title-group">
                                {icon && <div className="psh-title-icon">{icon}</div>}
                                <div>
                                    <div className="psh-title-line">
                                        <h1 className="psh-title">{title}</h1>
                                        {badge != null && (
                                            <span className="psh-title-badge">{badge}</span>
                                        )}
                                    </div>
                                    {subtitle && <p className="psh-subtitle">{subtitle}</p>}
                                </div>
                            </div>

                            {actions && (
                                <div className="psh-actions">{actions}</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Page Body ── */}
            <div className="psh-body">
                <div className="psh-body-inner">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PageShell;
