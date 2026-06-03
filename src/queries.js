/**
 * src/queries.js
 *
 * All validation logic converted from Python/pandas (Models_AR.py) to plain JS.
 *
 * Convention:
 *   - `rows`  = array of plain objects (one per CSV row), keyed by column header
 *   - Each query returns a filtered subset of `rows`
 *   - Missing/blank values are treated the same as Python's NaN / ''
 */

'use strict';

// ── Reference lists (copied verbatim from Python) ────────────────────────────

const Gas_name   = ['Gas', 'Fuel', 'gas', 'fuel'];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True when value is null, undefined, or blank string */
function isEmpty(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

/** True when value is not null/undefined/blank */
function isPresent(v) {
  return !isEmpty(v);
}

function val(row, col) {
  return row[col] !== undefined ? String(row[col]).trim() : '';
}

/** Case-insensitive substring check */
function containsCI(str, sub) {
  return String(str || '').toLowerCase().includes(String(sub || '').toLowerCase());
}

/** Required-column guard – throws descriptive error if any column is missing */
function requireCols(rows, cols) {
  if (!rows || rows.length === 0) return;
  const available = new Set(Object.keys(rows[0]));
  for (const c of cols) {
    if (!available.has(c)) throw new Error(`Missing required column: ${c}`);
  }
}

const REQUIRED_COLS = [
'GSR_GLOBAL_ID','Local Code','Local Trade Channel','Local Sub Channel','Exception Code','IRT Local Code','IRT Name','Family Code','Name','Store Number','Address','Place','City','State','Postal Code','Address Quality','Latitude','Longitude','GeoCode source','GeoCode Quality','Fips type','Area Code','Phone','ReplacedBy Code','ReplacedBy Status','ReplacedBy Name','ReplacedBy Address','ReplacedBy Trade Channel','ReplacedBy Local Sub Channel','Status','Status Date','MG Local Code','MG Name','Beer','Wine','Liquor','Modelled ACV Code','Clinic','Clinic Name','Food Type','Pharmacy'
,'Gas','Verification Date','Verification Source','Grocery Supplier Number','Grocery Supplier verification Source','Grocery Supplier verification Date','Confection Supplier Number','Confection Supplier Verification Source','Confection Supplier Verification Date','GM Supplier Number','GM Supplier Verification Source','GM Supplier Verification Date','HBC Supplier Number','HBC Supplier Verification Source','HBC Supplier Verification Date','Frozen Supplier Number','Frozen Supplier Verification Source','Frozen Supplier Verification Date','Syndicated Chain','Syndicated Record','Postal Code Extension','PARTY_TYPE'
];


/** Query 2: Exception Code 777793Z with status not UV */
function query_2(rows) {
  requireCols(rows, REQUIRED_COLS);
  return rows.filter(r =>
    val(r, 'Exception Code') === '777793Z' &&
    val(r, 'Status') !== '[UV] Unverifiable'
  );
}

/** Query 3: Status OP/DUP/NA + Verification Source = Attempted Contact Failed */
function query_3(rows) {
  requireCols(rows, REQUIRED_COLS);
  return rows.filter(r =>
    ['[OP] Open, Operating','[DUP] Duplicate','[NA] Inactive/Not Verified']
      .includes(val(r, 'Status')) &&
    val(r, 'Verification Source') === '[34] Attempted Contact Failed'
  );
}

/** Query 4: Invalid Verification Source for OP/FO/TC */
function query_4(rows) {
  requireCols(rows, REQUIRED_COLS);
  const allowed = [
    '[34] Attempted Contact Failed','[42] Web Lookup','[40] Web Sites, Other',
    '[12] Screen Scrape','[20] Licensing Agencies, Alochol','[23] Telephone, Indirect',
    '[29] Licensing Agencies, Drug','[2] Telephone, Direct','[32] Retailer Store List',
    '[39] New/press Release','[43] S.E.C.','[21] EM Verified through Research',
  ];
  return rows.filter(r =>
    ['[OP] Open, Operating','[FO] Future Opening','[TC] Closed'].includes(val(r, 'Status')) &&
    !allowed.includes(val(r, 'Verification Source'))
  );
}


/** Query 7: Non-Standardized Address (not Duplicate) */
function query_7(rows) {
  requireCols(rows, REQUIRED_COLS);
  return rows.filter(r =>
    val(r, 'Address Quality') === 'Non Standardized' &&
    val(r, 'Status') !== '[DUP] Duplicate '
  );
}


/** Query 9: UV status with source ≠ Attempted Contact Failed */
function query_9(rows) {
  requireCols(rows, REQUIRED_COLS);
  return rows.filter(r =>
    val(r, 'Status') === '[UV] Unverifiable' &&
    val(r, 'Verification Source') !== '[34] Attempted Contact Failed'
  );
}



/** UV records without 93Z exception code */
function Unverifiable_Records(rows) {
  requireCols(rows, REQUIRED_COLS);
  return rows.filter(r =>
    val(r, 'Status') === '[UV] Unverifiable' &&
    val(r, 'Exception Code') !== '777793Z'
  );
}

/** UV with different trade channel */
function Unverifiable_With_Diff_Trade(rows) {
  requireCols(rows, REQUIRED_COLS);
  return rows.filter(r => {
    const st  = val(r, 'Status');
    const ch  = val(r, 'Local Trade Channel');
    const sub = val(r, 'Local Sub Channel');
    const ec  = val(r, 'Exception Code');
    const cond1 = (
      ch === '[09] Unknown Retailers' &&
      sub === '[X] Retail Other' &&
      st  === '[UV] Unverifiable' &&
      ec  !== '777793Z'
    );
    const cond2 = (
      st  === '[UV] Unverifiable' &&
      ch  !== '[09] Unknown Retailers'
    );
    return cond1 || cond2;
  });
}

/** IRT present but Store Number empty */
function IRT_With_Null_Store_No(rows) {
  requireCols(rows, REQUIRED_COLS);
  return rows.filter(r =>
    isPresent(r['IRT Local Code']) &&
    isEmpty(r['Store Number']) &&
    ['[OP] Open, Operating','[FO] Future Opening'].includes(val(r, 'Status'))
  );
}

/** FO status with unknown/non-syndicate channel */
function FO_with_Non_Syndicate(rows) {
  requireCols(rows, REQUIRED_COLS);
  return rows.filter(r =>
    ['[09] Unknown Retailers','[59] Unknown On-Premise'].includes(val(r, 'Local Trade Channel')) &&
    val(r, 'Status') === '[FO] Future Opening'
  );
}

/** Banner name case / special character / word check */
function query_banner_name_case(rows) {
  requireCols(rows, REQUIRED_COLS);
  const specifiedWords = [
    'Accounting','Advertising','Billing','Co','Company','Cos','Dist',
    'Distribution','Distributor','Ent','Enterprises','Headquarters','HQ',
    'Inc','LLC','Region','Warehouse','Whse','Bbq','Extramile','And'
  ];
  const wordPattern = new RegExp(`\\b(${specifiedWords.join('|')})\\b`);
  const specialCharPattern = /[^\w\s&]/;

  function isProperCase(name) {
    if (!name) return false;
    return name === name.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
  }
  function hasSpecialOrAnd(name) {
    if (!name) return false;
    return specialCharPattern.test(name) || name.includes('And');
  }
  function hasSpecifiedWords(name) {
    if (!name) return false;
    return wordPattern.test(name);
  }

  return rows.filter(r => {
    const name = val(r, 'Name');
    return !isProperCase(name) || hasSpecialOrAnd(name) || hasSpecifiedWords(name);
  });
}

/** IRT present but MG Local Code empty */
function query_irt_requires_mg_local_code(rows) {
  requireCols(rows, REQUIRED_COLS);
  const missing = ['','nan','None'];
  return rows.filter(r => {
    const irt = val(r, 'IRT Local Code');
    const mg  = val(r, 'MG Local Code');
    const st  = val(r, 'Status');
    return (
      !missing.includes(irt) &&
      missing.includes(mg) &&
      ['[OP] Open, Operating','[FO] Future Opening'].includes(st)
    );
  });
}

/** Verification Date validation (YYYYMMDD format) */
function query_invalid_verification_date(rows) {
    requireCols(rows, REQUIRED_COLS);

    const today = new Date();
    today.setHours(0,0,0,0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return rows.filter(r => {

        const dateStr = String(val(r,'Verification Date')).trim();

        // Skip blank values
        if (!dateStr || dateStr.length !== 8) {
            return true;
        }

        // Parse YYYYMMDD
        const year = parseInt(dateStr.substring(0,4));
        const month = parseInt(dateStr.substring(4,6)) - 1;
        const day = parseInt(dateStr.substring(6,8));

        const verificationDate =
            new Date(year, month, day);

        verificationDate.setHours(0,0,0,0);

        // Invalid date format
        if (isNaN(verificationDate.getTime())) {
            return true;
        }

        // Allow only yesterday, today, tomorrow
        return !(
            verificationDate.getTime() === yesterday.getTime() ||
            verificationDate.getTime() === today.getTime() ||
            verificationDate.getTime() === tomorrow.getTime()
        );
    });
}

/** Check empty phone for open/FO non-unknown channels */
function check_empty_phone(rows) {
  requireCols(rows, REQUIRED_COLS);
  const excludedCh = ['[09] Unknown Retailers','[59] Unknown On-Premise','[13] Fulfillment'];
  return rows.filter(r =>
    isEmpty(r['Phone']) &&
    ['[OP] Open, Operating','[FO] Future Opening'].includes(val(r, 'Status')) &&
    !excludedCh.includes(val(r, 'Local Trade Channel'))
  );
}

/** Gas keyword in name but Gas flag null or N */
function query_banner_with_gas(rows) {
  return rows.filter(r => {
    const name = val(r, 'Name').toLowerCase();
    const hasGas = Gas_name.some(g => name.includes(g.toLowerCase()));
    const gasFlag = val(r, 'Gas');
    return hasGas && (isEmpty(gasFlag) || gasFlag === 'N');
  });
}





/** Name vs MG Name mismatch (MG Name is not substring of Name) */
function check_mg_name_mismatch(rows) {
  requireCols(rows, REQUIRED_COLS);
  const validStatus = ['[OP] Open, Operating','[TC] Closed','[FO] Future Opening'];
  return rows.filter(r => {
    const name = val(r, 'Name').toLowerCase();
    const mg   = val(r, 'MG Name').toLowerCase();
    return (
      validStatus.includes(val(r, 'Status')) &&
      mg !== '' && !name.includes(mg)
    );
  });
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

function processCSV(rows) {
  const resultDict = {};

  function safe(key, fn) {
    try {
      resultDict[key] = fn();
    } catch (e) {
      resultDict[key + ' Error'] = [{ Error: String(e.message) }];
    }
  }


  safe('93Z_with_OP_TC_NA_FO',              () => query_2(rows));
  safe('NA_Atm_Cnt_Fld_OP_NA_FO',           () => query_3(rows));
  safe('Invalid_Verification_Source_OP_FO_TC', () => query_4(rows));
  safe('Non_standardized_Address',          () => query_7(rows));
  safe('Inactive_Other_than_Spl_Proj',      () => query_8(rows));
  safe('UV_other_than_Attmp',               () => query_9(rows));
  safe('UV_other_than_93Z',                 () => Unverifiable_Records(rows));
  safe('UV_with_Different_Trade',           () => Unverifiable_With_Diff_Trade(rows));
  safe('IRT_With_Null_Store_No',            () => IRT_With_Null_Store_No(rows));
  safe('FO_with_Non_Syndicate',             () => FO_with_Non_Syndicate(rows));
  safe('Incorrect_Banner_Rule',             () => query_banner_name_case(rows));
  safe('IRT_without_MG',                    () => query_irt_requires_mg_local_code(rows));
  safe('Invalid_Verification_Date',         () => query_invalid_verification_date(rows));
  safe('Null_Phone',                        () => check_empty_phone(rows));
  safe('Banner_with_gas',                   () => query_banner_with_gas(rows));
  safe('03_With_Pharm_Flag_as_No_&_Null',   () => query_pharmacy_flag(rows));
  safe('Incorrect_MG',                      () => check_mg_name_mismatch(rows));

  // Add error summary
  const summary = Object.entries(resultDict).map(([k, v]) => ({
    'Sheet Name': k,
    'Error Count': Array.isArray(v) ? v.length : 0,
  }));
  resultDict['Error Summary'] = summary;

  return resultDict;
}

module.exports = { processCSV };
