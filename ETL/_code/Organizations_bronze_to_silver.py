import sys
import boto3
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from pyspark.context import SparkContext
from pyspark.sql.functions import current_timestamp

# Get job parameters
args = getResolvedOptions(sys.argv, ['JOB_NAME'])

# Initialize Spark and Glue contexts
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# Define S3 paths and Iceberg settings
source_bucket = "devbucketmost"
source_prefix = "Bronze/Sport/Organizations/"
target_bucket = "devbucketmost"
iceberg_folder = "Silver/Sport/Organizations/"
database_name = "devmostv1"
table_name = "sport_organizations"
warehouse_path = f"s3://{target_bucket}/{iceberg_folder}"

# Configure Spark for Iceberg
spark.conf.set("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog")
spark.conf.set("spark.sql.catalog.glue_catalog.warehouse", warehouse_path)
spark.conf.set("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog")
spark.conf.set("spark.sql.catalog.glue_catalog.io-impl", "org.apache.iceberg.aws.s3.S3FileIO")

# List Parquet files in the Bronze layer
s3 = boto3.client('s3')
response = s3.list_objects_v2(Bucket=source_bucket, Prefix=source_prefix)
files = response.get('Contents', [])
if not files:
    raise Exception(f"No files in s3://{source_bucket}/{source_prefix}")

# Get all Parquet files (we'll combine data from all sheets: Org2023, OrgFavorite2023, Org2024, OrgFavorite2024)
parquet_files = [f"s3://{source_bucket}/{file['Key']}" for file in files if file['Key'].endswith('.parquet')]
if not parquet_files:
    raise Exception(f"No Parquet files found in s3://{source_bucket}/{source_prefix}")

print(f"Parquet files to process: {parquet_files}")

# Read all Parquet files into a single DataFrame
df = spark.read.parquet(*parquet_files)

# Print schema and sample data
print("Schema:")
df.printSchema()

print("Sample data:")
df.select("sport_name", "request_number", "year").show(5)

# Update ingestion timestamp
df_transformed = df.withColumn("ingestion_timestamp", current_timestamp())

# Verify required columns
required_columns = ["sport_name", "request_number", "year", "ingestion_timestamp"]
for column in required_columns:
    if column not in df_transformed.columns:
        raise Exception(f"Missing column: {column}")

# Create database if it doesn't exist
spark.sql(f"CREATE DATABASE IF NOT EXISTS glue_catalog.{database_name}")
table_identifier = f"glue_catalog.{database_name}.{table_name}"

# Drop (truncate) the table if it exists
spark.sql(f"DROP TABLE IF EXISTS {table_identifier}")
print(f"Dropped table: {table_identifier}")

# Create the Iceberg table
create_table_query = f"""
CREATE TABLE {table_identifier} (
    sport_name STRING,
    request_number BIGINT,
    year INT,
    ingestion_timestamp TIMESTAMP
)
USING iceberg
PARTITIONED BY (year)
TBLPROPERTIES ('write_compression'='zstd')
"""
spark.sql(create_table_query)
print(f"Table created: {table_identifier}")

# Insert the data
df_transformed.writeTo(table_identifier).append()
print(f"Inserted {df_transformed.count()} rows into {table_identifier}")

print("✅ Bronze to Silver job completed.")