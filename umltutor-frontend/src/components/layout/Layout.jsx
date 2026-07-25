import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = ({ role, navConfig, children }) => {
    const location = useLocation();
    const mainRef = useRef(null);

    useEffect(() => {
        mainRef.current?.scrollTo(0, 0);
    }, [location.pathname]);

    return (
        <div className="sdb-layout">
            <Sidebar role={role} navConfig={navConfig} />
            <div className="sdb-main" ref={mainRef}>
                <div className="sdb-outlet">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;
