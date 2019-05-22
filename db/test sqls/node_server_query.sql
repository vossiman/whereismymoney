select ifnull(Class1, 'No category lvl1') as source, ifnull(Class2, 'No category lvl2') as target, CAST(Sum(ABS(Value)) as INT) as value
              from Statements
              WHERE ((OWN_TRANSFER is null) 
              OR (OWN_TRANSFER <= 0))
              AND dat_year = 2018
              AND Value < 0
              GROUP BY 1, 2
              ORDER BY 1 ASC, 2 ASC