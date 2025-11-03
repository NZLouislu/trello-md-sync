// Test TypeScript import
import { mdToTrello, trelloToMd } from 'trello-md-sync';
import type { TrelloStory, Todo } from 'trello-md-sync';

console.log('✅ TypeScript Import Test:');
console.log('mdToTrello:', typeof mdToTrello);
console.log('trelloToMd:', typeof trelloToMd);

// Test function types
const mdToTrelloFunc: typeof mdToTrello = mdToTrello;
const trelloToMdFunc: typeof trelloToMd = trelloToMd;

console.log('mdToTrelloFunc:', typeof mdToTrelloFunc);
console.log('trelloToMdFunc:', typeof trelloToMdFunc);

// Test type definitions
const testStory: TrelloStory = {
  storyId: 'STORY-001',
  title: 'Test Story',
  status: 'Backlog',
  body: 'Test description',
  todos: [],
  assignees: [],
  labels: [],
  meta: {}
};

const testTodo: Todo = {
  text: 'Test todo item',
  done: false
};

console.log('Test story created:', testStory.storyId);
console.log('Test todo created:', testTodo.text);

if (typeof mdToTrello === 'function' && typeof trelloToMd === 'function') {
  console.log('✅ All functions and types imported successfully!');
} else {
  console.log('❌ Import failed!');
  process.exit(1);
}