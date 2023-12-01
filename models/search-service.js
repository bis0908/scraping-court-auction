import * as cheerio from "cheerio";

import { calcTwoWeeks, convertToKST } from "../common/date-control.js";

import { assert } from "console";
import axios from "axios";
import exportFakeUserAgent from "../common/fake-user-agent.js";
import fs from "fs";
import { koreanToURIEncoding } from "../common/string-control.js";
import logger from "../config/logger.js";
import path from "path";
import puppeteer from "puppeteer";

const COURT_AUCTION = "https://www.courtauction.go.kr/";
const MAIN_INFO = "RetrieveMainInfo.laf?";
const DETAIL_LIST = "RetrieveRealEstMulDetailList.laf?";
const DETAIL_INFO = "RetrieveRealEstCarHvyMachineMulDetailInfo.laf?";
const SRN_ID = "PNO102001";
const AUCTION_LIST = [];
let rowUrl = "";

async function replaceParams(query, i) {
  // query = query.replace(/start=[0-9]+/, `start=${i}`);
  // query = query.replace(/api_type=2/, "api_type=1");

  return query;
}

let urlParams;

const __dirname = path.resolve();

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
  return `bubwLocGubun=1&jiwonNm=${jiwonNm}&jpDeptCd=000000&notifyLoc=on&realVowel=35207_45207&notifyRealRoad=on&saYear=${thisYear.getFullYear()}&termStartDt=${termStartDt}&termEndDt=${termEndDt}&mvRealGbncd=00031R&srnID=${SRN_ID}&_SRCH_SRNID=${SRN_ID}&_CUR_CMD=InitMulSrch.laf&_CUR_SRNID=${SRN_ID}&_NEXT_CMD=RetrieveRealEstMulDetailList.laf&_NEXT_SRNID=PNO102002&_FORM_YN=Y&page=${page}&targetRow=${targetRow}&pageSpec=${page}`;
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
  return `jiwonNm=${jiwonNm}&saNo=${saNo}&maemulSer=${maemulSer}&_NAVI_CMD=InitMulSrch.laf&_NAVI_SRNID=${SRN_ID}&_SRCH_SRNID=${SRN_ID}&_CUR_CMD=RetrieveRealEstMulDetailList.laf&_CUR_SRNID=PNO102002&_NEXT_CMD=RetrieveRealEstCarHvyMachineMulDetailInfo.laf&_NEXT_SRNID=PNO102015&_FORM_YN=Y&_C_bubwLocGubun=1&_C_jiwonNm=${jiwonNm}&_C_jpDeptCd=000000&_C_notifyLoc=on&_C_realVowel=35207_45207&_C_notifyRealRoad=on&_C_saYear=${thisYear.getFullYear()}&_C_saSer=&_C_ipchalGbncd=&_C_termStartDt=${termStartDt}&_C_termEndDt=${termEndDt}&_C_mvRealGbncd=00031R&_C_srnID=${SRN_ID}`;
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
          "_SRCH_SRNID=PNO102000&_CUR_CMD=RetrieveMainInfo.laf&_CUR_SRNID=PNO102000&_NEXT_CMD=RetrieveMainInfo.laf&_NEXT_SRNID=PNO102000&_PRE_SRNID=&_FORM_YN=N";

        break;
      case DETAIL_LIST:
        urlParams = COURT_AUCTION + DETAIL_LIST + extraParameter;
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
  const auctionItem = {};
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

  const courtAndCase = removeTabAndLineBreak($, $(firstRow).find("td").eq(1));

  const [court, ...case_number] = courtAndCase;

  // edge case handling
  if (court === undefined) {
    console.warn("there is no next data");
    return;
  }

  auctionItem["court"] = court;
  auctionItem["case_number"] = case_number.join();

  const productDetails = removeTabAndLineBreak($, $(firstRow).find("td").eq(2));
  const [product_no, purpose] = productDetails;
  auctionItem["product_no"] = product_no;
  auctionItem["purpose"] = purpose;

  const address = removeTabAndLineBreak(
    $,
    $(firstRow).find("td.txtleft").eq(0)
  ).join();
  auctionItem["address"] = address;

  const appraisal_and_sale = removeTabAndLineBreak(
    $,
    $(firstRow).find("td.txtright div")
  );
  const appraisal_amount = parseInt(appraisal_and_sale[0], 10);
  const lowest_sale_price = parseInt(appraisal_and_sale[1], 10);

  auctionItem["appraisal_amount"] = appraisal_amount;
  auctionItem["lowest_sale_price"] = lowest_sale_price;

  const investigator_and_date = removeTabAndLineBreak(
    $,
    $(firstRow).find("td").last()
  );

  const investigator = investigator_and_date[0];
  const sale_date = convertToKST(investigator_and_date[1]);
  const progress = investigator_and_date[2] + investigator_and_date[3];
  auctionItem["investigator"] = investigator;
  auctionItem["sale_date"] = sale_date;
  auctionItem["progress"] = progress;

  const thisYear = new Date();
  const [today, twoWeeksLater] = calcTwoWeeks();

  rowUrl =
    COURT_AUCTION +
    DETAIL_INFO +
    auctionDetailParameter(
      koreanToURIEncoding(court),
      saNo,
      maemulSer,
      thisYear,
      today,
      twoWeeksLater
    );

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
  auctionItem["basic_object_info"] =
    extractDataFromRealEstateDetail(realEstateDetailInfo);

  // logger.info(JSON.stringify(auctionItem));
  // AUCTION_LIST.push(auctionItem);
}

/**
 *
 * @param {cheerio.CheerioAPI} $ Object
 * @param {string} elem elements
 * @returns String Array
 */
function removeTabAndLineBreak($, elem) {
  return (
    $(elem)
      .text()
      .trim()
      .split(/\t+/g)
      // .map((el) => el.replace("|", "").trim())
      .map((el) =>
        el
          .replace(/[\t+\+|]/g, "")
          .replace(/,/g, "")
          .trim()
      )
      .filter((f) => f !== "")
  );
}

/**
 *
 * @param {cheerio.CheerioAPI} $ cheerio Object
 * @returns Object
 */
function extractDataFromRealEstateDetail($) {
  const basicObjectInfo = {};
  // const basicInfo = new Object();
  // const basicInfo2 = new Object();
  const photoInfo = new Array();
  const auctionHistory = new Array();
  const listHistory = new Array();
  const nearbySalesStatistics = new Array();

  // 물건 기본 정보: obj
  $("table.Ltbl_dt")
    .eq(0)
    .find("td")
    .each((i, elem) => {
      const title = $(elem).prev().text();
      if (i === 1 || i === 3 || i === 4) {
        basicObjectInfo[title] = parseInt(
          removeTabAndLineBreak($, elem)[0].match(/\d+/),
          10
        );
      } else {
        basicObjectInfo[title] = removeTabAndLineBreak($, elem).join();
      }
    });

  const dirPath = path.join(
    __dirname,
    "public",
    "images",
    basicObjectInfo["담당"][0],
    basicObjectInfo["사건번호"][0]
  );

  // 이미지 저장 경로 생성
  mkdir(dirPath);

  // 물건 기본 정보 2: obj
  $("table.Ltbl_dt")
    .eq(1)
    .find("td")
    .each((_, elem) => {
      const title = $(elem).prev().text();
      if (title === "청구금액") {
        basicObjectInfo[title] = parseInt(
          removeTabAndLineBreak($, elem)[0].replace("원", ""),
          10
        );
      } else {
        basicObjectInfo[title] = removeTabAndLineBreak($, elem)[0];
      }
    });

  // 이미지 경로 배열 추출
  $("table.Ltbl_dt")
    .eq(2)
    .find("img")
    .each((i, img) => {
      const src = $(img).attr("src");
      photoInfo.push(src.replaceAll("T_", ""));
    });
  photoInfo.shift();
  photoInfo.pop();
  // TODO: 사진 추출 함수 호출 필요

  // 기일내역 추출: arr of obj
  $("table.Ltbl_list")
    .eq(0)
    .find("tbody tr")
    .each((_, row) => {
      const rowObj = {};
      $(row)
        .find("td")
        .each((index, cell) => {
          const header = $("table.Ltbl_list").eq(0).find("th").eq(index).text();
          const data = removeTabAndLineBreak($, cell)[0];
          if (header === "최저매각가격") {
            rowObj[header] =
              data !== undefined ? parseInt(data.replace("원", ""), 10) : "";
          } else {
            rowObj[header] = data ?? "";
          }
        });

      auctionHistory.push(rowObj);
    });
  basicObjectInfo["auction_history"] = auctionHistory;

  // 목록내역 추출: arr of obj
  $("table.Ltbl_list")
    .eq(1)
    .find("tbody tr")
    .each((_, row) => {
      const rowObj = {};
      $(row)
        .find("td")
        .each((idx, cell) => {
          const header = $("table.Ltbl_list").eq(1).find("th").eq(idx).text();
          let data;
          if (header === "상세내역") {
            data = removeTabAndLineBreak($, cell).join("\n");
          } else {
            if (header === "목록번호") {
              data = parseInt(removeTabAndLineBreak($, cell)[0], 10);
            } else {
              data = removeTabAndLineBreak($, cell)[0];
            }
          }
          rowObj[header] = data;
        });
      listHistory.push(rowObj);
    });
  basicObjectInfo["list_history"] = listHistory;

  // 감정평가요항표 추출: string
  const appraisalStatement = removeTabAndLineBreak(
    $,
    $("table.Ltbl_dt").eq(3)
  ).join("\n");

  basicObjectInfo["appraisal_requirements"] = appraisalStatement;

  // 인근매각통계: arr of obj
  $("table.Ltbl_list")
    .eq(2)
    .find("tbody tr")
    .each((_, row) => {
      const rowObj = {};
      $(row)
        .find("td")
        .each((idx, cell) => {
          const header = $("table.Ltbl_list").eq(2).find("th").eq(idx).text();
          let data;
          if (idx === 2 || idx === 3) {
            data = parseInt(
              removeTabAndLineBreak($, cell)[0].replace("원", ""),
              10
            );
          } else {
            data = removeTabAndLineBreak($, cell)[0];
          }
          rowObj[header] = data;
        });
      nearbySalesStatistics.push(rowObj);
    });
  basicObjectInfo["nearby_sales_statistics"] = nearbySalesStatistics;

  (async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(rowUrl);
    await page.click("#nearMaeTongList > div > div > div > a");
    await page.waitForSelector("#idNearYusaMgakMul table", {
      timeout: 500,
    });

    // 인근 매각 물건
    const itemSaleNearby = await page.evaluate(() => {
      const headers = Array.from(
        document.querySelectorAll("#idNearYusaMgakMul table thead th")
      ).map((th) => th.innerText.trim());
      const rows = Array.from(
        document.querySelectorAll("#idNearYusaMgakMul table tbody tr")
      );

      return rows.map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        const rowObj = {};
        cells.forEach((cell, index) => {
          if (index === 3 || index === 5) {
            rowObj[headers[index]] = parseInt(
              cell.innerText.trim().replace(/,/g, ""),
              10
            );
          } else {
            rowObj[headers[index]] = cell.innerText.trim().replace("\n", ",");
          }
        });
        return rowObj;
      });
    });

    // 인근 진행 물건
    await page.click(
      "div.tab_menu_off_m_mid > a[onclick*=\"changeDisplayTable('jinhang')\"]"
    );

    await page.waitForSelector("#idNearJinhangMul table", {
      timeout: 500,
    });

    await browser.close();
    return { itemSaleNearby };
  })();

  return basicObjectInfo;
  // logger.info("basicObjectInfo: " + JSON.stringify(basicObjectInfo));
}

/**
 *
 * @param {Array} imgSrcArr img src array
 * @param {Object} basicInfo 물건 기본 정보
 */
async function saveImages(imgSrcArr, basicInfo) {
  const fetchPromises = imgSrcArr.map((src, i) => {
    fetch(COURT_AUCTION + src)
      .then((res) => res.arrayBuffer())
      .then((data) => {
        const buffer = Buffer.from(data);
        fs.createWriteStream(
          path.join(
            __dirname,
            "public",
            "images",
            basicInfo["담당"][0],
            basicInfo["사건번호"][0],
            basicInfo["사건번호"][0] + `_${i}.jpg`
          )
        ).write(buffer);
      });
  });

  await Promise.all(fetchPromises);
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

function mkdir(dirPath) {
  const isExists = fs.existsSync(dirPath);
  if (!isExists) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
