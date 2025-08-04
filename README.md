# Flowly - Collaborative Document Editor

A real-time collaborative document editor built with React, TypeScript, and Firebase. This application enables multiple users to edit documents simultaneously with conflict-free synchronization using CRDT (Conflict-free Replicated Data Type) technology.

## Features

### Core Functionality
- **Real-time Collaboration**: Multiple users can edit documents simultaneously
- **CRDT-based Synchronization**: Conflict-free editing using fractional positioning
- **Multi-field Support**: Separate editing for title, content, description, and tags
- **Live Cursor Tracking**: See other users' cursors and typing indicators
- **Operation History**: Track and view all document changes with user attribution
- **Undo/Redo Support**: Per-field undo/redo functionality with operation broadcasting


### Authentication
- **User Management**: Simple authentication system
- **User Profiles**: Color-coded user identification
- **Presence Tracking**: Online/offline status and typing indicators

## Technical Architecture

### Real-time Communication
- **Firebase Realtime Database**: Real-time data synchronization
- **Firebase Authentication**: User management
- **WebSocket-like Updates**: Live operation broadcasting

## Demo Credentials

```
User 1: alice.smith@example.com → Code: ALICE1
User 2: bob.johnson@example.com → Code: BOB123
```

Use these credentials to test the application from different devices.

### CRDT Implementation
- **Fractional Positioning**: Unique character positioning for conflict resolution
- **Tombstone Marking**: Character deletion tracking
- **Operation Broadcasting**: Real-time operation distribution
- **Multi-field Support**: Independent CRDT instances per field

### Known Limitations and Future Work

- Editor does not properly handle new line characters
- Authentication relies on local storage, but firebase can be easily integrated
- Document indexing functionality needs to be integrated
- Font styling synchronization across devices is not implemented
- Document tagging system is currently static
- AI-powered document summarization feature awaits API integration

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


## Development

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

## Future Enhancements

### Planned Features
- Rich text formatting with collaborative support
- Document versioning and branching
- Advanced search and filtering
- Export to multiple formats

### Technical Improvements
- Offline support with local storage
- Advanced conflict resolution algorithms
- Performance monitoring and analytics
