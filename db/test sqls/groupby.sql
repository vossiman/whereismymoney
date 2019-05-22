SELECT Own_Transfer, Class1, Class2, SUM(Value) 
FROM Statements 

GROUP BY Class1, Class2, Own_Transfer
