const fs = require('fs');
let content = fs.readFileSync('D:\\FYP documentation\\umltutor-backend\\src\\nlp\\promptRequirementParser.js', 'utf8');

const insertCode = `
/**
 * Cluster similar actors using embedding similarity
 * Groups actors like "Student", "Students", "Pupil" together
 */
async function clusterActors(actors) {
  if (!actors || actors.length <= 1) return actors;
  
  try {
    const embeddings = await getEmbeddings(actors);
    const clusters = [];
    const used = new Set();
    
    for (let i = 0; i < actors.length; i++) {
      if (used.has(i)) continue;
      
      const cluster = [actors[i]];
      used.add(i);
      
      for (let j = i + 1; j < actors.length; j++) {
        if (used.has(j)) continue;
        
        const sim = cosineSimilarity(embeddings[i], embeddings[j]);
        if (sim >= 0.85) {
          cluster.push(actors[j]);
          used.add(j);
        }
      }
      
      clusters.push(cluster);
    }
    
    // Return representative actor for each cluster (first one)
    return clusters.map(c => c[0]);
  } catch (err) {
    console.warn('[clusterActors] Failed, returning original:', err.message);
    return actors;
  }
}

/**
 * Deduplicate use cases using embedding similarity
 * Merges semantically similar use cases like "Login" and "Sign In"
 */
async function deduplicateUseCases(useCases) {
  if (!useCases || useCases.length <= 1) return useCases;
  
  const names = useCases.map(uc => uc.name);
  try {
    const embeddings = await getEmbeddings(names);
    const unique = [];
    const used = new Set();
    
    for (let i = 0; i < useCases.length; i++) {
      if (used.has(i)) continue;
      
      unique.push(useCases[i]);
      used.add(i);
      
      for (let j = i + 1; j < useCases.length; j++) {
        if (used.has(j)) continue;
        
        const sim = cosineSimilarity(embeddings[i], embeddings[j]);
        if (sim >= 0.88) {
          // Merge: keep the one with higher confidence
          if (useCases[j].confidence > useCases[i].confidence) {
            unique[unique.length - 1] = useCases[j];
          }
          used.add(j);
        }
      }
    }
    
    return unique;
  } catch (err) {
    console.warn('[deduplicateUseCases] Failed, returning original:', err.message);
    return useCases;
  }
}

/**
 * Compute embedding coherence score for use cases
 * Measures how semantically consistent the use case steps are
 */
async function computeEmbeddingCoherence(useCases) {
  if (!useCases || useCases.length === 0) return 0;
  
  let totalScore = 0;
  let count = 0;
  
  for (const uc of useCases) {
    if (!uc.steps || uc.steps.length < 2) continue;
    
    const stepTexts = uc.steps.map(s => s.action).filter(Boolean);
    if (stepTexts.length < 2) continue;
    
    try {
      const embeddings = await getEmbeddings(stepTexts);
      let pairScore = 0;
      let pairs = 0;
      
      for (let i = 0; i < embeddings.length; i++) {
        for (let j = i + 1; j < embeddings.length; j++) {
          pairScore += cosineSimilarity(embeddings[i], embeddings[j]);
          pairs++;
        }
      }
      
      if (pairs > 0) {
        totalScore += pairScore / pairs;
        count++;
      }
    } catch (err) {
      // Ignore
    }
  }
  
  return count > 0 ? totalScore / count : 0;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
`;

const marker = 'return { semantics, useCaseSemantics };';
const idx = content.indexOf(marker);
if (idx === -1) {
  console.error('Marker not found');
  process.exit(1);
}

const afterMarker = idx + marker.length;
// Find the function analyzeCaseStudyContext
const funcIdx = content.indexOf('function analyzeCaseStudyContext', afterMarker);
if (funcIdx === -1) {
  console.error('Function not found');
  process.exit(1);
}

const beforeFunc = content.substring(0, funcIdx);
const afterFunc = content.substring(funcIdx);

const newContent = beforeFunc + insertCode + '\n\n' + afterFunc;
fs.writeFileSync('src/nlp/promptRequirementParser.js', newContent);
console.log('Done');