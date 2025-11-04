const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const Player = require('../../models/Player');
const Pet = require('../../models/Pet');
const { createErrorEmbed } = require('../../utils/embed');
const { calculateXpForNextLevel } = require('../../utils/leveling');
const { getMember } = require('../../utils/functions');   

// Register custom fonts
try {
    registerFont(path.join(__dirname, '../../assets/fonts/Cinzel-Bold.ttf'), { family: 'CinzelBold' });
    registerFont(path.join(__dirname, '../../assets/fonts/Lato-Regular.ttf'), { family: 'Lato' });
} catch (err) {
    console.warn('Could not register custom fonts. Using default fonts.');
}


// Helper function to format numbers (e.g., 1000 -> 1k)
const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
};

// Helper function to format dates
const formatDate = (date) => {
    if (!date) return 'An Ancient Alchemist';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

module.exports = {
    name: 'profile2',
    description: 'Displays your alchemist profile card.',
    async execute(message, args, client, prefix) {
        try {
            const user = getMember(message, args[0]) || message.author;
            const player = await Player.findOne({ userId: user.id });

            if (!player) {
                return message.reply({
                    embeds: [createErrorEmbed('Profile Not Found', `No alchemist profile found for ${user.username}. Start your journey with \`${prefix}start\`!`)]
                });
            }

            // Dynamically calculate palsOwned
            const palsOwnedCount = await Pet.countDocuments({ ownerId: user.id });

            // --- Canvas Setup ---
            const width = 900;
            const height = 600;
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');

            // --- Background ---
            try {
                const background = await loadImage(path.join(process.cwd(), 'assets/images/profile_background.png'));
                ctx.drawImage(background, 0, 0, width, height);
            } catch (err) {
                console.error(`Failed to load background image: ${err.message}. Using fallback.`);
                ctx.fillStyle = '#2c3e50';
                ctx.fillRect(0, 0, width, height);
            }

            // Semi-transparent overlay for readability
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(0, 0, width, height);

            // --- Player Avatar ---
            ctx.save();
            ctx.beginPath();
            ctx.arc(150, 160, 80, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            try {
                const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
                ctx.drawImage(avatar, 70, 80, 160, 160);
            } catch (err) {
                console.error(`Failed to load user avatar: ${err.message}`);
            }
            ctx.restore();

            // --- Player Name & Title ---
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '48px CinzelBold';
            ctx.textAlign = 'left';
            ctx.fillText(user.username, 270, 140);

            ctx.fillStyle = '#AAAAAA';
            ctx.font = '24px Lato';
            ctx.fillText('Arcane Alchemist', 270, 175);

            // --- Level Circle ---
            ctx.fillStyle = '#1a1a1a';
            ctx.strokeStyle = '#c0a062';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(800, 100, 50, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '40px CinzelBold';
            ctx.textAlign = 'center';
            ctx.fillText(player.level, 800, 115);
            
            ctx.fillStyle = '#AAAAAA';
            ctx.font = '16px Lato';
            ctx.fillText('Level', 800, 70);


            // --- XP Bar ---
            const xpNeeded = calculateXpForNextLevel(player.level);
            const progress = player.xp / xpNeeded;
            const barWidth = 590;

            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(270, 200, barWidth, 30);
            
            ctx.fillStyle = '#8e44ad';
            ctx.fillRect(270, 200, barWidth * progress, 30);
            
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(270, 200, barWidth, 30);

            ctx.fillStyle = '#FFFFFF';
            ctx.font = '18px Lato';
            ctx.textAlign = 'center';
            ctx.fillText(`${formatNumber(player.xp)} / ${formatNumber(xpNeeded)} XP`, 270 + barWidth / 2, 222);


            // --- Main Stats Panel ---
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(50, 280, 800, 270);
            ctx.strokeStyle = '#c0a062';
            ctx.lineWidth = 2;
            ctx.strokeRect(50, 280, 800, 270);

            // --- Currencies ---
            try {
                const goldIcon = await loadImage(path.join(process.cwd(), 'assets/icons/gold.png'));
                ctx.drawImage(goldIcon, 80, 310, 50, 50);
            } catch (err) { console.error(`Failed to load gold icon: ${err.message}`); }
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '32px CinzelBold';
            ctx.textAlign = 'left';
            ctx.fillText(formatNumber(player.gold), 145, 345);
            
            try {
                const dustIcon = await loadImage(path.join(process.cwd(), 'assets/icons/dust.png'));
                ctx.drawImage(dustIcon, 300, 310, 50, 50);
            } catch (err) { console.error(`Failed to load dust icon: ${err.message}`); }

            ctx.fillText(formatNumber(player.arcaneDust), 365, 345);

            // --- Journey Started ---
            ctx.fillStyle = '#AAAAAA';
            ctx.font = '22px Lato';
            ctx.textAlign = 'right';
            const journeyDate = player.startedAt || player.createdAt;
            ctx.fillText(`Journey Started: ${formatDate(journeyDate)}`, 820, 345);


            // --- Divider ---
            ctx.strokeStyle = '#444444';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(80, 380);
            ctx.lineTo(820, 380);
            ctx.stroke();

            // --- Gameplay Stats ---
            const loadIcon = async (iconPath) => {
                try {
                    return await loadImage(path.join(process.cwd(), iconPath));
                } catch (err) {
                    console.error(`Failed to load icon: ${iconPath}. Error: ${err.message}`);
                    return null;
                }
            };
            
            const palIcon = await loadIcon('assets/icons/pal.png');
            const dungeonIcon = await loadIcon('assets/icons/dungeon.png');
            const craftIcon = await loadIcon('assets/icons/craft.png');
            
            const stats = [
                { icon: palIcon, label: 'Pals Owned', value: palsOwnedCount },
                { icon: dungeonIcon, label: 'Dungeons Cleared', value: player.stats.dungeonClears },
                { icon: craftIcon, label: 'Items Crafted', value: player.stats.itemsCrafted }
            ];
            
            const statXStart = 120;
            const statY = 450;
            const statSpacing = 280;

            stats.forEach((stat, index) => {
                const x = statXStart + (index * statSpacing);
                if (stat.icon) {
                    ctx.drawImage(stat.icon, x - 30, statY - 40, 60, 60);
                }
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '40px CinzelBold';
                ctx.textAlign = 'center';
                ctx.fillText(formatNumber(stat.value), x + 20, statY + 55);

                ctx.fillStyle = '#AAAAAA';
                ctx.font = '20px Lato';
                ctx.fillText(stat.label, x + 20, statY + 20);
            });
            
            // --- Send Image ---
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile-card.png' });
            await message.reply({ files: [attachment] });

        } catch (error) {
            console.error('Profile command error:', error);
            message.reply({ embeds: [createErrorEmbed('An Error Occurred', 'There was a problem generating your profile.')] });
        }
    }
};