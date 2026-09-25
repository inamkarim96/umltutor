import React from 'react';
import { Zap, TrendingUp, Calendar } from 'lucide-react';

const HeroBanner = ({
    roleName = 'Student',
    greeting = 'day',
    userName = 'Student',
    greetEmoji = '👋',
    dateStr,
    subText,
    primaryAction,
    secondaryAction,
    progress
}) => {
    return (
        <section className="sdb-hero-section" aria-label="Welcome Banner">
            <div className="sdb-hero-card">
                {/* Decorative blobs */}
                <div className="sdb-hero-blob sdb-hero-blob-1" aria-hidden="true" />
                <div className="sdb-hero-blob sdb-hero-blob-2" aria-hidden="true" />
                <div className="sdb-hero-blob sdb-hero-blob-3" aria-hidden="true" />

                <div className="sdb-hero-grid">
                    {/* Left: Greeting + CTAs */}
                    <div className="sdb-hero-left">
                        <div className="sdb-hero-chips">
                            <span className="sdb-hero-chip sdb-hero-chip-role">
                                <Zap size={12} />
                                <span>{roleName.toUpperCase()} PORTAL</span>
                            </span>
                            {dateStr && (
                                <span className="sdb-hero-chip sdb-hero-chip-date">
                                    <Calendar size={12} />
                                    <span>{dateStr}</span>
                                </span>
                            )}
                        </div>

                        <h1 className="sdb-hero-heading">
                            Good {greeting},&nbsp;
                            <span className="sdb-hero-name">{userName}</span>
                            &nbsp;{greetEmoji}
                        </h1>

                        <p className="sdb-hero-sub">
                            {subText || 'Welcome to your UML learning dashboard.'}
                        </p>

                        <div className="sdb-hero-actions">
                            {primaryAction && (
                                <button
                                    type="button"
                                    className="sdb-hero-btn-primary"
                                    onClick={primaryAction.onClick}
                                >
                                    {primaryAction.icon}
                                    <span>{primaryAction.label}</span>
                                </button>
                            )}
                            {secondaryAction && (
                                <button
                                    type="button"
                                    className="sdb-hero-btn-secondary"
                                    onClick={secondaryAction.onClick}
                                >
                                    {secondaryAction.icon}
                                    <span>{secondaryAction.label}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Progress card */}
                    {progress && (
                        <div className="sdb-hero-progress-card">
                            <div className="sdb-hero-progress-header">
                                <div className="sdb-hero-progress-icon">
                                    <TrendingUp size={18} />
                                </div>
                                <div>
                                    <div className="sdb-hero-progress-label">{progress.label || 'Overall Completion'}</div>
                                    <div className="sdb-hero-progress-note">{progress.note}</div>
                                </div>
                            </div>

                            <div className="sdb-hero-ring-wrap">
                                <svg className="sdb-hero-ring" viewBox="0 0 80 80" aria-hidden="true">
                                    <circle cx="40" cy="40" r="32" className="sdb-hero-ring-track" />
                                    <circle
                                        cx="40" cy="40" r="32"
                                        className="sdb-hero-ring-fill"
                                        strokeDasharray={`${2 * Math.PI * 32}`}
                                        strokeDashoffset={`${2 * Math.PI * 32 * (1 - (progress.percentage || 0) / 100)}`}
                                    />
                                </svg>
                                <div className="sdb-hero-ring-text">
                                    <span className="sdb-hero-ring-pct">{progress.percentage || 0}%</span>
                                    <span className="sdb-hero-ring-done">done</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default HeroBanner;
