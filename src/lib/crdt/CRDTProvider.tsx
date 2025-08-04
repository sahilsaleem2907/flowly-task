import React, { createContext, useContext, type ReactNode } from 'react';
import { useMultiFieldCRDT } from '../../hooks/useMultiFieldCRDT';
import type { User } from '../../types/User';
import type { FieldType } from '../../types/CRDT';

interface CRDTContextValue {
    // State
    fields: {
        content: string;
        title: string;
        description: string;
        tags: string;
    };
    participants: any[];
    isConnected: boolean;
    pendingOperations: any[];
    operations: any[];
    characters: any;
    bulkState: any;

    // Actions
    insertChar: (field: FieldType, char: string, position: number) => void;
    deleteChar: (field: FieldType, position: number) => void;
    updatePresence: (cursorPosition: number, isTyping?: boolean, activeField?: FieldType) => void;
    getDocumentUrl: () => string;
    getStats: () => {
        totalOperations: number;
        insertOperations: number;
        deleteOperations: number;
        totalCharacters: number;
        deletedCharacters: number;
        bulkOperations: number;
        undoStackSize: number;
        redoStackSize: number;
        fields: Record<string, any>;
    };
    rebuildContent: (field?: FieldType) => void;
    undo: (field?: FieldType) => void;
    redo: (field?: FieldType) => void;
    canUndo: (field?: FieldType) => boolean;
    canRedo: (field?: FieldType) => boolean;
    testUndoRedo: (field?: FieldType) => void;

    // Current user
    currentUser: User | null;
}

const CRDTContext = createContext<CRDTContextValue | null>(null);

interface CRDTProviderProps {
    children: ReactNode;
    documentId: string;
    currentUser: User;
}

export const CRDTProvider: React.FC<CRDTProviderProps> = ({ children, documentId, currentUser }) => {
    const crdtValue = useMultiFieldCRDT(documentId, currentUser);

    return (
        <CRDTContext.Provider value={crdtValue}>
            {children}
        </CRDTContext.Provider>
    );
};

export const useCRDTContext = () => {
    const context = useContext(CRDTContext);
    if (!context) {
        throw new Error('useCRDTContext must be used within a CRDTProvider');
    }
    return context;
}; 