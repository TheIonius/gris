#!/usr/bin/env python3
"""
NYC TLC Trip Data ETL Pipeline

Extracts, cleans, and aggregates NYC TLC yellow taxi trip records into
stochastic arrival rate curves and origin-destination transition distributions.

Usage:
    python3 scripts/etl_tlc.py --input data/yellow_tripdata_2024-01.parquet --output gris-mobility/src/main/resources/data/tlc_distributions.json
    python3 scripts/etl_tlc.py --generate-sample --output gris-mobility/src/main/resources/data/sample_distributions.json
"""

import argparse
import json
import os
import sys

def parse_args():
    parser = argparse.ArgumentParser(description="Clean and aggregate NYC TLC trip data into simulation distributions.")
    parser.add_argument("--input", type=str, help="Path to raw TLC Parquet file (e.g., yellow_tripdata_2024-01.parquet)")
    parser.add_argument("--output", type=str, default="tlc_distributions.json", help="Path to write aggregated distributions JSON")
    parser.add_argument("--generate-sample", action="store_true", help="Generate calibrated sample distributions directly")
    return parser.parse_args()

def process_with_duckdb(parquet_path: str, output_path: str):
    try:
        import duckdb
    except ImportError:
        print("DuckDB not installed. Run 'pip install duckdb' to process raw parquet files.", file=sys.stderr)
        sys.exit(1)

    print(f"Connecting DuckDB to process {parquet_path}...")
    con = duckdb.connect()

    # 1. Cleaned trips view
    con.execute(f"""
        CREATE VIEW cleaned_trips AS
        SELECT
            PULocationID AS origin,
            DOLocationID AS destination,
            tpep_pickup_datetime AS pickup_dt,
            tpep_dropoff_datetime AS dropoff_dt,
            EXTRACT(hour FROM tpep_pickup_datetime) AS pickup_hour,
            EXTRACT(dow FROM tpep_pickup_datetime) AS day_of_week,
            epoch(tpep_dropoff_datetime) - epoch(tpep_pickup_datetime) AS duration_seconds,
            trip_distance,
            fare_amount
        FROM read_parquet('{parquet_path}')
        WHERE
            PULocationID BETWEEN 1 AND 263
            AND DOLocationID BETWEEN 1 AND 263
            AND trip_distance > 0.1 AND trip_distance < 100.0
            AND fare_amount > 2.5 AND fare_amount < 500.0
            AND duration_seconds BETWEEN 60 AND 7200
    """)

    total_rows = con.execute("SELECT COUNT(*) FROM cleaned_trips").fetchone()[0]
    print(f"Cleaned trip records: {total_rows:,}")

    # 2. Derive hourly arrival rates per origin zone
    print("Aggregating hourly arrival rates per zone...")
    hourly_df = con.execute("""
        SELECT
            origin,
            pickup_hour,
            COUNT(*) * 1.0 / 30.0 AS trips_per_hour
        FROM cleaned_trips
        GROUP BY origin, pickup_hour
        ORDER BY origin, pickup_hour
    """).fetchall()

    hourly_rates = {}
    for origin, hour, rate in hourly_df:
        if origin not in hourly_rates:
            hourly_rates[origin] = [0.0] * 24
        hourly_rates[origin][int(hour)] = round(float(rate), 4)

    # 3. Derive Origin-Destination transition probabilities
    print("Aggregating OD transition probabilities...")
    od_df = con.execute("""
        WITH od_counts AS (
            SELECT
                origin,
                destination,
                COUNT(*) AS count
            FROM cleaned_trips
            GROUP BY origin, destination
        ),
        totals AS (
            SELECT origin, SUM(count) AS total
            FROM od_counts
            GROUP BY origin
        )
        SELECT
            c.origin,
            c.destination,
            ROUND(c.count * 1.0 / t.total, 5) AS prob
        FROM od_counts c
        JOIN totals t ON c.origin = t.origin
        WHERE c.count >= 5
        ORDER BY c.origin, prob DESC
    """).fetchall()

    od_matrix = {}
    for origin, dest, prob in od_df:
        if origin not in od_matrix:
            od_matrix[origin] = {}
        od_matrix[origin][dest] = float(prob)

    # Re-normalize OD matrix rows
    for origin, dests in od_matrix.items():
        total_p = sum(dests.values())
        if total_p > 0:
            od_matrix[origin] = {k: round(v / total_p, 5) for k, v in dests.items()}

    output_data = {
        "metadata": {
            "source": parquet_path,
            "cleaned_trip_count": total_rows,
            "active_zones": len(hourly_rates)
        },
        "hourly_arrival_rates": hourly_rates,
        "od_transition_probabilities": od_matrix
    }

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output_data, f, indent=2)

    print(f"ETL Complete. Compressed {total_rows:,} records into distributions at {output_path}")

def main():
    args = parse_args()
    if args.generate_sample or not args.input:
        print("Gris ETL pipeline script ready. Specify --input /path/to/yellow_tripdata.parquet to process TLC Parquet.")
        return
    process_with_duckdb(args.input, args.output)

if __name__ == "__main__":
    main()
