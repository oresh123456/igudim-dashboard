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

# Read both sheets
df_2023 = pd.read_excel(excel_data, sheet_name='2023')
df_2024 = pd.read_excel(excel_data, sheet_name='2024')

# Print raw columns for debugging
print("Raw columns in 2023 sheet:", df_2023.columns.tolist())
print("Raw columns in 2024 sheet:", df_2024.columns.tolist())

# Clean column names
def clean_column_names(df):
    df.columns = (
        df.columns
        .astype(str)
        .str.replace(r'\u200e|\u200f', '', regex=True)  # Remove Unicode directional markers
        .str.replace(r'\xa0', ' ', regex=True)  # Replace non-breaking spaces with regular spaces
        .str.replace(r'[\'"]', '', regex=True)  # Remove single and double quotes
        .str.replace(r'\s+', ' ', regex=True)   # Normalize multiple spaces to a single space
        .str.strip()  # Remove leading/trailing spaces
        .str.replace(r'[^\w\s]', '_', regex=True)  # Replace special characters (except spaces and word chars) with underscore
        .str.replace(r'\s+', '_', regex=True)   # Replace spaces with underscore
        .str.replace(r'_+', '_', regex=True)    # Replace multiple underscores with a single underscore
        .str.strip('_')  # Remove leading/trailing underscores
    )
    return df

df_2023 = clean_column_names(df_2023)
df_2024 = clean_column_names(df_2024)

# Print cleaned columns
print("Cleaned columns in 2023 sheet:", df_2023.columns.tolist())
print("Cleaned columns in 2024 sheet:", df_2024.columns.tolist())

# Split the combined "תשלום_סל_בסיס" column into "תשלום" and "סל_בסיס"
def split_payment_base_budget(df):
    if 'תשלום_סל_בסיס' in df.columns:
        # Log sample values for debugging
        print("Sample values in תשלום_סל_בסיס before splitting:", df['תשלום_סל_בסיס'].head(10).tolist())
        
        # Convert to string, handle NaN/null values, and strip whitespace
        df['תשלום_סל_בסיס'] = df['תשלום_סל_בסיס'].astype(str).replace('nan', '').str.strip()
        
        # Split the column, ensuring exactly two parts
        split_df = df['תשלום_סל_בסיס'].str.split(' ', n=1, expand=True)
        
        # Ensure the split always produces two columns by filling missing values
        split_df = split_df.reindex(columns=[0, 1], fill_value='0')
        
        # Assign the split columns
        df['תשלום'] = pd.to_numeric(split_df[0], errors='coerce').fillna(0.0)
        df['סל_בסיס'] = pd.to_numeric(split_df[1], errors='coerce').fillna(0.0)
        
        # Drop the original combined column
        df = df.drop(columns=['תשלום_סל_בסיס'])
    return df

df_2023 = split_payment_base_budget(df_2023)
df_2024 = split_payment_base_budget(df_2024)

# Print columns after splitting
print("Columns after splitting - 2023 sheet:", df_2023.columns.tolist())
print("Columns after splitting - 2024 sheet:", df_2024.columns.tolist())

# Define data types mapping
dtype_mapping = {
    'מס_רשות_במרכבה': 'int64',
    'שם_רשות': pd.StringDtype(),
    'מס_בקשה': 'int64',
    'תשלום': 'float64',
    'סל_בסיס': 'float64',
    'אגודות_ספורט': 'float64',
    'תקציב_יוזמות': 'float64'
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

df_2023 = apply_dtypes(df_2023, dtype_mapping)
df_2024 = apply_dtypes(df_2024, dtype_mapping)

# Define Hebrew-to-English column mapping
column_mapping = {
    'מס_רשות_במרכבה': 'authority_number_merkava',
    'שם_רשות': 'authority_name',
    'מס_בקשה': 'request_number',
    'תשלום': 'payment',
    'סל_בסיס': 'base_budget',
    'אגודות_ספורט': 'sport_associations',
    'תקציב_יוזמות': 'initiatives_budget'
}

# Apply column name transformations
df_2023.rename(columns=column_mapping, inplace=True)
df_2024.rename(columns=column_mapping, inplace=True)

# Print columns after renaming
print("After renaming - 2023 sheet:", df_2023.columns.tolist())
print("After renaming - 2024 sheet:", df_2024.columns.tolist())

# Drop any remaining Hebrew columns
hebrew_columns_2023 = [col for col in df_2023.columns if any(ord(char) > 127 for char in col)]
hebrew_columns_2024 = [col for col in df_2024.columns if any(ord(char) > 127 for char in col)]
print("Hebrew columns to drop from 2023 sheet:", hebrew_columns_2023)
print("Hebrew columns to drop from 2024 sheet:", hebrew_columns_2024)

df_2023 = df_2023.drop(columns=hebrew_columns_2023, errors='ignore')
df_2024 = df_2024.drop(columns=hebrew_columns_2024, errors='ignore')

# Print columns after dropping Hebrew
print("After dropping Hebrew - 2023 sheet:", df_2023.columns.tolist())
print("After dropping Hebrew - 2024 sheet:", df_2024.columns.tolist())

# Add year column
df_2023['year'] = 2023
df_2024['year'] = 2024

# Combine the DataFrames
df_combined = pd.concat([df_2023, df_2024], ignore_index=True)

# Add ingestion timestamp
df_combined["ingestion_timestamp"] = pd.Timestamp.now()
df_combined['year'] = df_combined['year'].astype('int32')

# Check for duplicates on request_number and year
print("Checking duplicates on request_number and year...")
duplicates = df_combined.duplicated(subset=['request_number', 'year'], keep=False)
if duplicates.any():
    print("Duplicates found:")
    print(df_combined[duplicates][['request_number', 'year']].sort_values(by=['request_number', 'year']))
    df_combined = df_combined.drop_duplicates(subset=['request_number', 'year'], keep='last')
    print("Duplicates removed. Rows:", len(df_combined))
else:
    print("No duplicates found.")

# Final column list check
print("Final columns:", df_combined.columns.tolist())
print(f"Rows: {len(df_combined)}")

# Log sample data
sample_columns = ['authority_number_merkava', 'authority_name', 'request_number', 'payment', 'year']
available_sample_columns = [col for col in sample_columns if col in df_combined.columns]
print("Sample with available key columns:", available_sample_columns)
print(df_combined[available_sample_columns].head(5))

# Convert DataFrame to Parquet
parquet_buffer = io.BytesIO()
df_combined.to_parquet(parquet_buffer, index=False, engine='pyarrow')

# Define target S3 path
target_bucket = "devbucketmost"
target_parquet_path = f"Bronze/Sport/DetailedBudget/{source_filename_without_extension}_{current_date}.parquet"

# Upload the Parquet file to S3
s3.put_object(Bucket=target_bucket, Key=target_parquet_path, Body=parquet_buffer.getvalue())
print(f"✅ Uploaded to {target_bucket}/{target_parquet_path}")