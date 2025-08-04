import React from 'react';

import type { UserPresence } from '../types/CRDT';
import { ProfileIcon } from './ui/profile-icon';

interface ParticipantsListProps {
    participants: UserPresence[];
    currentUser: any;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ participants, currentUser }) => {
    // Combine all participants including current user
    const allParticipants = participants.filter(p => p.userId !== currentUser?.userId);
    if (currentUser) {
        allParticipants.push({
            userId: currentUser.userId,
            user: currentUser,
            cursorPosition: 0,
            isOnline: true,
            isTyping: false,
            lastSeen: Date.now()
        });
    }

    return (
        <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
                <div className="flex items-center">
                    {allParticipants.map((participant, index) => (
                        <div
                            key={participant.userId}
                            className="flex items-center"
                            style={{
                                marginLeft: index > 0 ? '-8px' : '0',
                                zIndex: participant.isOnline ? 10 : 1 // Lower z-index for offline users
                            }}
                        >
                            <ProfileIcon
                                user={participant.user}
                                size="sm"
                                opacity={participant.isOnline ? 1 : 0.4}
                                className={`transition-opacity duration-200 ${participant.isOnline ? 'ring-2 ring-gray-300 ring-offset-1' : 'opacity-40'}`}
                            />
                        </div>
                    ))}
                </div>
            </div>


        </div>
    );
}; 