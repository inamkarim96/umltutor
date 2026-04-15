import React, { useState, useEffect } from 'react';
import {
    Send,
    MessageSquare,
    Trash2,
    Clock,
    Megaphone,
    Pencil,
    Check,
    RefreshCw,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import ConfirmModal from '../../../components/shared/ConfirmModal';
import {
    fetchAnnouncements,
    createAnnouncement,
    deleteAnnouncement,
    updateAnnouncement,
    selectAnnouncements
} from '../../classroom/classroomSlice';
import { selectUser } from '../../auth';

const AnnouncementBoard = ({ classId }) => {
    const dispatch = useAppDispatch();
    const announcements = useAppSelector(state => selectAnnouncements(state, classId));
    const user = useAppSelector(selectUser);
    const [newPost, setNewPost] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const isTeacher = user?.role?.toUpperCase() === 'TEACHER';

    useEffect(() => {
        dispatch(fetchAnnouncements(classId));
    }, [dispatch, classId]);

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!newPost.trim()) return;
        setIsPosting(true);
        try {
            await dispatch(createAnnouncement({ classId, data: { content: newPost } })).unwrap();
            setNewPost('');
        } finally {
            setIsPosting(false);
        }
    };

    const handleCreateReply = async (parentId) => {
        if (!replyText.trim()) return;
        try {
            await dispatch(createAnnouncement({
                classId,
                data: { content: replyText, parentId }
            })).unwrap();
            setReplyText('');
            setReplyingTo(null);
        } catch (err) {
            alert(err.message || 'Failed to reply');
        }
    };

    const handleStartEdit = (item) => {
        setEditingId(item.id);
        setEditText(item.content);
    };

    const handleSaveEdit = async () => {
        if (!editText.trim()) return;
        setIsUpdating(true);
        try {
            await dispatch(updateAnnouncement({
                id: editingId,
                data: { content: editText }
            })).unwrap();
            setEditingId(null);
            setEditText('');
        } catch (err) {
            alert(err.message || 'Failed to update');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="w-full mx-auto py-8 px-4">
            {/* Create Post - Only for Teachers */}
            {isTeacher && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mb-10 overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full translate-x-12 -translate-y-12"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                <Megaphone size={18} />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Post Announcement</h3>
                        </div>
                        <form onSubmit={handleCreatePost} className="space-y-4">
                            <textarea
                                value={newPost}
                                onChange={e => setNewPost(e.target.value)}
                                placeholder="Share something with your class..."
                                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium resize-none text-gray-700 min-h-[120px]"
                            />
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isPosting || !newPost.trim()}
                                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Send size={18} /> POST
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Announcements List */}
            <div className="space-y-6">
                {announcements.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <MessageSquare size={32} className="text-gray-200" />
                        </div>
                        <p className="text-gray-400 font-bold italic">No posts yet. Start the conversation!</p>
                    </div>
                ) : (
                    announcements.map((post) => {
                        const canDeleteMain = isTeacher || user?.id === post.authorId;

                        return (
                            <div key={post.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                {/* Main Post Content */}
                                <div className="p-8 pb-4">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-white border border-indigo-100/50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm">
                                                {post.author?.firstName?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-lg tracking-tight">{post.author?.firstName} {post.author?.lastName}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                                                        <Clock size={10} className="text-gray-300" />
                                                        {new Date(post.createdAt).toLocaleDateString()} at {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {canDeleteMain && (
                                                <button
                                                    onClick={() => handleStartEdit(post)}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="Edit Post"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            )}
                                            {canDeleteMain && (
                                                <button
                                                    onClick={() => {
                                                        setConfirmModal({
                                                            isOpen: true,
                                                            title: 'Delete Announcement',
                                                            message: 'Are you sure you want to delete this announcement? This will also delete all its replies.',
                                                            onConfirm: () => dispatch(deleteAnnouncement(post.id))
                                                        });
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                    title="Delete Post"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {editingId === post.id ? (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <textarea
                                                autoFocus
                                                value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-indigo-600/20 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all font-medium resize-none text-gray-700 min-h-[120px]"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="px-6 py-2.5 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    disabled={isUpdating || !editText.trim()}
                                                    onClick={handleSaveEdit}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                                >
                                                    {isUpdating ? <RefreshCw className="animate-spin" size={12} /> : <Check size={12} />} SAVE CHANGES
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pl-1 leading-relaxed text-gray-700 font-medium text-lg whitespace-pre-wrap mb-6">
                                            {post.content}
                                            {post.updatedAt !== post.createdAt && (
                                                <span className="ml-2 text-[10px] text-gray-400 font-bold italic">(edited)</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Replies Section */}
                                <div className="bg-gray-50/50 mt-2 p-8 pt-6 border-t border-gray-100/50">
                                    {post.replies && post.replies.length > 0 && (
                                        <div className="space-y-6 mb-8 group/thread relative pb-2">
                                            {post.replies.map((reply) => (
                                                <div key={reply.id} className="flex gap-4 relative animate-in slide-in-from-left-2 duration-300">
                                                    <div className="flex-1 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative group/reply">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center text-[10px] font-black">
                                                                    {reply.author?.firstName?.charAt(0) || 'U'}
                                                                </div>
                                                                <p className="text-xs font-black text-gray-900 tracking-tight">{reply.author?.firstName} {reply.author?.lastName}</p>
                                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{new Date(reply.createdAt).toLocaleDateString()}</p>
                                                            </div>
                                                            {(isTeacher || user?.id === reply.authorId) && (
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => handleStartEdit(reply)}
                                                                        className="w-7 h-7 flex items-center justify-center text-gray-200 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                    >
                                                                        <Pencil size={12} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setConfirmModal({
                                                                                isOpen: true,
                                                                                title: 'Delete Reply',
                                                                                message: 'Are you sure you want to delete this reply?',
                                                                                onConfirm: () => dispatch(deleteAnnouncement(reply.id))
                                                                            });
                                                                        }}
                                                                        className="w-7 h-7 flex items-center justify-center text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                    >
                                                                        <Trash2 size={12} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {editingId === reply.id ? (
                                                            <div className="space-y-3 animate-in fade-in duration-300">
                                                                <textarea
                                                                    autoFocus
                                                                    value={editText}
                                                                    onChange={e => setEditText(e.target.value)}
                                                                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-indigo-600/20 focus:bg-white focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/5 outline-none transition-all text-sm font-medium resize-none text-gray-700 min-h-[80px]"
                                                                />
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => setEditingId(null)}
                                                                        className="px-4 py-1.5 text-[9px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        disabled={isUpdating || !editText.trim()}
                                                                        onClick={handleSaveEdit}
                                                                        className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                                                    >
                                                                        {isUpdating ? <RefreshCw className="animate-spin" size={10} /> : <Check size={10} />} SAVE
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                                                {reply.content}
                                                                {reply.updatedAt !== reply.createdAt && (
                                                                    <span className="ml-2 text-[9px] text-gray-400 font-bold italic">(edited)</span>
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reply Input */}
                                    <div className="pl-8">
                                        {replyingTo === post.id ? (
                                            <div className="flex flex-col gap-2 animate-in slide-in-from-top-2 duration-300">
                                                <textarea
                                                    autoFocus
                                                    value={replyText}
                                                    onChange={e => setReplyText(e.target.value)}
                                                    placeholder="Write your reply..."
                                                    className="w-full px-4 py-3 rounded-xl bg-white border border-transparent focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all text-sm font-medium resize-none shadow-sm h-24"
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                                                        className="px-4 py-2 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        disabled={!replyText.trim()}
                                                        onClick={() => handleCreateReply(post.id)}
                                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                                    >
                                                        REPLY
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setReplyingTo(post.id)}
                                                className="flex items-center gap-2 py-2 px-4 hover:bg-white rounded-xl text-gray-400 hover:text-indigo-600 transition-all text-xs font-black uppercase tracking-widest group"
                                            >
                                                <MessageSquare size={14} className="group-hover:scale-110 transition-transform" /> Reply to conversation
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
};

export default AnnouncementBoard;
