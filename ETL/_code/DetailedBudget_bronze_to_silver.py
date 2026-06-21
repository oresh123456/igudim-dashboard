import sys
import boto3
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from pyspark.context import SparkContext
from pyspark.sql.functions import current_timestamp, col, count
from pyspark.sql.types import IntegerType, LongType, DoubleType, StringType, TimestampType

# Initialize Glue context and Spark session
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

# Configuration parameters
source_bucket = "devbucketmost"
source_prefix = "Bronze/Sport/DetailedBudget/"
target_bucket = "devbucketmost"
iceberg_folder = "Silver/Sport/DetailedBudget/"
database_name = "devmostv1"
table_name = "detailed_sport_budget"
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
    'authority_number_merkava',
    'authority_name',
    'request_number',
    'payment',
    'base_budget',
    'sport_associations',
    'initiatives_budget',
    'year',
    'ingestion_timestamp'
]

missing_columns = [col for col in expected_columns if col not in df.columns]
if missing_columns:
    print(f"⚠️ Missing expected columns: {missing_columns}")
    raise Exception(f"Missing expected columns: {missing_columns}")
else:
    print("✅ All expected columns are present.")

# Check for required columns for upsert
required_columns = ["authority_number_merkava", "request_number", "year"]
for column in required_columns:
    if column not in df.columns:
        print(f"⚠️ Missing required column for upsert: {column}")
        raise Exception(f"Missing required column: {column}")

# Cast columns to ensure correct data types
df_transformed = (df
    .withColumn("authority_number_merkava", col("authority_number_merkava").cast(LongType()))
    .withColumn("authority_name", col("authority_name").cast(StringType()))
    .withColumn("request_number", col("request_number").cast(LongType()))
    .withColumn("payment", col("payment").cast(DoubleType()))
    .withColumn("base_budget", col("base_budget").cast(DoubleType()))
    .withColumn("sport_associations", col("sport_associations").cast(DoubleType()))
    .withColumn("initiatives_budget", col("initiatives_budget").cast(DoubleType()))
    .withColumn("year", col("year").cast(IntegerType()))
    .withColumn("ingestion_timestamp", col("ingestion_timestamp").cast(TimestampType()))
)

# Display a sample of the data
print("Sample data:")
safe_columns = ["authority_number_merkava", "authority_name", "request_number", "payment", "year"]
display_columns = [col for col in safe_columns if col in df_transformed.columns]
df_transformed.select(display_columns).show(5, truncate=False)

# Add or update ingestion timestamp
df_transformed = df_transformed.withColumn("ingestion_timestamp", current_timestamp())

# Check for duplicates on the composite key (authority_number_merkava, request_number, year)
print("Checking duplicates on authority_number_merkava, request_number, and year...")
duplicates = (df_transformed
              .groupBy("authority_number_merkava", "request_number", "year")
              .agg(count("*").alias("row_count"))
              .filter(col("row_count") > 1))

if duplicates.count() > 0:
    print("Duplicates found:")
    duplicates.show(truncate=False)
    print("Deduplicating...")
    from pyspark.sql.window import Window
    from pyspark.sql.functions import row_number
    window = Window.partitionBy("authority_number_merkava", "request_number", "year").orderBy(col("ingestion_timestamp").desc())
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

# Create the Iceberg table if it doesn't exist
create_table_query = f"""
CREATE TABLE IF NOT EXISTS {table_identifier} (
    authority_number_merkava BIGINT,
    authority_name STRING,
    request_number BIGINT,
    payment DOUBLE,
    base_budget DOUBLE,
    sport_associations DOUBLE,
    initiatives_budget DOUBLE,
    year INT,
    ingestion_timestamp TIMESTAMP
)
USING iceberg
TBLPROPERTIES ('write_compression'='zstd')
"""

spark.sql(create_table_query)
print(f"Table ensured: {table_identifier}")

# Perform upsert operation
print("Performing upsert...")
merge_query = f"""
MERGE INTO {table_identifier} AS target
USING (SELECT * FROM temp_view) AS source
ON target.authority_number_merkava = source.authority_number_merkava
   AND target.request_number = source.request_number
   AND target.year = source.year
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
"""

df_transformed.createOrReplaceTempView("temp_view")
spark.sql(merge_query)

print("Upsert completed.")