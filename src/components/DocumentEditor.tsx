import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bold, Italic, Underline, Undo, Redo, Share2, Bookmark, Clock } from 'lucide-react';
import { useCRDTContext } from '../lib/crdt/CRDTProvider';
import { ParticipantsList } from './ParticipantsList';
import { TitleEditor } from './TitleEditor';
import { HistoryPopover } from './HistoryPopover';
import { CursorOverlay } from './CursorOverlay';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover';
import { Button } from './ui/button';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion } from 'framer-motion';
import { LiquidButton } from './animate-ui/buttons/liquid';
import { findTextDifference, getTextPosition } from '../utils/utils';







// Font size options
const FONT_SIZE_OPTIONS = [
    { label: 'Document Title', size: '28px' },
    { label: 'H1', size: '26px' },
    { label: 'H2', size: '20px' },
    { label: 'H3', size: '18px' },
    { label: 'H4', size: '16px' },
    { label: 'H5', size: '14px' },
    { label: 'H6', size: '12px' },
    { label: 'Body Text', size: '13px' },
];

// Utility functions
const generateId = () => Math.random().toString(36).substr(2, 9);



// Calculate word count from text
const calculateWordCount = (text: string): number => {
    if (!text || text.trim() === '') return 0;
    return text.trim().split(/\s+/).length;
};

// Calculate reading time in seconds, minutes, or hours
const calculateReadingTime = (wordCount: number): string => {
    const wordsPerMinute = 200; // Average reading speed
    const totalSeconds = Math.ceil((wordCount / wordsPerMinute) * 60);

    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    } else if (totalSeconds < 3600) {
        const minutes = Math.ceil(totalSeconds / 60);
        return `${minutes}m`;
    } else {
        const hours = Math.ceil(totalSeconds / 3600);
        return `${hours}h`;
    }
};

// Truncate title if longer than specified length
const truncateTitle = (title: string, maxLength: number = 50): string => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
};



interface DocumentEditorProps {
    isFavorited?: boolean;
    onToggleFavorite?: () => void;
    documentMetadata?: {
        createdAt: Date;
        lastEdited: Date;
        tags: string[];
    };
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
    isFavorited = false,
    onToggleFavorite,
    documentMetadata
}) => {
    const {
        fields,
        participants,
        operations,
        insertChar,
        deleteChar,
        updatePresence,
        getDocumentUrl,
        undo,
        redo,
        canUndo,
        canRedo,
        currentUser
    } = useCRDTContext();




    const [showToolbar, setShowToolbar] = useState(false);
    const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isAddTagOpen, setIsAddTagOpen] = useState(false);
    const [newTagText, setNewTagText] = useState('');

    const editorRef = useRef<HTMLDivElement>(null);
    const lastCursorPosition = useRef(0);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isSyncingRef = useRef(false);
    const lastSelection = useRef({ start: 0, end: 0 });

    // Check if editor has content (simplified)
    const hasContent = fields.content && fields.content.trim().length > 0;

    // Check if both title and content are empty
    const isDocumentEmpty = (!fields.title || fields.title.trim() === '') &&
        (!fields.content || fields.content.trim() === '');

    // Sync CRDT content with editor state
    useEffect(() => {
        if (fields.content !== undefined) {
            // Update editor content if it's different
            if (editorRef.current && editorRef.current.textContent !== fields.content) {

                // Store current cursor position
                const selection = window.getSelection();
                let currentPosition = 0;

                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    currentPosition = getTextPosition(range.startContainer, range.startOffset, editorRef);
                }

                isSyncingRef.current = true;
                editorRef.current.textContent = fields.content;

                // Restore cursor position after content update
                if (selection && editorRef.current.firstChild) {
                    const range = document.createRange();
                    const textNode = editorRef.current.firstChild;
                    const newPosition = Math.min(currentPosition, fields.content.length);
                    range.setStart(textNode, newPosition);
                    range.setEnd(textNode, newPosition);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }

                // Reset sync flag after a short delay
                setTimeout(() => {
                    isSyncingRef.current = false;
                }, 10);
            }
        }
    }, [fields.content]);

    // Handle keyboard events for deletions
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Skip if we're syncing from CRDT
        if (isSyncingRef.current) {
            return;
        }

        // Handle undo/redo shortcuts
        if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    // Ctrl+Shift+Z or Cmd+Shift+Z for redo
                    if (canRedo('content')) {
                        redo('content');
                    }
                } else {
                    // Ctrl+Z or Cmd+Z for undo
                    if (canUndo('content')) {
                        undo('content');
                    }
                }
                return;
            }

            // Handle formatting shortcuts
            switch (e.key.toLowerCase()) {
                case 'b':
                    e.preventDefault();
                    document.execCommand('bold', false);
                    break;
                case 'i':
                    e.preventDefault();
                    document.execCommand('italic', false);
                    break;
                case 'u':
                    e.preventDefault();
                    document.execCommand('underline', false);
                    break;
            }
        }
    }, [undo, redo, canUndo, canRedo]);

    // Handle text input changes
    const handleInput = useCallback((e: React.ChangeEvent<HTMLDivElement>) => {
        // Skip if we're syncing from CRDT
        if (isSyncingRef.current) {
            return;
        }

        const newText = e.target.textContent || '';
        const oldText = fields.content || '';

        // Get cursor position more accurately
        const selection = window.getSelection();
        let cursorPosition = 0;

        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            cursorPosition = getTextPosition(range.startContainer, range.startOffset, editorRef);
        }

        lastCursorPosition.current = cursorPosition;

        // Update presence
        updatePresence(cursorPosition, true, 'content');

        // Clear typing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set typing timeout
        typingTimeoutRef.current = setTimeout(() => {
            updatePresence(cursorPosition, false, 'content');
        }, 2000);

        // Find differences and apply CRDT operations
        if (oldText !== newText) {

            const diff = findTextDifference(oldText, newText);

            if (diff) {

                if (diff.type === 'insert' && diff.char) {
                    // Insert each character individually
                    for (let i = 0; i < diff.char.length; i++) {
                        const char = diff.char[i];
                        const position = diff.position + i;
                        insertChar('content', char, position);
                    }
                } else if (diff.type === 'delete' && diff.length) {
                    // Delete each character individually
                    for (let i = diff.length - 1; i >= 0; i--) {
                        const position = diff.position + i;
                        deleteChar('content', position);
                    }
                } else if (diff.type === 'replace' && diff.newChar) {
                    // Character replacement (rare, but possible with IME or autocorrect)
                    // First delete the old character, then insert the new one
                    deleteChar('content', diff.position);
                    setTimeout(() => {
                        insertChar('content', diff.newChar!, diff.position);
                    }, 0);
                }
            } else {
                console.warn('⚠️ No diff detected despite text change');
            }
        }
    }, [fields.content, insertChar, deleteChar, updatePresence]);

    // Handle focus
    const handleFocus = useCallback(() => {
        // Update presence to indicate user is in content field
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const cursorPosition = getTextPosition(range.startContainer, range.startOffset, editorRef);
            updatePresence(cursorPosition, false, 'content');
        }
    }, [updatePresence]);

    // Handle blur
    const handleBlur = useCallback(() => {
        // Clear typing status when leaving the field
        updatePresence(0, false, 'content');
    }, [updatePresence]);





    // Apply formatting
    const applyFormatting = useCallback((styleType: 'bold' | 'italic' | 'underline') => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        let command = '';
        switch (styleType) {
            case 'bold':
                command = 'bold';
                break;
            case 'italic':
                command = 'italic';
                break;
            case 'underline':
                command = 'underline';
                break;
        }

        document.execCommand(command, false);
    }, []);

    // Apply font size
    const applyFontSize = useCallback((fontSize: string) => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const span = document.createElement('span');
        span.style.fontSize = fontSize;
        span.setAttribute('data-node-id', generateId());
        span.className = 'text-node';

        try {
            const range = selection.getRangeAt(0);
            range.surroundContents(span);
        } catch (error) {
            console.warn('Could not apply font size:', error);
        }
    }, []);

    // Share document
    const shareDocument = useCallback(() => {
        const url = getDocumentUrl();
        navigator.clipboard.writeText(url).then(() => {
            toast.success('Document URL copied to clipboard!', {
                style: {
                    fontSize: '13px',
                    borderLeft: '10px solid green',
                    paddingLeft: '12px'
                },
                icon: <Share2 className="w-4 h-4 text-green-500" />,
                position: "bottom-right",
                autoClose: 1500,
                hideProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            setIsPopoverOpen(false);
        }).catch(() => {
            toast.error('Failed to copy URL to clipboard', {
                position: "bottom-right",
                style: {
                    fontSize: '13px',
                    borderLeft: '10px solid red',
                    paddingLeft: '12px'
                },
                icon: (
                    <div className="absolute left-0 top-0 bottom-0 " />
                ),
                autoClose: 1500,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
        });
    }, [getDocumentUrl]);



    // Update active styles and toolbar position
    const updateActiveStyles = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setShowToolbar(false);
            return;
        }

        // Check if selection is within the editor
        const range = selection.getRangeAt(0);
        const editorElement = editorRef.current;

        if (!editorElement || !editorElement.contains(range.commonAncestorContainer)) {
            setShowToolbar(false);
            return;
        }

        const rect = range.getBoundingClientRect();

        setToolbarPosition({
            top: rect.top - 50,
            left: rect.left + (rect.width / 2) - 100
        });
        setShowToolbar(true);
    }, []);

    // Listen for selection changes
    useEffect(() => {
        const handleSelectionChange = () => {
            updateActiveStyles();

            // Track selection for bulk operations
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                lastSelection.current = {
                    start: getTextPosition(range.startContainer, range.startOffset, editorRef),
                    end: getTextPosition(range.endContainer, range.endOffset, editorRef)
                };
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, [updateActiveStyles]);

    // Tag management functions
    const removeTag = (index: number) => {
        if (documentMetadata) {
            const newTags = [...documentMetadata.tags];
            newTags.splice(index, 1);
            // In a real app, you would update the document metadata here
        }
    };

    const addTag = () => {
        if (newTagText.trim() && documentMetadata) {
            // In a real app, you would update the document metadata here
            setNewTagText('');
            setIsAddTagOpen(false);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div className="w-full max-w-4xl mx-auto p-6 relative pb-20">
            {/* Header */}
            <div className="mb-6 relative">
                {/* Title and Participants Row */}
                <div className="mb-2 flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <TitleEditor
                            placeholder="Untitled Document"
                            className="bg-transparent border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring focus-visible:ring-offset-0 text-black font-bold placeholder:text-gray-400 break-words"
                        />
                    </div>

                    {/* Right side with summarize, bookmark and participants */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                        {/* Summarize Button */}
                        <LiquidButton
                            disabled={isDocumentEmpty}
                            onClick={() => {
                                if (!isDocumentEmpty) {
                                    toast.info('Summarize feature coming soon!');
                                }
                            }}
                            title={isDocumentEmpty ? 'Add content to enable summarization' : 'Summarize document with AI'}
                            className={isDocumentEmpty ? 'opacity-50 cursor-not-allowed ' : ''}
                        >
                            Summarize with AI
                        </LiquidButton>

                        {/* Bookmark Button */}
                        {onToggleFavorite && (
                            <button
                                onClick={onToggleFavorite}
                                className={`p-1.5 rounded-md transition-all duration-300 transform ${isFavorited
                                    ? 'text-purple-500 hover:text-purple-600 scale-110'
                                    : 'text-gray-400 hover:text-purple-500 hover:scale-105'
                                    }`}
                                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <Bookmark className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
                            </button>
                        )}
                        <ParticipantsList participants={participants} currentUser={currentUser} />
                    </div>
                </div>

                {/* Timestamps */}
                {documentMetadata && (
                    <div className="space-y-1 mb-3">
                        {/* <div className="text-xs text-gray-500">
                            Created: {documentMetadata.createdAt.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div> */}
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Last edited: {documentMetadata.lastEdited.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                )}

                {/* Document Tags */}
                {documentMetadata && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {documentMetadata.tags.map((tag, index) => (
                            <Badge
                                key={index}
                                variant="secondary"
                                className=" cursor-pointer text-xs bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 group relative transition-all duration-200"
                            >
                                <span>{tag}</span>
                                <button
                                    onClick={() => removeTag(index)}
                                    className="hidden group-hover:inline-block ml-1 text-gray-500 hover:text-red-500"
                                    title="Remove tag"
                                >
                                    ×
                                </button>
                            </Badge>
                        ))}
                        <button
                            onClick={() => setIsAddTagOpen(true)}
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors leading-none"
                            title="Add tag"
                        >
                            +
                        </button>
                    </div>
                )}
            </div>

            {/* Floating Toolbar */}
            {showToolbar && (
                <div
                    className="fixed z-50 flex items-center gap-1 p-2 bg-gray-800 text-white rounded-lg shadow-lg"
                    style={{
                        top: `${toolbarPosition.top}px`,
                        left: `${toolbarPosition.left}px`,
                        transform: 'translateX(-50%)'
                    }}
                >
                    <button
                        onClick={() => applyFormatting('bold')}
                        className="p-1.5 rounded transition-colors text-white hover:bg-gray-700"
                        title="Bold (Ctrl+B)"
                    >
                        <Bold className="w-3 h-3" />
                    </button>

                    <button
                        onClick={() => applyFormatting('italic')}
                        className="p-1.5 rounded transition-colors text-white hover:bg-gray-700"
                        title="Italic (Ctrl+I)"
                    >
                        <Italic className="w-3 h-3" />
                    </button>

                    <button
                        onClick={() => applyFormatting('underline')}
                        className="p-1.5 rounded transition-colors text-white hover:bg-gray-700"
                        title="Underline (Ctrl+U)"
                    >
                        <Underline className="w-3 h-3" />
                    </button>

                    <div className="h-4 w-px bg-gray-600 mx-1" />

                    <select
                        onChange={(e) => applyFontSize(e.target.value)}
                        className="bg-gray-800 text-white text-xs rounded px-1 py-1 border border-gray-700 hover:bg-gray-700 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {FONT_SIZE_OPTIONS.map((option) => (
                            <option key={option.size} value={option.size}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Editor with Overlay Placeholder */}
            <div className="relative">
                {/* Placeholder overlay - shows when no content */}
                {!hasContent && (
                    <div
                        className="absolute inset-0 py-4 pointer-events-none text-gray-400 text-base leading-6"
                        style={{
                            fontSize: '16px',
                            lineHeight: '1.6',
                        }}
                    >
                        Start typing to begin
                    </div>
                )}

                {/* Actual Editor */}
                <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={handleBlur}

                    className="min-h-96 py-4 rounded-lg focus:outline-none text-black"
                    style={{
                        fontSize: '16px',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap'
                    }}
                    suppressContentEditableWarning={true}
                />

                {/* Cursor Overlay for other users */}
                <CursorOverlay
                    participants={participants}
                    currentUser={currentUser}
                    editorRef={editorRef}
                    field="content"
                />
            </div>

            {/* Sticky Bottom Toolbar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }} className="fixed bottom-5 z-40">
                <div className="w-full max-w-4xl mx-auto px-6 py-3 bg-gray-100 rounded-[10px] shadow-lg border-t border-gray-200" >
                    <div className="flex items-center justify-between">
                        {/* Title */}
                        <div className="flex items-center gap-4 w-[100%]">
                            <div className="w-8 h-8  rounded-lg  flex items-center justify-center">
                                <svg width="22" height="22" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.33333 1.33334H4C3.26362 1.33334 2.66667 1.93029 2.66667 2.66667V13.3333C2.66667 14.0697 3.26362 14.6667 4 14.6667H12C12.7364 14.6667 13.3333 14.0697 13.3333 13.3333V5.33334L9.33333 1.33334Z" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9.33333 1.33334V5.33334H13.3333" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M10.6667 8.66666H5.33333" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M10.6667 11.3333H5.33333" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6.66667 6H5.33333" stroke="#6B7280" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                                {truncateTitle(fields.title || 'Untitled Document')}
                            </span>
                        </div>

                        {/* Stats and Actions */}
                        <div className="flex items-center gap-6">

                            {/* History Button */}

                            <HistoryPopover isEnabled={operations.length > 0} />

                            {/* Word Count */}
                            <div className="flex items-center gap-2 w-[100%]">
                                <span className="text-sm font-medium text-gray-500 ">
                                    {calculateWordCount(fields.content || '')} Words
                                </span>
                            </div>

                            {/* Reading Time */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500 ">
                                    {calculateReadingTime(calculateWordCount(fields.content || ''))}
                                </span>
                            </div>

                            {/* Undo Button */}
                            <button
                                onClick={() => undo('content')}
                                disabled={!canUndo('content')}
                                className={`flex items-center justify-center w-8 h-8  ${canUndo('content')
                                    ? 'text-gray-600'
                                    : 'text-gray-400 cursor-not-allowed'
                                    }`}
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo className="w-4 h-4" />
                            </button>

                            {/* Redo Button */}
                            <button
                                onClick={() => redo('content')}
                                disabled={!canRedo('content')}
                                className={`flex items-center justify-center w-8 h-8  ${canRedo('content')
                                    ? 'text-gray-600 '
                                    : 'text-gray-400 cursor-not-allowed'
                                    }`}
                                title="Redo (Ctrl+Shift+Z)"
                            >
                                <Redo className="w-4 h-4" />
                            </button>


                            {/* Share Button */}
                            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                <PopoverTrigger asChild>
                                    <button
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-purple-500 rounded border hover:bg-purple-400 transition-colors"
                                        title="Share Document"
                                    >
                                        <Share2 className="w-3 h-3" />
                                        Share
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Share Document</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Copy the link below to share this document
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                id="link"
                                                value={getDocumentUrl()}
                                                className="h-8"
                                                readOnly
                                            />
                                            <Button
                                                onClick={shareDocument}
                                                className="h-8"
                                                variant="outline"
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            {/* Add Tag Popover */}
                            <Popover open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
                                <PopoverContent className="w-64">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">Add Tag</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Enter a new tag for this document
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Input
                                                value={newTagText}
                                                onChange={(e) => setNewTagText(e.target.value)}
                                                placeholder="Enter tag name"
                                                className="h-8"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        addTag();
                                                    }
                                                }}
                                            />
                                            <Button
                                                onClick={addTag}
                                                className="h-8"
                                                variant="outline"
                                                disabled={!newTagText.trim()}
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>


                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Toast Container */}
            <ToastContainer />
        </div >
    );
};