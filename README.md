# Slate - Collaborative Document Editor

A real-time collaborative document editor built with React, TypeScript, and Firebase. This application enables multiple users to edit documents simultaneously with conflict-free synchronization using CRDT (Conflict-free Replicated Data Type) technology.

## Features

### Core Functionality
- **Real-time Collaboration**: Multiple users can edit documents simultaneously
- **CRDT-based Synchronization**: Conflict-free editing using fractional positioning
- **Multi-field Support**: Separate editing for title, content, description, and tags
- **Live Cursor Tracking**: See other users' cursors and typing indicators
- **Operation History**: Track and view all document changes with user attribution
- **Undo/Redo Support**: Per-field undo/redo functionality with operation broadcasting

### User Interface
- **Responsive Design**: Works on desktop and mobile devices
- **Modern UI**: Clean, intuitive interface with Tailwind CSS styling
- **Floating Toolbar**: Context-aware formatting toolbar for text selection
- **Sidebar Navigation**: Document outline and user management
- **Toast Notifications**: User feedback for actions like sharing and favoriting

### Document Management
- **Document Sharing**: Generate and copy shareable URLs
- **Favorites System**: Bookmark important documents
- **Tag Management**: Add and remove document tags
- **Document Statistics**: Word count and reading time calculations
- **Auto-save**: Automatic saving of all changes

### Authentication
- **User Management**: Simple authentication system
- **User Profiles**: Color-coded user identification
- **Presence Tracking**: Online/offline status and typing indicators

## Technical Architecture

### Frontend Technologies
- **React 19**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **Radix UI**: Accessible component primitives

### State Management
- **React Context**: CRDT state management
- **useReducer**: Complex state logic for CRDT operations
- **Custom Hooks**: Reusable logic for CRDT and authentication

### Real-time Communication
- **Firebase Realtime Database**: Real-time data synchronization
- **Firebase Authentication**: User management
- **WebSocket-like Updates**: Live operation broadcasting

### CRDT Implementation
- **Fractional Positioning**: Unique character positioning for conflict resolution
- **Tombstone Marking**: Character deletion tracking
- **Operation Broadcasting**: Real-time operation distribution
- **Multi-field Support**: Independent CRDT instances per field

## Project Structure

```
src/
├── components/           # React components
│   ├── ui/             # Reusable UI components
│   ├── animate-ui/     # Animated components
│   └── magicui/        # Special UI effects
├── hooks/              # Custom React hooks
├── lib/                # Core libraries
│   ├── crdt/          # CRDT implementation
│   └── firebase/      # Firebase integration
├── pages/             # Page components
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Key Components

### DocumentEditor
Main editing interface with real-time collaboration features:
- Content editing with CRDT synchronization
- Floating formatting toolbar
- Live cursor overlay
- Document statistics
- Share and favorite functionality

### HistoryPopover
Operation history viewer with:
- Grouped operations by user and time
- Change type classification (character, word, sentence, bulk)
- User attribution and timestamps
- Visual change indicators

### ParticipantsList
Real-time user presence display:
- Online/offline status
- User avatars with color coding
- Typing indicators
- Cursor position tracking

### TitleEditor
Specialized editor for document titles:
- CRDT synchronization
- Cursor overlay for collaboration
- Auto-save functionality

## CRDT Features

### Operation Types
- **Insert Operations**: Character insertion with fractional positioning
- **Delete Operations**: Character deletion with tombstone marking
- **Replace Operations**: Character replacement for IME/autocorrect

### Conflict Resolution
- **Fractional Positioning**: Unique character positions using client IDs
- **Deterministic Ordering**: Consistent character ordering across clients
- **Tombstone Tracking**: Proper deletion handling in distributed system

### Multi-field Support
- **Independent CRDTs**: Separate CRDT instances for each field
- **Field-specific Operations**: Operations scoped to specific fields
- **Cross-field Presence**: User presence tracking across all fields

## Utility Functions

### Text Processing
- `findTextDifference()`: Detect text changes between old and new content
- `getTextPosition()`: Calculate cursor position in contentEditable elements
- `calculateWordCount()`: Count words in text content
- `calculateReadingTime()`: Estimate reading time based on word count

### CRDT Utilities
- `generatePosition()`: Create fractional positions for character ordering
- `comparePositions()`: Compare character positions for sorting
- `generateOperationId()`: Create unique operation identifiers
- `generateCharId()`: Create unique character identifiers

## Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Dependencies

### Core Dependencies
- React 19.1.0
- TypeScript 5.8.3
- Vite 7.0.4
- Tailwind CSS 3.4.17

### UI Libraries
- Radix UI components
- Lucide React icons
- Framer Motion animations
- React Toastify notifications

### Firebase
- Firebase 12.0.0 for real-time database
- Firebase Authentication

### Development Tools
- ESLint for code linting
- PostCSS for CSS processing
- Autoprefixer for CSS compatibility

## Performance Optimizations

### Code Splitting
- Lazy loading of components
- Bundle optimization with Vite

### CRDT Optimizations
- Debounced cursor position calculations
- Efficient operation grouping
- Minimal re-renders with React.memo

### UI Optimizations
- Virtual scrolling for large documents
- Debounced input handling
- Efficient DOM updates

## Security Considerations

### Data Validation
- Input sanitization for user content
- Type checking with TypeScript
- Operation validation in CRDT engine

### Authentication
- Firebase Authentication integration
- User session management
- Secure document access control

## Future Enhancements

### Planned Features
- Rich text formatting with collaborative support
- Document versioning and branching
- Advanced search and filtering
- Export to multiple formats
- Mobile app development

### Technical Improvements
- WebRTC for peer-to-peer communication
- Offline support with local storage
- Advanced conflict resolution algorithms
- Performance monitoring and analytics
