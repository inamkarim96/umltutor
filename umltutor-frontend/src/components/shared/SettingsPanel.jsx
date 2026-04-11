import React, { useState, useEffect } from 'react';
import { 
    X, 
    User, 
    Mail, 
    Lock, 
    Shield, 
    Trash2, 
    Settings as SettingsIcon, 
    Bell, 
    Palette, 
    Eye, 
    EyeOff,
    Activity,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    LogOut,
    Check,
    Monitor,
    Sun,
    Moon,
    Smartphone,
    MapPin,
    Calendar,
    MousePointer2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import * as authService from '../../services/authService';
import { useAppSelector } from '../../app/hooks';
import { selectUser } from '../../features/auth';

const SettingsPanel = ({ isOpen, onClose }) => {
    const { logout, changePassword, deleteUserAccount } = useAuth();
    const user = useAppSelector(selectUser);
    const [activeSection, setActiveSection] = useState('main');
    const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Notification Preferences State
    const [notifPrefs, setNotifPrefs] = useState(() => {
        const saved = localStorage.getItem('notification-prefs');
        return saved ? JSON.parse(saved) : {
            emailAssignments: true,
            emailGrades: true,
            emailSecurity: true,
            appSound: true,
            appDesktop: false
        };
    });

    // Password Change State
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    // Delete Account State
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deleteFinalPassword, setDeleteFinalPassword] = useState('');

    useEffect(() => {
        localStorage.setItem('notification-prefs', JSON.stringify(notifPrefs));
    }, [notifPrefs]);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when closed
            setTimeout(() => {
                setActiveSection('main');
                setStatusMessage({ type: '', text: '' });
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                setDeleteConfirmText('');
                setDeleteFinalPassword('');
                setShowOldPassword(false);
                setShowNewPassword(false);
                setShowConfirmPassword(false);
                setShowDeletePassword(false);
            }, 300);
        }
    }, [isOpen]);

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        
        // Basic validation
        if (passwordData.newPassword.length < 6) {
            setStatusMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setStatusMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setIsLoading(true);
        setStatusMessage({ type: '', text: '' });
        try {
            await changePassword(passwordData.oldPassword, passwordData.newPassword);
            setStatusMessage({ type: 'success', text: 'Password secured! Redirecting...' });
            
            // Clear fields on success
            setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
            
            // Delay redirect for user feedback
            setTimeout(() => {
                setActiveSection('main');
                setStatusMessage({ type: '', text: '' });
            }, 2000);
        } catch (error) {
            console.error('Password change error:', error);
            let message = 'Failed to update password. Please try again.';
            
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'Incorrect current password. Identity verification failed.';
            } else if (error.code === 'auth/weak-password') {
                message = 'The new password is too weak. Use a mix of characters.';
            } else if (error.message) {
                message = error.message;
            }
            
            setStatusMessage({ type: 'error', text: message });
            // Clear only the password fields that were wrong if needed, 
            // but usually clearing current password is good for security re-try
            setPasswordData(prev => ({ ...prev, oldPassword: '' }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        if (deleteConfirmText !== 'DELETE') return;

        // Note: Standard re-auth would be needed here. 
        // For simplicity in this UI, we'll ask for password in a real app, 
        // but here we'll assume the user triggers a re-auth if needed.
        // Actually, my AuthContext.deleteUserAccount takes a password.
        // I should probably prompt for password too.
        setActiveSection('confirm-delete-password');
    };

    const handleFinalDelete = async () => {
        if (!deleteFinalPassword) return;
        setIsLoading(true);
        try {
            await deleteUserAccount(deleteFinalPassword);
            // AuthContext will handle logout and redirect
        } catch (error) {
            setStatusMessage({ type: 'error', text: error.message || 'Failed to delete account' });
            setIsLoading(false);
        }
    };



    const sections = [
        { id: 'profile', label: 'Profile', icon: User, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
        { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-amber-600', bgColor: 'bg-amber-50' },
        { id: 'account', label: 'Account', icon: SettingsIcon, color: 'text-gray-600', bgColor: 'bg-gray-50' },
    ];


    if (!isOpen && activeSection === 'main') return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] transition-transform duration-500 ease-in-out border-l border-gray-100 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        {activeSection !== 'main' && (
                            <button 
                                onClick={() => { setActiveSection('main'); setStatusMessage({ type: '', text: '' }); }}
                                className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                            >
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">
                            {activeSection === 'main' ? 'App Settings' : sections.find(s => s.id === activeSection)?.label || 'Action'}
                        </h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all text-gray-400"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="h-[calc(100%-80px)] overflow-y-auto p-6">
                    {activeSection === 'main' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-right-4 duration-300">
                            {/* Profile Peek */}
                            <div className="mb-8 p-6 bg-indigo-600 rounded-[2rem] text-white shadow-lg shadow-indigo-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700"></div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl font-black">
                                        {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black">{user?.firstName} {user?.lastName}</h3>
                                        <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest opacity-80">{user?.role || 'User'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Section Navigation */}
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-2">Preferences</p>
                            <div className="space-y-2">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 ${section.bgColor} ${section.color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                                                <section.icon size={20} />
                                            </div>
                                            <span className="font-bold text-gray-700 group-hover:text-gray-900 transition-colors">{section.label}</span>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition-all group-hover:translate-x-1" />
                                    </button>
                                ))}
                            </div>

                            {/* Quick Actions */}
                            <div className="mt-10 pt-8 border-t border-gray-100">
                                <button 
                                    onClick={logout}
                                    className="w-full flex items-center gap-4 p-4 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-black group"
                                >
                                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <LogOut size={20} />
                                    </div>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Notifications Section */}
                    {activeSection === 'notifications' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Alerts</p>
                                <div className="space-y-3">
                                    {[
                                        { id: 'emailAssignments', label: 'New Assignments', desc: 'Get notified when a teacher posts new work.' },
                                        { id: 'emailGrades', label: 'Grading Updates', desc: 'Alerts when your submission has been evaluated.' },
                                        { id: 'emailSecurity', label: 'Security Alerts', desc: 'Critical notifications about your account access.' }
                                    ].map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{item.desc}</p>
                                            </div>
                                            <button 
                                                onClick={() => setNotifPrefs({...notifPrefs, [item.id]: !notifPrefs[item.id]})}
                                                className={`w-12 h-6 rounded-full transition-all relative ${notifPrefs[item.id] ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                            >
                                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifPrefs[item.id] ? 'left-7' : 'left-1'}`}></div>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Application Sound</p>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                                    <p className="font-bold text-gray-900 text-sm">Enable Notification Sounds</p>
                                    <button 
                                        onClick={() => setNotifPrefs({...notifPrefs, appSound: !notifPrefs.appSound})}
                                        className={`w-12 h-6 rounded-full transition-all relative ${notifPrefs.appSound ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifPrefs.appSound ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}



                    {/* Account Section */}
                    {activeSection === 'account' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Identify</p>
                                <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Account Name</p>
                                            <p className="font-bold text-gray-900">{user?.firstName} {user?.lastName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm">
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-0.5">Email Address</p>
                                            <p className="font-bold text-gray-900">{user?.email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Security Actions</p>
                                <div className="grid gap-3">
                                    <button 
                                        onClick={() => setActiveSection('change-password')}
                                        className="flex items-center justify-between p-5 rounded-3xl bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Lock size={18} />
                                            </div>
                                            <span className="font-bold text-gray-700">Change Password</span>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-all" />
                                    </button>

                                    <button 
                                        onClick={() => setActiveSection('delete-confirm')}
                                        className="flex items-center justify-between p-5 rounded-3xl bg-white border border-gray-100 hover:border-red-200 hover:bg-red-50/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Trash2 size={18} />
                                            </div>
                                            <span className="font-bold text-gray-700">Delete Account</span>
                                        </div>
                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-red-500 transition-all" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Change Password View */}
                    {activeSection === 'change-password' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <form onSubmit={handlePasswordChange} className="space-y-5">
                                <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6">
                                    Protect your account with a unique and strong password. You'll need to re-verify your current identity first.
                                </p>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showOldPassword ? "text" : "password"}
                                            required
                                            value={passwordData.oldPassword}
                                            onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})}
                                            autoComplete="current-password"
                                            className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium pr-12 text-gray-900 placeholder-gray-400"
                                            placeholder="Enter your current password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                        >
                                            {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showNewPassword ? "text" : "password"}
                                            required
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                                            autoComplete="new-password"
                                            className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium pr-12 text-gray-900 placeholder-gray-400"
                                            placeholder="Create a strong password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                            autoComplete="new-password"
                                            className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium pr-12 text-gray-900 placeholder-gray-400"
                                            placeholder="Re-enter new password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 transition-colors p-1"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                {statusMessage.text && (
                                    <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {statusMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                                        <p className="text-xs font-bold">{statusMessage.text}</p>
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>Save New Password</>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Delete Confirm View */}
                    {activeSection === 'delete-confirm' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col items-center pt-8">
                            <div className="w-20 h-20 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mb-6 animate-pulse">
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">Delete Account?</h3>
                            <p className="text-center text-gray-500 font-medium mb-8">
                                This action is permanent. All your classrooms, assignments, and academic data will be discarded.
                            </p>

                            <div className="w-full bg-red-50 rounded-2xl p-6 border border-red-100 mb-8 texte-center">
                                <p className="text-xs font-bold text-red-700 uppercase tracking-widest mb-3">To Continue, type <span className="underline decoration-2 underline-offset-4">DELETE</span></p>
                                <input 
                                    type="text"
                                    value={deleteConfirmText}
                                    onChange={e => setDeleteConfirmText(e.target.value)}
                                    className="w-full bg-white border border-red-200 rounded-xl px-4 py-3 text-center font-black tracking-widest uppercase outline-none focus:ring-2 focus:ring-red-500/20"
                                    placeholder="Type here..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button 
                                    onClick={() => setActiveSection('account')}
                                    className="py-4 bg-gray-50 text-gray-600 rounded-2xl font-black hover:bg-gray-100 transition-all border border-gray-100"
                                >
                                    Cancel
                                </button>
                                <button 
                                    disabled={deleteConfirmText !== 'DELETE'}
                                    onClick={() => setActiveSection('confirm-delete-password')}
                                    className="py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-100 hover:bg-red-600 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Final Delete Password Re-Auth */}
                    {activeSection === 'confirm-delete-password' && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                             <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900">One Final Step</h3>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Security Check</p>
                                </div>
                            </div>

                            <p className="text-sm font-medium text-gray-500 mb-6 font-medium">
                                For your security, please enter your password one last time to authorize this request.
                            </p>

                            <div className="space-y-4 w-full">
                                <div className="relative">
                                    <input 
                                        type={showDeletePassword ? "text" : "password"}
                                        value={deleteFinalPassword}
                                        onChange={e => setDeleteFinalPassword(e.target.value)}
                                        autoComplete="current-password"
                                        className="w-full px-5 py-5 rounded-2xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-black text-center pr-12 text-gray-900 placeholder-gray-400"
                                        placeholder="Enter password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowDeletePassword(!showDeletePassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors p-1"
                                    >
                                        {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                
                                {statusMessage.text && (
                                    <div className="p-4 bg-red-50 text-red-700 rounded-2xl flex items-center gap-3">
                                        <AlertTriangle size={18} />
                                        <p className="text-xs font-bold">{statusMessage.text}</p>
                                    </div>
                                )}

                                <button 
                                    disabled={isLoading || !deleteFinalPassword}
                                    onClick={handleFinalDelete}
                                    className="w-full py-5 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-100 hover:bg-red-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>Permanently Remove My Account</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Placeholder Logic cleaned up */}
                    {activeSection === 'control' && (
                        <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300 space-y-4 pb-20">
                            <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-[2rem] flex items-center justify-center mb-2">
                                <Activity size={40} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900">Personal Control Settings</h3>
                            <p className="text-gray-400 font-medium max-w-[240px]">This section is under maintenance or will be available in future updates.</p>
                            <button 
                                onClick={() => setActiveSection('main')}
                                className="px-8 py-3 bg-gray-50 text-gray-600 rounded-2xl font-black hover:bg-gray-100 transition-all border border-gray-100"
                            >
                                Back to Settings
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default SettingsPanel;
