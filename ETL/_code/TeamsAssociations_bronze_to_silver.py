import sys
import boto3
from awsglue.utils import getResolvedOptions
from awsglue.context import GlueContext
from pyspark.context import SparkContext

args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session

source_bucket = "devbucketmost"
source_prefix = "Bronze/AssociationsTeams/"
target_bucket = "devbucketmost"
iceberg_folder = "Silver/AssociationsTeams/"
database_name = "devmostv1"
table_name = "associations_teams"
warehouse_path = f"s3://{target_bucket}/{iceberg_folder}"

spark.conf.set("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog")
spark.conf.set("spark.sql.catalog.glue_catalog.warehouse", warehouse_path)
spark.conf.set("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog")
spark.conf.set("spark.sql.catalog.glue_catalog.io-impl", "org.apache.iceberg.aws.s3.S3FileIO")

s3 = boto3.client('s3')
response = s3.list_objects_v2(Bucket=source_bucket, Prefix=source_prefix)
files = response.get('Contents', [])
if not files:
    raise Exception(f"No files in s3://{source_bucket}/{source_prefix}")

latest_file = max(files, key=lambda x: x['LastModified'])
latest_file_key = latest_file['Key']
latest_file_path = f"s3://{source_bucket}/{latest_file_key}"
print(f"Latest file: {latest_file_path}")

df = spark.read.parquet(latest_file_path)

print("Schema:")
df.printSchema()

print("Rows in DataFrame:", df.count())
print("Sample:")
df.show(5)

spark.sql(f"CREATE DATABASE IF NOT EXISTS glue_catalog.{database_name}")
table_identifier = f"glue_catalog.{database_name}.{table_name}"

# Infer schema from DataFrame and create or replace table
df.write.format("iceberg").mode("overwrite").option("overwriteMode", "truncate").saveAsTable(table_identifier)
print(f"Table updated with {df.count()} rows: {table_identifier}")