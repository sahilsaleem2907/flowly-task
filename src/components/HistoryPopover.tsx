import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { History, Clock, User, Info } from 'lucide-react';
import { useCRDTContext } from '../lib/crdt/CRDTProvider';
import { ProfileIcon } from './ui/profile-icon';
import type { CRDTOperation } from '../types/CRDT';
import type { User as UserType } from '../types/User';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface HistoryPopoverProps {
    isEnabled: boolean;
}

interface OperationHistoryItem {
    operation: CRDTOperation;
    user: UserType | null;
    timestamp: number;
    description: string;
    changeType: 'word' | 'sentence' | 'character' | 'bulk';
    changeText: string;
}

// Group operations by user and time proximity
interface OperationGroup {
    userId: string;
    operations: CRDTOperation[];
    startTime: number;
    endTime: number;
    field: string;
}

export const HistoryPopover: React.FC<HistoryPopoverProps> = ({ isEnabled }) => {
    const { operations, participants } = useCRDTContext();

    // Group operations by user and time proximity (within 3 seconds)
    const groupOperations = (ops: CRDTOperation[]): OperationGroup[] => {
        if (ops.length === 0) return [];

        const groups: OperationGroup[] = [];
        const TIME_WINDOW = 3000; // 3 seconds

        // Sort operations by timestamp
        const sortedOps = [...ops].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        let currentGroup: OperationGroup | null = null;

        for (const op of sortedOps) {
            if (!currentGroup) {
                currentGroup = {
                    userId: op.clientId,
                    operations: [op],
                    startTime: op.timestamp || 0,
                    endTime: op.timestamp || 0,
                    field: op.field
                };
            } else if (
                op.clientId === currentGroup.userId &&
                op.field === currentGroup.field &&
                (op.timestamp || 0) - currentGroup.endTime <= TIME_WINDOW
            ) {
                // Add to current group
                currentGroup.operations.push(op);
                currentGroup.endTime = op.timestamp || 0;
            } else {
                // Start new group
                groups.push(currentGroup);
                currentGroup = {
                    userId: op.clientId,
                    operations: [op],
                    startTime: op.timestamp || 0,
                    endTime: op.timestamp || 0,
                    field: op.field
                };
            }
        }

        if (currentGroup) {
            groups.push(currentGroup);
        }

        return groups;
    };

    // Analyze text changes in a group of operations
    const analyzeTextChanges = (group: OperationGroup): {
        changeType: 'word' | 'sentence' | 'character' | 'bulk';
        changeText: string;
        description: string;
    } => {
        const { operations } = group;

        if (operations.length === 0) {
            return { changeType: 'character', changeText: '', description: 'No changes' };
        }

        // Separate insert and delete operations
        const insertOps = operations.filter(op => op.type === 'insert');
        const deleteOps = operations.filter(op => op.type === 'delete');

        // Reconstruct inserted text
        const insertedText = insertOps
            .sort((a, b) => {
                const aPos = parseFloat(a.position.split('.')[0]);
                const bPos = parseFloat(b.position.split('.')[0]);
                return aPos - bPos;
            })
            .map(op => op.char)
            .join('');

        // Reconstruct deleted text
        const deletedText = deleteOps
            .sort((a, b) => {
                const aPos = parseFloat(a.position.split('.')[0]);
                const bPos = parseFloat(b.position.split('.')[0]);
                return aPos - bPos;
            })
            .map(op => op.char)
            .join('');

        // Determine change type and description
        if (insertedText.length > 0 && deletedText.length > 0) {
            // Mixed insert/delete
            const changeText = `"${deletedText}" → "${insertedText}"`;
            return {
                changeType: insertedText.length > 10 || deletedText.length > 10 ? 'sentence' : 'word',
                changeText,
                description: `Replaced ${deletedText.length > 10 ? 'text' : 'word'}`
            };
        } else if (insertedText.length > 0) {
            // Insert only
            const words = insertedText.trim().split(/\s+/);
            const sentences = insertedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

            if (insertedText.length > 50 || sentences.length > 1) {
                return {
                    changeType: 'sentence',
                    changeText: insertedText,
                    description: `Inserted ${sentences.length} sentence${sentences.length !== 1 ? 's' : ''}`
                };
            } else if (words.length > 1) {
                return {
                    changeType: 'word',
                    changeText: insertedText,
                    description: `Inserted ${words.length} word${words.length !== 1 ? 's' : ''}`
                };
            } else {
                return {
                    changeType: 'character',
                    changeText: insertedText,
                    description: `Inserted "${insertedText}"`
                };
            }
        } else if (deletedText.length > 0) {
            // Delete only
            const words = deletedText.trim().split(/\s+/);
            const sentences = deletedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

            if (deletedText.length > 50 || sentences.length > 1) {
                return {
                    changeType: 'sentence',
                    changeText: deletedText,
                    description: `Deleted ${sentences.length} sentence${sentences.length !== 1 ? 's' : ''}`
                };
            } else if (words.length > 1) {
                return {
                    changeType: 'word',
                    changeText: deletedText,
                    description: `Deleted ${words.length} word${words.length !== 1 ? 's' : ''}`
                };
            } else {
                return {
                    changeType: 'character',
                    changeText: deletedText,
                    description: `Deleted "${deletedText}"`
                };
            }
        } else {
            return {
                changeType: 'character',
                changeText: '',
                description: 'No text changes'
            };
        }
    };

    // Create history items from operation groups
    const createHistoryItems = (): OperationHistoryItem[] => {
        const groups = groupOperations(operations);
        const historyItems: OperationHistoryItem[] = [];

        for (const group of groups) {
            // Find the user who performed these operations
            const user = participants.find(p => p.user.userId === group.userId)?.user || null;

            // Analyze the text changes
            const analysis = analyzeTextChanges(group);

            // Use the first operation for metadata
            const firstOp = group.operations[0];

            historyItems.push({
                operation: firstOp,
                user,
                timestamp: group.startTime,
                description: analysis.description,
                changeType: analysis.changeType,
                changeText: analysis.changeText
            });
        }

        return historyItems.sort((a, b) => b.timestamp - a.timestamp);
    };

    const sortedHistory = createHistoryItems();

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    disabled={!isEnabled}
                    variant="ghost"
                    size="sm"
                    className={`flex items-center gap-2 px-3 py-2 text-sm ${isEnabled
                        ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        : 'text-gray-400 cursor-not-allowed'
                        }`}
                >
                    <History className="w-4 h-4" />
                    History
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[100%] max-h-96 overflow-hidden">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <h3 className="font-semibold text-gray-900">Operation History</h3>
                        </div>
                        <TooltipProvider>
                            <Tooltip defaultOpen={false}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="p-1 h-auto text-gray-400 hover:text-gray-600"
                                    >
                                        <Info className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                    <div className="space-y-2">
                                        <p className="font-medium text-sm">Change Type Colors:</p>
                                        <div className="space-y-1 text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-blue-100 border border-blue-200"></div>
                                                <span>Blue: Sentences & large text</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-green-100 border border-green-200"></div>
                                                <span>Green: Words & phrases</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
                                                <span>Gray: Single characters</span>
                                            </div>
                                        </div>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>

                    {sortedHistory.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p>No operations yet</p>
                            <p className="text-sm">Start editing to see history</p>
                        </div>
                    ) : (
                        <div className="max-h-80 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-white border-b border-gray-200">
                                    <tr>
                                        <th className="text-left py-2 px-2 font-medium text-gray-700">User</th>
                                        <th className="text-left py-2 px-2 font-medium text-gray-700">Action</th>
                                        <th className="text-left py-2 px-2 font-medium text-gray-700">Field</th>
                                        <th className="text-left py-2 px-2 font-medium text-gray-700">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedHistory.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="py-2 px-2">
                                                <div className="flex items-center gap-2">
                                                    {item.user ? (
                                                        <ProfileIcon
                                                            user={item.user}
                                                            size="sm"
                                                            className="ring-1 ring-gray-200"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                                            <User className="w-3 h-3 text-gray-500" />
                                                        </div>
                                                    )}
                                                    <span className="text-xs font-medium text-gray-700">
                                                        {item.user?.fullName || 'Unknown User'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-gray-600">
                                                        {item.description}
                                                    </span>
                                                    {item.changeText && (
                                                        <span className={`text-xs px-2 py-1 rounded ${item.changeType === 'sentence'
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                            : item.changeType === 'word'
                                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                                : 'bg-gray-50 text-gray-600 border border-gray-200'
                                                            }`}>
                                                            {item.changeText.length > 50
                                                                ? `${item.changeText.substring(0, 50)}...`
                                                                : item.changeText
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-2 px-2">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-xl text-xs font-medium capitalize shadow-sm ${item.operation.field === 'content'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : item.operation.field === 'title'
                                                        ? 'bg-red-100 text-red-800'
                                                        : item.operation.field === 'description'
                                                            ? 'bg-pink-100 text-pink-800'
                                                            : item.operation.field === 'tags'
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {item.operation.field}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2">
                                                <span className="text-xs text-gray-500">
                                                    {(() => {
                                                        const now = new Date();
                                                        const operationDate = new Date(item.timestamp);
                                                        const diffTime = now.getTime() - operationDate.getTime();
                                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                                                        if (diffDays === 0) {
                                                            return `Today ${operationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                                                        } else if (diffDays === 1) {
                                                            return `Yesterday ${operationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`;
                                                        } else {
                                                            return operationDate.toUTCString();
                                                        }
                                                    })()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-200">
                        {sortedHistory.length} change{sortedHistory.length !== 1 ? 's' : ''} total
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}; 