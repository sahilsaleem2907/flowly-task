import React, { useRef, useEffect, useCallback } from 'react';
import { useCRDTContext } from '../lib/crdt/CRDTProvider';
import { CursorOverlay } from './CursorOverlay';
import { findTextDifference, getTextPosition } from '../utils/utils';


interface TitleEditorProps {
    className?: string;
    placeholder?: string;
}

export const TitleEditor: React.FC<TitleEditorProps> = ({
    className = '',
    placeholder = 'Untitled Document'
}) => {
    const { fields, insertChar, deleteChar, participants, currentUser, updatePresence } = useCRDTContext();

    const titleRef = useRef<HTMLDivElement>(null);


    // Sync CRDT title with editor
    useEffect(() => {
        if (titleRef.current && fields.title !== titleRef.current.textContent) {
            titleRef.current.textContent = fields.title;
        }
    }, [fields.title]);

    // Handle input changes
    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        const newText = e.currentTarget.innerText || '';
        const oldText = fields.title;

        // Update cursor position for presence tracking
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const cursorPosition = getTextPosition(range.startContainer, range.startOffset, titleRef);
            updatePresence(cursorPosition, true, 'title');
        }

        // Find differences and apply CRDT operations
        if (oldText !== newText) {
            const diff = findTextDifference(oldText, newText);

            if (diff) {
                if (diff.type === 'insert' && diff.char) {
                    // Insert each character individually
                    for (let i = 0; i < diff.char.length; i++) {
                        insertChar('title', diff.char[i], diff.position + i);
                    }
                } else if (diff.type === 'delete' && diff.length) {
                    // Delete each character individually
                    for (let i = diff.length - 1; i >= 0; i--) {
                        const position = diff.position + i;
                        deleteChar('title', position);
                    }
                }
            }
        }
    }, [fields.title, insertChar, deleteChar, updatePresence]);





    // Handle focus
    const handleFocus = useCallback(() => {
        // Update presence to indicate user is in title field
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const cursorPosition = getTextPosition(range.startContainer, range.startOffset, titleRef);
            updatePresence(cursorPosition, false, 'title');
        }

        // Notify parent component that title field is now active
        // We'll use a custom event to communicate with DocumentEditor
        window.dispatchEvent(new CustomEvent('fieldActivated', {
            detail: { field: 'title' }
        }));
    }, [updatePresence]);

    // Handle blur
    const handleBlur = useCallback(() => {
        // Clear typing status when leaving the field
        updatePresence(0, false, 'title');
    }, [updatePresence]);

    return (
        <div className="relative">
            <div
                ref={titleRef}
                contentEditable
                onInput={handleInput}
                onFocus={handleFocus}
                onBlur={handleBlur}
                className={`outline-none ${className}`}
                style={{
                    fontSize: '28px',
                    fontWeight: 'bold',
                    minHeight: '40px',
                    wordWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                }}
                suppressContentEditableWarning={true}
                data-placeholder={placeholder}
            />

            {/* Cursor Overlay for other users */}
            <CursorOverlay
                participants={participants}
                currentUser={currentUser}
                editorRef={titleRef}
                field="title"
            />
        </div>
    );
}; 