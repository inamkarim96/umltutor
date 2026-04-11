import React, { useState } from 'react';
import { 
    Settings, 
    Shield, 
    UserPlus, 
    Trash2, 
    RefreshCw, 
    Save,
    Lock,
    Unlock,
    Users,
    Info,
    CheckCircle
} from 'lucide-react';
import { useAppDispatch } from '../../../app/hooks';
import { updateClass, regenerateCode } from '../../classroom/classroomSlice';
import ConfirmModal from '../../../components/shared/ConfirmModal';

const ClassSettingsPanel = ({ classroom, onUpdate }) => {
    const dispatch = useAppDispatch();
    const [name, setName] = useState(classroom.name);
    const [description, setDescription] = useState(classroom.description || '');
    const [maxStudents, setMaxStudents] = useState(classroom.maxStudents || '');
    const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(classroom.isEnrollmentOpen ?? true);
    const [allowStudentUploads, setAllowStudentUploads] = useState(classroom.allowStudentUploads ?? false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [status, setStatus] = useState(null);
    const [confirmModal, setConfirmModal] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: () => {} 
    });

    const handleSave = async (e) => {
        e.preventDefault();
        setIsUpdating(true);
        setStatus(null);
        try {
            await dispatch(updateClass({ 
                classId: classroom.id, 
                data: { 
                    name, 
                    description, 
                    maxStudents: maxStudents === '' ? null : maxStudents, 
                    isEnrollmentOpen,
                    allowStudentUploads
                } 
            })).unwrap();
            setStatus({ type: 'success', message: 'Settings updated successfully!' });
            if (onUpdate) onUpdate();
        } catch (err) {
            setStatus({ type: 'error', message: err.message || 'Failed to update settings' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRegenerateCode = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Regenerate Code',
            message: 'Are you sure? The old join code will stop working immediately and students will need the new one to join.',
            onConfirm: async () => {
                try {
                    await dispatch(regenerateCode(classroom.id)).unwrap();
                    if (onUpdate) onUpdate();
                } catch (err) {
                    alert(err.message || 'Failed to regenerate code');
                }
            }
        });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto py-8">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Settings size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Classroom Settings</h2>
                        <p className="text-sm text-gray-400 font-medium">Manage your classroom identity and enrollment controls.</p>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Classroom Name</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student Limit (Null = Unlimited)</label>
                            <div className="relative">
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                <input 
                                    type="number"
                                    value={maxStudents}
                                    onChange={e => setMaxStudents(e.target.value)}
                                    placeholder="e.g. 30"
                                    className="w-full pl-12 pr-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                        <textarea 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 outline-none transition-all font-medium resize-none"
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6 pt-4 border-t border-gray-50 mt-4">
                        <div className="flex-1 flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div>
                                <p className="font-bold text-gray-900 text-sm">Enrollment Status</p>
                                <p className="text-[10px] text-gray-400 font-medium">Toggle if new students can join using the code.</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setIsEnrollmentOpen(!isEnrollmentOpen)}
                                className={`w-14 h-7 rounded-full transition-all relative ${isEnrollmentOpen ? 'bg-indigo-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${isEnrollmentOpen ? 'left-8' : 'left-1'}`}></div>
                            </button>
                        </div>

                        <div className="flex-1 flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div>
                                <p className="font-bold text-gray-900 text-sm">Student Resource Uploads</p>
                                <p className="text-[10px] text-gray-400 font-medium">Allow students to upload files to the classroom.</p>
                            </div>
                            <button 
                                type="button"
                                onClick={() => setAllowStudentUploads(!allowStudentUploads)}
                                className={`w-14 h-7 rounded-full transition-all relative ${allowStudentUploads ? 'bg-indigo-600' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${allowStudentUploads ? 'left-8' : 'left-1'}`}></div>
                            </button>
                        </div>
                    </div>

                    {status && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 animate-in fade-in zoom-in duration-300 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {status.type === 'success' ? <CheckCircle size={18} /> : <Info size={18} />}
                            <p className="text-xs font-bold">{status.message}</p>
                        </div>
                    )}

                    <div className="pt-4">
                        <button 
                            type="submit"
                            disabled={isUpdating}
                            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isUpdating ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                            SAVE CHANGES
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden p-8 border-l-4">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Shield className="text-amber-500" size={20} />
                            <h3 className="text-lg font-black text-gray-900">Access Control</h3>
                        </div>
                        <p className="text-sm text-gray-500 font-medium max-w-md">Your current join code is <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{classroom.code}</span>. Regenerating it will invalidate the current one immediately.</p>
                    </div>
                    <button 
                        onClick={handleRegenerateCode}
                        className="flex items-center gap-2 px-5 py-3 bg-amber-50 text-amber-600 rounded-xl font-black text-xs hover:bg-amber-100 transition-all active:scale-95"
                    >
                        <RefreshCw size={14} /> REGENERATE CODE
                    </button>
                </div>
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="warning"
                confirmText="Regenerate"
            />
        </div>
    );
};

export default ClassSettingsPanel;
