import { describe, it, expect } from 'vitest';
import { parseImportText, validateScenarioSpec, generateSampleTemplate } from './importParser';

describe('importParser', () => {
  describe('JSON parsing', () => {
    it('parses valid JSON scenario spec', () => {
      const jsonStr = JSON.stringify({
        name: 'Test Queue',
        modelType: 'mm1-queue',
        horizon: 3600,
        replications: 5,
        parameters: { lambda: 0.8, mu: 1.2, servers: 2 }
      });

      const result = parseImportText(jsonStr, 'json');
      expect(result.success).toBe(true);
      expect(result.spec.name).toBe('Test Queue');
      expect(result.spec.modelType).toBe('mm1-queue');
      expect(result.spec.parameters.servers).toBe(2);
    });
  });

  describe('CSV parsing', () => {
    it('parses key-value CSV format', () => {
      const csvStr = `parameter,value
name,NYC Rush Hour
modelType,mobility-dispatch
horizon,7200
replications,10
seedBase,42
fleetSize,300
policy,BATCHED
batchWindowSeconds,20
demandMultiplier,1.4
maxWaitTolerance,450`;

      const result = parseImportText(csvStr, 'csv');
      expect(result.success).toBe(true);
      expect(result.spec.name).toBe('NYC Rush Hour');
      expect(result.spec.modelType).toBe('mobility-dispatch');
      expect(result.spec.horizon).toBe(7200);
      expect(result.spec.parameters.fleetSize).toBe(300);
      expect(result.spec.parameters.policy).toBe('BATCHED');
    });

    it('parses tabular header CSV format', () => {
      const csvStr = `name,modelType,horizon,replications,berths,quayCranes,movesPerHourPerCrane
Caucedo Test,caucedo-terminal,86400,10,4,8,30.0`;

      const result = parseImportText(csvStr, 'csv');
      expect(result.success).toBe(true);
      expect(result.spec.name).toBe('Caucedo Test');
      expect(result.spec.modelType).toBe('caucedo-terminal');
      expect(result.spec.parameters.quayCranes).toBe(8);
      expect(result.spec.parameters.movesPerHourPerCrane).toBe(30.0);
    });

    it('parses exported Gris CSV decision report', () => {
      const csvStr = `# GRIS SIMULATION EXPERIMENT DECISION REPORT
# Scenario Name: "Exported Run"
# Scenario ID: abc-123
# Model Type: mm1-queue
# Status: COMPLETED
# Replications: 5
# Horizon (s): 1800

# --- EXPERIMENTAL PARAMETERS ---
Parameter,Value
lambda,0.75
mu,1.0
servers,1
warmup,100`;

      const result = parseImportText(csvStr, 'csv');
      expect(result.success).toBe(true);
      expect(result.spec.name).toBe('Exported Run');
      expect(result.spec.modelType).toBe('mm1-queue');
      expect(result.spec.horizon).toBe(1800);
      expect(result.spec.parameters.lambda).toBe(0.75);
      expect(result.spec.parameters.warmup).toBe(100);
    });
  });

  describe('validation & inferencing', () => {
    it('infers modelType from distinct parameters when missing', () => {
      const spec = {
        name: 'Inferred Fleet',
        parameters: { fleetSize: 200, policy: 'NEAREST' }
      };
      const validated = validateScenarioSpec(spec);
      expect(validated.spec.modelType).toBe('mobility-dispatch');
      expect(validated.inferred).toBe(true);
    });

    it('clamps horizon exceeding maximum 604,800s', () => {
      const spec = {
        name: 'Excessive Horizon',
        modelType: 'mm1-queue',
        horizon: 9999999
      };
      const validated = validateScenarioSpec(spec);
      expect(validated.spec.horizon).toBe(604800);
      expect(validated.warnings.some(w => w.includes('clamped'))).toBe(true);
    });
  });

  describe('sample template generation', () => {
    it('generates valid sample templates for all formats', () => {
      const csvTpl = generateSampleTemplate('mm1-queue', 'csv');
      expect(csvTpl).toContain('parameter,value');
      expect(csvTpl).toContain('lambda');

      const jsonTpl = generateSampleTemplate('mobility-dispatch', 'json');
      const parsed = JSON.parse(jsonTpl);
      expect(parsed.modelType).toBe('mobility-dispatch');
      expect(parsed.parameters.fleetSize).toBeDefined();
    });
  });
});
