/* global db, rs */
// Initialize MongoDB replica set for transaction support
// This script runs once when the container is first started
try {
  rs.status();
} catch (e) {
  rs.initiate({
    _id: 'rs0',
    members: [{ _id: 0, host: 'localhost:27017' }],
  });
}
