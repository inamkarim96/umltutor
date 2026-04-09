export const STOP_WORDS = [
    'the', 'a', 'an', 'and', 'is', 'are', 'to', 'of', 'in', 'on',
    'for', 'with', 'by', 'at', 'from', 'into', 'their', 'its', 'it',
    'this', 'that', 'has', 'have', 'was', 'will', 'should', 'can',
    'then', 'after', 'before', 'when', 'if', 'or', 'be', 'as'
];

export const VERB_DICTIONARY = [
    'Create',
    'Add',
    'Update',
    'Delete',
    'Register',
    'Login',
    'Logout',
    'View',
    'Search',
    'Generate',
    'Submit',
    'Process',
    'Send',
    'Receive',
    'Manage',
    'Book',
    'Place',
    'Track',
    'Upload',
    'Download',
    'Approve',
    'Reject',
    'Withdraw',
    'Purchase',
    'Make'
];

/**
 * Validates a Use Case name based on grammatical rules:
 * 1. Must contain at least two words.
 * 2. First word must be a verb from the dictionary.
 * 3. must contain an object/noun after the verb.
 * 
 * @param {string} name - The Use Case name to validate
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export const validateUseCaseName = (name) => {
    if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Use case name is required.' };
    }

    const words = name.trim().split(/\s+/);

    if (words.length < 2) {
        return {
            isValid: false,
            error: 'Use case name must contain a verb followed by an object.'
        };
    }

    const firstWord = words[0];
    const isFirstWordVerb = VERB_DICTIONARY.some(
        verb => verb.toLowerCase() === firstWord.toLowerCase()
    );

    if (!isFirstWordVerb) {
        return {
            isValid: false,
            error: 'Use case name must start with a verb.'
        };
    }

    // If there are at least two words and the first is a verb, we assume the rest is the object/noun
    // as per the simplified logic provided.
    return { isValid: true, error: null };
};

/**
 * Validates an Actor name:
 * 1. Actor name must not be "system" or contain "system".
 * 
 * @param {string} name - The Actor name to validate
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export const validateActorName = (name) => {
    if (!name || typeof name !== 'string') {
        return { isValid: false, error: 'Actor name is required.' };
    }

    const normalizedName = name.toLowerCase().trim();
    if (normalizedName === 'system' || normalizedName.includes('system')) {
        return {
            isValid: false,
            error: 'Actor name cannot be "System".'
        };
    }

    return { isValid: true, error: null };
};

/**
 * Validates if a text input is a proper sentence (or multiple sentences).
 * Used for Preconditions, Postconditions, and Scenario Steps.
 * 
 * Rules:
 * 1. Minimum 10 characters.
 * 2. Minimum 3 words.
 * 3. Starts with an alphabetic character (capital or small).
 * 4. Must contain at least one vowel (basic gibberish check).
 * 
 * @param {string} text - The text to validate
 * @returns {Object} { isValid: boolean, error: string | null }
 */
export const validateSentence = (text) => {
    if (!text || typeof text !== 'string') {
        return { isValid: false, error: 'Content is missing.' };
    }

    const trimmed = text.trim();
    if (trimmed.length < 10) {
        return { 
            isValid: false, 
            error: 'Content is too short (minimum 10 characters).' 
        };
    }

    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) {
        return { 
            isValid: false, 
            error: 'Please provide a complete sentence (at least 3 words).' 
        };
    }

    // Check if starts with a letter (capital or small)
    if (!/^[a-zA-Z]/.test(trimmed)) {
        return { 
            isValid: false, 
            error: 'Sentence must start with a letter.' 
        };
    }

    // Basic gibberish check: must contain at least one vowel
    if (!/[aeiouyAEIOUY]/.test(trimmed)) {
        return { 
            isValid: false, 
            error: 'Content seems invalid or meaningless.' 
        };
    }

    return { isValid: true, error: null };
};
