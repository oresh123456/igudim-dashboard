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
source_prefix = "Bronze/Municipalities/"
target_bucket = "devbucketmost"
iceberg_folder = "Silver/Municipalities/"
database_name = "devmostv1"
table_name = "municipalities"
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
    'authority_code', 'authority_name', 'tax_district', 'municipal_status',
    'total_population_end_of_year', 'jews_and_others_percentage',
    'jews_percentage_of_jews_and_others', 'arabs_percentage',
    'muslims_percentage_of_arab_population', 'christians_percentage_of_arab_population',
    'druze_percentage_of_arab_population', 'total_men_end_of_year',
    'total_women_end_of_year', 'age_0_4', 'age_5_9', 'age_10_14',
    'age_15_19', 'age_20_29', 'age_30_44', 'age_45_59', 'age_60_64',
    'age_65_and_above', 'age_0_17', 'age_75_and_above',
    'socioeconomic_cluster', 'peripheral_cluster', 'authority_name_in_culture',
    'population_in_authority_2020', 'district_cbs_2019', 'negev_or_galilee',
    'socioeconomic_cluster_2019', 'geographic_cluster_2020', 'national_priority',
    'haredi_or_arab_and_druze_culture', 'culture_and_sport_ministry_district',
    'sector_or_society', 'ingestion_timestamp'
]

missing_columns = [col for col in expected_columns if col not in df.columns]
if missing_columns:
    raise Exception(f"Missing expected columns: {missing_columns}")
else:
    print("All expected columns are present.")

# Check for required columns
required_columns = ["authority_code"]
for column in required_columns:
    if column not in df.columns:
        raise Exception(f"Missing required column: {column}")

# Display a sample of the data
print("Sample data:")
safe_columns = ["authority_code", "authority_name", "total_population_end_of_year", "socioeconomic_cluster"]
display_columns = [col for col in safe_columns if col in df.columns]
df.select(display_columns).show(5, truncate=False)

# Add or update ingestion timestamp
df_transformed = df.withColumn("ingestion_timestamp", current_timestamp())

# Check for duplicates on authority_code
print("Checking duplicates on authority_code...")
duplicates = (df_transformed
              .groupBy("authority_code")
              .agg(count("*").alias("row_count"))
              .filter(col("row_count") > 1))

if duplicates.count() > 0:
    print("Duplicates found:")
    duplicates.show(truncate=False)
    print("Deduplicating...")
    from pyspark.sql.window import Window
    from pyspark.sql.functions import row_number
    window = Window.partitionBy("authority_code").orderBy(col("ingestion_timestamp").desc())
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
    authority_code BIGINT,
    authority_name STRING,
    tax_district STRING,
    municipal_status STRING,
    total_population_end_of_year DOUBLE,
    jews_and_others_percentage DOUBLE,
    jews_percentage_of_jews_and_others DOUBLE,
    arabs_percentage DOUBLE,
    muslims_percentage_of_arab_population DOUBLE,
    christians_percentage_of_arab_population DOUBLE,
    druze_percentage_of_arab_population DOUBLE,
    total_men_end_of_year DOUBLE,
    total_women_end_of_year DOUBLE,
    age_0_4 DOUBLE,
    age_5_9 DOUBLE,
    age_10_14 DOUBLE,
    age_15_19 DOUBLE,
    age_20_29 DOUBLE,
    age_30_44 DOUBLE,
    age_45_59 DOUBLE,
    age_60_64 DOUBLE,
    age_65_and_above DOUBLE,
    age_0_17 DOUBLE,
    age_75_and_above DOUBLE,
    socioeconomic_cluster BIGINT,
    peripheral_cluster BIGINT,
    authority_name_in_culture STRING,
    population_in_authority_2020 DOUBLE,
    district_cbs_2019 STRING,
    negev_or_galilee STRING,
    socioeconomic_cluster_2019 BIGINT,
    geographic_cluster_2020 BIGINT,
    national_priority BIGINT,
    haredi_or_arab_and_druze_culture STRING,
    culture_and_sport_ministry_district STRING,
    sector_or_society STRING,
    ingestion_timestamp TIMESTAMP
)
USING iceberg
TBLPROPERTIES ('write_compression'='zstd')
"""

spark.sql(create_table_query)
print(f"Table created: {table_identifier}")

# Perform upsert operation
print("Performing upsert...")
merge_query = f"""
MERGE INTO {table_identifier} AS target
USING (SELECT * FROM temp_view) AS source
ON target.authority_code = source.authority_code
WHEN MATCHED THEN UPDATE SET *
WHEN NOT MATCHED THEN INSERT *
"""

df_transformed.createOrReplaceTempView("temp_view")
spark.sql(merge_query)

print("Upsert completed.")