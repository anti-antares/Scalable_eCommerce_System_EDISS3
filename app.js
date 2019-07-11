// var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql');
var session = require('client-sessions');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var port = process.env.port || '3000';

var app = express();

// mysql connection
var connection = mysql.createConnection({
//   host     : 'localhost',
//   user     : 'root',
//   password : 'mypassword',
//   database : 'EDISS2',
//   multipleStatements: true
  host     : 'ediss.myhost.us-east-1.rds.amazonaws.com',
  user     : 'zhexinc',
  password : 'mypassword',
  database : 'EDISS3',
  port     : '3306',
  multipleStatements: true
});

app.use(session({
  cookieName: 'mySession', // cookie name dictates the key name added to the request object
  secret: 'blargadeeblargblarg', // should be a large unguessable string
  duration: 15 * 60 * 1000, // how long the session will stay valid in ms
  activeDuration: 15 * 60 * 1000 // if expiresIn < activeDuration, the session will be extended by activeDuration milliseconds
}));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
// app.use('/assets', express.static(__dirname+'/public'));
// app.set('view engine','ejs');

//handle POST method - registerUser
app.post('/registerUser', jsonParser, function(req, res) {
    console.log(req.body)
    connection.query('INSERT INTO users (userId, fname, lname, address, city, state, zip, email, username, password) VALUES (UUID_SHORT(),BINARY ?,BINARY ?,BINARY ?,BINARY ?,BINARY ?,BINARY ?,BINARY ?,BINARY ?,BINARY ?)',
    [req.body.fname,req.body.lname,req.body.address, req.body.city, req.body.state, req.body.zip, req.body.email, req.body.username, req.body.password],function(error,results,fields){
        if (error) {
            res.json({
                message: 'The input you provided is not valid'
            })
            // throw error
        }

        else {
            res.json({
                message: req.body.fname + ' was registered successfully'
            })

        }
    });
  });


//handle POST method - login
app.post('/login', jsonParser, function(req, res) {
  console.log(req.body)
  connection.query('SELECT * FROM users WHERE username = BINARY ? AND password = BINARY ?', [req.body.username, req.body.password],
                  function (error, results, fields) {
  if (error) throw error;
  
  else if (results.length > 0) {
      req.mySession.loggedin = true;
      req.mySession.username = req.body.username;
      req.mySession.fname = results[0].fname;
      if (results[0].admin=='Yes'){
        req.mySession.admin= true;
      }
      else req.mySession.admin= false;
      res.json({
          message: 'Welcome '+ results[0].fname
      })
  }
  
  else {
      res.json({
          message: 'There seems to be an issue with the username/password combination that you entered'
      })
  }
});
});

// Log out
app.post('/logout', function (req, res) {
  if (req.mySession.loggedin) {
      req.mySession.reset();
      res.json({
          message: 'You have been successfully logged out',
      })
  }
  
  else {
      res.json({
          message: 'You are not currently logged in',
      })
  }
});


// Update info
app.post('/updateInfo',jsonParser,function(req,res){
    if (req.mySession.loggedin){
        console.log(req.body);
        var sql_string = '';
        if (req.body.fname) sql_string+='UPDATE users SET fname = \"'+req.body.fname+'\" WHERE username = \"'+req.mySession.username+'\";';
        if (req.body.lname) sql_string+='UPDATE users SET lname = \"'+req.body.lname+'\" WHERE username = \"'+req.mySession.username+'\";';
        if (req.body.address) sql_string+='UPDATE users SET address = \"'+req.body.address+'\" WHERE username = \"'+req.mySession.username+'\";';
        if (req.body.city) sql_string+='UPDATE users SET city = \"'+req.body.city+'\" WHERE username = \"'+req.mySession.username+'\";';
        if (req.body.state) sql_string+='UPDATE users SET state = \"'+req.body.state+'\" WHERE username = \"'+req.mySession.username+'\";';
        if (req.body.zip) sql_string+='UPDATE users SET zip = \"'+req.body.zip+'\" WHERE username = \"'+req.mySession.username+'\";';
        if (req.body.email) sql_string+='UPDATE users SET email = \"'+req.body.email+'\" WHERE username = \"'+req.mySession.username+'\";';
        if (req.body.password) sql_string+='UPDATE users SET password = \"'+req.body.password+'\" WHERE username = \"'+req.mySession.username+'\";';
        if (req.body.username) sql_string+='UPDATE users SET username = \"'+req.body.username+'\" WHERE username = \"'+req.mySession.username+'\";';
        console.log(sql_string);
        try{        
            connection.beginTransaction(function(err) {
            if (err) { throw err; }
            connection.query(sql_string, function(err, rows, fields) {
                if (err) {
                    res.json({"message":"The input you provided is not valid"});
                    connection.rollback(function() {
                        // throw err;
                      });
                    // throw err
                }
                else {                
                    connection.commit(function(err){
                    if (err){
                        connection.rollback(function(){
                            // throw err;
                        })
                    }
                })
                res.json({"message":req.mySession.fname+" your information was successfully updated"});}
             });
    })}
        catch (err){console.error(err.stack);}

}
else{
    res.json({
        message: 'You are not currently logged in',
    })
}
})

// implement add products
app.post('/addProducts',jsonParser,function(req, res){
    console.log(req.body)
    if (req.mySession.loggedin){
        if(req.mySession.admin){
                    connection.query('INSERT INTO products (asin, productName, productDescription, productGroup) VALUES (BINARY ?,BINARY ?,BINARY ?,BINARY ?)',
                    [req.body.asin,req.body.productName,req.body.productDescription, req.body.group],function(error,results,fields){
                        if (error) {
                            res.json({
                                message: 'The input you provided is not valid'
                            })
                            // throw error
                        }
                
                        else {
                            res.json({
                                message: req.body.productName + ' was successfully added to the system'
                            })
                        }
                    });
        }
        else{
            res.json({
                message: 'You must be an admin to perform this action'
            })
        }
    }
    else {
        res.json({
            message: 'You are not currently logged in'
        })
    }
})

// implement modify products
app.post('/modifyProduct',jsonParser,function(req, res){
    console.log(req.body)
    if (req.mySession.loggedin){
        if(req.mySession.admin){
            if (!req.body.asin|| !req.body.productName|| !req.body.productDescription|| !req.body.group){                    
                res.json({
                message: 'The input you provided is not valid'
            })}
            else {           
                connection.query('SELECT * FROM products WHERE asin = BINARY ?',[req.body.asin],function(error,results,fields){
                    if (results.length>0){
                        connection.query('UPDATE products SET productName = BINARY ?, productDescription = BINARY ?, productGroup = BINARY ? WHERE asin = BINARY ?',
                        [req.body.productName,req.body.productDescription, req.body.group,req.body.asin],function(error,results,fields){
                            if (error) {
                                res.json({
                                    message: 'The input you provided is not valid'
                                })
                                // throw error
                            }
                    
                            else {
                                res.json({
                                    message: req.body.productName + ' was successfully updated'
                                })
                    
                            }
                        });
                    }
                    else {
                        res.json({
                            message: 'The input you provided is not valid'
                        })
                    }
                })

        }


        }
        else{
            res.json({
                message: 'You must be an admin to perform this action'
            })
        }
    }
    else {
        res.json({
            message: 'You are not currently logged in'
        })
    }
})

// implement view users
app.post('/viewUsers',jsonParser,function(req, res){
    console.log(req.body)
    if (req.mySession.loggedin){
        if(req.mySession.admin){
            var sql_string = '';
            if (!req.body.fname && !req.body.lname){
                sql_string+= 'SELECT fname, lname, userID FROM users;'
            }
            else if (!req.body.fname && req.body.lname){
                sql_string+= 'SELECT fname, lname, userID FROM users WHERE lname LIKE \"%'+req.body.lname+'%\";'
            }

            else if (req.body.fname && !req.body.lname){
                sql_string+= 'SELECT fname, lname, userID FROM users WHERE fname LIKE \"%'+req.body.fname+'%\";'
            }

            else if (req.body.fname && req.body.lname){
                sql_string+= 'SELECT fname, lname, userID FROM users WHERE fname LIKE \"%'+req.body.fname+'%\" AND lname LIKE \"%'+req.body.lname+'%\";'
            }
            connection.query(sql_string,function(error,results,fields){
                        if (error) {
                            res.json({
                                message: 'There are no users that match that criteria'
                            })
                            // throw error
                        }
                
                        else {
                            if (results.length>0){
                                // console.log(results)
                                res.json({
                                    message:"The action was successful",
                                    user:results
                                })
                            }

                            else{             
                                res.json({
                                message: 'There are no users that match that criteria'
                            })}


                        }
                    });
        }
        else{
            res.json({
                message: 'You must be an admin to perform this action'
            })
        }
    }
    else {
        res.json({
            message: 'You are not currently logged in'
        })
    }
})


//implement View Products

app.post('/viewProducts',jsonParser,function(req,res){
    var sql_string = 'SELECT asin, productName FROM products';
    if (req.body.asin && req.body.keyword && req.body.group){
        sql_string+= ' WHERE asin = \"'+req.body.asin+'\" AND ( productName LIKE \"%'+req.body.keyword+'%\" OR productDescription LIKE \"%'+req.body.keyword+'%\") And productGroup = \"'+req.body.group+'\";'
    }
    else if (!req.body.asin && req.body.keyword && req.body.group){
        sql_string+= ' WHERE ( productName LIKE \"%'+req.body.keyword+'%\" OR productDescription LIKE \"%'+req.body.keyword+'%\") And productGroup = \"'+req.body.group+'\";'
    }

    else if (req.body.asin && !req.body.keyword && req.body.group){
        sql_string+= ' WHERE asin = \"'+req.body.asin+'\" And productGroup = \"'+req.body.group+'\";'
    }

    else if (req.body.asin && req.body.keyword && !req.body.group){
        sql_string+= ' WHERE asin = \"'+req.body.asin+'\" AND ( productName LIKE \"%'+req.body.keyword+'%\" OR productDescription LIKE \"%'+req.body.keyword+'%\");'
    }

    else if (!req.body.asin && !req.body.keyword && req.body.group){
        sql_string+= ' WHERE productGroup = \"'+req.body.group+'\";'
    }

    else if (!req.body.asin && req.body.keyword && !req.body.group){
        sql_string+= ' WHERE (productName LIKE \"%'+req.body.keyword+'%\" OR productDescription LIKE \"%'+req.body.keyword+'%\");'
    }
    else if (req.body.asin && !req.body.keyword && !req.body.group){
        sql_string+= ' WHERE asin = \"'+req.body.asin+'\";'
    }
    else if (!req.body.asin && !req.body.keyword && !req.body.group){
        sql_string+= ';'
    }
    console.log(sql_string)
    connection.query(sql_string,function(error,results,fields){
        if (error){
            res.json({
                message:"There are no products that match that criteria"
            })
        }
        else {
            if (results.length>0){
                // console.log(results)
                res.json({
                    product:results
                })
            }

            else{             
                res.json({
                message: 'There are no products that match that criteria'
            })}


        }


    })


})

// purchase product
app.post('/buyProducts',jsonParser,function(req, res){
    console.log(req.body)
    if (req.mySession.loggedin){
        var pid = 0;
        var successful = false;
        connection.query('SELECT max(pid)+1 AS pid from purchase;' ,function(error,results,fields){
            if (results.length>0){
                pid =results[0].pid
            }
        })
        for (i=0;i<req.body.products.length;i++){
            connection.query('SELECT * FROM products WHERE asin = BINARY ? ;',[req.body.products[i].asin],function(error,results,fields){
                if (!error){
                    if (results.length>0){
                        connection.query('INSERT INTO purchase (pid, user, product) VALUES (BINARY ?, BINARY ? , BINARY ?);',[pid, req.mySession.username, req.body.products[i].asin],function(error,results,fields){
                            if (!error){
                                successful=true;
                            }
                        })
                    }
                }
            })
        }

        if (successful){
            res.json({
                message: "The action was successful"
            })
        }

        else {
            res.json({
                message: "There are no products that match the criteria"
            })
        }
    }
    else {
        res.json({
            message: 'You are not currently logged in'
        })
    }
})

// view purchases products
app.post('/productsPurchased',jsonParser,function(req, res){
    console.log(req.body)
    if (req.mySession.loggedin){
        if(req.mySession.admin){
            connection.query("select productName, quantity from (select product, count(product) AS quantity from purchase where user = \" BINARY ? \" GROUP BY product) A left join products B on A.product = B.asin;",[req.body.username],function(error,results,fields){
                if (!error){
                    if (results.length>0){
                        res.json({
                            message: 'The action was successful',
                            products:results
                        })
                    }
                    else {
                        res.json({
                            message: 'There are no users that match that criteria'
                        })
                    }
                }
                else {
                    res.json({
                        message: 'There are no users that match that criteria'
                    })
                }
            })
        }
        else{
            res.json({
                message: 'You must be an admin to perform this action'
            })
        }
    }
    else {
        res.json({
            message: 'You are not currently logged in'
        })
    }
})

//get Recommendations

app.post('/getRecommendations',jsonParser,function(req, res){
    console.log(req.body)
    if (req.mySession.loggedin){
        connection.query("select asin from (select product AS asin, count(product) AS quantity from purchase where pid in (select pid from purchase where product = BINARY ?) and product <> BINARY ? GROUP BY product ORDER BY quantity DESC  ) AS T;",[req.body.asin,req.body.asin],function(error,results,fields){
            if (!error){
                if (results.length>0){
                    res.json({
                        message: 'The action was successful',
                        products:results
                    })
                }
                else {
                    res.json({
                        message: 'There are no recommendations for that product'
                    }) 
                }
            }
            else {
                res.json({
                    message: 'There are no recommendations for that product'
                }) 
            }
        })
    }
    else {
        res.json({
            message: 'You are not currently logged in'
        })
    }
})


// app.get('*', function(req, res){
//   res.render('404');
// });

// app.listen(port);
module.exports = app;
