import { CRDTEngine } from './CRDTEngine';
import type { CRDTOperation, FieldType, CRDTChar, InsertOperation, DeleteOperation } from '../../types/CRDT';
import { generateOperationId } from '../../types/CRDT';

// Undo/Redo stack for each field
interface UndoRedoStack {
    undoStack: CRDTOperation[];
    redoStack: CRDTOperation[];
}

// Field-specific state
interface FieldState {
    content: string;
    characters: Map<string, CRDTChar>;
    operations: CRDTOperation[];
    undoRedoStack: UndoRedoStack;
}

export class MultiFieldCRDTEngine {
    private engines: Map<FieldType, CRDTEngine> = new Map();
    private fieldStates: Map<FieldType, FieldState> = new Map();
    private documentId: string;
    private clientId: string;

    constructor(documentId: string, clientId: string) {
        this.documentId = documentId;
        this.clientId = clientId;

        // Initialize CRDT engines and field states for each field
        this.initializeEngines();
    }

    private initializeEngines(): void {
        const fields: FieldType[] = ['content', 'title', 'description', 'tags'];

        fields.forEach(field => {
            // Initialize CRDT engine
            this.engines.set(field, new CRDTEngine(this.documentId, this.clientId));

            // Initialize field state
            this.fieldStates.set(field, {
                content: '',
                characters: new Map(),
                operations: [],
                undoRedoStack: {
                    undoStack: [],
                    redoStack: []
                }
            });
        });
    }

    // Insert character in a specific field
    insertChar(field: FieldType, char: string, position: number): CRDTOperation | null {
        const engine = this.engines.get(field);
        if (!engine) {
            console.warn(`No CRDT engine found for field: ${field}`);
            return null;
        }

        const operation = engine.insertChar(char, position);
        if (operation) {
            // Add field information to the operation
            const fieldOperation: InsertOperation = {
                ...operation,
                field,
                timestamp: Date.now()
            };

            // Track operation in field state
            this.trackOperation(field, fieldOperation);

            return fieldOperation;
        }
        return null;
    }

    // Delete character in a specific field
    deleteChar(field: FieldType, position: number): CRDTOperation | null {
        const engine = this.engines.get(field);
        if (!engine) {
            console.warn(`No CRDT engine found for field: ${field}`);
            return null;
        }

        const operation = engine.deleteChar(position);
        if (operation) {
            // Add field information to the operation
            const fieldOperation: DeleteOperation = {
                ...operation,
                field,
                timestamp: Date.now()
            };

            // Track operation in field state
            this.trackOperation(field, fieldOperation);

            return fieldOperation;
        }
        return null;
    }

    // Track operation for undo/redo (only for current user's operations)
    private trackOperation(field: FieldType, operation: CRDTOperation): void {
        const fieldState = this.fieldStates.get(field);
        if (!fieldState) return;

        // Only track operations from current user
        if (operation.clientId === this.clientId) {
            // Add to operation history
            fieldState.operations.push(operation);

            // Add to undo stack
            fieldState.undoRedoStack.undoStack.push(operation);

            // Clear redo stack when new operation is performed
            fieldState.undoRedoStack.redoStack = [];

            console.log(`📝 Tracked operation for ${field}: ${operation.type} at position ${operation.position} (undo stack: ${fieldState.undoRedoStack.undoStack.length})`);
        }
    }

    // Apply operation to the correct field
    applyOperation(operation: CRDTOperation): void {
        const engine = this.engines.get(operation.field);
        if (!engine) {
            console.warn(`No CRDT engine found for field: ${operation.field}`);
            return;
        }

        // Remove field from operation before passing to single-field engine
        const { field, ...operationWithoutField } = operation;
        // Add the field property back since CRDTEngine expects it
        const operationWithField = { ...operationWithoutField, field: 'content' as FieldType };
        engine.applyOperation(operationWithField);

        // Update field state
        this.updateFieldState(operation.field);
    }

    // Update field state after operation
    private updateFieldState(field: FieldType): void {
        const engine = this.engines.get(field);
        const fieldState = this.fieldStates.get(field);

        if (!engine || !fieldState) return;

        // Update content and characters
        fieldState.content = engine.getVisibleContent();
        fieldState.characters = engine.getCharacters();
    }

    // Get content for a specific field
    getFieldContent(field: FieldType): string {
        const engine = this.engines.get(field);
        if (!engine) {
            console.warn(`No CRDT engine found for field: ${field}`);
            return '';
        }
        return engine.getVisibleContent();
    }

    // Get all field contents
    getAllFieldContents(): Record<FieldType, string> {
        const contents: Record<FieldType, string> = {} as Record<FieldType, string>;

        this.engines.forEach((engine, field) => {
            contents[field] = engine.getVisibleContent();
        });

        return contents;
    }

    // Get characters for a specific field
    getFieldCharacters(field: FieldType): Map<string, CRDTChar> {
        const engine = this.engines.get(field);
        if (!engine) {
            console.warn(`No CRDT engine found for field: ${field}`);
            return new Map();
        }
        return engine.getCharacters();
    }

    // Get all characters organized by field
    getAllCharacters(): Map<FieldType, Map<string, CRDTChar>> {
        const allCharacters = new Map<FieldType, Map<string, CRDTChar>>();

        this.engines.forEach((engine, field) => {
            allCharacters.set(field, engine.getCharacters());
        });

        return allCharacters;
    }

    // Generate inverse operation for undo/redo
    private generateInverseOperation(originalOperation: CRDTOperation): CRDTOperation {
        if (originalOperation.type === 'insert') {
            // Insert -> Delete
            const insertOp = originalOperation as InsertOperation;
            return {
                id: generateOperationId(this.clientId),
                type: 'delete',
                field: insertOp.field,
                position: insertOp.position,
                charId: `undo_${insertOp.id}`, // Special ID for undo operations
                char: insertOp.char,
                clientId: this.clientId,
                documentId: this.documentId,
                timestamp: Date.now()
            } as DeleteOperation;
        } else {
            // Delete -> Insert
            const deleteOp = originalOperation as DeleteOperation;
            return {
                id: generateOperationId(this.clientId),
                type: 'insert',
                field: deleteOp.field,
                position: deleteOp.position,
                char: deleteOp.char,
                clientId: this.clientId,
                documentId: this.documentId,
                timestamp: Date.now()
            } as InsertOperation;
        }
    }

    // Undo operation for a specific field
    undo(field: FieldType): CRDTOperation | null {
        const fieldState = this.fieldStates.get(field);
        if (!fieldState || fieldState.undoRedoStack.undoStack.length === 0) {
            console.log(`📋 No operations to undo for field: ${field}`);
            return null;
        }

        // Get the last operation from undo stack
        const lastOperation = fieldState.undoRedoStack.undoStack.pop()!;

        // Generate inverse operation
        const inverseOperation = this.generateInverseOperation(lastOperation);

        // Apply the inverse operation to the CRDT engine
        const engine = this.engines.get(field);
        if (engine) {
            // Remove field from operation before passing to single-field engine
            const { field: _, ...operationWithoutField } = inverseOperation;
            const operationWithField = { ...operationWithoutField, field: 'content' as FieldType };
            engine.applyOperation(operationWithField);

            // Update field state
            this.updateFieldState(field);
        }

        // Move operation to redo stack
        fieldState.undoRedoStack.redoStack.push(lastOperation);

        console.log(`↩️ Undid operation for ${field}: ${lastOperation.type} -> ${inverseOperation.type}`);
        return inverseOperation;
    }

    // Redo operation for a specific field
    redo(field: FieldType): CRDTOperation | null {
        const fieldState = this.fieldStates.get(field);
        if (!fieldState || fieldState.undoRedoStack.redoStack.length === 0) {
            console.log(`📋 No operations to redo for field: ${field}`);
            return null;
        }

        // Get the last operation from redo stack
        const lastOperation = fieldState.undoRedoStack.redoStack.pop()!;

        // Create a new operation with a new ID for redo
        const redoOperation = {
            ...lastOperation,
            id: generateOperationId(this.clientId), // Generate new ID to avoid duplicate check
            timestamp: Date.now()
        };

        // Apply the redo operation to the CRDT engine
        const engine = this.engines.get(field);
        if (engine) {
            // Remove field from operation before passing to single-field engine
            const { field: _, ...operationWithoutField } = redoOperation;
            const operationWithField = { ...operationWithoutField, field: 'content' as FieldType };
            engine.applyOperation(operationWithField);

            // Update field state
            this.updateFieldState(field);
        }

        // Move operation back to undo stack (with new ID)
        fieldState.undoRedoStack.undoStack.push(redoOperation);

        console.log(`↪️ Redid operation for ${field}: ${lastOperation.type} -> ${redoOperation.type} (new ID: ${redoOperation.id})`);
        return redoOperation;
    }

    // Check if undo is available for a specific field
    canUndo(field: FieldType): boolean {
        const fieldState = this.fieldStates.get(field);
        return fieldState ? fieldState.undoRedoStack.undoStack.length > 0 : false;
    }

    // Check if redo is available for a specific field
    canRedo(field: FieldType): boolean {
        const fieldState = this.fieldStates.get(field);
        return fieldState ? fieldState.undoRedoStack.redoStack.length > 0 : false;
    }

    // Get statistics for a specific field
    getFieldStats(field: FieldType) {
        const engine = this.engines.get(field);
        const fieldState = this.fieldStates.get(field);

        if (!engine || !fieldState) {
            console.warn(`No CRDT engine found for field: ${field}`);
            return {
                totalOperations: 0,
                insertOperations: 0,
                deleteOperations: 0,
                totalCharacters: 0,
                deletedCharacters: 0,
                bulkOperations: 0,
                undoStackSize: 0,
                redoStackSize: 0
            };
        }

        const engineStats = engine.getStats();
        return {
            ...engineStats,
            undoStackSize: fieldState.undoRedoStack.undoStack.length,
            redoStackSize: fieldState.undoRedoStack.redoStack.length
        };
    }

    // Get combined statistics across all fields
    getAllStats() {
        const allStats = {
            totalOperations: 0,
            insertOperations: 0,
            deleteOperations: 0,
            totalCharacters: 0,
            deletedCharacters: 0,
            bulkOperations: 0,
            undoStackSize: 0,
            redoStackSize: 0,
            fields: {} as Record<FieldType, any>
        };

        this.engines.forEach((engine, field) => {
            const fieldStats = this.getFieldStats(field);
            allStats.fields[field] = fieldStats;

            // Aggregate totals
            allStats.totalOperations += fieldStats.totalOperations;
            allStats.insertOperations += fieldStats.insertOperations;
            allStats.deleteOperations += fieldStats.deleteOperations;
            allStats.totalCharacters += fieldStats.totalCharacters;
            allStats.deletedCharacters += fieldStats.deletedCharacters;
            allStats.undoStackSize += fieldStats.undoStackSize;
            allStats.redoStackSize += fieldStats.redoStackSize;
        });

        return allStats;
    }

    // Debug state for a specific field
    debugFieldState(field: FieldType): void {
        const engine = this.engines.get(field);
        const fieldState = this.fieldStates.get(field);

        if (!engine || !fieldState) {
            console.warn(`No CRDT engine found for field: ${field}`);
            return;
        }

        console.log(`🔍 Debug state for field: ${field}`);
        console.log(`📝 Content: "${fieldState.content}"`);
        console.log(`📊 Operations: ${fieldState.operations.length}`);
        console.log(`↩️ Undo stack: ${fieldState.undoRedoStack.undoStack.length}`);
        console.log(`↪️ Redo stack: ${fieldState.undoRedoStack.redoStack.length}`);
        engine.debugState();
    }

    // Debug state for all fields
    debugAllStates(): void {
        console.log('🔍 Debug state for all fields:');
        this.engines.forEach((engine, field) => {
            console.log(`\n--- Field: ${field} ---`);
            this.debugFieldState(field);
        });
    }

    // Reset all fields
    reset(): void {
        this.engines.forEach(engine => {
            engine.reset();
        });

        // Reset field states
        this.fieldStates.forEach((fieldState, field) => {
            fieldState.content = '';
            fieldState.characters.clear();
            fieldState.operations = [];
            fieldState.undoRedoStack.undoStack = [];
            fieldState.undoRedoStack.redoStack = [];
        });
    }

    // Get undo/redo stack info for debugging
    getUndoRedoInfo(field: FieldType): { undoCount: number; redoCount: number } {
        const fieldState = this.fieldStates.get(field);
        if (!fieldState) {
            return { undoCount: 0, redoCount: 0 };
        }

        return {
            undoCount: fieldState.undoRedoStack.undoStack.length,
            redoCount: fieldState.undoRedoStack.redoStack.length
        };
    }

    // Test undo/redo functionality
    testUndoRedo(field: FieldType): void {
        console.log(`🧪 Testing undo/redo for field: ${field}`);

        // Insert some characters
        this.insertChar(field, 'H', 0);
        this.insertChar(field, 'e', 1);
        this.insertChar(field, 'l', 2);
        this.insertChar(field, 'l', 3);
        this.insertChar(field, 'o', 4);

        console.log(`📝 After insert: "${this.getFieldContent(field)}"`);
        console.log(`↩️ Undo stack: ${this.getUndoRedoInfo(field).undoCount}`);

        // Undo last character
        this.undo(field);
        console.log(`📝 After undo: "${this.getFieldContent(field)}"`);
        console.log(`↩️ Undo stack: ${this.getUndoRedoInfo(field).undoCount}`);
        console.log(`↪️ Redo stack: ${this.getUndoRedoInfo(field).redoCount}`);

        // Redo
        this.redo(field);
        console.log(`📝 After redo: "${this.getFieldContent(field)}"`);
        console.log(`↩️ Undo stack: ${this.getUndoRedoInfo(field).undoCount}`);
        console.log(`↪️ Redo stack: ${this.getUndoRedoInfo(field).redoCount}`);

        // Test multiple undos and redos
        console.log(`\n🧪 Testing multiple undos and redos:`);

        // Undo 2 more characters
        this.undo(field);
        this.undo(field);
        console.log(`📝 After 2 more undos: "${this.getFieldContent(field)}"`);

        // Redo 2 characters
        this.redo(field);
        this.redo(field);
        console.log(`📝 After 2 redos: "${this.getFieldContent(field)}"`);

        // Final undo
        this.undo(field);
        console.log(`📝 After final undo: "${this.getFieldContent(field)}"`);
    }
} 