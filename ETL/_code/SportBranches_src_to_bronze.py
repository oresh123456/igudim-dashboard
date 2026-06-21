import boto3
import pandas as pd
import io
import datetime
import os

# AWS S3 Configuration
source_bucket = "devbucketmost"
source_prefix = "Sport Local Files/Tmihot Merkava/"

# Initialize S3 client
s3 = boto3.client('s3')

# Retrieve latest Excel file from S3
response = s3.list_objects_v2(Bucket=source_bucket, Prefix=source_prefix)
files = response.get('Contents', [])
if not files:
    raise Exception(f"No files found at {source_bucket}/{source_prefix}")

latest_file = max(files, key=lambda x: x['LastModified'])['Key']
print(f"✅ Latest file: {latest_file}")

source_filename_without_extension = os.path.splitext(os.path.basename(latest_file))[0]
current_date = datetime.datetime.now().strftime("%Y%m%d")

# Read Excel file from S3
excel_obj = s3.get_object(Bucket=source_bucket, Key=latest_file)
excel_data = io.BytesIO(excel_obj['Body'].read())

# Read the default sheet (assuming the first sheet since no sheet name is specified)
df = pd.read_excel(excel_data)

# Print raw columns for debugging with character codes
print("Raw columns in BranchesSport:", df.columns.tolist())
print("Raw columns in BranchesSport (with character codes):")
for col in df.columns:
    char_codes = [ord(char) for char in str(col)]
    print(f"Column: {col}, Character codes: {char_codes}")

# Clean column names
def clean_column_names(df):
    df.columns = (
        df.columns
        .astype(str)
        .str.replace(r'\xa0', ' ', regex=True)  # Replace non-breaking spaces with regular spaces
        .str.replace(r'[\'"]', '', regex=True)  # Remove single and double quotes
        .str.replace(r'\s+', ' ', regex=True)   # Replace multiple spaces with a single space
        .str.replace(r'[\/\\]', '_', regex=True)  # Replace slashes with underscore
        .str.replace(r'\s+', '_', regex=True)   # Replace spaces with underscore
        .str.replace(r'[^\w]', '_', regex=True)  # Replace any non-word characters with underscore
        .str.replace(r'_+', '_', regex=True)    # Replace multiple underscores with a single underscore
        .str.strip('_')  # Remove leading/trailing underscores
    )
    return df

df = clean_column_names(df)

# Print cleaned columns for debugging with character codes
print("Cleaned columns in BranchesSport:", df.columns.tolist())
print("Cleaned columns in BranchesSport (with character codes):")
for col in df.columns:
    char_codes = [ord(char) for char in str(col)]
    print(f"Column: {col}, Character codes: {char_codes}")

# Define data types mapping
dtype_mapping = {
    'ענף': pd.StringDtype(),
    'אישי_קבוצתי': pd.StringDtype()  # Updated to match the expected cleaned name
}

# Apply data type conversions
def apply_dtypes(df, dtype_map):
    for column, dtype in dtype_map.items():
        if column in df.columns:
            if dtype == pd.StringDtype():
                df[column] = df[column].astype(str).replace('nan', None).astype(pd.StringDtype())
            elif dtype == 'int64':
                df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0).astype('int64')
            elif dtype == 'float64':
                df[column] = df[column].astype(str).str.replace(',', '', regex=False).str.strip()
                df[column] = pd.to_numeric(df[column], errors='coerce', downcast='float').fillna(0.0)
    return df

df = apply_dtypes(df, dtype_mapping)

# Log columns after applying dtypes
print("Columns after applying dtypes:", df.columns.tolist())

# Define Hebrew-to-English column mapping
column_mapping = {
    'ענף': 'sport_branch',
    'אישי_קבוצתי': 'individual_or_team'  # Updated to match the expected cleaned name
}

# Check for missing Hebrew columns before renaming
expected_hebrew_columns = list(column_mapping.keys())
missing_hebrew_columns = [col for col in expected_hebrew_columns if col not in df.columns]
if missing_hebrew_columns:
    print(f"⚠️ Missing expected Hebrew columns before renaming: {missing_hebrew_columns}")
else:
    print("✅ All expected Hebrew columns present before renaming.")

# Apply column name transformations
df.rename(columns=column_mapping, inplace=True)

# Print columns after renaming
print("After renaming:", df.columns.tolist())

# Check for missing columns after renaming
expected_columns_after_rename = ['sport_branch', 'individual_or_team']
missing_after_rename = [col for col in expected_columns_after_rename if col not in df.columns]
if missing_after_rename:
    print(f"⚠️ Missing columns after renaming: {missing_after_rename}")
else:
    print("✅ All expected columns present after renaming.")

# Drop any remaining Hebrew columns
hebrew_columns = [col for col in df.columns if any(ord(char) > 127 for char in col)]
print("Hebrew columns to drop:", hebrew_columns)
df = df.drop(columns=hebrew_columns, errors='ignore')

# Print columns after dropping Hebrew
print("After dropping Hebrew:", df.columns.tolist())

# Check for duplicates on sport_branch (assuming it's a unique identifier)
print("Checking duplicates on sport_branch...")
duplicates = df.duplicated(subset=['sport_branch'], keep=False)
if duplicates.any():
    print("Duplicates found:")
    print(df[duplicates][['sport_branch']].sort_values(by=['sport_branch']))
    df = df.drop_duplicates(subset=['sport_branch'], keep='last')
    print("Duplicates removed. Rows:", len(df))
else:
    print("No duplicates found.")

# Add ingestion timestamp
df["ingestion_timestamp"] = pd.Timestamp.now()

# Final column list check
print("Final columns:", df.columns.tolist())
print(f"Rows: {len(df)}")

# Log sample data
sample_columns = ['sport_branch', 'individual_or_team']
available_sample_columns = [col for col in sample_columns if col in df.columns]
print("Sample with available key columns:", available_sample_columns)
print(df[available_sample_columns].head(5))

# Convert DataFrame to Parquet
parquet_buffer = io.BytesIO()
df.to_parquet(parquet_buffer, index=False, engine='pyarrow')

# Define target S3 path
target_bucket = "devbucketmost"
target_parquet_path = f"Bronze/Sport/BranchesSport/{source_filename_without_extension}_{current_date}.parquet"

# Upload the Parquet file to S3
s3.put_object(Bucket=target_bucket, Key=target_parquet_path, Body=parquet_buffer.getvalue())
print(f"✅ Uploaded to {target_bucket}/{target_parquet_path}")