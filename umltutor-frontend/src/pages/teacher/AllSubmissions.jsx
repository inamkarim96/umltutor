import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { fetchAllSubmissionsForTeacher, selectSubmissions, selectSubmissionLoading } from '../../features/submissions';
import { selectAllAssignments } from '../../features/assignments';
import { useNavigate } from 'react-router-dom';
import { 
    Inbox, 
    BookOpen, 
    Clock, 
    CheckCircle, 
    ChevronRight, 
    Search,
    Filter,
    Clock3,
    GraduationCap,
    Layout,
    ArrowUpRight
} from 'lucide-react';

const AllSubmissions = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const submissionsArr = useAppSelector(selectSubmissions) || [];
    const assignments = useAppSelector(selectAllAssignments) || [];
    const isLoading = useAppSelector(selectSubmissionLoading);
    const [searchTerm, setSearchTerm] = useState('');

    const submissions = [...submissionsArr]
        .sort((a, b) => {
            const dateA = a?.submittedAt ? new Date(a.submittedAt) : 0;
            const dateB = b?.submittedAt ? new Date(b.submittedAt) : 0;
            return dateB - dateA;
        });

    useEffect(() => {
        dispatch(fetchAllSubmissionsForTeacher());
    }, [dispatch]);

    const handleNavigate = (sub) => {
        const assignmentTitle = assignments.find(a => a.id === sub.assignmentId)?.title || sub.assignmentTitle || 'Standard Task';
        const studentName = sub.studentName || (sub.studentEmail ? sub.studentEmail.split('@')[0] : 'Unknown Student');
        const aSlug = assignmentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'assignment';
        const sSlug = studentName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'student';
        navigate(`/teacher/submissions/${aSlug}/${sSlug}/${sub.id}`);
    };

    const filteredSubmissions = submissions.filter(sub => {
        if (!sub || sub.status?.toLowerCase() === 'draft') return false;
        const studentName = sub.studentName?.toLowerCase() || '';
        const assignmentTitle = (assignments.find(a => a.id === sub.assignmentId)?.title || sub.assignmentTitle || '').toLowerCase();
        return studentName.includes(searchTerm.toLowerCase()) || assignmentTitle.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-transparent p-10">
            <div>
                <div className="flex flex-wrap justify-between items-end gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-accent text-white rounded-lg flex items-center justify-center shadow-hover shadow-accent/20">
                                <Inbox size={24} />
                            </div>
                            <h1 className="text-4xl font-extrabold font-heading text-ink tracking-tight">Recent Submissions</h1>
                        </div>
                        <p className="text-muted font-medium text-lg">Real-time overview of student activity across all classrooms.</p>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-black/5 shadow-card overflow-hidden border-t-4 border-t-indigo-500">
                    <div className="p-8 border-b border-gray-50 flex flex-wrap gap-4 justify-between items-center bg-surface-3/10">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by student or assignment..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold font-body text-ink shadow-inner"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button className="px-6 py-4 bg-white border border-black/5 text-muted rounded-lg text-sm font-extrabold font-heading shadow-card hover:bg-surface-3 transition-all flex items-center gap-2">
                                <Filter size={18} /> Review Status
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-3/50">
                                    <th className="px-8 py-5 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em]">Contributor</th>
                                    <th className="px-8 py-5 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em]">Assignment Context</th>
                                    <th className="px-8 py-5 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em]">Submission Time</th>
                                    <th className="px-8 py-5 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em]">Review State</th>
                                    <th className="px-8 py-5 text-[10px] font-extrabold font-heading text-gray-400 uppercase tracking-[0.2em] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading && submissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-24 text-center">
                                            <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                                            <p className="text-gray-400 font-extrabold font-heading italic uppercase tracking-widest text-xs">Fetching submission queue...</p>
                                        </td>
                                    </tr>
                                ) : filteredSubmissions.length > 0 ? (
                                    filteredSubmissions.map(sub => (
                                        <tr key={sub.id} className="hover:bg-accent/10/30 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-accent/10 text-accent rounded-lg flex items-center justify-center font-extrabold font-heading text-sm shadow-card group-hover:bg-white transition-colors">
                                                        {(sub.studentName || 'S').charAt(0)}
                                                    </div>
                                                    <div className="font-extrabold font-heading text-ink">
                                                        {sub.studentName || (sub.studentEmail ? sub.studentEmail.split('@')[0] : 'Unknown Student')}
                                                        {sub.isUpdated && (
                                                            <span className="ml-3 inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-extrabold font-heading uppercase tracking-widest border bg-purple-50 text-purple-700 border-purple-100">
                                                                Updated
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <div className="font-bold font-body text-gray-700 flex items-center gap-1.5">
                                                        <Layout size={14} className="text-gray-400" />
                                                        {assignments.find(a => a.id === sub.assignmentId)?.title || sub.assignmentTitle || 'Standard Task'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-muted font-medium whitespace-nowrap">
                                                    <Clock3 size={14} />
                                                    {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ' - '}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold font-heading uppercase tracking-widest border ${
                                                    sub.status === 'graded' 
                                                        ? 'bg-status-green/10 text-status-green border-emerald-100' 
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                                }`}>
                                                    {sub.status === 'graded' ? <CheckCircle size={10} /> : <Clock size={10} />}
                                                    {sub.status || 'Awaiting Review'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button 
                                                    disabled={!sub.id}
                                                    onClick={() => handleNavigate(sub)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-black/5 text-accent rounded-xl text-xs font-extrabold font-heading shadow-card hover:bg-accent hover:text-white transition-all group/btn"
                                                >
                                                    Evaluation <ArrowUpRight size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-32 text-center">
                                            <div className="w-20 h-20 bg-surface-3 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <Inbox size={32} className="text-gray-200" />
                                            </div>
                                            <h3 className="text-xl font-extrabold font-heading text-ink mb-1">Queue is empty</h3>
                                            <p className="text-gray-400 font-bold font-body italic">No submissions match your current filters.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default AllSubmissions;

