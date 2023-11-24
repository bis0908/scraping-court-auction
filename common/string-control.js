import iconv from "iconv-lite";

function koreanToURIEncoding(koreanString) {
  const encoded = iconv.encode(koreanString, "euc-kr");

  return Array.from(encoded)
    .map((byte) => "%" + byte.toString(16).toUpperCase())
    .join("");
}

export { koreanToURIEncoding };
