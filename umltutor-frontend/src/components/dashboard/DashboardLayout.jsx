import React from 'react';

const DashboardLayout = ({
    hero,
    stats,
    children,
    sidebar,
    className = ''
}) => {
    return (
        <div className={`sdb-root ${className}`}>
            {/* Hero */}
            {hero}

            {/* Stats strip */}
            {stats && stats.length > 0 && (
                <div className="sdb-stats-strip">
                    {stats}
                </div>
            )}

            {/* Main grid: content + optional sidebar */}
            <div className="sdb-dashboard-grid">
                <main className="sdb-main-content">
                    {children}
                </main>

                {sidebar && (
                    <aside className="sdb-sidebar">
                        {sidebar}
                    </aside>
                )}
            </div>
        </div>
    );
};

export default DashboardLayout;
