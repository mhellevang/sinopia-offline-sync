sinopia-offline-sync
===================

The code generates package.json files for all packages in a central registry into a format compatible with the Sinopia registry. No tarballs will be written, but you'll have a complete collection of available packages.

The project is based on code posted by perfectsquircle [here](https://github.com/rlidwka/sinopia/issues/79). I modified it to use streams instead of parsing the whole json file in memory, and to fetch data in a sequential manner instead of opening a hundred thousand requests at the same time.