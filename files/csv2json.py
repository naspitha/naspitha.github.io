# -*- coding: utf-8 -*-
"""
Convert CSV to json
"""
import csv
import json

csv_file = 'japaneseWordSet.csv'
json_file = 'japaneseWordSet.json'
json_dictionary = {}

with open(csv_file, mode='r', encoding='utf-8') as csv_file:
    csvfiledata = csv.DictReader(csv_file)
    json_dictionary['data'] = []
    for r, row_data in enumerate(csvfiledata):
        fixed_data = {'Kana' if k == '\ufeffKana' else k:v for k,v in row_data.items()}
        word = fixed_data
        s = "-".join([word["Kana"], word["English"][:15], word["Category"]])
        swaps = [("{", "X"), ("}", "X"), ("/", "L")]
        for old, new in swaps:
            s = s.replace(old, new)
        fixed_data['id']=s
        # print(fixed_data)
        json_dictionary['data'].append(fixed_data)
# print(json_dictionary)
with open(json_file, 'w') as json_file:
    json_file.write(json.dumps(json_dictionary, indent=4))

    