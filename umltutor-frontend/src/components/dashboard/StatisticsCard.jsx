import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatisticsCard = React.memo(({ label, value, note, icon, color = 'blue', path, badge }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (path) navigate(path);
    };

    return (
        <div
            className={`sdb-stat-card sdb-stat-card-${color}`}
            onClick={handleClick}
            role={path ? 'button' : undefined}
            tabIndex={path ? 0 : undefined}
            onKeyDown={(e) => {
                if (path && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleClick();
                }
            }}
            aria-label={`${label}: ${value}. ${note || ''}`}
        >
            <div className="sdb-stat-card-top">
                <div className="sdb-stat-card-icon" aria-hidden="true">
                    {icon}
                </div>
                {badge && <span className="sdb-stat-card-badge">{badge}</span>}
                {path && (
                    <div className="sdb-stat-card-arrow" aria-hidden="true">
                        <ArrowUpRight size={14} />
                    </div>
                )}
            </div>

            <div className="sdb-stat-card-body">
                <div className="sdb-stat-card-value">{value ?? 0}</div>
                <div className="sdb-stat-card-label">{label}</div>
                {note && <div className="sdb-stat-card-note">{note}</div>}
            </div>
        </div>
    );
});

export default StatisticsCard;
