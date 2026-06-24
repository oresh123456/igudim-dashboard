import boto3
import pandas as pd
import io
import datetime
import os

# Initialize S3 client
source_bucket = "devbucketmost"
source_prefix = "Associations Local Files/Organizations 2023-2024.xlsx"
s3 = boto3.client('s3')

# Verify the file exists
try:
    s3.head_object(Bucket=source_bucket, Key=source_prefix)
    print(f"✅ File found: {source_prefix}")
except s3.exceptions.ClientError as e:
    raise Exception(f"File not found at {source_bucket}/{source_prefix}: {str(e)}")

# Extract the file name without extension and get the current date
source_filename_without_extension = os.path.splitext(os.path.basename(source_prefix))[0]
current_date = datetime.datetime.now().strftime("%Y%m%d")

# Extract the year from the file name (e.g., "Organizations 2023-2024" -> 2023 and 2024 for respective sheets)
file_year_range = source_filename_without_extension.split()[-1]  # "2023-2024"
year_start, year_end = map(int, file_year_range.split('-'))  # 2023, 2024

# Read the Excel file
excel_obj = s3.get_object(Bucket=source_bucket, Key=source_prefix)
excel_data = io.BytesIO(excel_obj['Body'].read())

# Read the four sheets
sheets = {
    'Org2023': {'df': pd.read_excel(excel_data, sheet_name='Org2023'), 'year': year_start},
    'OrgFavorite2023': {'df': pd.read_excel(excel_data, sheet_name='OrgFavorite2023'), 'year': year_start},
    'Org2024': {'df': pd.read_excel(excel_data, sheet_name='Org2024'), 'year': year_end},
    'OrgFavorite2024': {'df': pd.read_excel(excel_data, sheet_name='OrgFavorite2024'), 'year': year_end}
}

# Process each sheet
for sheet_name, info in sheets.items():
    df = info['df']
    year = info['year']
    
    # Print original columns
    print(f"Columns in {sheet_name}:", df.columns.tolist())
    
    # Keep only the required columns
    required_columns = ['שם הענף', 'מספר בקשה']
    missing_columns = [col for col in required_columns if col not in df.columns]
    if missing_columns:
        raise Exception(f"Missing required columns in {sheet_name}: {missing_columns}")
    df = df[required_columns]
    
    # Clean column names (replace spaces, special characters, etc.)
    def clean_column_names(df):
        df.columns = (
            df.columns
            .astype(str)
            .str.replace(r'\xa0', '_', regex=True)
            .str.replace(r'\s+', '_', regex=True)
            .str.replace(r'[^\w\(\)\-]', '_', regex=True)
            .str.strip('_')
        )
        return df
    
    df = clean_column_names(df)
    print(f"Cleaned columns in {sheet_name}:", df.columns.tolist())
    
    # Define data types for the columns
    dtype_mapping = {
        'שם_הענף': pd.StringDtype(),
        'מספר_בקשה': 'int64'
    }
    
    def apply_dtypes(df, dtype_map):
        for column, dtype in dtype_map.items():
            if column in df.columns:
                if dtype == pd.StringDtype():
                    df[column] = df[column].astype(str).replace('nan', None).astype(pd.StringDtype())
                elif dtype == 'int64':
                    df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0).astype('int64')
        return df
    
    df = apply_dtypes(df, dtype_mapping)
    
    # Translate column names to English
    column_mapping = {
        'שם_הענף': 'sport_name',
        'מספר_בקשה': 'request_number'
    }
    
    df.rename(columns=column_mapping, inplace=True)
    print(f"After renaming - {sheet_name}:", df.columns.tolist())
    
    # Drop any remaining Hebrew columns (if any slipped through)
    hebrew_columns = [col for col in df.columns if any(ord(char) > 127 for char in col)]
    print(f"Hebrew columns to drop from {sheet_name}:", hebrew_columns)
    df = df.drop(columns=hebrew_columns, errors='ignore')
    
    print(f"After dropping Hebrew - {sheet_name}:", df.columns.tolist())
    
    # Add the Year column
    df['year'] = year
    df['year'] = df['year'].astype('int32')
    
    # Add ingestion timestamp
    df["ingestion_timestamp"] = pd.Timestamp.now()
    
    print(f"Final columns in {sheet_name}:", df.columns.tolist())
    print(f"Rows in {sheet_name}: {len(df)}")
    
    print(f"Sample data for {sheet_name}:")
    print(df[['sport_name', 'request_number', 'year']].head(5))
    
    # Save to Parquet
    parquet_buffer = io.BytesIO()
    df.to_parquet(parquet_buffer, index=False, engine='pyarrow')
    
    target_bucket = "devbucketmost"
    target_parquet_path = f"Bronze/Sport/Organizations/{sheet_name}_{source_filename_without_extension}_{current_date}.parquet"
    
    s3.put_object(Bucket=target_bucket, Key=target_parquet_path, Body=parquet_buffer.getvalue())
    print(f"✅ Uploaded {sheet_name} to {target_bucket}/{target_parquet_path}")
    
    # Update the sheets dictionary with the processed DataFrame
    sheets[sheet_name]['df'] = df

print("✅ Source to Bronze job completed for all sheets.")