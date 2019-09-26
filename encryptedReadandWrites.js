module.exports = {
    writeOne: (collection, doc) => {
        collection.insertOne(doc)
        .then((writeResult) => {
            console.log('writeResult: \t\t\t', writeResult);
        })
        .catch((writeError) => {
            console.log('writeError occurred: \t\t\t', writeError);
        })
    },
    readOne: (collection, filter) => {
        collection.find(filter).toArray()
        .then((readResult) => {
            console.log('readResult: \t\t\t', readResult);
        })
        .catch((readError) => {
            console.log('readError occurred: \t\t\t', readError);
        })
    }
}