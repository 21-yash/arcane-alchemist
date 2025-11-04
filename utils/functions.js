function getMember(message, input) {
  input = input?.toLowerCase();

  // 1. First mention
  if (message.mentions.members.first()) return message.mentions.members.first();

  // 2. Try by ID
  if (input && message.guild.members.cache.has(input)) {
    return message.guild.members.cache.get(input);
  }

  // 3. Try by username or display name
  if (input) {
    const member = message.guild.members.cache.find(m => 
      m.user.username.toLowerCase().includes(input) || 
      m.displayName.toLowerCase().includes(input)
    );
    if (member) return member;
  }

  // 4. Fallback to author
 // return message.member;
};

function getChannel(message, input) {
    input = input?.toLowerCase();

    // 1. First channel mention
    if (message.mentions.channels.first()) return message.mentions.channels.first();

    // 2. Try by ID
    if (input && message.guild.channels.cache.has(input)) {
        return message.guild.channels.cache.get(input);
    }

    // 3. Try by channel name (partial match)
    if (input) {
        const channel = message.guild.channels.cache.find(ch =>
            ch.name.toLowerCase().includes(input)
        );
        if (channel) return channel;
    }

    // 4. Nothing found
    return null;
};

function getRole(message, input) {
  input = input?.toLowerCase();

  // 1. First mention
  if (message.mentions.roles.first()) return message.mentions.roles.first();

  // 2. Try by ID
  if (input && message.guild.roles.cache.has(input)) {
    return message.guild.roles.cache.get(input);
  }

  // 3. Try by name
  if (input) {
    const role = message.guild.roles.cache.find(r =>
      r.name.toLowerCase().includes(input)
    );
    if (role) return role;
  }

  // 4. No match
  return null;
}

module.exports = { getMember, getChannel, getRole };