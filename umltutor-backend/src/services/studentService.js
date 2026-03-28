"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;

class StudentService {
  /**
   * Search for students by name or email
   */
  async searchStudents(query) {
    if (!query) return [];
    return await userRepository.searchStudents(query);
  }

  /**
   * Get student by ID
   */
  async getStudentById(studentId) {
    return await userRepository.findById(Number(studentId));
  }
}

exports.default = new StudentService();
