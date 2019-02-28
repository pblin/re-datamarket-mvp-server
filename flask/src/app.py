from flask import Flask
from fuzzywuzzy import fuzz
import psycopg2
from psycopg2 import sql
import sys
from ast import literal_eval
from configparser import ConfigParser
from flask import request
import simplejson as json

app = Flask(__name__)


def config(filename='.database.ini', section='postgresql'):
    # create a parser
    parser = ConfigParser()

    # read config file
    parser.read(filename)

    # get section, default to postgresql
    db = {}
    if parser.has_section(section):
        params = parser.items(section)
        for param in params:
            db[param[0]] = param[1]
    else:
        raise Exception('Section {0} not found in the {1} file'.format(section, filename))

    return db

def put_quotes (s):
    quote = "'"
    return quote + s + quote

def get_all_data_fields (conn,region,country):
    cursor = conn.cursor()
    query = 'SELECT source_id,field_label,search_terms from marketplace.source_of_field '

    if region is not None or country is not None:
        query += "WHERE "
        if region is not None:
            query += "region = " + put_quotes(region)

            if country is not None:
                query += " AND country = " + put_quotes(country)

        else:
            query += "country = " + put_quotes(country)

    cursor.execute (query)
    rows = cursor.fetchall()
    conn.commit()
    return rows

def get_all_hits (conn,hitList):
    cursor = conn.cursor()
    query = "SELECT id,name,description,delivery_method,access_url,num_of_records,search_terms,parameters," + \
            "country,state_province,price_low,price_high,json_schema,date_created,date_modified " + \
            " FROM marketplace.data_source_detail WHERE id in "

    itemStr = ""
    itemLen = len(hitList)
    for i in range (itemLen-1):
        itemStr += put_quotes(hitList[i]) + ","
    itemStr += put_quotes ( hitList[itemLen-1])
    query += "(" + itemStr + ")"

    print (query)
    cursor.execute (query)
    rows = cursor.fetchall()
    conn.commit()
    return rows

def prob (s1, aList):
    if aList is not None:
        for s2 in aList:
            if fuzz.WRatio (s1,s2) > 60:
                return 1
            else:
                return 0
    else:
        return 0

@app.route('/search')
def search():
    terms = request.args.get('terms')
    country = request.args.get('country')
    region = request.args.get('region')
    result = None
    try:
        params = config()
        connection = psycopg2.connect(**params)
        connection.set_client_encoding('UTF8')
        dataCollections = get_all_data_fields(connection,region,country)
        hits = []
        for data in dataCollections:
            if fuzz.WRatio(terms, data[1]) > 60 or prob(terms,data[2]) > 0:
                if data[0] not in hits:
                    hits.append(data[0])

        if len(hits) > 0:
            result = get_all_hits(connection,hits)


    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
        return "DB error", 500
    finally:
        if (connection):
            connection.close()

    return json.dumps(result, indent=4, sort_keys=True, default=str)

if __name__ == '__main__':
    app.run()
