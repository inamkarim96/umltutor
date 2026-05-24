import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
            <div className="text-center">
                <div className="mb-8">
                    <h1 className="text-9xl font-bold font-body text-gray-300">404</h1>
                    <h2 className="text-3xl font-semibold text-ink mb-4">Page Not Found</h2>
                    <p className="text-lg text-muted mb-8 max-w-md mx-auto">
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        to="/"
                        className="inline-flex items-center px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        Back to Home
                    </Link>

                    <div className="text-sm text-muted">
                        Or{' '}
                        <Link to="/login" className="text-accent hover:text-indigo-700 font-medium">
                            sign in to your account
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
