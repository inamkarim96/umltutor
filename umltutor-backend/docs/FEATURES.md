# Feature Documentation

## Overview
This document provides detailed information about the key features of the UML Tutor Backend API, focusing on the validation and consistency checking system.

## Core Validation System

### Rule Registry (src/rules/ruleRegistry.js)
The rule registry contains **112 validation rules** that govern the quality and consistency of UML diagrams. Each rule is defined with comprehensive metadata including:

- **Code**: Unique identifier (e.g., "ATMR-001")
- **Name**: Human-readable name
- **Severity**: "error", "warning", or "info"
- **Category**: Rule classification
- **Description**: Detailed explanation of the rule
- **Enabled**: Whether the rule is active
- **Dependencies**: Other rules this rule depends on
- **Check Function**: The actual validation logic

### Rule Pipeline (src/rules/rulePipeline.js)
The rule pipeline executes validation rules in a **dependency-aware manner**. It handles:

1. **Root Cause Detection**: Identifies primary violations
2. **Dependency Resolution**: Determines rule execution order
3. **Error Suppression**: Prevents cascading errors from overwhelming the output
4. **Result Compilation**: Generates final validation report

### Key Features

#### Dependency-Aware Processing
The pipeline ensures that rules are executed in the correct order based on their dependencies. This prevents:

- **Cascading Errors**: A single mistake causing multiple errors
- **False Positives**: Errors triggered by other errors
- **Noise**: Overwhelming error reports

#### Error Suppression
When a rule has downstream dependencies, those dependent rules are marked as "SKIPPED_DEPENDENCY". This provides:

- **Clean Error Reports**: Only root causes are shown
- **Focused Feedback**: Students get clear, actionable guidance
- **Better UX**: Less frustration with overwhelming errors

## Auto-Fix Suggestions (src/services/suggestionEngine.js)

### Integration Points
The suggestion engine integrates with:

- **Student Flow**: During diagram creation
- **Teacher Flow**: During assignment review
- **API Validation**: Via `/api/check` endpoint

### Suggestion Categories
1. **Add Missing Elements**: Add missing actors, use cases, etc.
2. **Fix Naming**: Rename incorrectly named elements
3. **Correct Relationships**: Fix broken connections
4. **Improve Descriptions**: Suggest better wording
5. **Structural Fixes**: Reorganize diagram elements

### Format
Each suggestion includes:
- **Type**: Category of suggestion
- **Message**: User-friendly explanation
- **Action**: Function to implement the fix
- **Context**: Information about how to apply the suggestion

## API Endpoints

### POST /api/check
Main validation endpoint that accepts UML models and returns validation results.

**Request Body**
```json
{
  "diagram": {...},           // UML diagram data
  "useCaseDescription": {...}, // Use case descriptions
  "classDiagram": {...},      // Class diagram data
  "sequenceDiagrams": {...},  // Sequence diagrams
  "systemSequenceDiagrams": {...} // SSD data
}
```

**Response Body**
```json
{
  "success": true,
  "data": {
    "score": 85,
    "maxScore": 100,
    "errors": [...],
    "warnings": [...],
    "suggestions": [...],
    "ruleExecutionDetails": [...] // For debugging
  }
}
```

## Development Guidelines

### Adding a New Validation Rule

#### Step 1: Define the Rule
Add the rule definition to `src/rules/ruleRegistry.js`. Here's a template:

```javascript
const newRule = {
  code: 'RULE-CODE',
  name: 'Rule Name',
  severity: 'error', // or 'warning', 'info'
  category: 'category', // e.g., 'actor', 'useCase', 'relationship'
  description: 'Human-readable description of what the rule checks',
  enabled: true,
  dependencies: ['DEP-1', 'DEP-2'], // Array of dependent rule codes
  check: (model) => {
    // Validation logic here
    // Return error object if validation fails
    // Return null if validation passes
    if (/* validation fails */) {
      return {
        code: 'RULE-CODE',
        message: 'User-friendly error message',
        location: 'where the error occurred',
        severity: 'error'
      };
    }
    return null;
  }
};
```

#### Step 2: Configure the Rule
Add the rule to `src/rules/ruleConfig.js` to enable/disable or adjust thresholds.

#### Step 3: Add Suggestions
Add suggestion logic to `src/services/suggestionEngine.js`:

```javascript
// In suggestionEngine.js
suggestions = {
  'RULE-CODE': (result, model) => [
    {
      type: 'add-element',
      message: 'Add a "Customer" actor to represent system users',
      action: () => {
        // Implementation of the suggestion
      }
    }
  ]
};
```

#### Step 4: Write Tests
Create tests in `src/rules/__tests__/`:

```javascript
// In src/rules/__tests__/ruleRegistry.test.js
describe('Rule Validation', () => {
  test('should detect missing actor', () => {
    const model = { /* test data */ };
    const result = newRule.check(model);
    expect(result).toBeTruthy();
    expect(result.code).toBe('RULE-CODE');
  });
});
```

### Testing Validation Rules

#### Running Rule Tests
```bash
# Run all rule tests
npm run rules:test

# Run specific rule test
npm run test:backend -- --testPathPattern=ruleRegistry

# Run with coverage
npm run test:backend -- --coverage
```

#### Test Structure
Test files should include:

1. **Positive Tests**: Verify correct behavior when rule passes
2. **Negative Tests**: Verify error detection when rule fails
3. **Edge Cases**: Test boundary conditions
4. **Integration Tests**: Test rule interactions with pipeline

### Code Quality Standards

#### Commit Message Format
Use conventional commit messages:

```
feat(rules): add validation rule for ATM minimum actors
fix(rules): correct rule dependency ordering
docs(rules): document new rule in registry
```

#### File Naming
Use kebab-case for file names:

```bash
# GOOD
src/rules/rule-registry.js
src/services/suggestion-engine.js
src/controllers/checking-controller.js

# AVOID (inconsistent naming)
src/rules/ruleRegistry.js
src/services/suggestionEngine.js
src/controllers/checkingController.js
```

#### Documentation
Keep documentation in sync with code changes:

- Update `docs/FEATURES.md` for new features
- Update `docs/VALIDATION_FLOW.md` for process changes
- Add examples to `examples/` directory

## Quick Commands for Developers

### Core Commands
```bash
# Run all validation tests
npm run test:backend

# Run rule-specific tests
npm run rules:test

# Generate documentation
npm run docs:generate

# Generate rule documentation
npm run rules:generate-docs

# Start development server
npm run dev

# Check code quality
npm run lint
```

### API Testing
```bash
# Test validation endpoint
curl -X POST http://localhost:3000/api/check \
  -H "Content-Type: application/json" \
  -d '{"diagram": {...}, "useCaseDescription": {...}}'

# Test with sample data
npm run test:backend -- --testPathPattern=checkModel
```

### Database Commands
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Push schema to database
npm run prisma:push

# Studio (GUI for database)
npm run prisma:studio
```

## Troubleshooting

### Common Issues

**Issue: Rules not being executed**
```bash
# Check if rulePipeline is called in checkingController.js
# Verify ruleRegistry is properly loaded
# Ensure rules are enabled in ruleConfig.js
```

**Issue: Suggestions not appearing**
```bash
# Check suggestionEngine integration
# Verify rule metadata includes suggestions
# Test API endpoint manually
```

**Issue: Database connection problems**
```bash
# Verify DATABASE_URL in .env
# Run database migrations
# Check network connectivity
```

### Debug Commands
```bash
# View validation logs
tail -f logs/combined.log

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Test rule execution
node scripts/debug/test-rule-execution.js
```

## Support & Resources

### Getting Help
- **GitHub Issues**: Check existing issues for similar problems
- **Development Documentation**: Review this document
- **Code Examples**: Check `examples/` directory

### Learning Resources
- **Rule Registry**: `src/rules/ruleRegistry.js` - 112 rules with examples
- **API Reference**: `docs/API_REFERENCE.md` - detailed endpoint documentation
- **Examples**: `examples/` - practical usage examples
- **Tutorials**: `docs/GETTING_STARTED.md` - step-by-step guides

## Project Architecture

### Backend Layer
1. **API Layer** (`controllers/`) - HTTP endpoints
2. **Service Layer** (`services/`) - Business logic
3. **Repository Layer** (`repositories/`) - Data access
4. **Middleware Layer** (`middleware/`) - Request processing

### Validation Layer
1. **Rule Registry** (`rules/ruleRegistry.js`) - Rule definitions
2. **Rule Pipeline** (`rules/rulePipeline.js`) - Execution engine
3. **Rule Config** (`rules/ruleConfig.js`) - Configuration management

### Supporting Services
1. **Suggestion Engine** (`services/suggestionEngine.js`) - Auto-fix suggestions
2. **Checking Engine** (`services/checkingEngine.js`) - Core validation
3. **Submission Service** (`services/submissionService.js`) - Teacher flow

## Future Development

### Potential Improvements
1. **Advanced Error Analysis**: Better error root cause detection
2. **Machine Learning**: Intelligent pattern recognition
3. **Real-time Collaboration**: Multiple user support
4. **Mobile Support**: iOS/Android applications
5. **Cloud Integration**: AWS/GCP deployment options

### Research Areas
- **NLP Integration**: Natural language processing for requirements
- **Visual Analysis**: Automated diagram understanding
- **Adaptive Learning**: Personalized feedback based on student progress
- **Gamification**: Engaging validation with rewards and progress tracking

---

**Note**: This documentation is a living document. Please contribute updates and improvements through the project's GitHub repository.
