import * as cheerio from "cheerio";

import { calcTwoWeeks, convertToKST } from "../common/date-control.js";

import { assert } from "console";
import axios from "axios";
import exportFakeUserAgent from "../common/fake-user-agent.js";
import fs from "fs";
import { koreanToURIEncoding } from "../common/string-control.js";
import logger from "../config/logger.js";

const COURT_AUCTION = "https://www.courtauction.go.kr/";
const MAIN_INFO = "RetrieveMainInfo.laf?";
const DETAIL_LIST = "RetrieveRealEstMulDetailList.laf?";
const DETAIL_INFO = "RetrieveRealEstCarHvyMachineMulDetailInfo.laf?";

const basicObjectInfoArr = [];

async function replaceParams(query, i) {
  // query = query.replace(/start=[0-9]+/, `start=${i}`);
  // query = query.replace(/api_type=2/, "api_type=1");

  return query;
}

async function getHtml(origin, referer, ...args) {
  try {
    const ua = exportFakeUserAgent();
    const options = {
      headers: {
        "User-Agent": ua,
        Referer: origin + referer,
        Origin: origin,
      },
      responseType: "arraybuffer",
      responseEncoding: "binary",
    };

    const [{ jiwonNm, termStatDt, termEndDt }] = args;

    // // console.log(
    // // "🔥 / file: search-service.js:36 / getHtml / jiwonNm, termStatDt, termEndDt:",
    // // jiwonNm,
    // // termStatDt,
    // // termEndDt
    // // );

    let urlParams;

    const thisYear = new Date();

    switch (referer) {
      case MAIN_INFO:
        urlParams =
          COURT_AUCTION +
          MAIN_INFO +
          "_NAVI_CMD=&_NAVI_SRNID=&_SRCH_SRNID=PNO102000&_CUR_CMD=RetrieveMainInfo.laf&_CUR_SRNID=PNO102000&_NEXT_CMD=RetrieveMainInfo.laf&_NEXT_SRNID=PNO102000&_PRE_SRNID=&_LOGOUT_CHK=&_FORM_YN=N";
        break;
      case DETAIL_LIST:
        urlParams =
          COURT_AUCTION +
          DETAIL_LIST +
          `bubwLocGubun=1&jiwonNm=${jiwonNm}&jpDeptCd=000000&daepyoSidoCd=&daepyoSiguCd=&daepyoDongCd=&notifyLoc=on&rd1Cd=&rd2Cd=&realVowel=35207_45207&rd3Rd4Cd=&notifyRealRoad=on&saYear=${thisYear.getFullYear()}&saSer=&ipchalGbncd=000331&termStartDt=${termStatDt}&termEndDt=${termEndDt}&lclsUtilCd=&mclsUtilCd=&sclsUtilCd=&gamEvalAmtGuganMin=&gamEvalAmtGuganMax=&notifyMinMgakPrcMin=&notifyMinMgakPrcMax=&areaGuganMin=&areaGuganMax=&yuchalCntGuganMin=&yuchalCntGuganMax=&notifyMinMgakPrcRateMin=&notifyMinMgakPrcRateMax=&srchJogKindcd=&mvRealGbncd=00031R&srnID=PNO102001&_NAVI_CMD=&_NAVI_SRNID=&_SRCH_SRNID=PNO102001&_CUR_CMD=InitMulSrch.laf&_CUR_SRNID=PNO102001&_NEXT_CMD=RetrieveRealEstMulDetailList.laf&_NEXT_SRNID=PNO102002&_PRE_SRNID=&_LOGOUT_CHK=&_FORM_YN=Y`;

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
        logger.error(
          "No response was received: " + JSON.stringify(error.toJSON())
        );
      } else {
        logger.error("Error message: " + error.message);
      }
    });

    const decoder = new TextDecoder("euc-kr");
    const result = decoder.decode(data);

    return cheerio.load(result);
  } catch (error) {
    logger.error(error);
    return false;
  }
}

export async function crawling() {
  if (!fs.existsSync("./court-list.txt")) {
    getCourtList();
  } else {
    // const courtList = fs.readFileSync("./court-list.txt", "utf8").split("\n");
    const courtList = readCourtListFile();
    assert(courtList.length > 0, { courtListLength: courtList.length });
    const [today, twoWeeksLater] = calcTwoWeeks();

    const encodedCourt = koreanToURIEncoding(courtList[0]);
    const $ = await getHtml(COURT_AUCTION, DETAIL_LIST, {
      jiwonNm: encodedCourt,
      termStatDt: today,
      termEndDt: twoWeeksLater,
    });

    extractDataFromDom($);
  }
}

/**
 *
 * @param { cheerio.CheerioAPI } $
 */
function extractDataFromDom($) {
  const basicObjectInfo = {};
  // $(".Ltbl_list_lvl0, .Ltbl_list_lvl1").each((i, element) => {
  // });
  const firstRow = $(".Ltbl_list_lvl0, .Ltbl_list_lvl1").first();

  // const values = $(element)
  // const values = firstRow
  //   .find("td")
  //   .map((i, td) => $(td).text().trim())
  //   .get();
  const result = firstRow
    .find("td")
    .text()
    .split(/\n+/)
    .map((element, i) => {
      return element.trim().replace(/\s+/, "");
    })
    .filter((f) => {
      return f !== "";
    });
  console.log(
    "🔥 / file: search-service.js:141 / extractDataFromDom / result:",
    result
  );

  result.forEach((element) => {
    try {
      element = parseInt(element.replace(",", ""));
    } catch (error) {}
  });

  const note = firstRow.find(".txtright").prev().text().trim();
  if (note !== "") {
    // remark = note;
  }
}

async function getCourtList() {
  const file = "court-list.txt";
  try {
    const courtArr = [];
    const $ = await getHtml(COURT_AUCTION, MAIN_INFO);
    // options: object
    $("#idJiwonNm1 option").each((i, elem) => {
      courtArr.push($(elem).attr("value"));
    });
    courtArr.pop();
    const insertEnter = courtArr.join("\n");
    fs.writeFileSync(file, insertEnter, "utf8");
  } catch (error) {
    logger.error(error);
  }
}

function readCourtListFile() {
  try {
    if (fs.existsSync("./court-list.txt")) {
      const data = fs.readFileSync("./court-list.txt", "utf8");
      return data.split("\n");
    } else {
      console.error("File does not exist.");
      return []; // or handle as appropriate
    }
  } catch (err) {
    console.error("Error reading file:", err);
    return []; // or handle as appropriate
  }
}
