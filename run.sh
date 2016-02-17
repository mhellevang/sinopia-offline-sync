node --max-old-space-size=6144 app.js https://skimdb.npmjs.com/registry/
while [ $? -ne 0 ]; do
    node --max-old-space-size=6144 app.js https://skimdb.npmjs.com/registry/
done
