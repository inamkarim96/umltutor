import React, { useState, useEffect, useMemo } from 'react';
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
    Plus,
    Trash2,
    Edit,
    X,
    CheckCircle,
    Layout,
    Clock
} from 'lucide-react';
import ConfirmModal from '../../components/shared/ConfirmModal';
import CreateAssignmentModal from '../../features/teacher/components/CreateAssignmentModal';
import PageShell from '../../components/dashboard/PageShell';

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

    const classMap = useMemo(() => {
        const map = {};
        classes.forEach(c => { map[c.id] = c; });
        return map;
    }, [classes]);

    return (
        <PageShell
            title="Assignments Management"
            subtitle="Create, manage, and track assignments across all your classes"
            icon={<Layout size={22} />}
            badge={assignments.length}
            breadcrumbs={[{ label: 'Assignments' }]}
            actions={
                <button className="apc-primary-btn" onClick={() => { setEditingAssignment(null); setIsModalOpen(true); }}>
                    <Plus size={16} />
                    <span>Create Assignment</span>
                </button>
            }
        >
            {(errorMessage || successMessage) && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 border ${errorMessage ? 'bg-status-red/10 text-red-700 border-red-100' : 'bg-status-green/10 text-emerald-700 border-emerald-100'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100' : 'bg-emerald-100'}`}>
                        {errorMessage ? <X size={18} /> : <CheckCircle size={18} />}
                    </div>
                    <div className="flex-1">
                        <p className="font-extrabold font-heading text-sm uppercase tracking-tight">{errorMessage ? 'Error' : 'Success'}</p>
                        <p className="text-sm font-medium opacity-90">{errorMessage || successMessage}</p>
                    </div>
                    <button
                        onClick={() => { setErrorMessage(''); setSuccessMessage(''); }}
                        className="p-1 hover:bg-black/5 rounded-lg"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="apc-grid">
                    <div className="apc-card" style={{ justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ margin: '0 auto 12px', width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <p style={{ color: '#64748b', margin: 0 }}>Syncing assignments...</p>
                    </div>
                </div>
            ) : assignments.length > 0 ? (
                <div className="apc-grid">
                    {assignments.map(asgn => {
                        const cls = classMap[asgn.classId];
                        const deadlineStr = asgn.dueDate || asgn.deadline
                            ? new Date(asgn.dueDate || asgn.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'No date';
                        return (
                            <div
                                key={asgn.id}
                                className="apc-card"
                            >
                                <div className="apc-card-body">
                                    <div className="apc-card-top">
                                        <span className={`apc-chip ${asgn.assignmentType === 'FILE' ? 'apc-chip-amber' : 'apc-chip-blue'}`}>
                                            {asgn.assignmentType || 'TEXT'}
                                        </span>
                                        {cls && (
                                            <span className="apc-class-tag">{cls.code || cls.name}</span>
                                        )}
                                    </div>

                                    <h3 className="apc-card-title">{asgn.title}</h3>
                                    {asgn.description && (
                                        <p className="apc-card-desc">{asgn.description}</p>
                                    )}

                                    <div className="apc-card-footer">
                                        <span className="apc-dl-chip apc-dl-normal">
                                            <Clock size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                            {deadlineStr}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEditClick(asgn)}
                                                className="p-2 text-gray-500 hover:text-accent hover:bg-accent/10 rounded-lg"
                                                title="Edit"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDelete({ isOpen: true, assignmentId: asgn.id })}
                                                className="p-2 text-gray-500 hover:text-status-red hover:bg-status-red/10 rounded-lg"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="apc-card-cta">
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: '#4f46e5', fontWeight: 700 }}>
                                        View Details
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="apc-empty">
                    <div className="apc-empty-icon">📄</div>
                    <h3>No Assignments Found</h3>
                    <p>Start by creating your first assignment.</p>
                </div>
            )}
        </PageShell>
    );
};

export default AssignmentsDashboard;


