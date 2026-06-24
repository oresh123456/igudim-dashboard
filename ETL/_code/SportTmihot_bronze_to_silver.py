import sys
import boto3
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from pyspark.context import SparkContext
from pyspark.sql.functions import current_timestamp, col, count

# Initialize Glue context and Spark session
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# Configuration parameters
source_bucket = "devbucketmost"
source_prefix = "Bronze/Sport/Tmihot Merkava/"
target_bucket = "devbucketmost"
iceberg_folder = "Silver/Sport/Tmihot Merkav/"
database_name = "devmostv1"
table_name = "sport_merkava"
warehouse_path = f"s3://{target_bucket}/{iceberg_folder}"

# Iceberg Glue Catalog Configuration
spark.conf.set("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog")
spark.conf.set("spark.sql.catalog.glue_catalog.warehouse", warehouse_path)
spark.conf.set("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog")
spark.conf.set("spark.sql.catalog.glue_catalog.io-impl", "org.apache.iceberg.aws.s3.S3FileIO")

# Find the latest Parquet file in S3
s3 = boto3.client('s3')
response = s3.list_objects_v2(Bucket=source_bucket, Prefix=source_prefix)
files = response.get('Contents', [])
if not files:
    raise Exception(f"No files in s3://{source_bucket}/{source_prefix}")

latest_file = max(files, key=lambda x: x['LastModified'])
latest_file_key = latest_file['Key']
latest_file_path = f"s3://{source_bucket}/{latest_file_key}"
print(f"Latest file: {latest_file_path}")

# Read the Parquet file
df = spark.read.parquet(latest_file_path)

# Print schema for debugging
print("Schema:")
df.printSchema()

# Check for required columns
required_columns = ["request_number"]
for column in required_columns:
    if column not in df.columns:
        raise Exception(f"Missing required column: {column}")

# Display a sample of the data
print("Sample data:")
safe_columns = ["request_number", "requester_id", "request_year", "activity_cost", "requested_amount", "approved_request_amount"]
display_columns = [col for col in safe_columns if col in df.columns]
df.select(display_columns).show(5, truncate=False)

# Add or update ingestion timestamp
df_transformed = df.withColumn("ingestion_timestamp", current_timestamp())

# Check for duplicates on request_number
print("Checking duplicates on request_number...")
duplicates = (df_transformed
              .groupBy("request_number")
              .agg(count("*").alias("row_count"))
              .filter(col("row_count") > 1))

if duplicates.count() > 0:
    print("Duplicates found:")
    duplicates.show(truncate=False)
    print("Deduplicating...")
    from pyspark.sql.window import Window
    from pyspark.sql.functions import row_number
    window = Window.partitionBy("request_number").orderBy(col("ingestion_timestamp").desc())
    df_transformed = (df_transformed
                      .withColumn("row_num", row_number().over(window))
                      .filter(col("row_num") == 1)
                      .drop("row_num"))
    print("Duplicates removed. Rows:", df_transformed.count())
else:
    print("No duplicates. Proceeding...")

# Create Iceberg database if it doesn't exist
spark.sql(f"CREATE DATABASE IF NOT EXISTS glue_catalog.{database_name}")
table_identifier = f"glue_catalog.{database_name}.{table_name}"

# Drop the table if it exists (for development; remove in production)
spark.sql(f"DROP TABLE IF EXISTS {table_identifier}")
print(f"Dropped table (if existed): {table_identifier}")

# Create the Iceberg table with the correct schema
create_table_query = f"""
CREATE TABLE {table_identifier} (
    company_code BIGINT,
    request_number BIGINT,
    request_description_short STRING,
    request_type STRING,
    request_type_description STRING,
    special_3a DOUBLE,
    status STRING,
    current_request_status STRING,
    requester_id BIGINT,
    requester_supplier_number BIGINT,
    requester_name STRING,
    payer_id BIGINT,
    payer_supplier_number BIGINT,
    payer_name STRING,
    request_year BIGINT,
    internal_reference_number STRING,
    commitment_expiry_date STRING,
    activity_cost DOUBLE,
    requested_amount DOUBLE,
    requested_percentage DOUBLE,
    other_sources DOUBLE,
    internal_sources DOUBLE,
    loans DOUBLE,
    approved_advances_total DOUBLE,
    recommended_amount DOUBLE,
    approved_request_amount DOUBLE,
    amount_after_change DOUBLE,
    approved_amount_updated DOUBLE,
    previous_system_amounts DOUBLE,
    activity_currency STRING,
    last_adjustment_payment_date STRING,
    adjusted_paid_amount DOUBLE,
    adjusted_balance_after_adjustment DOUBLE,
    estimated_balance DOUBLE,
    payment_currency STRING,
    regulation_number STRING,
    budget_regulation_description STRING,
    fund_center BIGINT,
    fund_center_description STRING,
    financial_year BIGINT,
    wbs_element STRING,
    ingestion_timestamp TIMESTAMP
)
USING iceberg
PARTITIONED BY (request_year)
TBLPROPERTIES ('write_compression'='zstd')
"""
spark.sql(create_table_query)
print(f"Table created: {table_identifier}")

# Perform upsert operation
print("Performing upsert...")
merge_query = f"""
MERGE INTO {table_identifier} AS target
USING (SELECT * FROM temp_view) AS source
ON target.request_number = source.request_number
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
"""

df_transformed.createOrReplaceTempView("temp_view")
spark.sql(merge_query)

print("Upsert completed.")