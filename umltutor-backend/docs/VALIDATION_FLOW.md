# UML Tutor - Validation Flow Documentation

## Overview
This document describes the validation flow architecture in the UML Tutor Backend API, including the rule registry, pipeline, and suggestion system.

## Core Validation Architecture

### 1. Rule Registry (src/rules/ruleRegistry.js)
The rule registry is the central repository of all validation rules. It contains **124 validation rules** (117 active, 7 deprecated/disabled) organized by category:

#### Rule Categories
1. **Naming Rules** (13 rules)
   - Use case naming validation
   - Actor naming validation
   - Duplicate element detection

2. **Structural Rules** (25 rules)
   - Diagram connectivity validation
   - Relationship typing and multiplicity validation
   - Actor-connection validation

3. **Consistency Rules** (30 rules)
   - SSD consistency validation
   - Main flow alignment
   - Return message validation
   - Cross-diagram actor-name consistency

4. **Completeness Rules** (20 rules)
   - Precondition validation
   - Postcondition validation
   - Description completeness

5. **UML Standard Rules** (21 rules)
   - Sequence activation-bar validation
   - Combined-fragment (alt/loop/opt/par) validation
   - Use case include/extend/generalization validation

6. **Best Practice Rules** (4 rules) and **NLP/Description Rules** (4 rules)
   - Responsibility warnings
   - Description grammar validation

### 2. Rule Pipeline (src/rules/rulePipeline.js)

#### Pipeline Architecture
The rule pipeline executes validation rules in a **dependency-aware manner**, ensuring efficient and accurate error detection.

#### Pipeline Process
1. **Initialization**: Load all rules from registry
2. **Dependency Resolution**: Build execution graph
3. **Rule Execution**: Execute rules in dependency order
4. **Result Compilation**: Aggregate results
5. **Suggestion Generation**: Create improvement suggestions

#### Key Features

##### Dependency-Aware Processing
- **Graph-based execution**: Rules are executed based on dependency relationships
- **Suppression Logic**: Cascading errors are suppressed
- **Error Prioritization**: Root causes are prioritized over downstream effects

##### Error Suppression
```javascript
// Example of error suppression in rulePipeline.js
if (dependentRule.status === 'SKIPPED_DEPENDENCY') {
  result.push({
    code: dependentRule.code,
    message: 'Error suppressed due to dependency',
    type: 'info'
  });
}
```

### 3. Auto-Fix Suggestions (src/services/suggestionEngine.js)

#### Integration Points
The suggestion engine integrates with multiple components:

1. **Checking Controller** (`src/controllers/checkingController.js`)
2. **Submission Service** (`src/services/submissionService.js`)
3. **Validation Engine** (`src/services/checkingEngine.js`)

#### Suggestion Format
```javascript
{
  code: 'ERROR-CODE',           // Error code that triggered the suggestion
  type: 'suggestion-type',      // Type of suggestion
  message: 'User-friendly message',  // Explanation for users
  action: () => void,          // Function to implement the fix
  priority: 'high' | 'medium' | 'low'  // Priority level
}
```

#### Suggestion Categories
1. **Add Missing Elements**: Add missing actors, use cases, relationships
2. **Fix Naming**: Rename incorrectly named elements
3. **Correct Relationships**: Fix broken or incorrect connections
4. **Improve Structure**: Reorganize diagram for better clarity
5. **Enhance Documentation**: Suggest better descriptions or comments

## Validation Flow Implementation

### 1. API Endpoint (/api/check)

#### Request Processing
1. **Request Validation**: Validate request body using Zod schemas
2. **Model Parsing**: Parse UML diagram data
3. **Pipeline Execution**: Execute rule pipeline
4. **Suggestion Integration**: Generate suggestions
5. **Response Compilation**: Format and return results

#### Response Format
```json
{
  "success": true,
  "data": {
    "score": 85,
    "maxScore": 100,
    "errors": [
      {
        "code": "ATMR-001",
        "message": "ATM system requires at least one customer actor",
        "location": "diagram.nodes[0]",
        "severity": "error",
        "suggestion": "Add a 'Bank Customer' actor"
      }
    ],
    "warnings": [...],
    "suggestions": [...],
    "ruleExecutionDetails": [...]
  }
}
```

### 2. Rule Execution Pipeline

#### Step 1: Rule Registration
```javascript
// In src/rules/ruleRegistry.js
const ruleRegistry = [
  {
    code: 'ATMR-001',
    name: 'ATM Minimum Actors',
    severity: 'error',
    category: 'actor',
    description: 'ATM system requires at least one customer actor',
    enabled: true,
    dependencies: [],
    check: (model) => {
      // Validation logic
      return validationResult || null;
    }
  },
  // ... more rules
];
```

#### Step 2: Dependency Resolution
```javascript
// In src/rules/rulePipeline.js
function buildExecutionGraph(rules) {
  const graph = {};
  
  rules.forEach(rule => {
    graph[rule.code] = {
      ...rule,
      dependents: [],
      dependencies: rule.dependencies || [],
      status: 'PENDING'
    };
  });
  
  // Build dependency graph
  Object.values(graph).forEach(rule => {
    rule.dependencies.forEach(depCode => {
      if (graph[depCode]) {
        graph[depCode].dependents.push(rule.code);
      }
    });
  });
  
  return graph;
}
```

#### Step 3: Rule Execution
```javascript
// In src/rules/rulePipeline.js
async function executePipeline(model, ruleGraph) {
  const results = [];
  const executionOrder = topologicalSort(ruleGraph);
  
  for (const ruleCode of executionOrder) {
    const rule = ruleGraph[ruleCode];
    
    if (rule.status === 'SKIPPED_DEPENDENCY') {
      // Skip rule if its dependencies failed
      results.push(createSkippedResult(rule));
      continue;
    }
    
    const result = await executeRule(rule, model);
    
    if (result.error) {
      // Handle error
      results.push(result);
      
      // Update dependent rules
      rule.dependents.forEach(depCode => {
        const dep = ruleGraph[depCode];
        if (dep.status === 'PENDING') {
          dep.status = 'SKIPPED_DEPENDENCY';
        }
      });
    } else {
      results.push({ ...result, status: 'PASSED' });
    }
  }
  
  return results;
}
```

### 3. Suggestion Integration

#### Student Flow
```javascript
// In src/services/submissionService.js
async function runCheckForStudent(submissionId, model) {
  const results = await rulePipeline.executePipeline(model, ruleRegistry);
  
  const suggestions = await Promise.all(
    results
      .filter(result => result.suggestion)
      .map(async result => {
        const suggestion = await suggestionEngine.generateSuggestion(
          result.code,
          result,
          model
        );
        return suggestion;
      })
  );
  
  return {
    results,
    suggestions,
    score: calculateScore(results)
  };
}
```

#### Teacher Flow
```javascript
// In src/controllers/checkingController.js
const checkModel = async (req, res) => {
  const { validatedData } = req.body;
  
  const results = await rulePipeline.executePipeline(
    validatedData,
    ruleRegistry
  );
  
  const suggestions = await suggestionEngine.generateSuggestions(results, validatedData);
  
  const formattedResults = formatResults(results);
  
  res.json({
    success: true,
    data: {
      ...formattedResults,
      suggestions
    }
  });
};
```

## Validation Rule Examples

### Example 1: ATM Minimum Actors (ATMR-001)

#### Rule Definition
```javascript
const atmMinimumActorsRule = {
  code: 'ATMR-001',
  name: 'ATM Minimum Actors',
  severity: 'error',
  category: 'actor',
  description: 'ATM system requires at least one customer actor',
  enabled: true,
  dependencies: [],
  check: (model) => {
    const actors = model.diagram.nodes.filter(n => n.type === 'actor');
    const customerActors = actors.filter(a => 
      a.data?.label?.toLowerCase().includes('customer')
    );
    
    if (customerActors.length === 0) {
      return {
        code: 'ATMR-001',
        message: 'ATM system requires at least one customer actor',
        location: 'diagram.nodes',
        severity: 'error',
        suggestion: {
          type: 'add-actor',
          message: 'Add a "Bank Customer" actor to represent system users',
          action: () => {
            // Implementation for adding customer actor
          }
        }
      };
    }
    
    return null;
  }
};
```

#### Suggestion Logic
```javascript
// In src/services/suggestionEngine.js
suggestions['ATMR-001'] = (result, model) => [
  {
    type: 'add-actor',
    message: 'Add a "Bank Customer" actor to represent system users',
    action: () => {
      // Implementation for adding customer actor
      return {
        type: 'create-actor',
        params: {
          name: 'Bank Customer',
          type: 'actor',
          stereotypes: [],
          attributes: [],
          methods: []
        }
      };
    },
    priority: 'high'
  }
];
```

### Example 2: Use Case Naming (USCN-001)

#### Rule Definition
```javascript
const useCaseNamingRule = {
  code: 'USCN-001',
  name: 'Use Case Naming',
  severity: 'warning',
  category: 'useCase',
  description: 'Use case names should include a verb',
  enabled: true,
  dependencies: [],
  check: (model) => {
    const useCases = model.diagram.nodes.filter(n => n.type === 'usecase');
    const invalidUseCases = useCases.filter(uc => {
      const name = uc.data?.label?.trim();
      return name && !isVerb(name) && name.length < 3;
    });
    
    return invalidUseCases.map(uc => ({
      code: 'USCN-001',
      message: `Use case "${uc.data.label}" should include a verb or be more descriptive`,
      location: `diagram.nodes.${uc.id}`,
      severity: 'warning',
      suggestion: {
        type: 'rename-use-case',
        message: `Rename "${uc.data.label}" to include a verb (e.g., "Process Payment", "Login User")`,
        action: () => {
          // Implementation for renaming use case
        }
      }
    }));
  }
};
```

## Testing the Validation Pipeline

### Unit Tests
```bash
# Run all rule pipeline tests
npm run rules:test

# Run specific rule tests
npm run test:backend -- --testPathPattern=ruleRegistry

# Run suggestion engine tests
npm run test:backend -- --testPathPattern=suggestionEngine
```

### Test Structure
```javascript
// In src/rules/__tests__/ruleRegistry.test.js
describe('Rule Registry', () => {
  test('should have 124 rules defined', () => {
    expect(ruleRegistry).toHaveLength(124);
  });
  
  test('should have valid rule structure', () => {
    ruleRegistry.forEach(rule => {
      expect(rule.code).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(['error', 'warning', 'info']).toContain(rule.severity);
      expect(typeof rule.check).toBe('function');
    });
  });
});

// In src/rules/__tests__/rulePipeline.test.js
describe('Rule Pipeline', () => {
  test('should execute rules in dependency order', () => {
    const model = { /* test model */ };
    const results = await rulePipeline.executePipeline(model, ruleRegistry);
    
    // Verify execution order
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });
  
  test('should suppress cascading errors', () => {
    const model = { /* model with cascading errors */ };
    const results = await rulePipeline.executePipeline(model, ruleRegistry);
    
    // Verify suppression
    const cascadingErrors = results.filter(r => r.suppressed);
    expect(cascadingErrors).toHaveLength(0);
  });
});
```

## Performance Considerations

### Large Model Handling
- **Lazy Loading**: Load rules only when needed
- **Parallel Processing**: Execute independent rules in parallel
- **Caching**: Cache rule results for repeated validations

### Memory Management
```javascript
// In src/rules/rulePipeline.js
class RulePipeline {
  constructor() {
    this.ruleCache = new Map(); // Cache rule metadata
    this.resultCache = new Map(); // Cache validation results
  }
  
  async executePipeline(model, ruleGraph) {
    // Clear cache for large models
    if (model.diagram.nodes.length > 100) {
      this.clearCache();
    }
    
    // Execute pipeline
    return super.executePipeline(model, ruleGraph);
  }
}
```

## Migration Guide

### From Legacy Validation to Rule Pipeline

#### Step 1: Identify Legacy Rules
Replace calls to `CheckingEngine.checkModel()` with `rulePipeline.execute()`:

```javascript
// OLD (legacy)
const result = await CheckingEngine.checkModel(model);

// NEW (pipeline)
const result = await rulePipeline.executePipeline(model, ruleRegistry);
```

#### Step 2: Update Suggestion Integration
```javascript
// OLD (legacy)
const suggestions = await suggestionEngine.generateSuggestions(result, model);

// NEW (pipeline)
const suggestions = await suggestionEngine.generateSuggestions(
  result.results,
  model
);
```

#### Step 3: Update API Controller
```javascript
// OLD (legacy)
const checkModel = async (req, res) => {
  const { validatedData } = req.body;
  const result = await CheckingEngine.checkModel(validatedData);
  const suggestions = await suggestionEngine.generateSuggestions(result, validatedData);
  
  res.json({ success: true, data: { result, suggestions } });
};

// NEW (pipeline)
const checkModel = async (req, res) => {
  const { validatedData } = req.body;
  const results = await rulePipeline.executePipeline(validatedData, ruleRegistry);
  const suggestions = await suggestionEngine.generateSuggestions(results, validatedData);
  
  res.json({ 
    success: true, 
    data: { results, suggestions } 
  });
};
```

## Common Issues and Solutions

### Issue: Rules Not Being Executed
**Cause**: Rule registry not loaded properly
**Solution**: Ensure `src/rules/ruleRegistry.js` is properly imported

```javascript
// In src/rules/rulePipeline.js
import { ruleRegistry } from './ruleRegistry';
```

### Issue: Suggestions Not Appearing
**Cause**: Suggestion engine not integrated
**Solution**: Ensure suggestion engine is called in the validation pipeline

```javascript
// In src/controllers/checkingController.js
const checkModel = async (req, res) => {
  const { validatedData } = req.body;
  const results = await rulePipeline.executePipeline(validatedData, ruleRegistry);
  
  // Ensure suggestions are generated
  const suggestions = await suggestionEngine.generateSuggestions(results, validatedData);
  
  // Ensure suggestions are included in response
  res.json({ 
    success: true, 
    data: { results, suggestions } 
  });
};
```

### Issue: Cascading Errors
**Cause**: Dependency resolution not working
**Solution**: Check rule dependencies in `ruleRegistry.js`

```javascript
// Example rule with dependencies
const complexRule = {
  code: 'COMPLEX-001',
  name: 'Complex Rule',
  severity: 'error',
  dependencies: ['PREREQ-001'], // Depends on prerequisite rule
  // ... rest of rule definition
};
```

## Future Enhancements

### Proposed Features

1. **Real-time Validation**: Stream validation results as diagrams are edited
2. **Machine Learning**: Intelligent pattern recognition for error prediction
3. **Adaptive Learning**: Personalized feedback based on student performance
4. **Collaborative Validation**: Multiple user validation with conflict resolution
5. **Cloud Integration**: Scalable validation in cloud environments

### Research Areas

1. **NLP Integration**: Natural language processing for requirements analysis
2. **Visual Analysis**: Automated diagram understanding and interpretation
3. **Adaptive Systems**: Systems that learn from user interactions
4. **Performance Optimization**: Parallel processing and caching strategies

---

**Documentation Last Updated**: July 2026
**Next Update**: After implementation of real-time validation feature

*This document is part of the UML Tutor project and is subject to change based on feature development.*
