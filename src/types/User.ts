import { v4 as uuidv4 } from 'uuid';

export interface User {
    userId: string;
    email: string;
    fullName: string;
    color: string; // For displaying user cursors/changes
}

export const createUser = (email: string, fullName: string, color: string): User => ({
    userId: uuidv4(),
    email,
    fullName,
    color
});

// Example user credentials
export const USER_ONE: User = {
    userId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    email: "alice.smith@example.com",
    fullName: "Alice Smith",
    color: "#3B82F6" // Blue
};

export const USER_TWO: User = {
    userId: "z9y8x7w6-v5u4-3210-zyxw-vu9876543210",
    email: "bob.johnson@example.com",
    fullName: "Bob Johnson",
    color: "#EF4444" // Red
};