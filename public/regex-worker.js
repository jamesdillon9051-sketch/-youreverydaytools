self.onmessage = function (event) {
  const { pattern, flags, input } = event.data;
  try {
    const regex = new RegExp(pattern, flags);
    const matches = [];
    let match;
    while ((match = regex.exec(input)) !== null) {
      matches.push({
        index: match.index,
        text: match[0],
        groups: match.slice(1),
      });
      if (!regex.global && !regex.sticky) break;
      if (matches.length >= 1000) break;
      if (match[0].length === 0) {
        const code = input.codePointAt(regex.lastIndex);
        regex.lastIndex +=
          regex.unicode && code !== undefined && code > 65535 ? 2 : 1;
      }
    }
    self.postMessage({ matches, error: "", limited: matches.length >= 1000 });
  } catch (error) {
    self.postMessage({ matches: [], error: error.message, limited: false });
  }
};
