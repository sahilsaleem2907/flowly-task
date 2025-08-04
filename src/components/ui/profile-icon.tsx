import React from 'react';

interface ProfileIconProps {
    user?: {
        fullName?: string;
        color?: string;
    } | null;
    size?: 'sm' | 'md' | 'lg';
    opacity?: number;
    className?: string;
}

export const ProfileIcon: React.FC<ProfileIconProps> = ({
    user,
    size = 'md',
    opacity = 1,
    className = ''
}) => {
    // Extract initials from full name
    const getInitials = (fullName: string): string => {
        if (!fullName || fullName.trim() === '') return '?';
        const names = fullName.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    };

    const sizeClasses = {
        sm: 'w-6 h-6 text-xs',
        md: 'w-8 h-8 text-sm',
        lg: 'w-10 h-10 text-base'
    };

    // Show loading state if user data is not available
    if (!user || !user.fullName || !user.color) {
        return (
            <div
                className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white bg-gray-300 animate-pulse ${className}`}
                style={{ opacity }}
            >
                ?
            </div>
        );
    }

    return (
        <div
            className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white ${className}`}
            style={{
                backgroundColor: user.color,
                opacity: opacity
            }}
        >
            {getInitials(user.fullName)}
        </div>
    );
}; 