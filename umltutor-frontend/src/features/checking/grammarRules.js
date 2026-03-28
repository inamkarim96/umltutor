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
