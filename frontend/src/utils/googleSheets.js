
export const syncToGoogleSheets = async (data, category, webAppUrl) => {
  if (!webAppUrl) {
    console.error("Google Apps Script Web App URL is not provided.");
    throw new Error("Google Apps Script Web App URL is not provided.");
  }

  try {
    await fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors",
      cache: "no-store",
      redirect: "follow",
      body: new URLSearchParams({
        payload: JSON.stringify({
          action: "syncRow",
          category,
          record: data,
        })
      }),
    });
  } catch (error) {
    console.error("Error syncing to Google Sheets:", error);
    throw error;
  }
};

export const syncAllToGoogleSheets = async (records, category, webAppUrl, replace = false) => {
  if (!webAppUrl) {
    console.error("Google Apps Script Web App URL is not provided.");
    throw new Error("Google Apps Script Web App URL is not provided.");
  }

  try {
    await fetch(webAppUrl, {
      method: "POST",
      mode: "no-cors",
      cache: "no-store",
      redirect: "follow",
      body: new URLSearchParams({
        payload: JSON.stringify({
          action: "syncAll",
          category,
          records,
          replace,
        })
      }),
    });
  } catch (error) {
    console.error("Error syncing all to Google Sheets:", error);
    throw error;
  }
};
