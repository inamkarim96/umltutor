import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { 
    selectClasses, 
    selectStudents, 
    fetchClasses,
    fetchStudents,
    createClass, 
    addStudentToClass, 
    removeStudentFromClass 
} from '../../features/classroom';
import { 
    Search, 
    Plus, 
    Trash2, 
    GraduationCap, 
    UserPlus, 
    X, 
    CheckCircle, 
    Shield,
    Users,
    ChevronRight,
    Mail,
    Info
} from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';

const ClassesManagement = () => {
    const dispatch = useAppDispatch();
    const classes = useAppSelector(selectClasses);
    const studentsMap = useAppSelector(selectStudents);

    const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
    const [selectedClassId, setSelectedClassId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newClassName, setNewClassName] = useState('');
    const [newClassDesc, setNewClassDesc] = useState('');
    const [newStudentEmail, setNewStudentEmail] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, studentId: null });

    useEffect(() => {
        dispatch(fetchClasses());
        dispatch(fetchStudents());
    }, [dispatch]);

    // Set initial selection if none
    useEffect(() => {
        if (!selectedClassId && classes.length > 0) {
            setSelectedClassId(classes[0].id);
        }
    }, [classes, selectedClassId]);

    const activeClass = classes.find(c => c.id === selectedClassId);
    
    const classStudents = activeClass?.students || activeClass?.studentIds?.map(id => studentsMap[id]).filter(Boolean) || [];

    const filteredStudents = classStudents.filter(s => 
        (s.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         s.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         s.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleCreateClass = async (e) => {
        e.preventDefault();
        try {
            setErrorMessage('');
            await dispatch(createClass({ name: newClassName, description: newClassDesc })).unwrap();
            setIsCreateClassModalOpen(false);
            setNewClassName('');
            setNewClassDesc('');
            setSuccessMessage('Class created successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setErrorMessage('Failed to create class: ' + (error?.message || error));
        }
    };

    const handleAddStudent = async (e) => {
        e.preventDefault();
        if (selectedClassId && newStudentEmail) {
            setErrorMessage('');
            const student = Object.values(studentsMap).find(s => s.email.toLowerCase() === newStudentEmail.toLowerCase());
            if (student) {
                try {
                    await dispatch(addStudentToClass({
                        classId: selectedClassId,
                        studentId: student.id
                    })).unwrap();
                    setNewStudentEmail('');
                    setSuccessMessage('Student enrolled successfully!');
                    setTimeout(() => setSuccessMessage(''), 3000);
                } catch (error) {
                    setErrorMessage('Add student failed: ' + (error?.message || error));
                }
            } else {
                setErrorMessage('Student not found. They must have an account first.');
            }
        }
    };

    const handleRemoveStudent = async () => {
        const studentId = confirmDelete.studentId;
        if (!studentId) return;
        
        setErrorMessage('');
        try {
            await dispatch(removeStudentFromClass({ 
                classId: selectedClassId, 
                studentId 
            })).unwrap();
            setSuccessMessage('Student removed successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setErrorMessage('Remove failed: ' + (error?.message || error));
        }
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8 md:p-12">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <GraduationCap className="text-indigo-600" size={40} /> 
                            Classrooms
                        </h1>
                        <p className="text-gray-500 mt-2 font-medium text-lg italic">
                            Manage your academic spaces and student enrollments.
                        </p>
                    </div>
                    <button 
                        onClick={() => setIsCreateClassModalOpen(true)}
                        className="group relative px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3 active:scale-95 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <Plus size={22} className="relative z-10" />
                        <span className="relative z-10 uppercase tracking-widest text-xs">Create New Class</span>
                    </button>
                </div>

                {/* Status Messages */}
                {(errorMessage || successMessage) && (
                    <div className={`mb-10 p-5 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 border ${errorMessage ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100' : 'bg-emerald-100'}`}>
                            {errorMessage ? <Info size={20} /> : <CheckCircle size={20} />}
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-sm uppercase tracking-tight">{errorMessage ? 'Action Failed' : 'Success'}</p>
                            <p className="text-sm font-medium opacity-90">{errorMessage || successMessage}</p>
                        </div>
                        <button 
                            onClick={() => {setErrorMessage(''); setSuccessMessage('');}}
                            className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Classes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 italic">Access Token</p>
                                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[10px] font-mono font-black rounded-lg uppercase tracking-wider group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                            {c.code}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
                                    {c.name}
                                </h3>
                                <p className="text-gray-500 font-medium text-sm line-clamp-3 mb-8 leading-relaxed">
                                    {c.description || "No description provided for this classroom yet. Update it in settings."}
                                </p>
                            </div>

                            <button
                                onClick={() => navigate(`/teacher/classes/${c.id}`)}
                                className="relative z-10 w-full py-4 bg-gray-50 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white hover:shadow-lg hover:shadow-indigo-100 transition-all flex items-center justify-center gap-2 group/btn active:scale-95"
                            >
                                Manage Classroom
                                <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    ))}
                </div>

                {classes.length === 0 && (
                    <div className="py-32 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-50 mb-8 animate-bounce transition-all duration-[3000ms]">
                            <Users size={40} className="text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 italic">Your corridor is quiet</h3>
                        <p className="text-gray-400 font-medium leading-relaxed">
                            You haven't created any classes yet. Start by setting up a new space for your students to begin their UML journey.
                        </p>
                    </div>
                )}
            </div>

            {/* Create Class Modal */}
            {isCreateClassModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500 border border-white/20">
                        <div className="p-10 md:p-12">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900 tracking-tight italic">New Classroom</h2>
                                    <p className="text-gray-500 font-medium text-sm mt-1 uppercase tracking-tighter">Enter details to initiate space</p>
                                </div>
                                <button 
                                    onClick={() => setIsCreateClassModalOpen(false)} 
                                    className="w-12 h-12 flex items-center justify-center bg-gray-50 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all text-gray-400 active:scale-90"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateClass} className="space-y-8">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Classroom Designation</label>
                                    <input
                                        type="text"
                                        required
                                        value={newClassName}
                                        onChange={e => setNewClassName(e.target.value)}
                                        className="w-full px-6 py-5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-600 shadow-inner outline-none transition-all font-bold text-gray-900 placeholder:text-gray-300"
                                        placeholder="e.g. Adv. Software Design"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description / Goals</label>
                                    <textarea
                                        required
                                        value={newClassDesc}
                                        onChange={e => setNewClassDesc(e.target.value)}
                                        className="w-full px-6 py-5 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-600 shadow-inner outline-none transition-all h-40 font-medium text-gray-900 placeholder:text-gray-300 resize-none"
                                        placeholder="What will students achieve here?"
                                    />
                                </div>
                                <div className="pt-6 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateClassModalOpen(false)}
                                        className="flex-1 px-8 py-5 bg-gray-100 text-gray-500 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase text-[10px] tracking-widest active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        <CheckCircle size={18} /> Initialize Class
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default ClassesManagement;

