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
source_prefix = "Bronze/Sport/BranchesSport/"
target_bucket = "devbucketmost"
iceberg_folder = "Silver/Sport/BranchesSport/"
database_name = "devmostv1"
table_name = "branches_sport"
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

# Print all columns in the Parquet file
print("Columns in Parquet file:", df.columns)

# Check for expected columns
expected_columns = [
    'sport_branch',
    'individual_or_team',
    'ingestion_timestamp'
]

missing_columns = [col for col in expected_columns if col not in df.columns]
if missing_columns:
    raise Exception(f"Missing expected columns: {missing_columns}")
else:
    print("All expected columns are present.")

# Check for required columns
required_columns = ["sport_branch"]
for column in required_columns:
    if column not in df.columns:
        raise Exception(f"Missing required column: {column}")

# Display a sample of the data
print("Sample data:")
safe_columns = ["sport_branch", "individual_or_team"]
display_columns = [col for col in safe_columns if col in df.columns]
df.select(display_columns).show(5, truncate=False)

# Add or update ingestion timestamp
df_transformed = df.withColumn("ingestion_timestamp", current_timestamp())

# Check for duplicates on sport_branch
print("Checking duplicates on sport_branch...")
duplicates = (df_transformed
              .groupBy("sport_branch")
              .agg(count("*").alias("row_count"))
              .filter(col("row_count") > 1))

if duplicates.count() > 0:
    print("Duplicates found:")
    duplicates.show(truncate=False)
    print("Deduplicating...")
    from pyspark.sql.window import Window
    from pyspark.sql.functions import row_number
    window = Window.partitionBy("sport_branch").orderBy(col("ingestion_timestamp").desc())
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

# Drop the table if it exists (since we're doing a full load)
spark.sql(f"DROP TABLE IF EXISTS {table_identifier}")
print(f"Dropped table (if existed): {table_identifier}")

# Create the Iceberg table with the correct schema
create_table_query = f"""
CREATE TABLE {table_identifier} (
    sport_branch STRING,
    individual_or_team STRING,
    ingestion_timestamp TIMESTAMP
)
USING iceberg
TBLPROPERTIES ('write_compression'='zstd')
"""

spark.sql(create_table_query)
print(f"Table created: {table_identifier}")

# Write the data to the Iceberg table (full load)
print("Writing data to Iceberg table (full load)...")
df_transformed.writeTo(table_identifier).append()
print(f"Data written to {table_identifier}. Rows: {df_transformed.count()}")