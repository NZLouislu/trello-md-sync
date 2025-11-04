# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-01-04

### Added

#### Core Features
- Create-only import: Multi-Story Markdown → Trello board items by Story ID
- Read-only export: Trello board → Single-Story Markdown files
- Status mapping with aliases (Backlog, Ready, In progress, In review, Done)
- Deterministic, idempotent behavior keyed by Story ID
- Dry-run mode with structured logs for CI gates

#### Configuration & Validation
- Comprehensive configuration validation with clear error messages
- Format validation for API keys, tokens, and board IDs
- Trello API connectivity testing
- Directory management with automatic creation and permission validation
- CLI validation command (`validate-config`)

#### Advanced Features
- Enhanced error handling with recovery recommendations
- Performance optimization with validation caching (5-minute TTL)
- Directory access caching (30-second TTL)
- Performance benchmark testing tools
- Concurrent validation pipeline
- Label management with automatic creation
- Priority mapping to labels
- Member alias support for team assignments
- Flexible filtering by list, label, or story ID

#### CLI Commands
- `md-to-trello` - Import markdown files to Trello
- `trello-to-md` - Export Trello cards to markdown
- `validate-config` - Validate configuration and test API connection

#### Developer Experience
- Full TypeScript support with type definitions
- Comprehensive documentation
- Runnable examples in `examples/` directory
- Detailed troubleshooting guide
- Multiple configuration options

### Features

- TypeScript API with full type definitions
- Three CLI commands with help documentation
- Dry-run mode for previewing changes
- Status mapping with customizable aliases
- Idempotent operations keyed by Story ID
- Checklist synchronization
- Label and member management
- Priority-based labeling
- Configurable list mapping
- Environment variable configuration
- JSON and text output formats
- Verbose logging mode
- Strict status validation option
- Write-back to local files option

### Documentation

- Comprehensive README with quick start guide
- Detailed configuration parameter reference
- Common use cases and examples
- Troubleshooting guide with 7 common issues
- API reference documentation
- How to get Trello credentials guide
- Story file format specifications

### Technical

- Node.js 18+ support
- MIT License
- GitHub repository integration
- npm package with proper exports
- Source maps for debugging
- Declaration maps for IDE support

[0.1.0]: https://github.com/nzlouislu/trello-md-sync/releases/tag/v0.1.0
