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
                className={`relative p-3 rounded-2xl transition-all outline-none border ${
                    isOpen 
                        ? 'bg-indigo-50 border-indigo-100 text-indigo-600 shadow-inner' 
                        : 'bg-white border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-gray-50'
                }`}
            >
                <Bell size={22} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-[400px] bg-white rounded-[2rem] shadow-2xl shadow-indigo-100/50 border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Notifications</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                {unreadCount} Unread Message{unreadCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                        {isLoading && notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Checking for updates...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-6 flex gap-4 cursor-pointer transition-all hover:bg-indigo-50/30 group relative ${
                                            !notification.isRead ? 'bg-indigo-50/10' : ''
                                        }`}
                                    >
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                                            !notification.isRead ? 'bg-white border-indigo-50' : 'bg-gray-50 border-gray-100'
                                        }`}>
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className={`text-sm font-black leading-tight ${!notification.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                                                    {notification.title}
                                                </h4>
                                                <span className="text-[10px] font-bold text-gray-300 whitespace-nowrap ml-2">
                                                    {formatTime(notification.createdAt)}
                                                </span>
                                            </div>
                                            <p className={`text-xs leading-relaxed ${!notification.isRead ? 'text-gray-600' : 'text-gray-400 font-medium'}`}>
                                                {notification.message}
                                            </p>
                                        </div>
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 bg-indigo-600 rounded-full mt-1.5 shadow-sm shadow-indigo-200"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-16 text-center">
                                <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-200">
                                    <Inbox size={40} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 mb-2">You're All Caught Up!</h4>
                                <p className="text-sm text-gray-400 font-medium">No new notifications to show right now.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50/50 border-t border-gray-50 text-center">
                        <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
                            View All Activity
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;

