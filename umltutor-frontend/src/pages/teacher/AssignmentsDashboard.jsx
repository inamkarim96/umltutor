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
        <div className="min-h-screen bg-surface-3 p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold font-heading text-ink tracking-tight">Assignments Management</h1>
                    <p className="text-muted font-medium italic">Create, manage, and track assignments across all your classes.</p>
                </div>
                <button
                    onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-lg font-extrabold font-heading uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-accent/20"
                >
                    <Plus size={18} />
                    Create Assignment
                </button>
            </div>
            
            {/* Status Messages */}
            {(errorMessage || successMessage) && (
                <div className={`mb-8 p-4 rounded-lg flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 border ${errorMessage ? 'bg-status-red/10 text-red-700 border-red-100' : 'bg-status-green/10 text-emerald-700 border-emerald-100'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100' : 'bg-emerald-100'}`}>
                        {errorMessage ? <X size={18} /> : <CheckCircle size={18} />}
                    </div>
                    <div>
                        <p className="font-extrabold font-heading text-sm uppercase tracking-tight leading-none mb-1">{errorMessage ? 'Error' : 'Success'}</p>
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
            <div className="bg-white rounded-lg border border-black/5 shadow-card overflow-hidden whitespace-nowrap overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-3/30 border-b border-black/5">
                        <tr>
                            <th className="px-10 py-6 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">Assignment Info</th>
                            <th className="px-10 py-6 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">Classroom</th>
                            <th className="px-10 py-6 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">Format</th>
                            <th className="px-10 py-6 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest">Deadline</th>
                            <th className="px-10 py-6 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr>
                                <td colSpan="5" className="p-20 text-center">
                                    <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-gray-400 font-bold font-body italic">Syncing assignments...</p>
                                </td>
                            </tr>
                        ) : assignments.length > 0 ? (
                            assignments.map(asgn => (
                                <tr key={asgn.id} className="hover:bg-accent/10/30 transition-colors group">
                                    <td className="px-10 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-accent/10 text-accent rounded-lg flex items-center justify-center font-extrabold font-heading shadow-inner">
                                                <Layout size={20} />
                                            </div>
                                            <div>
                                                <div className="font-extrabold text-ink group-hover:text-accent transition-colors uppercase tracking-tight text-sm">{asgn.title}</div>
                                                <div className="text-xs text-gray-400 font-medium max-w-xs truncate">{asgn.description || 'No description provided.'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-5">
                                        <span className="px-4 py-2 bg-accent/10 text-accent rounded-xl text-[10px] font-extrabold font-heading uppercase tracking-widest border border-accent/10/50">
                                            {classes.find(c => c.id === asgn.classId)?.name || 'Unknown'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-5">
                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold font-heading uppercase tracking-widest ${asgn.assignmentType === 'FILE' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                            {asgn.assignmentType || 'TEXT'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-5">
                                        <div className="flex items-center gap-3 text-xs text-gray-700 font-bold font-body tabular-nums">
                                            <Calendar size={14} className="text-gray-300" />
                                            {asgn.dueDate || asgn.deadline ? new Date(asgn.dueDate || asgn.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'}
                                        </div>
                                    </td>
                                    <td className="px-10 py-5 text-right">
                                        <div className="flex justify-end gap-1">
                                            <button 
                                                onClick={() => handleEditClick(asgn)}
                                                className="p-2.5 text-gray-400 hover:bg-white hover:text-accent rounded-xl transition-all shadow-card border border-transparent hover:border-black/5"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ isOpen: true, assignmentId: asgn.id })}
                                                className="p-2.5 text-gray-400 hover:bg-white hover:text-status-red rounded-xl transition-all shadow-card border border-transparent hover:border-black/5"
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
                                    <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <BookOpen size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-gray-400 font-bold font-body italic">No assignments found. Start by creating one!</p>
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


