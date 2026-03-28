import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks';
import { fetchStudents, selectStudents, selectClassroomLoading } from '../../features/classroom';
import { 
    Users, 
    Mail, 
    ShieldCheck, 
    Search,
    UserPlus,
    ChevronRight,
    Filter,
    MoreHorizontal,
    GraduationCap,
    ExternalLink
} from 'lucide-react';

const StudentsList = () => {
    const dispatch = useAppDispatch();
    const studentsMap = useAppSelector(selectStudents);
    const isLoading = useAppSelector(selectClassroomLoading);
    const students = Object.values(studentsMap);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        dispatch(fetchStudents());
    }, [dispatch]);

    const filteredStudents = students.filter(s => 
        (s.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         s.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         s.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] p-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap justify-between items-end gap-6 mb-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                                <Users size={24} />
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Student Directory</h1>
                        </div>
                        <p className="text-gray-500 font-medium text-lg">Central hub for managing and monitoring all enrolled students.</p>
                    </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden border-t-4 border-t-indigo-500">
                    <div className="p-8 border-b border-gray-50 flex flex-wrap gap-4 justify-between items-center bg-gray-50/10">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-gray-900 shadow-inner"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button className="px-6 py-4 bg-white border border-gray-100 text-gray-600 rounded-2xl text-sm font-black shadow-sm hover:bg-gray-50 transition-all flex items-center gap-2">
                                <Filter size={18} /> Filters
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Student Identity</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Primary Contact</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">System Status</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Engagement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading && students.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-24 text-center">
                                            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                                            <p className="text-gray-400 font-black italic uppercase tracking-widest text-xs">Pulling student records...</p>
                                        </td>
                                    </tr>
                                ) : filteredStudents.length > 0 ? (
                                    filteredStudents.map(student => (
                                        <tr key={student.id} className="hover:bg-indigo-50/30 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm group-hover:bg-white transition-colors">
                                                        {student.firstName?.charAt(0) || student.name?.charAt(0) || 'S'}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-gray-900 text-lg">{student.firstName} {student.lastName}</div>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">ID: {student.id.slice(-8)}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2 text-gray-700 font-bold">
                                                    <Mail size={16} className="text-gray-300" />
                                                    {student.email}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                        Enrolled
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button className="p-3 text-gray-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all hover:shadow-sm">
                                                    <ExternalLink size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-8 py-32 text-center">
                                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <GraduationCap size={32} className="text-gray-200" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 mb-1">No students found</h3>
                                            <p className="text-gray-400 font-bold italic">Try broadening your search or enroll new students in a class.</p>
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



export default StudentsList;

