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
        <div className="min-h-screen bg-[#f8fafc] flex">
            {/* Sidebar - Classes List */}
            <div className="w-80 bg-white border-r border-gray-100 flex flex-col pt-8 shadow-sm">
                <div className="px-6 mb-8 flex justify-between items-center">
                    <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <GraduationCap className="text-indigo-600" size={24} /> Classes
                    </h2>
                    <button 
                        onClick={() => setIsCreateClassModalOpen(true)}
                        className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    >
                        <Plus size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-8">
                    {classes.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setSelectedClassId(c.id)}
                            className={`w-full text-left p-5 rounded-2xl transition-all group relative overflow-hidden ${selectedClassId === c.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-gray-600 hover:bg-indigo-50/50'}`}
                        >
                            <div className="relative z-10">
                                <p className="font-extrabold text-sm mb-1">{c.name}</p>
                                <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${selectedClassId === c.id ? 'text-indigo-100' : 'text-gray-400'}`}>
                                    <Shield size={10} /> {c.code}
                                </div>
                            </div>
                            {selectedClassId === c.id && (
                                <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-200" />
                            )}
                        </button>
                    ))}
                    {classes.length === 0 && (
                        <div className="px-6 py-10 text-center">
                            <p className="text-gray-400 font-bold italic text-sm">No classes created yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content - Students in selected class */}
            <div className="flex-1 p-10 overflow-y-auto">
                {activeClass ? (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-start mb-12">
                            <div>
                                <h1 className="text-4xl font-black text-gray-900 tracking-tight">{activeClass.name}</h1>
                                <p className="text-gray-500 mt-2 font-medium text-lg leading-relaxed max-w-2xl">{activeClass.description}</p>
                            </div>
                            <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-xl shadow-indigo-50 flex flex-col items-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Access Token</p>
                                <p className="text-2xl font-black text-indigo-600 font-mono tracking-tighter">{activeClass.code}</p>
                            </div>
                        </div>
                        
                        {/* Status Messages */}
                        {(errorMessage || successMessage) && (
                            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${errorMessage ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${errorMessage ? 'bg-red-100' : 'bg-emerald-100'}`}>
                                    {errorMessage ? <Info size={16} /> : <CheckCircle size={16} />}
                                </div>
                                <p className="font-bold text-sm">{errorMessage || successMessage}</p>
                                <button 
                                    onClick={() => {setErrorMessage(''); setSuccessMessage('');}}
                                    className="ml-auto p-1 hover:bg-black/5 rounded-lg transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        )}


                        {/* Student Management Section */}
                        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden border-t-4 border-t-indigo-500">
                            <div className="p-8 border-b border-gray-50 flex flex-wrap gap-4 justify-between items-center bg-gray-50/30">
                                <div className="relative w-full sm:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search students in class..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-6 py-4 bg-white border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-900 shadow-inner"
                                    />
                                </div>
                                <form onSubmit={handleAddStudent} className="flex gap-3 w-full sm:w-auto">
                                    <div className="relative flex-1">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <input
                                            type="email"
                                            placeholder="Student Email Address"
                                            required
                                            value={newStudentEmail}
                                            onChange={e => setNewStudentEmail(e.target.value)}
                                            className="w-full pl-11 pr-6 py-4 bg-white border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-900 shadow-inner min-w-[260px]"
                                        />
                                    </div>
                                    <button className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 whitespace-nowrap">
                                        <UserPlus size={18} /> Enroll
                                    </button>
                                </form>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {filteredStudents.length > 0 ? (
                                    filteredStudents.map(student => (
                                        <div key={student.id} className="p-6 flex items-center justify-between hover:bg-indigo-50/30 transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm group-hover:bg-white transition-colors">
                                                    {(student.firstName || student.name || 'S').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-lg">
                                                        {student.firstName ? `${student.firstName} ${student.lastName}` : (student.name || student.email)}
                                                    </p>
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                                        <Mail size={12} /> {student.email}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveStudent(student.id)}
                                                className="w-10 h-10 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-white rounded-xl transition-all hover:shadow-sm"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-24 text-center">
                                        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Users size={32} className="text-indigo-400" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 mb-1">Classroom is empty</h3>
                                        <p className="text-gray-400 font-bold italic">Start by enrolling students via email.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl shadow-indigo-50 mb-8 animate-bounce duration-[3000ms]">
                            <GraduationCap size={48} className="text-indigo-600" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">Select a class to manage</h3>
                        <p className="text-gray-400 max-w-md font-medium text-lg">Pick a classroom from the sidebar to manage enrollment, view student details, and sync progress.</p>
                    </div>
                )}
            </div>

            {/* Create Class Modal */}
            {isCreateClassModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-900">New Classroom</h2>
                                    <p className="text-gray-500 font-medium text-sm mt-1">Set up a new space for your students.</p>
                                </div>
                                <button 
                                    onClick={() => setIsCreateClassModalOpen(false)} 
                                    className="w-10 h-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <form onSubmit={handleCreateClass} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Class Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newClassName}
                                        onChange={e => setNewClassName(e.target.value)}
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 shadow-inner outline-none transition-all font-bold text-gray-900 placeholder:text-gray-300"
                                        placeholder="e.g. Software Engineering A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Description</label>
                                    <textarea
                                        required
                                        value={newClassDesc}
                                        onChange={e => setNewClassDesc(e.target.value)}
                                        className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 shadow-inner outline-none transition-all h-32 font-medium text-gray-900 placeholder:text-gray-300 resize-none"
                                        placeholder="Describe the course goals..."
                                    />
                                </div>
                                <div className="pt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateClassModalOpen(false)}
                                        className="flex-1 px-8 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all uppercase text-xs tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={16} /> Create Class
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, studentId: null })}
                onConfirm={handleRemoveStudent}
                title="Remove Student"
                message="Are you sure you want to remove this student from the class? They will lose access to all assignments in this classroom."
                confirmText="Remove"
            />
        </div>
    );
};


export default ClassesManagement;

