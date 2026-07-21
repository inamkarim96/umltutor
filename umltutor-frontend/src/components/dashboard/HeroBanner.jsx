import React from 'react';
import { Zap, TrendingUp } from 'lucide-react';

const HeroBanner = ({
    roleName,
    greeting,
    userName,
    greetEmoji,
    dateStr,
    subText,
    primaryAction,
    progress
}) => {
    return (
        <div className="sdb-hero">
            <div className="sdb-hero-bg" aria-hidden="true" />
            <div className="sdb-hero-content">
                <div className="sdb-hero-left">
                    <span className="sdb-hero-chip">
                        <Zap size={12} /> {roleName} Portal
                    </span>
                    <h1 className="sdb-hero-title">
                        Good {greeting}, {userName} <span>{greetEmoji}</span>
                    </h1>
                    <p className="sdb-hero-date">{dateStr}</p>
                    <p className="sdb-hero-sub">
                        {subText}
                    </p>
                </div>
                {primaryAction && (
                    <button className="sdb-join-btn" onClick={primaryAction.onClick}>
                        {primaryAction.icon}
                        {primaryAction.label}
                    </button>
                )}
            </div>

            {/* Overall progress / stats inside hero */}
            {progress && (
                <div className="sdb-hero-progress">
                    <div className="sdb-hero-progress-label">
                        <TrendingUp size={14} />
                        <span>{progress.label || 'Overall Progress'}</span>
                        <strong>{progress.percentage}%</strong>
                    </div>
                    <div className="sdb-hero-progress-bar">
                        <div className="sdb-hero-progress-fill" style={{ width: `${progress.percentage}%` }} />
                    </div>
                    <p className="sdb-hero-progress-note">
                        {progress.note}
                    </p>
                </div>
            )}
        </div>
    );
};

export default HeroBanner;
