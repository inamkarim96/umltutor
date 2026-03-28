import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
    selectClasses,
    fetchClasses,
    selectClassroomLoading
} from '../../features/classroom';
import {
    selectAllAssignments,
    fetchAllAssignments,
    createAssignment,
    updateAssignment,
    deleteAssignment
} from '../../features/assignments';
import {
    BookOpen,
    Plus,
    Calendar,
    Trash2,
    Edit,
    X,
    CheckCircle,
    Layout
} from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';
import CreateAssignmentModal from '../../features/teacher/components/CreateAssignmentModal';

const AssignmentsDashboard = () => {
    const dispatch = useAppDispatch();
    const classes = useAppSelector(selectClasses);
    const assignments = useAppSelector(selectAllAssignments) || [];
    const isLoading = useAppSelector(selectClassroomLoading);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, assignmentId: null });

    useEffect(() => {
        dispatch(fetchClasses('TEACHER'));
        dispatch(fetchAllAssignments('TEACHER'));
    }, [dispatch]);

    const handleCreateOrUpdate = async (data) => {
        setErrorMessage('');
        try {
            if (editingAssignment) {
                await dispatch(updateAssignment({ 
                    id: editingAssignment.id, 
                    data 
                })).unwrap();
                setSuccessMessage('Assignment updated successfully!');
            } else {
                let classId;
                if (data instanceof FormData) {
                    classId = data.get('classId');
                    if (!classId && classes.length > 0) {
                        classId = classes[0].id;
                        data.append('classId', classId);
                    }
                } else {
                    classId = data.classId || (classes.length > 0 ? classes[0].id : null);
                }

                if (!classId) throw new Error('No class selected');

                await dispatch(createAssignment({
                    classId,
                    data
                })).unwrap();
                setSuccessMessage('Assignment has been created successfully. If you want to make changes, you can edit the assignment anytime.');
            }
            setIsModalOpen(false);
            setEditingAssignment(null);
            setTimeout(() => setSuccessMessage(''), 8000);
        } catch (error) {
            setErrorMessage(`Failed to ${editingAssignment ? 'update' : 'create'} assignment: ${error?.message || error}`);
        }
    };

    const handleEditClick = (asgn) => {
        setEditingAssignment({
            ...asgn,
            deadline: asgn.dueDate || asgn.deadline
        });
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        const id = confirmDelete.assignmentId;
        if (!id) return;

        setErrorMessage('');
        try {
            await dispatch(deleteAssignment(id)).unwrap();
            setSuccessMessage('Assignment deleted successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            setErrorMessage('Delete failed: ' + (error?.message || error));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Assignments Management</h1>
                    <p className="text-gray-500 font-medium">Create and track assignments across all your classes.</p>
                </div>
                <button
                    onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                >
                    <Plus size={20} /> New Assignment
                </button>
            </div>
            
            {/* Status Messages */}
            {(errorMessage || successMessage) && (
                <div className={`mb-8 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 border ${errorMessage ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100' : 'bg-emerald-100'}`}>
                        {errorMessage ? <X size={18} /> : <CheckCircle size={18} />}
                    </div>
                    <div>
                        <p className="font-black text-sm uppercase tracking-tight leading-none mb-1">{errorMessage ? 'Error' : 'Success'}</p>
                        <p className="text-sm font-medium opacity-90">{errorMessage || successMessage}</p>
                    </div>
                    <button 
                        onClick={() => {setErrorMessage(''); setSuccessMessage('');}}
                        className="ml-auto p-2 hover:bg-black/5 rounded-xl transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}


            {/* Assignments Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden whitespace-nowrap overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignment Name</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Class</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deadline</th>
                            <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr>
                                <td colSpan="5" className="p-20 text-center">
                                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-gray-400 font-bold italic">Syncing assignments...</p>
                                </td>
                            </tr>
                        ) : assignments.length > 0 ? (
                            assignments.map(asgn => (
                                <tr key={asgn.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
                                                <Layout size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{asgn.title}</div>
                                                <div className="text-xs text-gray-400 font-medium max-w-xs truncate">{asgn.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1.5 bg-indigo-50/50 text-indigo-600 rounded-lg text-xs font-black uppercase tracking-tight">
                                            {classes.find(c => c.id === asgn.classId)?.name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${asgn.assignmentType === 'FILE' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {asgn.assignmentType || 'TEXT'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 font-bold">
                                            <Calendar size={14} className="text-gray-400" />
                                            {asgn.dueDate || asgn.deadline ? new Date(asgn.dueDate || asgn.deadline).toLocaleDateString() : 'No date'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button 
                                                onClick={() => handleEditClick(asgn)}
                                                className="p-2.5 text-gray-400 hover:bg-white hover:text-indigo-600 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-100"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ isOpen: true, assignmentId: asgn.id })}
                                                className="p-2.5 text-gray-400 hover:bg-white hover:text-red-600 rounded-xl transition-all shadow-sm border border-transparent hover:border-gray-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="p-20 text-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BookOpen size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-gray-400 font-bold italic">No assignments found. Start by creating one!</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <CreateAssignmentModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingAssignment(null); }}
                onSubmit={handleCreateOrUpdate}
                isSubmitting={isLoading}
                initialData={editingAssignment}
            />

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, assignmentId: null })}
                onConfirm={handleDelete}
                title="Delete Assignment"
                message="Are you sure you want to delete this assignment? This will permanently remove all student submissions and cannot be undone."
                confirmText="Delete"
            />
        </div>
    );
};

export default AssignmentsDashboard;


