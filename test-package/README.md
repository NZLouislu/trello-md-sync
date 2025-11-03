# Test NPM Package Import

This is a test project to verify that the trello-md-sync package can be imported correctly.

## Installation

```bash
npm install ../trello-md-sync-0.1.0.tgz
```

## Test Import

```javascript
// Test the import
const { mdToTrello, trelloToMd } = require('trello-md-sync');

console.log('mdToTrello:', typeof mdToTrello);
console.log('trelloToMd:', typeof trelloToMd);

// Test ES6 import syntax
import { mdToTrello as mdToTrelloES6, trelloToMd as trelloToMdES6 } from 'trello-md-sync';

console.log('ES6 mdToTrello:', typeof mdToTrelloES6);
console.log('ES6 trelloToMd:', typeof trelloToMdES6);
```