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

async function replaceParams(query, i) {
  // query = query.replace(/start=[0-9]+/, `start=${i}`);
  // query = query.replace(/api_type=2/, "api_type=1");

  return query;
}

let urlParams;

/**
 *
 * @param {string} jiwonNm 법원이름
 * @param {date} thisYear 올해 년도
 * @param {date} termStartDt 오늘날짜
 * @param {date} termEndDt 2주 뒤 날짜
 * @param {string} page 페이지별 리스트 갯수 ("default40" 고정)
 * @param {string} targetRow 현제 페이지 시작 행 / 전체 행 (1,41,81,121, ...)
 * @returns string parameter
 */
const auctionListParameter = (
  jiwonNm,
  thisYear,
  termStartDt,
  termEndDt,
  page = "default40",
  targetRow = ""
) => {
  return `bubwLocGubun=1&jiwonNm=${jiwonNm}&jpDeptCd=000000&notifyLoc=on&realVowel=35207_45207&notifyRealRoad=on&saYear=${thisYear.getFullYear()}&ipchalGbncd=000331&termStartDt=${termStartDt}&termEndDt=${termEndDt}&mvRealGbncd=00031R&srnID=PNO102001&_SRCH_SRNID=PNO102001&_CUR_CMD=InitMulSrch.laf&_CUR_SRNID=PNO102001&_NEXT_CMD=RetrieveRealEstMulDetailList.laf&_NEXT_SRNID=PNO102002&_FORM_YN=Y&page=${page}&targetRow=${targetRow}`;
};

/**
 *
 * @param {string} jiwonNm 법원이름
 * @param {string} saNo 사건번호(숫자only)
 * @param {string} maemulSer 물건번호
 * @param {date} thisYear 올해 년도
 * @param {date} termStartDt 오늘 날짜
 * @param {date} termEndDt 14일 뒤 날짜
 * @returns string parameter
 */
const auctionDetailParameter = (
  jiwonNm,
  saNo,
  maemulSer,
  thisYear,
  termStartDt,
  termEndDt
) => {
  return `jiwonNm=${jiwonNm}&saNo=${saNo}&maemulSer=${maemulSer}&_NAVI_CMD=InitMulSrch.laf&_NAVI_SRNID=PNO102001&_SRCH_SRNID=PNO102001&_CUR_CMD=RetrieveRealEstMulDetailList.laf&_CUR_SRNID=PNO102002&_NEXT_CMD=RetrieveRealEstCarHvyMachineMulDetailInfo.laf&_NEXT_SRNID=PNO102015&_FORM_YN=Y&_C_bubwLocGubun=1&_C_jiwonNm=${jiwonNm}&_C_jpDeptCd=000000&_C_notifyLoc=on&_C_realVowel=35207_45207&_C_notifyRealRoad=on&_C_saYear=${thisYear.getFullYear()}&_C_saSer=&_C_ipchalGbncd=&_C_termStartDt=${termStartDt}&_C_termEndDt=${termEndDt}&_C_mvRealGbncd=00031R&_C_srnID=PNO102001`;
};

async function getHtml(origin, referer, extraParameter) {
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

    // const [{ jiwonNm, termStartDt, termEndDt, parameters }] = args;

    switch (referer) {
      case MAIN_INFO:
        urlParams =
          COURT_AUCTION +
          MAIN_INFO +
          /* "_NAVI_CMD=&_NAVI_SRNID=&_SRCH_SRNID=PNO102000&_CUR_CMD=RetrieveMainInfo.laf&_CUR_SRNID=PNO102000&_NEXT_CMD=RetrieveMainInfo.laf&_NEXT_SRNID=PNO102000&_PRE_SRNID=&_LOGOUT_CHK=&_FORM_YN=N"; */

          "_SRCH_SRNID=PNO102000&_CUR_CMD=RetrieveMainInfo.laf&_CUR_SRNID=PNO102000&_NEXT_CMD=RetrieveMainInfo.laf&_NEXT_SRNID=PNO102000&_PRE_SRNID=&_FORM_YN=N";

        break;
      case DETAIL_LIST:
        urlParams =
          COURT_AUCTION +
          DETAIL_LIST +
          /* `bubwLocGubun=1&jiwonNm=${jiwonNm}&jpDeptCd=000000&daepyoSidoCd=&daepyoSiguCd=&daepyoDongCd=&notifyLoc=on&rd1Cd=&rd2Cd=&realVowel=35207_45207&rd3Rd4Cd=&notifyRealRoad=on&saYear=${thisYear.getFullYear()}&saSer=&ipchalGbncd=000331&termStartDt=${termStatDt}&termEndDt=${termEndDt}&lclsUtilCd=&mclsUtilCd=&sclsUtilCd=&gamEvalAmtGuganMin=&gamEvalAmtGuganMax=&notifyMinMgakPrcMin=&notifyMinMgakPrcMax=&areaGuganMin=&areaGuganMax=&yuchalCntGuganMin=&yuchalCntGuganMax=&notifyMinMgakPrcRateMin=&notifyMinMgakPrcRateMax=&srchJogKindcd=&mvRealGbncd=00031R&srnID=PNO102001&_NAVI_CMD=&_NAVI_SRNID=&_SRCH_SRNID=PNO102001&_CUR_CMD=InitMulSrch.laf&_CUR_SRNID=PNO102001&_NEXT_CMD=RetrieveRealEstMulDetailList.laf&_NEXT_SRNID=PNO102002&_PRE_SRNID=&_LOGOUT_CHK=&_FORM_YN=Y`; */

          /* `bubwLocGubun=1&jiwonNm=${jiwonNm}&jpDeptCd=000000&notifyLoc=on&realVowel=35207_45207&notifyRealRoad=on&saYear=${thisYear.getFullYear()}&ipchalGbncd=000331&termStartDt=${termStatDt}&termEndDt=${termEndDt}&mvRealGbncd=00031R&srnID=PNO102001&_SRCH_SRNID=PNO102001&_CUR_CMD=InitMulSrch.laf&_CUR_SRNID=PNO102001&_NEXT_CMD=RetrieveRealEstMulDetailList.laf&_NEXT_SRNID=PNO102002&_FORM_YN=Y`; */

          extraParameter;
        break;

      case DETAIL_INFO:
        urlParams = COURT_AUCTION + DETAIL_INFO + extraParameter;
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
  } finally {
    urlParams = null;
  }
}

export async function crawling() {
  if (!fs.existsSync("./court-list.txt")) {
    await getCourtList();
  }
  // const courtList = fs.readFileSync("./court-list.txt", "utf8").split("\n");
  // 1. 법원 리스트대로 1차 반복
  const courtList = await readCourtListFile();
  assert(courtList.length > 0, { courtListLength: courtList.length });
  const [today, twoWeeksLater] = calcTwoWeeks();
  const thisYear = new Date();

  const encodedCourt = koreanToURIEncoding(courtList[0]);
  // 2. 해당 법원명으로 1 페이지부터 검색결과 가져오기
  const $ = await getHtml(
    COURT_AUCTION,
    DETAIL_LIST,
    auctionListParameter(encodedCourt, thisYear, today, twoWeeksLater, "", "1")
  );

  // 3. 가져온 검색결과에서 원하는 값 추출
  // 4. 검색결과 항목별 물건세부정보 페이지 크롤링 및 추출 함수 필요
  extractDataFromDom($);
}

/**
 *
 * @param { cheerio.CheerioAPI } $
 */
async function extractDataFromDom($) {
  // const totalContentsCount = parseInt($(".txtblue").text().match(/\d+/)[0], 10);

  // $(".Ltbl_list_lvl0, .Ltbl_list_lvl1").each((i, element) => {
  // });
  const firstRow = $(".Ltbl_list_lvl0, .Ltbl_list_lvl1").first();
  // logger.info(firstRow);
  // const values = $(element)

  const [_, saNo, maemulSer] = firstRow
    .find("input[type=checkbox]")
    .val()
    .split(",");

  const courtAndCase = $(firstRow)
    .find("td")
    .eq(1)
    .text()
    .trim()
    .split(/\n+/)
    .map((el) => el.trim())
    .filter((f) => f !== "");
  const [court, ...case_number] = courtAndCase;

  // edge case handling
  if (court === undefined) {
    console.warn("there is no next data");
    return;
  }

  const productDetails = $(firstRow)
    .find("td")
    .eq(2)
    .text()
    .trim()
    .split(/\n+/)
    .map((el) => el.trim());
  const [product_no, purpose] = productDetails;

  const address = $(firstRow)
    .find("td.txtleft")
    .eq(0)
    .text()
    .trim()
    .split(/\n+/g)
    .map((elem) => elem.replace(/\t+/, ""))
    .filter((f) => f !== "");

  const appraisal_and_sale = $(firstRow)
    .find("td.txtright div")
    .text()
    .trim()
    .split(/\n+/)
    .map((el) => el.trim().replace(/\t+/g, "").replace(/,/g, ""))
    .filter((f) => f !== "");

  const appraisal_amount = parseInt(appraisal_and_sale[0], 10);
  const lowest_sale_price = parseInt(appraisal_and_sale[1], 10);

  const investigator_and_date = $(firstRow)
    .find("td")
    .last()
    .text()
    .trim()
    .split(/\n+/)
    .map((el) => el.trim().replace(/\t+/g, ""))
    .filter((f) => f !== "");

  const investigator = investigator_and_date[0];
  const sale_date = convertToKST(investigator_and_date[1]);
  const progress = investigator_and_date[2];

  const thisYear = new Date();
  const [today, twoWeeksLater] = calcTwoWeeks();

  const realEstateDetailInfo = await getHtml(
    COURT_AUCTION,
    DETAIL_INFO,
    auctionDetailParameter(
      koreanToURIEncoding(court),
      saNo,
      maemulSer,
      thisYear,
      today,
      twoWeeksLater
    )
  );

  extractDataFromRealEstateDetail(realEstateDetailInfo);
}

function extractDataFromRealEstateDetail($) {
  // logger.info($.html());
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

async function readCourtListFile() {
  try {
    if (fs.existsSync("./court-list.txt")) {
      const data = fs.readFileSync("./court-list.txt", "utf8");
      return data.split("\n");
    } else {
      console.error("File does not exist.");
      // return []; // or handle as appropriate
      await getCourtList();

      try {
        const data = fs.readFileSync("./court-list.txt", "utf8");
        return data.split("\n");
      } catch (error) {
        console.error(error);
        console.error(
          "An attempt to create the file failed because the file does not exist."
        );
      }
    }
  } catch (err) {
    console.error("Error reading file:", err);
    return []; // or handle as appropriate
  }
}
