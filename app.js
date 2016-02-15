var request = require("request");
var util = require("util");
var path = require("path");
var fs = require("fs");
var JSONStream = require('JSONStream');
var es = require('event-stream')

var registryUrl = process.argv[2];
var moduleName = process.argv[3];

if (moduleName) {
    processModule(moduleName);
} else {
    var stream = request(registryUrl + "/_all_docs")
	.pipe(JSONStream.parse(['rows', true, 'id']))
	.pipe(es.mapSync(function (moduleName) {
	    if (moduleName === "_updated" || moduleName.indexOf('/') !== -1) return;
	    try {
		processModule(moduleName);
	    } catch (e) {
		console.log("i guess it failed...?")
	    }
	}))

    
    stream.on('error',function(err){
	console.error(err);
	setTimeout(function() {
	    console.log('sleeping for a while!');
	}, 60*1000);
    })
}

function processModule(moduleName) {
    if (!fs.existsSync(path.join("storage", moduleName))) {
        fs.mkdirSync(path.join("storage", moduleName));
	
	request(registryUrl + moduleName, function (error, response, body) {
	    
            if (error) {
		console.log("failed here...")
		console.log(error)
		return;
		//return handleError(error);
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
	});	
    } else {
	console.log(moduleName + " already exists")
    }
}
