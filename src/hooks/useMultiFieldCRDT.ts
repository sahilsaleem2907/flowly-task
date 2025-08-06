import { useReducer, useCallback, useEffect, useRef } from 'react';
import type { CRDTState, CRDTAction, CRDTOperation, UserPresence, FieldType } from '../types/CRDT';
import { MultiFieldCRDTEngine } from '../lib/crdt/MultiFieldCRDTEngine';
import { FirebaseService } from '../lib/firebase/FirebaseService';
import type { User } from '../types/User';

// CRDT reducer for multi-field
const crdtReducer = (state: CRDTState, action: CRDTAction): CRDTState => {
    switch (action.type) {
        case 'APPLY_OPERATION':
            // Check if operation already exists to prevent duplicates
            const operationExists = state.operations.some(op => op.id === action.operation.id);
            if (operationExists) {
                return state;
            }
            return {
                ...state,
                operations: [...state.operations, action.operation]
            };

        case 'ADD_PENDING_OPERATION':
            return {
                ...state,
                pendingOperations: [...state.pendingOperations, action.operation]
            };

        case 'SYNC_PENDING_OPERATIONS':
            return {
                ...state,
                pendingOperations: []
            };

        case 'SET_CONNECTION_STATUS':
            return {
                ...state,
                isConnected: action.isConnected
            };

        case 'UPDATE_PARTICIPANTS':
            return {
                ...state,
                participants: action.participants
            };

        case 'SET_CURRENT_USER':
            return {
                ...state,
                currentUser: action.user
            };

        case 'UPDATE_FIELD':
            return {
                ...state,
                fields: {
                    ...state.fields,
                    [action.field]: action.content
                }
            };

        case 'UPDATE_CHARACTERS':
            return {
                ...state,
                characters: new Map(state.characters).set(action.field, action.characters)
            };

        case 'RESET_STATE':
            return {
                documentId: '',
                fields: {
                    content: '',
                    title: '',
                    description: '',
                    tags: ''
                },
                operations: [],
                pendingOperations: [],
                isConnected: false,
                participants: [],
                currentUser: null,
                characters: new Map(),
                bulkState: {
                    isProcessing: false,
                    currentBulkOp: null,
                    pendingOperations: []
                }
            };

        default:
            return state;
    }
};

// Initial state
const initialState: CRDTState = {
    documentId: '',
    fields: {
        content: '',
        title: '',
        description: '',
        tags: ''
    },
    operations: [],
    pendingOperations: [],
    isConnected: false,
    participants: [],
    currentUser: null,
    characters: new Map(),
    bulkState: {
        isProcessing: false,
        currentBulkOp: null,
        pendingOperations: []
    }
};

export const useMultiFieldCRDT = (documentId: string, currentUser: User) => {
    const [state, dispatch] = useReducer(crdtReducer, initialState);

    // Refs for CRDT engine and Firebase service
    const crdtEngineRef = useRef<MultiFieldCRDTEngine | null>(null);
    const firebaseServiceRef = useRef<FirebaseService | null>(null);
    const isInitializedRef = useRef(false);

    // Initialize CRDT engine and Firebase service
    useEffect(() => {
        if (!documentId || !currentUser || isInitializedRef.current) return;



        // Initialize CRDT engine
        crdtEngineRef.current = new MultiFieldCRDTEngine(documentId, currentUser.userId);

        // Initialize Firebase service
        firebaseServiceRef.current = new FirebaseService(documentId, currentUser);

        // Set current user
        dispatch({ type: 'SET_CURRENT_USER', user: currentUser });

        // Start Firebase sync
        if (firebaseServiceRef.current) {
            // First, load all existing operations for state restoration
            firebaseServiceRef.current.loadAllOperations((operation: CRDTOperation) => {
                if (crdtEngineRef.current) {
                    // Apply operation to CRDT engine
                    crdtEngineRef.current.applyOperation(operation);

                    // Update state
                    dispatch({ type: 'APPLY_OPERATION', operation });

                    // Update field content
                    const fieldContent = crdtEngineRef.current.getFieldContent(operation.field);
                    dispatch({ type: 'UPDATE_FIELD', field: operation.field, content: fieldContent });

                    // Update character tracking
                    const fieldCharacters = crdtEngineRef.current.getFieldCharacters(operation.field);
                    dispatch({ type: 'UPDATE_CHARACTERS', field: operation.field, characters: fieldCharacters });
                }
            }).then(() => {
                // After loading all existing operations, start real-time sync
                firebaseServiceRef.current?.startSync(
                    // Handle incoming operations (real-time updates only)
                    (operation: CRDTOperation) => {
                        if (crdtEngineRef.current) {
                            // Apply operation to CRDT engine
                            crdtEngineRef.current.applyOperation(operation);

                            // Update state
                            dispatch({ type: 'APPLY_OPERATION', operation });

                            // Update field content
                            const fieldContent = crdtEngineRef.current.getFieldContent(operation.field);
                            dispatch({ type: 'UPDATE_FIELD', field: operation.field, content: fieldContent });

                            // Update character tracking
                            const fieldCharacters = crdtEngineRef.current.getFieldCharacters(operation.field);
                            dispatch({ type: 'UPDATE_CHARACTERS', field: operation.field, characters: fieldCharacters });
                        }
                    },
                    // Handle user presence changes
                    (participants: UserPresence[]) => {
                        dispatch({ type: 'UPDATE_PARTICIPANTS', participants });
                    }
                );

                // Setup presence management
                firebaseServiceRef.current?.setupPresence();

                // Update all field contents after initial load
                setTimeout(() => {
                    if (crdtEngineRef.current) {
                        // Update all field contents
                        const allContents = crdtEngineRef.current.getAllFieldContents();
                        Object.entries(allContents).forEach(([field, content]) => {
                            dispatch({ type: 'UPDATE_FIELD', field: field as FieldType, content });
                        });

                        // Update all character maps
                        const allCharacters = crdtEngineRef.current.getAllCharacters();
                        allCharacters.forEach((characters, field) => {
                            dispatch({ type: 'UPDATE_CHARACTERS', field, characters });
                        });
                    }
                }, 500);
            });
        }

        isInitializedRef.current = true;
        dispatch({ type: 'SET_CONNECTION_STATUS', isConnected: true });

        // Cleanup on unmount
        return () => {
            firebaseServiceRef.current?.cleanup();
            isInitializedRef.current = false;
            // Reset state to prevent stale data
            dispatch({ type: 'RESET_STATE' });
        };
    }, [documentId, currentUser]);

    // Insert character in a specific field
    const insertChar = useCallback((field: FieldType, char: string, position: number) => {
        if (!crdtEngineRef.current || !firebaseServiceRef.current) {
            console.warn('CRDT not initialized');
            return;
        }

        try {
            // Create operation
            const operation = crdtEngineRef.current.insertChar(field, char, position);

            if (!operation) {
                console.warn('No operation created for insertion');
                return;
            }

            // Add to operations (for history tracking)
            dispatch({ type: 'APPLY_OPERATION', operation });

            // Add to pending operations
            dispatch({ type: 'ADD_PENDING_OPERATION', operation });

            // Update field content
            const fieldContent = crdtEngineRef.current.getFieldContent(field);
            dispatch({ type: 'UPDATE_FIELD', field, content: fieldContent });

            // Update character tracking
            const fieldCharacters = crdtEngineRef.current.getFieldCharacters(field);
            dispatch({ type: 'UPDATE_CHARACTERS', field, characters: fieldCharacters });

            // Broadcast to other users
            firebaseServiceRef.current.broadcastOperation(operation);

        } catch (error) {
            console.error('Error inserting character:', error);
        }
    }, []);

    // Delete character in a specific field
    const deleteChar = useCallback((field: FieldType, position: number) => {
        if (!crdtEngineRef.current || !firebaseServiceRef.current) {
            console.warn('CRDT not initialized');
            return;
        }

        try {

            // Create operation
            const operation = crdtEngineRef.current.deleteChar(field, position);

            if (!operation) {
                console.warn('No operation created for deletion');
                return;
            }


            // Add to operations (for history tracking)
            dispatch({ type: 'APPLY_OPERATION', operation });

            // Add to pending operations
            dispatch({ type: 'ADD_PENDING_OPERATION', operation });

            // Update field content
            const fieldContent = crdtEngineRef.current.getFieldContent(field);
            dispatch({ type: 'UPDATE_FIELD', field, content: fieldContent });

            // Update character tracking
            const fieldCharacters = crdtEngineRef.current.getFieldCharacters(field);
            dispatch({ type: 'UPDATE_CHARACTERS', field, characters: fieldCharacters });

            // Broadcast to other users
            firebaseServiceRef.current.broadcastOperation(operation);

        } catch (error) {
            console.error('Error deleting character:', error);
        }
    }, []);

    // Update user presence
    const updatePresence = useCallback((cursorPosition: number, isTyping: boolean = false, activeField: FieldType = 'content') => {
        if (firebaseServiceRef.current) {
            firebaseServiceRef.current.updatePresence(cursorPosition, isTyping, activeField);
        }
    }, []);

    // Get document URL for sharing
    const getDocumentUrl = useCallback(() => {
        return firebaseServiceRef.current?.getDocumentUrl() || '';
    }, []);



    // Get CRDT statistics
    const getStats = useCallback(() => {
        const stats = crdtEngineRef.current?.getAllStats() || {
            totalOperations: 0,
            insertOperations: 0,
            deleteOperations: 0,
            totalCharacters: 0,
            deletedCharacters: 0,
            bulkOperations: 0,
            fields: {},
            undoRedoStats: {}
        };

        // Transform undoRedoStats to match the expected interface
        const undoRedoStats = stats.undoRedoStats || {};
        const totalUndoStackSize = Object.values(undoRedoStats).reduce((sum: number, fieldStats: any) => sum + (fieldStats.totalUndoSteps || 0), 0);
        const totalRedoStackSize = Object.values(undoRedoStats).reduce((sum: number, fieldStats: any) => sum + (fieldStats.totalRedoSteps || 0), 0);

        return {
            totalOperations: stats.totalOperations,
            insertOperations: stats.insertOperations,
            deleteOperations: stats.deleteOperations,
            totalCharacters: stats.totalCharacters,
            deletedCharacters: stats.deletedCharacters,
            bulkOperations: stats.bulkOperations,
            undoStackSize: totalUndoStackSize,
            redoStackSize: totalRedoStackSize,
            fields: stats.fields
        };
    }, []);

    // Undo last operation for a specific field
    const undo = useCallback((field: FieldType = 'content') => {
        if (!crdtEngineRef.current || !firebaseServiceRef.current) {
            console.warn('CRDT not initialized');
            return;
        }

        try {
            console.log(`🔄 Attempting to undo operations in field: "${field}"`);

            // Perform undo (returns array of operations)
            const undoneOperations = crdtEngineRef.current.undo(field);

            if (!undoneOperations || undoneOperations.length === 0) {
                console.log(`📋 No operations to undo in field "${field}"`);
                return;
            }

            console.log(`📊 Found ${undoneOperations.length} operations to undo for field "${field}"`);

            // Apply each undone operation to the state
            undoneOperations.forEach((operation, index) => {
                console.log(`📝 Applying undo operation ${index + 1}/${undoneOperations.length}: ${operation.type} at position ${operation.position} for field ${operation.field}`);

                // Add to operations (for history tracking)
                dispatch({ type: 'APPLY_OPERATION', operation });

                // Broadcast undo operation to other users
                if (firebaseServiceRef.current) {
                    firebaseServiceRef.current.broadcastOperation(operation);
                }
            });

            // Update field content
            const fieldContent = crdtEngineRef.current.getFieldContent(field);
            console.log(`📄 Field "${field}" content after undo: "${fieldContent}"`);
            dispatch({ type: 'UPDATE_FIELD', field, content: fieldContent });

            // Update character tracking
            const fieldCharacters = crdtEngineRef.current.getFieldCharacters(field);
            dispatch({ type: 'UPDATE_CHARACTERS', field, characters: fieldCharacters });

            console.log(`↩️ Successfully undid ${undoneOperations.length} operations in field "${field}"`);

        } catch (error) {
            console.error('Error undoing operation:', error);
        }
    }, []);

    // Redo last undone operation for a specific field
    const redo = useCallback((field: FieldType = 'content') => {
        if (!crdtEngineRef.current || !firebaseServiceRef.current) {
            console.warn('CRDT not initialized');
            return;
        }

        try {
            console.log(`🔄 Attempting to redo operations in field: "${field}"`);

            // Perform redo (returns array of operations)
            const redoneOperations = crdtEngineRef.current.redo(field);

            if (!redoneOperations || redoneOperations.length === 0) {
                console.log(`📋 No operations to redo in field "${field}"`);
                return;
            }

            console.log(`📊 Found ${redoneOperations.length} operations to redo for field "${field}"`);

            // Apply each redone operation to the state
            redoneOperations.forEach((operation, index) => {
                console.log(`📝 Applying redo operation ${index + 1}/${redoneOperations.length}: ${operation.type} at position ${operation.position} for field ${operation.field}`);

                // Add to operations (for history tracking)
                dispatch({ type: 'APPLY_OPERATION', operation });

                // Broadcast redo operation to other users
                if (firebaseServiceRef.current) {
                    firebaseServiceRef.current.broadcastOperation(operation);
                }
            });

            // Update field content
            const fieldContent = crdtEngineRef.current.getFieldContent(field);
            console.log(`📄 Field "${field}" content after redo: "${fieldContent}"`);
            dispatch({ type: 'UPDATE_FIELD', field, content: fieldContent });

            // Update character tracking
            const fieldCharacters = crdtEngineRef.current.getFieldCharacters(field);
            dispatch({ type: 'UPDATE_CHARACTERS', field, characters: fieldCharacters });

            console.log(`↪️ Successfully redid ${redoneOperations.length} operations in field "${field}"`);

        } catch (error) {
            console.error('Error redoing operation:', error);
        }
    }, []);

    // Check if undo is available for a specific field
    const canUndo = useCallback((field: FieldType = 'content') => {
        return crdtEngineRef.current?.canUndo(field) || false;
    }, []);

    // Check if redo is available for a specific field
    const canRedo = useCallback((field: FieldType = 'content') => {
        return crdtEngineRef.current?.canRedo(field) || false;
    }, []);

    // Rebuild content (for debugging)
    const rebuildContent = useCallback((field: FieldType = 'content') => {
        if (crdtEngineRef.current) {
            const fieldContent = crdtEngineRef.current.getFieldContent(field);
            dispatch({ type: 'UPDATE_FIELD', field, content: fieldContent });

            const fieldCharacters = crdtEngineRef.current.getFieldCharacters(field);
            dispatch({ type: 'UPDATE_CHARACTERS', field, characters: fieldCharacters });
        }
    }, []);

    // Test undo/redo functionality (for debugging)
    const testUndoRedo = useCallback((field: FieldType = 'content') => {
        if (crdtEngineRef.current) {
            crdtEngineRef.current.testUndoRedo(field);
        }
    }, []);

    // Force finalize all pending batches
    const finalizeBatches = useCallback(() => {
        if (crdtEngineRef.current) {
            crdtEngineRef.current.finalizeAllBatches();
        }
    }, []);

    return {
        // State
        fields: state.fields,
        participants: state.participants,
        isConnected: state.isConnected,
        pendingOperations: state.pendingOperations,
        operations: state.operations,
        characters: state.characters,
        bulkState: state.bulkState,

        // Actions
        insertChar,
        deleteChar,
        updatePresence,
        getDocumentUrl,
        getStats,
        rebuildContent,
        undo,
        redo,
        canUndo,
        canRedo,
        testUndoRedo,
        finalizeBatches,

        // Current user
        currentUser: state.currentUser
    };
}; 