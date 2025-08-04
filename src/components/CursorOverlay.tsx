import React from 'react';
import { UserCursor } from './UserCursor';
import type { UserPresence, FieldType } from '../types/CRDT';

interface CursorOverlayProps {
    participants: UserPresence[];
    currentUser: any;
    editorRef: React.RefObject<HTMLDivElement | null>;
    field: FieldType; // Which field this overlay is for
}

export const CursorOverlay: React.FC<CursorOverlayProps> = ({
    participants,
    currentUser,
    editorRef,
    field
}) => {
    // Filter out current user and only show online participants in this specific field
    const otherParticipants = participants.filter(participant =>
        participant.userId !== currentUser?.userId &&
        participant.isOnline &&
        participant.activeField === field
    );

    if (otherParticipants.length === 0) {
        return null;
    }

    return (
        <div className="absolute inset-0 pointer-events-none">
            {otherParticipants.map((participant) => (
                <UserCursor
                    key={participant.userId}
                    participant={participant}
                    editorRef={editorRef}
                    isVisible={participant.isOnline && participant.cursorPosition >= 0}
                />
            ))}
        </div>
    );
}; 