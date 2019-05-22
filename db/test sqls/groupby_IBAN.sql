SELECT Partner_IBAN,Class1, Class2, Own_Transfer, SUM(Value) 
FROM Statements 
GROUP BY Partner_IBAN, Class1, Class2, Own_Transfer
ORDER BY 5 ASC