import os      # for files
import tqdm    # nice progress bars
import csv     # csv file handling
import sys
import codecs  # because text file encoding is an issue in 2018
import sqlite3 # database!
import pandas as pd # for analytics purpose
import json
from datetime import datetime, date #time

def pprint(in_2dstructure, in_rows=5):
    df = pd.DataFrame(in_2dstructure)
    pd.set_option('max_colwidth',400)
    print(df[:in_rows])

def get_wildcards(input_dict, lvl2class):
    for lvl1_key, lvl1_values in input_dict.items():
        for lvl2_key, lvl2_values in lvl1_values.items():
            if lvl2_key == lvl2class:
                ret = []
                for wildcard in lvl2_values['text']:
                    ret.append(wildcard)
                return ret

def get_wildcard_matches(c, in_wildcards):
    t = in_wildcards
    query = F"SELECT ID, Value, text FROM Statements WHERE "+'OR '.join(['text LIKE ? ' for x in in_wildcards])+'ORDER BY Value ASC'
    c.execute(query, t)
    data = c.fetchall()
    return data

def update_db_classification(c, lvl1, lvl2, statements, own_transfer=0):
    t = []
    for statement in statements:
        t.append((lvl1,lvl2,own_transfer,statement[0]))
    
    c.executemany('UPDATE Statements SET Class1=?, Class2=?, Own_Transfer=? WHERE ID = ?', t)

def classify_statements():
    # get db conn
    conn = sqlite3.connect('../db/statements_live.db')
    c = conn.cursor()

    # get data json
    try:
        json1_file = open('data/classification_live.json', encoding='utf-8-sig')
        json1_str = json1_file.read()
        classification = json.loads(json1_str)
        class_dict = classification['grouping']
    except:
        print("Unexpected error:", sys.exc_info()[0])
        return

    for l1key,l1val in class_dict.items():
        lvl1_class = l1key
        print(F' ---- Level 1 {lvl1_class}')
        for l2key,l2val in l1val.items():
            lvl2_class = l2key
            t = get_wildcards(class_dict, lvl2_class)
            wildcards = []
            for x in t:
                wildcards.append(F'%{x}%')

            print(F' -------- Level 2 {lvl2_class} - wildcards {wildcards}')
            statements=get_wildcard_matches(c, wildcards)
            pprint(statements,2)
            update_db_classification(c, lvl1_class, lvl2_class, statements)
    print(F'\n--------------- DONE ---------------\n')   
    classify_own_transfers(c, classification['own_transfer'])
    conn.commit()
    conn.close()  

def classify_own_transfers(c, keywords):
    c.execute('SELECT ID_Account,IBAN FROM Accounts')
    accounts = c.fetchall()
    t = []
    l1txt = 'own transfer'
    l2txt = 'own transfer'
    for account in accounts:
        t.append((l1txt, l2txt, account[0], account[1]))
        
    print(F' ---- Own Statements {t}')
    c.executemany('UPDATE Statements SET Class1=?, Class2=?, Own_Transfer=? WHERE partner_IBAN = ?',t)
    
    ## Hack für alte Überträge ohne IBAN :(
    
    for keyword,value in keywords.items():
        print(F' -------- {keyword} - {value}')
        t = (f'%{keyword}%',)
        c.execute('SELECT ID FROM Statements WHERE text LIKE ?', t)
        statements = c.fetchall()
        pprint(statements,2)
        update_db_classification(c, l1txt, l2txt, statements, value) # 1 means true

    print(F'\n--------------- DONE ---------------\n')   