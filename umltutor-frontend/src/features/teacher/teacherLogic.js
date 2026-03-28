import classService from '../../services/classService';

/**
 * Searches for students and filters out those already enrolled in the class.
 */
export const searchAvailableStudents = async (query, enrolledStudents = []) => {
    try {
        const results = await classService.searchStudents(query);
        const enrolledList = Array.isArray(enrolledStudents) ? enrolledStudents : [];
        
        return results.filter(
            student => !enrolledList.some(enrolled => enrolled.id === student.id)
        );
    } catch (error) {
        console.error('Error in searchAvailableStudents logic:', error);
        throw error;
    }
};

/**
 * Enrolls a student in a class.
 */
export const enrollStudentLogic = async (classId, studentId) => {
    try {
        const response = await classService.addStudentToClass(classId, studentId);
        return response;
    } catch (error) {
        console.error('Error in enrollStudentLogic:', error);
        throw error;
    }
};

/**
 * Fetches enrolled students for a class.
 */
export const getEnrolledStudentsLogic = async (classId, fallbackStudentIds = []) => {
    try {
        const response = await classService.getClassStudents(classId);
        // The API now returns the students array directly after processing
        return Array.isArray(response) ? response : [];
    } catch (error) {
        console.error('Error in getEnrolledStudentsLogic:', error);
        
        // If endpoint doesn't exist yet, use the studentIds from class data as fallback
        if (fallbackStudentIds && fallbackStudentIds.length > 0) {
            return fallbackStudentIds.map((studentId, index) => ({
                id: studentId,
                firstName: `Student ${index + 1}`,
                lastName: '',
                email: `student${index + 1}@example.com`
            }));
        }
        return [];
    }
};

/**
 * Removes a student from a class.
 */
export const removeStudentLogic = async (classId, studentId) => {
    try {
        const response = await classService.removeStudentFromClass(classId, studentId);
        return response;
    } catch (error) {
        console.error('Error in removeStudentLogic:', error);
        throw error;
    }
};
