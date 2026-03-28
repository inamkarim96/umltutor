import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Plus, X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectClasses, fetchClasses, joinClass } from '../../features/classroom';
import { selectUser } from '../../features/auth';

const StudentClasses = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const classes = useAppSelector(selectClasses);
    const user = useAppSelector(selectUser);
    const [classCode, setClassCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [showJoinForm, setShowJoinForm] = useState(false);

    React.useEffect(() => {
        if (classes.length === 0) {
            dispatch(fetchClasses());
        }
    }, [dispatch, classes.length]);

    const handleJoinClass = async (e) => {
        e.preventDefault();
        setJoinError('');
        setIsJoining(true);
        
        try {
            await dispatch(joinClass({ studentId: user?.id, classCode })).unwrap();
            setClassCode('');
            setIsJoining(false);
            setShowJoinForm(false);
            // Refresh classes to show the newly joined class
            dispatch(fetchClasses());
        } catch (error) {
            setJoinError(error || 'Failed to join class. Please check the code.');
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="p-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            My Classes
                        </h1>
                        <p className="text-gray-500 mt-1 font-medium">All your enrolled classes</p>
                    </div>
                    <button
                        onClick={() => setShowJoinForm(!showJoinForm)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Join Class
                    </button>
                </div>
            </div>

            {/* Join Class Modal */}
            {showJoinForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-gray-900">Join a Class</h2>
                                <button
                                    onClick={() => setShowJoinForm(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <p className="text-gray-500 text-sm mb-6">Enter a class code to join a new class.</p>
                            <form onSubmit={handleJoinClass} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Class Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={classCode}
                                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-4 rounded-xl border border-gray-200 bg-gray-50 text-center text-2xl font-black tracking-widest outline-none transition-all placeholder-gray-400"
                                        placeholder="E.G. SE101A"
                                        maxLength={8}
                                    />
                                    {joinError && <p className="mt-2 text-xs font-bold text-red-500">{joinError}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isJoining}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isJoining ? 'Joining...' : 'Join Class'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Classes Grid */}
            {classes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map(c => (
                        <div
                            key={c.id}
                            onClick={() => navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-lg"> 
                                    {c.name.charAt(0)}
                                </div>
                                <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-widest"> 
                                    {c.code}
                                </span>
                            </div>
                            <h4 className="font-extrabold text-gray-900 text-lg mb-2 group-hover:text-indigo-600 transition-colors">{c.name}</h4>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-4">{c.description}</p>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                                    <BookOpen size={14} />
                                    <span>View Assignments</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-gray-200 text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-gray-500 font-medium">You haven't joined any classes yet.</p>
                    <button
                        onClick={() => setShowJoinForm(true)}
                        className="mt-4 text-indigo-600 font-bold hover:underline"
                    >
                        Join your first class now
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudentClasses;

