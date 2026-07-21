import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = ({ role, navConfig, outletContext }) => {
    const location = useLocation();

    return (
        <div className="sdb-layout">
            <Sidebar role={role} navConfig={navConfig} />
            <div className="sdb-main">
                <div className="sdb-outlet">
                    <Outlet key={location.pathname} context={outletContext} />
                </div>
            </div>
        </div>
    );
};

export default Layout;
