import * as cheerio from "cheerio";

import axios from "axios";
import logger from "../config/logger.js";

const COURT_AUCTION = "https://www.courtauction.go.kr/";
const MAIN_INFO = "RetrieveMainInfo.laf?";
const DETAIL_LIST = "RetrieveRealEstMulDetailList.laf?";
const DETAIL_INFO = "RetrieveRealEstCarHvyMachineMulDetailInfo.laf?";

const userAgents = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/115.0.5790.130 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/115.0.5790.130 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPod; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/115.0.5790.130 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; SM-A205U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; SM-A102U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; SM-N960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; LM-Q720) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; LM-X420) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 10; LM-Q710(FGN)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 Mobile Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.4; rv:109.0) Gecko/20100101 Firefox/115.0",
  "Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/115.0",
  "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux i686; rv:109.0) Gecko/20100101 Firefox/115.0",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
  "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/115.0 Mobile/15E148 Safari/605.1.15",
  "Mozilla/5.0 (iPad; CPU OS 13_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/115.0 Mobile/15E148 Safari/605.1.15",
  "Mozilla/5.0 (iPod touch; CPU iPhone OS 13_4_1 like Mac OS X) AppleWebKit/604.5.6 (KHTML, like Gecko) FxiOS/115.0 Mobile/15E148 Safari/605.1.15",
  "Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/115.0 Firefox/115.0",
  "Mozilla/5.0 (Android 13; Mobile; LG-M255; rv:115.0) Gecko/115.0 Firefox/115.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Safari/605.1.15",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPad; CPU OS 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPod touch; CPU iPhone 16_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
];

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

async function replaceParams(query, i) {
  // query = query.replace(/start=[0-9]+/, `start=${i}`);
  // query = query.replace(/api_type=2/, "api_type=1");

  return query;
}

async function getHtml(origin, referer) {
  try {
    const ua = userAgents[Math.floor(Math.random() * userAgents.length)];
    const options = {
      headers: {
        "User-Agent": ua,
        Referer: origin + referer,
        Origin: origin,
      },
      responseType: "arraybuffer",
      responseEncoding: "binary",
    };

    let urlParams;

    switch (referer) {
      case MAIN_INFO:
        urlParams =
          COURT_AUCTION +
          MAIN_INFO +
          "_NAVI_CMD=&_NAVI_SRNID=&_SRCH_SRNID=PNO102000&_CUR_CMD=RetrieveMainInfo.laf&_CUR_SRNID=PNO102000&_NEXT_CMD=RetrieveMainInfo.laf&_NEXT_SRNID=PNO102000&_PRE_SRNID=&_LOGOUT_CHK=&_FORM_YN=N";
        console.log("💽 > file: search-service.js:102 > getHtml > urlParams:", urlParams);
        break;

      default:
        break;
    }
    const { data } = await axios.get(urlParams, options).catch((error) => {
      if (error.response) {
        logger.error("Response Data: " + error.response.data);
        logger.error("Response Status: " + error.response.status);
        logger.error("Response Headers: " + error.response.headers);
        logger.error("Config: " + JSON.stringify(error.config));
      } else if (error) {
        logger.error("No response was received: " + JSON.stringify(error.toJSON()));
      } else {
        logger.error("Error message: " + error.message);
      }
    });

    // const content = iconv.decode(data, "EUC-KR").toString();

    const decoder = new TextDecoder("euc-kr");
    const result = decoder.decode(data);

    return cheerio.load(result);
  } catch (error) {
    logger.error(error);
    return false;
  }
}

export async function crawling() {
  try {
    const courtArr = [];
    const $ = await getHtml(COURT_AUCTION, MAIN_INFO);
    // const options = $("#idJiwonNm1").children("option");
    // const options = $("#idJiwonNm1").contents(); // typeof options: object
    $('#idJiwonNm1 option').each((i, elem) => {
      courtArr.push($(elem).attr('value'));
    })
    courtArr.pop();
    console.log("🔥 / file: search-service.js:146 / $ / courtArr:", courtArr)
  } catch (error) {
    logger.error(error);
  }
}
