import boto3
import pandas as pd
import io
import datetime
import os

# AWS S3 Configuration
source_bucket = "devbucketmost"
source_prefix = "Municipalities Local Files/"

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

# Read the "מאוחד" sheet
df = pd.read_excel(excel_data, sheet_name='מאוחד')

# Print raw columns for debugging
print("Raw columns in Municipalities:", df.columns.tolist())
print("Raw columns in Municipalities (with character codes):")
for col in df.columns:
    char_codes = [ord(char) for char in str(col)]
    print(f"Column: {col}, Character codes: {char_codes}")

# Clean column names
def clean_column_names(df):
    df.columns = (
        df.columns
        .astype(str)
        .str.replace(r'\xa0', ' ', regex=True)  # Replace non-breaking spaces with regular spaces
        .str.replace(r'[\'"]', '', regex=True)  # Remove single and double quotes first
        .str.replace(r'\s+', '_', regex=True)   # Replace multiple spaces with a single underscore
        .str.replace(r'[^\w\(\)\-]', '_', regex=True)  # Preserve parentheses and dash
        .str.replace(r'_+', '_', regex=True)    # Replace multiple underscores with a single underscore
        .str.strip('_')  # Remove leading/trailing underscores
    )
    return df

df = clean_column_names(df)

# Print cleaned columns for debugging
print("Cleaned columns in Municipalities:", df.columns.tolist())
print("Cleaned columns in Municipalities (with character codes):")
for col in df.columns:
    char_codes = [ord(char) for char in str(col)]
    print(f"Column: {col}, Character codes: {char_codes}")

# Define data types mapping
dtype_mapping = {
    'סמל_הרשות': 'int64',
    'שם_הרשות': pd.StringDtype(),
    'מחוז_למס': pd.StringDtype(),
    'מעמד_מוניציפלי': pd.StringDtype(),
    'סהכ_אוכלוסייה_בסוף_השנה': 'float64',
    'יהודים_ואחרים_(אחוזים)': 'float64',
    'יהודים_(אחוזים_מתוך_יהודים_ואחרים)': 'float64',
    'ערבים_(אחוזים)': 'float64',
    'מוסלמים_(אחוזים_מתוך_האוכלוסייה_הערבית)': 'float64',  # Updated to match actual column name
    'נוצרים_(אחוזים_מתוך_האוכלוסייה_הערבית)': 'float64',  # Updated to match actual column name
    'דרוזים_(אחוזים_מתוך_האוכלוסייה_הערבית)': 'float64',  # Updated to match actual column name
    'סהכ_גברים_בסוף_השנה': 'float64',
    'סהכ_נשים_בסוף_השנה': 'float64',
    'בני_4-0': 'float64',
    'בני_9-5': 'float64',
    'בני_14-10': 'float64',
    'בני_19-15': 'float64',
    'בני_29-20': 'float64',
    'בני_44-30': 'float64',
    'בני_59-45': 'float64',
    'בני_64-60': 'float64',
    'בני_65_ומעלה': 'float64',
    'בני_17-0': 'float64',
    'בני_75_ומעלה': 'float64',
    'אשכול_כלכלי_חברתי': 'int64',
    'אשכול_פריפריאלי': 'int64',
    'שם_רשות_בתרבות': pd.StringDtype(),
    'מספר_תושבים_ברשות_2020': 'float64',
    'מחוז_(הלמס_2019)': pd.StringDtype(),
    'נגב_ו_או_גליל': pd.StringDtype(),
    'אשכול_חברתי_כלכלי_2019': 'int64',
    'אשכול_גיאוגרפי_2020': 'int64',
    'עדיפות_לאומית': 'int64',
    'תרבות_חרדית_או_ערבית_ודרוזית': pd.StringDtype(),
    'מחוז_משרד_התרבות_והספורט': pd.StringDtype(),
    'מגזר_חברה': pd.StringDtype()
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
    'סמל_הרשות': 'authority_code',
    'שם_הרשות': 'authority_name',
    'מחוז_למס': 'tax_district',
    'מעמד_מוניציפלי': 'municipal_status',
    'סהכ_אוכלוסייה_בסוף_השנה': 'total_population_end_of_year',
    'יהודים_ואחרים_(אחוזים)': 'jews_and_others_percentage',
    'יהודים_(אחוזים_מתוך_יהודים_ואחרים)': 'jews_percentage_of_jews_and_others',
    'ערבים_(אחוזים)': 'arabs_percentage',
    'מוסלמים_(אחוזים_מתוך_האוכלוסייה_הערבית)': 'muslims_percentage_of_arab_population',  # Updated to match actual column name
    'נוצרים_(אחוזים_מתוך_האוכלוסייה_הערבית)': 'christians_percentage_of_arab_population',  # Updated to match actual column name
    'דרוזים_(אחוזים_מתוך_האוכלוסייה_הערבית)': 'druze_percentage_of_arab_population',  # Updated to match actual column name
    'סהכ_גברים_בסוף_השנה': 'total_men_end_of_year',
    'סהכ_נשים_בסוף_השנה': 'total_women_end_of_year',
    'בני_4-0': 'age_0_4',
    'בני_9-5': 'age_5_9',
    'בני_14-10': 'age_10_14',
    'בני_19-15': 'age_15_19',
    'בני_29-20': 'age_20_29',
    'בני_44-30': 'age_30_44',
    'בני_59-45': 'age_45_59',
    'בני_64-60': 'age_60_64',
    'בני_65_ומעלה': 'age_65_and_above',
    'בני_17-0': 'age_0_17',
    'בני_75_ומעלה': 'age_75_and_above',
    'אשכול_כלכלי_חברתי': 'socioeconomic_cluster',
    'אשכול_פריפריאלי': 'peripheral_cluster',
    'שם_רשות_בתרבות': 'authority_name_in_culture',
    'מספר_תושבים_ברשות_2020': 'population_in_authority_2020',
    'מחוז_(הלמס_2019)': 'district_cbs_2019',
    'נגב_ו_או_גליל': 'negev_or_galilee',
    'אשכול_חברתי_כלכלי_2019': 'socioeconomic_cluster_2019',
    'אשכול_גיאוגרפי_2020': 'geographic_cluster_2020',
    'עדיפות_לאומית': 'national_priority',
    'תרבות_חרדית_או_ערבית_ודרוזית': 'haredi_or_arab_and_druze_culture',
    'מחוז_משרד_התרבות_והספורט': 'culture_and_sport_ministry_district',
    'מגזר_חברה': 'sector_or_society'
}

# Check for missing Hebrew columns before renaming
expected_hebrew_columns = list(column_mapping.keys())
print("Expected Hebrew columns in column_mapping:", expected_hebrew_columns)
print("Actual cleaned columns:", df.columns.tolist())
for expected_col in expected_hebrew_columns:
    if expected_col not in df.columns:
        expected_chars = [ord(char) for char in expected_col]
        for actual_col in df.columns:
            if actual_col.startswith('דרוזים') and expected_col.startswith('דרוזים'):
                actual_chars = [ord(char) for char in actual_col]
                print(f"Comparing: Expected '{expected_col}' ({expected_chars}) vs Actual '{actual_col}' ({actual_chars})")

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
expected_columns_after_rename = [
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
    'sector_or_society'
]
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

# Check for duplicates on authority_code
print("Checking duplicates on authority_code...")
duplicates = df.duplicated(subset=['authority_code'], keep=False)
if duplicates.any():
    print("Duplicates found:")
    print(df[duplicates][['authority_code']].sort_values(by=['authority_code']))
    df = df.drop_duplicates(subset=['authority_code'], keep='last')
    print("Duplicates removed. Rows:", len(df))
else:
    print("No duplicates found.")

# Add ingestion timestamp
df["ingestion_timestamp"] = pd.Timestamp.now()

# Final column list check
print("Final columns:", df.columns.tolist())
print(f"Rows: {len(df)}")

# Log sample data (safely access columns)
sample_columns = ['authority_code', 'authority_name', 'total_population_end_of_year', 'socioeconomic_cluster']
available_sample_columns = [col for col in sample_columns if col in df.columns]
print("Sample with available key columns:", available_sample_columns)
print(df[available_sample_columns].head(5))

# Convert DataFrame to Parquet
parquet_buffer = io.BytesIO()
df.to_parquet(parquet_buffer, index=False, engine='pyarrow')

# Define target S3 path
target_bucket = "devbucketmost"
target_parquet_path = f"Bronze/Municipalities/{source_filename_without_extension}_{current_date}.parquet"

# Upload the Parquet file to S3
s3.put_object(Bucket=target_bucket, Key=target_parquet_path, Body=parquet_buffer.getvalue())
print(f"✅ Uploaded to {target_bucket}/{target_parquet_path}")