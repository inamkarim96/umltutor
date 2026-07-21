import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatisticsCard = ({ label, value, note, icon, color, path }) => {
    const navigate = useNavigate();

    return (
        <button className={`sdb-stat sdb-stat-${color}`} onClick={() => navigate(path)}>
            <div className="sdb-stat-icon">{icon}</div>
            <div className="sdb-stat-body">
                <div className="sdb-stat-value">{value}</div>
                <div className="sdb-stat-label">{label}</div>
                <div className="sdb-stat-note">{note}</div>
            </div>
            <ArrowRight size={16} className="sdb-stat-arrow" />
        </button>
    );
};

export default StatisticsCard;
