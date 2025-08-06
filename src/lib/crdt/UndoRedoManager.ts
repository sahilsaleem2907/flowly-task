import type {
    CRDTOperation,
    InsertOperation,
    DeleteOperation,
    FieldType,
    UndoStep,
    UndoRedoState,
    UndoRedoMetadata,
    UndoRedoConfig,
    UndoRedoStats
} from '../../types/CRDT';
import { generateOperationId } from '../../types/CRDT';

/**
 * UndoRedoManager handles all undo/redo functionality for CRDT operations
 * 
 * Key Features:
 * - Batching of operations (e.g., typing "hello" counts as one undo step)
 * - Per-user undo/redo stacks
 * - Soft deletion with tombstone flags
 * - Conflict resolution for concurrent changes
 * - Deterministic operation ordering
 */
export class UndoRedoManager {
    private undoRedoStates: Map<FieldType, UndoRedoState> = new Map();
    private config: UndoRedoConfig;
    private userId: string;
    private documentId: string;

    constructor(userId: string, documentId: string, config: Partial<UndoRedoConfig> = {}) {
        this.userId = userId;
        this.documentId = documentId;

        // Default configuration
        this.config = {
            batchTimeout: 1000, // 1 second
            maxUndoSteps: 50,
            enableBatching: true,
            ...config
        };

        // Initialize undo/redo states for all fields
        this.initializeStates();
    }

    /**
     * Initialize undo/redo states for all fields
     */
    private initializeStates(): void {
        const fields: FieldType[] = ['content', 'title', 'description', 'tags'];

        fields.forEach(field => {
            this.undoRedoStates.set(field, {
                undoStack: [],
                redoStack: [],
                currentBatch: null,
                batchStartTime: null,
                batchTimeout: null
            });
        });
    }

    /**
     * Track a new operation for undo/redo
     * Only tracks operations from the current user
     */
    trackOperation(operation: CRDTOperation): void {
        // Only track local user operations
        if (operation.clientId !== this.userId) {
            return;
        }

        const field = operation.field;
        const state = this.undoRedoStates.get(field);
        if (!state) {
            console.warn(`No undo/redo state found for field: ${field}`);
            return;
        }

        // Add metadata to operation
        const operationWithMetadata: CRDTOperation & { metadata?: UndoRedoMetadata } = {
            ...operation,
            metadata: {
                isLocalOperation: true,
                batchId: this.getCurrentBatchId(field)
            }
        };

        // Add to current batch or create new batch
        if (this.config.enableBatching && this.shouldBatchOperation(field, operation)) {
            this.addToBatch(field, operationWithMetadata);
        } else {
            this.createNewBatch(field, [operationWithMetadata]);
        }

        // Clear redo stack when new operation is performed
        this.clearRedoStack(field);

        console.log(`📝 Tracked operation for ${field}: ${operation.type} at position ${operation.position}`);
    }

    /**
     * Check if operation should be batched with current batch
     */
    private shouldBatchOperation(field: FieldType, operation: CRDTOperation): boolean {
        const state = this.undoRedoStates.get(field);
        if (!state || !state.currentBatch) {
            return false;
        }

        // Check if within batch timeout
        if (state.batchStartTime && Date.now() - state.batchStartTime > this.config.batchTimeout) {
            return false;
        }

        // Check if operation is similar to last operation in batch
        const lastOperation = state.currentBatch[state.currentBatch.length - 1];
        if (!lastOperation) {
            return true;
        }

        // Batch consecutive inserts/deletes
        return operation.type === lastOperation.type;
    }

    /**
     * Add operation to current batch
     */
    private addToBatch(field: FieldType, operation: CRDTOperation): void {
        const state = this.undoRedoStates.get(field);
        if (!state || !state.currentBatch) {
            this.createNewBatch(field, [operation]);
            return;
        }

        state.currentBatch.push(operation);

        // Extend batch timeout
        if (state.batchTimeout) {
            clearTimeout(state.batchTimeout);
        }

        state.batchTimeout = window.setTimeout(() => {
            this.finalizeBatch(field);
        }, this.config.batchTimeout);

        console.log(`📦 Added to batch for ${field}, batch size: ${state.currentBatch.length}`);
    }

    /**
     * Create a new batch with operations
     */
    private createNewBatch(field: FieldType, operations: CRDTOperation[]): void {
        const state = this.undoRedoStates.get(field);
        if (!state) return;

        // Finalize any existing batch
        if (state.currentBatch) {
            this.finalizeBatch(field);
        }

        state.currentBatch = operations;
        state.batchStartTime = Date.now();

        // Set timeout to finalize batch
        if (state.batchTimeout) {
            clearTimeout(state.batchTimeout);
        }

        state.batchTimeout = window.setTimeout(() => {
            this.finalizeBatch(field);
        }, this.config.batchTimeout);

        console.log(`🆕 Created new batch for ${field} with ${operations.length} operations`);
    }

    /**
     * Finalize current batch and add to undo stack
     */
    private finalizeBatch(field: FieldType): void {
        const state = this.undoRedoStates.get(field);
        if (!state || !state.currentBatch || state.currentBatch.length === 0) {
            return;
        }

        // Create undo step
        const undoStep: UndoStep = {
            id: generateOperationId(this.userId),
            operations: [...state.currentBatch],
            timestamp: Date.now(),
            userId: this.userId,
            field,
            description: this.generateBatchDescription(state.currentBatch)
        };

        // Add to undo stack
        state.undoStack.push(undoStep);

        // Limit undo stack size
        if (state.undoStack.length > this.config.maxUndoSteps) {
            state.undoStack.shift();
        }

        // Clear current batch
        state.currentBatch = null;
        state.batchStartTime = null;
        if (state.batchTimeout) {
            clearTimeout(state.batchTimeout);
            state.batchTimeout = null;
        }

        console.log(`✅ Finalized batch for ${field}: ${undoStep.operations.length} operations`);
    }

    /**
     * Generate human-readable description for batch
     */
    private generateBatchDescription(operations: CRDTOperation[]): string {
        if (operations.length === 0) return 'No operations';

        const firstOp = operations[0];
        if (operations.length === 1) {
            return firstOp.type === 'insert' ? 'Insert character' : 'Delete character';
        }

        const allSameType = operations.every(op => op.type === firstOp.type);
        if (allSameType) {
            const count = operations.length;
            return firstOp.type === 'insert'
                ? `Insert ${count} characters`
                : `Delete ${count} characters`;
        }

        return `Mixed operations (${operations.length})`;
    }

    /**
     * Get current batch ID for operation grouping
     */
    private getCurrentBatchId(field: FieldType): string {
        const state = this.undoRedoStates.get(field);
        if (!state || !state.currentBatch) {
            return generateOperationId(this.userId);
        }
        return state.currentBatch[0]?.id || generateOperationId(this.userId);
    }

    /**
     * Clear redo stack when new operation is performed
     */
    private clearRedoStack(field: FieldType): void {
        const state = this.undoRedoStates.get(field);
        if (state) {
            state.redoStack = [];
        }
    }

    /**
     * Undo the last operation for a field
     */
    undo(field: FieldType): CRDTOperation[] | null {
        const state = this.undoRedoStates.get(field);
        if (!state || state.undoStack.length === 0) {
            console.log(`📋 No operations to undo for field: ${field}`);
            return null;
        }

        // Finalize any pending batch
        if (state.currentBatch) {
            this.finalizeBatch(field);
        }

        // Get the last undo step
        const undoStep = state.undoStack.pop()!;

        // Generate inverse operations
        const inverseOperations = this.generateInverseOperations(undoStep.operations);

        // Move to redo stack
        state.redoStack.push(undoStep);

        console.log(`↩️ Undid ${undoStep.operations.length} operations for ${field}`);
        return inverseOperations;
    }

    /**
     * Redo the last undone operation for a field
     */
    redo(field: FieldType): CRDTOperation[] | null {
        const state = this.undoRedoStates.get(field);
        if (!state || state.redoStack.length === 0) {
            console.log(`📋 No operations to redo for field: ${field}`);
            return null;
        }

        // Get the last redo step
        const redoStep = state.redoStack.pop()!;

        // Create new operations with fresh IDs to avoid conflicts
        const redoOperations = this.createRedoOperations(redoStep.operations);

        // Move back to undo stack
        state.undoStack.push(redoStep);

        console.log(`↪️ Redid ${redoOperations.length} operations for ${field}`);
        return redoOperations;
    }

    /**
     * Generate inverse operations for undo
     */
    private generateInverseOperations(operations: CRDTOperation[]): CRDTOperation[] {
        const inverseOperations: CRDTOperation[] = [];

        // Process operations in reverse order to maintain correct positions
        for (let i = operations.length - 1; i >= 0; i--) {
            const operation = operations[i];
            const inverseOp = this.generateInverseOperation(operation);
            if (inverseOp) {
                inverseOperations.push(inverseOp);
            }
        }

        return inverseOperations;
    }

    /**
     * Generate inverse of a single operation
     */
    private generateInverseOperation(operation: CRDTOperation): CRDTOperation | null {
        if (operation.type === 'insert') {
            // Insert -> Delete
            const insertOp = operation as InsertOperation;
            return {
                id: generateOperationId(this.userId),
                type: 'delete',
                field: insertOp.field,
                position: insertOp.position,
                charId: `undo_${insertOp.id}`, // Special ID for undo operations
                char: insertOp.char,
                clientId: this.userId,
                documentId: this.documentId,
                timestamp: Date.now(),
                metadata: {
                    isLocalOperation: true,
                    originalOperation: operation
                }
            } as DeleteOperation;
        } else {
            // Delete -> Insert
            const deleteOp = operation as DeleteOperation;
            return {
                id: generateOperationId(this.userId),
                type: 'insert',
                field: deleteOp.field,
                position: deleteOp.position,
                char: deleteOp.char,
                clientId: this.userId,
                documentId: this.documentId,
                timestamp: Date.now(),
                metadata: {
                    isLocalOperation: true,
                    originalOperation: operation
                }
            } as InsertOperation;
        }
    }

    /**
     * Create redo operations with fresh IDs
     */
    private createRedoOperations(operations: CRDTOperation[]): CRDTOperation[] {
        return operations.map(operation => ({
            ...operation,
            id: generateOperationId(this.userId),
            timestamp: Date.now(),
            metadata: {
                isLocalOperation: true,
                originalOperation: operation
            }
        }));
    }

    /**
     * Check if undo is available for a field
     */
    canUndo(field: FieldType): boolean {
        const state = this.undoRedoStates.get(field);
        return state ? state.undoStack.length > 0 : false;
    }

    /**
     * Check if redo is available for a field
     */
    canRedo(field: FieldType): boolean {
        const state = this.undoRedoStates.get(field);
        return state ? state.redoStack.length > 0 : false;
    }

    /**
     * Get undo/redo statistics for a field
     */
    getStats(field: FieldType): UndoRedoStats {
        const state = this.undoRedoStates.get(field);
        if (!state) {
            return {
                totalUndoSteps: 0,
                totalRedoSteps: 0,
                currentBatchSize: 0,
                lastOperationTime: 0,
                averageBatchSize: 0
            };
        }

        const totalOperations = state.undoStack.reduce((sum, step) => sum + step.operations.length, 0);
        const averageBatchSize = state.undoStack.length > 0
            ? totalOperations / state.undoStack.length
            : 0;

        return {
            totalUndoSteps: state.undoStack.length,
            totalRedoSteps: state.redoStack.length,
            currentBatchSize: state.currentBatch?.length || 0,
            lastOperationTime: state.batchStartTime || 0,
            averageBatchSize
        };
    }

    /**
     * Get all statistics across all fields
     */
    getAllStats(): Record<FieldType, UndoRedoStats> {
        const stats: Record<FieldType, UndoRedoStats> = {} as Record<FieldType, UndoRedoStats>;

        this.undoRedoStates.forEach((_state, field) => {
            stats[field] = this.getStats(field);
        });

        return stats;
    }

    /**
     * Debug undo/redo state for a field
     */
    debugState(field: FieldType): void {
        const state = this.undoRedoStates.get(field);
        if (!state) {
            console.log(`🔍 No undo/redo state found for field: ${field}`);
            return;
        }

        console.log(`🔍 Undo/Redo state for field: ${field}`);
        console.log(`📚 Undo stack: ${state.undoStack.length} steps`);
        console.log(`📚 Redo stack: ${state.redoStack.length} steps`);
        console.log(`📦 Current batch: ${state.currentBatch?.length || 0} operations`);

        if (state.undoStack.length > 0) {
            const lastStep = state.undoStack[state.undoStack.length - 1];
            console.log(`📝 Last undo step: ${lastStep.description} (${lastStep.operations.length} operations)`);
        }
    }

    /**
     * Reset undo/redo state for all fields
     */
    reset(): void {
        this.undoRedoStates.forEach((state, _field) => {
            state.undoStack = [];
            state.redoStack = [];
            state.currentBatch = null;
            state.batchStartTime = null;
            if (state.batchTimeout) {
                clearTimeout(state.batchTimeout);
                state.batchTimeout = null;
            }
        });
        console.log('🔄 Reset all undo/redo states');
    }

    /**
     * Force finalize all pending batches
     */
    finalizeAllBatches(): void {
        this.undoRedoStates.forEach((_state, field) => {
            this.finalizeBatch(field);
        });
    }

    /**
     * Get current configuration
     */
    getConfig(): UndoRedoConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<UndoRedoConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
} 