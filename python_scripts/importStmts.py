import os      # for files
import tqdm    # nice progress bars
import csv     # csv file handling
import codecs  # because text file encoding is an issue in 2018
import sqlite3 # database!
from datetime import datetime, date #time

conn = sqlite3.connect('../db/statements_live.db')
c = conn.cursor()


import_dir = "../import"
to_be_import_files = os.listdir(import_dir) # returns list
print(F"Files for import:\n{to_be_import_files}\n")
import_files = []
    
for file in to_be_import_files:
    # query if the "Files" table has entries for this filenames
    accName = file.split("_")[0]    
    t = (accName,)
    c.execute('SELECT ID_Account FROM Accounts WHERE IBAN = ?', t)
    data = c.fetchone()
    # if yes, add the to "import_files to be imported", if NO write out a warning
    if data is None:
        print(F'WARNING {accName} NOT FOUND IN TABLE "Accounts" - file names must begin with IBAN then underscore')
    else:       
        print(F'FOUND {accName} Account ID {data[0]}')       
        import_dict = { 'file' : file, 'accountID' : data[0] }
        import_files.append(import_dict)



print(F"Starting to import to SQLLite for {import_files}\n")
log_entries = []

for file_dict in import_files:
    file = file_dict["file"]
    accountID = file_dict["accountID"]
    import_file = import_dir+"/"+file
    print("File: ",import_file)
    with codecs.open(import_file, 'rU', 'utf-16') as handle:
        reader = csv.DictReader(handle, delimiter=";", quotechar='"')
        
        #get linecount
        num_lines = sum(1 for line in open(import_file))
        #remove header & footer
        num_lines -= 2    
        
        warningCount = 0
        insertCount = 0
        
        cashSum = 0.0
        
        for line in tqdm.tqdm(reader, total=num_lines):
            dateObj = line['Buchungsdatum'].split(".")
            normalDate = F'{dateObj[2]}-{dateObj[1]}-{dateObj[0]}'
            cash = float(line['Betrag'].replace(".","").replace(",","."))
            cashSum += cash

            # legacy compliance --> Buchungs-Info war früher Buchungstext..

            buchungsinfo = "" 
            buchungsinfo_old = ""
            buchungsreferenz = ""

            try:
                buchungsinfo = line['Buchungs-Info']
                buchungsreferenz = line['Buchungsreferenz']
            except:
                pass

            try: 
                buchungsinfo_old = line['Buchungstext']
            except:
                pass

            if (len(buchungsinfo) < len(buchungsinfo_old)):
                buchungsinfo = buchungsinfo_old            

            t = (normalDate, dateObj[2], dateObj[1], dateObj[0], cash,buchungsinfo, line['Partner IBAN'], line['Partner BIC'], line['Partnername'], accountID, buchungsreferenz)
            c.execute('SELECT ID FROM Statements WHERE date_full=? AND dat_year=? AND dat_month=? AND dat_day = ? AND Value = ? AND text = ? AND partner_IBAN = ? AND partner_BIC = ? AND Partnername = ? AND ID_Account = ? AND ReferenceID = ?', t)
            data = c.fetchone()
            
            if data is not None:
                #statement already inserted, abort & warn
                warningCount += 1
                log_id = data[0]
                log_text = F"ID: {log_id} already has info of {line}"
                log_entries.append(log_text)
                log_entry = (log_id, log_text, datetime.now())
                c.execute('INSERT INTO Statements_Log (ID, Text, Timestamp) VALUES (?,?,?)', log_entry)
            else:     
                #just insert the new line
                insertCount += 1
                c.execute('INSERT INTO Statements (date_full, dat_year, dat_month, dat_day, Value, text, partner_IBAN, partner_BIC, Partnername, ID_Account, ReferenceID) VALUES (?,?,?,?,?,?,?,?,?,?,?)',t)
        print(F'INSERTED {insertCount}')
        if warningCount > 0:
            print(F'SKIPPED {warningCount} (check log for details)')
        print(F"Total Cash Sum of file: {cashSum:.2f}\n\n")
        
    conn.commit()