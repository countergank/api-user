module.exports = {
  async up(db) {
    // Sparse indexes for token lookups
    await db.collection('users').createIndex({ resetPasswordToken: 1 }, { sparse: true });
    await db.collection('users').createIndex({ emailVerificationToken: 1 }, { sparse: true });
    await db.collection('users').createIndex({ pendingEmailToken: 1 }, { sparse: true });

    // Compound indexes for common query patterns
    await db.collection('users').createIndex({ deletedAt: 1, createdAt: -1 });
    await db.collection('users').createIndex({ role: 1, isActive: 1 });

    // Compound indexes for audit-log pagination filters
    await db.collection('audit_logs').createIndex({ userId: 1, createdAt: -1 });
    await db.collection('audit_logs').createIndex({ action: 1, createdAt: -1 });
  },

  async down(db) {
    await db.collection('users').dropIndex('resetPasswordToken_1');
    await db.collection('users').dropIndex('emailVerificationToken_1');
    await db.collection('users').dropIndex('pendingEmailToken_1');
    await db.collection('users').dropIndex('deletedAt_1_createdAt_-1');
    await db.collection('users').dropIndex('role_1_isActive_1');
    await db.collection('audit_logs').dropIndex('userId_1_createdAt_-1');
    await db.collection('audit_logs').dropIndex('action_1_createdAt_-1');
  },
};
