import { google } from 'googleapis'

const SPREADSHEET_ID = '1gSJBIJGlqgSezhtM22kDJ-zl2E0ELKB3rjDRqmN0Vsk'

function getAuth() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada.')
  }
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

async function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() })
}

export async function getSheetData(sheetName: string, range?: string): Promise<any[][]> {
  const sheets = await getSheetsClient()
  const fullRange = range ? `'${sheetName}'!${range}` : `'${sheetName}'`
  const response = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: fullRange })
  return response.data.values || []
}

export async function updateSheetData(sheetName: string, range: string, values: any[][]) {
  const sheets = await getSheetsClient()
  const fullRange = `'${sheetName}'!${range}`
  const response = await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID, range: fullRange, valueInputOption: 'USER_ENTERED', requestBody: { values },
  })
  return response.data
}

export { SPREADSHEET_ID }
