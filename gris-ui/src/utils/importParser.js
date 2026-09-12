import * as XLSX from 'xlsx';

/**
 * Known model parameter schemas and defaults for validation & type conversion.
 */
export const MODEL_SCHEMAS = {
  'mm1-queue': {
    name: 'M/M/1 or M/M/c Multi-Server Queue',
    defaultHorizon: 3600,
    parameters: {
      lambda: { label: 'Arrival Rate (λ)', type: 'number', default: 0.8, min: 0.01, max: 100 },
      mu: { label: 'Service Rate (μ)', type: 'number', default: 1.0, min: 0.01, max: 100 },
      servers: { label: 'Servers (c)', type: 'integer', default: 1, min: 1, max: 32 },
      warmup: { label: 'Warmup Period (s)', type: 'number', default: 0, min: 0, max: 86400 }
    }
  },
  'mobility-dispatch': {
    name: 'NYC TLC Urban Mobility Dispatch',
    defaultHorizon: 5400,
    parameters: {
      fleetSize: { label: 'Active Fleet Size', type: 'integer', default: 250, min: 10, max: 2000 },
      policy: { label: 'Dispatch Policy', type: 'string', default: 'BATCHED', options: ['NEAREST', 'BATCHED', 'PREPOSITIONING'] },
      batchWindowSeconds: { label: 'Batch Window (s)', type: 'number', default: 15, min: 1, max: 300 },
      demandMultiplier: { label: 'Demand Multiplier', type: 'number', default: 1.0, min: 0.1, max: 10.0 },
      maxWaitTolerance: { label: 'Max Wait Tolerance (s)', type: 'number', default: 600, min: 60, max: 3600 }
    }
  },
  'caucedo-terminal': {
    name: 'DP World Caucedo Terminal Logistics',
    defaultHorizon: 604800,
    parameters: {
      berths: { label: 'Berths Available', type: 'integer', default: 3, min: 1, max: 10 },
      quayCranes: { label: 'Quay Cranes', type: 'integer', default: 6, min: 1, max: 24 },
      movesPerHourPerCrane: { label: 'Crane Productivity (moves/hr)', type: 'number', default: 28.0, min: 5, max: 60 },
      cranePolicy: { label: 'Crane Policy', type: 'string', default: 'DYNAMIC', options: ['STATIC', 'DYNAMIC'] },
      arrivalRatePerDay: { label: 'Vessel Arrival Rate (/day)', type: 'number', default: 4.0, min: 0.5, max: 20 }
    }
  }
};

/**
 * Parses raw text input into a scenario specification.
 */
export function parseImportText(text, formatHint = 'auto') {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'Empty or invalid input text.' };
  }

  const trimmed = text.trim();

  // 1. Check for JSON format
  if (formatHint === 'json' || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const spec = Array.isArray(parsed) ? parsed[0] : parsed;
      const validated = validateScenarioSpec(spec);
      return {
        success: true,
        format: 'JSON',
        spec: validated.spec,
        warnings: validated.warnings,
        fieldStatus: validated.fieldStatus
      };
    } catch (err) {
      if (formatHint === 'json') {
        return { success: false, error: `Invalid JSON syntax: ${err.message}` };
      }
    }
  }

  // 2. CSV / Delimited Parsing
  try {
    const spec = parseCsvToScenario(trimmed);
    const validated = validateScenarioSpec(spec);
    return {
      success: true,
      format: 'CSV',
      spec: validated.spec,
      warnings: validated.warnings,
      fieldStatus: validated.fieldStatus
    };
  } catch (err) {
    return { success: false, error: `Failed to parse tabular data: ${err.message}` };
  }
}

/**
 * Parses a File object (CSV, Excel .xlsx/.xls, or JSON).
 */
export async function parseImportFile(file) {
  if (!file) {
    return { success: false, error: 'No file provided.' };
  }

  const name = file.name.toLowerCase();

  // Excel binary files (.xlsx, .xls)
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.ods')) {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const csvText = XLSX.utils.sheet_to_csv(sheet);
      const result = parseImportText(csvText, 'csv');
      if (result.success) {
        result.format = name.endsWith('.xlsx') ? 'Excel (.xlsx)' : 'Excel (.xls)';
        result.filename = file.name;
        result.fileSize = file.size;
      }
      return result;
    } catch (err) {
      return { success: false, error: `Failed to read Excel workbook: ${err.message}` };
    }
  }

  // Text-based files (.json, .csv, .tsv, .txt)
  try {
    const text = await file.text();
    const hint = name.endsWith('.json') ? 'json' : (name.endsWith('.csv') || name.endsWith('.tsv') ? 'csv' : 'auto');
    const result = parseImportText(text, hint);
    if (result.success) {
      result.filename = file.name;
      result.fileSize = file.size;
    }
    return result;
  } catch (err) {
    return { success: false, error: `Error reading file: ${err.message}` };
  }
}

/**
 * Parses CSV text accommodating Key-Value rows, Tabular rows, and exported reports.
 */
function parseCsvToScenario(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) throw new Error('CSV file is empty.');

  const spec = {
    name: 'Imported Scenario',
    description: '',
    parameters: {}
  };

  // Check if it's a Gris Exported Report
  const isGrisExport = lines.some(l => l.includes('GRIS SIMULATION EXPERIMENT') || l.includes('# Scenario Name:'));
  if (isGrisExport) {
    let inParamsSection = false;
    for (const line of lines) {
      if (line.startsWith('# Scenario Name:')) {
        spec.name = line.replace('# Scenario Name:', '').trim().replace(/^"(.*)"$/, '$1');
      } else if (line.startsWith('# Model Type:')) {
        spec.modelType = line.replace('# Model Type:', '').trim();
      } else if (line.startsWith('# Horizon (s):')) {
        spec.horizon = Number(line.replace('# Horizon (s):', '').trim());
      } else if (line.startsWith('# Replications:')) {
        spec.replications = Number(line.replace('# Replications:', '').trim());
      } else if (line.includes('--- EXPERIMENTAL PARAMETERS ---')) {
        inParamsSection = true;
      } else if (inParamsSection && line.startsWith('#')) {
        inParamsSection = false;
      } else if (inParamsSection && line.includes(',')) {
        const [k, v] = splitCsvLine(line);
        if (k && v && k.toLowerCase() !== 'parameter') {
          spec.parameters[k.trim()] = parseParamValue(v.trim());
        }
      }
    }
    return spec;
  }

  // Check if lines are Key-Value (e.g. "parameter,value" or "key,val")
  const firstLine = lines[0].toLowerCase();
  const isKeyValue = firstLine.includes('param') || firstLine.includes('key') || lines.some(l => {
    const parts = splitCsvLine(l);
    return parts.length === 2 && ['name', 'modeltype', 'horizon', 'replications'].includes(parts[0].toLowerCase());
  });

  if (isKeyValue) {
    for (const line of lines) {
      const parts = splitCsvLine(line);
      if (parts.length < 2) continue;
      const rawKey = parts[0].trim();
      const rawVal = parts[1].trim();
      const lowerKey = rawKey.toLowerCase();

      if (['parameter', 'key', 'variable'].includes(lowerKey)) continue;

      if (lowerKey === 'name') spec.name = rawVal;
      else if (lowerKey === 'description') spec.description = rawVal;
      else if (lowerKey === 'modeltype' || lowerKey === 'model') spec.modelType = rawVal;
      else if (lowerKey === 'horizon') spec.horizon = Number(rawVal);
      else if (lowerKey === 'replications' || lowerKey === 'reps') spec.replications = Number(rawVal);
      else if (lowerKey === 'seedbase' || lowerKey === 'seed') spec.seedBase = Number(rawVal);
      else {
        spec.parameters[rawKey] = parseParamValue(rawVal);
      }
    }
    return spec;
  }

  // Standard Tabular Header CSV (Header row, followed by 1 or more data rows)
  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  const dataRow = splitCsvLine(lines[1] || '').map(d => d.trim());

  headers.forEach((h, idx) => {
    const val = dataRow[idx];
    if (val === undefined || val === '') return;
    const lower = h.toLowerCase();

    if (lower === 'name') spec.name = val;
    else if (lower === 'description') spec.description = val;
    else if (lower === 'modeltype' || lower === 'model') spec.modelType = val;
    else if (lower === 'horizon') spec.horizon = Number(val);
    else if (lower === 'replications' || lower === 'reps') spec.replications = Number(val);
    else if (lower === 'seedbase' || lower === 'seed') spec.seedBase = Number(val);
    else {
      spec.parameters[h] = parseParamValue(val);
    }
  });

  return spec;
}

function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseParamValue(val) {
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (!isNaN(val) && val.trim() !== '') {
    return Number(val);
  }
  return val;
}

/**
 * Validates, infers missing models, clamps bounds, and produces audit status for each field.
 */
export function validateScenarioSpec(rawSpec = {}) {
  const spec = {
    name: rawSpec.name || 'Imported Experiment',
    description: rawSpec.description || '',
    modelType: rawSpec.modelType || '',
    horizon: rawSpec.horizon != null ? Number(rawSpec.horizon) : null,
    replications: rawSpec.replications != null ? Number(rawSpec.replications) : null,
    seedBase: rawSpec.seedBase != null ? Number(rawSpec.seedBase) : null,
    parameters: { ...(rawSpec.parameters || {}) }
  };

  const warnings = [];
  const fieldStatus = [];
  let inferred = false;

  // Infer modelType if not provided
  if (!spec.modelType) {
    const keys = Object.keys(spec.parameters);
    if (keys.some(k => ['fleetSize', 'batchWindowSeconds', 'demandMultiplier', 'maxWaitTolerance'].includes(k))) {
      spec.modelType = 'mobility-dispatch';
      inferred = true;
    } else if (keys.some(k => ['berths', 'quayCranes', 'movesPerHourPerCrane', 'cranePolicy'].includes(k))) {
      spec.modelType = 'caucedo-terminal';
      inferred = true;
    } else if (keys.some(k => ['lambda', 'mu', 'servers', 'warmup'].includes(k))) {
      spec.modelType = 'mm1-queue';
      inferred = true;
    } else {
      spec.modelType = 'mm1-queue'; // Default safe fallback
      warnings.push("Model type not specified; defaulted to 'mm1-queue'.");
    }
  }

  // Model schema lookup
  const schema = MODEL_SCHEMAS[spec.modelType];
  if (!schema) {
    warnings.push(`Unknown modelType '${spec.modelType}'; using raw parameters.`);
  }

  // Validate horizon bounds (max 604,800s / 7 days)
  if (!spec.horizon || spec.horizon <= 0) {
    spec.horizon = schema ? schema.defaultHorizon : 3600;
    warnings.push(`Horizon defaulted to ${spec.horizon}s.`);
    fieldStatus.push({ field: 'horizon', status: 'defaulted', message: `Defaulted to ${spec.horizon}s` });
  } else if (spec.horizon > 604800) {
    spec.horizon = 604800;
    warnings.push('Horizon exceeded 7 days (604,800s); clamped to 604,800s.');
    fieldStatus.push({ field: 'horizon', status: 'adjusted', message: 'Clamped to max 604,800s' });
  } else {
    fieldStatus.push({ field: 'horizon', status: 'valid', message: `${spec.horizon}s` });
  }

  // Replications validation
  if (!spec.replications || spec.replications < 1) {
    spec.replications = 10;
    fieldStatus.push({ field: 'replications', status: 'defaulted', message: 'Defaulted to 10 reps' });
  } else if (spec.replications > 100) {
    spec.replications = 100;
    warnings.push('Replications clamped to maximum 100.');
    fieldStatus.push({ field: 'replications', status: 'adjusted', message: 'Clamped to 100 reps' });
  } else {
    fieldStatus.push({ field: 'replications', status: 'valid', message: `${spec.replications} reps` });
  }

  // Validate and typecast parameters against schema
  if (schema) {
    Object.entries(schema.parameters).forEach(([paramKey, rule]) => {
      const val = spec.parameters[paramKey];
      if (val === undefined || val === null || val === '') {
        spec.parameters[paramKey] = rule.default;
        fieldStatus.push({ field: paramKey, status: 'defaulted', message: `Defaulted to ${rule.default}` });
      } else {
        if (rule.type === 'number' || rule.type === 'integer') {
          let num = Number(val);
          if (isNaN(num)) {
            num = rule.default;
            warnings.push(`Invalid numeric value for '${paramKey}'; defaulted to ${rule.default}.`);
            fieldStatus.push({ field: paramKey, status: 'adjusted', message: `Invalid -> ${rule.default}` });
          } else {
            if (rule.min != null && num < rule.min) {
              num = rule.min;
              warnings.push(`'${paramKey}' was below min (${rule.min}); clamped.`);
            }
            if (rule.max != null && num > rule.max) {
              num = rule.max;
              warnings.push(`'${paramKey}' exceeded max (${rule.max}); clamped.`);
            }
            if (rule.type === 'integer') num = Math.round(num);
            fieldStatus.push({ field: paramKey, status: 'valid', message: String(num) });
          }
          spec.parameters[paramKey] = num;
        } else if (rule.type === 'string' && rule.options) {
          const upper = String(val).toUpperCase();
          if (rule.options.includes(upper)) {
            spec.parameters[paramKey] = upper;
            fieldStatus.push({ field: paramKey, status: 'valid', message: upper });
          } else {
            spec.parameters[paramKey] = rule.default;
            warnings.push(`Invalid option for '${paramKey}'; defaulted to '${rule.default}'.`);
            fieldStatus.push({ field: paramKey, status: 'adjusted', message: `Defaulted to ${rule.default}` });
          }
        } else {
          spec.parameters[paramKey] = String(val);
          fieldStatus.push({ field: paramKey, status: 'valid', message: String(val) });
        }
      }
    });
  }

  return {
    valid: true,
    inferred,
    spec,
    warnings,
    fieldStatus
  };
}

/**
 * Generates ready-to-run template files for users in CSV, Excel, or JSON formats.
 */
export function generateSampleTemplate(modelType = 'mm1-queue', format = 'csv') {
  const schema = MODEL_SCHEMAS[modelType] || MODEL_SCHEMAS['mm1-queue'];

  const spec = {
    name: `Sample ${schema.name}`,
    description: `Sample calibration template for ${schema.name}`,
    modelType,
    horizon: schema.defaultHorizon,
    replications: 10,
    seedBase: 42,
    parameters: {}
  };

  Object.entries(schema.parameters).forEach(([k, rule]) => {
    spec.parameters[k] = rule.default;
  });

  if (format === 'json') {
    return JSON.stringify(spec, null, 2);
  }

  if (format === 'csv') {
    const lines = [
      '# GRIS SCENARIO SPECIFICATION TEMPLATE',
      '# Model: ' + schema.name,
      'parameter,value',
      `name,${spec.name}`,
      `description,${spec.description}`,
      `modelType,${spec.modelType}`,
      `horizon,${spec.horizon}`,
      `replications,${spec.replications}`,
      `seedBase,${spec.seedBase}`
    ];
    Object.entries(spec.parameters).forEach(([k, v]) => {
      lines.push(`${k},${v}`);
    });
    return lines.join('\n');
  }

  if (format === 'xlsx') {
    const data = [
      ['Parameter / Attribute', 'Value', 'Type', 'Description'],
      ['name', spec.name, 'String', 'Human-readable experiment name'],
      ['description', spec.description, 'String', 'Operational hypothesis / context'],
      ['modelType', spec.modelType, 'String', 'Model identifier'],
      ['horizon', spec.horizon, 'Number', 'Virtual simulation seconds'],
      ['replications', spec.replications, 'Integer', 'Monte Carlo iterations'],
      ['seedBase', spec.seedBase, 'Integer', 'Master PRNG seed']
    ];

    Object.entries(schema.parameters).forEach(([k, rule]) => {
      data.push([k, rule.default, rule.type, rule.label]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    worksheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 12 }, { wch: 40 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parameters');
    return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  }

  return '';
}
