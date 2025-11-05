# Trello MD Sync - Workflow Diagrams

## 🔄 Core Workflow Overview

```mermaid
graph TB
    subgraph "User Input"
        A[Markdown Files] 
        B[Trello Board]
    end
    
    subgraph "Configuration Layer"
        C[Environment Variables<br/>.env]
        D[Workflow Mapping<br/>TRELLO_LIST_MAP_JSON]
        E[Member Aliases<br/>MEMBER_ALIAS_MAP_JSON]
    end
    
    subgraph "Core Processing Engine"
        F[Markdown Parser<br/>markdown-parser.ts]
        G[Story Object Model<br/>Story Interface]
        H[Trello Provider<br/>provider.ts]
        I[Markdown Renderer<br/>renderer.ts]
    end
    
    subgraph "External Services"
        J[Trello REST API]
    end
    
    subgraph "Output Results"
        K[Updated Trello Cards]
        L[Generated Markdown Files]
    end
    
    A -->|Import Flow| F
    F --> G
    G --> H
    H --> J
    J --> K
    
    B -->|Export Flow| H
    H --> G
    G --> I
    I --> L
    
    C --> F
    C --> H
    C --> I
    D --> H
    E --> H
```

## 📥 Import Flow: Markdown → Trello

```mermaid
sequenceDiagram
    participant User as User
    participant CLI as CLI Tool
    participant Parser as Markdown Parser
    participant Normalizer as Status Normalizer
    participant Provider as Trello Provider
    participant API as Trello API
    
    User->>CLI: npm run md-to-trello
    CLI->>CLI: Load environment config
    CLI->>Parser: Parse markdown files
    
    Note over Parser: Identify story format<br/>## Story: STORY-001 Title<br/>or multi-story todo lists
    
    Parser->>Parser: Extract metadata<br/>(ID, status, labels, assignees)
    Parser->>Normalizer: Normalize status values
    
    Note over Normalizer: "doing" → "In Progress"<br/>"backlog" → "Backlog"
    
    CLI->>Provider: Batch process story objects
    
    loop Each Story
        Provider->>API: Find existing card<br/>(by Story ID or title)
        API-->>Provider: Return card info
        
        alt Card exists
            Provider->>Provider: Compare changes
            Provider->>API: Differential update
        else Card not found
            Provider->>API: Create new card
        end
        
        Provider->>API: Sync checklist items
        Provider->>API: Sync labels and members
    end
    
    Provider-->>CLI: Return processing results
    CLI-->>User: Display summary report<br/>(created/updated/skipped/failed)
```

## 📤 Export Flow: Trello → Markdown

```mermaid
sequenceDiagram
    participant User as User
    participant CLI as CLI Tool
    participant Provider as Trello Provider
    participant API as Trello API
    participant Renderer as Markdown Renderer
    participant FS as File System
    
    User->>CLI: npm run trello-to-md
    CLI->>CLI: Load environment config
    CLI->>Provider: Fetch board data
    
    Provider->>API: Get all cards
    API-->>Provider: Return card list
    
    Provider->>API: Get checklist items
    Provider->>API: Get label information
    Provider->>API: Get member information
    
    Note over Provider: Apply filters<br/>(by list/label/Story ID)
    
    Provider->>Provider: Convert to Story objects
    Provider-->>CLI: Return story array
    
    loop Each Story
        CLI->>Renderer: Render single story
        
        Note over Renderer: Generate standardized markdown<br/>## Story: STORY-001 Title<br/>### Status<br/>### Description<br/>### Todo Items
        
        Renderer-->>CLI: Return markdown content
        CLI->>FS: Write file<br/>(MD_OUTPUT_DIR/story-id.md)
    end
    
    CLI-->>User: Display export summary<br/>(file count/filter results)
```

## 🔧 Configuration and Validation Flow

```mermaid
flowchart TD
    A[Start Application] --> B{Check Environment Variables}
    
    B -->|Missing Required| C[Show Configuration Error<br/>TRELLO_KEY/TOKEN/BOARD_ID]
    B -->|Config Complete| D[Validate API Credentials]
    
    D --> E{API Connection Test}
    E -->|Failed| F[Show Authentication Error<br/>Check keys and tokens]
    E -->|Success| G[Validate Board Access]
    
    G --> H{Board Permission Check}
    H -->|No Permission| I[Show Permission Error<br/>Check board ID and access]
    H -->|Has Permission| J[Load Workflow Mapping]
    
    J --> K[Validate Directory Permissions<br/>MD_INPUT_DIR/MD_OUTPUT_DIR]
    K --> L{Directory Check}
    L -->|Failed| M[Show Directory Error<br/>Create directories or check permissions]
    L -->|Success| N[Configuration Validation Complete<br/>✅ Ready to proceed]
    
    C --> O[Exit Program]
    F --> O
    I --> O
    M --> O
    N --> P[Start Sync Process]
```

## 🎯 Story Data Model Transformation

```mermaid
graph LR
    subgraph "Markdown Format"
        A1[## Story: STORY-001 Title<br/>### Status<br/>Backlog<br/>### Description<br/>Feature description<br/>### Todo Items<br/>- [ ] Task 1<br/>- [x] Task 2]
    end
    
    subgraph "Story Object"
        B1[Story {<br/>  storyId: 'STORY-001'<br/>  title: 'Title'<br/>  status: 'backlog'<br/>  body: 'Feature description'<br/>  todos: [<br/>    {text: 'Task 1', done: false}<br/>    {text: 'Task 2', done: true}<br/>  ]<br/>  labels: []<br/>  assignees: []<br/>}]
    end
    
    subgraph "Trello Card"
        C1[Trello Card {<br/>  name: 'STORY-001: Title'<br/>  desc: 'Feature description'<br/>  list: 'Backlog'<br/>  checklists: [<br/>    {name: 'Tasks', items: [<br/>      {name: 'Task 1', state: 'incomplete'}<br/>      {name: 'Task 2', state: 'complete'}<br/>    ]}<br/>  ]<br/>}]
    end
    
    A1 -->|Parse| B1
    B1 -->|Render| A1
    B1 -->|Sync| C1
    C1 -->|Transform| B1
```

## 🚦 Error Handling and Recovery Flow

```mermaid
flowchart TD
    A[Start Processing] --> B[Process Single Story]
    B --> C{API Call}
    
    C -->|Success| D[Record Success]
    C -->|HTTP 429<br/>Rate Limited| E[Exponential Backoff Retry]
    C -->|HTTP 401/403<br/>Auth Error| F[Record Auth Failure<br/>Skip Current Story]
    C -->|Network Error| G[Retry Mechanism<br/>Max 3 attempts]
    C -->|Other Error| H[Record Error Details<br/>Continue Next]
    
    E --> I{Retry Count Check}
    I -->|Under Limit| J[Wait and Retry]
    I -->|Over Limit| K[Record Failure<br/>Continue Next]
    
    G --> L{Retry Counter}
    L -->|< 3 times| M[Brief Wait and Retry]
    L -->|>= 3 times| N[Record Network Failure]
    
    J --> C
    M --> C
    
    D --> O[Next Story]
    F --> O
    K --> O
    H --> O
    N --> O
    
    O --> P{More Stories?}
    P -->|Yes| B
    P -->|No| Q[Generate Final Report<br/>Success/Failure Statistics]
```

## 🔄 Dry Run Flow

```mermaid
graph TD
    A[Enable --dry-run Mode] --> B[Normal Markdown Parsing]
    B --> C[Normal Status Normalization]
    C --> D[Simulate Trello API Calls]
    
    D --> E[Collect Planned Changes]
    E --> F{Change Type}
    
    F -->|Create Card| G[Record: Will create STORY-XXX]
    F -->|Update Card| H[Record: Will update STORY-XXX<br/>List changed fields]
    F -->|Move Card| I[Record: Will move to new list]
    F -->|Missing Labels| J[Record: Need to create labels]
    F -->|Member Alias Warning| K[Record: Alias mapping issues]
    
    G --> L[Compile Preview Report]
    H --> L
    I --> L
    J --> L
    K --> L
    
    L --> M[Display Detailed Plan<br/>❌ No actual changes executed]
    M --> N[User can confirm and<br/>execute actual sync]
```

This workflow diagram shows the complete working mechanism of Trello MD Sync, including bidirectional synchronization, error handling, configuration validation, and dry-run preview features. Each process is carefully designed to ensure data consistency and operation safety.