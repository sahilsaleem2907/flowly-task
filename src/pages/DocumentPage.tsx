import React, { useState } from 'react';
import { motion } from 'framer-motion';

import { Input } from '../components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarProvider,
    SidebarTrigger
} from '../components/ui/sidebar';

import { CRDTProvider, useCRDTContext } from '../lib/crdt/CRDTProvider';
import { DocumentEditor } from '../components/DocumentEditor';

import { ProfileIcon } from '../components/ui/profile-icon';
import type { User } from '../types/User';
import { toast } from 'react-toastify';
import { Bookmark, LogOut } from 'lucide-react';

interface DocumentPageProps {
    onNavigateToAuth: () => void;
    currentUser: User | null;
}

interface OutlineItem {
    id: string;
    title: string;
    level: number;
    children?: OutlineItem[];
}

// Wrapper component to access CRDT operations
const DocumentEditorWrapper: React.FC<{
    isFavorited: boolean;
    onToggleFavorite: () => void;
    documentMetadata: any;
}> = ({ isFavorited, onToggleFavorite, documentMetadata }) => {
    const { operations } = useCRDTContext();

    // Get last edited timestamp from operations
    const getLastEditedTimestamp = (operations: any[]) => {
        if (operations.length === 0) {
            return documentMetadata.lastEdited;
        }

        // Find the most recent operation timestamp
        const timestamps = operations.map(op => op.timestamp).filter(Boolean);
        if (timestamps.length === 0) {
            return documentMetadata.lastEdited;
        }

        const latestTimestamp = Math.max(...timestamps);
        return new Date(latestTimestamp);
    };

    const updatedMetadata = {
        ...documentMetadata,
        lastEdited: getLastEditedTimestamp(operations)
    };

    return (
        <DocumentEditor
            isFavorited={isFavorited}
            onToggleFavorite={onToggleFavorite}
            documentMetadata={updatedMetadata}
        />
    );
};

const DocumentPage: React.FC<DocumentPageProps> = ({ onNavigateToAuth, currentUser }) => {
    const [sidebarTitle, setSidebarTitle] = useState('Untitled Document');
    const [isFavorited, setIsFavorited] = useState(false);

    // Mock document metadata
    const [documentMetadata] = useState({
        createdAt: new Date('2024-01-15T10:30:00Z'),
        lastEdited: new Date('2024-01-20T14:45:00Z'),
        tags: ['Important', 'Work', 'Draft', 'Collaborative']
    });

    const [outline] = useState<OutlineItem[]>([
        {
            id: '1',
            title: 'Introduction',
            level: 1,
            children: [
                { id: '1.1', title: 'Overview', level: 2 },
                { id: '1.2', title: 'Background', level: 2 }
            ]
        },
        {
            id: '2',
            title: 'Main Content',
            level: 1,
            children: [
                {
                    id: '2.1', title: 'Section A', level: 2, children: [
                        { id: '2.1.1', title: 'Subsection A1', level: 3 },
                        { id: '2.1.2', title: 'Subsection A2', level: 3 }
                    ]
                },
                { id: '2.2', title: 'Section B', level: 2 }
            ]
        },
        {
            id: '3',
            title: 'Conclusion',
            level: 1,
            children: [
                { id: '3.1', title: 'Summary', level: 2 },
                { id: '3.2', title: 'Next Steps', level: 2 }
            ]
        }
    ]);

    // Helper function to format dates


    const handleToggleFavorite = () => {
        setIsFavorited(!isFavorited);
        toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites', {
            style: {
                fontSize: '13px',
                borderLeft: `10px solid ${isFavorited ? 'gray' : '#8B5CF6'}`,
                paddingLeft: '12px'
            },
            icon: (
                <Bookmark
                    className={`w-4 h-4 ${isFavorited ? 'text-gray-500' : 'text-purple-500'}`}
                    fill={isFavorited ? 'transparent' : 'currentColor'}
                />
            ),
            position: "bottom-right",
            autoClose: 1500,
            hideProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
        });
    };

    const renderOutlineItem = (item: OutlineItem) => {
        const paddingLeft = (item.level - 1) * 16; // 16px per level 

        return (
            <div key={item.id} style={{ paddingLeft: `${paddingLeft}px` }}>
                <div className="py-1 text-sm text-gray-700 hover:text-gray-900 cursor-pointer">
                    {item.title}
                </div>
                {item.children && item.children.map(child => renderOutlineItem(child))}
            </div>
        );
    };

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--off-white)' }}>
                {/* Left Sidebar */}
                <Sidebar>
                    <SidebarHeader >
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center">
                                <div className="w-6 h-6 bg-purple-700 rounded flex items-center justify-center mr-2">
                                    <span className="text-white text-sm font-bold">Fl</span>
                                </div>
                                <span className="text-gray-700 font-medium">Flowly</span>
                            </div>
                        </div>

                        {/* Current User Info */}
                        {currentUser && (
                            <div className="px-2 pb-3">
                                <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                    <ProfileIcon user={currentUser} size="sm" className='ring-2 ring-gray-300 ring-offset-1' />
                                    <div className="flex-1">
                                        <div className="text-xs font-medium text-gray-700">{currentUser.fullName || 'Loading...'}</div>
                                        <div className="text-xs text-gray-500">{currentUser.email || 'Loading...'}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </SidebarHeader>

                    <SidebarContent>
                        {/* Document Title */}
                        <div className="p-4">
                            <Input
                                value={sidebarTitle}
                                placeholder="Untitled Document"
                                onChange={(e) => setSidebarTitle(e.target.value)}
                                className="bg-transparent border-transparent focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-ring focus-visible:ring-offset-0 text-black font-bold placeholder:text-gray-400"
                            />
                        </div>

                        {/* Outline Accordion */}
                        <div className="px-7">
                            <Accordion type="single" collapsible defaultValue="outline" className="w-full">
                                <AccordionItem value="outline" className="border-none">
                                    <AccordionTrigger className="text-sm font-medium text-gray-400 hover:text-gray-700 py-2">
                                        Index
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-1">
                                            {outline.map(item => renderOutlineItem(item))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </SidebarContent>

                    {/* Sign Out Button at Bottom */}
                    {currentUser && (
                        <div className="flex items-center justify-between py-2">
                            <button
                                onClick={onNavigateToAuth}
                                className="w-[90%] mx-auto text-xs text-red-600 hover:text-red-700 bg-red-50 px-3 py-2 rounded-sm transition-all duration-200 font-medium flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </Sidebar>

                {/* Main Content Area with Left Padding */}
                <div className="flex-1 flex flex-col h-screen w-full px-10">
                    {/* Sidebar Trigger and Breadcrumbs Row */}
                    <div className="flex items-center">
                        <SidebarTrigger className="h-12 " />
                        <div className="flex items-center px-4 py-3">
                            <nav className="flex items-center space-x-2 text-sm text-gray-600">
                                <span className="hover:text-gray-900 cursor-pointer">Documents</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-900 font-medium">{sidebarTitle}</span>
                            </nav>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="">
                        <nav className="flex space-x-8 px-4" aria-label="Tabs">
                            {/* <button
                                onClick={() => setActiveTab('editor')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'editor'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Rich Text Editor
                            </button> */}
                            {/* <button
                                onClick={() => setActiveTab('collaborative')}
                                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'collaborative'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Collaborative Editor
                            </button> */}
                        </nav>
                    </div>

                    {/* Document Content */}
                    <div className="flex-1 py-6 overflow-auto pb-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                        >
                            {currentUser && (
                                <CRDTProvider documentId="collaborative-doc" currentUser={currentUser}>
                                    <DocumentEditorWrapper
                                        isFavorited={isFavorited}
                                        onToggleFavorite={handleToggleFavorite}
                                        documentMetadata={documentMetadata}
                                    />
                                </CRDTProvider>
                            )}
                        </motion.div>
                    </div>
                </div>
            </div>
        </SidebarProvider>
    );
};

export default DocumentPage; 