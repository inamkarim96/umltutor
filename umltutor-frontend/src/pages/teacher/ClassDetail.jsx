import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import {
    fetchClasses,
    selectClasses,
    selectClassroomLoading
} from '../../features/classroom';
import { selectUser } from '../../features/auth';
import {
    createAssignment,
    updateAssignment,
    fetchAllAssignments,
    selectAllAssignments as selectAssignmentsFromSlice
} from '../../features/assignments';
import {
    ArrowLeft,
    Shield,
    Users,
    BookOpen,
    GraduationCap,
    Plus,
    Mail,
    UserCheck,
    Trash2,
    X,
    CheckCircle
} from 'lucide-react';
import StudentEnrollment from '../../features/teacher/components/StudentEnrollment';
import CreateAssignmentModal from '../../features/teacher/components/CreateAssignmentModal';
import AssignmentList from '../../features/teacher/components/AssignmentList';
import AnnouncementBoard from '../../features/teacher/components/AnnouncementBoard';
import FileBrowser from '../../features/teacher/components/FileBrowser';
import ClassSettingsPanel from '../../features/teacher/components/ClassSettingsPanel';
import ConfirmModal from '../../components/shared/ConfirmModal';
import { getEnrolledStudentsLogic, removeStudentLogic } from '../../features/teacher/teacherLogic';
import {
    MessageSquare,

    Settings as SettingsIcon,
    FolderOpen,

} from 'lucide-react';

const ClassDetail = () => {
    // NOTE: The app uses a custom router (manual pushState + matchPath) with no <Route>
    // components, so useParams() always returns {} here. Parse from the URL directly.
    const className = window.location.pathname
        .split('/')
        .find((segment, i, arr) => arr[i - 1] === 'classes' && segment.length > 0);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const classes = useAppSelector(selectClasses);
    const assignmentsMap = useAppSelector(selectAssignmentsFromSlice);
    const isLoading = useAppSelector(selectClassroomLoading);
    const user = useAppSelector(selectUser);

    const targetClass = className
        ? classes.find(c =>
              c.name?.toLowerCase().replace(/\s+/g, '-') === className.toLowerCase()
          )
        : undefined;
    const classId = targetClass?.id;
    const classAssignments = classId ? assignmentsMap.filter(a => a.classId === classId) : [];
    const [enrolledStudents, setEnrolledStudents] = useState([]);
    const [showEnrollment, setShowEnrollment] = useState(false);
    const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, studentId: null });
    const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'files', 'assignments', 'students', 'settings'

    // Update document title with class name
    useEffect(() => {
        if (targetClass?.name) {
            document.title = `${targetClass.name} - Class Details | UML Tutor`;
        } else {
            document.title = 'Class Details | UML Tutor';
        }

        // Cleanup function to reset title when component unmounts
        return () => {
            document.title = 'UML Tutor';
        };
    }, [targetClass?.name]);

    useEffect(() => {
        if (classes.length === 0) dispatch(fetchClasses());
        if (classId) dispatch(fetchAllAssignments('TEACHER'));
    }, [dispatch, classes.length, classId]);

    // Fetch enrolled students when class is available
    useEffect(() => {
        if (targetClass) {
            fetchEnrolledStudents();
        }
    }, [targetClass]);

    const fetchEnrolledStudents = async () => {
        const students = await getEnrolledStudentsLogic(classId, targetClass?.studentIds);
        setEnrolledStudents(students);
    };

    const handleEnrollmentSuccess = () => {
        fetchEnrolledStudents();
        setShowEnrollment(false);
        dispatch(fetchClasses());
    };

    const handleRemoveStudent = async () => {
        const studentId = confirmDelete.studentId;
        if (!studentId) return;

        try {
            setErrorMessage('');
            await removeStudentLogic(classId, studentId);
            setSuccessMessage('Student removed successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchEnrolledStudents();
        } catch (error) {
            console.error('Error removing student:', error);
            setErrorMessage(error.response?.data?.error?.message || error.message || 'Failed to remove student');
        }
    };


    const handleCreateOrUpdateAssignment = async (data) => {
        setIsSubmittingAssignment(true);
        try {
            setErrorMessage('');
            let resultAction;

            if (editingAssignment) {
                resultAction = await dispatch(updateAssignment({ id: editingAssignment.id, data }));
            } else {
                resultAction = await dispatch(createAssignment({ classId: classId, data }));
            }

            if (createAssignment.fulfilled.match(resultAction) || (updateAssignment && updateAssignment.fulfilled && updateAssignment.fulfilled.match(resultAction))) {
                setIsCreateAssignmentOpen(false);
                setEditingAssignment(null);
                setSuccessMessage(editingAssignment
                    ? 'Assignment updated successfully!'
                    : 'Assignment has been created successfully. If you want to make changes, you can edit the assignment anytime.'
                );
                setTimeout(() => setSuccessMessage(''), 8000);
                dispatch(fetchAllAssignments('TEACHER'));
            } else {
                setErrorMessage(resultAction.payload || `Failed to ${editingAssignment ? 'update' : 'create'} assignment`);
            }
        } catch (error) {
            console.error('Error handling assignment operation:', error);
            setErrorMessage(error.message || 'An unexpected error occurred');
        } finally {
            setIsSubmittingAssignment(false);
        }
    };

    const handleEditAssignment = (asgn) => {
        setEditingAssignment({
            ...asgn,
            deadline: asgn.dueDate || asgn.deadline
        });
        setIsCreateAssignmentOpen(true);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-accent border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-400 font-extrabold font-heading italic uppercase tracking-widest text-xs">Synchronizing classroom data...</p>
            </div>
        );
    }

    if (!targetClass) {
        return (
            <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-status-red/10 text-status-red rounded-full flex items-center justify-center mb-6">
                    <X size={32} />
                </div>
                <h2 className="text-3xl font-extrabold font-heading text-ink mb-2">Classroom Disconnected</h2>
                <p className="text-muted mb-8 max-w-sm">We couldn't find the classroom details. It may have been deleted or the ID is incorrect.</p>
                <button
                    onClick={() => navigate('/teacher/dashboard')}
                    className="px-8 py-3 bg-white border border-black/10 text-gray-700 rounded-lg font-bold font-body shadow-card hover:bg-surface-3 transition-all"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent p-4 md:p-8">
            <div>
                <button
                    onClick={() => navigate('/teacher/dashboard')}
                    className="mb-10 text-muted font-extrabold text-sm hover:text-accent transition-all flex items-center gap-2 group"
                >
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-card border border-black/5 group-hover:bg-accent/10 group-hover:border-accent/10 transition-all">
                        <ArrowLeft size={16} />
                    </div>
                    Back to Dashboard
                </button>

                {(errorMessage || successMessage) && (
                    <div className={`mb-8 p-5 rounded-lg flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 border ${errorMessage ? 'bg-status-red/10 text-red-700 border-red-100' : 'bg-status-green/10 text-emerald-700 border-emerald-100'}`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${errorMessage ? 'bg-red-100' : 'bg-emerald-100'}`}>
                            {errorMessage ? <X size={20} /> : <CheckCircle size={20} />}
                        </div>
                        <div className="flex-1">
                            <p className="font-extrabold font-heading text-sm uppercase tracking-tight">{errorMessage ? 'Action Failed' : 'Success'}</p>
                            <p className="text-sm font-medium opacity-90">{errorMessage || successMessage}</p>
                        </div>
                        <button
                            onClick={() => { setErrorMessage(''); setSuccessMessage(''); }}
                            className="p-2 hover:bg-black/5 rounded-xl transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-lg md:rounded-lg p-6 md:p-12 border border-black/5 shadow-card mb-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10/30 rounded-full -translate-y-1/2 translate-x-1/2 -z-0"></div>
                    <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between items-start">
                        <div className="w-full md:flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-accent text-white rounded-lg flex items-center justify-center shadow-hover shadow-accent/20">
                                    <GraduationCap size={24} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="px-3 py-1 bg-accent/10 text-accent text-[10px] font-extrabold font-heading rounded-lg uppercase tracking-widest w-fit">
                                        {targetClass.code}
                                    </span>
                                    {targetClass.archived && (
                                        <span className="mt-1 px-2 py-0.5 bg-amber-100 text-amber-600 text-[9px] font-extrabold font-heading rounded uppercase tracking-tighter w-fit flex items-center gap-1">
                                            <Shield size={10} /> ARCHIVED
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h1 className="text-5xl font-extrabold font-heading text-ink tracking-tight mb-4">{targetClass.name}</h1>
                            <p className="text-muted text-xl font-medium leading-relaxed max-w-3xl">{targetClass.description}</p>
                        </div>
                        <div className="w-full md:w-auto bg-[#f1f5f9] px-6 py-6 rounded-3xl border border-white shadow-inner flex flex-col items-center">
                            <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-3">Quick Overview</p>
                            <div className="text-center space-y-3">
                                <div>
                                    <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Access Code</p>
                                    <p className="text-2xl font-extrabold font-heading text-accent font-mono tracking-tighter">{targetClass.code}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${targetClass.isEnrollmentOpen ? 'bg-status-green/100 animate-pulse' : 'bg-status-red/100'}`}></div>
                                        <p className="text-xs font-bold font-body text-gray-700">{targetClass.isEnrollmentOpen ? 'Open for Joining' : 'Joining Locked'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation — Full-width sticky navbar */}
            </div>
            <div className="w-full bg-white border-y border-black/5 flex overflow-x-auto no-scrollbar sticky top-0 z-20 shadow-card shadow-gray-50/50">
                <div className="flex items-center gap-12 px-8 md:px-12">
                    {[
                        { id: 'posts', label: 'Post', icon: MessageSquare },
                        { id: 'files', label: 'File', icon: FolderOpen },
                        { id: 'assignments', label: 'Assignment', icon: BookOpen },
                        { id: 'students', label: 'Student', icon: Users },
                        { id: 'settings', label: 'Settings', icon: SettingsIcon },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-6 relative font-extrabold font-heading text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap group ${activeTab === tab.id
                                ? 'text-accent'
                                : 'text-gray-400 hover:text-muted'
                                }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`}>
                                    <tab.icon size={18} />
                                </span>
                                {tab.label}
                            </div>
                            {activeTab === tab.id ? (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-accent rounded-t-full shadow-[0_-4px_12px_rgba(79,70,229,0.3)]" />
                            ) : (
                                <div className="absolute bottom-0 left-0 w-0 group-hover:w-full h-0.5 bg-gray-200 transition-all duration-300" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
            <div className="min-h-screen bg-transparent p-8 md:p-12">
                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'posts' && (
                        <AnnouncementBoard classId={classId} />
                    )}

                    {activeTab === 'files' && (
                        <FileBrowser classId={classId} />
                    )}

                    {activeTab === 'assignments' && (
                        <div className="bg-white rounded-lg md:rounded-lg border border-black/5 shadow-card p-6 md:p-10 flex flex-col">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 w-full">
                                <h2 className="text-2xl font-extrabold font-heading text-ink flex items-center gap-3">
                                    <BookOpen size={24} className="text-accent" /> Assignments
                                    <span className="ml-2 px-3 py-1 bg-surface-3 text-muted text-xs rounded-full">{classAssignments.length}</span>
                                </h2>
                                <button
                                    disabled={targetClass.archived}
                                    onClick={() => { setEditingAssignment(null); setIsCreateAssignmentOpen(true); }}
                                    className="w-full sm:w-auto justify-center px-5 py-2 bg-accent/10 text-accent rounded-xl font-extrabold font-heading text-sm hover:bg-accent hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Plus size={16} /> New
                                </button>
                            </div>
                            <AssignmentList assignments={classAssignments} onEdit={handleEditAssignment} />
                        </div>
                    )}

                    {activeTab === 'students' && (
                        <div className="bg-white rounded-lg md:rounded-lg border border-black/5 shadow-card p-6 md:p-10 flex flex-col">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 w-full">
                                <h2 className="text-2xl font-extrabold font-heading text-ink flex items-center gap-3">
                                    <Users size={24} className="text-accent" /> Enrolled Students
                                    <span className="ml-2 px-3 py-1 bg-surface-3 text-muted text-xs rounded-full">{enrolledStudents.length}</span>
                                </h2>
                                <button
                                    disabled={targetClass.archived}
                                    onClick={() => setShowEnrollment(!showEnrollment)}
                                    className="w-full sm:w-auto justify-center px-4 py-2 bg-accent text-white rounded-xl font-extrabold font-heading text-sm hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Plus size={16} /> {showEnrollment ? 'Cancel' : 'Add Students'}
                                </button>
                            </div>

                            {showEnrollment && (
                                <div className="mb-8 p-6 bg-surface-3 rounded-lg border border-black/10">
                                    <StudentEnrollment
                                        classId={classId}
                                        enrolledStudents={enrolledStudents}
                                        onEnrollmentSuccess={handleEnrollmentSuccess}
                                    />
                                </div>
                            )}

                            <div className="space-y-3">
                                {enrolledStudents.length > 0 ? (
                                    enrolledStudents.map((student) => (
                                        <div key={student.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-surface-3 rounded-lg hover:bg-surface-3 transition-colors gap-4 sm:gap-0">
                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="w-12 h-12 bg-accent/10 text-accent rounded-lg flex items-center justify-center font-extrabold font-heading text-lg">
                                                    {student.firstName?.charAt(0) || student.email?.charAt(0) || 'S'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-ink">
                                                        {student.firstName} {student.lastName}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-sm text-muted">
                                                        <Mail size={14} />
                                                        {student.email}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 mt-2 sm:mt-0 border-black/10">
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <UserCheck size={14} />
                                                    Enrolled
                                                </div>
                                                <button
                                                    disabled={targetClass.archived}
                                                    onClick={() => setConfirmDelete({ isOpen: true, studentId: student.id })}
                                                    className="p-2 text-gray-400 hover:text-status-red hover:bg-status-red/10 rounded-lg transition-colors disabled:opacity-20"
                                                    title="Remove Student"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-surface-3 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Users size={24} className="text-gray-300" />
                                        </div>
                                        <p className="text-gray-400 font-bold font-body italic">No students enrolled yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <ClassSettingsPanel
                            classroom={targetClass}
                            onUpdate={() => dispatch(fetchClasses())}
                        />
                    )}
                </div>
            </div>

            <CreateAssignmentModal
                isOpen={isCreateAssignmentOpen}
                onClose={() => { setIsCreateAssignmentOpen(false); setEditingAssignment(null); }}
                onSubmit={handleCreateOrUpdateAssignment}
                isSubmitting={isSubmittingAssignment}
                initialData={editingAssignment}
            />

            <ConfirmModal
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, studentId: null })}
                onConfirm={handleRemoveStudent}
                title="Remove Student"
                message="Are you sure you want to remove this student from the classroom? They will lose access to all work associated with this class."
                confirmText="Remove"
            />
        </div>
    );
};

export default ClassDetail;





