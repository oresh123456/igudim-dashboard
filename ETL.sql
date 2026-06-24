-- public."DWH_associations_teams" definition

-- Drop table

-- DROP TABLE public."DWH_associations_teams";

CREATE TABLE public."DWH_associations_teams" (
	association_team_id serial4 NOT NULL,
	serial_number float8 NULL,
	sport_type text NULL,
	association_number int8 NULL,
	association_team_name text NOT NULL,
	sport_team_number int8 NULL,
	number_of_athletes int8 NULL,
	league_name text NULL,
	local_authority text NULL,
	total_score float4 NULL,
	meets_professional_threshold text NULL,
	meets_administrative_threshold text NULL,
	actual_budget_distributed_current float8 NULL,
	"comments" text NULL,
	approved_amount float4 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL,
	load_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT "DWH_associations_teams_pkey" PRIMARY KEY (association_team_id)
);


-- public."DWH_branches_sport" definition

-- Drop table

-- DROP TABLE public."DWH_branches_sport";

CREATE TABLE public."DWH_branches_sport" (
	branch_id serial4 NOT NULL,
	sport_branch text NOT NULL,
	individual_or_team text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL,
	load_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT "DWH_branches_sport_pkey" PRIMARY KEY (branch_id)
);


-- public."DWH_detailed_sport_budget" definition

-- Drop table

-- DROP TABLE public."DWH_detailed_sport_budget";

CREATE TABLE public."DWH_detailed_sport_budget" (
	budget_id serial4 NOT NULL,
	authority_number_merkava int8 NULL,
	authority_name text NULL,
	request_number int8 NULL,
	sport_associations float4 NULL,
	initiatives_budget float4 NULL,
	payment float4 NULL,
	base_budget float4 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL,
	load_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT "DWH_detailed_sport_budget_pkey" PRIMARY KEY (budget_id)
);


-- public."DWH_factRequests" definition

-- Drop table

-- DROP TABLE public."DWH_factRequests";

CREATE TABLE public."DWH_factRequests" (
	request_number int8 NULL,
	row_unique_id int8 NULL,
	short_request_description text NULL,
	request_type text NULL,
	request_type_description text NULL,
	status text NULL,
	current_request_status text NULL,
	requester_id int4 NULL,
	requester_supplier_number int8 NULL,
	requester_name text NULL,
	request_year int8 NULL,
	requested_amount float8 NULL,
	approved_advances_total float8 NULL,
	approved_amount float8 NULL,
	adjusted_paid_amount float8 NULL,
	remaining_balance_after_adjustment float8 NULL,
	regulation_number text NULL,
	budgetary_regulation_description text NULL,
	funds_center text NULL,
	funds_center_description text NULL,
	financial_year int8 NULL,
	wbs_element text NULL,
	call_for_proposal_number text NULL,
	"type" text NULL,
	is_supported text NULL,
	support_for_display text NULL,
	authority text NULL,
	authority_association text NULL,
	sport_type text NULL,
	ingestion_timestamp timestamptz NULL,
	"domain" text NULL,
	actual_budget_distributed_current float8 NULL,
	sector text NULL,
	individual_or_team text NULL,
	base_budget float8 NULL,
	sport_associations float8 NULL,
	initiatives_budget float8 NULL,
	number_of_athletes int8 NULL,
	population_in_authority_2020 int8 NULL,
	district_cbs_2019 text NULL,
	socioeconomic_cluster_2021 int4 NULL,
	national_priority int4 NULL,
	geographic_cluster_2020 int4 NULL,
	tax_district text NULL,
	total_men_end_of_year float8 NULL,
	total_population_end_of_year float8 NULL,
	total_women_end_of_year float8 NULL,
	negev_or_galilee text NULL,
	new_status text NULL
);


-- public."DWH_factRequests_old" definition

-- Drop table

-- DROP TABLE public."DWH_factRequests_old";

CREATE TABLE public."DWH_factRequests_old" (
	fact_request_id int4 DEFAULT nextval('"DWH_factRequests_fact_request_id_seq"'::regclass) NOT NULL,
	request_number int8 NULL,
	row_unique_id int8 NULL,
	short_request_description text NULL,
	request_type text NULL,
	request_type_description text NULL,
	status text NULL,
	current_request_status text NULL,
	requester_id int4 NULL,
	requester_supplier_number int8 NULL,
	requester_name text NULL,
	request_year int8 NULL,
	requested_amount float8 NULL,
	approved_advances_total float8 NULL,
	approved_amount float8 NULL,
	adjusted_paid_amount float8 NULL,
	remaining_balance_after_adjustment float8 NULL,
	regulation_number text NULL,
	budgetary_regulation_description text NULL,
	funds_center text NULL,
	funds_center_description text NULL,
	financial_year int8 NULL,
	wbs_element text NULL,
	call_for_proposal_number text NULL,
	"type" text NULL,
	is_supported text NULL,
	support_for_display text NULL,
	authority text NULL,
	authority_association text NULL,
	sport_type text NULL,
	ingestion_timestamp timestamptz NULL,
	"domain" text NULL,
	actual_budget_distributed_current float8 NULL,
	sector text NULL,
	individual_or_team text NULL,
	base_budget float8 NULL,
	sport_associations float8 NULL,
	initiatives_budget float8 NULL,
	number_of_athletes int8 NULL,
	population_in_authority_2020 int8 NULL,
	district_cbs_2019 text NULL,
	socioeconomic_cluster_2019 int4 NULL,
	national_priority int4 NULL,
	geographic_cluster_2020 int4 NULL,
	tax_district text NULL,
	total_men_end_of_year float8 NULL,
	total_population_end_of_year float8 NULL,
	total_women_end_of_year float8 NULL,
	negev_or_galilee text NULL,
	load_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT "DWH_factRequests_pkey" PRIMARY KEY (fact_request_id)
);


-- public."DWH_municipalities" definition

-- Drop table

-- DROP TABLE public."DWH_municipalities";

CREATE TABLE public."DWH_municipalities" (
	municipality_id serial4 NOT NULL,
	authority_code int8 NULL,
	authority_name text NULL,
	tax_district text NULL,
	municipal_status text NULL,
	total_population_end_of_year float4 NULL,
	jews_and_others_percentage float4 NULL,
	jews_percentage_of_jews_and_others float4 NULL,
	arabs_percentage float4 NULL,
	muslims_percentage_of_arab_population float4 NULL,
	christians_percentage_of_arab_population float4 NULL,
	druze_percentage_of_arab_population float4 NULL,
	total_men_end_of_year float4 NULL,
	total_women_end_of_year float4 NULL,
	age_0_4 float4 NULL,
	age_5_9 float4 NULL,
	age_10_14 float4 NULL,
	age_15_19 float4 NULL,
	age_20_29 float4 NULL,
	age_30_44 float4 NULL,
	age_45_59 float4 NULL,
	age_60_64 float4 NULL,
	age_65_and_above float4 NULL,
	age_0_17 float4 NULL,
	age_75_and_above float4 NULL,
	socioeconomic_cluster int8 NULL,
	peripheral_cluster int8 NULL,
	authority_name_in_culture text NULL,
	population_in_authority_2020 float4 NULL,
	district_cbs_2019 text NULL,
	negev_or_galilee text NULL,
	socioeconomic_cluster_2019 int8 NULL,
	geographic_cluster_2020 int8 NULL,
	national_priority int8 NULL,
	haredi_or_arab_and_druze_culture text NULL,
	culture_and_sport_ministry_district text NULL,
	sector_or_society text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL,
	load_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	"authority_name_sport_SM" text NULL,
	CONSTRAINT "DWH_municipalities_pkey" PRIMARY KEY (municipality_id)
);


-- public."DWH_sport_merkava" definition

-- Drop table

-- DROP TABLE public."DWH_sport_merkava";

CREATE TABLE public."DWH_sport_merkava" (
	company_code int8 NULL,
	request_number int8 NULL,
	request_description_short text NULL,
	request_type text NULL,
	request_type_description text NULL,
	special_3a text NULL,
	status text NULL,
	new_status text NULL,
	current_request_status text NULL,
	requester_id int8 NULL,
	requester_supplier_number int8 NULL,
	requester_name text NULL,
	payer_id int8 NULL,
	payer_supplier_number int8 NULL,
	payer_name text NULL,
	request_year int8 NULL,
	internal_reference_number text NULL,
	commitment_expiry_date text NULL,
	activity_cost float8 NULL,
	requested_amount float8 NULL,
	requested_percentage float8 NULL,
	other_sources float8 NULL,
	internal_sources float8 NULL,
	loans float8 NULL,
	approved_advances_total float8 NULL,
	recommended_amount int8 NULL,
	approved_request_amount float8 NULL,
	amount_after_change float8 NULL,
	approved_amount_updated float8 NULL,
	previous_system_amounts int8 NULL,
	activity_currency text NULL,
	last_adjustment_payment_date text NULL,
	adjusted_paid_amount float8 NULL,
	adjusted_balance_after_adjustment float8 NULL,
	estimated_balance int8 NULL,
	payment_currency text NULL,
	regulation_number text NULL,
	budget_regulation_description text NULL,
	fund_center int8 NULL,
	fund_center_description text NULL,
	financial_year int8 NULL,
	wbs_element text NULL,
	authority text NULL,
	sport_type text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."DWH_sport_organizations" definition

-- Drop table

-- DROP TABLE public."DWH_sport_organizations";

CREATE TABLE public."DWH_sport_organizations" (
	sport_org_id serial4 NOT NULL,
	sport_name text NULL,
	request_number int8 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL,
	load_date timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT "DWH_sport_organizations_pkey" PRIMARY KEY (sport_org_id)
);


-- public."DWH_tarbut_merkava" definition

-- Drop table

-- DROP TABLE public."DWH_tarbut_merkava";

CREATE TABLE public."DWH_tarbut_merkava" (
	request_number int8 NULL,
	short_request_description text NULL,
	request_type text NULL,
	request_type_description text NULL,
	status text NULL,
	current_request_status text NULL,
	requester_id int8 NULL,
	requester_number_supplier int8 NULL,
	requester_name text NULL,
	request_year int8 NULL,
	requested_amount float8 NULL,
	approved_advances_total float8 NULL,
	update_approved_amount float8 NULL,
	approved_amount float8 NULL,
	adjusted_paid_amount float8 NULL,
	remaining_balance_after_adjustment float8 NULL,
	regulation_number text NULL,
	budgetary_regulation_description text NULL,
	funds_center int8 NULL,
	wbs_element text NULL,
	call_for_proposal_number int8 NULL,
	"type" text NULL,
	is_supported int8 NULL,
	support_for_display float8 NULL,
	regulation text NULL,
	domain_range text NULL,
	domain_for_table_display text NULL,
	city text NULL,
	authority text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."MRR_associations_teams" definition

-- Drop table

-- DROP TABLE public."MRR_associations_teams";

CREATE TABLE public."MRR_associations_teams" (
	serial_number int4 NULL,
	sport_type varchar NULL,
	association_number int8 NULL,
	association_team_name varchar NULL,
	sport_team_number int4 NULL,
	number_of_athletes int4 NULL,
	league_name varchar NULL,
	local_authority varchar NULL,
	total_score float8 NULL,
	meets_professional_threshold varchar NULL,
	meets_administrative_threshold varchar NULL,
	actual_budget_distributed_current float8 NULL,
	"comments" varchar NULL,
	approved_amount float8 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamp NULL,
	source_file_name varchar NULL
);


-- public."MRR_branches_sport" definition

-- Drop table

-- DROP TABLE public."MRR_branches_sport";

CREATE TABLE public."MRR_branches_sport" (
	sport_branch text NULL,
	individual_or_team text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."MRR_detailed_sport_budget" definition

-- Drop table

-- DROP TABLE public."MRR_detailed_sport_budget";

CREATE TABLE public."MRR_detailed_sport_budget" (
	authority_number_merkava int8 NULL,
	authority_name text NULL,
	request_number int8 NULL,
	sport_associations float4 NULL,
	initiatives_budget float4 NULL,
	payment float4 NULL,
	base_budget float4 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."MRR_municipalities" definition

-- Drop table

-- DROP TABLE public."MRR_municipalities";

CREATE TABLE public."MRR_municipalities" (
	authority_code int8 NULL,
	authority_name text NULL,
	tax_district text NULL,
	municipal_status text NULL,
	total_population_end_of_year float4 NULL,
	jews_and_others_percentage float4 NULL,
	jews_percentage_of_jews_and_others float4 NULL,
	arabs_percentage float4 NULL,
	muslims_percentage_of_arab_population float4 NULL,
	christians_percentage_of_arab_population float4 NULL,
	druze_percentage_of_arab_population float4 NULL,
	total_men_end_of_year float4 NULL,
	total_women_end_of_year float4 NULL,
	age_0_4 float4 NULL,
	age_5_9 float4 NULL,
	age_10_14 float4 NULL,
	age_15_19 float4 NULL,
	age_20_29 float4 NULL,
	age_30_44 float4 NULL,
	age_45_59 float4 NULL,
	age_60_64 float4 NULL,
	age_65_and_above float4 NULL,
	age_0_17 float4 NULL,
	age_75_and_above float4 NULL,
	socioeconomic_cluster int8 NULL,
	peripheral_cluster int8 NULL,
	authority_name_in_culture text NULL,
	population_in_authority_2020 float4 NULL,
	district_cbs_2019 text NULL,
	negev_or_galilee text NULL,
	socioeconomic_cluster_2019 int8 NULL,
	geographic_cluster_2020 int8 NULL,
	national_priority int8 NULL,
	haredi_or_arab_and_druze_culture text NULL,
	culture_and_sport_ministry_district text NULL,
	sector_or_society text NULL,
	"authority_name_sport_SM" text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."MRR_new_approved_amount" definition

-- Drop table

-- DROP TABLE public."MRR_new_approved_amount";

CREATE TABLE public."MRR_new_approved_amount" (
	request_number int8 NULL,
	request_year int8 NULL,
	new_approved_amount float8 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."MRR_sport_merkava" definition

-- Drop table

-- DROP TABLE public."MRR_sport_merkava";

CREATE TABLE public."MRR_sport_merkava" (
	company_code int8 NULL,
	request_number int8 NULL,
	request_description_short text NULL,
	request_type text NULL,
	request_type_description text NULL,
	special_3a text NULL,
	status text NULL,
	current_request_status text NULL,
	requester_id int8 NULL,
	requester_supplier_number int8 NULL,
	requester_name text NULL,
	payer_id int8 NULL,
	payer_supplier_number int8 NULL,
	payer_name text NULL,
	request_year int8 NULL,
	internal_reference_number text NULL,
	commitment_expiry_date text NULL,
	activity_cost float8 NULL,
	requested_amount float8 NULL,
	requested_percentage float8 NULL,
	other_sources float8 NULL,
	internal_sources float8 NULL,
	loans float8 NULL,
	approved_advances_total float8 NULL,
	recommended_amount int8 NULL,
	approved_request_amount float8 NULL,
	amount_after_change float8 NULL,
	approved_amount_updated float8 NULL,
	previous_system_amounts int8 NULL,
	activity_currency text NULL,
	last_adjustment_payment_date text NULL,
	adjusted_paid_amount float8 NULL,
	adjusted_balance_after_adjustment float8 NULL,
	estimated_balance int8 NULL,
	payment_currency text NULL,
	regulation_number text NULL,
	budget_regulation_description text NULL,
	fund_center int8 NULL,
	fund_center_description text NULL,
	financial_year int8 NULL,
	wbs_element text NULL,
	authority text NULL,
	sport_type text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."MRR_sport_organizations" definition

-- Drop table

-- DROP TABLE public."MRR_sport_organizations";

CREATE TABLE public."MRR_sport_organizations" (
	sport_name text NULL,
	request_number int8 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."MRR_tmihot_merkava" definition

-- Drop table

-- DROP TABLE public."MRR_tmihot_merkava";

CREATE TABLE public."MRR_tmihot_merkava" (
	request_number int8 NULL,
	short_request_description text NULL,
	request_type text NULL,
	request_type_description text NULL,
	status text NULL,
	current_request_status text NULL,
	requester_id int8 NULL,
	requester_number_supplier int8 NULL,
	requester_name text NULL,
	request_year int8 NULL,
	requested_amount float8 NULL,
	approved_advances_total float8 NULL,
	adjusted_paid_amount float8 NULL,
	remaining_balance_after_adjustment float8 NULL,
	regulation_number text NULL,
	budgetary_regulation_description text NULL,
	funds_center int8 NULL,
	wbs_element text NULL,
	call_for_proposal_number int8 NULL,
	"type" text NULL,
	is_supported int8 NULL,
	support_for_display float8 NULL,
	regulation text NULL,
	regulation_or_range_for_display_from_2020 text NULL,
	domain_range text NULL,
	domain_for_table_display text NULL,
	city text NULL,
	authority text NULL,
	population_in_authority_2020 int8 NULL,
	district_cbs_2019 text NULL,
	negev_or_galilee text NULL,
	socioeconomic_cluster_2019 int8 NULL,
	geographic_cluster_2020 text NULL,
	national_priority int8 NULL,
	haredi_or_arab_and_druze_culture text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."STG_associations_teams" definition

-- Drop table

-- DROP TABLE public."STG_associations_teams";

CREATE TABLE public."STG_associations_teams" (
	serial_number float8 NULL,
	sport_type text NULL,
	association_number int8 NULL,
	association_team_name text NULL,
	sport_team_number int8 NULL,
	number_of_athletes int8 NULL,
	league_name text NULL,
	local_authority text NULL,
	total_score float4 NULL,
	meets_professional_threshold text NULL,
	meets_administrative_threshold text NULL,
	actual_budget_distributed_current float8 NULL,
	"comments" text NULL,
	approved_amount float4 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."STG_branches_sport" definition

-- Drop table

-- DROP TABLE public."STG_branches_sport";

CREATE TABLE public."STG_branches_sport" (
	sport_branch text NULL,
	individual_or_team text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."STG_detailed_sport_budget" definition

-- Drop table

-- DROP TABLE public."STG_detailed_sport_budget";

CREATE TABLE public."STG_detailed_sport_budget" (
	authority_number_merkava int8 NULL,
	authority_name text NULL,
	request_number int8 NULL,
	sport_associations float4 NULL,
	initiatives_budget float4 NULL,
	payment float4 NULL,
	base_budget float4 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."STG_factRequests" definition

-- Drop table

-- DROP TABLE public."STG_factRequests";

CREATE TABLE public."STG_factRequests" (
	request_number int8 NULL,
	row_unique_id int8 NULL,
	short_request_description text NULL,
	request_type text NULL,
	request_type_description text NULL,
	status text NULL,
	new_status text NULL,
	current_request_status text NULL,
	requester_id int4 NULL,
	requester_supplier_number int8 NULL,
	requester_name text NULL,
	request_year int8 NULL,
	requested_amount float8 NULL,
	approved_advances_total float8 NULL,
	approved_amount float8 NULL,
	adjusted_paid_amount float8 NULL,
	remaining_balance_after_adjustment float8 NULL,
	regulation_number text NULL,
	budgetary_regulation_description text NULL,
	funds_center text NULL,
	funds_center_description text NULL,
	financial_year int8 NULL,
	wbs_element text NULL,
	call_for_proposal_number text NULL,
	"type" text NULL,
	is_supported text NULL,
	support_for_display text NULL,
	authority text NULL,
	authority_association text NULL,
	sport_type text NULL,
	ingestion_timestamp timestamptz NULL,
	"domain" text NULL,
	actual_budget_distributed_current float8 NULL,
	sector text NULL,
	individual_or_team text NULL,
	base_budget float8 NULL,
	sport_associations float8 NULL,
	initiatives_budget float8 NULL,
	number_of_athletes int8 NULL,
	population_in_authority_2020 int8 NULL,
	district_cbs_2019 text NULL,
	socioeconomic_cluster_2021 int4 NULL,
	national_priority int4 NULL,
	geographic_cluster_2020 int4 NULL,
	tax_district text NULL,
	total_men_end_of_year float8 NULL,
	total_population_end_of_year float8 NULL,
	total_women_end_of_year float8 NULL,
	negev_or_galilee text NULL
);


-- public."STG_factRequests_old" definition

-- Drop table

-- DROP TABLE public."STG_factRequests_old";

CREATE TABLE public."STG_factRequests_old" (
	request_number int8 NULL,
	row_unique_id int8 NULL,
	short_request_description text NULL,
	request_type text NULL,
	request_type_description text NULL,
	status text NULL,
	current_request_status text NULL,
	requester_id int4 NULL,
	requester_supplier_number int8 NULL,
	requester_name text NULL,
	request_year int8 NULL,
	requested_amount float8 NULL,
	approved_advances_total float8 NULL,
	approved_amount float8 NULL,
	adjusted_paid_amount float8 NULL,
	remaining_balance_after_adjustment float8 NULL,
	regulation_number text NULL,
	budgetary_regulation_description text NULL,
	funds_center text NULL,
	funds_center_description text NULL,
	financial_year int8 NULL,
	wbs_element text NULL,
	call_for_proposal_number text NULL,
	"type" text NULL,
	is_supported text NULL,
	support_for_display text NULL,
	authority text NULL,
	authority_association text NULL,
	sport_type text NULL,
	ingestion_timestamp timestamptz NULL,
	"domain" text NULL,
	actual_budget_distributed_current float8 NULL,
	sector text NULL,
	individual_or_team text NULL,
	base_budget float8 NULL,
	sport_associations float8 NULL,
	initiatives_budget float8 NULL,
	number_of_athletes int8 NULL,
	population_in_authority_2020 int8 NULL,
	district_cbs_2019 text NULL,
	socioeconomic_cluster_2019 int4 NULL,
	national_priority int4 NULL,
	geographic_cluster_2020 int4 NULL,
	tax_district text NULL,
	total_men_end_of_year float8 NULL,
	total_population_end_of_year float8 NULL,
	total_women_end_of_year float8 NULL,
	negev_or_galilee text NULL
);


-- public."STG_municipalities" definition

-- Drop table

-- DROP TABLE public."STG_municipalities";

CREATE TABLE public."STG_municipalities" (
	authority_code int8 NULL,
	authority_name text NULL,
	tax_district text NULL,
	municipal_status text NULL,
	total_population_end_of_year float4 NULL,
	jews_and_others_percentage float4 NULL,
	jews_percentage_of_jews_and_others float4 NULL,
	arabs_percentage float4 NULL,
	muslims_percentage_of_arab_population float4 NULL,
	christians_percentage_of_arab_population float4 NULL,
	druze_percentage_of_arab_population float4 NULL,
	total_men_end_of_year float4 NULL,
	total_women_end_of_year float4 NULL,
	age_0_4 float4 NULL,
	age_5_9 float4 NULL,
	age_10_14 float4 NULL,
	age_15_19 float4 NULL,
	age_20_29 float4 NULL,
	age_30_44 float4 NULL,
	age_45_59 float4 NULL,
	age_60_64 float4 NULL,
	age_65_and_above float4 NULL,
	age_0_17 float4 NULL,
	age_75_and_above float4 NULL,
	socioeconomic_cluster int8 NULL,
	peripheral_cluster int8 NULL,
	authority_name_in_culture text NULL,
	population_in_authority_2020 float4 NULL,
	district_cbs_2019 text NULL,
	negev_or_galilee text NULL,
	socioeconomic_cluster_2019 int8 NULL,
	geographic_cluster_2020 int8 NULL,
	national_priority int8 NULL,
	haredi_or_arab_and_druze_culture text NULL,
	culture_and_sport_ministry_district text NULL,
	sector_or_society text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL,
	"authority_name_sport_SM" text NULL
);


-- public."STG_sport_merkava" definition

-- Drop table

-- DROP TABLE public."STG_sport_merkava";

CREATE TABLE public."STG_sport_merkava" (
	company_code int8 NULL,
	request_number int8 NULL,
	request_description_short text NULL,
	request_type text NULL,
	request_type_description text NULL,
	special_3a text NULL,
	status text NULL,
	new_status text NULL,
	current_request_status text NULL,
	requester_id int8 NULL,
	requester_supplier_number int8 NULL,
	requester_name text NULL,
	payer_id int8 NULL,
	payer_supplier_number int8 NULL,
	payer_name text NULL,
	request_year int8 NULL,
	internal_reference_number text NULL,
	commitment_expiry_date text NULL,
	activity_cost float8 NULL,
	requested_amount float8 NULL,
	requested_percentage float8 NULL,
	other_sources float8 NULL,
	internal_sources float8 NULL,
	loans float8 NULL,
	approved_advances_total float8 NULL,
	recommended_amount int8 NULL,
	approved_request_amount float8 NULL,
	amount_after_change float8 NULL,
	approved_amount_updated float8 NULL,
	previous_system_amounts int8 NULL,
	activity_currency text NULL,
	last_adjustment_payment_date text NULL,
	adjusted_paid_amount float8 NULL,
	adjusted_balance_after_adjustment float8 NULL,
	estimated_balance int8 NULL,
	payment_currency text NULL,
	regulation_number text NULL,
	budget_regulation_description text NULL,
	fund_center int8 NULL,
	fund_center_description text NULL,
	financial_year int8 NULL,
	wbs_element text NULL,
	authority text NULL,
	sport_type text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."STG_sport_organizations" definition

-- Drop table

-- DROP TABLE public."STG_sport_organizations";

CREATE TABLE public."STG_sport_organizations" (
	sport_name text NULL,
	request_number int8 NULL,
	"year" int4 NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL
);


-- public."STG_tarbut_merkava" definition

-- Drop table

-- DROP TABLE public."STG_tarbut_merkava";

CREATE TABLE public."STG_tarbut_merkava" (
	request_number int8 NULL,
	short_request_description text NULL,
	request_type text NULL,
	request_type_description text NULL,
	status text NULL,
	current_request_status text NULL,
	requester_id int8 NULL,
	requester_number_supplier int8 NULL,
	requester_name text NULL,
	request_year int8 NULL,
	requested_amount float8 NULL,
	approved_advances_total float8 NULL,
	approved_amount float8 NULL,
	adjusted_paid_amount float8 NULL,
	remaining_balance_after_adjustment float8 NULL,
	regulation_number text NULL,
	budgetary_regulation_description text NULL,
	funds_center int8 NULL,
	wbs_element text NULL,
	call_for_proposal_number int8 NULL,
	"type" text NULL,
	is_supported int8 NULL,
	support_for_display float8 NULL,
	regulation text NULL,
	domain_range text NULL,
	domain_for_table_display text NULL,
	city text NULL,
	authority text NULL,
	ingestion_timestamp timestamptz NULL,
	source_file_name text NULL,
	update_approved_amount float8 NULL
);


-- public.accounts definition

-- Drop table

-- DROP TABLE public.accounts;

CREATE TABLE public.accounts (
	association_id int8 NULL,
	association_code text NULL,
	association_name text NULL,
	association_type text NULL,
	provider_num text NULL,
	main_branch_name text NULL,
	main_branch_code text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.dwh_aa_dim_association definition

-- Drop table

-- DROP TABLE public.dwh_aa_dim_association;

CREATE TABLE public.dwh_aa_dim_association (
	association_id int8 NULL,
	association_name text NULL,
	provider_num text NULL,
	main_branch_name text NULL,
	main_branch_code text NULL
);


-- public.dwh_aa_dim_athlete definition

-- Drop table

-- DROP TABLE public.dwh_aa_dim_athlete;

CREATE TABLE public.dwh_aa_dim_athlete (
	athlete_code text NULL,
	athlete_support_first_name text NULL,
	athlete_support_last_name text NULL,
	athlete_support_full_name text NULL,
	birth_year int8 NULL,
	athlet_age float8 NULL,
	athlete_gender text NULL,
	society_id float8 NULL,
	team_number float8 NULL,
	athlete_final_score float8 NULL,
	athlete_has_insurance text NULL,
	athlete_has_medical_check text NULL,
	is_pass_threshold_condition text NULL,
	athlete_age_category text NULL,
	support_request_year int8 NULL,
	branch_name text NULL,
	branch_id int8 NULL
);


-- public.dwh_aa_dim_authority definition

-- Drop table

-- DROP TABLE public.dwh_aa_dim_authority;

CREATE TABLE public.dwh_aa_dim_authority (
	authority_id int8 NULL,
	key_authority text NULL,
	authority_name text NULL,
	crm_district text NULL,
	head_authority_name text NULL,
	lamas_district text NULL,
	municipal_status text NULL,
	total_population int8 NULL,
	jews_others_pct float8 NULL,
	jews_pct float8 NULL,
	arab_pct float8 NULL,
	muslim_pct float8 NULL,
	christian_pct float8 NULL,
	druze_pct float8 NULL,
	total_males int8 NULL,
	total_females int8 NULL,
	total_israelis int8 NULL,
	socioeconomic_cluster float8 NULL,
	peripherality_cluster float8 NULL
);


-- public.dwh_aa_dim_branchs definition

-- Drop table

-- DROP TABLE public.dwh_aa_dim_branchs;

CREATE TABLE public.dwh_aa_dim_branchs (
	branch_code text NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	is_olympic_branch int8 NULL,
	is_special_needs_branch int8 NULL,
	is_sub_branch int8 NULL,
	branch_type text NULL,
	main_branch_code text NULL,
	main_branch_name text NULL,
	personal_or_group text NULL,
	sport_type text NULL,
	status_code int8 NULL
);


-- public.dwh_aa_dim_society definition

-- Drop table

-- DROP TABLE public.dwh_aa_dim_society;

CREATE TABLE public.dwh_aa_dim_society (
	society_id int8 NULL,
	society_name text NULL,
	authority_code text NULL,
	authority_name text NULL
);


-- public.dwh_aa_dim_teams definition

-- Drop table

-- DROP TABLE public.dwh_aa_dim_teams;

CREATE TABLE public.dwh_aa_dim_teams (
	team_code text NULL,
	team_number int8 NULL,
	team_name text NULL,
	team_achievement_score float8 NULL,
	society_id int8 NULL
);


-- public.dwh_aa_dim_trainers definition

-- Drop table

-- DROP TABLE public.dwh_aa_dim_trainers;

CREATE TABLE public.dwh_aa_dim_trainers (
	id float8 NULL,
	first_name text NULL,
	last_name text NULL,
	gender text NULL,
	"type" text NULL,
	support_request_year int8 NULL
);


-- public.dwh_aa_fact_athlete definition

-- Drop table

-- DROP TABLE public.dwh_aa_fact_athlete;

CREATE TABLE public.dwh_aa_fact_athlete (
	request_type text NULL,
	athlete_code text NULL,
	is_pass_threshold_condition text NULL,
	athlete_gender text NULL,
	age int8 NULL,
	athlete_age_category text NULL,
	athlete_has_insurance text NULL,
	athlete_has_medical_check text NULL,
	athlete_final_score float8 NULL,
	team_code text NULL,
	team_number numeric NULL,
	team_name text NULL,
	league_type text NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	association_id int8 NULL,
	association_name text NULL,
	society_id int8 NULL,
	society_name text NULL,
	authority_id int8 NULL,
	authority_name text NULL,
	key_authority text NULL,
	is_budget_pass_final_threshold text NULL,
	support_request_code text NULL,
	support_request_year int8 NULL
);


-- public.dwh_aa_fact_athlete_by_branch_society definition

-- Drop table

-- DROP TABLE public.dwh_aa_fact_athlete_by_branch_society;

CREATE TABLE public.dwh_aa_fact_athlete_by_branch_society (
	request_type text NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	society_id int8 NULL,
	society_name text NULL,
	authority_id int8 NULL,
	authority_name text NULL,
	female_under_18 int8 NULL,
	female_over_18 int8 NULL,
	male_under_18 int8 NULL,
	male_over_18 int8 NULL,
	male_cnt int8 NULL,
	female_cnt int8 NULL,
	male_score float8 NULL,
	female_score float8 NULL,
	male_teams_over_18 int8 NULL,
	male_teams_under_18 int8 NULL,
	female_teams_over_18 int8 NULL,
	female_teams_under_18 int8 NULL,
	male_teams_cnt int8 NULL,
	female_teams_cnt int8 NULL,
	is_pass_admin_condition text NULL,
	is_pass_professional_condition text NULL,
	support_request_year int8 NULL
);


-- public.dwh_aa_fact_office_roles_sport definition

-- Drop table

-- DROP TABLE public.dwh_aa_fact_office_roles_sport;

CREATE TABLE public.dwh_aa_fact_office_roles_sport (
	official_code text NULL,
	official_first_name text NULL,
	official_last_name text NULL,
	official_gender text NULL,
	official_desc text NULL,
	official_support_type text NULL,
	branch_name text NULL,
	branch_id int8 NULL,
	association_id int8 NULL,
	association_name text NULL,
	support_request_year int8 NULL
);


-- public.dwh_aa_fact_support_request_sport definition

-- Drop table

-- DROP TABLE public.dwh_aa_fact_support_request_sport;

CREATE TABLE public.dwh_aa_fact_support_request_sport (
	request_type text NULL,
	request_type_filter text NULL,
	support_request_code text NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	request_name text NULL,
	association_id int4 NULL,
	association_name text NULL,
	society_id int8 NULL,
	society_name text NULL,
	team_number int8 NULL,
	team_name text NULL,
	team_code text NULL,
	league_type text NULL,
	league_name text NULL,
	authority_id int8 NULL,
	authority_name text NULL,
	male_cnt int8 NULL,
	female_cnt int8 NULL,
	male_score float8 NULL,
	female_score float8 NULL,
	achievement_score float8 NULL,
	male_achievement_score numeric NULL,
	female_achievement_score numeric NULL,
	professional_score numeric NULL,
	coach_association_score numeric NULL,
	branch_cost_score numeric NULL,
	women_promotion_score numeric NULL,
	excellent_center_score numeric NULL,
	is_pass_professional_condition text NULL,
	is_pass_admin_condition text NULL,
	is_pass_threshold_condition text NULL,
	approved_amount float8 NULL,
	support_request_year int8 NULL
);


-- public.dwh_aa_fact_trainers definition

-- Drop table

-- DROP TABLE public.dwh_aa_fact_trainers;

CREATE TABLE public.dwh_aa_fact_trainers (
	person_code text NULL,
	first_name text NULL,
	last_name text NULL,
	gender text NULL,
	role_desc text NULL,
	branch_name text NULL,
	branch_id int8 NULL,
	association_id int8 NULL,
	association_name text NULL,
	society_id int8 NULL,
	society_name text NULL,
	support_request_year int8 NULL
);


-- public.dwh_aa_fact_trainers_athlete_by_branch definition

-- Drop table

-- DROP TABLE public.dwh_aa_fact_trainers_athlete_by_branch;

CREATE TABLE public.dwh_aa_fact_trainers_athlete_by_branch (
	branch_id int8 NULL,
	branch_name text NULL,
	female_under_18 int8 NULL,
	female_over_18 int8 NULL,
	male_under_18 int8 NULL,
	male_over_18 int8 NULL,
	total_male_athlete int8 NULL,
	total_female_athlete int8 NULL,
	male_trainer_cnt int8 NULL,
	female_trainer_cnt int8 NULL,
	male_instructor_cnt int8 NULL,
	female_instructor_cnt int8 NULL,
	female_national_cnt int8 NULL,
	male_national_trainer_cnt int8 NULL,
	support_request_year int8 NULL
);


-- public.dwh_mt_fact_support definition

-- Drop table

-- DROP TABLE public.dwh_mt_fact_support;

CREATE TABLE public.dwh_mt_fact_support (
	support_request_key text NOT NULL,
	requestor_name text NULL,
	request_number float8 NULL,
	layer_name text NULL,
	office_person_contact_name text NULL,
	new_list_settings_desc text NULL,
	commitment_date timestamp NULL,
	request_contact_name text NULL,
	is_cpa_approval text NULL,
	is_absorbed_by_toto text NULL,
	balance_to_cancel float8 NULL,
	balance_due float8 NULL,
	facility_address text NULL,
	tour_done_by text NULL,
	toto_allowance_id text NULL,
	inspector_name text NULL,
	is_sign float8 NULL,
	material_change_type text NULL,
	tour_status text NULL,
	approved_req_amount float8 NULL,
	allow_anceamount float8 NULL,
	amount_requested float8 NULL,
	"cost" float8 NULL,
	activity_cost float8 NULL,
	status_details text NULL,
	change_details text NULL,
	last_date_to_ascension timestamp NULL,
	tour_date timestamp NULL,
	support_committee_decision_date timestamp NULL,
	toto_allowance_date timestamp NULL,
	ascension_date timestamp NULL,
	approval_cpa_date timestamp NULL,
	receipt_report_date timestamp NULL,
	tax_invoices_received_date timestamp NULL,
	payment_date1 timestamp NULL,
	payment_date2 timestamp NULL,
	payment_date3 timestamp NULL,
	payment_date4 timestamp NULL,
	requested_support_for text NULL,
	milestone_payment1 float8 NULL,
	milestone_payment2 float8 NULL,
	milestone_payment3 float8 NULL,
	milestone_payment4 float8 NULL,
	payments_toto float8 NULL,
	payments_ministry int8 NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL,
	ingestion_timestamp timestamp NULL,
	decl_is_national_priority_area float8 NULL,
	decl_is_national_priority_area_rashut text NULL,
	decl_authority_account_code text NULL,
	decl_authority_account_name text NULL,
	decl_socio_eco_rank_rashut float8 NULL,
	decl_socio_eco_rank float8 NULL,
	decl_is_inactive int8 NULL,
	decl_status_code int8 NULL,
	decl_modified_on_date timestamp NULL,
	decl_ingestion_timestamp timestamp NULL,
	siyur_is_logo_sign text NULL,
	siyur_comments text NULL,
	siyur_siteseeing_doer text NULL,
	siyur_site_type text NULL,
	siyur_siteseeing_status text NULL,
	siyur_layer_name text NULL,
	siyur_contact_handles_id text NULL,
	siyur_support_reciever text NULL,
	siyur_tour_date timestamp NULL,
	siyur_date_tour_book timestamp NULL,
	siyur_is_inactive int8 NULL,
	siyur_status_code int8 NULL,
	siyur_modified_on_date timestamp NULL,
	siyur_ingestion_timestamp timestamp NULL,
	row_hash text NULL,
	dwh_updated_at timestamptz NULL,
	CONSTRAINT pk_dwh_mt_fact_support PRIMARY KEY (support_request_key)
);
CREATE INDEX ix_dwh_mt_fact_support_ingestion_ts ON public.dwh_mt_fact_support USING btree (ingestion_timestamp);
CREATE INDEX ix_dwh_mt_fact_support_request_number ON public.dwh_mt_fact_support USING btree (request_number);


-- public.mng_aigudim_adudut_silver_table definition

-- Drop table

-- DROP TABLE public.mng_aigudim_adudut_silver_table;

CREATE TABLE public.mng_aigudim_adudut_silver_table (
	entity_name text NULL,
	rows_loaded int8 NULL,
	source_file text NULL,
	run_time text NULL,
	duration_seconds float8 NULL,
	status text NULL,
	error_message text NULL,
	last_success_run_ts timestamp NULL,
	last_success_rows int8 NULL
);


-- public.mng_lambda_function definition

-- Drop table

-- DROP TABLE public.mng_lambda_function;

CREATE TABLE public.mng_lambda_function (
	id serial4 NOT NULL,
	function_name text NULL,
	call_order int4 NULL,
	status text NULL,
	last_called_at timestamp(3) NULL,
	error_message text NULL,
	CONSTRAINT mng_lambda_function_pkey PRIMARY KEY (id)
);


-- public.mng_mitkanim_sport_silver_table definition

-- Drop table

-- DROP TABLE public.mng_mitkanim_sport_silver_table;

CREATE TABLE public.mng_mitkanim_sport_silver_table (
	entity_name text NULL,
	rows_loaded int8 NULL,
	source_file text NULL,
	run_time text NULL,
	duration_seconds float8 NULL,
	status text NULL,
	error_message text NULL,
	last_success_run_ts timestamp NULL,
	last_success_rows int8 NULL
);


-- public.mrr_aa_accounts definition

-- Drop table

-- DROP TABLE public.mrr_aa_accounts;

CREATE TABLE public.mrr_aa_accounts (
	association_id int8 NULL,
	association_code text NULL,
	association_name text NULL,
	association_type text NULL,
	provider_num text NULL,
	main_branch_name text NULL,
	main_branch_code text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_budgets definition

-- Drop table

-- DROP TABLE public.mrr_aa_budgets;

CREATE TABLE public.mrr_aa_budgets (
	association_id int8 NULL,
	society_id int8 NULL,
	team_number int8 NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	approved_amount float8 NULL,
	request_type_filter text NULL,
	support_request_year int8 NULL,
	ingestion_timestamp text NULL
);


-- public.mrr_aa_municipalities definition

-- Drop table

-- DROP TABLE public.mrr_aa_municipalities;

CREATE TABLE public.mrr_aa_municipalities (
	authority_name text NULL,
	authority_id int8 NULL,
	lamas_district text NULL,
	municipal_status text NULL,
	council_members_count float8 NULL,
	planning_committee_id int8 NULL,
	planning_committee_name text NULL,
	area_km2 float8 NULL,
	total_population int8 NULL,
	total_israelis int8 NULL,
	jews_others_pct float8 NULL,
	jews_pct float8 NULL,
	arab_pct float8 NULL,
	muslim_pct float8 NULL,
	christian_pct float8 NULL,
	druze_pct float8 NULL,
	total_males int8 NULL,
	total_females int8 NULL,
	population_growth_pct_yoy float8 NULL,
	socioeconomic_cluster float8 NULL,
	socioeconomic_index_value float8 NULL,
	socioeconomic_rank float8 NULL,
	compactness_cluster float8 NULL,
	compactness_index_value float8 NULL,
	compactness_rank float8 NULL,
	peripherality_cluster float8 NULL,
	peripherality_rank float8 NULL,
	ingestion_timestamp text NULL
);


-- public.mrr_aa_new_aa_leagues definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_aa_leagues;

CREATE TABLE public.mrr_aa_new_aa_leagues (
	league_code text NULL,
	league_name text NULL,
	request_support_code text NULL,
	league_type text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_ageforgroups definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_ageforgroups;

CREATE TABLE public.mrr_aa_new_ageforgroups (
	age_group_code text NULL,
	age_group_gender text NULL,
	age_group_from_age float8 NULL,
	age_group_to_age float8 NULL,
	age_group_desc text NULL,
	is_exsist_personal_branch int8 NULL,
	is_exsist_group_branch int8 NULL,
	is_exsist_europe_champ int8 NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_athletesinsupportingrequests definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_athletesinsupportingrequests;

CREATE TABLE public.mrr_aa_new_athletesinsupportingrequests (
	athlete_support_request_code text NOT NULL,
	support_request_code text NULL,
	athlete_code text NULL,
	society_id float8 NULL,
	team_number float8 NULL,
	athlete_gender text NULL,
	athlete_final_score float8 NULL,
	team_code text NULL,
	birth_year int8 NULL,
	athlete_support_first_name text NULL,
	athlete_support_last_name text NULL,
	athlete_support_full_name text NULL,
	identification_type text NULL,
	athlete_age_category text NULL,
	athlete_has_insurance text NULL,
	athlete_has_medical_check text NULL,
	is_pass_threshold_condition text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL,
	CONSTRAINT mrr_aa_new_athletesinsupportingrequests_pkey PRIMARY KEY (athlete_support_request_code)
);


-- public.mrr_aa_new_athletetoachievements definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_athletetoachievements;

CREATE TABLE public.mrr_aa_new_athletetoachievements (
	athlete_per_achievements_code text NULL,
	athlete_per_achievements_id float8 NULL,
	support_request_code text NULL,
	athlete_per_achievements_score float8 NULL,
	athlete_per_achievements_full_name_en text NULL,
	athlete_support_request_code text NULL,
	personal_brancha_chievements_code text NULL,
	athlete_per_achievements_full_name_heb text NULL,
	identification_type text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_branchs definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_branchs;

CREATE TABLE public.mrr_aa_new_branchs (
	branch_id int8 NULL,
	branch_code text NOT NULL,
	branch_name text NULL,
	is_upper_branch int8 NULL,
	personal_or_group text NULL,
	is_thinking_branch int8 NULL,
	is_sub_branch int8 NULL,
	sport_type text NULL,
	is_favorite_branch int8 NULL,
	is_olympic_branch int8 NULL,
	is_special_needs_branch int8 NULL,
	main_branch_name text NULL,
	main_branch_code text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL,
	CONSTRAINT mrr_aa_new_mrr_aa_new_branchs_pkey PRIMARY KEY (branch_code)
);


-- public.mrr_aa_new_branchtoaccounts definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_branchtoaccounts;

CREATE TABLE public.mrr_aa_new_branchtoaccounts (
	branch_to_account_code text NULL,
	branch_to_account_name text NULL,
	association_code text NULL,
	branch_code text NULL,
	personal_or_group_branch text NULL,
	is_include_sub_branch float8 NULL,
	is_special_needs_branch float8 NULL,
	association_name text NULL,
	branch_name text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_europehampionshipforteams definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_europehampionshipforteams;

CREATE TABLE public.mrr_aa_new_europehampionshipforteams (
	europe_champion_team_code text NULL,
	support_request_code text NULL,
	europe_champion_score float8 NULL,
	team_code text NULL,
	age_group_code text NULL,
	society_code text NULL,
	society_id int8 NULL,
	europe_champion_name text NULL,
	europe_champion_team_name_num text NULL,
	europe_competition_date text NULL,
	europe_champion_gender text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_groupialbranchachievementses definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_groupialbranchachievementses;

CREATE TABLE public.mrr_aa_new_groupialbranchachievementses (
	group_branch_achievements_code text NULL,
	support_request_code text NULL,
	age_group_code text NULL,
	group_gender text NULL,
	group_achievements_score float8 NULL,
	request_year int8 NULL,
	branch_code text NULL,
	group_name text NULL,
	branch_name text NULL,
	age_group_name text NULL,
	champion_type text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_localauthorities definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_localauthorities;

CREATE TABLE public.mrr_aa_new_localauthorities (
	authority_id int8 NULL,
	authority_name text NULL,
	district text NULL,
	head_authority_name text NULL,
	authority_code text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_officials definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_officials;

CREATE TABLE public.mrr_aa_new_officials (
	official_code text NULL,
	support_request_code text NULL,
	official_first_name text NULL,
	official_last_name text NULL,
	official_gender text NULL,
	official_desc text NULL,
	official_support_type text NULL,
	identification_type text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_societies definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_societies;

CREATE TABLE public.mrr_aa_new_societies (
	society_id int8 NULL,
	society_code text NULL,
	society_name text NULL,
	authority_code text NULL,
	authority_name text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_societyunions definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_societyunions;

CREATE TABLE public.mrr_aa_new_societyunions (
	society_union_code text NOT NULL,
	society_code text NULL,
	society_id int8 NULL,
	support_request_code text NULL,
	society_name text NULL,
	authority_code text NULL,
	authority_name text NULL,
	is_pass_admin_condition text NULL,
	is_pass_professional_condition text NULL,
	is_pass_threshold_condition text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL,
	CONSTRAINT mrr_aa_new_societyunions_pkey PRIMARY KEY (society_union_code)
);


-- public.mrr_aa_new_supportrequests definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_supportrequests;

CREATE TABLE public.mrr_aa_new_supportrequests (
	support_request_code text NULL,
	association_id int8 NULL,
	branch_code text NULL,
	branch_to_account_code text NULL,
	provider_num text NULL,
	association_code text NULL,
	team_score float8 NULL,
	athlet_score float8 NULL,
	is_special_needs_branch int8 NULL,
	is_upper_branch int8 NULL,
	branch_name text NULL,
	support_request_year int8 NULL,
	assessment_year int8 NULL,
	professional_score float8 NULL,
	coach_association_score float8 NULL,
	branch_cost_score float8 NULL,
	women_promotion_score float8 NULL,
	excellent_center_score float8 NULL,
	achievement_score float8 NULL,
	europe_champ_score float8 NULL,
	facility_usage_score float8 NULL,
	is_pass_professional_condition text NULL,
	is_pass_admin_condition text NULL,
	is_pass_threshold_condition text NULL,
	is_pass_threshold_condition_to_score int8 NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_supportrequests_temp definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_supportrequests_temp;

CREATE TABLE public.mrr_aa_new_supportrequests_temp (
	support_request_code text NULL,
	association_id int8 NULL,
	branch_code text NULL,
	branch_to_account_code text NULL,
	provider_num text NULL,
	association_code text NULL,
	team_score float8 NULL,
	athlet_score float8 NULL,
	is_special_needs_branch int8 NULL,
	is_upper_branch int8 NULL,
	branch_name text NULL,
	support_request_year int8 NULL,
	professional_score float8 NULL,
	coach_association_score float8 NULL,
	branch_cost_score float8 NULL,
	women_promotion_score float8 NULL,
	excellent_center_score float8 NULL,
	achievement_score float8 NULL,
	europe_champ_score float8 NULL,
	facility_usage_score float8 NULL,
	is_pass_professional_condition text NULL,
	is_pass_threshold_condition text NULL,
	is_pass_threshold_condition_to_score int8 NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_teams definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_teams;

CREATE TABLE public.mrr_aa_new_teams (
	team_code text NULL,
	society_code text NULL,
	society_id int8 NULL,
	society_name text NULL,
	team_number int8 NULL,
	team_achievement_score float8 NULL,
	support_request_code text NULL,
	league_code text NULL,
	team_name text NULL,
	authority_code text NULL,
	authority_name text NULL,
	society_union_code text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_aa_new_trainers definition

-- Drop table

-- DROP TABLE public.mrr_aa_new_trainers;

CREATE TABLE public.mrr_aa_new_trainers (
	trainer_code text NULL,
	trainer_first_name text NULL,
	trainer_last_name text NULL,
	trainer_gender text NULL,
	support_request_code text NULL,
	instructor_or_trainer text NULL,
	association_code text NULL,
	association_key text NULL,
	identification_type text NULL,
	society_id int8 NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.mrr_mt_new_declarationsupports definition

-- Drop table

-- DROP TABLE public.mrr_mt_new_declarationsupports;

CREATE TABLE public.mrr_mt_new_declarationsupports (
	request_number_kk int8 NULL,
	is_national_priority_area float8 NULL,
	is_national_priority_area_rashut text NULL,
	authority_account_code text NULL,
	authority_account_name text NULL,
	socio_eco_rank_rashut float8 NULL,
	socio_eco_rank float8 NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL,
	ingestion_timestamp timestamp NULL
);


-- public.mrr_mt_new_facilitiessupports definition

-- Drop table

-- DROP TABLE public.mrr_mt_new_facilitiessupports;

CREATE TABLE public.mrr_mt_new_facilitiessupports (
	requestor_name text NULL,
	request_number float8 NULL,
	layer_name text NULL,
	office_person_contact_name text NULL,
	new_list_settings_desc text NULL,
	commitment_date timestamp NULL,
	request_contact_name text NULL,
	is_cpa_approval text NULL,
	is_absorbed_by_toto text NULL,
	balance_to_cancel float8 NULL,
	balance_due float8 NULL,
	facility_address text NULL,
	tour_done_by text NULL,
	toto_allowance_id text NULL,
	inspector_name text NULL,
	is_sign float8 NULL,
	material_change_type text NULL,
	tour_status text NULL,
	approved_req_amount float8 NULL,
	allow_anceamount float8 NULL,
	amount_requested float8 NULL,
	"cost" float8 NULL,
	activity_cost float8 NULL,
	status_details text NULL,
	change_details text NULL,
	last_date_to_ascension timestamp NULL,
	tour_date timestamp NULL,
	support_committee_decision_date timestamp NULL,
	toto_allowance_date timestamp NULL,
	ascension_date timestamp NULL,
	approval_cpa_date timestamp NULL,
	receipt_report_date timestamp NULL,
	tax_invoices_received_date timestamp NULL,
	payment_date1 timestamp NULL,
	payment_date2 timestamp NULL,
	payment_date3 timestamp NULL,
	payment_date4 timestamp NULL,
	requested_support_for text NULL,
	milestone_payment1 float8 NULL,
	milestone_payment2 float8 NULL,
	milestone_payment3 float8 NULL,
	milestone_payment4 float8 NULL,
	payments_toto float8 NULL,
	payments_ministry int8 NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL,
	ingestion_timestamp timestamp NULL
);


-- public.mrr_mt_new_sightseeings definition

-- Drop table

-- DROP TABLE public.mrr_mt_new_sightseeings;

CREATE TABLE public.mrr_mt_new_sightseeings (
	request_number_siyur int8 NULL,
	is_logo_sign text NULL,
	"comments" text NULL,
	siteseeing_doer text NULL,
	site_type text NULL,
	siteseeing_status text NULL,
	layer_name_siyur text NULL,
	contact_handles_id text NULL,
	support_reciever text NULL,
	tour_date timestamp NULL,
	date_tour_book timestamp NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL,
	ingestion_timestamp timestamp NULL
);


-- public.mt_etl_watermark definition

-- Drop table

-- DROP TABLE public.mt_etl_watermark;

CREATE TABLE public.mt_etl_watermark (
	process_name text NOT NULL,
	last_ts timestamp NOT NULL,
	CONSTRAINT mt_etl_watermark_pkey PRIMARY KEY (process_name)
);


-- public.new_officials definition

-- Drop table

-- DROP TABLE public.new_officials;

CREATE TABLE public.new_officials (
	official_id float8 NULL,
	official_code text NULL,
	support_request_code text NULL,
	official_first_name text NULL,
	official_last_name text NULL,
	official_gender text NULL,
	official_desc text NULL,
	official_support_type text NULL,
	identification_type text NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL
);


-- public.stg_aa_dim_association definition

-- Drop table

-- DROP TABLE public.stg_aa_dim_association;

CREATE TABLE public.stg_aa_dim_association (
	association_id int8 NULL,
	association_name text NULL,
	provider_num text NULL,
	main_branch_name text NULL,
	main_branch_code text NULL
);


-- public.stg_aa_dim_athlete definition

-- Drop table

-- DROP TABLE public.stg_aa_dim_athlete;

CREATE TABLE public.stg_aa_dim_athlete (
	athlete_code text NULL,
	athlete_support_first_name text NULL,
	athlete_support_last_name text NULL,
	athlete_support_full_name text NULL,
	birth_year int8 NULL,
	athlet_age float8 NULL,
	athlete_gender text NULL,
	society_id float8 NULL,
	team_number float8 NULL,
	athlete_final_score float8 NULL,
	athlete_has_insurance text NULL,
	athlete_has_medical_check text NULL,
	is_pass_threshold_condition text NULL,
	athlete_age_category text NULL,
	support_request_year int8 NULL,
	branch_name text NULL,
	branch_id int8 NULL
);


-- public.stg_aa_dim_authority definition

-- Drop table

-- DROP TABLE public.stg_aa_dim_authority;

CREATE TABLE public.stg_aa_dim_authority (
	authority_id int8 NULL,
	key_authority text NULL,
	authority_name text NULL,
	crm_district text NULL,
	head_authority_name text NULL,
	lamas_district text NULL,
	municipal_status text NULL,
	total_population int8 NULL,
	jews_others_pct float8 NULL,
	jews_pct float8 NULL,
	arab_pct float8 NULL,
	muslim_pct float8 NULL,
	christian_pct float8 NULL,
	druze_pct float8 NULL,
	total_males int8 NULL,
	total_females int8 NULL,
	total_israelis int8 NULL,
	socioeconomic_cluster float8 NULL,
	peripherality_cluster float8 NULL
);


-- public.stg_aa_dim_branchs definition

-- Drop table

-- DROP TABLE public.stg_aa_dim_branchs;

CREATE TABLE public.stg_aa_dim_branchs (
	branch_code text NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	is_olympic_branch int8 NULL,
	is_special_needs_branch int8 NULL,
	is_sub_branch int8 NULL,
	branch_type text NULL,
	main_branch_code text NULL,
	main_branch_name text NULL,
	personal_or_group text NULL,
	sport_type text NULL,
	status_code int8 NULL
);


-- public.stg_aa_dim_society definition

-- Drop table

-- DROP TABLE public.stg_aa_dim_society;

CREATE TABLE public.stg_aa_dim_society (
	society_id int8 NULL,
	society_name text NULL,
	authority_code text NULL,
	authority_name text NULL
);


-- public.stg_aa_dim_teams definition

-- Drop table

-- DROP TABLE public.stg_aa_dim_teams;

CREATE TABLE public.stg_aa_dim_teams (
	team_code text NULL,
	team_number int8 NULL,
	team_name text NULL,
	team_achievement_score float8 NULL,
	society_id int8 NULL
);


-- public.stg_aa_dim_trainers definition

-- Drop table

-- DROP TABLE public.stg_aa_dim_trainers;

CREATE TABLE public.stg_aa_dim_trainers (
	id float8 NULL,
	first_name text NULL,
	last_name text NULL,
	gender text NULL,
	"type" text NULL,
	support_request_year int8 NULL
);


-- public.stg_aa_fact_athlete definition

-- Drop table

-- DROP TABLE public.stg_aa_fact_athlete;

CREATE TABLE public.stg_aa_fact_athlete (
	request_type text NULL,
	athlete_code text NULL,
	is_pass_threshold_condition text NULL,
	athlete_gender text NULL,
	age int8 NULL,
	athlete_age_category text NULL,
	athlete_has_insurance text NULL,
	athlete_has_medical_check text NULL,
	athlete_final_score float8 NULL,
	team_code text NULL,
	team_number numeric NULL,
	team_name text NULL,
	league_type text NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	association_id int8 NULL,
	association_name text NULL,
	society_id int8 NULL,
	society_name text NULL,
	authority_id int8 NULL,
	authority_name text NULL,
	key_authority text NULL,
	is_budget_pass_final_threshold text NULL,
	support_request_code text NULL,
	support_request_year int8 NULL
);


-- public.stg_aa_fact_athlete_by_branch_society definition

-- Drop table

-- DROP TABLE public.stg_aa_fact_athlete_by_branch_society;

CREATE TABLE public.stg_aa_fact_athlete_by_branch_society (
	request_type text NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	society_id int8 NULL,
	society_name text NULL,
	authority_id int8 NULL,
	authority_name text NULL,
	female_under_18 int8 NULL,
	female_over_18 int8 NULL,
	male_under_18 int8 NULL,
	male_over_18 int8 NULL,
	male_cnt int8 NULL,
	female_cnt int8 NULL,
	male_score float8 NULL,
	female_score float8 NULL,
	male_teams_over_18 int8 NULL,
	male_teams_under_18 int8 NULL,
	female_teams_over_18 int8 NULL,
	female_teams_under_18 int8 NULL,
	male_teams_cnt int8 NULL,
	female_teams_cnt int8 NULL,
	is_pass_admin_condition text NULL,
	is_pass_professional_condition text NULL,
	support_request_year int8 NULL
);


-- public.stg_aa_fact_office_roles_sport definition

-- Drop table

-- DROP TABLE public.stg_aa_fact_office_roles_sport;

CREATE TABLE public.stg_aa_fact_office_roles_sport (
	official_code text NULL,
	official_first_name text NULL,
	official_last_name text NULL,
	official_gender text NULL,
	official_desc text NULL,
	official_support_type text NULL,
	branch_name text NULL,
	branch_id int8 NULL,
	association_id int8 NULL,
	association_name text NULL,
	support_request_year int8 NULL
);


-- public.stg_aa_fact_support_request_sport definition

-- Drop table

-- DROP TABLE public.stg_aa_fact_support_request_sport;

CREATE TABLE public.stg_aa_fact_support_request_sport (
	request_type text NULL,
	request_type_filter text NULL,
	support_request_code text NULL,
	branch_id int8 NULL,
	branch_name text NULL,
	request_name text NULL,
	association_id int4 NULL,
	association_name text NULL,
	society_id int8 NULL,
	society_name text NULL,
	team_number int8 NULL,
	team_name text NULL,
	team_code text NULL,
	league_type text NULL,
	league_name text NULL,
	authority_id int8 NULL,
	authority_name text NULL,
	male_cnt int8 NULL,
	female_cnt int8 NULL,
	male_score float8 NULL,
	female_score float8 NULL,
	achievement_score float8 NULL,
	male_achievement_score numeric NULL,
	female_achievement_score numeric NULL,
	professional_score numeric NULL,
	coach_association_score numeric NULL,
	branch_cost_score numeric NULL,
	women_promotion_score numeric NULL,
	excellent_center_score numeric NULL,
	is_pass_admin_condition text NULL,
	is_pass_professional_condition text NULL,
	is_pass_threshold_condition text NULL,
	approved_amount float8 NULL,
	support_request_year int8 NULL
);


-- public.stg_aa_fact_trainers definition

-- Drop table

-- DROP TABLE public.stg_aa_fact_trainers;

CREATE TABLE public.stg_aa_fact_trainers (
	person_code text NULL,
	first_name text NULL,
	last_name text NULL,
	gender text NULL,
	role_desc text NULL,
	branch_name text NULL,
	branch_id int8 NULL,
	association_id int8 NULL,
	association_name text NULL,
	society_id int8 NULL,
	society_name text NULL,
	support_request_year int8 NULL
);


-- public.stg_aa_fact_trainers_athlete_by_branch definition

-- Drop table

-- DROP TABLE public.stg_aa_fact_trainers_athlete_by_branch;

CREATE TABLE public.stg_aa_fact_trainers_athlete_by_branch (
	branch_id int8 NULL,
	branch_name text NULL,
	female_under_18 int8 NULL,
	female_over_18 int8 NULL,
	male_under_18 int8 NULL,
	male_over_18 int8 NULL,
	total_male_athlete int8 NULL,
	total_female_athlete int8 NULL,
	male_trainer_cnt int8 NULL,
	female_trainer_cnt int8 NULL,
	male_instructor_cnt int8 NULL,
	female_instructor_cnt int8 NULL,
	female_national_cnt int8 NULL,
	male_national_trainer_cnt int8 NULL,
	support_request_year int8 NULL
);


-- public.stg_mt_fact_support definition

-- Drop table

-- DROP TABLE public.stg_mt_fact_support;

CREATE TABLE public.stg_mt_fact_support (
	requestor_name text NULL,
	request_number float8 NULL,
	layer_name text NULL,
	office_person_contact_name text NULL,
	new_list_settings_desc text NULL,
	commitment_date timestamp NULL,
	request_contact_name text NULL,
	is_cpa_approval text NULL,
	is_absorbed_by_toto text NULL,
	balance_to_cancel float8 NULL,
	balance_due float8 NULL,
	facility_address text NULL,
	tour_done_by text NULL,
	toto_allowance_id text NULL,
	inspector_name text NULL,
	is_sign float8 NULL,
	material_change_type text NULL,
	tour_status text NULL,
	approved_req_amount float8 NULL,
	allow_anceamount float8 NULL,
	amount_requested float8 NULL,
	"cost" float8 NULL,
	activity_cost float8 NULL,
	status_details text NULL,
	change_details text NULL,
	last_date_to_ascension timestamp NULL,
	tour_date timestamp NULL,
	support_committee_decision_date timestamp NULL,
	toto_allowance_date timestamp NULL,
	ascension_date timestamp NULL,
	approval_cpa_date timestamp NULL,
	receipt_report_date timestamp NULL,
	tax_invoices_received_date timestamp NULL,
	payment_date1 timestamp NULL,
	payment_date2 timestamp NULL,
	payment_date3 timestamp NULL,
	payment_date4 timestamp NULL,
	requested_support_for text NULL,
	milestone_payment1 float8 NULL,
	milestone_payment2 float8 NULL,
	milestone_payment3 float8 NULL,
	milestone_payment4 float8 NULL,
	payments_toto float8 NULL,
	payments_ministry int8 NULL,
	is_inactive int8 NULL,
	status_code int8 NULL,
	modified_on_date timestamp NULL,
	ingestion_timestamp timestamp NULL,
	decl_is_national_priority_area float8 NULL,
	decl_is_national_priority_area_rashut text NULL,
	decl_authority_account_code text NULL,
	decl_authority_account_name text NULL,
	decl_socio_eco_rank_rashut float8 NULL,
	decl_socio_eco_rank float8 NULL,
	decl_is_inactive int8 NULL,
	decl_status_code int8 NULL,
	decl_modified_on_date timestamp NULL,
	decl_ingestion_timestamp timestamp NULL,
	siyur_is_logo_sign text NULL,
	siyur_comments text NULL,
	siyur_siteseeing_doer text NULL,
	siyur_site_type text NULL,
	siyur_siteseeing_status text NULL,
	siyur_layer_name text NULL,
	siyur_contact_handles_id text NULL,
	siyur_support_reciever text NULL,
	siyur_tour_date timestamp NULL,
	siyur_date_tour_book timestamp NULL,
	siyur_is_inactive int8 NULL,
	siyur_status_code int8 NULL,
	siyur_modified_on_date timestamp NULL,
	siyur_ingestion_timestamp timestamp NULL
);