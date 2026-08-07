# UML Tutor Backend API

## Overview
The UML Tutor Backend API provides comprehensive validation and consistency checking for UML diagrams used in educational settings. It supports automated grading, error detection, and improvement suggestions for students' UML modeling assignments.

## Quick Start

### Installation
```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Start development server
npm run dev
```

### Running Tests
```bash
# Run all backend tests
npm run test

# Run validation rule tests specifically
npm run rules:test

# Generate coverage report
npm run test:backend -- --coverage
```

### API Endpoints
```bash
# Health check
GET /health

# Main validation endpoint
POST /api/check
```

## Key Features

### 1. Comprehensive Validation System
- **124 validation rules** (117 active) covering grammar, structure, consistency, and UML standards
- **Dependency-aware processing** to reduce cascading errors
- **Real-time feedback** for students during diagram creation

### 2. Error Suggestions
- **Auto-fix suggestions** for common validation errors
- **Contextual recommendations** based on diagram content
- **Progressive enhancement** with improvement hints

### 3. Teacher Support
- **Detailed reporting** for assignment review
- **Scoring integration** with submission system
- **Tutorial mode support** for guided learning

## Architecture Overview

### Backend Structure
```
src/
├── rules/                    # Validation rule system
│   ├── ruleRegistry.js       # Complete rule definitions (1463 lines)
│   ├── rulePipeline.js       # Dependency-aware execution engine
│   └── ruleConfig.js         # Rule configuration management
├── services/                 # Business logic
│   ├── checkingEngine.js     # Core validation logic
│   ├── suggestionEngine.js   # Auto-fix suggestions
│   └── submissionService.js # Teacher flow integration
├── controllers/              # API endpoints
│   └── checkingController.js # Main validation controller
├── middleware/               # Request processing
├── repositories/              # Data access layer
└── config/                   # Application configuration
```

### Frontend Integration
- **Real-time validation** via `/api/check` endpoint
- **Component integration** with diagram editors
- **Progress tracking** for tutorial mode
- **Error reporting** with visual feedback

## Validation Rules System

### Rule Categories
1. **Grammar Rules** (use case naming, actor naming)
2. **Structural Rules** (diagram connectivity, relationships)
3. **Consistency Rules** (SSD consistency, flow alignment)
4. **Content Rules** (precondition/postcondition validation)

### Rule Processing Pipeline
1. **Root Cause Detection** - Identify primary violations
2. **Dependency Resolution** - Determine rule dependencies
3. **Suppression Logic** - Remove cascading errors
4. **Suggestion Generation** - Create improvement suggestions
5. **Reporting** - Compile validation results

## Development Workflow

### Common Tasks

#### Adding a New Validation Rule
```javascript
// In src/rules/ruleRegistry.js
const newRule = {
  code: 'NEW-RULE',
  name: 'Rule Name',
  severity: 'error',
  category: 'category',
  description: 'Rule description',
  enabled: true,
  dependencies: [],
  check: (model) => {
    // Validation logic
    return validationResult || null;
  }
};
```

#### Adding Suggestions
```javascript
// In src/services/suggestionEngine.js
suggestions = {
  'NEW-RULE': (result, model) => [
    {
      type: 'suggestion-type',
      message: 'User-friendly message',
      action: () => {
        // Implementation
      }
    }
  ]
};
```

### Testing
```bash
# Run validation-specific tests
npm run rules:test

# Test individual rule
npm run test:backend -- --testPathPattern=ruleRegistry

# Test suggestion engine
npm run test:backend -- --testPathPattern=suggestionEngine
```

## Code Quality Standards

### Linting
```bash
# Check code quality
npm run lint
```

### Type Checking
```bash
# If TypeScript is used
npm run typecheck
```

### Commit Guidelines
```bash
# Feature branch
git checkout -b feature/your-feature

# Add tests
git add src/rules/__tests__/your-rule.test.js

# Commit with conventional commit format
git commit -m "feat(rules): add validation rule for specific issue"
```

## Troubleshooting

### Common Issues

**Issue: Validation Not Working**
- Check if `rulePipeline.execute()` is called in `checkingController.js`
- Verify rules are enabled in `ruleConfig.js`

**Issue: Suggestions Not Generating**
- Check `suggestionEngine.js` integration
- Verify rule metadata includes suggestion templates

**Issue: Database Connection Problems**
- Verify `DATABASE_URL` in `.env`
- Run `npm run prisma:push` to sync schema

### Debug Commands
```bash
# Test API endpoint
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{"diagram": {...}, "useCaseDescription": {...}}'

# View recent logs
tail -f logs/combined.log

# Check database connection
psql $DATABASE_URL -c "SELECT 1"
```

## Support & Resources

### Getting Help
- **GitHub Issues**: https://github.com/inamkarim96/umltutor/issues
- **Development Channel**: Join project Slack/Discord if available
- **Code Review**: Check PR descriptions for specific requirements

### Learning Resources
- **Feature Documentation**: See `docs/FEATURES.md`
- **Validation Flow**: Review `docs/VALIDATION_FLOW.md`
- **Examples**: Check `examples/` directory
- **Rule Registry**: Examine `src/rules/ruleRegistry.js` for patterns

## Project Status

### ✅ Completed
- [x] Comprehensive validation rule system (124 rules, 117 active)
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
