import Papa from 'papaparse'

/**
 * ASN Bank CSV column mapping
 * Columns: Datum, Je rekening, Van / naar, Naam, Adres, Postcode, Woonplaats,
 *          Valuta saldo, Saldo voor boeking, Valuta, Bedrag bij / af,
 *          Verwerkingsdatum, Valutadatum, Code, Type, Volgnummer,
 *          Betalingskenmerk, Omschrijving, Afschriftnummer, Categorie
 */
const ASN_COLUMNS = [
  'Datum',
  'Je rekening',
  'Van / naar',
  'Naam',
  'Adres',
  'Postcode',
  'Woonplaats',
  'Valuta saldo',
  'Saldo voor boeking',
  'Valuta',
  'Bedrag bij / af',
  'Verwerkingsdatum',
  'Valutadatum',
  'Code',
  'Type',
  'Volgnummer',
  'Betalingskenmerk',
  'Omschrijving',
  'Afschriftnummer',
  'Categorie',
]

/**
 * Parse a date string from ASN format (DD-MM-YYYY) to ISO format (YYYY-MM-DD)
 */
function parseAsnDate(dateStr) {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

/**
 * Parse amount from ASN Bank CSV format.
 *
 * ASN exports two possible formats depending on the download option:
 *  - Dutch:  "1.234,56"  => dot=thousands separator, comma=decimal
 *  - Plain:  "1234.56"   => dot=decimal (no thousands separator)
 *
 * We detect which format is present and handle both correctly.
 */
function parseAmount(amountStr) {
  if (!amountStr || amountStr.trim() === '') return 0
  const s = amountStr.trim()

  // Dutch format: contains comma => comma is the decimal separator
  if (s.includes(',')) {
    // Remove ALL dots (thousands separators), then replace comma with dot
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
  }

  // Plain format: no comma => dot is the decimal separator, parse directly
  return parseFloat(s) || 0
}

/**
 * Parse an ASN Bank CSV file and return structured transaction objects
 */
export function parseAsnCsv(csvText) {
  // Auto-detect delimiter: ASN Bank exports use comma OR semicolon.
  function tryParse(delimiter) {
    return Papa.parse(csvText, {
      delimiter,
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    })
  }

  const withComma     = tryParse(',')
  const withSemicolon = tryParse(';')
  const colsComma     = withComma.meta.fields?.length ?? 0
  const colsSemicolon = withSemicolon.meta.fields?.length ?? 0

  // Pick the parse that gives more columns (closer to the 20 expected columns)
  const result = colsSemicolon > colsComma ? withSemicolon : withComma

  if (result.errors.length > 0) {
    console.warn('CSV parse warnings:', result.errors)
  }

  // Check if headers match -- if no headers, use positional mapping
  const hasHeaders = result.meta.fields?.includes('Datum')

  let rows
  if (hasHeaders) {
    rows = result.data
  } else {
    // Re-parse without headers and map positionally
    const detectedDelimiter = colsSemicolon > colsComma ? ';' : ','
    const reparse = Papa.parse(csvText, {
      delimiter: detectedDelimiter,
      header: false,
      skipEmptyLines: true,
    })
    rows = reparse.data.map((row) => {
      const obj = {}
      ASN_COLUMNS.forEach((col, i) => {
        obj[col] = row[i] || ''
      })
      return obj
    })
  }

  return rows.map((row) => ({
    transaction_date: parseAsnDate(row['Datum']),
    account_number: row['Je rekening']?.trim(),
    counterparty_account: row['Van / naar']?.trim() || null,
    counterparty_name: row['Naam']?.trim() || null,
    address: row['Adres']?.trim() || null,
    postcode: row['Postcode']?.trim() || null,
    city: row['Woonplaats']?.trim() || null,
    balance_before: parseAmount(row['Saldo voor boeking']),
    amount: parseAmount(row['Bedrag bij / af']),
    currency: row['Valuta']?.trim() || 'EUR',
    processing_date: parseAsnDate(row['Verwerkingsdatum']),
    value_date: parseAsnDate(row['Valutadatum']),
    code: row['Code']?.trim() || null,
    transaction_type: row['Type']?.trim() || null,
    sequence_number: row['Volgnummer']?.trim() || null,
    payment_reference: row['Betalingskenmerk']?.trim() || null,
    description: row['Omschrijving']?.trim() || null,
    statement_number: row['Afschriftnummer']?.trim() || null,
    asn_category: row['Categorie']?.trim() || null,
  }))
}

/**
 * Auto-categorize a transaction based on known patterns
 * Returns a category name or null if unknown
 */
const CATEGORY_PATTERNS = [
  // Wonen
  { pattern: /hypotheek|kadaster|vve|servicekosten/i, category: 'Wonen' },
  // Energie & Water
  { pattern: /eneco|vattenfall|essent|greenchoice|waterschap|vitens|dunea|pwn/i, category: 'Energie & Water' },
  // Boodschappen
  { pattern: /albert heijn|ah\b|jumbo|lidl|aldi|plus\b|dirk|coop\b|spar\b|dekamarkt|hoogvliet|picnic/i, category: 'Boodschappen' },
  // Eten & Drinken
  { pattern: /thuisbezorgd|uber ?eats|deliveroo|domino|mcdon|burger ?king|kfc|starbucks|restaurant|cafe|eetcafe/i, category: 'Eten & Drinken' },
  // Kinderen
  { pattern: /bso|kinderopvang|overblijf|schoolfonds|intertoys|kinderdagverblijf/i, category: 'Kinderen' },
  // Huishouden
  { pattern: /schoonma|werkster|huishoud/i, category: 'Huishouden' },
  // Vervoer
  { pattern: /shell|bp\b|total|esso|tinq|tango|ns\.nl|ov-chipkaart|anwb|parkeer|q-park|p1\b/i, category: 'Vervoer' },
  // Abonnementen
  { pattern: /spotify|netflix|disney|hbo|videoland|kpn|t-mobile|vodafone|ziggo|odido|amazon prime/i, category: 'Abonnementen' },
  // Verzekeringen
  { pattern: /nationale.nederlanden|nn\b|centraal beheer|interpolis|aegon|unive|zilveren.kruis|cz\b|menzis|vgz/i, category: 'Verzekeringen' },
  // Gezondheid
  { pattern: /apotheek|huisarts|tandarts|fysio|ziekenhuis|oogarts|dermato/i, category: 'Gezondheid' },
  // Kleding
  { pattern: /h&m|zara|primark|c&a|hema|uniqlo|zalando|wehkamp|nike|adidas/i, category: 'Kleding' },
  // Vrije tijd
  { pattern: /bioscoop|path[e\u00e9]|cinema|museum|dierentuin|pretpark|efteling|zwembad|sport|fitness/i, category: 'Vrije tijd' },
  // Sparen & Investeren
  { pattern: /spaarrekening|degiro|lendahand|mintos|belegg/i, category: 'Sparen & Investeren' },
  // Goede doelen
  { pattern: /giro555|unicef|rode kruis|greenpeace|amnesty|warchild|kika\b|wwf\b|oxfam|nlcares|doneer|donatie|goede doelen|effectief doneren/i, category: 'Goede doelen' },
  // Cadeaus
  { pattern: /cadeaubon|kadoshop|kadoland|geschenk|gift.card|bol\.com.*cadeau|prezzybox|hallmark/i, category: 'Cadeaus' },
  // Belastingen & Toeslagen
  { pattern: /belastingdienst|toeslagen|gemeentebelasting|ozb\b|waterschapsbelasting|rioolheffing|afvalstoffenheffing|motorrijtuigenbelasting|mrb\b|bpm\b|inkomstenbelasting|omzetbelasting|btw.aangifte|cak\b|eigen.bijdrage.wlz|centraal.justitieel|cjib\b/i, category: 'Belastingen & Toeslagen' },
]

export function autoCategorize(transaction) {
  const searchText = [
    transaction.counterparty_name,
    transaction.description,
    transaction.asn_category,
  ]
    .filter(Boolean)
    .join(' ')

  for (const rule of CATEGORY_PATTERNS) {
    if (rule.pattern.test(searchText)) {
      return rule.category
    }
  }
  return null
}

/**
 * Match a transaction against custom rules from the database
 */
export function matchCustomRules(transaction, rules) {
  const searchFields = {
    counterparty_name: transaction.counterparty_name || '',
    description: transaction.description || '',
    asn_category: transaction.asn_category || '',
  }

  for (const rule of rules) {
    const fieldValue = searchFields[rule.match_field] || ''
    if (fieldValue.toLowerCase().includes(rule.pattern.toLowerCase())) {
      return rule.category_id
    }
  }
  return null
}
