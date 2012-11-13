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

//current tag directory depth
stache.tagdepth = 0;

stache.setvals = function() { //(re)set the default values (except tag depth)
    //script version
    stache.version = 
        "0.1.5"
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
        "   stache -o --auto"
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
}; stache.setvals();

stache.save = function() { //function for storing (most of) the stache object as a string
    return JSON.stringify({
        'stache.didhelp'       : stache.argvfn,
        'stache.argvfn'        : stache.argvfn,
        'stache.foundargvfile' : stache.foundargvfile,
        'stache.js'            : stache.js,
        'stache.autofn'        : stache.autofn,
        'stache.useauto'       : stache.useauto,
        'stache.tagdir'        : stache.tagdir,
        'stache.tagstr'        : stache.tagstr,
        'stache.usetags'       : stache.usetags,
        'stache.view'          : stache.view,
        'stache.test'          : stache.test,
        'stache.minify'        : stache.minify,
        'stache.compiled'      : stache.compiled,
        'stache.minified'      : stache.minified,
        'stache.fout'          : stache.fout,
        'stache.out'           : stache.out,
        'stache._'             : stache._
    });
};

stache.load = function(str) { //function for restoring (most of) the stache object from a string
    var _stache = JSON.parse(str);
    
    stache.didhelp       = _stache['stache.didhelp'];
    stache.argvfn        = _stache['stache.argvfn'];
    stache.foundargvfile = _stache['stache.foundargvfile'];
    stache.js            = _stache['stache.js'];
    stache.autofn        = _stache['stache.autofn'];
    stache.useauto       = _stache['stache.useauto'];
    stache.tagdir        = _stache['stache.tagdir'];
    stache.tagstr        = _stache['stache.tagstr'];
    stache.usetags       = _stache['stache.usetags'];
    stache.view          = _stache['stache.view'];
    stache.test          = _stache['stache.test'];
    stache.minify        = _stache['stache.minify'];
    stache.compiled      = _stache['stache.compiled'];
    stache.minified      = _stache['stache.minified'];
    stache.fout          = _stache['stache.fout'];
    stache.out           = _stache['stache.out'];
    stache._             = _stache['stache._'];
    console.log(stache._); //testing
};

stache.log = function(str) { //stylized logging function
    console.log('stache: ' + str);
};

stache.argvloop = function(val, i, argv) { //argument loop
    if(!(i === 0 || i == 1)) { //if not the first or second argument and val is not undefined
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
                    if(fs.existsSync(stache.tagdir)) { //check if the tag directory exists
                        if(fs.existsSync(path.join(stache.tagdir, stache.argvfn))) { //check if the stache argument file exists in the tag directory
                            var _stache = stache.save(); //save what we were doing
                            delete stache._; //reset values
                            stache.log(_stache); //testing
                            process.chdir(stache.tagdir); //change to the tag directory
                            stache.tagdepth += 1; //add depth
                            stache.log('running sub-process: '+stache.tagdepth); //say what depth we are on
                            stache.setvals(); //reset to default values
                            stache.argvloop('', 0, ['']); //run the sub process
                            stache.tagdepth -= 1; //remove depth
                            stache.log('back up to: '+stache.tagdepth); //testing
                            process.chdir('..'), stache.load(_stache); //go back to what we were doing
                        }
                        
                        fs.readdirSync(stache.tagdir).forEach(function(filename, i, array) { //scan the tags directory
                            var tagDirFileName = path.join(stache.tagdir, filename); //join the tag directory and the current file
                            if(!fs.lstatSync(tagDirFileName).isDirectory()) { //check if the file is not a directory
                                var tag = filename.replace('.js', ''); //find the name of the tag
                                stache.tagstr += '\n{{#' + tag + '}}\n' + fs.readFileSync(tagDirFileName, 'utf-8') + '\n{{/' + tag + '}}\n'; //append the tag to the tag string
                            }
                        });
                        
                        stache.usetags = true; //flag that we are using imported tags
                    } else {
                        stache.log('WARN: using --tag but directory "'+stache.tagdir+'" does not exists!');
                    }
                break;
            default: //no command line options found, continue with other checks
                    if(i === stache.fout) { //check if we need to set fout
                        if(val == '--auto') {
                            stache.useauto = true; //using auto magic file name
                        } else {
                            stache.fout = val; //set fout
                        }
                    } else if((function (filename) { //inline function to find file extension
                        if(typeof filename != 'undefined') {
                            var i = filename.lastIndexOf('.');
                            return (i < 0) ? '' : filename.substr(i+1);
                        } else {
                            return false;
                        }
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
            if(stache.useauto) { //if we are using auto magic file names
                stache.fout = stache.js.replace('.js', stache.autofn + (stache.minify ? '.min' : '') + '.js'); //make the magic happen
            }
            
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
                    stache.log('stache.fout' + stache.fout); //testing
                    stache.log(JSON.stringify(argv)); //testing
                    //stache.log('stache.out' + stache.out); //testing
                    fs.writeFile(stache.fout, stache.out, 'utf-8', function(err) { //write the output to a file
                        if(err) { //error!
                            console.log(err); //say what the error is
                        } else {
                            stache.log(stache.fout + ' built'); //file output success!
                        }
                    });
                }
            });
        } else if(!stache.didhelp) { //if no input files and did not show help
            if(fs.existsSync(stache.argvfn) && !stache.foundargvfile) { //if stache.argvfn exists and we haven't found the argument file
                stache.log('1:'+stache._['process.argv']); //testing
                stache._['process.argv'] = [process.argv[0], process.argv[1]]; //copy process.argv to temp global space
                stache.log('2:'+stache._['process.argv']); //testing
                
                fs.readFileSync(stache.argvfn, 'utf-8').split(" ").forEach(function(val, i, array) {
                    stache._['process.argv'].push(val); //push arguments onto temp process.argv stack
                });
                
                stache.foundargvfile = true; //prevent infinite loop when stache.argvfn is blank
                stache.log('3:'+stache._['process.argv']); //testing
                stache.log('testtttt'); //testing
                stache._['process.argv'].forEach(stache.argvloop); //run the argument loop on the temp process.argv
                delete stache._['process.argv']; //we are all done with the temp process.argv 
            } else {
                stache.log('no input files specified, try --help');
            }
        }
    }
};

process.argv.forEach(stache.argvloop);