function regexHtml(dom) {
  // logger.info("type of dom: " + typeof dom);
  try {
    dom = String(dom);
    dom = dom.replace(/=""/g, "");
    dom = dom.replace(/\"/g, "");
    dom = dom.replace(/\\/g, '"');

    return dom;
  } catch (error) {
    logger.error(error.stack);
    return false;
  }
}

function unEscapeHtml(str) {
  return new Promise((resolve, reject) => {
    str = str.toString();
    if (str == null) {
      logger.error("str is null");
    }
    resolve(
      str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'")
    );
  });
}

export { regexHtml, unEscapeHtml };
