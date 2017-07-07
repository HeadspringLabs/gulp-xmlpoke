var   through = require('through2')
,   gutil = require('gulp-util')
,   xmldom = require('xmldom')
,   xpath = require('xpath')
,   _ = require('lodash')
,   PluginError = gutil.PluginError
,   ATTRIBUTE_NODE = 2
;

var editFile = function(file, options) {

   var domParser = new xmldom.DOMParser();
   var rawContents = file.contents.toString('utf8');

   var xmlSerializer = new xmldom.XMLSerializer();         

   var doc = domParser.parseFromString(rawContents);

   var replacements = options.replacements || [options];

   replacements.forEach(function(replacement){
      
      var queries = typeof replacement.xpath === 'string' ? [replacement.xpath] : replacement.xpath,
          getValue = _.isFunction(replacement.value) ? replacement.value : function() {return replacement.value || '';},
          valueType = typeof replacement.valueType === 'string' ? replacement.valueType : 'text';

      queries.forEach(function(query) {               
         var select = replacement.namespaces ? xpath.useNamespaces(replacement.namespaces) : xpath.select;
         var nodes = select(query, doc);
         nodes.forEach(function(node){
            var value = getValue(node);
            if(valueType === 'element') {                     
               node.textContent = '';
               while(node.firstChild){
                  node.removeChild(node.firstChild);
               }
               node.appendChild(domParser.parseFromString(value));
            }
            else if(valueType === 'remove'){
               var parentNode = node.parentNode;
               parentNode.removeChild(node);
            }
            else if(valueType === 'append'){
               node.appendChild(domParser.parseFromString(value));
            }
            else if(node.nodeType == ATTRIBUTE_NODE){                     
               node.value = value;
            } else {                     
               node.textContent = value;
            }
         });
      });
   });

   return xmlSerializer.serializeToString(doc)
};

function pokeXml(options) {

   var stream = through.obj(function(file, enc,cb) {

      // ignore null files
      if(file.isNull()){         
         this.push(file);
         return cb();
      }

      if(file.isStream()){         
         this.emit('error', new PluginError('gulp-xml-poke', 'Streaming is not supported'));
         return cb();
      }

      try {

         file.contents = new Buffer(editFile(file, options));          
      }
      catch(err) {
         this.emit('error', new PluginError('gulp-xml-poke', err))
      }

      this.push(file);
      cb();
   });

   return stream;
};

module.exports = pokeXml;
