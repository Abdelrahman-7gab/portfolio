-- Numbers used on the résumé and the site. Run in Spare's Metabase (DuckDB).
-- Last run 2026-11-13, data through 2026-11-12: 11,493,580 transactions, 92,240 users,
-- 254 merchants, 1,272 devices that took a transaction (1,763 marked active in machines).
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
