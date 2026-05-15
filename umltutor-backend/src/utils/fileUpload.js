"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _multer = require('multer'); var _multer2 = _interopRequireDefault(_multer);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);
var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);

const { 
  DIRS, 
  UPLOAD_CONFIG, 
  ensureDirectory,
  generateUniqueFilename,
  getFileUrl 
} = require('../config/paths');
const { uploadToCloudinary } = require('./cloudinary');

// Ensure upload directories exist
ensureDirectory(DIRS.ASSIGNMENT_UPLOADS);
ensureDirectory(DIRS.SUBMISSION_UPLOADS);
ensureDirectory(DIRS.TEMP_UPLOADS);

// Configure multer for file uploads
const storage = _multer2.default.diskStorage({
  destination: (req, file, cb) => {
    // Determine upload directory based on route or request context
    let uploadDir = DIRS.ASSIGNMENT_UPLOADS;
    
    if (req.originalUrl?.includes('/submission')) {
      uploadDir = DIRS.SUBMISSION_UPLOADS;
    } else if (req.originalUrl?.includes('/temp')) {
      uploadDir = DIRS.TEMP_UPLOADS;
    }
    
    // Ensure directory exists just in case
    ensureDirectory(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with timestamp
    const prefix = req.uploadType || 'file';
    const uniqueName = generateUniqueFilename(file.originalname, prefix);
    cb(null, uniqueName);
  },
});

// File filter using centralized configuration
const fileFilter = (req, file, cb) => {
  if (UPLOAD_CONFIG.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${UPLOAD_CONFIG.ALLOWED_TYPES.join(', ')}.`));
  }
};

// Common multer configuration
const multerConfig = {
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
  },
};

// Configure multer for different upload types
const uploadAssignmentFile = _multer2.default.call(void 0, multerConfig);
const uploadSubmissionFile = _multer2.default.call(void 0, multerConfig);
const uploadTempFile = _multer2.default.call(void 0, multerConfig);

exports.uploadAssignmentFile = uploadAssignmentFile; 
exports.uploadSubmissionFile = uploadSubmissionFile;
exports.uploadTempFile = uploadTempFile;

// Helper function to get file info
const getFileInfo = (file, uploadType = 'assignments') => {
  const ext = _path2.default.extname(file.originalname).toLowerCase();
  const fileType = UPLOAD_CONFIG.TYPE_MAPPING[ext] || null;

  return {
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
    url: getFileUrl(file.path, uploadType),
    type: fileType,
  };
}; exports.getFileInfo = getFileInfo;

/**
 * Upload a local file to CDN and return its public URL
 */
const uploadToCDN = async (file, folder = 'umltutor') => {
  if (!file) return null;
  
  const cdnData = await uploadToCloudinary(file.path, folder);
  if (cdnData) {
    return cdnData.url;
  }
  
  // Fallback to local URL if Cloudinary fails/not configured
  return getFileUrl(file.path, folder);
}; exports.uploadToCDN = uploadToCDN;

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (_fs2.default.existsSync(filePath)) {
      _fs2.default.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${filePath}`);
  }
}; exports.deleteFile = deleteFile;

// Helper function to move file from temp to permanent location
const moveFile = (tempPath, destinationDir, filename) => {
  try {
    ensureDirectory(destinationDir);
    const finalPath = _path2.default.join(destinationDir, filename);
    
    if (_fs2.default.existsSync(tempPath)) {
      _fs2.default.renameSync(tempPath, finalPath);
      return finalPath;
    } else {
      throw new Error(`Source file not found: ${tempPath}`);
    }
  } catch (error) {
    console.error('Error moving file:', error);
    throw new Error(`Failed to move file from ${tempPath} to ${destinationDir}`);
  }
}; exports.moveFile = moveFile;

// Helper function to validate file type and size
const validateFile = (file) => {
  if (!UPLOAD_CONFIG.ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Invalid file type: ${file.mimetype}`);
  }
  
  if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
    throw new Error(`File size exceeds limit: ${file.size} bytes (max: ${UPLOAD_CONFIG.MAX_FILE_SIZE} bytes)`);
  }
  
  return true;
}; exports.validateFile = validateFile;
