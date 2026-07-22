import React, { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import PageLoader from '../ui/PageLoader';

const Layout = ({ role, navConfig, outletContext }) => {
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
                    <Suspense fallback={<PageLoader />}>
                        <Outlet context={outletContext} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default Layout;

