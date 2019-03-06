from flask import Flask
from fuzzywuzzy import fuzz
import psycopg2
from psycopg2 import sql
from psycopg2 import extras
from configparser import ConfigParser
from flask import request
import simplejson as json
import ipfsApi
from Crypto.Cipher import AES
from Crypto.Util import Counter
from Crypto import Random
import json
import csv
import binascii
import hashlib


app = Flask(__name__)

# AES supports multiple key sizes: 16 (AES128), 24 (AES192), or 32 (AES256).
key_bytes = 32

# Takes as input a 32-byte key and an arbitrary-length plaintext and returns a
# pair (iv, ciphtertext). "iv" stands for initialization vector.
def encrypt(key, plaintext):
    assert len(key) == key_bytes

    # Choose a random, 16-byte IV.
    iv = Random.new().read(AES.block_size)

    # Convert the IV to a Python integer.
    iv_int = int(binascii.hexlify(iv), 16)

    # Create a new Counter object with IV = iv_int.
    ctr = Counter.new(AES.block_size * 8, initial_value=iv_int)

    # Create AES-CTR cipher.
    aes = AES.new(key, AES.MODE_CTR, counter=ctr)

    # Encrypt and return IV and ciphertext.
    ciphertext = aes.encrypt(plaintext)
    return (iv, ciphertext)

# Takes as input a 32-byte key, a 16-byte IV, and a ciphertext, and outputs the
# corresponding plaintext.
def decrypt(key, iv, ciphertext):
    assert len(key) == key_bytes

    # Initialize counter for decryption. iv should be the same as the output of
    # encrypt().
    iv_int = int(iv.encode('hex'), 16)
    ctr = Counter.new(AES.block_size * 8, initial_value=iv_int)

    # Create AES-CTR cipher.
    aes = AES.new(key, AES.MODE_CTR, counter=ctr)

    # Decrypt and return the plaintext.
    plaintext = aes.decrypt(ciphertext)
    return plaintext


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
    # print (rows)
    return rows

def get_all_hits (conn,hitList):

    selectQuery = "SELECT id,name,description,delivery_method,access_url,num_of_records,search_terms,parameters," + \
            "country,state_province,price_low,price_high,json_schema,date_created,date_modified " + \
            " FROM marketplace.data_source_detail WHERE id in ({}) "


    query = sql.SQL (selectQuery).format(sql.SQL(', ').join(sql.Placeholder()*len(hitList)))

    print (hitList);
    # print (query.as_string(conn))
    # make return result in dictionary
    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute (query, hitList)
    rows = cursor.fetchall()
    #print (rows)
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
    if terms is not None:
        terms = terms.lower()

    country = request.args.get('country')
    if country is not None:
        country = country.lower()

    region = request.args.get('region')
    if region is not None:
        region = region.lower()

    result = None
    connection = None

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
            # print (result)


    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
        return "DB error", 500
    finally:
        if connection:
            connection.close()

    return json.dumps(result, indent=4, sort_keys=False, default=str)


def deliver_sample_data (conn,table,id,limit,output):

    #get published field names
    selectQuery = "select field_name from marketplace.source_of_field where source_id = " + put_quotes(id)

    cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cursor.execute(selectQuery)
    rows = cursor.fetchall()
    cols = [ x['field_name'] for x in rows ]

    #32 bytes encryption keys
    selectQuery = "select enc_data_key from marketplace.data_source_detail where id = " + put_quotes(id)

    cursor.execute(selectQuery, id)
    row = cursor.fetchone()
    cypherKey = hashlib.sha256(row['enc_data_key'].encode('utf-8')).hexdigest()[:32]
    print ("key = %s" % cypherKey)

    selectQuery = "select {} from cherre_sample_data.%s " % table  + "limit %s" % limit
    print (selectQuery)
    limitQuery = sql.SQL(selectQuery).format(sql.SQL(', ').join(map(sql.Identifier, cols)))
    print (limitQuery.as_string(conn))
    cursor.execute(limitQuery)
    rows = cursor.fetchall()

    #encrypting all values
    results = [{}]
    for row in rows:
        encryptedObj = {}
        for k, v in row.items():
            encryptedObj[k] =  encrypt(cypherKey,str(v).encode('utf-8'))
        results.append(encryptedObj)

    # print (results)
    jsonString = json.dumps(results, indent=4, sort_keys=False, default=str)

    outFileName = "/tmp/%s.%s" % (id, output)
    print (outFileName)
    outFile = open(outFileName, "w")
    if output == "json":
        outFile.write (jsonString)
    else:
        csvWriter = csv.DictWriter(outFile,fieldnames=cols)
        csvWriter.writeheader()
        for row in results:
            csvWriter.writerow (row)

    outFile.close()

    #put the file out to ipfs throug Infura service
    api = ipfsApi.Client('https://ipfs.infura.io', 5001)
    res = api.add(outFileName)

    #return ipfs Hash
    return res[0]['Hash']


@app.route('/sample/<tbl>/<ds_id>')
def getData(tbl,ds_id):
    limit=request.args.get('limit')
    outputFormat=request.args.get('format')

    # set defaul
    if limit is None:
        limit = 500
    if outputFormat is None:
        outputFormat = 'json'

    try:
        params = config()
        connection = psycopg2.connect(**params)
        connection.set_client_encoding('UTF8')
        rootHash = deliver_sample_data (connection,tbl,ds_id,limit,outputFormat)
        print(rootHash)
        return rootHash

    except (Exception, psycopg2.DatabaseError) as error:
        print(error)
        return "DB error", 500

    finally:
        if (connection):
            connection.close()


if __name__ == '__main__':
    app.run()
