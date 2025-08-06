import type { User } from './User';

// CRDT Operation Types
export type OperationType = 'insert' | 'delete';

// Field Types
export type FieldType = 'content' | 'title' | 'description' | 'tags';

// Character with unique ID for tombstone tracking
export interface CRDTChar {
    id: string;
    char: string;
    position: string; // Fractional position instead of number
    clientId: string;
    deleted: boolean; // Tombstone flag
}

export interface CRDTOperation {
    id: string;
    type: OperationType;
    field: FieldType; // Which field this operation affects
    position: string; // Fractional position
    char?: string; // For insert operations
    charId?: string; // For delete operations
    clientId: string;
    documentId: string;
    timestamp: number; // When the operation was created
}

export interface InsertOperation extends CRDTOperation {
    type: 'insert';
    char: string;
}

export interface DeleteOperation extends CRDTOperation {
    type: 'delete';
    charId: string; // ID of character being deleted
    char: string; // Character being deleted (for reference)
}

// Document State
export interface DocumentState {
    id: string;
    title: string;
    content: string;
    description?: string;
    tags?: string[];
    operations: CRDTOperation[];
    lastModified: number;
    participants: User[];
}

// User Presence
export interface UserPresence {
    userId: string;
    user: User;
    cursorPosition: number;
    activeField?: FieldType; // Which field the user is currently editing
    fieldCursorPositions?: Record<FieldType, number>; // Cursor positions for each field
    selectionStart?: number;
    selectionEnd?: number;
    isOnline: boolean;
    isTyping: boolean;
    lastSeen: number;
}

// CRDT State Management
export interface CRDTState {
    documentId: string;
    // Multi-field content
    fields: {
        content: string;
        title: string;
        description: string;
        tags: string;
    };
    operations: CRDTOperation[];
    pendingOperations: CRDTOperation[];
    isConnected: boolean;
    participants: UserPresence[];
    currentUser: User | null;
    // Character tracking for tombstone approach (per field)
    characters: Map<FieldType, Map<string, CRDTChar>>;
    bulkState: {
        isProcessing: boolean;
        currentBulkOp: any;
        pendingOperations: any[];
    };
}

// CRDT Actions
export type CRDTAction =
    | { type: 'APPLY_OPERATION'; operation: CRDTOperation }
    | { type: 'ADD_PENDING_OPERATION'; operation: CRDTOperation }
    | { type: 'SYNC_PENDING_OPERATIONS' }
    | { type: 'SET_CONNECTION_STATUS'; isConnected: boolean }
    | { type: 'UPDATE_PARTICIPANTS'; participants: UserPresence[] }
    | { type: 'SET_CURRENT_USER'; user: User }
    | { type: 'UPDATE_FIELD'; field: FieldType; content: string }
    | { type: 'UPDATE_CHARACTERS'; field: FieldType; characters: Map<string, CRDTChar> }
    | { type: 'RESET_STATE' };

// Firebase Document Structure
export interface FirebaseDocument {
    metadata: {
        title: string;
        lastModified: number;
        participants: string[];
    };
    operations: Record<string, CRDTOperation>;
}

// Fractional Position Utilities
export const generatePosition = (prevPos: string | null = null, nextPos: string | null = null, clientId: string = ''): string => {
    console.log(`🔧 generatePosition called with: prevPos=${prevPos}, nextPos=${nextPos}, clientId=${clientId}`);

    if (!prevPos && !nextPos) {
        // First character
        const result = `1.0.${clientId}`;
        console.log(`🔧 First character, generated: ${result}`);
        return result;
    }

    if (!prevPos) {
        // Insert at beginning
        const result = generateBefore(nextPos!, clientId);
        console.log(`🔧 Insert at beginning, generated: ${result}`);
        return result;
    }

    if (!nextPos) {
        // Insert at end
        const result = generateAfter(prevPos, clientId);
        console.log(`🔧 Insert at end, generated: ${result}`);
        return result;
    }

    // Insert between two positions
    const result = generateBetween(prevPos, nextPos, clientId);
    console.log(`🔧 Insert between ${prevPos} and ${nextPos}, generated: ${result}`);
    return result;
};

const generateBetween = (prev: string, next: string, clientId: string): string => {
    console.log(`🔧 generateBetween called with: prev=${prev}, next=${next}, clientId=${clientId}`);

    // Extract the numeric parts
    const prevNum = parseFloat(prev.split('.')[0]);
    const nextNum = parseFloat(next.split('.')[0]);

    console.log(`🔧 Numeric parts: prevNum=${prevNum}, nextNum=${nextNum}`);

    // Calculate the midpoint numerically
    const midNum = prevNum + (nextNum - prevNum) / 2;
    console.log(`🔧 Midpoint number: ${midNum}`);

    // Use clientId for deterministic ordering
    const result = `${midNum}.${clientId}`;
    console.log(`🔧 Final result: ${result}`);
    return result;
};



const generateBefore = (pos: string, clientId: string): string => {
    const parts = pos.split('.');
    const num = parseFloat(parts[0]);
    return `${num - 1}.0.${clientId}`;
};

const generateAfter = (pos: string, clientId: string): string => {
    const parts = pos.split('.');
    const num = parseFloat(parts[0]);
    return `${num + 1}.0.${clientId}`;
};



export const comparePositions = (a: string, b: string): number => {
    const aParts = a.split('.');
    const bParts = b.split('.');

    // Extract numeric parts for comparison
    const aNum = parseFloat(aParts[0]);
    const bNum = parseFloat(bParts[0]);

    if (aNum !== bNum) {
        return aNum - bNum;
    }

    // If numeric parts are the same, compare lexicographically
    // This handles cases where positions have different sub-parts
    return a.localeCompare(b);
};

export const generateOperationId = (clientId: string): string => {
    return `${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const generateCharId = (clientId: string): string => {
    return `char_${clientId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Undo/Redo System Types
export interface UndoStep {
    id: string;
    operations: CRDTOperation[];
    timestamp: number;
    userId: string;
    field: FieldType;
    description?: string; // Human-readable description of the action
}

export interface UndoRedoState {
    undoStack: UndoStep[];
    redoStack: UndoStep[];
    currentBatch: CRDTOperation[] | null;
    batchStartTime: number | null;
    batchTimeout: number | null;
}

export interface UndoRedoMetadata {
    isLocalOperation: boolean;
    originalOperation?: CRDTOperation; // For tracking inverse operations
    batchId?: string; // For grouping operations into undo steps
}

// Enhanced CRDTOperation with undo/redo metadata
export interface CRDTOperationWithMetadata extends CRDTOperation {
    metadata?: UndoRedoMetadata;
}

// Undo/Redo Configuration
export interface UndoRedoConfig {
    batchTimeout: number; // Time in ms to wait before creating a new batch
    maxUndoSteps: number; // Maximum number of undo steps to keep
    enableBatching: boolean; // Whether to enable operation batching
}

// Undo/Redo Statistics
export interface UndoRedoStats {
    totalUndoSteps: number;
    totalRedoSteps: number;
    currentBatchSize: number;
    lastOperationTime: number;
    averageBatchSize: number;
} 
