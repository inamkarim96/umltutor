



/**
 * The unified UMLModel represents the complete state of a modeling assignment.
 * It is used for both LocalStorage (Guest) and Backend (Authenticated) persistence.
 */























/**
 * Initial empty model template
 */
export const createEmptyModel = (id = 'guest-default', title = 'New UML Project') => ({
    id,
    title,
    diagram: { nodes: [], edges: [] },
    descriptions: {},
    ssds: {},
    updatedAt: new Date().toISOString(),
    version: 1
});
