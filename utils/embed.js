const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.json');

/**
 * Create a success embed
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {Object} options - Additional options
 * @returns {EmbedBuilder} - The embed builder
 */
function createSuccessEmbed(title, description, options = {}) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`${config.emojis.success} ${title}`)
        .setDescription(description);

    if (options.fields) {
        embed.addFields(options.fields);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    if (options.footer) {
        embed.setFooter(options.footer);
    }

    return embed;
}

/**
 * Create an error embed
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {Object} options - Additional options
 * @returns {EmbedBuilder} - The embed builder
 */
function createErrorEmbed(title, description, options = {}) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle(`${config.emojis.error} ${title}`)
        .setDescription(description);

    if (options.fields) {
        embed.addFields(options.fields);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    if (options.footer) {
        embed.setFooter(options.footer);
    }

    return embed;
}

/**
 * Create a warning embed
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {Object} options - Additional options
 * @returns {EmbedBuilder} - The embed builder
 */
function createWarningEmbed(title, description, options = {}) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`${config.emojis.warning} ${title}`)
        .setDescription(description);

    if (options.fields) {
        embed.addFields(options.fields);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    if (options.footer) {
        embed.setFooter(options.footer);
    }

    return embed;
}

/**
 * Create an info embed
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {Object} options - Additional options
 * @returns {EmbedBuilder} - The embed builder
 */
function createInfoEmbed(title, description, options = {}) {
    const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle(`${config.emojis.info} ${title}`)
        .setDescription(description);

    if (options.fields) {
        embed.addFields(options.fields);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    if (options.footer) {
        embed.setFooter(options.footer);
    }

    return embed;
}

/**
 * Create a custom embed with specified color
 * @param {string} title - The embed title
 * @param {string} description - The embed description
 * @param {string} color - The embed color
 * @param {Object} options - Additional options
 * @returns {EmbedBuilder} - The embed builder
 */
function createCustomEmbed(title, description, color, options = {}) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description);

    if (options.fields) {
        embed.addFields(options.fields);
    }

    if (options.thumbnail) {
        embed.setThumbnail(options.thumbnail);
    }

    if (options.timestamp !== false) {
        embed.setTimestamp();
    }

    if (options.footer) {
        embed.setFooter(options.footer);
    }

    if (options.author) {
        embed.setAuthor(options.author);
    }

    if (options.image) {
        embed.setImage(options.image);
    }

    return embed;
}

/**
 * Create a loading embed
 * @param {string} message - The loading message
 * @returns {EmbedBuilder} - The embed builder
 */
function createLoadingEmbed(message = 'Loading...') {
    return new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`${config.emojis.loading} ${message}`)
        .setTimestamp();
}

/**
 * Creates a standardized embed for missing argument errors.
 * @param {string} prefix - The prefix for the server.
 * @param {string} commandName - The name of the command that was run.
 * @param {string} usage - The correct usage string for the command.
 * @returns {EmbedBuilder} - The configured EmbedBuilder instance.
 */
function createArgEmbed(prefix, commandName, usage) {
    return new EmbedBuilder()
        .setColor(config.colors.error) // Or a specific hex color like '#FF0000'
        .setTitle(`${config.emojis.error} Missing Argument`)
        .setDescription(`You are missing one or more required arguments.`)
        .addFields({
            name: 'Correct Usage',
            value: `\`${prefix}${commandName} ${usage}\``
        })
        .setTimestamp();
}

module.exports = {
    createSuccessEmbed,
    createErrorEmbed,
    createWarningEmbed,
    createInfoEmbed,
    createCustomEmbed,
    createLoadingEmbed,
    createArgEmbed
};