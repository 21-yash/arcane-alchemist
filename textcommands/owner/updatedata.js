const { createErrorEmbed, createSuccessEmbed, createWarningEmbed } = require('../../utils/embed');
const Pet = require('../../models/Pet');
const GameData = require('../../utils/gameData');
const config = require('../../config/config.json');

module.exports = {
    name: 'updatedata',
    description: 'Updates all Pal documents in the database with missing fields. (Owner only)',
    usage: 'pet_types',
    aliases: ['fixdb'],
    ownerOnly: true,
    async execute(message, args, client, prefix) {

        const migrationType = args[0];
        if (!migrationType || migrationType !== 'pet_types') {
            return message.reply({ embeds: [createWarningEmbed('Invalid Migration', `Please specify a valid migration to run. Currently available: \`pet_types\``)]});
        }

        try {
            await message.reply('Starting database migration for **Pal Types**. This may take a moment...');

            const petsToUpdate = await Pet.find({ type: { $exists: false } });

            if (petsToUpdate.length === 0) {
                return message.channel.send({ embeds: [createSuccessEmbed('No Updates Needed', 'All Pal documents are already up-to-date.')] });
            }

            let updatedCount = 0;
            let errorCount = 0;

            for (const pal of petsToUpdate) {
                try {
                    const basePalData = GameData.getPet(pal.basePetId);
                    if (basePalData && basePalData.type) {
                        pal.type = basePalData.type;
                        await pal.save();
                        updatedCount++;
                    } else {
                        console.warn(`[DB Update] Could not find base data for Pal with base ID: ${pal.basePetId}`);
                        errorCount++;
                    }
                } catch (saveError) {
                    console.error(`[DB Update] Failed to save Pal ${pal.petId}:`, saveError);
                    errorCount++;
                }
            }
            
            const successEmbed = createSuccessEmbed(
                'Database Migration Complete!',
                `Finished updating Pal documents.`,
                {
                    fields: [
                        { name: 'Successfully Updated', value: `\`${updatedCount}\` Pals`, inline: true },
                        { name: 'Failed to Update', value: `\`${errorCount}\` Pals`, inline: true },
                    ]
                }
            );
            await message.channel.send({ embeds: [successEmbed] });

        } catch (err) {
            console.error('Data migration error:', err);
            message.channel.send({ embeds: [ createErrorEmbed('A Critical Error Occurred', 'There was a problem during the data migration. Please check the console.') ]});
        }
    }
};