-- Numbers used on the résumé and the site. Run in Spare's Metabase (DuckDB).
-- Last run 2026-11-14, data through 2026-11-12: 11,493,580 transactions, 138,303 users (the students who paid; the
-- 92,240 account holders who own them are parents, 1.6 children each), 254 merchants, 10 countries,
-- 1,272 devices that took a transaction (1,763 marked active in machines).
with l as (select * from general_transaction_ledger where timestamp >= timestamp '2024-03-01')
select
  (select max(timestamp) from general_transaction_ledger) as data_through,
  count(*)                   as transactions,
  count(distinct userID)     as users,
  count(distinct merchantID) as merchants,
  count(distinct machineID)  as devices
from l;

-- Breakdown by type (sale, top-up, return, cash out).
select t.type_name, count(*) as n
from general_transaction_ledger g
left join xutils_general_transaction_ledger_types t
  on g.debitAccountID = t.debit_account_id and g.creditAccountID = t.credit_account_id
where g.timestamp >= timestamp '2024-03-01'
group by 1 order by 2 desc;

-- Users (students who paid), parents and countries, same window. Countries come from each paying school's currency (or time zone):
-- UAE, Egypt, Bahrain, Angola, Kuwait, Libya, Bahamas, Qatar, Spain, Oman.
with l as (select * from general_transaction_ledger where timestamp >= timestamp '2024-03-01' and timestamp < timestamp '2026-11-13')
select
  count(distinct childID) as users,
  count(distinct userID)  as parents,
  (select count(distinct coalesce(c.countryCode, tz.country))
     from organizations o join (select distinct organizationID from l) x using (organizationID)
     left join currency c on c.currencyID = o.currencyID
     left join time_zone tz on tz.timeZoneID = o.timeZoneID) as countries
from l;
