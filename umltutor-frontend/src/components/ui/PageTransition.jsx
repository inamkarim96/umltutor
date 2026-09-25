import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const PageTransition = ({ children, className = '', timeout = 300 }) => {
    const location = useLocation();
    const [isExiting, setIsExiting] = useState(false);
    const [currentKey, setCurrentKey] = useState(location.key);

    // Trigger exit animation when location changes
    useEffect(() => {
        if (location.key !== currentKey) {
            setIsExiting(true);
            const timer = setTimeout(() => {
                setCurrentKey(location.key);
                setIsExiting(false);
            }, timeout);
            return () => clearTimeout(timer);
        }
    }, [location.key, currentKey, timeout]);

    const containerClass = `
        sdb-page-transition
        ${isExiting ? 'sdb-page-exiting' : 'sdb-page-entering'}
        ${className}
    `.trim();

    return (
        <div className={containerClass} key={currentKey}>
            {children}
        </div>
    );
};

export default PageTransition;