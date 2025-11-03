// Test CommonJS import
const { mdToTrello, trelloToMd } = require('trello-md-sync');

console.log('✅ CommonJS Import Test:');
console.log('mdToTrello:', typeof mdToTrello);
console.log('trelloToMd:', typeof trelloToMd);

if (typeof mdToTrello === 'function' && typeof trelloToMd === 'function') {
  console.log('✅ All functions imported successfully!');
} else {
  console.log('❌ Import failed!');
  process.exit(1);
}