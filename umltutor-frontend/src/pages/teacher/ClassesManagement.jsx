import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
    selectClasses,
    selectStudents,
    fetchClasses,
    createClass,
    removeStudentFromClass
} from '../../features/classroom';
import {
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
import PageShell from '../../components/dashboard/PageShell';

const ClassesManagement = () => {
    const navigate = useNavigate();
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
            setErrorMessage('Enrolment by direct search is currently being updated. Please use the class code to invite students.');
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
        <>
            <PageShell
                title="Classrooms"
                subtitle="Manage your academic spaces and student enrollments"
                icon={<GraduationCap size={22} />}
                badge={classes.length}
                breadcrumbs={[{ label: 'Classrooms' }]}
                actions={
                    <button className="apc-primary-btn" onClick={() => setIsCreateClassModalOpen(true)}>
                        <Plus size={16} />
                        <span>Create Class</span>
                    </button>
                }
            >
                {(errorMessage || successMessage) && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 border ${errorMessage ? 'bg-status-red/10 text-red-700 border-red-100' : 'bg-status-green/10 text-emerald-700 border-emerald-100'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100' : 'bg-emerald-100'}`}>
                            {errorMessage ? <Info size={18} /> : <CheckCircle size={18} />}
                        </div>
                        <div className="flex-1">
                            <p className="font-extrabold font-heading text-sm uppercase tracking-tight">{errorMessage ? 'Action Failed' : 'Success'}</p>
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

                {classes.length > 0 ? (
                    <div className="cls-grid">
                        {classes.map(c => (
                            <div
                                key={c.id}
                                className="cls-card"
                                onClick={() => navigate(`/teacher/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => { if (e.key === 'Enter') navigate(`/teacher/classes/${c.name.toLowerCase().replace(/\s+/g, '-')}`); }}
                            >
                                {/* Colour banner */}
                                <div className="cls-card-banner" style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}>
                                    <div className="cls-card-avatar">
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="cls-card-code">{c.code}</span>
                                </div>

                                <div className="cls-card-body">
                                    <h3 className="cls-card-name">{c.name}</h3>
                                    <p className="cls-card-desc">
                                        {c.description || "No description provided for this classroom yet. Update it in settings."}
                                    </p>

                                    <div className="cls-card-meta">
                                        <span className="cls-meta-tag">
                                            <GraduationCap size={12} /> {c.studentCount || 0} students
                                        </span>
                                        <span className="cls-meta-tag">
                                            <Shield size={12} /> {c.isEnrollmentOpen ? 'Open' : 'Closed'}
                                        </span>
                                    </div>

                                    <div className="cls-progress-wrap">
                                        <div className="cls-progress-header">
                                            <span className="cls-progress-label">Enrollment</span>
                                            <span className="cls-progress-pct">{c.studentCount || 0}</span>
                                        </div>
                                        <div className="cls-progress-track">
                                            <div
                                                className="cls-progress-fill"
                                                style={{ width: '100%', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                                            />
                                        </div>
                                        <span className="cls-progress-note">{c.totalAssignments || 0} assignments</span>
                                    </div>
                                </div>

                                <div className="cls-card-enter">
                                    Manage Classroom <ChevronRight size={14} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="apc-empty">
                        <div className="apc-empty-ring">
                            <Users size={40} style={{ color: '#94a3b8' }} />
                        </div>
                        <h3>No Classes Yet</h3>
                        <p>You haven't created any classes. Start by setting up a new space for your students to begin their UML journey.</p>
                        <button className="apc-empty-btn" onClick={() => setIsCreateClassModalOpen(true)}>
                            <Plus size={14} /> Create Your First Class
                        </button>
                    </div>
                )}
            </PageShell>

            {/* Create Class Modal */}
            {isCreateClassModalOpen && (
                <div className="sdb-modal-backdrop" onClick={() => setIsCreateClassModalOpen(false)}>
                    <div className="sdb-modal" onClick={e => e.stopPropagation()}>
                        <div className="sdb-modal-head">
                            <div>
                                <h2>New Classroom</h2>
                                <p>Enter details to create a new class space</p>
                            </div>
                            <button className="sdb-modal-close" onClick={() => setIsCreateClassModalOpen(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateClass} className="sdb-modal-body">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest px-1">Classroom Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newClassName}
                                    onChange={e => setNewClassName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-surface-3 border border-black/5 focus:ring-2 focus:ring-indigo-600/10 focus:border-accent outline-none font-bold font-body text-ink placeholder:text-gray-300"
                                    placeholder="e.g. Advanced Software Design"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest px-1">Description / Goals</label>
                                <textarea
                                    required
                                    value={newClassDesc}
                                    onChange={e => setNewClassDesc(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-surface-3 border border-black/5 focus:ring-2 focus:ring-indigo-600/10 focus:border-accent outline-none font-medium text-ink placeholder:text-gray-300 resize-none h-32"
                                    placeholder="What will students achieve here?"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateClassModalOpen(false)}
                                    className="flex-1 px-6 py-3 bg-surface-3 text-muted rounded-lg font-extrabold font-heading text-xs hover:bg-gray-200 uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-accent text-white rounded-lg font-extrabold font-heading text-xs uppercase tracking-widest hover:bg-indigo-700 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={16} /> Create Class
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, studentId: null })}
                onConfirm={handleRemoveStudent}
                title="Remove Student"
                message="Are you sure you want to remove this student from the classroom? They will lose access to all work associated with this class."
                confirmText="Remove"
            />
        </>
    );
};


export default ClassesManagement;