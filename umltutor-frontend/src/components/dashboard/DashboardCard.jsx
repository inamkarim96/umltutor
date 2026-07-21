import React from 'react';
import { ArrowRight } from 'lucide-react';

const DashboardCard = ({ 
    title, 
    subtitle, 
    icon, 
    actionLabel, 
    onActionClick, 
    className = '', 
    children 
}) => {
    return (
        <div className={`sdb-card ${className}`}>
            <div className="sdb-card-header">
                <div>
                    <h2 className="sdb-card-title">
                        {icon}
                        {title}
                    </h2>
                    {subtitle && <p className="sdb-card-sub">{subtitle}</p>}
                </div>
                {actionLabel && onActionClick && (
                    <button className="sdb-link-btn" onClick={onActionClick}>
                        {actionLabel} <ArrowRight size={14} />
                    </button>
                )}
            </div>
            {children}
        </div>
    );
};

export default DashboardCard;
