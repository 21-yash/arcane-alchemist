function parseDuration(input) {
  const timePattern = /(\d+)\s*(d(?:ays?)?|h(?:ours?)?|hrs?|m(?:in(?:utes?)?)?|s(?:ec(?:onds?)?)?)/gi;

  let totalMs = 0;

  for (const match of input.matchAll(timePattern)) {
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    if (unit.startsWith('d')) totalMs += value * 24 * 60 * 60 * 1000;
    else if (unit.startsWith('h')) totalMs += value * 60 * 60 * 1000;
    else if (unit.startsWith('m')) totalMs += value * 60 * 1000;
    else if (unit.startsWith('s')) totalMs += value * 1000;
  }

  return totalMs > 0 ? totalMs : null;
}

function formatDuration(ms) {
    const parts = [];

    const h = Math.floor(ms / 3600000); // 1 hr = 3600000 ms
    const m = Math.floor((ms % 3600000) / 60000); // 1 min = 60000 ms
    const s = Math.floor((ms % 60000) / 1000); // 1 sec = 1000 ms
    const msRemainder = ms % 1000; // Remaining milliseconds

    if (h) parts.push(`${h} hr${h !== 1 ? 's' : ''}`);
    if (m) parts.push(`${m} min${m !== 1 ? 's' : ''}`);
    if (s) parts.push(`${s} sec${s !== 1 ? 's' : ''}`);
    if (msRemainder && parts.length === 0) parts.push(`${msRemainder} ms`);

    return parts.join(', ');
}


module.exports = { parseDuration, formatDuration };