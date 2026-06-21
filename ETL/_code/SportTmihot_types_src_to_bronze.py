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

# Retrieve latest CSV file from S3
response = s3.list_objects_v2(Bucket=source_bucket, Prefix=source_prefix)
files = response.get('Contents', [])

if not files:
    raise Exception(f"No files found at {source_bucket}/{source_prefix}")

latest_file = max(files, key=lambda x: x['LastModified'])['Key']
print(f"✅ Latest file selected: {latest_file}")

source_filename_without_extension = os.path.splitext(os.path.basename(latest_file))[0]
current_date = datetime.datetime.now().strftime("%Y%m%d")

# Read CSV file from S3 with UTF-8 encoding
csv_obj = s3.get_object(Bucket=source_bucket, Key=latest_file)
csv_data = io.BytesIO(csv_obj['Body'].read())
df_pandas = pd.read_csv(csv_data, encoding='utf-8')

# Print raw columns for debugging
print("Raw columns in Sport Merkava:", df_pandas.columns.tolist())

# Clean column names
df_pandas.columns = (
    df_pandas.columns
    .astype(str)
    .str.replace(r'\xa0', '_', regex=True)
    .str.replace(r'\s+', '_', regex=True)
    .str.strip('_')
)

# Print cleaned columns for debugging
print("Cleaned columns in Sport Merkava:", df_pandas.columns.tolist())

# Define data types mapping
dtype_mapping = {
    'קוד_חברה': 'int64',
    'מספר_בקשה': 'int64',
    'תיאור_בקשה_קצר': pd.StringDtype(),
    'סוג_בקשה': pd.StringDtype(),
    'תיאור_סוג_בקשה': pd.StringDtype(),
    '3א_מיוחד': 'float64',
    'סטאטוס': pd.StringDtype(),
    'מצב_בקשה_נוכחי': pd.StringDtype(),
    'מזהה_מגיש_הבקשה': 'int64',
    "מס'_מגיש_(ספק)": 'int64',
    'שם_מגיש_הבקשה': pd.StringDtype(),
    'מזהה_מקבל_התשלום': 'int64',
    "מס'_מקבל_(ספק)": 'int64',
    'שם_מקבל_התשלום': pd.StringDtype(),
    'שנת_בקשה': 'int64',
    'מספר_סימוכין_פנימי': pd.StringDtype(),
    'תאריך_תוקף_התחייבות_(חוזה)': pd.StringDtype(),
    'עלות_פעילות': 'float64',
    'סכום_מבוקש': 'float64',
    'אחוז_מבוקש_%': 'float64',
    'מקורות_אחרים': 'float64',
    'מקורות_עצמיים': 'float64',
    'הלוואות': 'float64',
    'סך_מקדמות_שאושרו': 'float64',
    'סכום_מומלץ': 'int64',
    'סכום_בקשה_מאושר': 'float64',
    'סכום_לאחר_שינוי': 'float64',
    'סכום_מאושר_(מעודכן)': 'float64',
    'סכום_ממערכות_קודמות': 'int64',
    'מטבע_פעילות': pd.StringDtype(),
    'תאריך_התאמה/תשלום_אחרון': pd.StringDtype(),
    'סכום_ששולם_מותאם': 'float64',
    "יתרה_נומ'_לאחר_התאמה": 'float64',
    'יתרה_משוערכת': 'int64',
    'מטבע_תשלום': pd.StringDtype(),
    "מס'_תקנה": pd.StringDtype(),
    'תיאור_תקנה_תקציבית': pd.StringDtype(),
    'מרכז_קרנות': 'int64',
    'תיאור_מרכז_קרנות': pd.StringDtype(),
    'שנת_כספים': 'int64',
    'אלמנט_WBS': pd.StringDtype()
}

# Apply data type conversions
def apply_dtypes(df, dtype_map):
    for column, dtype in dtype_map.items():
        if column in df.columns:
            if dtype == pd.StringDtype():
                df[column] = df[column].astype(str).replace('nan', None).astype(pd.StringDtype())
            elif dtype == 'int64':
                # Remove commas and convert to numeric
                df[column] = df[column].astype(str).str.replace(',', '', regex=False)
                df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0).astype('int64')
            elif dtype == 'float64':
                # Remove commas and convert to numeric
                df[column] = df[column].astype(str).str.replace(',', '', regex=False)
                df[column] = pd.to_numeric(df[column], errors='coerce').fillna(0.0).astype('float64')
    return df

df_pandas = apply_dtypes(df_pandas, dtype_mapping)

# Print a sample of numerical columns before renaming for debugging
print("Sample data before renaming:")
sample_columns = ['מספר_בקשה', 'עלות_פעילות', 'סכום_מבוקש', 'סכום_בקשה_מאושר', 'סכום_מאושר_(מעודכן)', 'סכום_ששולם_מותאם']
df_pandas[sample_columns].head(5).to_string(index=False)

# Define Hebrew-to-English column mapping
column_mapping = {
    'קוד_חברה': 'company_code',
    'מספר_בקשה': 'request_number',
    'תיאור_בקשה_קצר': 'request_description_short',
    'סוג_בקשה': 'request_type',
    'תיאור_סוג_בקשה': 'request_type_description',
    '3א_מיוחד': 'special_3a',
    'סטאטוס': 'status',
    'מצב_בקשה_נוכחי': 'current_request_status',
    'מזהה_מגיש_הבקשה': 'requester_id',
    "מס'_מגיש_(ספק)": 'requester_supplier_number',
    'שם_מגיש_הבקשה': 'requester_name',
    'מזהה_מקבל_התשלום': 'payer_id',
    "מס'_מקבל_(ספק)": 'payer_supplier_number',
    'שם_מקבל_התשלום': 'payer_name',
    'שנת_בקשה': 'request_year',
    'מספר_סימוכין_פנימי': 'internal_reference_number',
    'תאריך_תוקף_התחייבות_(חוזה)': 'commitment_expiry_date',
    'עלות_פעילות': 'activity_cost',
    'סכום_מבוקש': 'requested_amount',
    'אחוז_מבוקש_%': 'requested_percentage',
    'מקורות_אחרים': 'other_sources',
    'מקורות_עצמיים': 'internal_sources',
    'הלוואות': 'loans',
    'סך_מקדמות_שאושרו': 'approved_advances_total',
    'סכום_מומלץ': 'recommended_amount',
    'סכום_בקשה_מאושר': 'approved_request_amount',
    'סכום_לאחר_שינוי': 'amount_after_change',
    'סכום_מאושר_(מעודכן)': 'approved_amount_updated',
    'סכום_ממערכות_קודמות': 'previous_system_amounts',
    'מטבע_פעילות': 'activity_currency',
    'תאריך_התאמה/תשלום_אחרון': 'last_adjustment_payment_date',
    'סכום_ששולם_מותאם': 'adjusted_paid_amount',
    "יתרה_נומ'_לאחר_התאמה": 'adjusted_balance_after_adjustment',
    'יתרה_משוערכת': 'estimated_balance',
    'מטבע_תשלום': 'payment_currency',
    "מס'_תקנה": 'regulation_number',
    'תיאור_תקנה_תקציבית': 'budget_regulation_description',
    'מרכז_קרנות': 'fund_center',
    'תיאור_מרכז_קרנות': 'fund_center_description',
    'שנת_כספים': 'financial_year',
    'אלמנט_WBS': 'wbs_element'
}

# Apply column name transformations
df_pandas.rename(columns=column_mapping, inplace=True)

# Print a sample of numerical columns after renaming for debugging
print("Sample data after renaming:")
sample_columns = ['request_number', 'activity_cost', 'requested_amount', 'approved_request_amount', 'approved_amount_updated', 'adjusted_paid_amount']
df_pandas[sample_columns].head(5).to_string(index=False)

# Add ingestion timestamp
df_pandas["ingestion_timestamp"] = pd.Timestamp.now()

# Convert DataFrame to Parquet
parquet_buffer = io.BytesIO()
df_pandas.to_parquet(parquet_buffer, index=False)

# Define target S3 path
target_bucket = "devbucketmost"
target_parquet_path = f"Bronze/Sport/Tmihot Merkava/{source_filename_without_extension}_{current_date}.parquet"

# Upload the Parquet file to S3
s3.put_object(Bucket=target_bucket, Key=target_parquet_path, Body=parquet_buffer.getvalue())

print(f"✅ Successfully uploaded cleaned file to {target_bucket}/{target_parquet_path}")