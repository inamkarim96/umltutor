"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const studentService = _interopRequireDefault(require('../services/studentService')).default;

const searchStudents = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: { message: 'Search query is required' } 
      });
    }

    const students = await studentService.searchStudents(query);
    
    // Map to the requested response format
    const formattedStudents = students.map(s => ({
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      email: s.email
    }));

    res.json(formattedStudents);
  } catch (error) {
    console.error('Error in searchStudents controller:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to search students' } 
    });
  }
};

exports.searchStudents = searchStudents;

