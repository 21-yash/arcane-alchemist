/**
 * Migration Script: Shadow Wyrm → Dreadlord
 * 
 * Updates all existing pet documents in the database:
 * 1. Changes basePetId from 'shadow_wyrm' to 'dreadlord'
 * 2. Changes nickname from 'Shadow Wyrm' to 'Dreadlord' (if it was set to the old default name)
 * 
 * Usage: node scripts/migrate_shadow_wyrm.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const OLD_BASE_ID = 'shadow_wyrm';
const NEW_BASE_ID = 'dreadlord';
const OLD_NAME = 'Shadow Wyrm';
const NEW_NAME = 'Dreadlord';

async function migrate() {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/discordbot';
        await mongoose.connect(mongoURI);
        console.log('✅ Connected to MongoDB');

        const Pet = require('../models/Pet');

        // Find all Shadow Wyrm pets
        const shadowWyrms = await Pet.find({ basePetId: OLD_BASE_ID });
        console.log(`\n🔍 Found ${shadowWyrms.length} pet(s) with basePetId: "${OLD_BASE_ID}"`);

        if (shadowWyrms.length === 0) {
            console.log('✨ No pets to migrate. Database is already clean!');
            await mongoose.connection.close();
            process.exit(0);
        }

        // Show what will be changed
        for (const pet of shadowWyrms) {
            console.log(`   - Pet #${pet.shortId} (Owner: ${pet.ownerId}) | Nickname: ${pet.nickname || 'none'} | Level: ${pet.level}`);
        }

        // Step 1: Update basePetId for all Shadow Wyrm pets
        const basePetResult = await Pet.updateMany(
            { basePetId: OLD_BASE_ID },
            { $set: { basePetId: NEW_BASE_ID } }
        );
        console.log(`\n✅ Updated basePetId: ${basePetResult.modifiedCount} pet(s) changed from "${OLD_BASE_ID}" → "${NEW_BASE_ID}"`);

        // Step 2: Update nickname only if it was set to the old default name
        const nicknameResult = await Pet.updateMany(
            { basePetId: NEW_BASE_ID, nickname: OLD_NAME },
            { $set: { nickname: NEW_NAME } }
        );
        console.log(`✅ Updated nickname: ${nicknameResult.modifiedCount} pet(s) renamed from "${OLD_NAME}" → "${NEW_NAME}"`);

        // Verify
        const remaining = await Pet.countDocuments({ basePetId: OLD_BASE_ID });
        if (remaining === 0) {
            console.log('\n🎉 Migration complete! No remaining references to "shadow_wyrm".');
        } else {
            console.error(`\n⚠️ Warning: ${remaining} pet(s) still have the old basePetId.`);
        }

        await mongoose.connection.close();
        console.log('📴 Database connection closed.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

migrate();
