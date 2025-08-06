import { CRDTEngine } from './CRDTEngine';
import { UndoRedoManager } from './UndoRedoManager';
import type { CRDTOperation, FieldType, CRDTChar, InsertOperation, DeleteOperation } from '../../types/CRDT';

// Field-specific state
interface FieldState {
    content: string;
    characters: Map<string, CRDTChar>;
    operations: CRDTOperation[];
}

export class MultiFieldCRDTEngine {
    private engines: Map<FieldType, CRDTEngine> = new Map();
    private fieldStates: Map<FieldType, FieldState> = new Map();
    private undoRedoManager: UndoRedoManager;
    private documentId: string;
    private clientId: string;

    constructor(documentId: string, clientId: string) {
        this.documentId = documentId;
        this.clientId = clientId;

        // Initialize CRDT engines and field states for each field
        this.initializeEngines();

        // Initialize undo/redo manager
        this.undoRedoManager = new UndoRedoManager(clientId, documentId, {
            batchTimeout: 1000, // 1 second batching
            maxUndoSteps: 50,
            enableBatching: true
        });
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
                operations: []
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

            // Track operation for undo/redo
            this.undoRedoManager.trackOperation(operation);

            console.log(`📝 Tracked operation for ${field}: ${operation.type} at position ${operation.position}`);
        }
    }

    // Apply operation to the correct field
    applyOperation(operation: CRDTOperation): void {
        const engine = this.engines.get(operation.field);
        if (!engine) {
            console.warn(`No CRDT engine found for field: ${operation.field}`);
            return;
        }

        // Pass operation directly to the correct engine
        // The single-field engine will handle the operation appropriately
        engine.applyOperation(operation);

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



    // Undo operation for a specific field
    undo(field: FieldType): CRDTOperation[] | null {
        const inverseOperations = this.undoRedoManager.undo(field);

        if (inverseOperations) {
            // Apply inverse operations to CRDT engines
            inverseOperations.forEach(operation => {
                this.applyOperation(operation);
            });

            console.log(`↩️ Undid ${inverseOperations.length} operations for ${field}`);
        }

        return inverseOperations;
    }

    // Redo operation for a specific field
    redo(field: FieldType): CRDTOperation[] | null {
        const redoOperations = this.undoRedoManager.redo(field);

        if (redoOperations) {
            // Apply redo operations to CRDT engines
            redoOperations.forEach(operation => {
                this.applyOperation(operation);
            });

            console.log(`↪️ Redid ${redoOperations.length} operations for ${field}`);
        }

        return redoOperations;
    }

    // Check if undo is available for a specific field
    canUndo(field: FieldType): boolean {
        return this.undoRedoManager.canUndo(field);
    }

    // Check if redo is available for a specific field
    canRedo(field: FieldType): boolean {
        return this.undoRedoManager.canRedo(field);
    }

    // Get statistics for a specific field
    getFieldStats(field: FieldType) {
        const engine = this.engines.get(field);
        const fieldState = this.fieldStates.get(field);
        const undoRedoStats = this.undoRedoManager.getStats(field);

        if (!engine || !fieldState) {
            console.warn(`No CRDT engine found for field: ${field}`);
            return {
                totalOperations: 0,
                insertOperations: 0,
                deleteOperations: 0,
                totalCharacters: 0,
                deletedCharacters: 0,
                bulkOperations: 0,
                ...undoRedoStats
            };
        }

        const engineStats = engine.getStats();
        return {
            ...engineStats,
            ...undoRedoStats
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
            fields: {} as Record<FieldType, any>,
            undoRedoStats: this.undoRedoManager.getAllStats()
        };

        this.engines.forEach((_engine, field) => {
            const fieldStats = this.getFieldStats(field);
            allStats.fields[field] = fieldStats;

            // Aggregate totals
            allStats.totalOperations += fieldStats.totalOperations;
            allStats.insertOperations += fieldStats.insertOperations;
            allStats.deleteOperations += fieldStats.deleteOperations;
            allStats.totalCharacters += fieldStats.totalCharacters;
            allStats.deletedCharacters += fieldStats.deletedCharacters;
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

        // Debug undo/redo state
        this.undoRedoManager.debugState(field);

        engine.debugState();
    }

    // Debug state for all fields
    debugAllStates(): void {
        console.log('🔍 Debug state for all fields:');
        this.engines.forEach((_engine, field) => {
            console.log(`\n--- Field: ${field} ---`);
            this.debugFieldState(field);
        });
    }

    // Reset all fields
    reset(): void {
        this.engines.forEach(_engine => {
            _engine.reset();
        });

        // Reset field states
        this.fieldStates.forEach((fieldState, _field) => {
            fieldState.content = '';
            fieldState.characters.clear();
            fieldState.operations = [];
        });

        // Reset undo/redo manager
        this.undoRedoManager.reset();
    }

    // Get undo/redo stack info for debugging
    getUndoRedoInfo(field: FieldType): { undoCount: number; redoCount: number } {
        const stats = this.undoRedoManager.getStats(field);
        return {
            undoCount: stats.totalUndoSteps,
            redoCount: stats.totalRedoSteps
        };
    }

    // Get undo/redo manager for advanced operations
    getUndoRedoManager(): UndoRedoManager {
        return this.undoRedoManager;
    }

    // Force finalize all pending batches
    finalizeAllBatches(): void {
        this.undoRedoManager.finalizeAllBatches();
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
        console.log(`↩️ Can undo: ${this.canUndo(field)}`);

        // Wait for batch to finalize
        setTimeout(() => {
            // Undo last batch
            this.undo(field);
            console.log(`📝 After undo: "${this.getFieldContent(field)}"`);
            console.log(`↩️ Can undo: ${this.canUndo(field)}`);
            console.log(`↪️ Can redo: ${this.canRedo(field)}`);

            // Redo
            this.redo(field);
            console.log(`📝 After redo: "${this.getFieldContent(field)}"`);
            console.log(`↩️ Can undo: ${this.canUndo(field)}`);
            console.log(`↪️ Can redo: ${this.canRedo(field)}`);

            // Test multiple undos and redos
            console.log(`\n🧪 Testing multiple undos and redos:`);

            // Undo 2 more times
            this.undo(field);
            this.undo(field);
            console.log(`📝 After 2 more undos: "${this.getFieldContent(field)}"`);

            // Redo 2 times
            this.redo(field);
            this.redo(field);
            console.log(`📝 After 2 redos: "${this.getFieldContent(field)}"`);

            // Final undo
            this.undo(field);
            console.log(`📝 After final undo: "${this.getFieldContent(field)}"`);
        }, 1100); // Wait for batch timeout
    }
} 