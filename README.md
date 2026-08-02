# UML Tutor Project

## Overview
The UML Tutor project is a comprehensive educational platform designed to help students learn and practice UML (Unified Modeling Language) diagram creation. It provides real-time validation, consistency checking, and automated feedback to help students create high-quality UML diagrams.

## Key Features

### Backend API (`umltutor-backend/`)
- **Comprehensive Validation System**: 112 validation rules covering grammar, structure, consistency, and content
- **Dependency-Aware Processing**: Smart error detection that suppresses cascading errors
- **Auto-Fix Suggestions**: Real-time improvement suggestions for students
- **Teacher Support**: Detailed reporting and scoring for assignment review

### Frontend Application (`umltutor-frontend/`)
- **Interactive Diagram Editors**: Support for use case, sequence, class, and SSD diagrams
- **Real-time Validation**: Instant feedback during diagram creation
- **Tutorial Mode**: Guided learning with step-by-step validation
- **Responsive Design**: Works on desktop and mobile devices

## Architecture Overview

### Backend Structure
```
umltutor-backend/
├── src/
│   ├── rules/              # Validation rule system
│   │   ├── ruleRegistry.js  # Complete rule definitions (1463 lines)
│   │   ├── rulePipeline.js  # Dependency-aware execution engine
│   │   └── ruleConfig.js    # Rule configuration management
│   ├── services/           # Business logic
│   │   ├── checkingEngine.js     # Core validation logic
│   │   ├── suggestionEngine.js   # Auto-fix suggestions
│   │   └── submissionService.js # Teacher flow integration
│   ├── controllers/          # API endpoints
│   │   └── checkingController.js # Main validation controller
│   ├── middleware/           # Request processing
│   ├── repositories/          # Data access layer
│   └── config/               # Application configuration
└── package.json
```

### Frontend Structure
```
umltutor-frontend/
├── src/
│   ├── features/           # Feature-based modules
│   │   ├── checking/        # Validation and checking logic
│   │   ├── diagram/         # Diagram editing components
│   │   ├── submissions/     # Submission and review
│   │   └── ...other features
│   ├── components/          # Reusable UI components
│   ├── services/             # API and external service integrations
│   ├── utils/                # Utility functions
│   └── types/                # TypeScript type definitions
└── package.json
```

## Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Prisma ORM** - Database access
- **Zod** - Request validation
- **Redis** - Caching (optional)
- **Firebase** - Authentication

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Redux Toolkit** - State management
- **React Flow** - Diagram editing
- **Socket.io** - Real-time communication

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (for production)
- Redis (optional, for caching)

### Installation
```bash
# Clone the repository
git clone https://github.com/inamkarim96/umltutor

# Navigate to project directory
cd umltutor

# Install dependencies for both frontend and backend
npm install
```

### Running the Application

#### Local Development
```bash
# Start both backend and frontend
npm run dev

# Or run them separately
npm run dev:backend
npm run dev:frontend
```

#### Database Setup
```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database (if needed)
npm run prisma:seed
```

#### Running Tests
```bash
# Run all backend tests
npm run test

# Run validation rule tests specifically
npm run rules:test

# Generate coverage report
npm run test:backend -- --coverage
```

## Development Workflow

### Common Tasks

#### Adding a New Validation Rule
1. **Define the Rule** (`src/rules/ruleRegistry.js`)
2. **Configure Rule** (`src/rules/ruleConfig.js`)
3. **Add Suggestions** (`src/services/suggestionEngine.js`)
4. **Write Tests** (`src/rules/__tests__/`)

#### Running Validation Tests
```bash
# Run all rule tests
npm run rules:test

# Run specific rule tests
npm run test:backend -- --testPathPattern=ruleRegistry
```

#### Code Quality Standards
```bash
# Check code quality
npm run lint

# Check TypeScript (if applicable)
npm run typecheck

# Commit with conventional commit format
git commit -m "feat(rules): add validation rule for specific issue"
```

## Project Structure Documentation

### Backend API Documentation
- **README.md**: Project overview and setup instructions
- **FEATURES.md**: Detailed feature documentation
- **VALIDATION_FLOW.md**: Validation pipeline architecture
- **API_REFERENCE.md**: Endpoint documentation

### Frontend Documentation
- **README.md**: Project overview and setup instructions
- **COMPONENTS.md**: Component documentation
- **FEATURES.md**: Feature documentation
- **API_REFERENCE.md**: API documentation

### Development Guides
- **CONTRIBUTING.md**: Contribution guidelines
- **DEVELOPMENT.md**: Development setup and workflows
- **TESTING.md**: Testing strategies and practices

## Validation System

### Core Components

#### Rule Registry (`src/rules/ruleRegistry.js`)
Contains **112 validation rules** organized by category:

1. **Grammar Rules** (15 rules)
   - Use case naming validation
   - Actor naming validation
   - Verb usage validation

2. **Structural Rules** (25 rules)
   - Diagram connectivity validation
   - Relationship multiplicity validation
   - Actor-connection validation

3. **Consistency Rules** (35 rules)
   - SSD consistency validation
   - Main flow alignment
   - Return message validation

4. **Content Rules** (37 rules)
   - Precondition validation
   - Postcondition validation
   - Description grammar validation

#### Rule Pipeline (`src/rules/rulePipeline.js`)
Executes validation rules in a dependency-aware manner, suppressing cascading errors and providing focused feedback.

#### Suggestion Engine (`src/services/suggestionEngine.js`)
Generates auto-fix suggestions for validation errors, integrated into both student and teacher flows.

### Validation Flow

1. **API Endpoint** (`POST /api/check`)
   - Validates request body using Zod schemas
   - Executes rule pipeline
   - Generates suggestions
   - Returns formatted results

2. **Rule Execution Pipeline**
   - Load rules from registry
   - Resolve dependencies
   - Execute rules in order
   - Compile results
   - Generate suggestions

3. **Suggestion Integration**
   - Student flow: During diagram creation
   - Teacher flow: During assignment review
   - API validation: Via `/api/check` endpoint

## Testing

### Test Structure
```
src/
├── rules/
│   ├── __tests__/           # Rule-specific tests
│   │   ├── ruleRegistry.test.js
│   │   └── rulePipeline.test.js
│   └── ...other rule files
├── services/
│   └── __tests__/           # Service-specific tests
└── ...other tests
```

### Running Tests
```bash
# Run all backend tests
npm run test

# Run validation rule tests specifically
npm run rules:test

# Run with coverage
npm run test:backend -- --coverage
```

### Test Coverage
- **Rule Registry Tests**: Verify rule structure and definitions
- **Rule Pipeline Tests**: Verify dependency resolution and error suppression
- **Suggestion Engine Tests**: Verify suggestion generation
- **Integration Tests**: Verify end-to-end validation flow

## Troubleshooting

### Common Issues

#### Issue: Validation Not Working
**Cause**: Rule registry not loaded properly
**Solution**: Ensure `src/rules/ruleRegistry.js` is properly imported

#### Issue: Suggestions Not Appearing
**Cause**: Suggestion engine not integrated
**Solution**: Ensure suggestion engine is called in validation pipeline

#### Issue: Database Connection Problems
**Cause**: Database configuration issues
**Solution**: Verify `DATABASE_URL` in `.env` file

### Debug Commands
```bash
# View validation logs
tail -f logs/combined.log

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Test API endpoint
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{"diagram": {...}, "useCaseDescription": {...}}'
```

## Support & Resources

### Getting Help
- **GitHub Issues**: https://github.com/inamkarim96/umltutor/issues
- **Development Documentation**: Review project documentation
- **Code Examples**: Check `examples/` directory

### Learning Resources
- **Rule Registry**: `src/rules/ruleRegistry.js` - 112 rules with examples
- **API Reference**: `docs/API_REFERENCE.md` - detailed endpoint documentation
- **Examples**: `examples/` - practical usage examples
- **Tutorials**: `docs/GETTING_STARTED.md` - step-by-step guides

## Project Status

### ✅ Completed
- [x] Comprehensive validation rule system (112 rules)
- [x] Dependency-aware rule pipeline
- [x] Auto-fix suggestion engine
- [x] Teacher flow integration
- [x] Test coverage (5 rule pipeline tests)

### 🔄 In Progress
- [ ] Full project documentation
- [ ] API reference documentation
- [ ] Developer guides
- [ ] Examples collection

### 📋 Upcoming
- [ ] Contribution guidelines
- [ ] Architecture decision records
- [ ] Performance optimization

## License
MIT Licensed. See `LICENSE` file for details.

---

**Note**: This project is actively maintained. Please report issues and suggest improvements through the official GitHub repository.
