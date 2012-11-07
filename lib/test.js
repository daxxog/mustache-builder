/* mustache-builder
 * mustache powered JavaScript building!
 * (c) 2012 David (daXXog) Volm ><> + + + <><
 * Released under Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0.html  
 * 
 ==
 * mustache-builder test
 *
 * Usage: 
 * stache --test
 */

//{{^test}}
var fail = false;
//{{/test}}

//{{#test}}
var fail = true;
//{{/test}}

if(fail) {
    stache.out = 'test failed!';
} else {
    stache.out = 'test successful!';
}