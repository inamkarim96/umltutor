"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const userRepository = _interopRequireDefault(require('../repositories/userRepository')).default;
const serviceCache = require('../utils/serviceCache');

class StudentService {
  /**
   * Search for students by name or email
   */
  async searchStudents(query) {
    if (!query) return [];
    const cacheKey = `students:search:${query.toLowerCase().trim()}`;
    return serviceCache.cached(cacheKey, 30, () =>
      userRepository.searchStudents(query)
    );
  }

  /**
   * Get student by ID
   */
  async getStudentById(studentId) {
    const cacheKey = `student:${Number(studentId)}`;
    return serviceCache.cached(cacheKey, 120, () =>
      userRepository.findById(Number(studentId))
    );
  }
}

exports.default = new StudentService();
