import { database } from './firebase';
import { ref, push, onValue, off, serverTimestamp, set, get } from 'firebase/database';
import type { CRDTOperation, UserPresence, FieldType } from '../../types/CRDT';
import type { User } from '../../types/User';

/**
 * FirebaseService - Handles real-time synchronization with Firebase
 * 
 * FIXED: Duplicate operations issue on page refresh
 * - Added initialLoadComplete flag to separate initial load from real-time sync
 * - Added lastProcessedTimestamp to track the latest processed operation
 * - Operations are now processed only once during initial load
 * - Real-time sync only processes new operations after initial load
 * - Added proper cleanup to reset state on unmount
 */
export class FirebaseService {
    private documentId: string;
    private currentUser: User;
    private listeners: Array<() => void> = [];
    private processedOperations: Set<string> = new Set();
    private isConnected: boolean = false;
    private initialLoadComplete: boolean = false;
    private lastProcessedTimestamp: number = 0;

    constructor(documentId: string, currentUser: User) {
        this.documentId = documentId;
        this.currentUser = currentUser;
    }

    // Initialize real-time listeners
    public startSync(
        onOperationReceived: (operation: CRDTOperation) => void,
        onUserPresenceChanged: (participants: UserPresence[]) => void
    ): void {
        // Start with isConnected = false for initial load
        this.isConnected = false;
        this.initialLoadComplete = false;

        this.listenToOperations(onOperationReceived);
        this.listenToPresence(onUserPresenceChanged);

        // Set connection status to true after initial load is complete
        // This will be called from loadAllOperations when it's done
    }

    // Listen for operations from other users
    private listenToOperations(onOperationReceived: (operation: CRDTOperation) => void): void {
        const operationsRef = ref(database, `documents/${this.documentId}/operations`);

        const unsubscribe = onValue(operationsRef, (snapshot) => {
            if (!snapshot.exists()) {
                return;
            }

            const operationsData = snapshot.val();
            const allOperations = Object.entries(operationsData).map(([key, value]: [string, any]) => ({
                ...value,
                firebaseKey: key
            }));

            // Sort by timestamp for consistent ordering
            allOperations.sort((a, b) => {
                const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
                const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
                return timestampA - timestampB;
            });

            // Process operations based on current state
            for (const operation of allOperations) {
                const operationId = operation.id;
                const operationTimestamp = typeof operation.timestamp === 'number' ? operation.timestamp : 0;

                // Skip if already processed
                if (this.processedOperations.has(operationId)) {
                    continue;
                }

                // During initial load, process all operations
                if (!this.initialLoadComplete) {
                    // Mark as processed immediately
                    this.processedOperations.add(operationId);

                    if (operation.type === 'insert') {
                        console.log(`📥 Loading insert operation from ${operation.clientId}: "${operation.char}" at position ${operation.position}`);
                    } else if (operation.type === 'delete') {
                        console.log(`📥 Loading delete operation from ${operation.clientId}: charId ${operation.charId} at position ${operation.position}`);
                    }

                    // Apply the operation
                    onOperationReceived(operation);
                    continue;
                }

                // After initial load, only process new operations (real-time updates)
                if (operationTimestamp > this.lastProcessedTimestamp) {
                    // Mark as processed immediately
                    this.processedOperations.add(operationId);

                    // Skip operations from current user in real-time sync
                    if (operation.clientId === this.currentUser.userId) {
                        console.log(`🔄 Skipping own operation in real-time sync: ${operationId}`);
                        continue;
                    }

                    if (operation.type === 'insert') {
                        console.log(`📥 Received insert operation from ${operation.clientId}: "${operation.char}" at position ${operation.position}`);
                    } else if (operation.type === 'delete') {
                        console.log(`📥 Received delete operation from ${operation.clientId}: charId ${operation.charId} at position ${operation.position}`);
                    }

                    // Apply the operation
                    onOperationReceived(operation);
                }
            }
        });

        this.listeners.push(() => off(operationsRef, 'value', unsubscribe));
    }

    // Listen for user presence changes
    private listenToPresence(onUserPresenceChanged: (participants: UserPresence[]) => void): void {
        const presenceRef = ref(database, `documents/${this.documentId}/presence`);

        const unsubscribe = onValue(presenceRef, (snapshot) => {
            if (snapshot.exists()) {
                const presenceData = snapshot.val();
                const participants = Object.values(presenceData) as UserPresence[];

                // Show all participants who have ever been in the document
                // Mark them as online if they've been active in the last 10 seconds (faster updates)
                const now = Date.now();
                const allParticipants = participants.map(user => {
                    const lastSeen = typeof user.lastSeen === 'number' ? user.lastSeen : now;
                    const isCurrentlyOnline = user.isOnline && (now - lastSeen) < 10000; // Reduced from 30s to 10s

                    return {
                        ...user,
                        isOnline: isCurrentlyOnline
                    };
                });

                // Sort participants: online users first, then offline users
                const sortedParticipants = allParticipants.sort((a, b) => {
                    if (a.isOnline && !b.isOnline) return -1;
                    if (!a.isOnline && b.isOnline) return 1;
                    return 0;
                });

                onUserPresenceChanged(sortedParticipants);
            }
        });

        this.listeners.push(() => off(presenceRef, 'value', unsubscribe));
    }

    // Broadcast operation to all other users
    public async broadcastOperation(operation: CRDTOperation): Promise<void> {
        try {
            console.log('🔍 Attempting to broadcast operation:', operation);
            console.log('🔍 Current user:', this.currentUser);
            console.log('🔍 Document ID:', this.documentId);

            const operationsRef = ref(database, `documents/${this.documentId}/operations`);
            const operationWithId = {
                ...operation,
                timestamp: serverTimestamp()
            };

            console.log('🔍 Operation with timestamp:', operationWithId);

            // Mark our own operation as processed immediately to prevent echo
            this.processedOperations.add(operation.id);

            await push(operationsRef, operationWithId);

            if (operation.type === 'insert') {
                console.log(`📡 Broadcasted insert operation: "${operation.char}" at position ${operation.position}`);
            } else if (operation.type === 'delete') {
                console.log(`📡 Broadcasted delete operation: charId ${operation.charId} at position ${operation.position}`);
            }
        } catch (error: any) {
            console.error('❌ Error broadcasting operation:', error);
            console.error('❌ Error details:', {
                message: error?.message,
                code: error?.code,
                stack: error?.stack
            });
            // Remove from processed operations if broadcast failed
            this.processedOperations.delete(operation.id);
        }
    }

    // Update user presence
    public async updatePresence(cursorPosition: number, isTyping: boolean = false, activeField: FieldType = 'content'): Promise<void> {
        try {
            console.log('🔍 Updating presence for user:', this.currentUser);
            const presenceRef = ref(database, `documents/${this.documentId}/presence/${this.currentUser.userId}`);
            const presenceData: any = {
                userId: this.currentUser.userId,
                user: this.currentUser,
                cursorPosition,
                activeField,
                fieldCursorPositions: {
                    [activeField]: cursorPosition
                },
                isOnline: true,
                isTyping,
                lastSeen: serverTimestamp()
            };

            if (isTyping) {
                presenceData.lastTyped = serverTimestamp();
            }

            console.log('🔍 Presence data:', presenceData);
            await set(presenceRef, presenceData);
            console.log('✅ Presence updated successfully');
        } catch (error: any) {
            console.error('❌ Error updating presence:', error);
            console.error('❌ Error details:', {
                message: error?.message,
                code: error?.code,
                stack: error?.stack
            });
        }
    }

    // Set user as offline
    public async setOffline(): Promise<void> {
        try {
            const presenceRef = ref(database, `documents/${this.documentId}/presence/${this.currentUser.userId}`);
            await set(presenceRef, {
                userId: this.currentUser.userId,
                user: this.currentUser,
                cursorPosition: 0,
                isOnline: false,
                isTyping: false,
                lastSeen: serverTimestamp()
            });
        } catch (error) {
            console.error('Error setting offline:', error);
        }
    }

    // Set connection status
    private setConnectionStatus(isConnected: boolean): void {
        this.isConnected = isConnected;
    }

    // Get connection status
    public getConnectionStatus(): boolean {
        return this.isConnected;
    }

    // Get document URL for sharing
    public getDocumentUrl(): string {
        return `${window.location.origin}${window.location.pathname}?docId=${this.documentId}`;
    }

    // Load all existing operations for state restoration
    public async loadAllOperations(onOperationReceived: (operation: CRDTOperation) => void): Promise<void> {
        try {
            const operationsRef = ref(database, `documents/${this.documentId}/operations`);
            const snapshot = await get(operationsRef);

            if (!snapshot.exists()) {
                console.log('📋 No existing operations found');
                return;
            }

            const operationsData = snapshot.val();
            const allOperations = Object.entries(operationsData).map(([key, value]: [string, any]) => ({
                ...value,
                firebaseKey: key
            }));

            // Sort by timestamp for consistent ordering
            allOperations.sort((a, b) => {
                const timestampA = typeof a.timestamp === 'number' ? a.timestamp : 0;
                const timestampB = typeof b.timestamp === 'number' ? b.timestamp : 0;
                return timestampA - timestampB;
            });

            console.log(`📋 Loading ${allOperations.length} existing operations`);

            // Process all operations for state restoration
            for (const operation of allOperations) {
                const operationId = operation.id;

                // Mark as processed
                this.processedOperations.add(operationId);

                if (operation.type === 'insert') {
                    console.log(`📥 Loading insert operation from ${operation.clientId}: "${operation.char}" at position ${operation.position}`);
                } else if (operation.type === 'delete') {
                    console.log(`📥 Loading delete operation from ${operation.clientId}: charId ${operation.charId} at position ${operation.position}`);
                }

                // Apply the operation for state restoration
                onOperationReceived(operation);
            }

            console.log('✅ All existing operations loaded for state restoration');
            this.initialLoadComplete = true;

            // Find the latest timestamp from loaded operations
            if (allOperations.length > 0) {
                const latestOperation = allOperations[allOperations.length - 1];
                this.lastProcessedTimestamp = typeof latestOperation.timestamp === 'number' ? latestOperation.timestamp : Date.now();
            } else {
                this.lastProcessedTimestamp = Date.now();
            }

            // Set connection status to true after initial load is complete
            this.setConnectionStatus(true);
            console.log('✅ Firebase sync initialized and real-time updates enabled');
        } catch (error) {
            console.error('❌ Error loading existing operations:', error);
        }
    }

    // Clean up all listeners
    public cleanup(): void {
        this.setOffline();
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
        this.processedOperations.clear();
        this.initialLoadComplete = false;
        this.lastProcessedTimestamp = 0;
        console.log('🧹 Firebase service cleaned up');
    }

    // Setup presence management
    public setupPresence(): void {
        // Update presence every 10 seconds to show user is still active
        const presenceInterval = setInterval(() => {
            this.updatePresence(0, false);
        }, 10000);

        // Clean up on page unload
        const handleBeforeUnload = () => {
            this.setOffline();
            clearInterval(presenceInterval);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        this.listeners.push(() => {
            clearInterval(presenceInterval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        });
    }
} 