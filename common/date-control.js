/**
 *
 * @returns Array [today, today + 14]
 */
function calcTwoWeeks() {
  const today = new Date();
  const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000); // Adding 14 days

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2); // Months are 0-indexed
    const day = ("0" + date.getDate()).slice(-2);

    return `${year}.${month}.${day}`;
  };

  return [formatDate(today), formatDate(twoWeeksLater)];
}

/**
 *
 * @returns "yyyy-mm-dd hh:mm:ss"
 */
function getDate() {
  let today = new Date();
  let year = today.getFullYear();
  let month = ("0" + (today.getMonth() + 1)).slice(-2);
  let day = ("0" + today.getDate()).slice(-2);
  let hours = ("0" + today.getHours()).slice(-2);
  let minutes = ("0" + today.getMinutes()).slice(-2);
  let seconds = ("0" + today.getSeconds()).slice(-2);

  let dateString = year + "-" + month + "-" + day;
  let timeString = hours + ":" + minutes + ":" + seconds;
  return dateString + " " + timeString;
}

/**
 *
 * @param {string} dateString
 * @returns "yyyy-mm-dd 오전/오후 hh:mm:ss"
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  const amPm = hours >= 12 ? "오후" : "오전";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  hours = String(hours).padStart(2, "0");

  return `${year}-${month}-${day} ${amPm} ${hours}:${minutes}:${seconds} `;
}

/**
 *
 * @param {string} dateString
 * @returns "yyyy-mm-dd (KST)"
 */
function convertToKST(dateString) {
  const date = new Date(dateString);

  date.setHours(date.getHours() + 9);

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 *
 * @param {string} dateString
 * @returns "yyyy-mm-dd hh:mm:ss (KST)"
 */
function convertToKSTWithTime(dateString) {
  const date = new Date(dateString);

  date.setHours(date.getHours() + 9);

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const second = date.getSeconds().toString().padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 *
 * @returns "yyyy-mm-dd hh:mm:ss"
 */
function getCurrentDateTimeForInput() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export {
  calcTwoWeeks,
  convertToKST,
  convertToKSTWithTime,
  formatDate,
  getCurrentDateTimeForInput,
  getDate,
};
