import React from 'react';

const DashboardLayout = ({ hero, stats, children }) => {
    return (
        <div className="sdb-root">
            {hero}
            
            {stats && stats.length > 0 && (
                <div className="sdb-stats-strip">
                    {stats}
                </div>
            )}
            
            <div className="sdb-grid">
                {children}
            </div>
        </div>
    );
};

export default DashboardLayout;
