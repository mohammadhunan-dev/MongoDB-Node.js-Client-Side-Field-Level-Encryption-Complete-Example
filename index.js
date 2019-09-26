const mongodb = require('mongodb');
const { ClientEncryption } = require('mongodb-client-encryption')(mongodb);
const writeOne = require('./encryptedReadandWrites').writeOne;
const readOne = require('./encryptedReadandWrites').readOne;

const { MongoClient } = mongodb;
const dotenv = require('dotenv');
dotenv.config();

// SETUP:
const keyVaultNamespace = "admin.datakeys";
const kmsProviders = {
    aws: {
        accessKeyId: process.env.AWS_KMS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_KMS_SECRET_ACCESS_KEY,
    }
}
const mongoVars = {
    dbName: "nodecsfleexample_db",
    collectionName: "patients"
}


// CREATE CLIENT FOR CREATING DATAKEYS:
const client = new MongoClient(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

client.connect()
.then((clientConnection)=>{
    const encryption = new ClientEncryption(client, {
        keyVaultNamespace,
        kmsProviders
    });

    encryption.createDataKey('aws', {
        masterKey: { key: process.env.KMS_ARN, region: 'us-east-1' },
        keyAltNames: ['key1']
    })
    .then((key) => {
        const dataNamespace = `${mongoVars.dbName}.${mongoVars.collectionName}`;
        const patientSchema = {
          [dataNamespace]: {
            bsonType: 'object',
            encryptMetadata: {
                keyId: [key]
            },
            properties: {
              insurance: {
                bsonType: "object",
                properties: {
                  policyNumber: {
                    encrypt: {
                      bsonType: "int",
                      algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
                    }
                  }
                }
              },
              medicalRecords: {
                encrypt: {
                    bsonType: "array",
                    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
                }
              },
              bloodType: {
                encrypt: {
                    bsonType: "string",
                    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
                }
              },
              ssn: {
                encrypt: {
                  bsonType: 'int',
                  algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic',
                }
              },
              mobile: {
                encrypt: {
                  bsonType: 'string',
                  algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random',
                }
              }
            }
          }
        }; //end of patientSchema
        const secureClient = new MongoClient(process.env.MONGO_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            monitorCommands: true,
            autoEncryption: { keyVaultNamespace, kmsProviders, schemaMap: patientSchema }
        });
        secureClient.connect()
        .then((secureClientConnection) => {
            console.log('connected via secureClient');
            const db = secureClientConnection.db(mongoVars.dbName);
            db.dropCollection(mongoVars.collectionName)
            .then((dropResult) => {
              console.log("dbDropped", dropResult)
            })
            .catch((dropError) => {
              console.log('dropError: \t\t\t', dropError);
            })
            const coll = db.collection(mongoVars.collectionName);
            const doc = {
                name: 'Jon Doe',
                ssn: 901010001,
                bloodType: "a-",
                medicalRecords: [{ weight: 180}],
                insurance: {
                    policyNumber: 1223,
                    provider: 'Maest Care'
                }
              };
            
            writeOne(coll,doc);
            readOne(coll, { ssn: 901010001})


        })
        .catch((secureClientConnectionError) => {
            console.log('secureClientConnectionError occurred: \t', secureClientConnectionError);
        })
    })
    .catch((createDataKeyError) => {
        console.log('createDataKeyError occurred: \t\t\t', createDataKeyError);
    })
})
.catch((clientConnectionError) => {
    console.log('clientConnectionError occurred: \t\t\t', clientConnectionError);
})