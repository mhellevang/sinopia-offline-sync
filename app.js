var request = require("request");
var util = require("util");
var path = require("path");
var fs = require("fs");
var JSONStream = require('JSONStream');
var es = require('event-stream');
var async = require('async');

var registryUrl = process.argv[2];
var moduleName = process.argv[3];
var ids = [];

try {
    main(function () {
	process.exit(0);
    });
} catch (e) {
    console.error("Main failed: ", e);
    process.exit(1);
}
    
function main(done) {
    if (moduleName) {
	processModule(moduleName, function () {} );
    } else {
	var i = 0;
	var stream = request(registryUrl + "/_all_docs")
	    .pipe(JSONStream.parse(['rows', true, 'id']))
	    .pipe(es.mapSync(function (moduleName) {
		if (moduleName === "_updated" || moduleName.indexOf('/') !== -1) return;
		ids.push(moduleName)
		i++;
		
		if (i % 100 === 0) {
		    console.log("Parsed " + i);
		}
	    }));
	
	console.log("Parsed " + i);
	
	stream.on('error',function(err){
	    console.error(err);
	});
        
	stream.on('end', () => {
	    async.eachLimit(ids, 10, function (id, callback) {
		processModule(id, callback);
	    }, function (err) {
		if (err) {
		    console.log("errr...")
		} else {
		    console.log('Well done :-)!');
		    done();
		}
	    });
	    
	});
    }
   
}

function processModule(moduleName, callback) {
    if (!fs.existsSync(path.join("storage", moduleName))) {
	   fs.mkdirSync(path.join("storage", moduleName));
    }
    if (fs.readdirSync(path.join("storage", moduleName)).length <= 1) {
	try {
	    request(registryUrl + moduleName, function (error, response, body) {

		console.log("Requesting " + moduleName)
		
		if (error) {
		    console.log(error);
		    console.log("Request " + moduleName + " failed. Ignore and continue...");
		    callback();
		    return;
		}
		
		var module = JSON.parse(body);
		
		var packageJson = {
		    // standard things
		    name: module.name,
		    versions: module.versions,
		    "dist-tags": module["dist-tags"],
		    
		    // our own object
		    _distfiles: {},
		    _attachments: {},
		    _uplinks: {}
		};
		
		for (versionNumber in packageJson.versions) {
		    var version = module.versions[versionNumber];
		    
		    delete version.publishConfig;
		    delete version.repository;
		    
		    var tarballUrl = version.dist.tarball;
		    var shasum = version.dist.shasum;
		    
		    version._shasum = shasum;
		    
		    var filename = path.basename(tarballUrl);
		    packageJson._attachments[filename] = { shasum: shasum, version: version.version };
		    request(tarballUrl).pipe(fs.createWriteStream(path.join("storage", moduleName, filename)));
		    version.dist.tarball = tarballUrl.replace(registryUrl, "/");

		}

		fs.writeFileSync(path.join("storage", moduleName, "package.json"), JSON.stringify(packageJson, null, "        "));
		console.log(module.name + " written")

		// Cleanup
		delete packageJson;
		delete module;

		callback();
		return;
	    });
	} catch (e) {
	    console.log("i guess it failed...?")
	    callback();

	}
	
    } else {
	console.log(moduleName + " already exists")
	async.setImmediate(function () {
	    callback();
	});
    }
}
