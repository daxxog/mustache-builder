/* mustache-builder
 * mustache powered JavaScript building!
 * (c) 2012 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 */

var fs = require('fs'), //import filesystem
    path = require('path'), //import path tools
    temp = require('temp'), //import temporary filesystem
    mu = require('mu2'), //import mustache
    UglifyJS = require('uglify-js2'); //import UglifyJS2

//fs.exists support for older node versions
if(typeof fs.exists != 'function') {
    fs.exists = path.exists;
}
if(typeof fs.existsSync != 'function') {
    fs.existsSync = path.existsSync;
}

//the stache object, holds all our stachieness
var stache = {};

//script version
stache.version = 
    "0.1.3"
;

//help file
stache.help = 
    "mustache-builder v" + stache.version
+"\n"+
    "===================================="
+"\n_\n"+
    "Usage: "
+"\n"+
    "   stache {input-filename}"
+"\n_\n"+
    "   stache {input-filename} --output {output-filename}"
+"\n"+
    "   == Output to {output-filename} instead of STDOUT"
+"\n_\n"+
    "   stache -o"
+"\n"+
    "   == Same as stache --output"
+"\n_\n"+
    "   stache --auto"
+"\n"+
    "   == Auto magic file name"
+"\n_\n"+
    "   stache --tag"
+"\n"+
    "   == Scan for the tag directory for imports"
+"\n_\n"+
    "   stache --test"
+"\n"+
    "   == Run the unit test"
+"\n_\n"+
    "   stache --help"
+"\n"+
    "   == Display this page"
+"\n_\n"+
    "   stache {input-filename} --nominify"
+"\n"+
    "   == Do not minify the output"
; stache.didhelp = false; //flag that says we showed the help file

//file that contains stache arguments
stache.argvfn = './sta.che';

//flag that says we found the argument file and are using it
stache.foundargvfile = false;

//the JavaScript source filename
stache.js = false;

//auto magic file name
stache.autofn = "";

//use auto magic file name flag
stache.useauto = false;

//directory containing JavaScript files to be imported as tags
stache.tagdir = './tags';

//tag imports in one string
stache.tagstr = '';

//use tag imports falg
stache.usetags = false;

//mustache view rules {{flags}}
stache.view = {};

//command line arg flags
stache.test = false;
stache.minify = true;

//strings that hold compiled and minified versions of the JavaScript source
stache.compiled = '';
stache.minified = '';

stache.fout = false; //the file name for output
stache.out = ""; //the output

stache._ = {}; //temp global space

stache.log = function(str) { //stylized logging function
    console.log('stache: ' + str);
};

stache.argvloop = function (val, i, argv) { //argument loop
    if(!(i === 0 || i == 1)) { //if not the first or second argument
        switch(val) { //try and find command line options
            case '--help':
                    console.log(stache.help); //show the help file
                    stache.didhelp = true; //flag that we showed the help file
                break;
            case '--test':
                    stache.js = __dirname + '/test.js'; //set the input file to 'test.js'
                    stache.test = true; //flag that we are testing
                break;
            case '--nominify':
                    stache.minify = false; //flag that we don't want to minify output
                break;
            case '--output': //same as -o
                    stache.fout = i + 1; //set fout to one step in the future
                break;
            case '-o': //same as --output
                    stache.fout = i + 1; //set fout to one step in the future
                break;
            case '--tag': //use imported tags
                    fs.readdirSync(stache.tagdir).forEach(function (val, i, array) {
                        stache.log('found tag ' + val);
                        var tag = val.replace('.js', ''); //find the name of the tag
                        stache.tagstr += '\n{{#' + tag + '}}\n' + fs.readFileSync(path.join(stache.tagdir, val)) + '\n{{/' + tag + '}}\n'; //append the tag to the tag string
                    });
                    stache.usetags = true; //flag that we are using imported tags
                break;
            default: //no command line options found, continue with other checks
                    if(i === stache.fout) { //check if we need to set fout
                        if(val == '--auto') {
                            stache.useauto = true; //using auto magic file name
                        } else {
                            stache.fout = val; //set fout
                        }
                    } else if((function (filename) { //inline function to find file extension
                        var i = filename.lastIndexOf('.');
                        return (i < 0) ? '' : filename.substr(i+1);
                    }(val))=='js') { //if file extension == 'js'
                        stache.js = val; //set the source name
                    } else {
                        stache.view[val] = true; //if all else fails, we must be passing a flag
                        stache.autofn += '-' + val; //append flag to auto magic file name
                    }
                break;
        }
    }
    
    if(i==argv.length-1) { //if we are at the end of the loop
        if(stache.js !== false) { //if the source name is set
            if(stache.usetags) { //if we are importing tags
                var _stachejs = temp.openSync('stache.js'), //create a temp file
                    _fd = _stachejs.fd;
                
                fs.writeSync(_fd, stache.tagstr + fs.readFileSync(stache.js, 'utf-8')); //write the tags + stache.js data to the temp file
                fs.closeSync(_fd); //close the temp file
                
                stache.js = _stachejs.path; //set the stache.js path to the temp file path
            }
            
            (mu.compileAndRender(stache.js, stache.view)).addListener('data', function (data) { //compile and render using mustache
                stache.compiled += data.toString(); //add the data from the input stream to the compiled string
            }).addListener('end', function () { //at the end of the input stream
                stache.minified = UglifyJS.minify(stache.compiled, {fromString: true}).code; //minify using UglifyJS2
                
                if(stache.test) { //if we are testing
                    eval(stache.minified); //evaluate the test    
                } else if(stache.minify === true) { //if we want it minified
                    stache.out = stache.minified; //output the minified version
                } else {
                    stache.out = stache.compiled; //output the compiled version
                }
                
                if(stache.fout === false) { //if we are not sending output to a file
                    if(stache.test) { //if we are testing
                        stache.log(stache.out); //make it look pretty
                    } else {
                        console.log(stache.out); //send it to STDOUT
                    }
                } else {
                    if(stache.useauto) { //if we are using auto magic file names
                        stache.fout = stache.js.replace('.js', stache.autofn + (stache.minify ? '.min' : '') + '.js'); //make the magic happen
                    }
                    fs.writeFile(stache.fout, stache.out, function(err) { //write the output to a file
                        if(err) { //error!
                            console.log(err); //say what the error is
                        } else {
                            stache.log(stache.fout + ' built'); //file output success!
                        }
                    });
                }
            });
        } else if(!stache.didhelp) { //if no input files and did not show help
            fs.exists(stache.argvfn, function (exists) {
                if(exists && !stache.foundargvfile) { //if stache.argvfn exists and we haven't found the argument file
                    stache._['process.argv'] = process.argv; //copy process.argv to temp global space
                    
                    fs.readFileSync(stache.argvfn, 'utf-8').split(" ").forEach(function(val, i, array) {
                        stache._['process.argv'].push(val); //push arguments onto temp process.argv stack
                    });
                    
                    stache.foundargvfile = true; //prevent infinite loop when stache.argvfn is blank
                    stache._['process.argv'].forEach(stache.argvloop); //run the argument loop on the temp process.argv
                    delete stache._['process.argv']; //we are all done with the temp process.argv 
                } else {
                    stache.log('no input files specified, try --help');
                }
            });
            
        }
    }
};

process.argv.forEach(stache.argvloop);