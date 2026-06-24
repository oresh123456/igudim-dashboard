import boto3
import pandas as pd
import io
import datetime
import os

source_bucket = "devbucketmost"
source_prefix = "Associations Local Files/"
source_file = "Teams 2023-2024.xlsx"
full_file_path = f"{source_prefix}{source_file}"
s3 = boto3.client('s3')

# Verify the file exists
try:
    s3.head_object(Bucket=source_bucket, Key=full_file_path)
    print(f"✅ File found: {full_file_path}")
except s3.exceptions.ClientError as e:
    raise Exception(f"File {full_file_path} not found in bucket {source_bucket}: {str(e)}")

source_filename_without_extension = os.path.splitext(os.path.basename(full_file_path))[0]
current_date = datetime.datetime.now().strftime("%Y%m%d")

# Read the Excel file
excel_obj = s3.get_object(Bucket=source_bucket, Key=full_file_path)
excel_data = io.BytesIO(excel_obj['Body'].read())

# Log available sheet names
excel_file = pd.ExcelFile(excel_data)
print("Available sheet names in Excel file:", excel_file.sheet_names)

# Read the sheets, stripping any spaces from sheet names
sheet_names = [name.strip() for name in excel_file.sheet_names]
if "Teams2023" not in sheet_names:
    raise Exception(f"Sheet 'Teams2023' not found in {full_file_path}. Available sheets: {sheet_names}")
if "Teams2024" not in sheet_names:
    raise Exception(f"Sheet 'Teams2024' not found in {full_file_path}. Available sheets: {sheet_names}")

df_2023 = pd.read_excel(excel_data, sheet_name='Teams2023')
df_2024 = pd.read_excel(excel_data, sheet_name='Teams2024')

print(f"Rows in Teams2023: {len(df_2023)}")
print(f"Rows in Teams2024: {len(df_2024)}")
print("Columns in Teams2023:", df_2023.columns.tolist())
print("Columns in Teams2024:", df_2024.columns.tolist())

def clean_column_names(df):
    df.columns = (
        df.columns
        .astype(str)
        .str.replace(r'\xa0', '_', regex=True)
        .str.replace(r'\s+', '_', regex=True)
        .str.replace(r'[^\w\(\)\-]', '_', regex=True)  # Preserve parentheses and dash
        .str.strip('_')
    )
    return df

df_2023 = clean_column_names(df_2023)
df_2024 = clean_column_names(df_2024)

print("Cleaned columns in Teams2023:", df_2023.columns.tolist())
print("Cleaned columns in Teams2024:", df_2024.columns.tolist())

dtype_mapping = {
    'מספר': 'int64',
    'ענף': pd.StringDtype(),
    'מספר_אגודה': 'int64',
    'שם_האגודה_קבוצה': pd.StringDtype(),
    'מספר_קבוצת_ספורט': 'int64',
    'מספר_ספורטאים': 'int64',
    'שם_ליגה': pd.StringDtype(),
    'רשות_מקומית': pd.StringDtype(),
    'סהכ_ניקוד': 'float64',
    'האם_עומדת_בתנאי_סף_מקצועיים': pd.StringDtype(),
    'האם_הקבוצה_עומדת_בתנאי_סף_מנהלתיים': pd.StringDtype(),
    'תקציב_שיחולק_בפועל_(לקבוצות_שעמדו_בתנאי_סף_מקצועיים_ומנהלתיים)_-_שוטף': 'float64',
    'הערות': pd.StringDtype(),
    'סכום_שאושר': 'float64'
}

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

column_mapping = {
    'מספר': 'serial_number',
    'ענף': 'sport_type',
    'מספר_אגודה': 'association_number',
    'שם_האגודה_קבוצה': 'association_team_name',
    'מספר_קבוצת_ספורט': 'sport_team_number',
    'מספר_ספורטאים': 'number_of_athletes',
    'שם_ליגה': 'league_name',
    'רשות_מקומית': 'local_authority',
    'סהכ_ניקוד': 'total_score',
    'האם_עומדת_בתנאי_סף_מקצועיים': 'meets_professional_threshold',
    'האם_הקבוצה_עומדת_בתנאי_סף_מנהלתיים': 'meets_administrative_threshold',
    'תקציב_שיחולק_בפועל_(לקבוצות_שעמדו_בתנאי_סף_מקצועיים_ומנהלתיים)_-_שוטף': 'actual_budget_distributed_current',
    'הערות': 'comments',
    'סכום_שאושר': 'approved_amount'
}

df_2023.rename(columns=column_mapping, inplace=True)
df_2024.rename(columns=column_mapping, inplace=True)

print("After renaming - Teams2023:", df_2023.columns.tolist())
print("After renaming - Teams2024:", df_2024.columns.tolist())

hebrew_columns_2023 = [col for col in df_2023.columns if any(ord(char) > 127 for char in col)]
hebrew_columns_2024 = [col for col in df_2024.columns if any(ord(char) > 127 for char in col)]
print("Hebrew columns to drop from Teams2023:", hebrew_columns_2023)
print("Hebrew columns to drop from Teams2024:", hebrew_columns_2024)

df_2023 = df_2023.drop(columns=hebrew_columns_2023, errors='ignore')
df_2024 = df_2024.drop(columns=hebrew_columns_2024, errors='ignore')

print("After dropping Hebrew - Teams2023:", df_2023.columns.tolist())
print("After dropping Hebrew - Teams2024:", df_2024.columns.tolist())

# Log actual_budget_distributed_current before combining
print("Teams2023 actual_budget_distributed_current sample:", df_2023['actual_budget_distributed_current'].head(5).tolist())
print("Teams2024 actual_budget_distributed_current sample:", df_2024['actual_budget_distributed_current'].head(5).tolist())

df_2023['year'] = 2023
df_2024['year'] = 2024

df_combined = pd.concat([df_2023, df_2024], ignore_index=True)

df_combined["ingestion_timestamp"] = pd.Timestamp.now()
df_combined['year'] = df_combined['year'].astype('int32')

print("Final columns:", df_combined.columns.tolist())
print(f"Rows: {len(df_combined)}")

print("Sample with key columns:")
print(df_combined[['serial_number', 'association_number', 'year', 'sport_team_number', 'total_score', 'actual_budget_distributed_current']].head(5))

parquet_buffer = io.BytesIO()
df_combined.to_parquet(parquet_buffer, index=False, engine='pyarrow')

target_bucket = "devbucketmost"
target_parquet_path = f"Bronze/AssociationsTeams/{source_filename_without_extension}_{current_date}.parquet"

s3.put_object(Bucket=target_bucket, Key=target_parquet_path, Body=parquet_buffer.getvalue())
print(f"✅ Uploaded to {target_bucket}/{target_parquet_path}")