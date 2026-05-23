import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { 
    fetchNotifications, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    selectNotifications, 
    selectUnreadCount,
    selectIsLoading
} from '../../features/notifications';
import { Bell, X, Check, BookOpen, GraduationCap, Clock, Inbox, Info } from 'lucide-react';

const NotificationDropdown = () => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dispatch = useAppDispatch();
    const notifications = useAppSelector(selectNotifications);
    const unreadCount = useAppSelector(selectUnreadCount);
    const isLoading = useAppSelector(selectIsLoading);
    const dropdownRef = useRef(null);

    useEffect(() => {
        dispatch(fetchNotifications());
        
        // Polling every 2 minutes
        const interval = setInterval(() => {
            dispatch(fetchNotifications());
        }, 120000);

        return () => clearInterval(interval);
    }, [dispatch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleMarkRead = (id) => {
        dispatch(markNotificationAsRead(id));
    };

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsAsRead());
    };

    const handleNotificationClick = (notification) => {
        // Mark as read if it's unread
        if (!notification.isRead) {
            dispatch(markNotificationAsRead(notification.id));
        }

        // Close dropdown
        setIsOpen(false);

        // Navigate based on type
        switch (notification.type) {
            case 'TUTORIAL_REQUESTED':
                if (notification.relatedId) {
                    navigate(`/teacher/submissions/${notification.relatedId}`);
                }
                break;
            case 'ASSIGNMENT_CREATED':
                // For students
                navigate('/student/assignments');
                break;
            case 'ASSIGNMENT_GRADED':
                if (notification.relatedId) {
                    navigate(`/student/submissions/${notification.relatedId}/report`);
                }
                break;
            case 'TUTORIAL_APPROVED':
                // Ideally this would go to the specific work page
                // Navigation to work page needs titleSlug which isn't available here directly
                // So we'll go to the student assignments dashboard
                navigate('/student/assignments');
                break;
            default:
                break;
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'ASSIGNMENT_CREATED':
                return <BookOpen size={18} className="text-blue-500" />;
            case 'ASSIGNMENT_GRADED':
                return <GraduationCap size={18} className="text-emerald-500" />;
            case 'DEADLINE_REMINDER':
                return <Clock size={18} className="text-amber-500" />;
            default:
                return <Info size={18} className="text-indigo-500" />;
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = (now - date) / 1000;

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-3 rounded-lg transition-all outline-none border ${
                    isOpen 
                        ? 'bg-accent/10 border-accent/10 text-accent shadow-inner' 
                        : 'bg-white border-black/5 text-gray-400 hover:text-accent hover:border-accent/10 hover:bg-surface-3'
                }`}
            >
                <Bell size={22} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-status-red/100 text-white text-[10px] font-extrabold font-heading rounded-full flex items-center justify-center border-2 border-white shadow-card">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-[400px] bg-white rounded-lg shadow-hover shadow-accent/20/50 border border-black/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-surface-3/50">
                        <div>
                            <h3 className="text-lg font-extrabold font-heading text-ink">Notifications</h3>
                            <p className="text-[10px] font-bold font-body text-gray-400 uppercase tracking-widest mt-0.5">
                                {unreadCount} Unread Message{unreadCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-extrabold font-heading text-accent uppercase tracking-widest hover:text-indigo-700 transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                        {isLoading && notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-xs font-bold font-body text-gray-400 uppercase tracking-widest">Checking for updates...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-6 flex gap-4 cursor-pointer transition-all hover:bg-accent/10/30 group relative ${
                                            !notification.isRead ? 'bg-accent/10/10' : ''
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-card border ${
                                            !notification.isRead ? 'bg-white border-indigo-50' : 'bg-surface-3 border-black/5'
                                        }`}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-extrabold font-heading leading-tight ${!notification.isRead ? 'text-ink' : 'text-muted'}`}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] font-bold font-body text-gray-300 whitespace-nowrap ml-2">
                                                    {formatTime(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className={`text-xs leading-relaxed ${!notification.isRead ? 'text-muted' : 'text-gray-400 font-medium'}`}>
                                                {notification.message}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shadow-card shadow-indigo-200"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-16 text-center">
                                <div className="w-20 h-20 bg-surface-3 rounded-lg flex items-center justify-center mx-auto mb-6 text-gray-200">
                                    <Inbox size={40} />
                                </div>
                                <h4 className="text-xl font-extrabold font-heading text-ink mb-2">You're All Caught Up!</h4>
                                <p className="text-sm text-gray-400 font-medium">No new notifications to show right now.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-surface-3/50 border-t border-gray-50 text-center">
                        <button className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest hover:text-accent transition-colors">
                            View All Activity
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;

