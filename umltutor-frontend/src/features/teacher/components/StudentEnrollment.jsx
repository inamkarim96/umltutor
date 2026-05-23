import React, { useState, useEffect, useRef } from 'react';
import { Search, Users, Plus, X, Check, AlertCircle } from 'lucide-react';
import { searchAvailableStudents, enrollStudentLogic } from '../teacherLogic';


const StudentEnrollment = ({ classId, enrolledStudents = [], onEnrollmentSuccess }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [enrollmentMessage, setEnrollmentMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success', 'error', 'info'
    
    // Search Ref for debouncing
    const searchTimeoutRef = useRef(null);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced search
    useEffect(() => {
        if (searchQuery.trim().length >= 2) {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(() => {
                searchStudents(searchQuery.trim());
            }, 300);
        } else {
            setSearchResults([]);
            setShowDropdown(false);
        }
    }, [searchQuery]);

    const searchStudents = async (query) => {
        setIsSearching(true);
        try {
            const availableStudents = await searchAvailableStudents(query, enrolledStudents);
            setSearchResults(availableStudents);
            setShowDropdown(true);
        } catch (error) {
            console.error('Error searching students:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleStudentSelect = (student) => {
        setSelectedStudent(student);
        setSearchQuery('');
        setShowDropdown(false);
    };

    const clearSelection = () => {
        setSelectedStudent(null);
    };

    const handleEnrollStudent = async () => {
        if (!selectedStudent) {
            showMessage('Please select a student to enroll', 'info');
            return;
        }

        setIsEnrolling(true);
        try {
            await enrollStudentLogic(classId, selectedStudent.id);
            showMessage('Student added to class successfully', 'success');

            // Clear selection and state
            setSelectedStudent(null);
            setSearchResults([]);
            setSearchQuery('');

            if (onEnrollmentSuccess) {
                onEnrollmentSuccess();
            }
        } catch (error) {
            console.error('Error enrolling student:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to enroll student';
            showMessage(errorMsg, 'error');
        } finally {
            setIsEnrolling(false);
        }
    };


    const showMessage = (message, type) => {
        setEnrollmentMessage(message);
        setMessageType(type);
        setTimeout(() => {
            setEnrollmentMessage('');
            setMessageType('');
        }, 5000);
    };

    return (
        <div className="space-y-6">
            {/* Search Input */}
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search students by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.trim() && setShowDropdown(true)}
                        className="w-full pl-12 pr-4 py-4 bg-surface-3 border border-black/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-ink placeholder-gray-400 font-medium"
                    />
                </div>

                {/* Search Results Dropdown */}
                {showDropdown && (
                    <div 
                        ref={dropdownRef}
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/10 rounded-lg shadow-hover max-h-64 overflow-y-auto z-50"
                    >
                        {isSearching ? (
                            <div className="p-4 text-center text-gray-400">
                                <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full mx-auto mb-2"></div>
                                Searching...
                            </div>
                        ) : searchResults.length > 0 ? (
                            searchResults.map((student) => (
                                <div
                                    key={student.id}
                                    onClick={() => handleStudentSelect(student)}
                                    className="p-4 hover:bg-accent/10 cursor-pointer border-b border-black/5 last:border-b-0 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-ink">
                                                {student.name || student.firstName + ' ' + student.lastName}
                                            </p>
                                            <p className="text-sm text-muted">{student.email}</p>
                                        </div>
                                        <Plus size={18} className="text-accent" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-gray-400">
                                No students found matching "{searchQuery}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Selected Student Preview */}
            {selectedStudent && (
                <div className="bg-accent/10 rounded-lg p-6 border border-accent/10 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-ink flex items-center gap-2">
                            <Users size={18} className="text-accent" />
                            Selected Student
                        </h3>
                    </div>
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-accent/10 shadow-card">
                        <div>
                            <p className="font-semibold text-ink">
                                {selectedStudent.name || selectedStudent.firstName + ' ' + selectedStudent.lastName}
                            </p>
                            <p className="text-sm text-muted">{selectedStudent.email}</p>
                        </div>
                        <button
                            onClick={clearSelection}
                            className="bg-status-red/10 text-status-red hover:bg-red-100 p-2 rounded-lg transition-colors"
                            title="Remove individual selection"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Enrollment Message */}
            {enrollmentMessage && (
                <div className={`p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                    messageType === 'success' ? 'bg-status-green/10 text-green-700 border border-green-100' :
                    messageType === 'error' ? 'bg-status-red/10 text-red-700 border border-red-100' :
                    'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                    {messageType === 'success' ? <Check size={20} /> :
                     messageType === 'error' ? <AlertCircle size={20} /> :
                     <AlertCircle size={20} />}
                    <p className="font-medium">{enrollmentMessage}</p>
                </div>
            )}

            {/* Add Button */}
            <button
                onClick={handleEnrollStudent}
                disabled={isEnrolling || !selectedStudent}
                className={`w-full py-4 rounded-lg font-bold font-body transition-all flex items-center justify-center gap-3 ${
                    isEnrolling || !selectedStudent
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                        : 'bg-accent text-white hover:bg-indigo-700 shadow-[0_10px_20px_-5px_rgba(79,70,229,0.3)] hover:scale-[1.01] active:scale-[0.99]'
                }`}
            >
                {isEnrolling ? (
                    <>
                        <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Enrolling...
                    </>
                ) : (
                    <>
                        <Plus size={20} />
                        Enroll {selectedStudent ? selectedStudent.name || selectedStudent.firstName : 'Student'} in Class
                    </>
                )}
            </button>
        </div>
    );
};

export default StudentEnrollment;
