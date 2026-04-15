import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Plus, X, ChevronRight, GraduationCap } from 'lucide-react';
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
        <div className="min-h-screen bg-[#f8fafc] p-8 md:p-12">
            <div>
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/student/dashboard')}
                            className="p-3 bg-white border border-gray-100 text-gray-500 rounded-xl font-bold shadow-sm hover:bg-gray-50 hover:border-gray-200 hover:text-indigo-600 transition-all flex items-center justify-center group"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <BookOpen className="text-indigo-600" size={40} /> 
                                My Classes
                            </h1>
                            <p className="text-gray-500 mt-2 font-medium text-lg italic">
                                Access your enrolled academic spaces and materials.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowJoinForm(true)}
                        className="group relative px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <Plus size={22} className="relative z-10" />
                        <span className="relative z-10 uppercase tracking-widest text-xs">Join New Class</span>
                    </button>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                    {classes.map(c => (
                        <div
                            key={c.id}
                            className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all group flex flex-col h-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Class Code</p>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-mono font-black rounded-lg uppercase tracking-wider group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            {c.code}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                                    {c.name}
                                </h3>
                                <p className="text-gray-500 font-medium text-sm line-clamp-3 mb-8 leading-relaxed">
                                    {c.description || "No description provided for this classroom yet."}
                                </p>
                            </div>

                            <button
                                onClick={() => navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                className="relative z-10 w-full py-4 bg-gray-50 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-100 transition-all flex items-center justify-center gap-2 group/btn active:scale-95"
                            >
                                Enter Classroom
                                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
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
        </div>
    );
};

export default StudentClasses;

