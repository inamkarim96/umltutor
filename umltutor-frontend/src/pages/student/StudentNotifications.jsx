import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectNotifications, selectUnreadCount, fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, clearAllNotificationsAsync } from '../../features/notifications/notificationSlice';
import { Bell, Check, X, Mail, AlertCircle, Clock, User, BookOpen, MessageSquare, Trash2, ExternalLink, ArrowLeft, Code } from 'lucide-react';
import PageShell from '../../components/dashboard/PageShell';
import { useNavigate } from 'react-router-dom';

const getNotificationIcon = (type) => {
    switch (type) {
        case 'ASSIGNMENT_CREATED': return <BookOpen className="text-blue-500" size={18} />;
        case 'ASSIGNMENT_UPDATED': return <BookOpen className="text-yellow-500" size={18} />;
        case 'ASSIGNMENT_DUE_SOON': return <Clock className="text-orange-500" size={18} />;
        case 'SUBMISSION_GRADED': return <Check className="text-green-500" size={18} />;
        case 'SUBMISSION_REVIEWED': return <MessageSquare className="text-purple-500" size={18} />;
        case 'TUTORIAL_REQUESTED': return <User className="text-indigo-500" size={18} />;
        case 'TUTORIAL_CONFIRMED': return <Check className="text-teal-500" size={18} />;
        case 'TUTORIAL_CANCELLED': return <X className="text-red-500" size={18} />;
        case 'CLASS_INVITE': return <User className="text-pink-500" size={18} />;
        default: return <Bell className="text-gray-500" size={18} />;
    }
};

const getNotificationTitle = (type) => {
    switch (type) {
        case 'ASSIGNMENT_CREATED': return 'New Assignment';
        case 'ASSIGNMENT_UPDATED': return 'Assignment Updated';
        case 'ASSIGNMENT_DUE_SOON': return 'Assignment Due Soon';
        case 'SUBMISSION_GRADED': return 'Submission Graded';
        case 'SUBMISSION_REVIEWED': return 'Submission Reviewed';
        case 'TUTORIAL_REQUESTED': return 'Tutorial Requested';
        case 'TUTORIAL_CONFIRMED': return 'Tutorial Confirmed';
        case 'TUTORIAL_CANCELLED': return 'Tutorial Cancelled';
        case 'CLASS_INVITE': return 'Class Invitation';
        default: return 'Notification';
    }
};

const formatTimeAgo = (dateString) => {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    const years = Math.floor(days / 365);
    return `${years}y ago`;
};

const NotificationItem = ({ notification, onMarkRead, onDelete, onOpenAction }) => {
    const isUnread = !notification.isRead;
    const timeAgo = formatTimeAgo(notification.createdAt);
    const hasAction = notification.relatedType === 'ASSIGNMENT' || 
                      notification.type?.includes('ASSIGNMENT') || 
                      notification.relatedId;

    const handleClick = (e) => {
        if (e.target.closest('button')) return;
        if (isUnread) {
            onMarkRead(notification.id);
        }
        if (hasAction) {
            onOpenAction(notification);
        }
    };

    return (
        <div 
            className={`notif-item ${isUnread ? 'unread' : ''}`}
            onClick={handleClick}
            style={{
                background: isUnread ? 'var(--primary-light)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                transition: 'all 0.2s ease',
                cursor: hasAction ? 'pointer' : 'default',
            }}
        >
            <div style={{ flexShrink: 0, marginTop: '2px' }}>
                {getNotificationIcon(notification.type)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: isUnread ? '600' : '500', color: 'var(--text)' }}>
                        {getNotificationTitle(notification.type)}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {timeAgo}
                    </span>
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {notification.message}
                </p>
                {notification.relatedEntity && notification.relatedType && (
                    <span style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                    }}>
                        {notification.relatedType}: {notification.relatedEntity}
                    </span>
                )}
                {(!notification.relatedEntity || !notification.relatedType) && notification.relatedId && (
                    <span style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        fontWeight: 500,
                        textTransform: 'capitalize',
                    }}>
                        Assignment: #{notification.relatedId}
                    </span>
                )}
                {hasAction && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        <span style={{
                            fontSize: '12px',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}>
                            <ExternalLink size={12} />
                            Tap to open workspace
                        </span>
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                {isUnread && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onMarkRead(notification.id);
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '6px',
                            borderRadius: '8px',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="Mark as read"
                    >
                        <Check size={16} />
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(notification.id);
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Delete notification"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

const ActionModal = ({ notification, onClose, onGoToWorkspace, onGoBack }) => {
    if (!notification) return null;

    const isAssignment = notification.relatedType === 'ASSIGNMENT' || 
                         notification.type?.includes('ASSIGNMENT') || 
                         notification.relatedId;

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease',
        }}>
            <div onClick={(e) => e.stopPropagation()} className="modal-content" style={{
                background: 'var(--surface)',
                borderRadius: '16px',
                padding: '24px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--border)',
                animation: 'slideUp 0.2s ease',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'var(--primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        {getNotificationIcon(notification.type)}
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>
                            {getNotificationTitle(notification.type)}
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {formatTimeAgo(notification.createdAt)}
                        </p>
                    </div>
                </div>
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {notification.message}
                </p>
                {notification.relatedEntity && notification.relatedType && (
                    <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            {notification.relatedType}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                            {notification.relatedEntity}
                        </div>
                    </div>
                )}
                {(!notification.relatedEntity || !notification.relatedType) && notification.relatedId && (
                    <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                            Assignment
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                            ID: {notification.relatedId}
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={onGoBack}
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            color: 'var(--text)',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <ArrowLeft size={16} />
                        Go Back
                    </button>
                    {isAssignment && (
                        <button
                            onClick={onGoToWorkspace}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                background: '#10b981',
                                border: 'none',
                                borderRadius: '10px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Code size={16} />
                            Open Workspace
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const StudentNotifications = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const notifications = useAppSelector(selectNotifications);
    const unreadCount = useAppSelector(selectUnreadCount);
    const [actionNotification, setActionNotification] = useState(null);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const handleMarkRead = (id) => {
        dispatch(markNotificationAsRead(id));
    };

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsAsRead());
    };

    const handleClearAll = () => {
        if (window.confirm('Delete all notifications? This cannot be undone.')) {
            dispatch(clearAllNotificationsAsync());
        }
    };

    const handleDelete = (id) => {
        dispatch(deleteNotification(id));
    };

    const handleOpenAction = (notification) => {
        setActionNotification(notification);
    };

    const handleCloseAction = () => {
        setActionNotification(null);
    };

    const handleGoToWorkspace = async () => {
        if (!actionNotification) return;
        const { relatedEntity, relatedType, type, relatedId } = actionNotification;
        console.log('Action notification:', actionNotification);
        const isAssignmentRelated = relatedType === 'ASSIGNMENT' || type?.includes('ASSIGNMENT') || relatedId;
        if (isAssignmentRelated) {
            let titleSlug = relatedEntity;
            // If relatedEntity is not available but we have relatedId, fetch the assignment title
            if (!titleSlug && relatedId) {
                try {
                    console.log('Fetching assignment title with ID:', relatedId);
                    // Use public endpoint that doesn't require auth
                    const response = await fetch(`/api/notifications/assignment/${relatedId}/title`);
                    console.log('Fetch response:', response.status, response.ok);
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Assignment title data:', data);
                        if (data.success && data.data?.title) {
                            titleSlug = data.data.title.toLowerCase().replace(/\s+/g, '-');
                        }
                    } else {
                        console.error('Failed to fetch assignment title:', response.status);
                        // Try alternative student endpoint with auth
                        const token = localStorage.getItem('firebaseToken') || 
                                      localStorage.getItem('authToken') || 
                                      sessionStorage.getItem('firebaseToken') ||
                                      sessionStorage.getItem('authToken');
                        const altResponse = await fetch(`/api/student/assignments/${relatedId}`, {
                            headers: {
                                'Authorization': `Bearer ${token || ''}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        if (altResponse.ok) {
                            const altData = await altResponse.json();
                            console.log('Alt assignment data:', altData);
                            if (altData.success && altData.data?.title) {
                                titleSlug = altData.data.title.toLowerCase().replace(/\s+/g, '-');
                            }
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch assignment:', err);
                }
            }
            console.log('Final titleSlug:', titleSlug);
            if (titleSlug) {
                navigate(`/student/assignments/${titleSlug}/work`);
            } else if (relatedId) {
                // Fallback: use relatedId directly
                navigate(`/student/assignments/${relatedId}/work`);
            } else {
                alert('Could not find assignment. Please try again.');
            }
        }
        handleCloseAction();
    };

    const handleGoBack = () => {
        handleCloseAction();
    };

    return (
        <PageShell
            title="Notifications"
            subtitle={unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            icon={<Bell size={24} />}
            backPath="/student/dashboard"
            badge={unreadCount > 0 ? unreadCount : null}
            actions={notifications.length > 0 && (
                <div style={{ display: 'flex', gap: '8px' }}>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllRead}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 500,
                                cursor: 'pointer',
                            }}
                        >
                            <Check size={14} />
                            Mark all as read
                        </button>
                    )}
                    <button
                        onClick={handleClearAll}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        <Trash2 size={14} />
                        Clear all
                    </button>
                </div>
            )}
            breadcrumbs={[{ label: 'Notifications' }]}
        >
            <div style={{ background: 'var(--surface)', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                {notifications.length === 0 ? (
                    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                        <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
                        <h3 style={{ margin: '0 0 8px 0', color: 'var(--text)', fontSize: '18px' }}>No notifications yet</h3>
                        <p style={{ margin: 0, color: 'var(--text-muted)' }}>You're all caught up. New notifications will appear here.</p>
                    </div>
                ) : (
                    <div style={{ padding: '8px 16px 16px' }}>
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkRead={handleMarkRead}
                                onDelete={handleDelete}
                                onOpenAction={handleOpenAction}
                            />
                        ))}
                    </div>
                )}
            </div>
            <ActionModal
                notification={actionNotification}
                onClose={handleCloseAction}
                onGoToWorkspace={handleGoToWorkspace}
                onGoBack={handleGoBack}
            />
        </PageShell>
    );
};

export default StudentNotifications;