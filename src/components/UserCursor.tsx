import React, { useEffect, useState, useCallback } from 'react';
import type { UserPresence } from '../types/CRDT';

interface UserCursorProps {
    participant: UserPresence;
    editorRef: React.RefObject<HTMLDivElement | null>;
    isVisible: boolean;
}

export const UserCursor: React.FC<UserCursorProps> = ({ participant, editorRef, isVisible }) => {
    const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
    const [isCalculating, setIsCalculating] = useState(false);

    // Debounced cursor position calculation
    const debouncedCalculatePosition = useCallback(() => {
        if (!editorRef.current || !isVisible) return;

        setIsCalculating(true);

        try {
            const editor = editorRef.current;
            const textContent = editor.innerText || '';
            const targetPosition = participant.cursorPosition;

            // Handle edge cases
            if (targetPosition < 0) {
                setCursorPosition({ top: 0, left: 0 });
                return;
            }

            // Create a temporary range to measure text position
            const range = document.createRange();
            const textNode = editor.firstChild || editor;

            // Set range to the target position
            const clampedPosition = Math.min(targetPosition, textContent.length);
            range.setStart(textNode, clampedPosition);
            range.setEnd(textNode, clampedPosition);

            // Get the bounding rectangle of the cursor position
            const rect = range.getBoundingClientRect();
            const editorRect = editor.getBoundingClientRect();

            // Calculate position relative to the editor
            const relativeLeft = rect.left - editorRect.left;
            const relativeTop = rect.top - editorRect.top;

            // Ensure cursor is within editor bounds
            const boundedLeft = Math.max(0, Math.min(relativeLeft, editorRect.width));
            const boundedTop = Math.max(0, Math.min(relativeTop, editorRect.height));

            setCursorPosition({
                left: boundedLeft,
                top: boundedTop
            });
        } catch (error) {
            console.warn('Error calculating cursor position:', error);
            // Fallback to a safe position
            setCursorPosition({ top: 0, left: 0 });
        } finally {
            setIsCalculating(false);
        }
    }, [participant.cursorPosition, isVisible, editorRef]);

    // Recalculate position when cursor position changes
    useEffect(() => {
        if (isVisible) {
            const timeoutId = setTimeout(debouncedCalculatePosition, 50);
            return () => clearTimeout(timeoutId);
        }
    }, [participant.cursorPosition, isVisible, debouncedCalculatePosition]);

    // Recalculate when editor content changes
    useEffect(() => {
        if (isVisible) {
            const timeoutId = setTimeout(debouncedCalculatePosition, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [editorRef.current?.innerText, debouncedCalculatePosition]);

    if (!isVisible || isCalculating) {
        return null;
    }

    return (
        <div
            className="absolute pointer-events-none z-10 transition-all duration-150 ease-out"
            style={{
                left: `${cursorPosition.left}px`,
                top: `${cursorPosition.top}px`,
                transform: 'translateY(-2px)'
            }}
        >
            {/* Cursor line */}
            <div
                className="w-0.5 h-5 rounded-sm"
                style={{
                    backgroundColor: participant.user.color,
                    boxShadow: `0 0 4px ${participant.user.color}40`
                }}
            />

            {/* User name tooltip */}
            <div
                className="absolute top-6 left-0 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
                style={{
                    backgroundColor: participant.user.color,
                    transform: 'translateX(-50%)'
                }}
            >
                {participant.user.fullName}
                {participant.isTyping && (
                    <span className="ml-1">typing...</span>
                )}
            </div>
        </div>
    );
}; 