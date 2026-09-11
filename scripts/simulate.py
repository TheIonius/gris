#!/usr/bin/env python3
"""
CLI Simulation Runner

Executes discrete-event simulations and parameter sensitivity sweeps against
the REST API from the command line, generating tables, CSV, or JSON summaries.

Usage Examples:
    python3 scripts/simulate.py --list-models
    python3 scripts/simulate.py --model mm1-queue --reps 10 --horizon 2500 --params lambda=0.6,mu=1.0,servers=1
    python3 scripts/simulate.py --model mobility-dispatch --reps 5 --horizon 7200 --params fleetSize=350,policy=BATCHED
    python3 scripts/simulate.py --sweep --model mm1-queue --param lambda --values 0.2,0.4,0.6,0.8 --metric steady.customer.system_time
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request

DEFAULT_URL = "http://localhost:8080"

def parse_args():
    parser = argparse.ArgumentParser(description="Gris Discrete-Event Simulation Headless CLI Runner")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"Gris API server base URL (default: {DEFAULT_URL})")
    parser.add_argument("--api-key", default=os.getenv("GRIS_API_KEY", None), help="Optional API authentication token (or set GRIS_API_KEY env var)")
    parser.add_argument("--list-models", action="store_true", help="List registered domain simulation models")
    parser.add_argument("--model", type=str, help="Domain model type (e.g., 'mm1-queue', 'mobility-dispatch', 'caucedo-terminal')")
    parser.add_argument("--name", type=str, default=None, help="Optional scenario display name")
    parser.add_argument("--horizon", type=float, default=3600.0, help="Virtual simulation horizon in seconds")
    parser.add_argument("--reps", type=int, default=10, help="Number of Monte Carlo replications")
    parser.add_argument("--seed", type=int, default=42, help="Base PRNG seed")
    parser.add_argument("--params", type=str, default="", help="Comma-separated key=val parameters (e.g., lambda=0.6,mu=1.0,servers=2)")
    
    # Natural-language ask mode
    parser.add_argument("--ask", type=str, default=None, help="Translate natural-language query to scenario specification")
    parser.add_argument("--execute", action="store_true", help="Execute simulation after natural-language translation")

    # Sweep mode
    parser.add_argument("--sweep", action="store_true", help="Execute a parameter sensitivity sweep")
    parser.add_argument("--param", type=str, help="Parameter name to sweep (for --sweep)")
    parser.add_argument("--values", type=str, help="Comma-separated values to evaluate in sweep (e.g. 0.2,0.4,0.6,0.8)")
    parser.add_argument("--metric", type=str, help="Target metric name to track across sweep points")
    
    # Output formatting
    parser.add_argument("--format", choices=["table", "json", "csv"], default="table", help="Output format (default: table)")
    parser.add_argument("--output", type=str, default=None, help="File path to write output (defaults to stdout)")

    return parser.parse_args()

def http_get(url, api_key=None):
    headers = {"Accept": "application/json"}
    if api_key:
        headers["X-API-KEY"] = api_key
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def http_post(url, payload, api_key=None):
    data = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if api_key:
        headers["X-API-KEY"] = api_key
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def parse_param_string(param_str):
    if not param_str:
        return {}
    params = {}
    for pair in param_str.split(","):
        if "=" in pair:
            k, v = pair.split("=", 1)
            k = k.strip()
            v = v.strip()
            try:
                if "." in v:
                    params[k] = float(v)
                else:
                    params[k] = int(v)
            except ValueError:
                if v.lower() == "true":
                    params[k] = True
                elif v.lower() == "false":
                    params[k] = False
                else:
                    params[k] = v
    return params

def render_table(headers, rows):
    widths = [len(h) for h in headers]
    for row in rows:
        for i, val in enumerate(row):
            widths[i] = max(widths[i], len(str(val)))
    
    header_str = " | ".join(f"{headers[i]:<{widths[i]}}" for i in range(len(headers)))
    sep_str = "-+-".join("-" * widths[i] for i in range(len(headers)))
    
    lines = [header_str, sep_str]
    for row in rows:
        lines.append(" | ".join(f"{str(row[i]):<{widths[i]}}" for i in range(len(row))))
    return "\n".join(lines)

def run_simulation(args):
    params = parse_param_string(args.params)
    name = args.name or f"CLI Run: {args.model} ({args.reps} reps)"
    payload = {
        "name": name,
        "modelType": args.model,
        "horizon": args.horizon,
        "replications": args.reps,
        "seedBase": args.seed,
        "parameters": params
    }

    print(f"[Gris CLI] Submitting scenario '{name}' to {args.url}...", file=sys.stderr)
    try:
        scenario = http_post(f"{args.url}/api/scenarios", payload, api_key=args.api_key)
    except urllib.error.URLError as e:
        print(f"Error connecting to server: {e}", file=sys.stderr)
        sys.exit(1)

    scen_id = scenario["id"]
    print(f"[Gris CLI] Running scenario ID: {scen_id}...", file=sys.stderr)
    poll_and_render_scenario(args.url, scen_id, args)

def poll_and_render_scenario(url, scenario_id, args):
    while True:
        scen = http_get(f"{url}/api/scenarios/{scenario_id}", api_key=args.api_key)
        status = scen.get("status")
        if status in ("COMPLETED", "FAILED", "CANCELLED"):
            scenario = scen
            break
        time.sleep(0.3)

    if scenario.get("status") != "COMPLETED":
        print(f"Simulation ended with status {scenario.get('status')}: {scenario.get('errorMessage')}", file=sys.stderr)
        sys.exit(1)

    res = scenario.get("results", {})
    wall_clock = scenario.get("wallClockMs", 0)
    print(f"[Gris CLI] Completed in {wall_clock}ms ({res.get('totalEventsProcessed', 0):,} events processed)\n", file=sys.stderr)

    if args.format == "json":
        out = json.dumps(scenario, indent=2)
    elif args.format == "csv":
        lines = [
            "MetricCategory,MetricName,Mean,StdDev,CI95_Lower,CI95_Upper,Min,Max"
        ]
        for name, m in res.get("sampleMetrics", {}).items():
            lines.append(f"Sample,{name},{m['mean']},{m.get('standardDeviation', m.get('stdDev', 0))},{m['confidenceInterval95Lower']},{m['confidenceInterval95Upper']},{m['min']},{m['max']}")
        for name, m in res.get("timeWeightedMetrics", {}).items():
            lines.append(f"TimeWeighted,{name},{m['mean']},{m.get('standardDeviation', m.get('stdDev', 0))},{m['confidenceInterval95Lower']},{m['confidenceInterval95Upper']},{m['min']},{m['max']}")
        for name, m in res.get("counters", {}).items():
            lines.append(f"Counter,{name},{m['mean']},{m.get('standardDeviation', m.get('stdDev', 0))},{m['confidenceInterval95Lower']},{m['confidenceInterval95Upper']},{m['min']},{m['max']}")
        out = "\n".join(lines)
    else:
        sections = []
        # Sample Metrics
        if res.get("sampleMetrics"):
            headers = ["Sample Metric", "Mean", "95% CI Lower", "95% CI Upper", "StdDev", "Min", "Max"]
            rows = []
            for k, m in res["sampleMetrics"].items():
                rows.append([
                    k,
                    f"{m['mean']:.4f}",
                    f"{m['confidenceInterval95Lower']:.4f}",
                    f"{m['confidenceInterval95Upper']:.4f}",
                    f"{m.get('standardDeviation', m.get('stdDev', 0)):.4f}",
                    f"{m['min']:.4f}",
                    f"{m['max']:.4f}"
                ])
            sections.append("### Sample-Based Metrics\n" + render_table(headers, rows))

        # Time-Weighted Metrics
        if res.get("timeWeightedMetrics"):
            headers = ["Time-Weighted Metric", "Mean Utilization", "95% CI Lower", "95% CI Upper"]
            rows = []
            for k, m in res["timeWeightedMetrics"].items():
                rows.append([
                    k,
                    f"{(m['mean'] * 100):.2f}%",
                    f"{(m['confidenceInterval95Lower'] * 100):.2f}%",
                    f"{(m['confidenceInterval95Upper'] * 100):.2f}%"
                ])
            sections.append("### Time-Weighted Metrics\n" + render_table(headers, rows))

        # Counters
        if res.get("counters"):
            headers = ["Counter Metric", "Mean Count", "Min", "Max"]
            rows = []
            for k, m in res["counters"].items():
                rows.append([
                    k,
                    f"{m['mean']:.1f}",
                    f"{m['min']:.0f}",
                    f"{m['max']:.0f}"
                ])
            sections.append("### Cumulative Counters\n" + render_table(headers, rows))

        out = "\n\n".join(sections)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(out + "\n")
        print(f"[Gris CLI] Results saved to {args.output}", file=sys.stderr)
    else:
        print(out)

def run_ask(args):
    payload = {
        "prompt": args.ask,
        "execute": args.execute
    }
    print(f"[Gris CLI] Translating prompt: \"{args.ask}\"...", file=sys.stderr)
    try:
        res = http_post(f"{args.url}/api/ask", payload, api_key=args.api_key)
    except urllib.error.URLError as e:
        print(f"Error querying /api/ask: {e}", file=sys.stderr)
        sys.exit(1)

    if args.format == "json":
        print(json.dumps(res, indent=2))
        return

    print("\n--- Natural-Language Scenario Contract ---")
    if res.get("isComparison"):
        comp_a = res.get("comparisonA", {})
        comp_b = res.get("comparisonB", {})
        print(f"Comparison Mode:   YES")
        print(f"Target Model:      {res.get('modelType')}")
        print(f"Branch A:          {comp_a.get('suggestedName')} -> {comp_a.get('parameters')}")
        print(f"Branch B:          {comp_b.get('suggestedName')} -> {comp_b.get('parameters')}")
        print(f"Confidence:        {res.get('confidence', 0.0) * 100:.1f}%")
        print(f"Reasoning:         {res.get('reasoning')}")
    else:
        print(f"Suggested Title:   {res.get('suggestedName')}")
        print(f"Target Model:      {res.get('modelType')}")
        print(f"Confidence:        {res.get('confidence', 0.0) * 100:.1f}%")
        print(f"Horizon:           {res.get('horizon')}s")
        print(f"Replications:      {res.get('replications')}")
        print(f"Parameters:        {json.dumps(res.get('parameters', {}))}")
        print(f"Reasoning:         {res.get('reasoning')}")

    if res.get("scenario"):
        scen_id = res["scenario"]["id"]
        print(f"\n[Gris CLI] Executing translated scenario ID: {scen_id}...", file=sys.stderr)
        poll_and_render_scenario(args.url, scen_id, args)

def run_sweep(args):
    if not args.param or not args.values or not args.metric:
        print("Error: --sweep requires --param, --values, and --metric", file=sys.stderr)
        sys.exit(1)

    values = [float(v.strip()) for v in args.values.split(",")]
    base_params = parse_param_string(args.params)
    payload = {
        "name": f"CLI Sweep: {args.model} [{args.param}]",
        "modelType": args.model,
        "parameterName": args.param,
        "parameterValues": values,
        "baseParameters": base_params,
        "horizon": args.horizon,
        "replications": args.reps,
        "seedBase": args.seed,
        "targetMetric": args.metric
    }

    print(f"[Gris CLI] Launching parameter sweep on {args.model}.{args.param} across {len(values)} points...", file=sys.stderr)
    try:
        res = http_post(f"{args.url}/api/sweeps", payload, api_key=args.api_key)
    except urllib.error.URLError as e:
        print(f"Sweep error: {e}", file=sys.stderr)
        sys.exit(1)

    points = res.get("points", [])
    print(f"[Gris CLI] Sweep finished in {res.get('totalWallClockMs', 0)}ms\n", file=sys.stderr)

    if args.format == "json":
        out = json.dumps(res, indent=2)
    elif args.format == "csv":
        lines = ["ParamValue,Replications,Mean,StdDev,CI_Lower,CI_Upper,Events,WallClockMs"]
        for p in points:
            lines.append(f"{p['parameterValue']},{p['replications']},{p['mean']},{p.get('standardDeviation', 0)},{p['ciLower']},{p['ciUpper']},{p['totalEvents']},{p['wallClockMs']}")
        out = "\n".join(lines)
    else:
        headers = [args.param, "Mean", "95% CI Lower", "95% CI Upper", "StdDev", "Events", "Compute Time"]
        rows = []
        for p in points:
            rows.append([
                f"{p['parameterValue']}",
                f"{p['mean']:.4f}",
                f"{p['ciLower']:.4f}",
                f"{p['ciUpper']:.4f}",
                f"{p.get('standardDeviation', 0):.4f}",
                f"{p['totalEvents']:,}",
                f"{p['wallClockMs']}ms"
            ])
        out = f"### Sensitivity Sweep: {args.param} vs {args.metric}\n" + render_table(headers, rows)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(out + "\n")
        print(f"[Gris CLI] Results saved to {args.output}", file=sys.stderr)
    else:
        print(out)

def main():
    args = parse_args()

    if args.list_models:
        try:
            models = http_get(f"{args.url}/api/models", api_key=args.api_key)
            headers = ["Model Type", "Description", "Parameters"]
            rows = []
            for m in models:
                p_keys = ", ".join(m.get("parameters", {}).keys())
                desc = m.get("description", "")
                if len(desc) > 60:
                    desc = desc[:57] + "..."
                rows.append([m["modelType"], desc, p_keys])
            print(render_table(headers, rows))
        except urllib.error.URLError as e:
            print(f"Error fetching models: {e}", file=sys.stderr)
            sys.exit(1)
        return

    if args.ask:
        run_ask(args)
        return

    if not args.model:
        print("Error: --model, --ask, or --list-models is required.", file=sys.stderr)
        sys.exit(1)

    if args.sweep:
        run_sweep(args)
    else:
        run_simulation(args)

if __name__ == "__main__":
    main()
