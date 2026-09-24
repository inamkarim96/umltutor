const fs = require('fs');

const content = fs.readFileSync('src/services/correctionLogger.js', 'utf8');

const oldSection = `        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }

    return {`;

const newSection = `        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    }
  }

    return {`;

const fixed = content.replace(oldSection, newSection);
fs.writeFileSync('src/services/correctionLogger.js', fixed);
console.log('Fixed');