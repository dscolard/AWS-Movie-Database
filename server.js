'use strict';

var AWS = require("aws-sdk");
var fs = require('fs');
const s3 = new AWS.S3();
var express = require('express');

var app = express();

var request = require('request');
var Vue = require("vue");
const path=require("path");

const port = 3000;
app.listen(port, () => console.log(`Example app listening on port ${port}!`));


AWS.config.update({
  region: "eu-west-1",
  accessKeyId: "",
  secretAccessKey: ""
});


var docClient = new AWS.DynamoDB.DocumentClient();
var dynamodb = new AWS.DynamoDB();


//Create Database Function
app.get('/create', function(req, res){

	updateData();
	createTable();

	var params = {
	  TableName: 'Movies' /* required */
	};
	dynamodb.waitFor('tableExists', params, function(err, data) {
	  if (err) console.log(err, err.stack); // an error occurred
	  else     loadDataToTable();           // successful response
	});

});


function createTable(){
	
		var params = {
		    TableName : "Movies",
		    KeySchema: [       
		        { AttributeName: "year", KeyType: "HASH"},  //Partition key
		        { AttributeName: "title", KeyType: "RANGE" }  //Sort key
		    ],
		    AttributeDefinitions: [       
		        { AttributeName: "year", AttributeType: "N" },
		        { AttributeName: "title", AttributeType: "S" }
		    ],
		    ProvisionedThroughput: {       
		        ReadCapacityUnits: 10, 
		        WriteCapacityUnits: 10
		    }
		};    
		dynamodb.createTable(params, function(err, data) {
		    if (err) {
		        console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
		    } else {
		        console.log('Table Created !');
		    }
		});

}


//Pulls latest data from s3 object and saves in json file moviedata.json
function updateData(){
	var params = {
  		Bucket: "csu44000assignment2", 
  		Key: "moviedata.json"
 	};
 	s3.getObject(params, function(err, data) {
   		if (err) {
   			console.log(err, err.stack); // an error occurred
   		}
   		else{
   		    fs.writeFile('./moviedata.json', data.Body.toString(), function (err) {
  				if (err) throw err;               
  				console.log('Results Received');
			});
   		}
	});
}


//Loads data from json file into table
function loadDataToTable(){

	console.log("Importing movies into DynamoDB. Please wait.");

	var allMovies = JSON.parse(fs.readFileSync('moviedata.json', 'utf8'));
	allMovies.forEach(function(movie) {
	    var params = {
	        TableName: "Movies",
	        Item: {
	            "year":  movie.year,
	            "title": movie.title,
	            "info":  movie.info
	        }
	    };
	    docClient.put(params, function(err, data) {
	       if (err) {
	           console.error("Unable to add movie", movie.title, ". Error JSON:", JSON.stringify(err, null, 2));
	       } else {
	           console.log("PutItem succeeded:", movie.title);
	       }
	    });
	});
}


//Delete Database Function
app.get('/delete', function(req, res){

	var params = {
    	TableName : "Movies"
	};
	dynamodb.deleteTable(params, function(err, data) {
	    if (err) {
	        console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
	    } else {
	        console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
	    }
	});
	res.send("Deleted Table");
});


//Query Database Function Gets all movies from given year.
app.get('/query/:title/:year', function(req, res){

	var year = parseInt(req.params.year, 10);
	var title = req.params.title;

	var params = {
	    TableName : "Movies",
	    KeyConditionExpression: "#yr = :yyyy",
	    ExpressionAttributeNames:{
	        "#yr": "year"
	    },
	    ExpressionAttributeValues: {
	        ":yyyy": year
	    }
	};

	docClient.query(params, function(err, data) {
	    if (err) {
	        console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
	        res.send([]);
	    } else {
	        console.log("Query succeeded.");
	        res.send(data.Items);
	    }
	});

});


app.use(express.static('views'));


