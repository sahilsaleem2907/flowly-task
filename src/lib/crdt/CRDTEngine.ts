import type {
    CRDTOperation,
    InsertOperation,
    DeleteOperation,
    CRDTChar,
} from '../../types/CRDT';
import { generatePosition, comparePositions, generateOperationId, generateCharId } from '../../types/CRDT';

export class CRDTEngine {
    private content: string = '';
    private operations: CRDTOperation[] = [];
    private characters: Map<string, CRDTChar> = new Map();

    documentId: string;
    clientId: string;

    constructor(documentId: string, clientId: string) {
        this.documentId = documentId;
        this.clientId = clientId;
    }

    // Get current content (filter out deleted characters)
    getContent(): string {
        return this.getSortedVisibleChars().map(char => char.char).join('');
    }

    // Get visible content in correct order
    getVisibleContent(): string {
        const visibleChars = this.getSortedVisibleChars();
        const content = visibleChars.map(char => char.char).join('');
        return content;
    }

    // Get sorted visible characters using fractional positions
    getSortedVisibleChars(): CRDTChar[] {
        return Array.from(this.characters.values())
            .filter(char => !char.deleted)
            .sort((a, b) => comparePositions(a.position, b.position));
    }

    // Get all operations
    getOperations(): CRDTOperation[] {
        return [...this.operations];
    }

    // Get characters map
    getCharacters(): Map<string, CRDTChar> {
        return new Map(this.characters);
    }

    // Insert character at position
    insertChar(char: string, visiblePosition: number): InsertOperation {
        const sortedChars = this.getSortedVisibleChars();
        const prevChar = sortedChars[visiblePosition - 1] || null;
        const nextChar = sortedChars[visiblePosition] || null;

        // Generate fractional position
        const position = generatePosition(
            prevChar?.position || null,
            nextChar?.position || null,
            this.clientId
        );

        // Create character object
        const charId = generateCharId(this.clientId);
        const crdtChar: CRDTChar = {
            id: charId,
            char,
            position,
            clientId: this.clientId,
            deleted: false
        };

        const operation: InsertOperation = {
            id: generateOperationId(this.clientId),
            type: 'insert',
            field: 'content', // Default field for single-field engine
            position,
            char,
            clientId: this.clientId,
            documentId: this.documentId,
            timestamp: Date.now()
        };

        this.applyOperation(operation, crdtChar);
        return operation;
    }

    // Delete character at position
    deleteChar(visiblePosition: number): DeleteOperation | null {
        const sortedChars = this.getSortedVisibleChars();

        if (visiblePosition < 0 || visiblePosition >= sortedChars.length) {
            console.warn(`Invalid delete position: ${visiblePosition}, visible chars: ${sortedChars.length}`);
            return null;
        }

        const charToDelete = sortedChars[visiblePosition];
        if (!charToDelete) {
            console.warn(`No character found at position: ${visiblePosition}`);
            return null;
        }

        const operation: DeleteOperation = {
            id: generateOperationId(this.clientId),
            type: 'delete',
            field: 'content', // Default field for single-field engine
            position: charToDelete.position,
            charId: charToDelete.id,
            char: charToDelete.char,
            clientId: this.clientId,
            documentId: this.documentId,
            timestamp: Date.now()
        };

        this.applyOperation(operation);
        return operation;
    }

    // Apply operation to local state
    applyOperation(operation: CRDTOperation, crdtChar?: CRDTChar): void {
        // Skip if already applied
        if (this.operations.some(op => op.id === operation.id)) {
            console.log(`🔄 Skipping duplicate operation in CRDT engine: ${operation.id} (${operation.type})`);
            return;
        }

        console.log(`✅ Applying operation to CRDT engine: ${operation.id} (${operation.type})`);

        // Apply the operation
        switch (operation.type) {
            case 'insert':
                this.applyInsert(operation as InsertOperation, crdtChar);
                break;
            case 'delete':
                this.applyDelete(operation as DeleteOperation);
                break;
        }

        // Add to operations list
        this.operations.push(operation);

        // Update content
        this.content = this.getContent();
    }

    // Apply insert operation
    private applyInsert(operation: InsertOperation, crdtChar?: CRDTChar): void {
        const { position, char } = operation;

        // Use provided character or create new one
        const charToInsert = crdtChar || {
            id: generateCharId(operation.clientId),
            char,
            position,
            clientId: operation.clientId,
            deleted: false
        };

        // Add character to map
        this.characters.set(charToInsert.id, charToInsert);
    }

    // Apply delete operation
    private applyDelete(operation: DeleteOperation): void {
        const { charId, char, position } = operation;

        // Find character in map
        let character = this.characters.get(charId);

        // If character doesn't exist, we need to find it or create it
        if (!character) {
            // Look for the character by position
            const foundChar = Array.from(this.characters.values()).find(c => c.position === position && c.char === char);

            if (foundChar) {
                character = foundChar;
            } else {
                // Create new character for remote operation
                character = {
                    id: charId,
                    char,
                    position,
                    clientId: operation.clientId,
                    deleted: false
                };
                this.characters.set(charId, character);
            }
        }

        // Mark as deleted (tombstone approach)
        if (character) {
            character.deleted = true;
            this.characters.set(character.id, character);
        } else {
            console.warn(`⚠️ Could not find or create character for deletion: ${charId}`);
        }
    }

    // Merge operations from another client
    mergeOperations(operations: CRDTOperation[]): void {
        // Apply each operation (no sorting needed with fractional positions)
        for (const operation of operations) {
            this.applyOperation(operation);
        }
    }

    // Rebuild content from all operations (for debugging/consistency)
    rebuildContent(): void {
        // Clear current state
        this.characters.clear();

        // Reapply all operations
        for (const operation of this.operations) {
            this.applyOperation(operation);
        }
    }

    // Reset engine state
    reset(): void {
        this.content = '';
        this.operations = [];
        this.characters.clear();
    }

    // Get operation statistics
    getStats(): { totalOperations: number; insertOperations: number; deleteOperations: number; totalCharacters: number; deletedCharacters: number } {
        const insertOps = this.operations.filter(op => op.type === 'insert').length;
        const deleteOps = this.operations.filter(op => op.type === 'delete').length;
        const deletedChars = Array.from(this.characters.values()).filter(char => char.deleted).length;

        return {
            totalOperations: this.operations.length,
            insertOperations: insertOps,
            deleteOperations: deleteOps,
            totalCharacters: this.characters.size,
            deletedCharacters: deletedChars
        };
    }

    // Debug method to print current state
    debugState(): void {
        console.log('🔍 CRDT Engine Debug State:');
        console.log('📝 Content:', this.getContent());
        console.log('📊 Stats:', this.getStats());
        console.log('📝 Operations:', this.operations.length);
        console.log('🔤 Characters:', this.characters.size);
    }

    // Get visible characters (not deleted)
    getVisibleCharacters(): CRDTChar[] {
        return this.getSortedVisibleChars();
    }

    // Get character at position (including deleted ones)
    getCharacterAtPosition(position: number): CRDTChar | null {
        const sortedChars = this.getSortedVisibleChars();
        if (position < 0 || position >= sortedChars.length) {
            return null;
        }
        return sortedChars[position];
    }

    // Get character IDs in a visible range
    getCharIdsInRange(startPosition: number, endPosition: number): string[] {
        const visibleChars = this.getVisibleCharacters();
        const charsInRange = visibleChars.slice(startPosition, endPosition);
        return charsInRange.map(char => char.id);
    }
}