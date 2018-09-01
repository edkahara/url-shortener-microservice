var bodyParser = require('body-parser');
var express = require('express');
var mongoose = require('mongoose');
var dns = require('dns');
var isUrl = require('is-url');
var regexp =  /^(https?:\/\/)/;
var app = express();

app.use(express.static('./assets'));

mongoose.connect('mongodb://testing123:testing123@ds211592.mlab.com:11592/url-shortener', { useNewUrlParser: true }).then(
    ()=>{
        console.log("connected to mongoDB")
    },
    (err)=>{
        console.log("err", err);
    }
);//connect to the database

var urlSchema = new mongoose.Schema({
    original_url: String,
    short_url: Number
});//create a schema
var Url = mongoose.model("Url", urlSchema);//create a model

app.use(bodyParser.json());
var urlencodedParser = bodyParser.urlencoded({ extended: false });

app.get('/', function(req, res){
  res.sendFile(__dirname + '/views/index.html');
});

app.post('/shorturl/new', urlencodedParser, function(req, res){
    var url = req.body.url;
    if(regexp.test(url) && isUrl(url)) {//check if url starts with http(s):// and is valid
        url = url[url.length-1] == '/' ? url.substring(0, url.length-1) : url;//if the url ends with a / remove it
        dns.lookup(url.replace(/(^\w+:|^)\/\//, ''), (err, address, family) => {
            if(err) {//if the url doesn't have a valid hostname show the error
                res.json({error: 'Invalid Hostname'});
            }else {//otherwise, check the database
                Url.countDocuments({}, function(err, count) {//count the number of documents in the collection
                    if (err) throw err;
                    Url.find({original_url: url}, function(err, result) {//check if the url exists in the collection
                        if(err) {
                            throw err;
                        }else {
                            if(result.length) {//if the url exists, show its details
                                res.json({original_url: result[0].original_url, short_url: result[0].short_url});
                            }else {//otherwise, create a new document with the url and show its details
                                var newUrl = new Url({original_url: url, short_url: count+1}).save(function(err, data) {
                                    if (err) throw err;
                                    res.json({original_url: data.original_url, short_url: data.short_url});
                                });
                            }
                        }
                    });
                });
            }
        });
    }else {//if the url is not valid show the error
        res.json({error: "Invalid URL"});
    }
});

app.get('/shorturl/:short_url', function(req, res){
    Url.find({short_url: req.params.short_url}, function(err, result) {//check if the short_url exists in the collection
        if(err) {
            throw err;
        }else {
            if(result.length) {//if the short_url exists, redirect to the original_url it corresponds to
                res.redirect(result[0].original_url);
            }else {//otherwise show the error
                res.json({error: 'No short url found for given input'});
            }
        }
    });
});

app.listen(3000);//listen to port
