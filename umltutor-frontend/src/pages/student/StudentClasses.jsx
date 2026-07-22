import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft, Plus, X, ChevronRight, GraduationCap } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { selectClasses, fetchClasses, joinClass } from '../../features/classroom';

const StudentClasses = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const classes = useAppSelector(selectClasses);
    const [classCode, setClassCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [showJoinForm, setShowJoinForm] = useState(false);

    React.useEffect(() => {
        if (classes.length === 0) {
            dispatch(fetchClasses('STUDENT'));
        }
    }, [dispatch, classes.length]);

    const handleJoinClass = async (e) => {
        e.preventDefault();
        setJoinError('');
        setIsJoining(true);
        
        try {
            await dispatch(joinClass(classCode)).unwrap();
            setClassCode('');
            setIsJoining(false);
            setShowJoinForm(false);
            // Refresh classes to show the newly joined class
            dispatch(fetchClasses('STUDENT'));
        } catch (error) {
            setJoinError(error || 'Failed to join class. Please check the code.');
            setIsJoining(false);
        }
    };

    return (
        <div className="min-h-screen bg-transparent p-8 md:p-12">
            <div>
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/student/dashboard')}
                            className="p-3 bg-white border border-black/5 text-muted rounded-xl font-bold font-body shadow-card hover:bg-surface-3 hover:border-black/10 hover:text-accent transition-all flex items-center justify-center group"
                            title="Back to Dashboard"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-extrabold font-heading text-ink tracking-tight flex items-center gap-3">
                                <BookOpen className="text-accent" size={40} /> 
                                My Classes
                            </h1>
                            <p className="text-muted mt-2 font-medium text-lg italic">
                                Access your enrolled academic spaces and materials.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowJoinForm(true)}
                        className="group relative px-8 py-4 bg-accent text-white rounded-lg font-extrabold font-heading shadow-xl shadow-accent/20 hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <Plus size={22} className="relative z-10" />
                        <span className="relative z-10 uppercase tracking-widest text-xs">Join New Class</span>
                    </button>
                </div>

            {/* Join Class Modal */}
            {showJoinForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-hover overflow-hidden">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-extrabold font-heading text-ink">Join a Class</h2>
                                <button
                                    onClick={() => setShowJoinForm(false)}
                                    className="text-gray-400 hover:text-muted transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <p className="text-muted text-sm mb-6">Enter a class code to join a new class.</p>
                            <form onSubmit={handleJoinClass} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold font-body text-gray-700 mb-1">Class Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={classCode}
                                        onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                        className="w-full px-4 py-4 rounded-xl border border-black/10 bg-surface-3 text-center text-2xl font-extrabold font-heading tracking-widest outline-none transition-all placeholder-gray-400"
                                        placeholder="E.G. SE101A"
                                        maxLength={8}
                                    />
                                    {joinError && <p className="mt-2 text-xs font-bold font-body text-status-red">{joinError}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isJoining}
                                    className="w-full py-4 bg-accent text-white rounded-xl font-bold font-body shadow-hover shadow-accent/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="bg-white p-8 rounded-lg border border-black/5 shadow-card hover:shadow-hover hover:-translate-y-2 transition-all group flex flex-col h-full relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10/30 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700"></div>
                            
                            <div className="relative z-10 flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-16 h-16 bg-accent/10 text-accent rounded-lg flex items-center justify-center font-extrabold font-heading text-2xl shadow-card border border-accent/10 group-hover:bg-accent group-hover:text-white transition-all duration-300">
                                        {c.name.charAt(0)}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1 italic">Class Code</p>
                                        <span className="px-3 py-1 bg-surface-3 text-muted text-[10px] font-mono font-extrabold font-heading rounded-lg uppercase tracking-wider group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                                            {c.code}
                                        </span>
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold font-heading text-ink mb-3 group-hover:text-accent transition-colors">
                                    {c.name}
                                </h3>
                                <p className="text-muted font-medium text-sm line-clamp-3 mb-8 leading-relaxed">
                                    {c.description || "No description provided for this classroom yet."}
                                </p>
                            </div>

                            <button
                                onClick={() => navigate(`/student/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                className="relative z-10 w-full py-4 bg-surface-3 text-muted rounded-lg text-xs font-extrabold font-heading uppercase tracking-widest hover:bg-accent hover:text-white hover:shadow-hover hover:shadow-accent/20 transition-all flex items-center justify-center gap-2 group/btn active:scale-95"
                            >
                                Enter Classroom
                                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-black/10 text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-muted font-medium">You haven't joined any classes yet.</p>
                    <button
                        onClick={() => setShowJoinForm(true)}
                        className="mt-4 text-accent font-bold font-body hover:underline"
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

