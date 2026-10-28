#!/usr/bin/env bash
# Copies the upstream example dataset (jaffle_shop.duckdb) into the `warehouse` Postgres database.
# Base tables are copied with DuckDB's postgres extension; the three dbt staging views are
# recreated as Postgres views. Safe to re-run: existing tables and views are replaced.
# Needs the DuckDB CLI (`brew install duckdb`) and a running `docker compose up`.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
	set -a
	# shellcheck disable=SC1091
	. ./.env
	set +a
fi

WAREHOUSE_URL="${WAREHOUSE_URL:-postgresql://quarry:quarry@localhost:5434/warehouse}"
SOURCE="${JAFFLE_SHOP_DUCKDB:-../fork-reference/example/jaffle_shop.duckdb}"
TABLES=(raw_customers raw_orders raw_payments customers orders metricflow_time_spine)

if ! command -v duckdb >/dev/null; then
	echo "duckdb CLI not found: brew install duckdb" >&2
	exit 1
fi
if [ ! -f "$SOURCE" ]; then
	echo "Dataset not found at $SOURCE (set JAFFLE_SHOP_DUCKDB)" >&2
	exit 1
fi

sql="INSTALL postgres; LOAD postgres;
ATTACH '$SOURCE' AS src (READ_ONLY);
ATTACH '$WAREHOUSE_URL' AS pg (TYPE postgres);
CALL postgres_execute('pg', 'DROP VIEW IF EXISTS public.stg_customers, public.stg_orders, public.stg_payments');"

for table in "${TABLES[@]}"; do
	sql+="
DROP TABLE IF EXISTS pg.public.$table;
CREATE TABLE pg.public.$table AS SELECT * FROM src.main.$table;"
done

# Same definitions as the DuckDB views; amount uses numeric division (DuckDB's `/` is not integer division).
sql+="
CALL postgres_execute('pg', 'CREATE VIEW public.stg_customers AS SELECT id AS customer_id, first_name, last_name FROM public.raw_customers');
CALL postgres_execute('pg', 'CREATE VIEW public.stg_orders AS SELECT id AS order_id, user_id AS customer_id, order_date, status FROM public.raw_orders');
CALL postgres_execute('pg', 'CREATE VIEW public.stg_payments AS SELECT id AS payment_id, order_id, payment_method, amount / 100.0 AS amount FROM public.raw_payments');"

duckdb -no-agent :memory: -c "$sql" >/dev/null

echo "Loaded jaffle_shop into $(echo "$WAREHOUSE_URL" | sed -E 's#//[^@]*@#//#')"
