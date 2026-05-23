import React, { useState, useEffect } from 'react';
import { 
    File, 
    Folder, 
    Upload, 
    MoreVertical, 
    Download, 
    Trash2, 
    Plus,
    Search,
    ChevronRight,
    FileText,
    Image as ImageIcon,
    FileArchive,
    Grid,
    List as ListIcon,
    RefreshCw,
    X,
    HardDrive
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { 
    fetchResources, 
    uploadResource, 
    deleteResource,
    selectResources 
} from '../../classroom/classroomSlice';

import { selectUser } from '../../auth';
import ConfirmModal from '../../../components/shared/ConfirmModal';

const FileBrowser = ({ classId, allowStudentUploads = false }) => {
    const dispatch = useAppDispatch();
    const resources = useAppSelector(state => selectResources(state, classId));
    const user = useAppSelector(selectUser);
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [searchTerm, setSearchTerm] = useState('');
    const [currentFolder, setCurrentFolder] = useState(null); // null means root
    const [isUploading, setIsUploading] = useState(false);
    const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [error, setError] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const isTeacher = user?.role?.toUpperCase() === 'TEACHER';
    const canUpload = isTeacher || allowStudentUploads;

    useEffect(() => {
        dispatch(fetchResources(classId));
    }, [dispatch, classId]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setError(null);
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolder) formData.append('folder', currentFolder);

        try {
            await dispatch(uploadResource({ classId, data: formData })).unwrap();
        } catch (err) {
            // Correctly handle the unwrapped error which could be a string or object
            const errorMsg = typeof err === 'string' ? err : err.message || 'Failed to upload resource';
            setError(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Resource',
            message: 'Are you sure you want to delete this resource permanently? This action cannot be undone.',
            onConfirm: async () => {
                setError(null);
                try {
                    await dispatch(deleteResource(id)).unwrap();
                } catch (err) {
                    setError(err.message || 'Failed to delete');
                }
            }
        });
    };

    // Filter resources based on current folder and search
    const filteredResources = resources.filter(res => {
        const matchesSearch = res.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFolder = res.folder === currentFolder;
        return matchesSearch && matchesFolder;
    });

    // Extract unique folders in the current view (if any records have subfolders)
    // For this simple implementation, we'll just use a flat "folder" attribute on resources
    const allFolders = Array.from(new Set(resources.map(r => r.folder).filter(f => f !== null)));

    const getFileIcon = (type) => {
        if (type?.includes('pdf')) return <FileText className="text-status-red" size={viewMode === 'list' ? 20 : 40} />;
        if (type?.includes('image')) return <ImageIcon className="text-blue-500" size={viewMode === 'list' ? 20 : 40} />;
        if (type?.includes('text')) return <FileText className="text-emerald-500" size={viewMode === 'list' ? 20 : 40} />;
        if (type?.includes('zip') || type?.includes('rar')) return <FileArchive className="text-amber-500" size={viewMode === 'list' ? 20 : 40} />;
        return <File className="text-gray-400" size={viewMode === 'list' ? 20 : 40} />;
    };

    return (
        <div className="w-full mx-auto py-8 px-4">
            <div className="bg-white rounded-lg border border-black/5 shadow-card overflow-hidden min-h-[600px] flex flex-col">
                {/* Toolbar */}
                <div className="p-6 border-b border-gray-50 bg-surface-3/30 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-[300px]">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search files and resources..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-black/5 rounded-lg focus:ring-2 focus:ring-indigo-600/10 focus:border-accent outline-none transition-all font-medium text-sm"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="bg-white border border-black/5 rounded-xl p-1 flex mr-2">
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:bg-surface-3'}`}
                            >
                                <ListIcon size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-accent/10 text-accent' : 'text-gray-400 hover:bg-surface-3'}`}
                            >
                                <Grid size={18} />
                            </button>
                        </div>
                        
                        {canUpload && (
                            <label className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-extrabold font-heading text-xs hover:bg-indigo-700 transition-all cursor-pointer shadow-hover shadow-accent/20 active:scale-95">
                                <Upload size={16} /> 
                                {isUploading ? 'UPLOADING...' : 'UPLOAD FILE'}
                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                            </label>
                        )}
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mx-6 mt-6 p-4 bg-status-red/10 border border-red-100 rounded-lg flex items-center justify-between group animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-red-100 text-status-red rounded-lg flex items-center justify-center">
                                <X size={16} />
                            </div>
                            <p className="text-sm font-bold font-body text-red-700">{error}</p>
                        </div>
                        <button 
                            onClick={() => setError(null)}
                            className="p-1 hover:bg-black/5 rounded-lg transition-all"
                        >
                            <X size={14} className="text-red-400" />
                        </button>
                    </div>
                )}

                {/* Breadcrumbs / Folder Nav */}
                <div className="px-8 py-4 border-b border-gray-50 bg-white flex items-center gap-2 text-sm text-gray-400 font-bold font-body">
                    <button 
                        onClick={() => setCurrentFolder(null)}
                        className={`hover:text-accent transition-colors ${!currentFolder ? 'text-accent' : ''}`}
                    >
                        Classes
                    </button>
                    <ChevronRight size={14} />
                    <span className="text-ink">{currentFolder || 'Root Directory'}</span>
                    
                    {!currentFolder && isTeacher && (
                        <button 
                            onClick={() => setIsCreateFolderOpen(true)}
                            className="ml-auto text-accent hover:bg-accent/10 px-3 py-1 rounded-lg transition-all flex items-center gap-1 text-[10px] uppercase tracking-widest font-extrabold font-heading"
                        >
                            <Plus size={12} /> New Folder
                        </button>
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 p-8">
                    {/* Create Folder Modal Overlay */}
                    {isCreateFolderOpen && (
                        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-3xl shadow-hover p-6 w-full max-w-sm animate-in zoom-in duration-200">
                                <h3 className="text-lg font-extrabold font-heading text-ink mb-4">Create New Folder</h3>
                                <input 
                                    autoFocus
                                    type="text"
                                    value={newFolderName}
                                    onChange={e => setNewFolderName(e.target.value)}
                                    placeholder="Enter folder name..."
                                    className="w-full px-4 py-3 bg-surface-3 border border-black/5 rounded-xl focus:ring-2 focus:ring-indigo-600/10 mb-6 outline-none font-bold font-body"
                                />
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setIsCreateFolderOpen(false)}
                                        className="flex-1 py-3 bg-surface-3 text-muted rounded-xl font-extrabold font-heading text-xs hover:bg-surface-3 transition-all"
                                    >
                                        CANCEL
                                    </button>
                                    <button 
                                        onClick={() => { setCurrentFolder(newFolderName); setNewFolderName(''); setIsCreateFolderOpen(false); }}
                                        className="flex-1 py-3 bg-accent text-white rounded-xl font-extrabold font-heading text-xs hover:bg-indigo-700 transition-all shadow-hover shadow-accent/20"
                                    >
                                        CREATE
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* View: Folder List (only in Root) */}
                    {!currentFolder && allFolders.length > 0 && !searchTerm && (
                        <div className="mb-10">
                            <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em] mb-4">Folders</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {allFolders.map(folder => (
                                    <button 
                                        key={folder}
                                        onClick={() => setCurrentFolder(folder)}
                                        className="group flex flex-col items-center gap-3 p-4 rounded-3xl hover:bg-accent/10/50 border border-transparent hover:border-accent/10 transition-all"
                                    >
                                        <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-card">
                                            <Folder size={32} fill="currentColor" fillOpacity={0.2} />
                                        </div>
                                        <span className="font-bold font-body text-sm text-gray-700 group-hover:text-accent transition-colors text-center truncate w-full">{folder}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* View: File Grid/List */}
                    <div>
                        <p className="text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em] mb-4">{currentFolder ? 'Files in ' + currentFolder : 'Root Files'}</p>
                        
                        {filteredResources.length === 0 ? (
                            <div className="text-center py-20 bg-surface-3/50 rounded-lg border-2 border-dashed border-black/10">
                                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-card">
                                    <HardDrive size={32} className="text-gray-200" />
                                </div>
                                <p className="text-gray-400 font-bold font-body italic">No files found here.</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                {filteredResources.map(res => (
                                    <div key={res.id} className="group relative flex flex-col items-center gap-3 p-4 rounded-3xl hover:bg-accent/10/50 border border-transparent hover:border-accent/10 transition-all">
                                        <div className="w-16 h-16 bg-surface-3 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-card">
                                            {getFileIcon(res.type)}
                                        </div>
                                        <div className="w-full">
                                            <p className="font-bold font-body text-xs text-center text-gray-700 truncate mb-1">{res.name}</p>
                                            <p className="text-[9px] text-center text-gray-400 font-extrabold font-heading uppercase tracking-tight">{(res.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-1">
                                            <a href={res.url} target="_blank" rel="noreferrer" className="p-1.5 bg-white shadow-md rounded-lg text-accent hover:text-indigo-800">
                                                <Download size={14} />
                                            </a>
                                            {(isTeacher || user?.id === res.uploadedBy) && (
                                                <button onClick={() => handleDelete(res.id)} className="p-1.5 bg-white shadow-md rounded-lg text-status-red hover:text-red-700">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredResources.map(res => (
                                    <div key={res.id} className="flex items-center justify-between p-4 bg-white border border-gray-50 hover:border-accent/10 rounded-lg hover:shadow-card transition-all group">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="p-2 bg-surface-3 rounded-xl group-hover:bg-accent/10 transition-colors">
                                                {getFileIcon(res.type)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold font-body text-ink text-sm truncate">{res.name}</p>
                                                <div className="flex items-center gap-3 mt-0.5">
                                                    <span className="text-[10px] text-gray-400 font-extrabold font-heading uppercase tracking-tight">{(res.size / 1024).toFixed(1)} KB</span>
                                                    <span className="text-[10px] text-gray-400 font-extrabold font-heading uppercase">•</span>
                                                    <span className="text-[10px] text-gray-400 font-extrabold font-heading uppercase tracking-tight">{new Date(res.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a 
                                                href={res.url} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-2.5 text-accent hover:bg-accent/10 rounded-xl transition-all"
                                                title="Download"
                                            >
                                                <Download size={18} />
                                            </a>
                                            {(isTeacher || user?.id === res.uploadedBy) && (
                                                <button 
                                                    onClick={() => handleDelete(res.id)}
                                                    className="p-2.5 text-gray-400 hover:text-status-red hover:bg-status-red/10 rounded-xl transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
            />
        </div>
    );
};

export default FileBrowser;
