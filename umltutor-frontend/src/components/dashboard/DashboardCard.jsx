import React from 'react';
import { ArrowRight } from 'lucide-react';

const DashboardCard = React.memo(({
    title,
    subtitle,
    icon,
    badge,
    actionLabel,
    onActionClick,
    className = '',
    headerRight,
    children
}) => {
    return (
        <section className={`sdb-card ${className}`} aria-label={typeof title === 'string' ? title : 'Dashboard Card'}>
            <div className="sdb-card-header">
                <div className="sdb-card-header-left">
                    {icon && (
                        <div className="sdb-card-header-icon" aria-hidden="true">
                            {icon}
                        </div>
                    )}
                    <div className="sdb-card-header-text">
                        <div className="sdb-card-title-row">
                            <h2 className="sdb-card-title">{title}</h2>
                            {badge && <span className="sdb-card-badge">{badge}</span>}
                        </div>
                        {subtitle && <p className="sdb-card-sub">{subtitle}</p>}
                    </div>
                </div>

                <div className="sdb-card-header-right">
                    {headerRight}
                    {actionLabel && onActionClick && (
                        <button
                            type="button"
                            className="sdb-card-action-btn"
                            onClick={onActionClick}
                        >
                            <span>{actionLabel}</span>
                            <ArrowRight size={13} className="sdb-card-action-arrow" />
                        </button>
                    )}
                </div>
            </div>

            <div className="sdb-card-body">
                {children}
            </div>
        </section>
    );
});

export default DashboardCard;
